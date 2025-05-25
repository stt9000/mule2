/**
 * AIBiddingStrategy
 * Implements intelligent bidding strategies for AI players
 */
export default class AIBiddingStrategy {
    constructor(auctionManager, marketDataService) {
        this.auctionManager = auctionManager;
        this.marketDataService = marketDataService;
        
        // Strategy configurations
        this.strategies = {
            conservative: {
                buyThreshold: 0.9,  // Buy when price is 90% or less of market
                sellThreshold: 1.1, // Sell when price is 110% or more of market
                maxRisk: 0.2,       // Max 20% of gold per trade
                priceAdjustment: 0.05 // 5% price adjustments
            },
            balanced: {
                buyThreshold: 0.95,
                sellThreshold: 1.05,
                maxRisk: 0.3,
                priceAdjustment: 0.1
            },
            aggressive: {
                buyThreshold: 1.05,
                sellThreshold: 0.95,
                maxRisk: 0.5,
                priceAdjustment: 0.15
            }
        };
        
        // Player strategy assignments
        this.playerStrategies = new Map();
        
        // Decision history for learning
        this.decisionHistory = [];
        this.successRate = new Map();
    }
    
    /**
     * Assign strategy to AI player
     */
    assignStrategy(playerId, strategyType = 'balanced') {
        if (!this.strategies[strategyType]) {
            console.warn(`Unknown strategy type: ${strategyType}`);
            strategyType = 'balanced';
        }
        
        this.playerStrategies.set(playerId, strategyType);
        this.successRate.set(playerId, { successful: 0, total: 0 });
        
        console.log(`Assigned ${strategyType} strategy to player ${playerId}`);
    }
    
    /**
     * Make bidding decision for AI player
     */
    makeBiddingDecision(player, resource) {
        const strategyType = this.playerStrategies.get(player.id) || 'balanced';
        const strategy = this.strategies[strategyType];
        
        // Get market data
        const marketPrice = this.marketDataService.getCurrentPrice(resource);
        const priceHistory = this.marketDataService.priceHistory.get(resource) || [];
        const marketSummary = this.marketDataService.getMarketSummary(resource);
        const supply = marketSummary.supply || 100;
        const demand = marketSummary.demand || 100;
        
        // Analyze player's position
        const playerResources = player.resources[resource] || 0;
        const playerGold = player.gold || 0;
        const maxSpend = Math.floor(playerGold * strategy.maxRisk);
        
        // Calculate price trend
        const priceTrend = this.calculatePriceTrend(priceHistory);
        
        // Determine action
        let decision = null;
        
        if (this.shouldBuy(player, resource, marketPrice, priceTrend, strategy)) {
            decision = this.createBuyDecision(
                player, 
                resource, 
                marketPrice, 
                maxSpend, 
                strategy,
                priceTrend
            );
        } else if (this.shouldSell(player, resource, marketPrice, priceTrend, strategy)) {
            decision = this.createSellDecision(
                player, 
                resource, 
                marketPrice, 
                playerResources, 
                strategy,
                priceTrend
            );
        }
        
        // Record decision
        if (decision) {
            this.recordDecision(player.id, decision);
        }
        
        return decision;
    }
    
    /**
     * Determine if AI should buy
     */
    shouldBuy(player, resource, marketPrice, priceTrend, strategy) {
        // Don't buy if no gold
        if (player.gold < marketPrice) {
            return false;
        }
        
        // Check if price is attractive
        const priceRatio = marketPrice / this.getExpectedPrice(resource);
        
        // Buy if price is below threshold
        if (priceRatio <= strategy.buyThreshold) {
            return true;
        }
        
        // Also consider trend for aggressive strategy
        if (strategy === this.strategies.aggressive && priceTrend > 0.1) {
            return true; // Buy in rising market
        }
        
        return false;
    }
    
    /**
     * Determine if AI should sell
     */
    shouldSell(player, resource, marketPrice, priceTrend, strategy) {
        // Don't sell if no resources
        const playerResources = player.resources[resource] || 0;
        if (playerResources <= 0) {
            return false;
        }
        
        // Check if price is attractive
        const priceRatio = marketPrice / this.getExpectedPrice(resource);
        
        // Sell if price is above threshold
        if (priceRatio >= strategy.sellThreshold) {
            return true;
        }
        
        // Consider trend for conservative strategy
        if (strategy === this.strategies.conservative && priceTrend < -0.1) {
            return true; // Sell in falling market
        }
        
        return false;
    }
    
    /**
     * Create buy decision
     */
    createBuyDecision(player, resource, marketPrice, maxSpend, strategy, priceTrend) {
        // Calculate bid price based on strategy
        let bidPrice = marketPrice;
        
        if (priceTrend > 0) {
            // Rising market - bid higher
            bidPrice *= (1 + strategy.priceAdjustment);
        } else {
            // Falling market - bid lower
            bidPrice *= (1 - strategy.priceAdjustment);
        }
        
        // Ensure within limits
        bidPrice = Math.round(Math.max(10, Math.min(100, bidPrice)));
        
        // Calculate quantity
        const maxQuantity = Math.floor(maxSpend / bidPrice);
        const desiredQuantity = Math.min(maxQuantity, 10); // Cap at 10
        
        return {
            action: 'buy',
            resource: resource,
            price: bidPrice,
            quantity: Math.max(1, desiredQuantity),
            confidence: this.calculateConfidence(strategy, priceTrend)
        };
    }
    
