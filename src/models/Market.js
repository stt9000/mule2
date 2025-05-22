/**
 * Market Model
 * Manages the game economy and market auction system
 */
export default class Market {
    /**
     * Create a new market
     * @param {Object} config - Market configuration
     * @param {Object} config.resources - Resource objects by type
     * @param {number} config.guildTax - Market transaction tax rate
     * @param {number} config.equilibrium - Base equilibrium point
     */
    constructor(config) {
        this.resources = config.resources || {};
        this.guildTax = config.guildTax || 0.05; // 5% transaction tax
        this.equilibrium = config.equilibrium || 100;
        
        // Market state
        this.supply = {}; // Current supply by resource type
        this.demand = {}; // Current demand by resource type
        this.auctionQueue = []; // Resources to be auctioned
        
        // Market events
        this.currentEvent = null;
        this.eventHistory = [];
        
        // Initialize market state
        this.initializeMarket();
    }
    
    /**
     * Initialize starting supply/demand for resources
     */
    initializeMarket() {
        // Set initial supply and demand
        for (const type of Object.keys(this.resources)) {
            this.supply[type] = 0;
            this.demand[type] = this.equilibrium;
        }
    }
    
    /**
     * Update resource prices based on current supply and demand
     * @param {number} playerCount - Number of players for equilibrium adjustment
     */
    updatePrices(playerCount) {
        // Adjust equilibrium based on player count
        const adjustedEquilibrium = this.equilibrium * playerCount;
        
        // Update prices for each resource
        for (const [type, resource] of Object.entries(this.resources)) {
            resource.calculatePrice(
                this.supply[type],
                this.demand[type],
                adjustedEquilibrium
            );
        }
    }
    
    /**
     * Process a market transaction
     * @param {Object} player - The player making the transaction
     * @param {string} type - Transaction type ('buy' or 'sell')
     * @param {string} resourceType - The resource type being traded
     * @param {number} amount - Amount of resource
     * @param {number} price - Agreed price per unit
     * @param {number} cycle - Current game cycle
     * @returns {boolean} Whether the transaction was successful
     */
    processTransaction(player, type, resourceType, amount, price, cycle) {
        // Check if resource exists in market
        if (!this.resources[resourceType]) {
            return false;
        }
        
        // Apply guild tax
        const taxAmount = Math.floor(amount * price * this.guildTax);
        const netPrice = type === 'buy' ? price + taxAmount : price - taxAmount;
        
        // Process player side of transaction
        const success = player.processTransaction(
            type, 
            resourceType, 
            amount, 
            netPrice, 
            cycle
        );
        
        if (!success) {
            return false;
        }
        
        // Update market supply/demand
        if (type === 'buy') {
            this.supply[resourceType] -= amount;
            this.demand[resourceType] += amount;
        } else {
            this.supply[resourceType] += amount;
            this.demand[resourceType] -= amount;
        }
        
        // Ensure values don't go negative
        this.supply[resourceType] = Math.max(0, this.supply[resourceType]);
        this.demand[resourceType] = Math.max(0, this.demand[resourceType]);
        
        return true;
    }
    
    /**
     * Queue resources for auction
     * @param {string} resourceType - Resource type to auction
     * @param {number} amount - Amount to auction
     * @param {Object} seller - Player selling the resource (null for market)
     */
    queueForAuction(resourceType, amount, seller = null) {
        this.auctionQueue.push({
            resourceType,
            amount,
            seller,
            minPrice: Math.floor(this.resources[resourceType].currentPrice * 0.7)
        });
    }
    
    /**
     * Get current auction state
     * @returns {Object} Current auction state
     */
    getAuctionState() {
        // Return an empty state if no auctions in queue
        if (this.auctionQueue.length === 0) {
            return {
                active: false,
                resourceType: null,
                amount: 0,
                currentPrice: 0,
                seller: null,
                highestBidder: null
            };
        }
        
        // Get current auction
        const currentAuction = this.auctionQueue[0];
        
        return {
            active: true,
            resourceType: currentAuction.resourceType,
            amount: currentAuction.amount,
            currentPrice: currentAuction.currentPrice || currentAuction.minPrice,
            seller: currentAuction.seller,
            highestBidder: currentAuction.highestBidder || null
        };
    }
    
    /**
     * Place a bid in the current auction
     * @param {Object} player - Player placing the bid
     * @param {number} bid - Bid amount per unit
     * @returns {boolean} Whether the bid was successful
     */
    placeBid(player, bid) {
        if (this.auctionQueue.length === 0) {
            return false;
        }
        
        const auction = this.auctionQueue[0];
        
        // Check if bid is high enough
        if (bid < auction.minPrice) {
            return false;
        }
        
        // Check if player has enough gold
        const totalCost = bid * auction.amount;
        if (player.gold < totalCost) {
            return false;
        }
        
        // Update auction state
        auction.currentPrice = bid;
        auction.highestBidder = player;
        
        return true;
    }
    
