/**
 * AuctionAnalytics
 * Tracks and analyzes auction performance metrics
 */
export default class AuctionAnalytics {
    constructor(auctionManager, marketDataService) {
        this.auctionManager = auctionManager;
        this.marketDataService = marketDataService;
        
        // Analytics data storage
        this.metrics = {
            overall: {
                totalTrades: 0,
                totalVolume: 0,
                totalValue: 0,
                averagePrice: 0,
                priceRange: { min: Infinity, max: 0 }
            },
            byResource: new Map(),
            byPlayer: new Map(),
            byPhase: new Map(),
            temporal: []
        };
        
        // Real-time metrics
        this.realTimeMetrics = {
            tradesPerMinute: 0,
            volumePerMinute: 0,
            activePlayers: new Set(),
            priceVelocity: new Map()
        };
        
        // Performance tracking
        this.performance = {
            marketEfficiency: 0,
            liquidityScore: 0,
            volatilityIndex: 0,
            participationRate: 0
        };
        
        // Time windows for analysis
        this.timeWindows = {
            realTime: 60000,    // 1 minute
            shortTerm: 300000,  // 5 minutes
            longTerm: 900000    // 15 minutes
        };
        
        // Last update timestamp
        this.lastUpdate = Date.now();
    }
    
    /**
     * Record a completed trade
     */
    recordTrade(trade) {
        // Update overall metrics
        this.metrics.overall.totalTrades++;
        this.metrics.overall.totalVolume += trade.quantity;
        this.metrics.overall.totalValue += trade.price * trade.quantity;
        this.metrics.overall.priceRange.min = Math.min(this.metrics.overall.priceRange.min, trade.price);
        this.metrics.overall.priceRange.max = Math.max(this.metrics.overall.priceRange.max, trade.price);
        
        // Update resource-specific metrics
        this.updateResourceMetrics(trade);
        
        // Update player-specific metrics
        this.updatePlayerMetrics(trade);
        
        // Add to temporal data
        this.metrics.temporal.push({
            timestamp: trade.timestamp || Date.now(),
            resource: trade.resource,
            price: trade.price,
            quantity: trade.quantity,
            buyerId: trade.buyerId,
            sellerId: trade.sellerId
        });
        
        // Maintain temporal data size
        this.pruneTemporalData();
        
        // Update real-time metrics
        this.updateRealTimeMetrics();
        
        console.log(`Recorded trade: ${trade.quantity} ${trade.resource} @ ${trade.price}`);
    }
    
    /**
     * Update resource-specific metrics
     */
    updateResourceMetrics(trade) {
        if (!this.metrics.byResource.has(trade.resource)) {
            this.metrics.byResource.set(trade.resource, {
                trades: 0,
                volume: 0,
                value: 0,
                avgPrice: 0,
                priceHistory: []
            });
        }
        
        const resourceMetrics = this.metrics.byResource.get(trade.resource);
        resourceMetrics.trades++;
        resourceMetrics.volume += trade.quantity;
        resourceMetrics.value += trade.price * trade.quantity;
        resourceMetrics.avgPrice = resourceMetrics.value / resourceMetrics.volume;
        resourceMetrics.priceHistory.push({
            price: trade.price,
            timestamp: trade.timestamp || Date.now()
        });
    }
    
    /**
     * Update player-specific metrics
     */
    updatePlayerMetrics(trade) {
        // Update buyer metrics
        this.updateSinglePlayerMetrics(trade.buyerId, 'buy', trade);
        
        // Update seller metrics
        this.updateSinglePlayerMetrics(trade.sellerId, 'sell', trade);
    }
    