    /**
     * Create sell decision
     */
    createSellDecision(player, resource, marketPrice, playerResources, strategy, priceTrend) {
        // Calculate ask price based on strategy
        let askPrice = marketPrice;
        
        if (priceTrend < 0) {
            // Falling market - sell quickly
            askPrice *= (1 - strategy.priceAdjustment);
        } else {
            // Rising market - hold for higher price
            askPrice *= (1 + strategy.priceAdjustment);
        }
        
        // Ensure within limits
        askPrice = Math.round(Math.max(10, Math.min(100, askPrice)));
        
        // Calculate quantity (sell portion of holdings)
        const sellRatio = strategy === this.strategies.aggressive ? 0.5 : 0.3;
        const quantity = Math.max(1, Math.floor(playerResources * sellRatio));
        
        return {
            action: 'sell',
            resource: resource,
            price: askPrice,
            quantity: quantity,
            confidence: this.calculateConfidence(strategy, priceTrend)
        };
    }
    
    /**
     * Calculate price trend
     */
    calculatePriceTrend(priceHistory) {
        if (priceHistory.length < 2) {
            return 0;
        }
        
        // Simple moving average comparison
        const recent = priceHistory.slice(-3);
        const older = priceHistory.slice(-6, -3);
        
        const recentAvg = recent.reduce((sum, p) => sum + p.price, 0) / recent.length;
        const olderAvg = older.reduce((sum, p) => sum + p.price, 0) / older.length || recentAvg;
        
        return (recentAvg - olderAvg) / olderAvg;
    }
    
    /**
     * Get expected price for resource
     */
    getExpectedPrice(resource) {
        const history = this.marketDataService.priceHistory.get(resource) || [];
        if (history.length === 0) {
            return 50; // Default price
        }
        
        // Average of last 5 prices
        const recentPrices = history.slice(-5);
        const sum = recentPrices.reduce((total, entry) => total + entry.price, 0);
        return sum / recentPrices.length;
    }
    
    /**
     * Calculate confidence in decision
     */
    calculateConfidence(strategy, priceTrend) {
        let confidence = 0.5; // Base confidence
        
        // Adjust based on trend strength
        const trendStrength = Math.abs(priceTrend);
        if (trendStrength > 0.2) {
            confidence += 0.3;
        } else if (trendStrength > 0.1) {
            confidence += 0.2;
        }
        
        // Strategy-specific adjustments
        if (strategy === this.strategies.conservative) {
            confidence *= 0.8; // More cautious
        } else if (strategy === this.strategies.aggressive) {
            confidence *= 1.2; // More confident
        }
        
        return Math.min(1, Math.max(0, confidence));
    }
    
    /**
     * Record decision for learning
     */
    recordDecision(playerId, decision) {
        this.decisionHistory.push({
            playerId: playerId,
            timestamp: Date.now(),
            decision: decision
        });
        
        // Keep only recent history
        if (this.decisionHistory.length > 100) {
            this.decisionHistory.shift();
        }
        
        // Update total count
        const stats = this.successRate.get(playerId);
        if (stats) {
            stats.total++;
        }
    }
    
    /**
     * Update success rate after trade
     */
    updateSuccessRate(playerId, wasSuccessful) {
        const stats = this.successRate.get(playerId);
        if (stats) {
            if (wasSuccessful) {
                stats.successful++;
            }
        }
    }
    
    /**
     * Get AI player statistics
     */
    getPlayerStats(playerId) {
        const stats = this.successRate.get(playerId) || { successful: 0, total: 0 };
        const strategy = this.playerStrategies.get(playerId) || 'none';
        
        return {
            strategy: strategy,
            totalDecisions: stats.total,
            successfulTrades: stats.successful,
            successRate: stats.total > 0 ? stats.successful / stats.total : 0,
            recentDecisions: this.decisionHistory
                .filter(d => d.playerId === playerId)
                .slice(-5)
        };
    }
    
    /**
     * Execute AI decision
     */
    async executeDecision(player, decision) {
        if (!decision || !this.auctionManager) {
            return false;
        }
        
        console.log(`AI ${player.name} executing ${decision.action} decision:`, decision);
        
        // Update player position in auction
        const success = this.auctionManager.updatePlayerPosition(
            player.id,
            decision.price,
            decision.action,
            decision.quantity
        );
        
        if (success) {
            console.log(`AI ${player.name} set position: ${decision.action} ${decision.quantity} ${decision.resource} @ ${decision.price}`);
        }
        
        return success;
    }
}