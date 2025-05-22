import GameCycleManager from './GameCycleManager.js';
import TurnManager from './TurnManager.js';
import TimeManager from './TimeManager.js';
import GameStateManager from './GameStateManager.js';
import GamePersistence from './GamePersistence.js';
import ErrorHandler from '../utils/ErrorHandler.js';

/**
 * GameFlowController
 * Orchestrates all game flow systems and manages their interactions
 */
export default class GameFlowController {
    constructor(config = {}) {
        // Initialize core systems
        this.cycleManager = new GameCycleManager(config);
        this.turnManager = new TurnManager([]);
        this.timeManager = new TimeManager();
        this.stateManager = new GameStateManager();
        this.persistence = new GamePersistence(config.storageType || 'localStorage');
        
        // Error handling
        this.errorHandler = new ErrorHandler();
        
        // Game state
        this.isInitialized = false;
        this.isPaused = false;
        this.gameId = null;
        
        // Event system
        this.eventListeners = {};
        
        // Integration settings
        this.autoSaveEnabled = config.autoSave !== false;
        this.autoSaveInterval = config.autoSaveInterval || 30000;
        
        // Setup system integrations
        this.setupEventHandlers();
        this.setupSystemIntegrations();
    }

    /**
     * Setup event handlers between systems
     */
    setupEventHandlers() {
        // Cycle management events
        this.cycleManager.on('cycle.started', this.onCycleStarted.bind(this));
        this.cycleManager.on('phase.started', this.onPhaseStarted.bind(this));
        this.cycleManager.on('phase.ended', this.onPhaseEnded.bind(this));
        this.cycleManager.on('game.ended', this.onGameEnded.bind(this));
        
        // Turn management events
        this.turnManager.on('turn.started', this.onTurnStarted.bind(this));
        this.turnManager.on('turn.ended', this.onTurnEnded.bind(this));
        this.turnManager.on('turn_sequence.ended', this.onTurnSequenceEnded.bind(this));
        this.turnManager.on('action.executed', this.onPlayerActionExecuted.bind(this));
        
        // Timer events
        this.timeManager.on('timer.expired', this.onTimerExpired.bind(this));
        this.timeManager.on('timer.warning', this.onTimerWarning.bind(this));
        this.timeManager.on('player.timeout', this.onPlayerTimeout.bind(this));
        this.timeManager.on('phase.timeout', this.onPhaseTimeout.bind(this));
        
        // State management events
        this.stateManager.on('state.updated', this.onStateUpdated.bind(this));
        this.stateManager.on('action.logged', this.onActionLogged.bind(this));
        
        // Persistence events
        this.persistence.on('save.completed', this.onSaveCompleted.bind(this));
        this.persistence.on('load.completed', this.onLoadCompleted.bind(this));
        this.persistence.on('save.failed', this.onSaveFailed.bind(this));
    }

    /**
     * Setup system integrations
     */
    setupSystemIntegrations() {
        // Enable auto-save if configured
        if (this.autoSaveEnabled) {
            this.persistence.enableAutoSave(this.stateManager, this.autoSaveInterval);
        }
    }

    /**
     * Initialize a new game
     */
    async initializeGame(players, settings = {}) {
        try {
            // Validate inputs
            if (!players || players.length === 0) {
                throw new Error('At least one player is required');
            }
            
            // Initialize game state
            const gameInitialized = this.stateManager.initializeGame(players, settings);
            if (!gameInitialized) {
                throw new Error('Failed to initialize game state');
            }
            
            // Setup turn management
            this.turnManager.players = this.stateManager.gameState.players;
            
            // Save initial state
            this.stateManager.saveStateSnapshot('Game Initialized');
            
            // Set flags
            this.isInitialized = true;
            this.gameId = this.stateManager.gameState.gameId;
            
            // Start the game flow
            this.startGameFlow();
            
            this.broadcastEvent('game.initialized', {
                gameId: this.gameId,
                players: players.map(p => ({ id: p.id, name: p.name })),
                settings: settings
            });
            
            return { success: true, gameId: this.gameId };
        } catch (error) {
            this.errorHandler.handleError(error, 'GameFlowController.initializeGame');
            return { success: false, error: error.message };
        }
    }

