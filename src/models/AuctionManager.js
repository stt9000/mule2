/**
 * AuctionManager
 * Manages the auction system state and logic
 */
export default class AuctionManager {
    constructor(gameFlow) {
        this.gameFlow = gameFlow;
        
        // Auction state
        this.currentResource = null; // 'mana', 'vitality', 'arcanum', 'aether'
        this.auctionPhase = 'inactive'; // 'inactive', 'setup', 'active', 'resolution'
        this.playerPositions = new Map(); // playerId -> {price, mode: 'buy'|'sell', quantity}
        
        // Price configuration
        this.priceRange = { min: 10, max: 100 };
        this.marketPrice = 50;
        this.lastTradePrice = 50;
        
        // Timing (from GAME_RULES.md)
        this.timeRemaining = 0;
        this.auctionDuration = 90; // 90 seconds per resource
        this.setupDuration = 30; // 30 seconds setup time
        
        // Transaction tracking
        this.transactions = [];
        this.pendingTrades = [];
        
        // Market data
        this.supply = 0;
        this.demand = 0;
        this.priceHistory = new Map(); // resource -> array of prices
        
        // Event emitter reference
        this.events = gameFlow?.events;
        
        // Market event system
        this.marketEventSystem = null;
        
        // Resource queue manager
        this.resourceQueueManager = null;
        
        // Market data service
        this.marketDataService = null;
        
        // Initialize price history for each resource
        const resources = ['mana', 'vitality', 'arcanum', 'aether'];
        resources.forEach(resource => {
            this.priceHistory.set(resource, [50]); // Starting price
        });
    }
    
    /**
     * Set market event system
     */
    setMarketEventSystem(marketEventSystem) {
        this.marketEventSystem = marketEventSystem;
    }
    
    /**
     * Set resource queue manager
     */
    setResourceQueueManager(resourceQueueManager) {
        this.resourceQueueManager = resourceQueueManager;
    }
    
    /**
     * Set market data service
     */
    setMarketDataService(marketDataService) {
        this.marketDataService = marketDataService;
    }
    
    /**
     * Start auction phase with setup time
     */
    startAuctionPhase() {
        console.log('Starting auction phase');
        this.auctionPhase = 'setup';
        this.timeRemaining = this.setupDuration;
        
        // Calculate initial supply and demand
        this.calculateMarketConditions();
        
        // Initialize resource queue if available
        if (this.resourceQueueManager) {
            this.resourceQueueManager.initialize();
        }
        
        // Emit event
        if (this.events) {
            this.events.emit('auction.phase.started', {
                phase: 'setup',
                duration: this.setupDuration
            });
        }
        
        return true;
    }
    
    /**
     * Start auction for specific resource
     */
    startResourceAuction(resource) {
        if (!['mana', 'vitality', 'arcanum', 'aether'].includes(resource)) {
            console.error('Invalid resource type:', resource);
            return false;
        }
        
        console.log(`Starting ${resource} auction`);
        this.currentResource = resource;
        this.auctionPhase = 'active';
        this.timeRemaining = this.auctionDuration;
        this.playerPositions.clear();
        this.pendingTrades = [];
        
        // Set market price based on dynamic calculation
        if (this.marketDataService) {
            this.marketDataService.updateMarketPrices();
            this.marketPrice = this.marketDataService.calculateDynamicPrice(resource);
        } else {
            // Fallback to history-based price
            const history = this.priceHistory.get(resource);
            this.marketPrice = history[history.length - 1] || 50;
        }
        this.lastTradePrice = this.marketPrice;
        
        // Calculate supply/demand for this resource
        this.calculateResourceSupplyDemand(resource);
        
        // Check for market events
        if (this.marketEventSystem) {
            const event = this.marketEventSystem.checkForEvent(resource);
            if (event) {
                console.log(`Market event triggered for ${resource}:`, event.name);
                // Apply event effects to price range
                const effects = event.effects;
                if (effects.priceModifier) {
                    this.marketPrice = Math.round(this.marketPrice * effects.priceModifier);
                    this.marketPrice = Math.max(this.priceRange.min, Math.min(this.priceRange.max, this.marketPrice));
                }
                
                // Emit market event
                if (this.events) {
                    this.events.emit('auction.market.event', {
                        resource: resource,
                        event: event
                    });
                }
            }
        }
        
        // Emit event
        if (this.events) {
            this.events.emit('auction.resource.started', {
                resource: resource,
                marketPrice: this.marketPrice,
                supply: this.supply,
                demand: this.demand,
                duration: this.auctionDuration
            });
        }
        
        return true;
    }
    
