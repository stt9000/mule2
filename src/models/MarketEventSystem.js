/**
 * MarketEventSystem
 * Manages random market events that affect resource prices and trading
 */
export default class MarketEventSystem {
    constructor(marketDataService, auctionManager) {
        this.marketDataService = marketDataService;
        this.auctionManager = auctionManager;
        
        // Event configuration
        this.eventProbability = 0.15; // 15% chance per resource auction
        this.activeEvents = [];
        this.eventHistory = [];
        this.maxHistorySize = 20;
        
        // Define market events
        this.eventDefinitions = [
            {
                id: 'surge_demand',
                name: 'Demand Surge',
                description: 'A sudden need for {resource} drives prices up!',
                effect: {
                    type: 'price_modifier',
                    priceChange: 1.2, // 20% increase
                    duration: 60 // seconds
                },
                weight: 30
            },
            {
                id: 'supply_shortage',
                name: 'Supply Shortage',
                description: 'A shortage of {resource} is causing panic buying!',
                effect: {
                    type: 'price_modifier',
                    priceChange: 1.3, // 30% increase
                    duration: 45
                },
                weight: 20
            },
            {
                id: 'abundant_harvest',
                name: 'Abundant Harvest',
                description: 'An unexpected surplus of {resource} floods the market!',
                effect: {
                    type: 'price_modifier',
                    priceChange: 0.7, // 30% decrease
                    duration: 60
                },
                weight: 25
            },
            {
                id: 'trade_disruption',
                name: 'Trade Disruption',
                description: 'Magical interference is affecting {resource} trades!',
                effect: {
                    type: 'volatility',
                    volatilityIncrease: 2.0, // Double volatility
                    duration: 30
                },
                weight: 15
            },
            {
                id: 'merchant_speculation',
                name: 'Merchant Speculation',
                description: 'Wealthy merchants are manipulating {resource} prices!',
                effect: {
                    type: 'price_push',
                    direction: 'random', // Can go up or down
                    magnitude: 15, // +/- 15 gold
                    duration: 40
                },
                weight: 20
            },
            {
                id: 'quality_discovery',
                name: 'Quality Discovery',
                description: 'Higher quality {resource} discovered - buyers willing to pay more!',
                effect: {
                    type: 'buyer_boost',
                    buyerPriceBoost: 10, // Buyers will pay 10 gold more
                    duration: 50
                },
                weight: 15
            },
            {
                id: 'storage_crisis',
                name: 'Storage Crisis',
                description: 'Storage facilities full - sellers desperate to offload {resource}!',
                effect: {
                    type: 'seller_pressure',
                    sellerPriceReduction: 10, // Sellers will accept 10 gold less
                    duration: 50
                },
                weight: 15
            }
        ];
        
        // Calculate total weight for probability
        this.totalWeight = this.eventDefinitions.reduce((sum, event) => sum + event.weight, 0);
    }
    
    /**
     * Check if a market event should trigger
     */
    checkForEvent(resource) {
        if (Math.random() > this.eventProbability) {
            return null; // No event
        }
        
        // Select a random event based on weights
        const event = this.selectRandomEvent();
        if (!event) return null;
        
        // Create event instance
        const eventInstance = this.createEventInstance(event, resource);
        
        // Add to active events
        this.activeEvents.push(eventInstance);
        this.addToHistory(eventInstance);
        
        // Apply event effects
        this.applyEventEffects(eventInstance);
        
        return eventInstance;
    }
    
    /**
     * Select a random event based on weights
     */
    selectRandomEvent() {
        const random = Math.random() * this.totalWeight;
        let accumulator = 0;
        
        for (const event of this.eventDefinitions) {
            accumulator += event.weight;
            if (random <= accumulator) {
                return event;
            }
        }
        
        return this.eventDefinitions[0]; // Fallback
    }
    
    /**
     * Create an instance of an event
     */
    createEventInstance(eventDef, resource) {
        return {
            id: `${eventDef.id}_${Date.now()}`,
            definitionId: eventDef.id,
            name: eventDef.name,
            description: eventDef.description.replace('{resource}', resource),
            resource: resource,
            effect: { ...eventDef.effect },
            startTime: Date.now(),
            endTime: Date.now() + (eventDef.effect.duration * 1000),
            active: true
        };
    }
    
    /**
     * Apply event effects
     */
    applyEventEffects(event) {
        switch (event.effect.type) {
            case 'price_modifier':
                this.applyPriceModifier(event);
                break;
            case 'volatility':
                this.applyVolatilityEffect(event);
                break;
            case 'price_push':
                this.applyPricePush(event);
                break;
            case 'buyer_boost':
                this.applyBuyerBoost(event);
                break;
            case 'seller_pressure':
                this.applySellerPressure(event);
                break;
        }
    }
    