    /**
     * Start the game flow
     */
    startGameFlow() {
        if (!this.isInitialized) {
            throw new Error('Game not initialized');
        }
        
        // Start with the first cycle and phase
        this.cycleManager.startCurrentPhase();
    }

    /**
     * Handle cycle started
     */
    onCycleStarted(data) {
        this.stateManager.updateGameState({
            currentCycle: data.cycle
        }, `Cycle ${data.cycle} started`);
        
        this.stateManager.saveStateSnapshot(`Start of Cycle ${data.cycle}`);
        
        this.broadcastEvent('cycle.started', data);
    }

    /**
     * Handle phase started
     */
    onPhaseStarted(data) {
        // Update game state
        this.stateManager.updateGameState({
            currentPhase: data.phase
        }, `Phase ${data.phase} started`);
        
        // Set phase in turn manager
        this.turnManager.setPhase(data.phase);
        
        // Start appropriate timers
        if (data.config && data.config.timeLimit) {
            if (data.config.allowsPlayerActions && !this.turnManager.isSimultaneousPhase()) {
                // Sequential turn-based phase
                this.timeManager.startPhaseTimer(data.phase, data.config.timeLimit);
            } else if (this.turnManager.isSimultaneousPhase()) {
                // Simultaneous phase
                this.timeManager.startPhaseTimer(data.phase, data.config.timeLimit);
            } else {
                // Automated phase
                this.timeManager.startPhaseTimer(data.phase, data.config.timeLimit);
            }
        }
        
        // Start turn sequence if needed
        if (data.config && data.config.allowsPlayerActions) {
            this.turnManager.startTurnSequence();
        }
        
        this.broadcastEvent('phase.started', {
            ...data,
            gameState: this.getGameStatus()
        });
    }

    /**
     * Handle phase ended
     */
    onPhaseEnded(data) {
        // Clear any active timers
        this.timeManager.clearCurrentTimer();
        
        // Save phase completion snapshot
        this.stateManager.saveStateSnapshot(`End of Phase ${data.phase}`);
        
        this.broadcastEvent('phase.ended', data);
    }

    /**
     * Handle turn started
     */
    onTurnStarted(data) {
        // Update current player in game state
        this.stateManager.updateGameState({
            currentPlayerIndex: data.turnIndex
        });
        
        // Start player timer if not in simultaneous phase
        if (!this.turnManager.isSimultaneousPhase()) {
            const phaseConfig = this.cycleManager.phaseConfigs[this.cycleManager.currentPhase];
            if (phaseConfig && phaseConfig.timeLimit) {
                this.timeManager.startPlayerTimer(data.player.id, this.cycleManager.currentPhase);
            }
        }
        
        this.broadcastEvent('turn.started', {
            ...data,
            gameState: this.getGameStatus()
        });
    }

    /**
     * Handle turn ended
     */
    onTurnEnded(data) {
        // Clear player timer
        this.timeManager.clearPlayerTimer(data.player.id);
        
        this.broadcastEvent('turn.ended', data);
    }

    /**
     * Handle turn sequence ended
     */
    onTurnSequenceEnded(data) {
        // All players have completed their turns in this phase
        // Advance to next phase
        this.cycleManager.advancePhase();
        
        this.broadcastEvent('turn_sequence.ended', data);
    }

    /**
     * Handle player action executed
     */
    onPlayerActionExecuted(data) {
        // Log action in state manager
        this.stateManager.logPlayerAction(data.player.id, data.action);
        
        this.broadcastEvent('action.executed', data);
    }

    /**
     * Handle timer expired
     */
    onTimerExpired(data) {
        if (data.type === 'phase') {
            this.handlePhaseTimerExpired(data);
        } else if (data.type === 'player') {
            this.handlePlayerTimerExpired(data);
        }
        
        this.broadcastEvent('timer.expired', data);
    }

    /**
     * Handle phase timer expired
     */
    handlePhaseTimerExpired(data) {
        // Force advance to next phase
        this.cycleManager.advancePhase();
    }

    /**
     * Handle player timer expired
     */
    handlePlayerTimerExpired(data) {
        // Force end player's turn
        const player = this.stateManager.getPlayer(data.playerId);
        if (player) {
            this.turnManager.forceEndPlayerTurn(player);
        }
    }

    /**
     * Handle timer warning
     */
    onTimerWarning(data) {
        this.broadcastEvent('timer.warning', data);
    }

