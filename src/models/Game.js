import { RESOURCE_TYPES, BASE_PRICES, DECAY_RATES, PRODUCTION_RATES, TERRITORY_MODIFIERS, PLAYER_COLORS } from '../config/gameConfig';
import Territory from './Territory';
import Player from './Player';
import Construct from './Construct';
import Resource from './Resource';
import Market from './Market';
import ErrorHandler from '../utils/ErrorHandler';

/**
 * Game Model
 * Main game logic and state management
 */
export default class Game {
    /**
     * Create a new game instance
     * @param {Object} config - Game configuration
     * @param {number} config.playerCount - Number of players
     * @param {number} config.totalCycles - Total game cycles
     * @param {Object} config.mapSize - Map dimensions
     */
    constructor(config = {}) {
        this.playerCount = config.playerCount || 4;
        this.currentPlayerIndex = 0;
        this.currentCycle = 1;
        this.totalCycles = config.totalCycles || 12;
        this.mapSize = config.mapSize || { width: 8, height: 6 };
        
        // Time tracking
        this.phaseTime = 0;
        this.turnTimeLimit = 60; // Seconds
        
        // Initialize error handler
        this.errorHandler = new ErrorHandler();
        
        // Game state flags
        this.initialized = false;
        this.gameOver = false;
        this.paused = false;
        
        // Initialize game components
        this.initializeResources();
        this.initializePlayers();
        
        // Market will be initialized when territories are created
        this.market = null;
        
        // Store event callbacks
        this.eventListeners = {};
        
        // Set up error handler listeners
        this.setupErrorHandling();
    }
    
    /**
     * Set up error handling for the game
     */
    setupErrorHandling() {
        // Add listener to log all errors
        this.errorHandler.addListener((error) => {
            // Trigger error event so UI can respond
            this.triggerEvent('error', { error });
            
            // Handle critical errors that require immediate attention
            if (error.type === ErrorHandler.errorTypes.SYSTEM) {
                this.handleCriticalError(error);
            }
        });
    }
    
    /**
     * Handle a critical error that requires immediate attention
     * @param {Object} error - The error object
     */
    handleCriticalError(error) {
        console.error('Critical error:', error);
        
        // Pause the game to prevent further issues
        this.paused = true;
        
        // Try to recover from the error
        this.tryErrorRecovery(error);
    }
    
    /**
     * Try to recover from an error
     * @param {Object} error - The error object
     * @returns {boolean} Whether recovery was successful
     */
    tryErrorRecovery(error) {
        // Get recovery action
        const recoveryAction = this.errorHandler.getRecoveryAction(error);
        if (!recoveryAction) return false;
        
        // Trigger recovery event
        this.triggerEvent('recoveryAttempt', { 
            error, 
            recovery: recoveryAction 
        });
        
        // If the recovery action has a function, execute it
        if (typeof recoveryAction.action === 'function') {
            try {
                const result = recoveryAction.action();
                
                // If recovery was successful, mark error as handled
                if (result && result.success) {
                    this.errorHandler.markErrorHandled(error.id);
                    this.paused = false; // Resume game if paused
                    
                    this.triggerEvent('recoverySuccess', { 
                        error, 
                        recovery: recoveryAction,
                        result
                    });
                    
                    return true;
                }
            } catch (e) {
                console.error('Error during recovery attempt:', e);
            }
        }
        
        // If we got here, recovery failed
        this.triggerEvent('recoveryFailure', { 
            error, 
            recovery: recoveryAction 
        });
        
        return false;
    }
    
    /**
     * Initialize resources
     */
    initializeResources() {
        this.resources = {};
        
        // Create resources from configuration
        for (const type of Object.values(RESOURCE_TYPES)) {
            this.resources[type] = new Resource({
                type,
                basePrice: BASE_PRICES[type],
                decayRate: DECAY_RATES[type],
                productionRange: PRODUCTION_RATES[type],
                volatility: this.getResourceVolatility(type)
            });
        }
    }
    
