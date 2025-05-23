import ErrorHandler from '../utils/ErrorHandler.js';

/**
 * TerritoryAcquisition
 * Manages territory claiming, disputes, and auction queueing
 */
export default class TerritoryAcquisition {
    constructor(gameFlowController) {
        this.gameFlow = gameFlowController;
        this.eventSystem = gameFlowController;
        this.freeClaimsPerPlayer = new Map(); // player ID -> remaining claims
        this.disputedTerritories = new Map(); // territory ID -> [player IDs]
        this.auctionQueue = [];
        this.claimHistory = [];
        
        // Error handling
        this.errorHandler = new ErrorHandler();
    }

    /**
     * Initialize for a new cycle
     */
    initializeForCycle() {
        const players = this.gameFlow?.stateManager?.gameState?.players || [];
        
        // Reset free claims for each player (1 per cycle)
        players.forEach(player => {
            this.freeClaimsPerPlayer.set(player.id, 1);
        });
        
        this.disputedTerritories.clear();
        this.auctionQueue = [];
        
        this.eventSystem?.broadcastEvent('acquisition.initialized', {
            cycle: this.gameFlow?.cycleManager?.currentCycle,
            playerCount: players.length
        });
    }

    /**
     * Attempt to claim a territory
     */
    attemptClaim(playerId, territoryId) {
        try {
            const territory = this.gameFlow?.territoryGrid?.getTerritoryById(territoryId);
            const turnManager = this.gameFlow?.turnManager;
            const currentPhase = this.gameFlow?.cycleManager?.currentPhase;
            
            // Validate claim attempt
            if (!this.canAttemptClaim(playerId, territory)) {
                return { success: false, reason: 'Cannot claim this territory' };
            }

            // Check if it's a free claim or needs auction
            if (this.canClaimFree(playerId, territory)) {
                return this.processFreeClaim(playerId, territory);
            } else {
                return this.addToAuction(playerId, territory);
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'TerritoryAcquisition.attemptClaim');
            return { success: false, reason: error.message };
        }
    }

    /**
     * Check if player can attempt to claim
     */
    canAttemptClaim(playerId, territory) {
        if (!territory || !this.gameFlow) {
            console.log('canAttemptClaim failed: No territory or gameFlow');
            return false;
        }
        
        const currentPhase = this.gameFlow.cycleManager?.currentPhase;
        const turnManager = this.gameFlow.turnManager;
        
        // Get the player object from the state manager
        const player = this.gameFlow.stateManager?.getPlayer(playerId);
        if (!player) {
            console.log('canAttemptClaim failed: Player not found for ID', playerId);
            return false;
        }
        
        const canAct = turnManager.canPlayerAct(player, { type: 'claim_territory' });
        
        console.log('canAttemptClaim check:', {
            territoryId: territory.id,
            territoryOwner: territory.ownerId,
            currentPhase: currentPhase,
            expectedPhase: 'territory_selection',
            phaseMatch: currentPhase === 'territory_selection',
            canPlayerAct: canAct,
            playerId: playerId
        });
        
        return territory.ownerId === null &&
               currentPhase === 'territory_selection' &&
               canAct;
    }

    /**
     * Check if player can claim for free
     */
    canClaimFree(playerId, territory) {
        return territory.ownerId === null && 
               this.freeClaimsPerPlayer.get(playerId) > 0 &&
               !this.disputedTerritories.has(territory.id);
    }

    /**
     * Process a free claim
     */
    processFreeClaim(playerId, territory) {
        // For now, just record the player's interest in this territory
        // Disputes will be resolved at the end of the phase when all players have chosen
        
        // Check if another player already selected this territory
        const existingClaims = this.disputedTerritories.get(territory.id) || [];
        
        if (existingClaims.length > 0) {
            // Add this player to the dispute list
            existingClaims.push(playerId);
            this.disputedTerritories.set(territory.id, existingClaims);
            console.log(`Territory ${territory.id} now disputed between: ${existingClaims.join(', ')}`);
            return { success: true, type: 'disputed', message: 'Territory selection recorded - will be resolved at end of phase' };
        } else {
            // First player to select this territory
            this.disputedTerritories.set(territory.id, [playerId]);
            console.log(`Territory ${territory.id} selected by ${playerId} (pending phase end)`);
        }
        this.freeClaimsPerPlayer.set(playerId, this.freeClaimsPerPlayer.get(playerId) - 1);
        
        // Record claim
        this.claimHistory.push({
            playerId: playerId,
            territoryId: territory.id,
            type: 'free_claim',
            timestamp: Date.now(),
            cycle: this.gameFlow?.cycleManager?.currentCycle
        });
        
        // Consume player action
        const player = this.gameFlow.stateManager?.getPlayer(playerId);
        if (player) {
            this.gameFlow?.turnManager?.executePlayerAction(player, {
                type: 'claim_territory',
                target: territory.id,
                cost: 'free'
            });
        }
        
        this.eventSystem?.broadcastEvent('territory.selected', {
            territory: territory,
            playerId: playerId,
            territoryId: territory.id,
            remainingClaims: this.freeClaimsPerPlayer.get(playerId)
        });

        return { success: true, type: 'selection_recorded', message: 'Territory selection recorded - will be resolved at end of phase' };
    }