    /**
     * Handle player timeout
     */
    onPlayerTimeout(data) {
        this.broadcastEvent('player.timeout', data);
    }

    /**
     * Handle phase timeout
     */
    onPhaseTimeout(data) {
        this.broadcastEvent('phase.timeout', data);
    }

    /**
     * Handle state updated
     */
    onStateUpdated(data) {
        this.broadcastEvent('state.updated', data);
    }

    /**
     * Handle action logged
     */
    onActionLogged(data) {
        this.broadcastEvent('action.logged', data);
    }

    /**
     * Handle save completed
     */
    onSaveCompleted(data) {
        this.broadcastEvent('save.completed', data);
    }

    /**
     * Handle load completed
     */
    onLoadCompleted(data) {
        this.broadcastEvent('load.completed', data);
    }

    /**
     * Handle save failed
     */
    onSaveFailed(data) {
        this.broadcastEvent('save.failed', data);
    }

    /**
     * Handle game ended
     */
    onGameEnded(data) {
        // Stop all timers
        this.timeManager.clearAllTimers();
        
        // Save final state
        this.stateManager.saveStateSnapshot('Game Ended');
        
        // Calculate final scores and rankings
        const finalResults = this.calculateFinalResults();
        
        this.stateManager.updateGameState({
            gameStatus: 'ended',
            finalResults: finalResults
        }, 'Game completed');
        
        this.broadcastEvent('game.ended', {
            ...data,
            finalResults: finalResults
        });
    }

    /**
     * Calculate final game results
     */
    calculateFinalResults() {
        const players = this.stateManager.gameState.players;
        const results = players.map(player => {
            // Calculate total wealth (gold + territories + constructs + resources)
            let totalWealth = player.gold || 0;
            
            // Territory values
            totalWealth += (player.territories || []).length * 50;
            
            // Construct values
            if (player.constructs) {
                totalWealth += player.constructs.reduce((sum, construct) => {
                    return sum + (construct.level || 1) * 75;
                }, 0);
            }
            
            // Resource values (at current market prices)
            if (player.resources) {
                const prices = this.stateManager.gameState.market.prices;
                for (const [resourceType, amount] of Object.entries(player.resources)) {
                    totalWealth += amount * (prices[resourceType] || 0);
                }
            }
            
            return {
                playerId: player.id,
                playerName: player.name || player.id,
                gold: player.gold || 0,
                territories: (player.territories || []).length,
                constructs: (player.constructs || []).length,
                totalWealth: totalWealth,
                score: totalWealth // Final score equals total wealth
            };
        });
        
        // Sort by score (descending)
        results.sort((a, b) => b.score - a.score);
        
        // Add rankings
        results.forEach((result, index) => {
            result.rank = index + 1;
        });
        
        return results;
    }

    /**
     * Execute player action
     */
    executePlayerAction(playerId, action) {
        try {
            const player = this.stateManager.getPlayer(playerId);
            if (!player) {
                throw new Error(`Player not found: ${playerId}`);
            }
            
            // Delegate to turn manager
            const result = this.turnManager.executePlayerAction(player, action);
            
            if (result) {
                this.broadcastEvent('player.action_success', {
                    playerId: playerId,
                    action: action
                });
            } else {
                this.broadcastEvent('player.action_failed', {
                    playerId: playerId,
                    action: action,
                    reason: 'Action execution failed'
                });
            }
            
            return result;
        } catch (error) {
            this.errorHandler.handleError(error, 'GameFlowController.executePlayerAction');
            this.broadcastEvent('player.action_failed', {
                playerId: playerId,
                action: action,
                reason: error.message
            });
            return false;
        }
    }

    /**
     * Pause the game
     */
    pauseGame() {
        if (this.isPaused) return;
        
        this.isPaused = true;
        
        // Pause all systems
        this.cycleManager.pauseGame();
        this.timeManager.pauseAllTimers();
        
        // Save pause state
        this.persistence.saveGame(this.stateManager.gameState, 'pause_save');
        
        this.stateManager.updateGameState({
            gameStatus: 'paused'
        }, 'Game paused');
        
        this.broadcastEvent('game.paused', {
            gameId: this.gameId,
            pauseTime: Date.now()
        });
    }

