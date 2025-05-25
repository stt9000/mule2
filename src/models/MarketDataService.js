import { BASE_PRICES } from '../config/gameConfig.js';

/**
 * MarketDataService
 * Manages market data, price history, and supply/demand calculations
 */
export default class MarketDataService {
    constructor(gameStateManager) {
        this.gameStateManager = gameStateManager;
        
        // Price history tracking
        this.priceHistory = new Map(); // resource -> array of {price, timestamp, volume}
        this.maxHistoryLength = 100; // Keep last 100 data points
        
        // Market metrics
        this.marketMetrics = new Map(); // resource -> {avg, min, max, volatility}
        
        // Supply/demand data
        this.supplyData = new Map(); // resource -> {total, byPlayer}
        this.demandData = new Map(); // resource -> {total, byPlayer}
        
        // Market events
        this.marketEvents = [];
        this.maxEvents = 50;
        
        // Market configuration for price calculation
        this.marketConfig = {
            equilibrium: 100, // Base equilibrium point for supply/demand
            volatility: {
                mana: 0.3,      // 30% volatility
                vitality: 0.5,  // 50% volatility (food is more volatile)
                arcanum: 0.2,   // 20% volatility (stable building material)
                aether: 0.8     // 80% volatility (luxury resource)
            }
        };
        
        // Initialize resources
        const resources = ['mana', 'vitality', 'arcanum', 'aether'];
        resources.forEach(resource => {
            this.priceHistory.set(resource, [{
                price: 50,
                timestamp: Date.now(),
                volume: 0
            }]);
            this.marketMetrics.set(resource, {
                avg: 50,
                min: 50,
                max: 50,
                volatility: 0
            });
            this.supplyData.set(resource, { total: 0, byPlayer: new Map() });
            this.demandData.set(resource, { total: 0, byPlayer: new Map() });
        });
    }
    
    /**
     * Record a trade in price history
     */
    recordTrade(resource, price, volume) {
        if (!this.priceHistory.has(resource)) {
            return false;
        }
        
        const history = this.priceHistory.get(resource);
        history.push({
            price: price,
            timestamp: Date.now(),
            volume: volume
        });
        
        // Trim history if too long
        if (history.length > this.maxHistoryLength) {
            history.shift();
        }
        
        // Update market metrics
        this.updateMarketMetrics(resource);
        
        // Add market event
        this.addMarketEvent({
            type: 'trade',
            resource: resource,
            price: price,
            volume: volume,
            timestamp: Date.now()
        });
        
        return true;
    }
    
    /**
     * Update market metrics for a resource
     */
    updateMarketMetrics(resource) {
        const history = this.priceHistory.get(resource);
        if (!history || history.length === 0) return;
        
        // Calculate average, min, max
        let sum = 0;
        let min = Infinity;
        let max = -Infinity;
        
        history.forEach(entry => {
            sum += entry.price;
            min = Math.min(min, entry.price);
            max = Math.max(max, entry.price);
        });
        
        const avg = Math.round(sum / history.length);
        
        // Calculate volatility (standard deviation)
        let variance = 0;
        history.forEach(entry => {
            variance += Math.pow(entry.price - avg, 2);
        });
        const volatility = Math.round(Math.sqrt(variance / history.length));
        
        this.marketMetrics.set(resource, {
            avg: avg,
            min: min,
            max: max,
            volatility: volatility
        });
    }
    
    /**
     * Calculate supply and demand from game state
     */
    calculateSupplyDemand() {
        if (!this.gameStateManager) return;
        
        const gameState = this.gameStateManager.getState();
        if (!gameState || !gameState.players) return;
        
        // Reset data
        const resources = ['mana', 'vitality', 'arcanum', 'aether'];
        resources.forEach(resource => {
            this.supplyData.set(resource, { total: 0, byPlayer: new Map() });
            this.demandData.set(resource, { total: 0, byPlayer: new Map() });
        });
        
        // Calculate supply from player inventories
        Object.values(gameState.players).forEach(player => {
            if (!player.resources) return;
            
            resources.forEach(resource => {
                const amount = player.resources[resource] || 0;
                const supplyData = this.supplyData.get(resource);
                
                if (amount > 0) {
                    supplyData.total += amount;
                    supplyData.byPlayer.set(player.id, amount);
                }
            });
        });
        
        // Calculate demand based on construction needs
        Object.values(gameState.players).forEach(player => {
            if (!player.plannedConstructs) return;
            
            // Analyze planned constructs for resource needs
            player.plannedConstructs.forEach(construct => {
                if (!construct.resourceCost) return;
                
                Object.entries(construct.resourceCost).forEach(([resource, cost]) => {
                    const demandData = this.demandData.get(resource);
                    const currentAmount = player.resources[resource] || 0;
                    const needed = Math.max(0, cost - currentAmount);
                    
                    if (needed > 0) {
                        demandData.total += needed;
                        const currentDemand = demandData.byPlayer.get(player.id) || 0;
                        demandData.byPlayer.set(player.id, currentDemand + needed);
                    }
                });
            });
        });
    }
    