    /**
     * Get resource volatility based on type
     * @param {string} type - Resource type
     * @returns {number} Volatility value
     */
    getResourceVolatility(type) {
        switch (type) {
            case RESOURCE_TYPES.MANA: return 1.0;
            case RESOURCE_TYPES.VITALITY: return 1.5;
            case RESOURCE_TYPES.ARCANUM: return 1.2;
            case RESOURCE_TYPES.AETHER: return 2.5;
            default: return 1.0;
        }
    }
    
    /**
     * Initialize players
     */
    initializePlayers() {
        this.players = [];
        
        // Create players
        for (let i = 0; i < this.playerCount; i++) {
            this.players.push(new Player({
                id: i + 1,
                name: `Player ${i + 1}`,
                color: PLAYER_COLORS[i],
                gold: 1000,
                resources: {
                    mana: 0,
                    vitality: 0,
                    arcanum: 0,
                    aether: 0
                }
            }));
        }
    }
    
    /**
     * Initialize the market
     */
    initializeMarket() {
        this.market = new Market({
            resources: this.resources,
            guildTax: 0.05,
            equilibrium: 100 * this.playerCount
        });
    }
    
    /**
     * Initialize territories from map data
     * @param {Array} territories - Territory data from map
     */
    initializeTerritories(territories) {
        this.territories = {};
        
        for (const data of territories) {
            const territory = new Territory({
                id: data.id,
                q: data.q,
                r: data.r,
                type: data.type,
                x: data.x,
                y: data.y
            });
            
            // Set base modifiers from config
            territory.setBaseModifiers(TERRITORY_MODIFIERS[data.type] || {});
            
            this.territories[data.id] = territory;
        }
        
        // Initialize market after territories are created
        this.initializeMarket();
    }
    
