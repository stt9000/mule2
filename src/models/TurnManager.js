import ErrorHandler from '../utils/ErrorHandler.js';

/**
 * TurnManager
 * Manages player turn sequence and action tracking
 */
export default class TurnManager {
    constructor(players = [], gameFlowController = null) {
        this.players = players;
        this.currentPlayerIndex = 0;
        this.currentPlayer = null;
        this.turnOrder = [];
        this.turnTimeLimit = null; // null for unlimited, or time in seconds
        this.turnTimer = null;
        this.actionsRemaining = {};
        this.turnHistory = [];
        this.gameFlow = gameFlowController; // Reference to GameFlowController
        
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
                maxActions: -1, // unlimited actions - player must click End Turn
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
        }
        
        // Always reset player index when starting a new phase
        console.log(`Setting phase to ${phaseName} - resetting currentPlayerIndex to 0`);
        this.currentPlayerIndex = 0;
        
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
            console.log('Starting turn sequence for phase:', this.currentPhase);
            
            // Reset all player actions for the new phase
            this.actionsRemaining = {};
            
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
        
        const currentPlayer = this.getCurrentPlayer();
        console.log('Starting sequential turns. Phase:', this.currentPhase, 'Current player:', currentPlayer?.id, 'Index:', this.currentPlayerIndex, 'Turn order:', this.turnOrder.map(p => p.id));
        
        if (!currentPlayer) {
            console.error('No current player found! Turn order:', this.turnOrder);
            return;
        }
        