    /**
     * Check if other players want the same territory
     */
    checkForDisputes(playerId, territory) {
        // In a real implementation, this would check actual player intentions
        // For now, simulate based on territory value and player strategy
        const players = this.gameFlow?.stateManager?.gameState?.players || [];
        const interestedPlayers = players.filter(p => 
            p.id !== playerId && 
            this.freeClaimsPerPlayer.get(p.id) > 0 &&
            this.wouldPlayerWantTerritory(p, territory)
        );

        if (interestedPlayers.length > 0) {
            // Create dispute
            const disputingPlayers = [playerId, ...interestedPlayers.map(p => p.id)];
            this.disputedTerritories.set(territory.id, disputingPlayers);
            
            this.eventSystem?.broadcastEvent('territory.disputed', {
                territoryId: territory.id,
                players: disputingPlayers
            });
            
            return true;
        }

        return false;
    }

    /**
     * AI logic for determining if a player would want a territory
     */
    wouldPlayerWantTerritory(player, territory) {
        // Simple heuristic based on territory value and player's current holdings
        const territoryValue = territory.getWorth();
        const playerTerritories = this.gameFlow?.territoryGrid?.getPlayerTerritories(player.id) || [];
        
        // Base chance of wanting a territory (30%)
        let desirability = 0.3;
        
        // If player has no territories yet, increase chance to 50%
        if (playerTerritories.length === 0) {
            desirability = 0.5;
        }
        
        // High-value territories (>150) add 20% chance
        if (territoryValue > 150) {
            desirability += 0.2;
        }
        
        // Very high-value territories (>200) add another 10%
        if (territoryValue > 200) {
            desirability += 0.1;
        }
        
        // Cap at 80% chance to avoid always disputing
        desirability = Math.min(desirability, 0.8);
        
        return Math.random() < desirability;
    }

    /**
     * Resolve all disputed territories
     */
    resolveDisputes() {
        console.log('Resolving territory selections...');
        console.log('Disputed territories:', Array.from(this.disputedTerritories.entries()));
        
        for (const [territoryId, playerIds] of this.disputedTerritories) {
            const territory = this.gameFlow?.territoryGrid?.getTerritoryById(territoryId);
            if (!territory) continue;
            
            const players = playerIds.map(id => 
                this.gameFlow?.stateManager?.gameState?.players.find(p => p.id === id)
            ).filter(p => p);
            
            if (players.length === 0) continue;
            
            let winner;
            
            if (players.length === 1) {
                // Undisputed - only one player wanted it
                winner = players[0];
                console.log(`Territory ${territoryId} awarded to ${winner.id} (undisputed)`);
            } else {
                // Disputed - award to poorest player (M.U.L.E. tie-breaking rule)
                winner = players.reduce((poorest, current) => {
                    const currentWealth = this.calculatePlayerWealth(current);
                    const poorestWealth = this.calculatePlayerWealth(poorest);
                    return currentWealth < poorestWealth ? current : poorest;
                });
                console.log(`Territory ${territoryId} disputed by ${playerIds.join(', ')} - awarded to ${winner.id} (poorest)`);
            }
            
            // Award territory
            territory.setOwner(winner.id);
            console.log(`Territory ${territoryId} owner set to ${winner.id}`);
            
            // Broadcast ownership change
            this.eventSystem?.broadcastEvent('territory.ownership_changed', {
                territoryId: territory.id,
                newOwner: winner.id,
                previousOwner: null
            });
            
            // Record resolution
            this.claimHistory.push({
                playerId: winner.id,
                territoryId: territory.id,
                type: 'dispute_resolution',
                disputedWith: playerIds.filter(id => id !== winner.id),
                timestamp: Date.now(),
                cycle: this.gameFlow?.cycleManager?.currentCycle
            });
            
            // Notify all involved players
            playerIds.forEach(playerId => {
                this.eventSystem?.broadcastEvent('dispute.resolved', {
                    territoryId: territoryId,
                    winner: winner.id,
                    wasInvolved: true,
                    playerId: playerId
                });
            });
        }
        
        this.disputedTerritories.clear();
    }

    /**
     * Calculate player wealth for tie-breaking
     */
    calculatePlayerWealth(player) {
        if (!player) return 0;
        
        let wealth = player.gold || 0;
        
        // Add territory values
        const territories = this.gameFlow?.territoryGrid?.getPlayerTerritories(player.id) || [];
        wealth += territories.length * 50;
        
        // Add construct values
        wealth += territories.filter(t => t.construct).length * 75;
        
        // Add resource values
        if (player.resources) {
            const prices = this.gameFlow?.stateManager?.gameState?.market?.prices || {};
            Object.entries(player.resources).forEach(([resource, amount]) => {
                wealth += amount * (prices[resource] || 20);
            });
        }
        
        return wealth;
    }