    /**
     * Get the current player
     * @returns {Object} Current player
     */
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }
    
    /**
     * Advance to the next player's turn
     * @returns {Object} New current player
     */
    nextTurn() {
        // Move to the next player
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerCount;
        
        // If we've gone through all players, complete the cycle
        if (this.currentPlayerIndex === 0) {
            this.completeCycle();
        }
        
        // Reset turn time
        this.phaseTime = 0;
        
        // Return the new current player
        return this.getCurrentPlayer();
    }
    
    /**
     * Handle end of a game cycle
     */
    completeCycle() {
        // Increment cycle counter
        this.currentCycle++;
        
        // Check for game end
        if (this.currentCycle > this.totalCycles) {
            this.endGame();
            return;
        }
        
        // Production phase - produce resources from territories
        this.produceResources();
        
        // Decay phase - apply resource decay
        this.applyResourceDecay();
        
        // Market phase - update prices
        this.updateMarketPrices();
        
        // Random event
        if (Math.random() < 0.3) { // 30% chance each cycle
            this.market.generateRandomEvent(this.currentCycle);
        }
        
        // Trigger cycle complete event
        this.triggerEvent('cycleComplete', {
            cycle: this.currentCycle,
            totalCycles: this.totalCycles
        });
    }
    
    /**
     * Produce resources from all territories
     */
    produceResources() {
        // Track total production
        const totalProduction = {};
        
        // Initialize with zeros
        for (const type of Object.values(RESOURCE_TYPES)) {
            totalProduction[type] = 0;
        }
        
        // Calculate production for each territory
        for (const territory of Object.values(this.territories)) {
            if (territory.owner && territory.construct) {
                const resourceType = territory.construct.getResourceType();
                const amount = territory.calculateProduction(resourceType);
                
                // Add to player's resources
                territory.owner.resources[resourceType] += amount;
                
                // Track total production
                totalProduction[resourceType] += amount;
            }
        }
        
        // Update market supply based on production
        for (const [type, amount] of Object.entries(totalProduction)) {
            if (this.market.supply[type] !== undefined) {
                this.market.supply[type] += Math.floor(amount * 0.1); // 10% goes to market
            }
        }
        
        // Trigger production event
        this.triggerEvent('production', { production: totalProduction });
    }
    
    /**
     * Apply resource decay
     */
    applyResourceDecay() {
        for (const player of this.players) {
            player.applyResourceDecay(DECAY_RATES);
        }
    }
    
    /**
     * Update market prices
     */
    updateMarketPrices() {
        this.market.updatePrices(this.playerCount);
        
        // Trigger market update event
        this.triggerEvent('marketUpdate', {
            resources: this.resources,
            prices: Object.fromEntries(
                Object.entries(this.resources).map(
                    ([type, resource]) => [type, resource.currentPrice]
                )
            )
        });
    }
    
    /**
     * Assign a territory to a player
     * @param {string} territoryId - ID of territory
     * @param {Object} player - Player to assign to
     * @returns {Object} Result object with success/error information
     */
    assignTerritory(territoryId, player) {
        // Validate parameters
        if (!territoryId) {
            return this.handleActionError(
                'Territory ID is required to assign territory',
                { territoryId, player }
            );
        }
        
        if (!player) {
            return this.handleActionError(
                'Player is required to assign territory',
                { territoryId, player }
            );
        }
        
        // Validate game state
        if (this.paused) {
            return this.handleActionError(
                'Cannot assign territory while game is paused',
                { territoryId, player, paused: this.paused }
            );
        }
        
        if (this.gameOver) {
            return this.handleActionError(
                'Cannot assign territory after game is over',
                { territoryId, player, gameOver: this.gameOver }
            );
        }
        
        // Check if territory exists
        const territory = this.territories[territoryId];
        if (!territory) {
            return this.handleActionError(
                `Territory with ID "${territoryId}" does not exist`,
                { territoryId, player }
            );
        }
        
        // Check if territory is already owned
        if (territory.owner) {
            return this.handleActionError(
                `Territory with ID "${territoryId}" is already owned by ${territory.owner.name}`,
                { territoryId, player, currentOwner: territory.owner.id }
            );
        }
        
        // Check if player is the current player
        if (player !== this.getCurrentPlayer()) {
            return this.handleActionError(
                `Only the current player can claim a territory`,
                { 
                    territoryId, 
                    playerId: player.id, 
                    currentPlayerId: this.getCurrentPlayer().id 
                }
            );
        }
        
        // Check if player has already claimed a territory this turn
        const hasClaimed = this.hasTerritoryClaimThisTurn(player);
        if (hasClaimed) {
            return this.handleActionError(
                `Player ${player.name} has already claimed a territory this turn`,
                { territoryId, player: player.id }
            );
        }
        
        try {
            // Attempt to set owner
            territory.setOwner(player);
            
            // Trigger territory assignment event
            this.triggerEvent('territoryAssigned', {
                territory,
                player
            });
            
            return ErrorHandler.createSuccess(
                `Player ${player.name} successfully claimed territory ${territoryId}`,
                { territory, player }
            );
        } catch (error) {
            return this.handleSystemError(
                `Failed to assign territory: ${error.message}`,
                { territoryId, player, error }
            );
        }
    }
    
    /**
     * Check if a player has already claimed a territory this turn
     * @param {Player} player - The player to check
     * @returns {boolean} Whether player has claimed a territory this turn
     */
    hasTerritoryClaimThisTurn(player) {
        // This should implement actual territory claim tracking logic
        // For now, we'll return false to allow testing
        return false;
    }
    
    /**
     * Handle an action error
     * @param {string} message - Error message
     * @param {Object} data - Additional error data
     * @returns {Object} Error result
     */
    handleActionError(message, data = {}) {
        const error = this.errorHandler.logActionError(message, data);
        return ErrorHandler.createError(message, data, error);
    }
    
    /**
     * Handle a validation error
     * @param {string} message - Error message
     * @param {Object} data - Additional error data
     * @returns {Object} Error result
     */
    handleValidationError(message, data = {}) {
        const error = this.errorHandler.logValidationError(message, data);
        return ErrorHandler.createError(message, data, error);
    }
    
    /**
     * Handle a resource error
     * @param {string} message - Error message
     * @param {Object} data - Additional error data
     * @returns {Object} Error result
     */
    handleResourceError(message, data = {}) {
        const error = this.errorHandler.logResourceError(message, data);
        return ErrorHandler.createError(message, data, error);
    }
    
    /**
     * Handle a system error
     * @param {string} message - Error message
     * @param {Object} data - Additional error data
     * @returns {Object} Error result
     */
    handleSystemError(message, data = {}) {
        const error = this.errorHandler.logSystemError(message, data);
        return ErrorHandler.createError(message, data, error);
    }
    
    /**
     * Create and place a construct on a territory
     * @param {string} territoryId - ID of territory
     * @param {string} constructType - Type of construct
     * @param {Object} player - Player creating the construct
     * @returns {Object} Result object with success/error information and construct if successful
     */
    createConstruct(territoryId, constructType, player) {
        // Validate parameters
        if (!territoryId) {
            return this.handleValidationError(
                'Territory ID is required to create a construct',
                { territoryId, constructType, player }
            );
        }
        
        if (!constructType) {
            return this.handleValidationError(
                'Construct type is required to create a construct',
                { territoryId, constructType, player }
            );
        }
        
        if (!player) {
            return this.handleValidationError(
                'Player is required to create a construct',
                { territoryId, constructType, player }
            );
        }
        
        // Validate game state
        if (this.paused) {
            return this.handleActionError(
                'Cannot create construct while game is paused',
                { territoryId, constructType, player, paused: this.paused }
            );
        }
        
        if (this.gameOver) {
            return this.handleActionError(
                'Cannot create construct after game is over',
                { territoryId, constructType, player, gameOver: this.gameOver }
            );
        }
        
        // Check if territory exists
        const territory = this.territories[territoryId];
        if (!territory) {
            return this.handleActionError(
                `Territory with ID "${territoryId}" does not exist`,
                { territoryId, constructType, player }
            );
        }
        
        // Check if player owns territory
        if (territory.owner !== player) {
            return this.handleActionError(
                `Player ${player.name} does not own territory ${territoryId}`,
                { 
                    territoryId, 
                    constructType, 
                    playerId: player.id,
                    ownerId: territory.owner ? territory.owner.id : null
                }
            );
        }
        
        // Check if territory already has a construct
        if (territory.construct) {
            return this.handleActionError(
                `Territory ${territoryId} already has a construct of type ${territory.construct.type}`,
                { 
                    territoryId, 
                    constructType, 
                    player: player.id,
                    existingConstruct: territory.construct.type
                }
            );
        }
        
        // Check if player is the current player
        if (player !== this.getCurrentPlayer()) {
            return this.handleActionError(
                `Only the current player can create a construct`,
                { 
                    territoryId, 
                    constructType,
                    playerId: player.id, 
                    currentPlayerId: this.getCurrentPlayer().id 
                }
            );
        }
        
        // Check if player has enough resources
        const constructCosts = this.getConstructCost(constructType);
        if (!player.hasEnoughResources(constructCosts)) {
            return this.handleResourceError(
                `Player ${player.name} does not have enough resources to create a ${constructType}`,
                { 
                    territoryId, 
                    constructType, 
                    player: player.id,
                    required: constructCosts,
                    available: player.resources
                }
            );
        }
        
        try {
            // Remove resources
            player.removeResources(constructCosts);
            
            // Create the construct
            const construct = new Construct({
                type: constructType,
                level: 1,
                owner: player
            });
            
            // Place on territory
            if (!territory.placeConstruct(construct)) {
                // Refund resources if placement fails
                player.addResources(constructCosts);
                
                return this.handleActionError(
                    `Failed to place ${constructType} on territory ${territoryId}`,
                    { territoryId, constructType, player: player.id }
                );
            }
            
            // Trigger construct creation event
            this.triggerEvent('constructCreated', {
                territory,
                construct,
                player
            });
            
            return ErrorHandler.createSuccess(
                `Successfully created ${constructType} on territory ${territoryId}`,
                { territory, construct, player }
            );
        } catch (error) {
            // Refund resources
            player.addResources(constructCosts);
            
            return this.handleSystemError(
                `Failed to create construct: ${error.message}`,
                { territoryId, constructType, player: player.id, error }
            );
        }
    }
    
    /**
     * Get cost to create a construct by type
     * @param {string} constructType - Type of construct
     * @returns {Object} Resource costs
     */
    getConstructCost(constructType) {
        switch (constructType) {
            case 'mana_conduit':
                return { arcanum: 150, mana: 50 };
            case 'vitality_well':
                return { arcanum: 150, vitality: 50 };
            case 'arcanum_extractor':
                return { arcanum: 200, mana: 75 };
            case 'aether_resonator':
                return { arcanum: 300, mana: 100, vitality: 50 };
            default:
                return { arcanum: 200 };
        }
    }
    
    /**
     * Add an improvement to a territory
     * @param {string} territoryId - ID of territory
     * @param {Object} improvement - Improvement data
     * @param {Object} player - Player adding the improvement
     * @returns {boolean} Whether addition was successful
     */
    addImprovement(territoryId, improvement, player) {
        const territory = this.territories[territoryId];
        if (!territory || territory.owner !== player) {
            return false;
        }
        
        // Check if player has enough resources
        if (!player.removeResources(improvement.cost)) {
            return false;
        }
        
        // Add improvement to territory
        territory.addImprovement(improvement);
        
        // Add to player's improvements
        player.improvements.push({
            ...improvement,
            territoryId
        });
        
        // Trigger improvement event
        this.triggerEvent('improvementAdded', {
            territory,
            improvement,
            player
        });
        
        return true;
    }
    
    /**
     * Process a market transaction
     * @param {Object} player - Player making the transaction
     * @param {string} type - Transaction type ('buy' or 'sell')
     * @param {string} resourceType - Resource type
     * @param {number} amount - Amount of resource
     * @param {number} price - Price per unit
     * @returns {boolean} Whether transaction was successful
     */
    processMarketTransaction(player, type, resourceType, amount, price) {
        // Ensure market is initialized
        if (!this.market) {
            return false;
        }
        
        const success = this.market.processTransaction(
            player,
            type,
            resourceType,
            amount,
            price,
            this.currentCycle
        );
        
        if (success) {
            // Trigger transaction event
            this.triggerEvent('marketTransaction', {
                player,
                type,
                resourceType,
                amount,
                price,
                cycle: this.currentCycle
            });
        }
        
        return success;
    }
    
    /**
     * Check for game end conditions
     * @returns {boolean} Whether the game is over
     */
    checkGameEnd() {
        // Game ends after the final cycle
        if (this.currentCycle > this.totalCycles) {
            return true;
        }
        
        // Check for realm failure conditions
        let manaShortage = true;
        let vitalityShortage = true;
        
        for (const player of this.players) {
            if (player.resources.mana > 0) {
                manaShortage = false;
            }
            if (player.resources.vitality > 0) {
                vitalityShortage = false;
            }
        }
        
        // Both resources severely depleted is a realm failure
        if (manaShortage && vitalityShortage) {
            return true;
        }
        
        return false;
    }
    
    /**
     * End the game and calculate final results
     * @returns {Object} Final game results
     */
    endGame() {
        // Calculate final scores
        const scores = this.players.map(player => ({
            player,
            score: player.calculateScore()
        }));
        
        // Sort by score in descending order
        scores.sort((a, b) => b.score - a.score);
        
        // Determine winner
        const winner = scores[0].player;
        
        // Game over event
        this.triggerEvent('gameOver', {
            winner,
            scores,
            cycle: this.currentCycle
        });
        
        return {
            winner,
            scores,
            cycle: this.currentCycle
        };
    }
    
    /**
     * Register an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        
        this.eventListeners[event].push(callback);
    }
    
    /**
     * Trigger an event
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    triggerEvent(event, data) {
        if (this.eventListeners[event]) {
            for (const callback of this.eventListeners[event]) {
                callback(data);
            }
        }
    }
}