    /**
     * Update metrics for a single player
     */
    updateSinglePlayerMetrics(playerId, action, trade) {
        if (!this.metrics.byPlayer.has(playerId)) {
            this.metrics.byPlayer.set(playerId, {
                trades: 0,
                buys: 0,
                sells: 0,
                totalSpent: 0,
                totalEarned: 0,
                avgBuyPrice: 0,
                avgSellPrice: 0,
                resourcesTraded: new Map()
            });
        }
        
        const playerMetrics = this.metrics.byPlayer.get(playerId);
        playerMetrics.trades++;
        
        if (action === 'buy') {
            playerMetrics.buys++;
            playerMetrics.totalSpent += trade.price * trade.quantity;
            playerMetrics.avgBuyPrice = playerMetrics.totalSpent / playerMetrics.buys;
        } else {
            playerMetrics.sells++;
            playerMetrics.totalEarned += trade.price * trade.quantity;
            playerMetrics.avgSellPrice = playerMetrics.totalEarned / playerMetrics.sells;
        }
        
        // Track resources
        const resourceCount = playerMetrics.resourcesTraded.get(trade.resource) || 0;
        playerMetrics.resourcesTraded.set(trade.resource, resourceCount + trade.quantity);
    }
    
    /**
     * Update real-time metrics
     */
    updateRealTimeMetrics() {
        const now = Date.now();
        const recentTrades = this.metrics.temporal.filter(
            t => now - t.timestamp < this.timeWindows.realTime
        );
        
        // Trades per minute
        this.realTimeMetrics.tradesPerMinute = recentTrades.length;
        
        // Volume per minute
        this.realTimeMetrics.volumePerMinute = recentTrades.reduce(
            (sum, t) => sum + t.quantity, 0
        );
        
        // Active players
        this.realTimeMetrics.activePlayers.clear();
        recentTrades.forEach(t => {
            this.realTimeMetrics.activePlayers.add(t.buyerId);
            this.realTimeMetrics.activePlayers.add(t.sellerId);
        });
        
        // Price velocity by resource
        this.calculatePriceVelocity();
        
        // Update performance metrics
        this.updatePerformanceMetrics();
    }
    
    /**
     * Calculate price velocity (rate of change)
     */
    calculatePriceVelocity() {
        const resources = ['mana', 'vitality', 'arcanum', 'aether'];
        
        resources.forEach(resource => {
            const recentPrices = this.metrics.temporal
                .filter(t => t.resource === resource)
                .slice(-10)
                .map(t => t.price);
            
            if (recentPrices.length >= 2) {
                const velocity = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / 
                                recentPrices.length;
                this.realTimeMetrics.priceVelocity.set(resource, velocity);
            }
        });
    }
    
    /**
     * Update performance metrics
     */
    updatePerformanceMetrics() {
        // Market efficiency (spread tightness)
        this.performance.marketEfficiency = this.calculateMarketEfficiency();
        
        // Liquidity score (trading activity)
        this.performance.liquidityScore = this.calculateLiquidityScore();
        
        // Volatility index
        this.performance.volatilityIndex = this.calculateVolatilityIndex();
        
        // Participation rate
        this.performance.participationRate = this.calculateParticipationRate();
    }
    
    /**
     * Calculate market efficiency
     */
    calculateMarketEfficiency() {
        if (this.metrics.overall.totalTrades === 0) return 0;
        
        // Efficiency based on price convergence
        const priceRange = this.metrics.overall.priceRange.max - 
                          this.metrics.overall.priceRange.min;
        const avgPrice = this.metrics.overall.totalValue / this.metrics.overall.totalVolume;
        
        if (avgPrice === 0) return 0;
        
        const efficiency = 1 - (priceRange / avgPrice);
        return Math.max(0, Math.min(1, efficiency));
    }
    
    /**
     * Calculate liquidity score
     */
    calculateLiquidityScore() {
        // Based on trading frequency and volume
        const tradesPerMinute = this.realTimeMetrics.tradesPerMinute;
        const volumePerMinute = this.realTimeMetrics.volumePerMinute;
        
        // Normalize to 0-1 scale
        const tradingScore = Math.min(1, tradesPerMinute / 10);
        const volumeScore = Math.min(1, volumePerMinute / 50);
        
        return (tradingScore + volumeScore) / 2;
    }
    