    /**
     * Add territory to auction queue
     */
    addToAuction(playerId, territory) {
        if (!this.auctionQueue.find(item => item.territoryId === territory.id)) {
            const auctionItem = {
                territoryId: territory.id,
                initialBidder: playerId,
                minimumBid: this.calculateMinimumBid(territory),
                bids: [{
                    playerId: playerId,
                    amount: this.calculateMinimumBid(territory),
                    timestamp: Date.now()
                }]
            };
            
            this.auctionQueue.push(auctionItem);
            
            this.eventSystem?.broadcastEvent('territory.queued_for_auction', {
                territoryId: territory.id,
                minimumBid: auctionItem.minimumBid,
                initialBidder: playerId
            });
        }
        
        return { success: true, type: 'queued_for_auction' };
    }

    /**
     * Calculate minimum bid for a territory
     */
    calculateMinimumBid(territory) {
        const basePrice = 100;
        const typeMultiplier = {
            volcanic_field: 1.5,  // Rare aether production
            mountain_peak: 1.3,   // Balanced production
            ruined_temple: 1.2,   // Good arcanum
            crystalline_cave: 1.2, // Good mana
            marshland: 1.1,       // Excellent vitality
            ancient_grove: 1.0    // Standard
        };
        
        const multiplier = typeMultiplier[territory.type] || 1.0;
        const cycleBonus = (this.gameFlow?.cycleManager?.currentCycle || 1) * 10;
        
        return Math.floor(basePrice * multiplier + cycleBonus);
    }

    /**
     * Process auction queue
     */
    processAuctionQueue() {
        const results = [];
        
        this.auctionQueue.forEach(auctionItem => {
            const territory = this.gameFlow?.territoryGrid?.getTerritoryById(auctionItem.territoryId);
            if (!territory || territory.ownerId) {
                // Territory already claimed, skip
                return;
            }
            
            // Find highest bidder
            const highestBid = auctionItem.bids.reduce((highest, current) => 
                current.amount > highest.amount ? current : highest
            );
            
            const winner = this.gameFlow?.stateManager?.gameState?.players.find(
                p => p.id === highestBid.playerId
            );
            
            if (winner && winner.gold >= highestBid.amount) {
                // Process purchase
                territory.setOwner(winner.id);
                
                // Deduct gold using GoldManager
                const goldResult = this.gameFlow.goldManager?.deductGold(
                    winner.id,
                    highestBid.amount,
                    `Territory auction: ${territory.id}`
                );
                
                if (!goldResult?.success) {
                    console.error('Failed to deduct gold for territory auction');
                    return;
                }
                
                results.push({
                    territoryId: territory.id,
                    winner: winner.id,
                    price: highestBid.amount
                });
                
                this.eventSystem?.broadcastEvent('territory.auctioned', {
                    territoryId: territory.id,
                    winner: winner.id,
                    price: highestBid.amount,
                    bidders: auctionItem.bids.map(b => b.playerId)
                });
            }
        });
        
        // Clear processed auctions
        this.auctionQueue = [];
        
        return results;
    }

    /**
     * Get acquisition statistics
     */
    getStatistics() {
        return {
            totalClaims: this.claimHistory.length,
            freeClaimsRemaining: Array.from(this.freeClaimsPerPlayer.entries()),
            disputedTerritories: this.disputedTerritories.size,
            pendingAuctions: this.auctionQueue.length,
            claimsByType: this.getClaimsByType()
        };
    }

    /**
     * Get claims grouped by type
     */
    getClaimsByType() {
        const types = {};
        this.claimHistory.forEach(claim => {
            types[claim.type] = (types[claim.type] || 0) + 1;
        });
        return types;
    }

    /**
     * Get serializable state
     */
    getSerializableState() {
        return {
            freeClaimsPerPlayer: Array.from(this.freeClaimsPerPlayer.entries()),
            disputedTerritories: Array.from(this.disputedTerritories.entries()),
            auctionQueue: this.auctionQueue,
            claimHistory: this.claimHistory
        };
    }

    /**
     * Restore from saved state
     */
    restoreFromState(savedState) {
        if (savedState.freeClaimsPerPlayer) {
            this.freeClaimsPerPlayer = new Map(savedState.freeClaimsPerPlayer);
        }
        if (savedState.disputedTerritories) {
            this.disputedTerritories = new Map(savedState.disputedTerritories);
        }
        if (savedState.auctionQueue) {
            this.auctionQueue = savedState.auctionQueue;
        }
        if (savedState.claimHistory) {
            this.claimHistory = savedState.claimHistory;
        }
    }
}