    /**
     * Get price trend for a resource
     */
    getPriceTrend(resource, periods = 10) {
        const history = this.priceHistory.get(resource);
        if (!history || history.length < 2) return 'stable';
        
        // Get recent prices
        const recentPrices = history.slice(-periods).map(h => h.price);
        if (recentPrices.length < 2) return 'stable';
        
        // Calculate trend
        let increases = 0;
        let decreases = 0;
        
        for (let i = 1; i < recentPrices.length; i++) {
            if (recentPrices[i] > recentPrices[i-1]) increases++;
            else if (recentPrices[i] < recentPrices[i-1]) decreases++;
        }
        
        if (increases > decreases * 1.5) return 'rising';
        if (decreases > increases * 1.5) return 'falling';
        return 'stable';
    }
    
    /**
     * Get market summary for a resource
     */
    getMarketSummary(resource) {
        const metrics = this.marketMetrics.get(resource) || {
            avg: 50,
            min: 50,
            max: 50,
            volatility: 0
        };
        
        const supply = this.supplyData.get(resource) || { total: 0, byPlayer: new Map() };
        const demand = this.demandData.get(resource) || { total: 0, byPlayer: new Map() };
        const trend = this.getPriceTrend(resource);
        
        return {
            resource: resource,
            currentPrice: this.getCurrentPrice(resource),
            metrics: metrics,
            supply: supply.total,
            demand: demand.total,
            trend: trend,
            marketPressure: this.calculateMarketPressure(resource)
        };
    }
    
    /**
     * Get current price (last traded or average)
     */
    getCurrentPrice(resource) {
        const history = this.priceHistory.get(resource);
        if (!history || history.length === 0) return 50;
        
        return history[history.length - 1].price;
    }
    
    /**
     * Calculate market pressure (supply vs demand)
     */
    calculateMarketPressure(resource) {
        const supply = this.supplyData.get(resource)?.total || 0;
        const demand = this.demandData.get(resource)?.total || 0;
        
        if (supply === 0 && demand === 0) return 'neutral';
        if (demand > supply * 1.5) return 'high_demand';
        if (supply > demand * 1.5) return 'high_supply';
        return 'balanced';
    }
    
    /**
     * Calculate dynamic price using the formula from game design
     * Price = Base Price × (1 + [(Demand - Supply) ÷ Equilibrium] × Volatility)
     */
    calculateDynamicPrice(resource) {
        // Get base price
        const basePrice = BASE_PRICES[resource] || 50;
        
        // Get supply and demand
        const supply = this.supplyData.get(resource)?.total || 0;
        const demand = this.demandData.get(resource)?.total || 0;
        
        // Get volatility for this resource
        const volatility = this.marketConfig.volatility[resource] || 0.3;
        
        // Calculate price modifier
        const supplyDemandDiff = demand - supply;
        const equilibrium = this.marketConfig.equilibrium;
        const priceModifier = 1 + ((supplyDemandDiff / equilibrium) * volatility);
        
        // Calculate final price
        let dynamicPrice = Math.round(basePrice * priceModifier);
        
        // Apply min/max constraints (10-500)
        dynamicPrice = Math.max(10, Math.min(500, dynamicPrice));
        
        return dynamicPrice;
    }
    
    /**
     * Update market prices based on supply/demand
     */
    updateMarketPrices() {
        // First calculate current supply/demand
        this.calculateSupplyDemand();
        
        // Update prices for each resource
        const resources = ['mana', 'vitality', 'arcanum', 'aether'];
        resources.forEach(resource => {
            const newPrice = this.calculateDynamicPrice(resource);
            
            // Only record if price changed significantly (>5%)
            const currentPrice = this.getCurrentPrice(resource);
            if (Math.abs(newPrice - currentPrice) / currentPrice > 0.05) {
                this.recordTrade(resource, newPrice, 0); // 0 volume for price update
            }
        });
    }
    
    /**
     * Add market event
     */
    addMarketEvent(event) {
        this.marketEvents.push(event);
        
        // Trim events if too many
        if (this.marketEvents.length > this.maxEvents) {
            this.marketEvents.shift();
        }
    }
    
    /**
     * Get recent market events
     */
    getRecentEvents(count = 10) {
        return this.marketEvents.slice(-count);
    }
    
    /**
     * Get all market data
     */
    getAllMarketData() {
        const data = {};
        const resources = ['mana', 'vitality', 'arcanum', 'aether'];
        
        resources.forEach(resource => {
            data[resource] = this.getMarketSummary(resource);
        });
        
        return {
            resources: data,
            events: this.getRecentEvents()
        };
    }
    
    /**
     * Reset market data
     */
    reset() {
        this.priceHistory.clear();
        this.marketMetrics.clear();
        this.supplyData.clear();
        this.demandData.clear();
        this.marketEvents = [];
        
        // Re-initialize
        const resources = ['mana', 'vitality', 'arcanum', 'aether'];
        resources.forEach(resource => {
            this.priceHistory.set(resource, [{
                price: 50,
                timestamp: Date.now(),
                volume: 0
            }]);
            this.marketMetrics.set(resource, {
                avg: 50,
                min: 50,
                max: 50,
                volatility: 0
            });
            this.supplyData.set(resource, { total: 0, byPlayer: new Map() });
            this.demandData.set(resource, { total: 0, byPlayer: new Map() });
        });
    }
}