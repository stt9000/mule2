export default class ResourceDecay {
    constructor() {
        // Decay rates per cycle
        this.decayRates = {
            mana: 0.20,      // 20% decay per cycle (energy dissipates)
            vitality: 0.50,  // 50% decay per cycle (organic, decays fastest)  
            arcanum: 0.00,   // 0% decay (stable magical material)
            aether: 0.10     // 10% decay (volatile but partially stable)
        };
        
        // Preservation methods available for purchase
        this.preservationMethods = {
            mana: {
                name: 'Mana Crystals',
                cost: 500,
                capacity: 50,
                description: 'Stores up to 50 mana without decay'
            },
            vitality: {
                name: 'Life Pods',
                cost: 400,
                capacity: 40,
                description: 'Preserves up to 40 vitality'
            },
            arcanum: {
                name: 'Rune Stones',
                cost: 300,
                capacity: 100,
                description: 'Additional arcanum storage'
            },
            aether: {
                name: 'Void Containers',
                cost: 600,
                capacity: 30,
                description: 'Stabilizes up to 30 aether'
            }
        };
        
        // Track player preservation purchases
        this.playerPreservation = new Map();
    }
    
    /**
     * Apply decay to a player's resources at end of cycle
     */
    applyDecay(player) {
        const decayedResources = {};
        const preservedAmounts = this.getPreservedAmounts(player.id);
        
        Object.keys(player.resources).forEach(resource => {
            const currentAmount = player.resources[resource] || 0;
            const preservedAmount = preservedAmounts[resource] || 0;
            
            // Only decay amount exceeding preservation capacity
            const decayableAmount = Math.max(0, currentAmount - preservedAmount);
            const decayAmount = Math.floor(decayableAmount * this.decayRates[resource]);
            
            decayedResources[resource] = decayAmount;
            player.resources[resource] = Math.max(0, currentAmount - decayAmount);
        });
        
        return {
            playerId: player.id,
            playerName: player.name,
            decayed: decayedResources,
            remaining: { ...player.resources },
            preserved: preservedAmounts
        };
    }
    
    /**
     * Apply decay to all players
     */
    applyDecayToAllPlayers(players) {
        const decayResults = [];
        
        players.forEach(player => {
            const result = this.applyDecay(player);
            decayResults.push(result);
        });
        
        return decayResults;
    }
    
    /**
     * Get preserved amounts for a player
     */
    getPreservedAmounts(playerId) {
        const preservation = this.playerPreservation.get(playerId) || {};
        const amounts = {};
        
        Object.keys(this.decayRates).forEach(resource => {
            amounts[resource] = (preservation[resource] || 0) * 
                                (this.preservationMethods[resource]?.capacity || 0);
        });
        
        return amounts;
    }
    
    /**
     * Purchase preservation for a resource
     */
    purchasePreservation(player, resourceType) {
        const method = this.preservationMethods[resourceType];
        if (!method) {
            return {
                success: false,
                reason: 'Invalid resource type'
            };
        }
        
        if (player.gold < method.cost) {
            return {
                success: false,
                reason: 'Insufficient gold',
                required: method.cost,
                available: player.gold
            };
        }
        
        // Initialize player preservation if needed
        if (!this.playerPreservation.has(player.id)) {
            this.playerPreservation.set(player.id, {});
        }
        
        const playerPres = this.playerPreservation.get(player.id);
        
        // Deduct cost and add preservation
        player.gold -= method.cost;
        playerPres[resourceType] = (playerPres[resourceType] || 0) + 1;
        
        return {
            success: true,
            method: method.name,
            newCapacity: playerPres[resourceType] * method.capacity,
            cost: method.cost
        };
    }
    
    /**
     * Get preservation status for a player
     */
    getPreservationStatus(playerId) {
        const preservation = this.playerPreservation.get(playerId) || {};
        const status = {};
        
        Object.keys(this.decayRates).forEach(resource => {
            const count = preservation[resource] || 0;
            const method = this.preservationMethods[resource];
            
            status[resource] = {
                count: count,
                capacity: count * (method?.capacity || 0),
                methodName: method?.name || 'None',
                nextCost: method?.cost || 0,
                decayRate: this.decayRates[resource]
            };
        });
        
        return status;
    }
    
    /**
     * Calculate potential decay for preview
     */
    calculatePotentialDecay(player) {
        const preview = {};
        const preservedAmounts = this.getPreservedAmounts(player.id);
        
        Object.keys(player.resources).forEach(resource => {
            const currentAmount = player.resources[resource] || 0;
            const preservedAmount = preservedAmounts[resource] || 0;
            const decayableAmount = Math.max(0, currentAmount - preservedAmount);
            const decayAmount = Math.floor(decayableAmount * this.decayRates[resource]);
            
            preview[resource] = {
                current: currentAmount,
                preserved: preservedAmount,
                willDecay: decayAmount,
                willRemain: currentAmount - decayAmount,
                decayRate: this.decayRates[resource]
            };
        });
        
        return preview;
    }
    
    /**
     * Get decay summary for display
     */
    generateDecaySummary(decayResults) {
        const summary = {
            totalDecayed: {
                mana: 0,
                vitality: 0,
                arcanum: 0,
                aether: 0
            },
            playerSummaries: []
        };
        
        decayResults.forEach(result => {
            // Add to totals
            Object.entries(result.decayed).forEach(([resource, amount]) => {
                summary.totalDecayed[resource] += amount;
            });
            
            // Add player summary if they had decay
            const totalDecay = Object.values(result.decayed).reduce((sum, val) => sum + val, 0);
            if (totalDecay > 0) {
                summary.playerSummaries.push({
                    playerName: result.playerName,
                    decayed: result.decayed,
                    preserved: result.preserved
                });
            }
        });
        
        return summary;
    }
}