    /**
     * Resume the game
     */
    resumeGame() {
        if (!this.isPaused) return;
        
        this.isPaused = false;
        
        // Resume all systems
        this.cycleManager.resumeGame();
        this.timeManager.resumeAllTimers();
        
        this.stateManager.updateGameState({
            gameStatus: 'active'
        }, 'Game resumed');
        
        this.broadcastEvent('game.resumed', {
            gameId: this.gameId,
            resumeTime: Date.now()
        });
    }

    /**
     * Save game
     */
    async saveGame(slotName = 'manual_save') {
        try {
            const result = await this.persistence.saveGame(this.stateManager.gameState, slotName);
            return result;
        } catch (error) {
            this.errorHandler.handleError(error, 'GameFlowController.saveGame');
            return { success: false, error: error.message };
        }
    }

    /**
     * Load game
     */
    async loadGame(slotName) {
        try {
            const result = await this.persistence.loadGame(slotName);
            
            if (result.success) {
                // Import the loaded state - pass the complete save data structure
                const imported = this.stateManager.importGameState({
                    version: result.version || '1.0',
                    gameState: result.gameState,
                    stateHistory: result.stateHistory || []
                });
                
                if (imported) {
                    // Reinitialize systems with loaded state
                    this.reinitializeFromLoadedState();
                    
                    this.broadcastEvent('game.loaded', {
                        slotName: slotName,
                        gameId: this.stateManager.gameState.gameId,
                        metadata: result.metadata
                    });
                }
                
                return { success: imported, gameState: this.stateManager.gameState };
            }
            
            return result;
        } catch (error) {
            this.errorHandler.handleError(error, 'GameFlowController.loadGame');
            return { success: false, error: error.message };
        }
    }

    /**
     * Reinitialize systems from loaded state
     */
    reinitializeFromLoadedState() {
        const gameState = this.stateManager.gameState;
        
        // Update cycle manager
        this.cycleManager.currentCycle = gameState.currentCycle;
        this.cycleManager.currentPhase = gameState.currentPhase;
        this.cycleManager.gameState = gameState.gameStatus;
        
        // Update turn manager
        this.turnManager.players = gameState.players;
        this.turnManager.currentPlayerIndex = gameState.currentPlayerIndex;
        this.turnManager.setPhase(gameState.currentPhase);
        
        // Set flags
        this.isInitialized = true;
        this.gameId = gameState.gameId;
        this.isPaused = gameState.gameStatus === 'paused';
        
        // If game was active, resume flow
        if (gameState.gameStatus === 'active') {
            this.startGameFlow();
        }
    }

    /**
     * Get comprehensive game status
     */
    getGameStatus() {
        return {
            // Basic game info
            gameId: this.gameId,
            isInitialized: this.isInitialized,
            isPaused: this.isPaused,
            
            // Game state
            ...this.stateManager.getGameStatus(),
            
            // Cycle info
            cycleInfo: this.cycleManager.getStatus(),
            
            // Turn info
            turnInfo: this.turnManager.getTurnStatus(),
            
            // Timer info
            timerInfo: this.timeManager.getTimerStatus(),
            
            // Statistics
            statistics: this.stateManager.getStatistics()
        };
    }

    /**
     * Get available save slots
     */
    async getSaveSlots() {
        return await this.persistence.getSaveSlots();
    }

    /**
     * Delete save slot
     */
    async deleteSave(slotName) {
        return await this.persistence.deleteSave(slotName);
    }

    /**
     * Get system health status
     */
    getSystemHealth() {
        return {
            cycleManager: this.cycleManager.gameState !== 'error',
            turnManager: this.turnManager.players.length > 0,
            timeManager: this.timeManager.hasActiveTimers() || !this.isInitialized,
            stateManager: this.stateManager.validateGameState(),
            persistence: true, // Would need more sophisticated check
            overall: this.isInitialized && !this.errorHandler.hasErrors()
        };
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

    /**
     * Cleanup and destroy
     */
    destroy() {
        // Stop all timers
        this.timeManager.clearAllTimers();
        
        // Disable auto-save
        this.persistence.disableAutoSave();
        
        // Clear event listeners
        this.eventListeners = {};
        
        // Reset flags
        this.isInitialized = false;
        this.isPaused = false;
        this.gameId = null;
        
        this.broadcastEvent('game.destroyed');
    }
}