    /**
     * Update player position in auction
     */
    updatePlayerPosition(playerId, price, mode, quantity = 0) {
        if (this.auctionPhase !== 'active') {
            console.warn('Cannot update position - auction not active');
            return false;
        }
        
        // Validate price
        if (price < this.priceRange.min || price > this.priceRange.max) {
            console.warn('Price out of range:', price);
            return false;
        }
        
        // Validate mode
        if (!['buy', 'sell'].includes(mode)) {
            console.warn('Invalid mode:', mode);
            return false;
        }
        
        // Update position
        this.playerPositions.set(playerId, {
            price: Math.round(price),
            mode: mode,
            quantity: quantity,
            timestamp: Date.now()
        });
        
        // Emit event
        if (this.events) {
            this.events.emit('auction.player.moved', {
                playerId: playerId,
                price: price,
                mode: mode,
                quantity: quantity
            });
        }
        
        // Check for potential trades
        this.checkForTrades();
        
        return true;
    }
    
    /**
     * Check if any trades can be executed
     */
    checkForTrades() {
        const buyers = [];
        const sellers = [];
        
        // Separate buyers and sellers
        this.playerPositions.forEach((position, playerId) => {
            if (position.mode === 'buy') {
                buyers.push({ playerId, ...position });
            } else {
                sellers.push({ playerId, ...position });
            }
        });
        
        // Sort buyers by price (highest first)
        buyers.sort((a, b) => b.price - a.price);
        
        // Sort sellers by price (lowest first)
        sellers.sort((a, b) => a.price - b.price);
        
        // Check for overlapping positions
        for (const buyer of buyers) {
            for (const seller of sellers) {
                if (buyer.price >= seller.price) {
                    // Trade is possible!
                    this.executeTrade(buyer, seller);
                    break; // Move to next buyer
                }
            }
        }
    }
    
    /**
     * Execute a trade between buyer and seller
     */
    executeTrade(buyer, seller) {
        const tradePrice = Math.round((buyer.price + seller.price) / 2);
        const quantity = Math.min(buyer.quantity || 5, seller.quantity || 5);
        
        const trade = {
            id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            buyerId: buyer.playerId,
            sellerId: seller.playerId,
            resource: this.currentResource,
            price: tradePrice,
            quantity: quantity,
            timestamp: Date.now()
        };
        
        // Add to pending trades (will be processed in resolution)
        this.pendingTrades.push(trade);
        
        // Update last trade price
        this.lastTradePrice = tradePrice;
        
        // Remove players from active positions
        this.playerPositions.delete(buyer.playerId);
        this.playerPositions.delete(seller.playerId);
        
        // Emit event
        if (this.events) {
            this.events.emit('auction.trade.executed', trade);
        }
        
        return trade;
    }
    
