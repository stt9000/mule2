/**
 * Resource Model
 * Represents a magical resource in the game economy
 */
export default class Resource {
    /**
     * Create a new resource
     * @param {Object} config - Resource configuration
     * @param {string} config.type - Resource type from RESOURCE_TYPES
     * @param {number} config.basePrice - Base market price
     * @param {number} config.volatility - Price volatility factor
     * @param {number} config.decayRate - Resource decay rate per cycle
     * @param {Object} config.productionRange - Min/max production per territory
     */
    constructor(config) {
        this.type = config.type;
        this.basePrice = config.basePrice;
        this.volatility = config.volatility || 1.0;
        this.decayRate = config.decayRate || 0;
        this.productionRange = config.productionRange || { min: 5, max: 15 };
        
        // Current market state
        this.currentPrice = this.basePrice;
        this.currentSupply = 0;
        this.currentDemand = 0;
        this.totalProduction = 0;
        this.totalConsumption = 0;
        
        // Market trend tracking
        this.priceHistory = [this.basePrice];
        this.supplyHistory = [0];
        this.demandHistory = [0];
    }
    
    /**
     * Calculate a new market price based on supply and demand
     * @param {number} supply - Total supply available
     * @param {number} demand - Total demand
     * @param {number} equilibrium - Equilibrium point
     * @returns {number} The new market price
     */
    calculatePrice(supply, demand, equilibrium) {
        // Store current state
        this.currentSupply = supply;
        this.currentDemand = demand;
        
        // Calculate price based on the supply-demand formula from the design
        // Price = Base Price × (1 + [(Demand - Supply) ÷ Equilibrium] × Volatility)
        const surplusFactor = (demand - supply) / equilibrium;
        this.currentPrice = this.basePrice * (1 + surplusFactor * this.volatility);
        
        // Enforce min and max prices
        const minPrice = this.basePrice * 0.5;
        const maxPrice = this.basePrice * 5.0;
        this.currentPrice = Math.max(minPrice, Math.min(maxPrice, this.currentPrice));
        
        // Round to nearest whole number
        this.currentPrice = Math.round(this.currentPrice);
        
        // Track price history
        this.priceHistory.push(this.currentPrice);
        this.supplyHistory.push(supply);
        this.demandHistory.push(demand);
        
        // Only keep last 12 entries (one full game)
        if (this.priceHistory.length > 12) {
            this.priceHistory.shift();
            this.supplyHistory.shift();
            this.demandHistory.shift();
        }
        
        return this.currentPrice;
    }
    
    /**
     * Calculate resource decay for a given amount
     * @param {number} amount - Current amount of resource
     * @returns {number} Amount after decay
     */
    applyDecay(amount) {
        const decayAmount = Math.floor(amount * this.decayRate);
        return amount - decayAmount;
    }
    
    /**
     * Get a random production amount within the range for this resource
     * @returns {number} Random production amount
     */
    getRandomProduction() {
        const range = this.productionRange.max - this.productionRange.min;
        return Math.floor(this.productionRange.min + Math.random() * range);
    }
    
    /**
     * Get the current price trend
     * @returns {string} 'rising', 'falling', or 'stable'
     */
    getPriceTrend() {
        if (this.priceHistory.length < 2) {
            return 'stable';
        }
        
        const current = this.priceHistory[this.priceHistory.length - 1];
        const previous = this.priceHistory[this.priceHistory.length - 2];
        
        if (current > previous * 1.05) {
            return 'rising';
        } else if (current < previous * 0.95) {
            return 'falling';
        } else {
            return 'stable';
        }
    }
    
    /**
     * Apply a market event that affects this resource
     * @param {string} eventType - Type of market event
     * @param {Object} params - Event parameters
     */
    applyMarketEvent(eventType, params) {
        switch (eventType) {
            case 'price_shock':
                // Temporary price change
                const factor = params.factor || 1.5;
                this.currentPrice = Math.round(this.currentPrice * factor);
                break;
                
            case 'production_boost':
                // Temporary production boost
                this.productionRange = {
                    min: this.productionRange.min * (params.factor || 1.5),
                    max: this.productionRange.max * (params.factor || 1.5)
                };
                break;
                
            case 'supply_increase':
                // One-time supply increase
                this.currentSupply += params.amount || 100;
                break;
                
            case 'volatility_change':
                // Change price volatility
                this.volatility = params.volatility || this.volatility;
                break;
        }
    }
}