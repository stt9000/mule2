import ErrorHandler from '../utils/ErrorHandler.js';

/**
 * TurnManager
 * Manages player turn sequence and action tracking
 */
export default class TurnManager {
    constructor(players = []) {
        this.players = players;
        this.currentPlayerIndex = 0;
        this.currentPlayer = null;
        this.turnOrder = [];
        this.turnTimeLimit = null; // null for unlimited, or time in seconds
        this.turnTimer = null;
        this.actionsRemaining = {};
        this.turnHistory = [];
        
        // Phases where all players act simultaneously
        this.simultaneousPhases = ['auction_phase'];
        this.currentPhase = null;
        
        // Event system
        this.eventListeners = {};
        this.errorHandler = new ErrorHandler();
        
        // Action configurations per phase
        this.phaseActionConfigs = {
            territory_selection: {
                maxActions: 1, // one free claim + unlimited auctions
                allowedActions: ['claim_territory', 'bid_territory'],
                timeLimit: 120
            },
            construct_outfitting: {
                maxActions: 3, // limited outfitting actions
                allowedActions: ['place_construct', 'upgrade_construct', 'move_construct'],
                timeLimit: 180
            },
            auction_phase: {
                maxActions: Infinity, // unlimited auction actions
                allowedActions: ['bid_resource', 'sell_resource'],
                timeLimit: 300,
                simultaneous: true
            },
            resource_production: {
                maxActions: 0, // automated phase
                allowedActions: [],
                timeLimit: 30
            },
            end_cycle_events: {
                maxActions: 0, // automated phase
                allowedActions: [],
                timeLimit: 15
            }
        };
        
        if (this.players.length > 0) {
            this.calculateTurnOrder();
        }
    }

    /**
     * Calculate turn order based on M.U.L.E. rules (poorest goes first)
     */
    calculateTurnOrder() {
        try {
            // Calculate wealth for all players first with debugging
            console.log('Calculating turn order...');
            const playersWithWealth = this.players.map(player => {
                const wealth = this.calculatePlayerWealth(player);
                console.log(`Player ${player.name}: ${wealth} wealth (${player.gold || 0} gold)`);
                return {
                    ...player,
                    calculatedWealth: wealth
                };
            });
            
            // Sort by wealth (ascending = poorest first)
            this.turnOrder = playersWithWealth.sort((a, b) => {
                if (a.calculatedWealth !== b.calculatedWealth) {
                    return a.calculatedWealth - b.calculatedWealth; // Poorest first
                }
                // Tie-breaker: use player index
                return (a.playerIndex || 0) - (b.playerIndex || 0);
            });
            
            // Log final order for debugging
            console.log('Turn order calculated:');
            this.turnOrder.forEach((player, index) => {
                console.log(`  ${index + 1}. ${player.name} (${player.calculatedWealth} wealth)`);
            });
            
            this.broadcastEvent('turn_order.calculated', {
                turnOrder: this.turnOrder.map(p => ({
                    id: p.id,
                    name: p.name,
                    wealth: p.calculatedWealth
                }))
            });
        } catch (error) {
            this.errorHandler.handleError(error, 'TurnManager.calculateTurnOrder');
        }
    }

    /**
     * Calculate total player wealth for turn order
     */
    calculatePlayerWealth(player) {
        let wealth = player.gold || 0;
        
        // Add territory values
        if (player.territories && player.territories.length > 0) {
            const territoryValue = player.territories.length * 50;
            wealth += territoryValue;
        }
        
        // Add construct values
        if (player.constructs && player.constructs.length > 0) {
            const constructValue = player.constructs.reduce((total, construct) => {
                return total + (construct.level || 1) * 75;
            }, 0);
            wealth += constructValue;
        }
        
        // Add resource values (at current market prices)
        if (player.resources) {
            const resourceValue = Object.values(player.resources).reduce((sum, amount) => sum + amount, 0) * 2;
            wealth += resourceValue;
        }
        
        return wealth;
    }

    /**
     * Set the current phase for turn management
     */
    setPhase(phaseName) {
        this.currentPhase = phaseName;
        
        // Reset all player actions for the new phase
        this.resetAllPlayerActions();
        
        // Recalculate turn order at start of new phase
        if (phaseName === 'territory_selection') {
            this.calculateTurnOrder();
            this.currentPlayerIndex = 0;
        }
        
        this.broadcastEvent('phase.set', {
            phase: phaseName,
            config: this.phaseActionConfigs[phaseName]
        });
    }

