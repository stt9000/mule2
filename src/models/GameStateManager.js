import { RESOURCE_TYPES, BASE_PRICES, GAME_SETTINGS } from '../config/gameConfig.js';
import ErrorHandler from '../utils/ErrorHandler.js';

/**
 * GameStateManager
 * Manages game state, validation, and history tracking
 */
export default class GameStateManager {
    constructor() {
        this.gameState = {
            version: '1.0',  // Add version as first field
            gameId: this.generateGameId(),
            startTime: Date.now(),
            currentCycle: 1,
            maxCycles: GAME_SETTINGS.TOTAL_CYCLES,
            currentPhase: 'territory_selection',
            gameStatus: 'active', // 'active', 'paused', 'ended'
            
            // Player data
            players: [],
            playerCount: 0,
            currentPlayerIndex: 0,
            turnOrder: [],
            
            // Game world
            territories: [],
            constructs: [], // Managed by ConstructManager
            
            // Economic state
            market: {
                prices: { ...BASE_PRICES },
                supply: { 
                    [RESOURCE_TYPES.MANA]: 0,
                    [RESOURCE_TYPES.VITALITY]: 0,
                    [RESOURCE_TYPES.ARCANUM]: 0,
                    [RESOURCE_TYPES.AETHER]: 0
                },
                demand: {
                    [RESOURCE_TYPES.MANA]: 0,
                    [RESOURCE_TYPES.VITALITY]: 0,
                    [RESOURCE_TYPES.ARCANUM]: 0,
                    [RESOURCE_TYPES.AETHER]: 0
                },
                lastUpdate: Date.now()
            },
            
            // Events and history
            events: [],
            actionHistory: [],
            cycleHistory: [],
            
            // Game settings
            settings: {
                mapSize: GAME_SETTINGS.MAP_SIZE,
                startingGold: GAME_SETTINGS.STARTING_GOLD,
                timeLimit: null,
                difficulty: 'normal'
            },
            
            // Statistics
            statistics: {
                totalTurns: 0,
                totalTransactions: 0,
                totalResourcesProduced: {},
                cycleStartTimes: []
            }
        };
        
        // State history for undo/debugging
        this.stateHistory = [];
        this.maxHistoryLength = 50;
        
        // Validation rules
        this.validationRules = {
            players: this.validatePlayerStates.bind(this),
            territories: this.validateTerritoryStates.bind(this),
            market: this.validateMarketState.bind(this),
            resources: this.validateResourceTotals.bind(this),
            cycles: this.validateCycleState.bind(this)
        };
        
        // Event system
        this.eventListeners = {};
        this.errorHandler = new ErrorHandler();
        
        // Auto-validation settings
        this.autoValidate = true;
        this.validationErrors = [];
    }

    /**
     * Initialize game state with players and settings
     */
    initializeGame(players, settings = {}) {
        try {
            this.gameState.players = players.map((player, index) => ({
                ...player,
                playerIndex: index,
                territories: [],
                constructs: [],
                resources: {
                    [RESOURCE_TYPES.MANA]: 0,
                    [RESOURCE_TYPES.VITALITY]: 0,
                    [RESOURCE_TYPES.ARCANUM]: 0,
                    [RESOURCE_TYPES.AETHER]: 0
                },
                gold: player.gold || settings.startingGold || GAME_SETTINGS.STARTING_GOLD,
                score: 0,
                actionsThisTurn: 0
            }));
            
            this.gameState.playerCount = players.length;
            this.gameState.settings = { ...this.gameState.settings, ...settings };
            
            // Initialize statistics
            this.gameState.statistics.totalResourcesProduced = {
                [RESOURCE_TYPES.MANA]: 0,
                [RESOURCE_TYPES.VITALITY]: 0,
                [RESOURCE_TYPES.ARCANUM]: 0,
                [RESOURCE_TYPES.AETHER]: 0
            };
            
            this.saveStateSnapshot('Game Initialized');
            
            this.broadcastEvent('game.initialized', {
                gameId: this.gameState.gameId,
                playerCount: this.gameState.playerCount,
                settings: this.gameState.settings
            });
            
            return true;
        } catch (error) {
            this.errorHandler.handleError(error, 'GameStateManager.initializeGame');
            return false;
        }
    }