    /**
     * Resolve the current auction
     * @param {number} cycle - Current game cycle
     * @returns {Object|null} Result of the auction, or null if no auction
     */
    resolveAuction(cycle) {
        if (this.auctionQueue.length === 0) {
            return null;
        }
        
        const auction = this.auctionQueue.shift();
        
        // If no bidder, return unsold result
        if (!auction.highestBidder) {
            return {
                result: 'unsold',
                resourceType: auction.resourceType,
                amount: auction.amount
            };
        }
        
        // Process the transaction
        const success = this.processTransaction(
            auction.highestBidder,
            'buy',
            auction.resourceType,
            auction.amount,
            auction.currentPrice,
            cycle
        );
        
        if (!success) {
            return {
                result: 'failed',
                resourceType: auction.resourceType,
                amount: auction.amount
            };
        }
        
        // If there was a seller, give them the proceeds
        if (auction.seller) {
            // Apply tax
            const taxAmount = Math.floor(auction.amount * auction.currentPrice * this.guildTax);
            const netProceeds = auction.currentPrice * auction.amount - taxAmount;
            
            auction.seller.gold += netProceeds;
        }
        
        return {
            result: 'sold',
            resourceType: auction.resourceType,
            amount: auction.amount,
            price: auction.currentPrice,
            buyer: auction.highestBidder,
            seller: auction.seller
        };
    }
    
    /**
     * Generate a random market event
     * @param {number} cycle - Current game cycle
     * @returns {Object} The generated event
     */
    generateRandomEvent(cycle) {
        const events = [
            {
                type: 'magical_convergence',
                name: 'Magical Convergence',
                description: 'Mana prices drop 40%, other resources increase 10%',
                effects: {
                    mana: { price_shock: { factor: 0.6 } },
                    vitality: { price_shock: { factor: 1.1 } },
                    arcanum: { price_shock: { factor: 1.1 } },
                    aether: { price_shock: { factor: 1.1 } }
                }
            },
            {
                type: 'life_bloom',
                name: 'Life Bloom',
                description: 'Vitality production doubles, prices drop 30%',
                effects: {
                    vitality: { 
                        production_boost: { factor: 2.0 },
                        price_shock: { factor: 0.7 }
                    }
                }
            },
            {
                type: 'ancient_discovery',
                name: 'Ancient Discovery',
                description: 'Arcanum prices drop 35% from supply increase',
                effects: {
                    arcanum: { 
                        supply_increase: { amount: 200 },
                        price_shock: { factor: 0.65 }
                    }
                }
            },
            {
                type: 'aether_storm',
                name: 'Aether Storm',
                description: 'Aether production doubles but becomes unstable',
                effects: {
                    aether: { 
                        production_boost: { factor: 2.0 },
                        volatility_change: { volatility: 2.0 }
                    }
                }
            },
            {
                type: 'mana_drought',
                name: 'Mana Drought',
                description: 'Mana production halved, prices spike',
                effects: {
                    mana: { 
                        production_boost: { factor: 0.5 },
                        price_shock: { factor: 2.0 }
                    }
                }
            },
            {
                type: 'planar_interference',
                name: 'Planar Interference',
                description: 'All production reduced 20%, prices rise 25%',
                effects: {
                    mana: { 
                        production_boost: { factor: 0.8 },
                        price_shock: { factor: 1.25 }
                    },
                    vitality: { 
                        production_boost: { factor: 0.8 },
                        price_shock: { factor: 1.25 }
                    },
                    arcanum: { 
                        production_boost: { factor: 0.8 },
                        price_shock: { factor: 1.25 }
                    },
                    aether: { 
                        production_boost: { factor: 0.8 },
                        price_shock: { factor: 1.25 }
                    }
                }
            }
        ];
        
        // Select a random event
        const event = events[Math.floor(Math.random() * events.length)];
        
        // Apply event effects
        for (const [resourceType, effects] of Object.entries(event.effects)) {
            if (this.resources[resourceType]) {
                for (const [effectType, params] of Object.entries(effects)) {
                    this.resources[resourceType].applyMarketEvent(effectType, params);
                }
            }
        }
        
        // Track event
        this.currentEvent = {
            ...event,
            cycle,
            duration: 1 // Most events last 1 cycle
        };
        
        this.eventHistory.push(this.currentEvent);
        
        return this.currentEvent;
    }
}