    /**
     * Apply price modifier effect
     */
    applyPriceModifier(event) {
        if (!this.auctionManager) return;
        
        const currentPrice = this.marketDataService.getCurrentPrice(event.resource);
        const newPrice = Math.round(currentPrice * event.effect.priceChange);
        
        // Update market price
        this.auctionManager.marketPrice = newPrice;
        
        // Record in market data
        this.marketDataService.recordTrade(event.resource, newPrice, 0);
        
        console.log(`Market event: ${event.name} - Price changed from ${currentPrice} to ${newPrice}`);
    }
    
    /**
     * Apply volatility effect
     */
    applyVolatilityEffect(event) {
        // This would affect how quickly prices can change
        // For now, we'll simulate by adding noise to market price
        if (!this.auctionManager) return;
        
        const basePrice = this.auctionManager.marketPrice;
        const volatility = 5 * event.effect.volatilityIncrease;
        
        // Add volatility flag
        event.volatilityInterval = setInterval(() => {
            if (!event.active) {
                clearInterval(event.volatilityInterval);
                return;
            }
            
            const noise = (Math.random() - 0.5) * volatility;
            const newPrice = Math.round(basePrice + noise);
            this.auctionManager.marketPrice = Math.max(10, Math.min(100, newPrice));
        }, 2000);
    }
    
    /**
     * Apply price push effect
     */
    applyPricePush(event) {
        if (!this.auctionManager) return;
        
        const direction = event.effect.direction === 'random' ? 
            (Math.random() > 0.5 ? 1 : -1) : 
            (event.effect.direction === 'up' ? 1 : -1);
        
        const currentPrice = this.auctionManager.marketPrice;
        const newPrice = currentPrice + (direction * event.effect.magnitude);
        
        this.auctionManager.marketPrice = Math.max(10, Math.min(100, newPrice));
        
        console.log(`Market event: ${event.name} - Price pushed from ${currentPrice} to ${this.auctionManager.marketPrice}`);
    }
    
    /**
     * Apply buyer boost effect
     */
    applyBuyerBoost(event) {
        // This affects all buyers' effective prices
        event.buyerBoost = event.effect.buyerPriceBoost;
        console.log(`Market event: ${event.name} - Buyers will pay ${event.buyerBoost} gold more`);
    }
    
    /**
     * Apply seller pressure effect
     */
    applySellerPressure(event) {
        // This affects all sellers' effective prices
        event.sellerPressure = event.effect.sellerPriceReduction;
        console.log(`Market event: ${event.name} - Sellers will accept ${event.sellerPressure} gold less`);
    }
    
    /**
     * Get current active events for a resource
     */
    getActiveEvents(resource = null) {
        const now = Date.now();
        
        // Remove expired events
        this.activeEvents = this.activeEvents.filter(event => {
            if (event.endTime < now) {
                event.active = false;
                this.removeEventEffects(event);
                return false;
            }
            return true;
        });
        
        // Return filtered by resource if specified
        if (resource) {
            return this.activeEvents.filter(event => event.resource === resource);
        }
        
        return this.activeEvents;
    }
    
    /**
     * Remove event effects when expired
     */
    removeEventEffects(event) {
        // Clean up any intervals
        if (event.volatilityInterval) {
            clearInterval(event.volatilityInterval);
        }
        
        console.log(`Market event ended: ${event.name}`);
    }
    
    /**
     * Get effective prices considering events
     */
    getEffectivePrices(resource, buyerPrice, sellerPrice) {
        const events = this.getActiveEvents(resource);
        let effectiveBuyerPrice = buyerPrice;
        let effectiveSellerPrice = sellerPrice;
        
        events.forEach(event => {
            if (event.buyerBoost) {
                effectiveBuyerPrice += event.buyerBoost;
            }
            if (event.sellerPressure) {
                effectiveSellerPrice -= event.sellerPressure;
            }
        });
        
        return {
            buyerPrice: Math.max(10, Math.min(100, effectiveBuyerPrice)),
            sellerPrice: Math.max(10, Math.min(100, effectiveSellerPrice))
        };
    }
    
    /**
     * Add event to history
     */
    addToHistory(event) {
        this.eventHistory.unshift({
            ...event,
            timestamp: Date.now()
        });
        
        // Trim history
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.pop();
        }
    }
    
    /**
     * Get event history
     */
    getEventHistory(limit = 10) {
        return this.eventHistory.slice(0, limit);
    }
    
    /**
     * Get event summary for UI
     */
    getEventSummary() {
        const activeEvents = this.getActiveEvents();
        return {
            activeCount: activeEvents.length,
            events: activeEvents.map(event => ({
                name: event.name,
                description: event.description,
                timeRemaining: Math.max(0, Math.ceil((event.endTime - Date.now()) / 1000))
            }))
        };
    }
    
    /**
     * Reset all events
     */
    reset() {
        // Clear all active events
        this.activeEvents.forEach(event => {
            this.removeEventEffects(event);
        });
        
        this.activeEvents = [];
        this.eventHistory = [];
    }
}