    /**
     * Update game state with validation
     */
    updateGameState(updates, description = null) {
        try {
            const previousState = this.cloneState(this.gameState);
            
            // Apply updates
            this.applyUpdates(this.gameState, updates);
            
            // Validate if auto-validation is enabled
            if (this.autoValidate && !this.validateGameState()) {
                // Revert if validation fails
                this.gameState = previousState;
                throw new Error(`Game state update failed validation: ${this.validationErrors.join(', ')}`);
            }
            
            // Log the update
            this.logStateUpdate(updates, description);
            
            this.broadcastEvent('state.updated', { 
                previous: previousState, 
                current: this.gameState,
                changes: updates,
                description: description
            });
            
            return true;
        } catch (error) {
            this.errorHandler.handleError(error, 'GameStateManager.updateGameState');
            return false;
        }
    }

    /**
     * Apply updates to game state recursively
     */
    applyUpdates(target, updates) {
        for (const [key, value] of Object.entries(updates)) {
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                if (!target[key]) target[key] = {};
                this.applyUpdates(target[key], value);
            } else {
                target[key] = value;
            }
        }
    }

    /**
     * Validate entire game state
     */
    validateGameState() {
        this.validationErrors = [];
        
        try {
            for (const [ruleName, validationFunction] of Object.entries(this.validationRules)) {
                const result = validationFunction();
                if (result !== true) {
                    this.validationErrors.push(`${ruleName}: ${result}`);
                }
            }
            
            return this.validationErrors.length === 0;
        } catch (error) {
            this.validationErrors.push(`Validation error: ${error.message}`);
            return false;
        }
    }

    /**
     * Validate player states
     */
    validatePlayerStates() {
        for (const player of this.gameState.players) {
            // Check required properties
            if (!player.id || typeof player.gold !== 'number') {
                return `Player ${player.id || 'unknown'} has invalid properties`;
            }
            
            // Check resource values
            for (const resourceType of Object.values(RESOURCE_TYPES)) {
                if (typeof player.resources[resourceType] !== 'number' || player.resources[resourceType] < 0) {
                    return `Player ${player.id} has invalid ${resourceType} amount`;
                }
            }
            
            // Check gold is non-negative
            if (player.gold < 0) {
                return `Player ${player.id} has negative gold`;
            }
        }
        return true;
    }

    /**
     * Validate territory states
     */
    validateTerritoryStates() {
        for (const territory of this.gameState.territories) {
            // Check territory has valid coordinates
            if (typeof territory.x !== 'number' || typeof territory.y !== 'number') {
                return `Territory at invalid coordinates: ${territory.x}, ${territory.y}`;
            }
            
            // Check owner is valid player (if owned)
            if (territory.ownerId && !this.getPlayer(territory.ownerId)) {
                return `Territory owned by invalid player: ${territory.ownerId}`;
            }
        }
        return true;
    }

    /**
     * Validate market state
     */
    validateMarketState() {
        const market = this.gameState.market;
        
        // Check all resource types have prices
        for (const resourceType of Object.values(RESOURCE_TYPES)) {
            if (typeof market.prices[resourceType] !== 'number' || market.prices[resourceType] <= 0) {
                return `Invalid price for ${resourceType}: ${market.prices[resourceType]}`;
            }
            
            if (typeof market.supply[resourceType] !== 'number' || market.supply[resourceType] < 0) {
                return `Invalid supply for ${resourceType}: ${market.supply[resourceType]}`;
            }
            
            if (typeof market.demand[resourceType] !== 'number' || market.demand[resourceType] < 0) {
                return `Invalid demand for ${resourceType}: ${market.demand[resourceType]}`;
            }
        }
        
        return true;
    }

    /**
     * Validate resource totals consistency
     */
    validateResourceTotals() {
        const totalResources = {
            [RESOURCE_TYPES.MANA]: 0,
            [RESOURCE_TYPES.VITALITY]: 0,
            [RESOURCE_TYPES.ARCANUM]: 0,
            [RESOURCE_TYPES.AETHER]: 0
        };
        
        // Sum up all player resources
        for (const player of this.gameState.players) {
            for (const resourceType of Object.values(RESOURCE_TYPES)) {
                totalResources[resourceType] += player.resources[resourceType];
            }
        }
        
        // Add market supply
        for (const resourceType of Object.values(RESOURCE_TYPES)) {
            totalResources[resourceType] += this.gameState.market.supply[resourceType];
        }
        
        // Validate totals are reasonable (not infinity, not negative)
        for (const resourceType of Object.values(RESOURCE_TYPES)) {
            if (!Number.isFinite(totalResources[resourceType]) || totalResources[resourceType] < 0) {
                return `Invalid total for ${resourceType}: ${totalResources[resourceType]}`;
            }
        }
        
        return true;
    }

    /**
     * Validate cycle state
     */
    validateCycleState() {
        if (this.gameState.currentCycle < 1 || this.gameState.currentCycle > this.gameState.maxCycles) {
            return `Invalid cycle: ${this.gameState.currentCycle}`;
        }
        
        const validPhases = ['territory_selection', 'construct_outfitting', 'resource_production', 'auction_phase', 'end_cycle_events'];
        if (!validPhases.includes(this.gameState.currentPhase)) {
            return `Invalid phase: ${this.gameState.currentPhase}`;
        }
        
        return true;
    }

    /**
     * Save state snapshot for history
     */
    saveStateSnapshot(description) {
        try {
            const snapshot = {
                id: this.generateSnapshotId(),
                timestamp: Date.now(),
                cycle: this.gameState.currentCycle,
                phase: this.gameState.currentPhase,
                description: description,
                state: this.cloneState(this.gameState)
            };
            
            this.stateHistory.push(snapshot);
            
            // Maintain history limit
            if (this.stateHistory.length > this.maxHistoryLength) {
                this.stateHistory.shift();
            }
            
            this.broadcastEvent('state.saved', { 
                snapshot: {
                    id: snapshot.id,
                    timestamp: snapshot.timestamp,
                    description: snapshot.description
                }
            });
            
            return snapshot.id;
        } catch (error) {
            this.errorHandler.handleError(error, 'GameStateManager.saveStateSnapshot');
            return null;
        }
    }

    /**
     * Restore state from snapshot
     */
    restoreStateSnapshot(snapshotId) {
        try {
            const snapshot = this.stateHistory.find(s => s.id === snapshotId);
            if (!snapshot) {
                throw new Error(`Snapshot not found: ${snapshotId}`);
            }
            
            const previousState = this.cloneState(this.gameState);
            this.gameState = this.cloneState(snapshot.state);
            
            this.broadcastEvent('state.restored', {
                snapshotId: snapshotId,
                description: snapshot.description,
                restoredTo: {
                    cycle: this.gameState.currentCycle,
                    phase: this.gameState.currentPhase
                }
            });
            
            return true;
        } catch (error) {
            this.errorHandler.handleError(error, 'GameStateManager.restoreStateSnapshot');
            return false;
        }
    }

    /**
     * Log player action
     */
    logPlayerAction(playerId, action, details = {}) {
        try {
            const actionRecord = {
                id: this.generateActionId(),
                timestamp: Date.now(),
                cycle: this.gameState.currentCycle,
                phase: this.gameState.currentPhase,
                playerId: playerId,
                type: 'player_action',
                action: action,
                details: details,
                gameStateSnapshot: null // Could store lightweight snapshot
            };
            
            this.gameState.events.push(actionRecord);
            this.gameState.actionHistory.push(actionRecord);
            this.gameState.statistics.totalTurns++;
            
            this.broadcastEvent('action.logged', { action: actionRecord });
            
            return actionRecord.id;
        } catch (error) {
            this.errorHandler.handleError(error, 'GameStateManager.logPlayerAction');
            return null;
        }
    }

    /**
     * Log state update
     */
    logStateUpdate(updates, description) {
        const updateRecord = {
            id: this.generateUpdateId(),
            timestamp: Date.now(),
            cycle: this.gameState.currentCycle,
            phase: this.gameState.currentPhase,
            type: 'state_update',
            updates: updates,
            description: description
        };
        
        this.gameState.events.push(updateRecord);
    }

    /**
     * Get player by ID
     */
    getPlayer(playerId) {
        return this.gameState.players.find(p => p.id === playerId);
    }

    /**
     * Get player actions for a specific cycle
     */
    getPlayerActions(playerId, cycle = null) {
        const targetCycle = cycle || this.gameState.currentCycle;
        return this.gameState.actionHistory.filter(action => 
            action.playerId === playerId && 
            action.cycle === targetCycle &&
            action.type === 'player_action'
        );
    }

    /**
     * Get game statistics
     */
    getStatistics() {
        return {
            ...this.gameState.statistics,
            gameLength: Date.now() - this.gameState.startTime,
            averageTurnTime: this.calculateAverageTurnTime(),
            cycleProgress: this.gameState.currentCycle / this.gameState.maxCycles
        };
    }

    /**
     * Calculate average turn time
     */
    calculateAverageTurnTime() {
        const turnActions = this.gameState.actionHistory.filter(action => action.type === 'player_action');
        if (turnActions.length < 2) return 0;
        
        const totalTime = turnActions[turnActions.length - 1].timestamp - turnActions[0].timestamp;
        return totalTime / turnActions.length;
    }

    /**
     * Get current game status
     */
    getGameStatus() {
        return {
            gameId: this.gameState.gameId,
            currentCycle: this.gameState.currentCycle,
            maxCycles: this.gameState.maxCycles,
            currentPhase: this.gameState.currentPhase,
            gameStatus: this.gameState.gameStatus,
            playerCount: this.gameState.playerCount,
            startTime: this.gameState.startTime,
            elapsedTime: Date.now() - this.gameState.startTime,
            isGameOver: this.gameState.currentCycle >= this.gameState.maxCycles,
            validationStatus: this.autoValidate ? this.validateGameState() : null
        };
    }

    /**
     * Clone state object deeply
     */
    cloneState(state) {
        return JSON.parse(JSON.stringify(state));
    }

    /**
     * Generate unique IDs
     */
    generateGameId() {
        return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateActionId() {
        return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateUpdateId() {
        return `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateSnapshotId() {
        return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Enable/disable auto-validation
     */
    setAutoValidation(enabled) {
        this.autoValidate = enabled;
    }

    /**
     * Get validation errors
     */
    getValidationErrors() {
        return [...this.validationErrors];
    }

    /**
     * Get state history
     */
    getStateHistory() {
        return this.stateHistory.map(snapshot => ({
            id: snapshot.id,
            timestamp: snapshot.timestamp,
            cycle: snapshot.cycle,
            phase: snapshot.phase,
            description: snapshot.description
        }));
    }

    /**
     * Export game state for saving
     */
    exportGameState() {
        return {
            version: '1.0',
            exportTime: Date.now(),
            gameState: this.cloneState(this.gameState),
            stateHistory: this.stateHistory.slice(-10), // Export last 10 snapshots
            metadata: {
                playerCount: this.gameState.playerCount,
                currentCycle: this.gameState.currentCycle,
                currentPhase: this.gameState.currentPhase,
                gameStatus: this.gameState.gameStatus
            }
        };
    }

    /**
     * Import game state from save
     */
    importGameState(exportedData) {
        try {
            // Check both locations for version (backward compatibility)
            const version = exportedData.version || exportedData.gameState?.version || exportedData?.version;
            if (!version) {
                throw new Error('Save file missing version information');
            }
            if (version !== '1.0') {
                throw new Error(`Unsupported save version: ${version}`);
            }
            
            this.gameState = this.cloneState(exportedData.gameState);
            this.stateHistory = exportedData.stateHistory || [];
            
            // Validate imported state
            if (this.autoValidate && !this.validateGameState()) {
                throw new Error(`Imported state failed validation: ${this.validationErrors.join(', ')}`);
            }
            
            this.broadcastEvent('state.imported', {
                gameId: this.gameState.gameId,
                metadata: exportedData.metadata
            });
            
            return true;
        } catch (error) {
            this.errorHandler.handleError(error, 'GameStateManager.importGameState');
            return false;
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