    /**
     * Start the turn sequence for the current phase
     */
    startTurnSequence() {
        try {
            const phaseConfig = this.phaseActionConfigs[this.currentPhase];
            
            if (phaseConfig.simultaneous) {
                this.startSimultaneousPhase();
            } else {
                this.startSequentialTurns();
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'TurnManager.startTurnSequence');
        }
    }

    /**
     * Start sequential turn-based play
     */
    startSequentialTurns() {
        if (this.turnOrder.length === 0) {
            this.calculateTurnOrder();
        }
        
        this.currentPlayerIndex = 0;
        this.startPlayerTurn(this.getCurrentPlayer());
    }

    /**
     * Start simultaneous phase (all players act at once)
     */
    startSimultaneousPhase() {
        this.players.forEach(player => {
            this.initializePlayerActions(player);
        });
        
        this.broadcastEvent('simultaneous_phase.started', {
            phase: this.currentPhase,
            players: this.players.map(p => p.id)
        });
    }

    /**
     * Get the current active player
     */
    getCurrentPlayer() {
        if (this.turnOrder.length === 0) return null;
        return this.turnOrder[this.currentPlayerIndex];
    }

    /**
     * Start a player's turn
     */
    startPlayerTurn(player) {
        try {
            this.currentPlayer = player;
            this.initializePlayerActions(player);
            this.startTurnTimer(player);
            
            this.broadcastEvent('turn.started', { 
                player: player,
                actionsRemaining: this.actionsRemaining[player.id],
                turnIndex: this.currentPlayerIndex,
                totalPlayers: this.turnOrder.length
            });
        } catch (error) {
            this.errorHandler.handleError(error, 'TurnManager.startPlayerTurn');
        }
    }

    /**
     * Initialize player actions for current phase
     */
    initializePlayerActions(player) {
        const phaseConfig = this.phaseActionConfigs[this.currentPhase];
        
        this.actionsRemaining[player.id] = {
            total: phaseConfig.maxActions,
            remaining: phaseConfig.maxActions,
            allowedActions: [...phaseConfig.allowedActions]
        };
    }

    /**
     * Reset actions for all players
     */
    resetAllPlayerActions() {
        this.actionsRemaining = {};
        this.players.forEach(player => {
            this.initializePlayerActions(player);
        });
    }

    /**
     * Execute a player action
     */
    executePlayerAction(player, action) {
        try {
            if (!this.canPlayerAct(player, action)) {
                this.broadcastEvent('action.rejected', {
                    player: player,
                    action: action,
                    reason: 'Cannot perform action'
                });
                return false;
            }
            
            const success = this.processAction(player, action);
            
            if (success) {
                if (this.consumesAction(action)) {
                    this.actionsRemaining[player.id].remaining--;
                }
                
                // Log the action
                this.logPlayerAction(player, action);
                
                this.broadcastEvent('action.executed', {
                    player: player,
                    action: action,
                    actionsRemaining: this.actionsRemaining[player.id]
                });
                
                // Check if player's turn is complete
                if (this.actionsRemaining[player.id].remaining <= 0 && !this.isSimultaneousPhase()) {
                    this.endPlayerTurn(player);
                }
            }
            
            return success;
        } catch (error) {
            this.errorHandler.handleError(error, 'TurnManager.executePlayerAction');
            return false;
        }
    }

    /**
     * Check if a player can perform an action
     */
    canPlayerAct(player, action) {
        const playerActions = this.actionsRemaining[player.id];
        
        if (!playerActions) return false;
        if (playerActions.remaining <= 0) return false;
        if (!playerActions.allowedActions.includes(action.type)) return false;
        
        // Additional phase-specific checks
        if (!this.isSimultaneousPhase() && this.currentPlayer !== player) {
            return false;
        }
        
        return true;
    }

    /**
     * Process the actual action (delegated to game logic)
     */
    processAction(player, action) {
        // This would integrate with the main game logic
        // For now, just return success
        this.broadcastEvent('action.processing', {
            player: player,
            action: action
        });
        
        return true; // Placeholder
    }