        this.startPlayerTurn(currentPlayer);
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
        const player = this.turnOrder[this.currentPlayerIndex];
        // If we have a gameFlow reference, get fresh player data
        if (this.gameFlow && this.gameFlow.stateManager) {
            return this.gameFlow.stateManager.getPlayer(player.id) || player;
        }
        return player;
    }

    /**
     * Start a player's turn
     */
    startPlayerTurn(player) {
        try {
            console.log(`Starting turn for ${player.id} in phase ${this.currentPhase}`);
            this.currentPlayer = player;
            this.initializePlayerActions(player);
            console.log(`Actions initialized for ${player.id}:`, this.actionsRemaining[player.id]);
            
            // Track if player has taken any actions this turn
            this.actionsRemaining[player.id].takenActions = 0;
            
            // Check if this is a phase where players have no actions (automated phases)
            if (this.actionsRemaining[player.id].remaining === 0) {
                console.log(`Player ${player.id} has 0 actions in phase ${this.currentPhase} - this is likely an automated phase`);
                // For automated phases, let the scene handle the auto-advance
            }
            
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
        
        console.log(`Initializing actions for ${player.id} in phase ${this.currentPhase}:`, phaseConfig);
        
        // Handle unlimited actions (-1 means unlimited)
        const maxActions = phaseConfig.maxActions;
        const isUnlimited = maxActions === -1 || maxActions === Infinity;
        
        this.actionsRemaining[player.id] = {
            total: maxActions,
            remaining: isUnlimited ? Infinity : maxActions,
            allowedActions: [...phaseConfig.allowedActions],
            takenActions: 0,
            unlimited: isUnlimited
        };
        
        console.log(`Player ${player.id} actions set to:`, this.actionsRemaining[player.id]);
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
            console.log(`TurnManager.executePlayerAction called for ${player.id}, action:`, action);
            
            if (!this.canPlayerAct(player, action)) {
                console.log(`Player ${player.id} cannot perform action`);
                this.broadcastEvent('action.rejected', {
                    player: player,
                    action: action,
                    reason: 'Cannot perform action'
                });
                return false;
            }
            
            const success = this.processAction(player, action);
            console.log(`Action processed for ${player.id}, success: ${success}`);
            
            if (success) {
                if (this.consumesAction(action)) {
                    // Don't decrement if unlimited actions
                    if (!this.actionsRemaining[player.id].unlimited) {
                        this.actionsRemaining[player.id].remaining--;
                    }
                    this.actionsRemaining[player.id].takenActions = (this.actionsRemaining[player.id].takenActions || 0) + 1;
                    console.log(`Action consumed for ${player.id}. Remaining: ${this.actionsRemaining[player.id].remaining}`);
                }
                
                // Log the action
                this.logPlayerAction(player, action);
                
                this.broadcastEvent('action.executed', {
                    player: player,
                    action: action,
                    actionsRemaining: this.actionsRemaining[player.id]
                });
                
                // Check if player's turn is complete
                // For human player in construct phase, don't auto-end if they haven't taken actions
                const isHumanConstructPhase = !player.isAI && this.currentPhase === 'construct_outfitting';
                const hasTakenActions = (this.actionsRemaining[player.id].takenActions || 0) > 0;
                
                // Check if turn should auto-end (not for unlimited actions)
                const shouldAutoEnd = !this.actionsRemaining[player.id].unlimited && 
                                    this.actionsRemaining[player.id].remaining <= 0 && 
                                    !this.isSimultaneousPhase();
                
                if (shouldAutoEnd) {
                    if (!isHumanConstructPhase || hasTakenActions) {
                        console.log(`Player ${player.id} has no actions remaining (${this.actionsRemaining[player.id].remaining}/${this.actionsRemaining[player.id].total}), ending turn`);
                        this.endPlayerTurn(player);
                    } else {
                        console.log(`Player ${player.id} has no actions but hasn't taken any yet - waiting for manual end turn`);
                    }
                }
            }
            
            return success;
        } catch (error) {
            console.error(`Error in executePlayerAction for ${player.id}:`, error);
            this.errorHandler.handleError(error, 'TurnManager.executePlayerAction');
            return false;
        }
    }

    /**
     * Check if a player can perform an action
     */
    canPlayerAct(player, action) {
        const playerActions = this.actionsRemaining[player.id];
        
        console.log('canPlayerAct check:', {
            playerId: player.id,
            actionType: action.type,
            playerActions: playerActions,
            currentPlayer: this.currentPlayer?.id,
            isSimultaneousPhase: this.isSimultaneousPhase(),
            currentPhase: this.currentPhase
        });
        
        if (!playerActions) {
            console.log('No player actions initialized for', player.id);
            return false;
        }
        if (playerActions.remaining <= 0) {
            console.log('No actions remaining for', player.id);
            return false;
        }
        if (!playerActions.allowedActions.includes(action.type)) {
            console.log('Action type not allowed:', action.type);
            return false;
        }
        
        // Additional phase-specific checks
        if (!this.isSimultaneousPhase() && this.currentPlayer?.id !== player.id) {
            console.log('Not player turn. Current:', this.currentPlayer?.id, 'Attempting:', player.id);
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
            console.log(`Ending turn for ${player.id} - Actions remaining: ${this.actionsRemaining[player.id]?.remaining}`);
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
        console.log(`NextPlayer called. Current index: ${this.currentPlayerIndex}, Total players: ${this.turnOrder.length}`);
        
        // Track if we've wrapped around
        const wasLastPlayer = this.currentPlayerIndex === this.turnOrder.length - 1;
        
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.turnOrder.length;
        
        console.log(`New index after increment: ${this.currentPlayerIndex}`);
        
        if (this.currentPlayerIndex === 0 && wasLastPlayer) {
            // All players have had their turn
            console.log('All players have completed their turns - ending turn sequence');
            this.endTurnSequence();
        } else {
            console.log(`Starting next player turn: ${this.getCurrentPlayer()?.id}`);
            this.startPlayerTurn(this.getCurrentPlayer());
        }
    }

    /**
     * End the current turn sequence
     */
    endTurnSequence() {
        console.log('TurnManager.endTurnSequence called - broadcasting turn_sequence.ended event');
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
        
        // Don't start timer for human players during interactive phases
        if (!player.isAI) {
            const phaseConfig = this.phaseActionConfigs[this.currentPhase];
            if (phaseConfig && phaseConfig.allowedActions && phaseConfig.allowedActions.length > 0) {
                console.log('Skipping timer for human player in interactive phase');
                return;
            }
        }
        
        const phaseConfig = this.phaseActionConfigs[this.currentPhase];
        const timeLimit = this.turnTimeLimit || phaseConfig.timeLimit;
        
        if (timeLimit && timeLimit > 0) {
            console.log(`Starting turn timer for ${player.id}: ${timeLimit} seconds`);
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