    /**
     * End current resource auction
     */
    endResourceAuction() {
        if (this.auctionPhase !== 'active') {
            return false;
        }
        
        console.log(`Ending ${this.currentResource} auction`);
        this.auctionPhase = 'resolution';
        
        // Process all pending trades
        this.processPendingTrades();
        
        // Update price history
        const history = this.priceHistory.get(this.currentResource);
        history.push(this.lastTradePrice);
        if (history.length > 10) {
            history.shift(); // Keep only last 10 prices
        }
        
        // Emit event
        if (this.events) {
            this.events.emit('auction.resource.ended', {
                resource: this.currentResource,
                finalPrice: this.lastTradePrice,
                totalTrades: this.pendingTrades.length,
                transactions: this.pendingTrades
            });
        }
        
        // Clear pending trades
        this.transactions.push(...this.pendingTrades);
        this.pendingTrades = [];
        
        return true;
    }
    
    /**
     * Process all pending trades
     */
    processPendingTrades() {
        // In a real implementation, this would update player resources
        // For now, we just log the trades
        this.pendingTrades.forEach(trade => {
            console.log(`Trade executed: ${trade.quantity} ${trade.resource} at ${trade.price} GP`);
        });
    }
    
    /**
     * Calculate market conditions
     */
    calculateMarketConditions() {
        // This would analyze all players' resources
        // For now, use mock data
        this.supply = Math.floor(Math.random() * 100) + 50;
        this.demand = Math.floor(Math.random() * 100) + 50;
    }
    
    /**
     * Calculate supply/demand for specific resource
     */
    calculateResourceSupplyDemand(resource) {
        // This would check actual player inventories
        // For now, use mock data
        this.supply = Math.floor(Math.random() * 50) + 25;
        this.demand = Math.floor(Math.random() * 50) + 25;
    }
    
    /**
     * Update timer
     */
    updateTimer(deltaTime) {
        if (this.auctionPhase === 'inactive' || this.auctionPhase === 'resolution') {
            return;
        }
        
        this.timeRemaining -= deltaTime;
        
        if (this.timeRemaining <= 0) {
            this.timeRemaining = 0; // Ensure it doesn't go negative
            
            if (this.auctionPhase === 'setup') {
                // Start resource queue or first auction
                if (this.resourceQueueManager) {
                    this.resourceQueueManager.start();
                } else {
                    // Auto-start first resource auction
                    this.startResourceAuction('mana');
                }
            } else if (this.auctionPhase === 'active') {
                // End current auction
                this.endResourceAuction();
                
                // Let queue manager handle next resource
                if (!this.resourceQueueManager) {
                    // Manual progression if no queue manager
                    const resources = ['mana', 'vitality', 'arcanum', 'aether'];
                    const currentIndex = resources.indexOf(this.currentResource);
                    const nextIndex = (currentIndex + 1) % resources.length;
                    
                    if (nextIndex === 0) {
                        // All resources done
                        this.auctionPhase = 'inactive';
                    } else {
                        // Start next resource after delay
                        setTimeout(() => {
                            this.startResourceAuction(resources[nextIndex]);
                        }, 5000);
                    }
                }
            }
        }
    }
    
    /**
     * Get active market events
     */
    getActiveMarketEvents() {
        if (!this.marketEventSystem) {
            return [];
        }
        return this.marketEventSystem.getActiveEvents();
    }
    
    /**
     * Get current state
     */
    getState() {
        return {
            phase: this.auctionPhase,
            currentResource: this.currentResource,
            timeRemaining: Math.max(0, Math.round(this.timeRemaining)),
            marketPrice: this.marketPrice,
            lastTradePrice: this.lastTradePrice,
            supply: this.supply,
            demand: this.demand,
            playerPositions: Array.from(this.playerPositions.entries()).map(([id, pos]) => ({
                playerId: id,
                ...pos
            })),
            pendingTrades: this.pendingTrades.length,
            priceRange: this.priceRange,
            marketEvents: this.getActiveMarketEvents()
        };
    }
    
    /**
     * Reset auction system
     */
    reset() {
        this.auctionPhase = 'inactive';
        this.currentResource = null;
        this.playerPositions.clear();
        this.pendingTrades = [];
        this.timeRemaining = 0;
    }
}