    /**
     * Check if an action consumes a turn action
     */
    consumesAction(action) {
        // Some actions (like viewing info) don't consume actions
        const nonConsumingActions = ['view_info', 'check_market', 'view_territory'];
        return !nonConsumingActions.includes(action.type);
    }

    /**
     * Log a player action
     */
    logPlayerAction(player, action) {
        const actionRecord = {
            timestamp: Date.now(),
            player: player.id,
            phase: this.currentPhase,
            action: action,
            turnIndex: this.currentPlayerIndex
        };
        
        this.turnHistory.push(actionRecord);
    }

    /**
     * End a player's turn
     */
    endPlayerTurn(player) {
        try {
            this.clearTurnTimer();
            
            this.broadcastEvent('turn.ended', {
                player: player,
                actionsUsed: this.actionsRemaining[player.id].total - this.actionsRemaining[player.id].remaining
            });
            
            if (!this.isSimultaneousPhase()) {
                this.nextPlayer();
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'TurnManager.endPlayerTurn');
        }
    }

    /**
     * Advance to the next player
     */
    nextPlayer() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.turnOrder.length;
        
        if (this.currentPlayerIndex === 0) {
            // All players have had their turn
            this.endTurnSequence();
        } else {
            this.startPlayerTurn(this.getCurrentPlayer());
        }
    }

    /**
     * End the current turn sequence
     */
    endTurnSequence() {
        this.broadcastEvent('turn_sequence.ended', {
            phase: this.currentPhase,
            completedTurns: this.turnOrder.length
        });
    }

    /**
     * Force end a player's turn (due to timeout)
     */
    forceEndPlayerTurn(player) {
        this.broadcastEvent('turn.forced_end', {
            player: player,
            reason: 'timeout'
        });
        
        this.endPlayerTurn(player);
    }

    /**
     * Check if current phase is simultaneous
     */
    isSimultaneousPhase() {
        return this.simultaneousPhases.includes(this.currentPhase);
    }

    /**
     * Start turn timer for a player
     */
    startTurnTimer(player) {
        this.clearTurnTimer();
        
        const phaseConfig = this.phaseActionConfigs[this.currentPhase];
        const timeLimit = this.turnTimeLimit || phaseConfig.timeLimit;
        
        if (timeLimit && timeLimit > 0) {
            this.turnTimer = setTimeout(() => {
                this.forceEndPlayerTurn(player);
            }, timeLimit * 1000);
        }
    }

    /**
     * Clear the turn timer
     */
    clearTurnTimer() {
        if (this.turnTimer) {
            clearTimeout(this.turnTimer);
            this.turnTimer = null;
        }
    }

    /**
     * Get turn status information
     */
    getTurnStatus() {
        return {
            currentPhase: this.currentPhase,
            currentPlayer: this.currentPlayer ? this.currentPlayer.id : null,
            currentPlayerIndex: this.currentPlayerIndex,
            turnOrder: this.turnOrder.map(p => p.id),
            actionsRemaining: { ...this.actionsRemaining },
            isSimultaneous: this.isSimultaneousPhase()
        };
    }

    /**
     * Skip current player's turn
     */
    skipPlayerTurn(player) {
        if (this.currentPlayer === player) {
            this.broadcastEvent('turn.skipped', { player: player });
            this.endPlayerTurn(player);
        }
    }

    /**
     * Add new players (for dynamic player management)
     */
    addPlayer(player) {
        this.players.push(player);
        this.calculateTurnOrder();
        this.initializePlayerActions(player);
    }

    /**
     * Remove player (for dynamic player management)
     */
    removePlayer(playerId) {
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
            this.players.splice(playerIndex, 1);
            delete this.actionsRemaining[playerId];
            this.calculateTurnOrder();
            
            // Adjust current player index if needed
            if (this.currentPlayerIndex >= this.turnOrder.length) {
                this.currentPlayerIndex = 0;
            }
        }
    }

    /**
     * Event system methods
     */
    on(eventName, callback) {
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        this.eventListeners[eventName].push(callback);
    }

    off(eventName, callback) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName] = this.eventListeners[eventName]
                .filter(listener => listener !== callback);
        }
    }

    broadcastEvent(eventName, data = {}) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.errorHandler.handleError(error, `Event callback for ${eventName}`);
                }
            });
        }
    }
}