    /**
     * Calculate volatility index
     */
    calculateVolatilityIndex() {
        let totalVolatility = 0;
        let count = 0;
        
        this.metrics.byResource.forEach((metrics, resource) => {
            if (metrics.priceHistory.length >= 2) {
                const prices = metrics.priceHistory.map(p => p.price);
                const volatility = this.calculateStandardDeviation(prices) / 
                                 (metrics.avgPrice || 1);
                totalVolatility += volatility;
                count++;
            }
        });
        
        return count > 0 ? totalVolatility / count : 0;
    }
    
    /**
     * Calculate participation rate
     */
    calculateParticipationRate() {
        const totalPlayers = this.auctionManager?.gameFlow?.stateManager?.gameState?.players?.length || 4;
        const activePlayers = this.realTimeMetrics.activePlayers.size;
        
        return totalPlayers > 0 ? activePlayers / totalPlayers : 0;
    }
    
    /**
     * Calculate standard deviation
     */
    calculateStandardDeviation(values) {
        if (values.length === 0) return 0;
        
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
        
        return Math.sqrt(variance);
    }
    
    /**
     * Prune old temporal data
     */
    pruneTemporalData() {
        const cutoff = Date.now() - this.timeWindows.longTerm;
        this.metrics.temporal = this.metrics.temporal.filter(
            t => t.timestamp > cutoff
        );
    }
    
    /**
     * Get analytics summary
     */
    getSummary() {
        const avgPrice = this.metrics.overall.totalVolume > 0 ?
            this.metrics.overall.totalValue / this.metrics.overall.totalVolume : 0;
        
        return {
            overall: {
                ...this.metrics.overall,
                averagePrice: Math.round(avgPrice)
            },
            realTime: {
                tradesPerMinute: this.realTimeMetrics.tradesPerMinute,
                volumePerMinute: this.realTimeMetrics.volumePerMinute,
                activePlayers: this.realTimeMetrics.activePlayers.size,
                priceVelocity: Object.fromEntries(this.realTimeMetrics.priceVelocity)
            },
            performance: this.performance,
            topTraders: this.getTopTraders(),
            resourceBreakdown: this.getResourceBreakdown()
        };
    }
    
    /**
     * Get top traders by volume
     */
    getTopTraders() {
        const traders = Array.from(this.metrics.byPlayer.entries())
            .map(([id, metrics]) => ({
                playerId: id,
                trades: metrics.trades,
                volume: metrics.buys + metrics.sells,
                profit: metrics.totalEarned - metrics.totalSpent
            }))
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 5);
        
        return traders;
    }
    
    /**
     * Get resource breakdown
     */
    getResourceBreakdown() {
        const breakdown = {};
        
        this.metrics.byResource.forEach((metrics, resource) => {
            breakdown[resource] = {
                trades: metrics.trades,
                volume: metrics.volume,
                averagePrice: Math.round(metrics.avgPrice),
                marketShare: this.metrics.overall.totalVolume > 0 ?
                    metrics.volume / this.metrics.overall.totalVolume : 0
            };
        });
        
        return breakdown;
    }
    
    /**
     * Get player statistics
     */
    getPlayerStats(playerId) {
        const playerMetrics = this.metrics.byPlayer.get(playerId);
        
        if (!playerMetrics) {
            return null;
        }
        
        return {
            ...playerMetrics,
            profitMargin: playerMetrics.totalEarned - playerMetrics.totalSpent,
            tradeBalance: playerMetrics.buys - playerMetrics.sells,
            favoriteResource: this.getFavoriteResource(playerMetrics.resourcesTraded)
        };
    }
    
    /**
     * Get favorite resource for player
     */
    getFavoriteResource(resourceMap) {
        let maxVolume = 0;
        let favorite = null;
        
        resourceMap.forEach((volume, resource) => {
            if (volume > maxVolume) {
                maxVolume = volume;
                favorite = resource;
            }
        });
        
        return favorite;
    }
    
    /**
     * Export analytics data
     */
    exportData() {
        return {
            timestamp: Date.now(),
            metrics: this.metrics,
            performance: this.performance,
            summary: this.getSummary()
        };
    }
}