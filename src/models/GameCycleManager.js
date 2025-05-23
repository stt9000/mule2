import { GAME_SETTINGS } from '../config/gameConfig.js';
import ErrorHandler from '../utils/ErrorHandler.js';
import ResourceProductionCalculator from './ResourceProductionCalculator.js';
import ResourceStorage from './ResourceStorage.js';
import ResourceDecay from './ResourceDecay.js';

/**
 * GameCycleManager
 * Manages game cycles and phase progression
 */
export default class GameCycleManager {
    constructor(gameConfig = {}, gameFlow = null) {
        this.currentCycle = 1;
        this.maxCycles = gameConfig.maxCycles || GAME_SETTINGS.TOTAL_CYCLES;
        this.currentPhase = 'territory_selection';
        this.phaseTimer = null;
        this.cyclePhases = [
            'territory_selection',
            'construct_outfitting', 
            'resource_production',
            'auction_phase',
            'end_cycle_events'
        ];
        this.phaseIndex = 0;
        this.gameState = 'active'; // 'active', 'paused', 'ended'
        this.gameFlow = gameFlow; // Reference to GameFlowController
        
        // Event system
        this.eventListeners = {};
        this.errorHandler = new ErrorHandler();
        
        // Resource production components
        this.resourceCalculator = null;
        this.resourceStorage = new ResourceStorage();
        this.resourceDecay = new ResourceDecay();
        
        // Phase configurations
        this.phaseConfigs = {
            territory_selection: {
                allowsPlayerActions: true,
                autoAdvance: false,
                timeLimit: 120 // 2 minutes
            },
            construct_outfitting: {
                allowsPlayerActions: true,
                autoAdvance: false,
                timeLimit: 180 // 3 minutes
            },
            resource_production: {
                allowsPlayerActions: false,
                autoAdvance: true,
                timeLimit: 30 // 30 seconds (automated)
            },
            auction_phase: {
                allowsPlayerActions: true,
                autoAdvance: false,
                timeLimit: 300 // 5 minutes
            },
            end_cycle_events: {
                allowsPlayerActions: false,
                autoAdvance: true,
                timeLimit: 15 // 15 seconds
            }
        };
    }

    /**
     * Start a new game cycle
     */
    startNewCycle() {
        try {
            this.currentCycle++;
            this.phaseIndex = 0;
            this.currentPhase = this.cyclePhases[0];
            
            this.broadcastEvent('cycle.started', { 
                cycle: this.currentCycle,
                maxCycles: this.maxCycles
            });
            
            this.startCurrentPhase();
        } catch (error) {
            this.errorHandler.handleError(error, 'GameCycleManager.startNewCycle');
        }
    }

    /**
     * Advance to the next phase in the current cycle
     */
    advancePhase() {
        try {
            console.log(`GameCycleManager.advancePhase called - current phase: ${this.currentPhase}, index: ${this.phaseIndex}`);
            console.trace('advancePhase called from:');
            this.endCurrentPhase();
            this.phaseIndex++;
            
            if (this.phaseIndex >= this.cyclePhases.length) {
                if (this.currentCycle >= this.maxCycles) {
                    this.endGame();
                } else {
                    this.startNewCycle();
                }
            } else {
                this.currentPhase = this.cyclePhases[this.phaseIndex];
                console.log(`Advancing to phase: ${this.currentPhase}`);
                this.startCurrentPhase();
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'GameCycleManager.advancePhase');
        }
    }

    /**
     * Start the current phase
     */
    startCurrentPhase() {
        try {
            const phaseConfig = this.phaseConfigs[this.currentPhase];
            
            this.broadcastEvent('phase.started', { 
                phase: this.currentPhase, 
                cycle: this.currentCycle,
                config: phaseConfig
            });
            
            // Execute phase-specific initialization
            switch (this.currentPhase) {
                case 'territory_selection':
                    this.initializeTerritorySelection();
                    break;
                case 'construct_outfitting':
                    this.initializeConstructOutfitting();
                    break;
                case 'resource_production':
                    console.log('Starting resource production phase execution...');
                    // Make sure to clear any existing phase timer
                    this.clearPhaseTimer();
                    this.executeResourceProduction();
                    break;
                case 'auction_phase':
                    this.initializeAuctions();
                    break;
                case 'end_cycle_events':
                    this.processEndCycleEvents();
                    break;
                default:
                    throw new Error(`Unknown phase: ${this.currentPhase}`);
            }

            // Set up auto-advance if configured
            if (phaseConfig.autoAdvance) {
                // Temporarily disable auto-advance for resource production to see effects
                if (this.currentPhase === 'resource_production') {
                    console.log('Auto-advance disabled for resource production phase');
                } else {
                    this.schedulePhaseAdvance(phaseConfig.timeLimit);
                }
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'GameCycleManager.startCurrentPhase');
        }
    }

    /**
     * End the current phase
     */
    endCurrentPhase() {
        try {
            this.clearPhaseTimer();
            
            // Phase-specific cleanup
            switch (this.currentPhase) {
                case 'territory_selection':
                    // Resolve all territory disputes before ending phase
                    if (this.gameFlow?.territoryAcquisition) {
                        console.log('Resolving territory disputes at end of territory selection phase');
                        this.gameFlow.territoryAcquisition.resolveDisputes();
                    }
                    break;
            }
            
            this.broadcastEvent('phase.ended', { 
                phase: this.currentPhase, 
                cycle: this.currentCycle 
            });
        } catch (error) {
            this.errorHandler.handleError(error, 'GameCycleManager.endCurrentPhase');
        }
    }

    /**
     * Initialize territory selection phase
     */
    initializeTerritorySelection() {
        this.broadcastEvent('territory_selection.initialized', {
            cycle: this.currentCycle
        });
    }

    /**
     * Initialize construct outfitting phase
     */
    initializeConstructOutfitting() {
        this.broadcastEvent('construct_outfitting.initialized', {
            cycle: this.currentCycle
        });
    }

    /**
     * Execute resource production phase
     */
    executeResourceProduction() {
        console.log('=== RESOURCE PRODUCTION PHASE ===');
        console.log('executeResourceProduction called');
        
        try {
            // Initialize calculator if needed
            if (!this.resourceCalculator) {
                this.resourceCalculator = new ResourceProductionCalculator(this.gameFlow);
            }
            
            // Calculate all production
            const productionResults = this.resourceCalculator.calculateCycleProduction();
            console.log('Production calculation results:', productionResults);
            console.log('Individual productions:', productionResults?.individualProduction?.length || 0);
            console.log('Player totals:', productionResults?.playerTotals?.length || 0);
            
            // Broadcast production started event
            console.log('Broadcasting resource_production.started event');
            this.broadcastEvent('resource_production.started', {
                cycle: this.currentCycle,
                results: productionResults
            });
            
            // Apply production to players with visual delays
            console.log('Scheduling production application for players...');
            productionResults.playerTotals.forEach((playerTotal, index) => {
                console.log(`Scheduling player ${playerTotal.playerId} production in ${index * 500}ms`);
                setTimeout(() => {
                    console.log(`Applying production for player ${playerTotal.playerId}`);
                    this.applyProductionToPlayer(playerTotal);
                }, index * 500);
            });
            
            // Show production summary after all animations
            const totalDelay = productionResults.playerTotals.length * 500 + 1000;
            setTimeout(() => {
                this.broadcastEvent('resource_production.completed', {
                    cycle: this.currentCycle,
                    summary: this.generateProductionSummary(productionResults)
                });
                
                // Auto-advance after showing summary
                // DISABLED for testing - manually advance when ready
                // this.schedulePhaseAdvance(5); // Give 5 seconds to view summary
                console.log('Auto-advance after production disabled - manually advance when ready');
            }, totalDelay);
            
        } catch (error) {
            this.errorHandler.handleError(error, 'GameCycleManager.executeResourceProduction');
            // Still advance phase on error
            this.schedulePhaseAdvance(this.phaseConfigs.resource_production.timeLimit);
        }
    }

    /**
     * Initialize auction phase
     */
    initializeAuctions() {
        this.broadcastEvent('auction_phase.initialized', {
            cycle: this.currentCycle
        });
    }

    /**
     * Process end cycle events
     */
    processEndCycleEvents() {
        this.broadcastEvent('end_cycle_events.started', {
            cycle: this.currentCycle
        });
        
        // Process resource decay, market events, etc.
        this.processResourceDecay();
        this.processMarketEvents();
        this.checkVictoryConditions();
        
        // Auto-advance after processing
        this.schedulePhaseAdvance(this.phaseConfigs.end_cycle_events.timeLimit);
    }

    /**
     * Apply production results to a player
     */
    applyProductionToPlayer(playerTotal) {
        try {
            const player = this.gameFlow.stateManager.getPlayer(playerTotal.playerId);
            if (!player) {
                console.error(`Player ${playerTotal.playerId} not found`);
                return;
            }
            
            // Apply resources with storage handling
            const storageResults = this.resourceStorage.addResources(player, playerTotal.resources);
            
            // Broadcast individual territory production events
            console.log(`Broadcasting production events for ${playerTotal.territories.length} territories`);
            playerTotal.territories.forEach(territory => {
                console.log(`Broadcasting territory.produced for ${territory.territoryId}: ${territory.amount} ${territory.resource}`);
                this.broadcastEvent('territory.produced', {
                    playerId: player.id,
                    territoryId: territory.territoryId,
                    resource: territory.resource,
                    amount: territory.amount,
                    terrainType: territory.terrainType
                });
            });
            
            // Broadcast player production summary
            this.broadcastEvent('player.production_applied', {
                playerId: player.id,
                playerName: player.name,
                resources: playerTotal.resources,
                storageResults: storageResults
            });
            
        } catch (error) {
            this.errorHandler.handleError(error, 'GameCycleManager.applyProductionToPlayer');
        }
    }
    
    /**
     * Generate production summary
     */
    generateProductionSummary(productionResults) {
        const summary = {
            cycleNumber: productionResults.cycleNumber,
            totalProduction: {
                mana: 0,
                vitality: 0,
                arcanum: 0,
                aether: 0
            },
            playerSummaries: [],
            topProducers: {}
        };
        
        // Calculate totals and find top producers
        productionResults.playerTotals.forEach(playerTotal => {
            // Add to total production
            Object.entries(playerTotal.resources).forEach(([resource, amount]) => {
                summary.totalProduction[resource] += amount;
                
                // Track top producer for each resource
                if (!summary.topProducers[resource] || 
                    amount > summary.topProducers[resource].amount) {
                    summary.topProducers[resource] = {
                        playerId: playerTotal.playerId,
                        playerName: playerTotal.playerName,
                        amount: amount
                    };
                }
            });
            
            // Add player summary
            summary.playerSummaries.push({
                playerId: playerTotal.playerId,
                playerName: playerTotal.playerName,
                territoryCount: playerTotal.territories.length,
                totalResources: playerTotal.resources
            });
        });
        
        return summary;
    }

    /**
     * Process resource decay at end of cycle
     */
    processResourceDecay() {
        try {
            console.log('=== PROCESSING RESOURCE DECAY ===');
            
            // Get all players
            const players = this.gameFlow.game.players;
            
            // Apply decay to all players
            const decayResults = this.resourceDecay.applyDecayToAllPlayers(players);
            
            // Generate summary
            const decaySummary = this.resourceDecay.generateDecaySummary(decayResults);
            
            // Broadcast decay events
            this.broadcastEvent('resource_decay.processing', {
                cycle: this.currentCycle,
                results: decayResults,
                summary: decaySummary
            });
            
            // Show individual player decay with delays
            decayResults.forEach((result, index) => {
                const totalDecay = Object.values(result.decayed).reduce((sum, val) => sum + val, 0);
                if (totalDecay > 0) {
                    setTimeout(() => {
                        this.broadcastEvent('player.resources_decayed', {
                            playerId: result.playerId,
                            playerName: result.playerName,
                            decayed: result.decayed,
                            preserved: result.preserved
                        });
                    }, index * 300);
                }
            });
            
            // Broadcast completion after all animations
            const totalDelay = decayResults.length * 300 + 500;
            setTimeout(() => {
                this.broadcastEvent('resource_decay.completed', {
                    cycle: this.currentCycle,
                    summary: decaySummary
                });
            }, totalDelay);
            
        } catch (error) {
            this.errorHandler.handleError(error, 'GameCycleManager.processResourceDecay');
        }
    }

    /**
     * Process random market events
     */
    processMarketEvents() {
        // Random chance for market events
        const eventChance = Math.random();
        
        if (eventChance < 0.2) { // 20% chance per cycle
            const events = [
                'magical_convergence',
                'life_bloom',
                'ancient_discovery',
                'aether_storm',
                'mana_drought',
                'planar_interference'
            ];
            
            const selectedEvent = events[Math.floor(Math.random() * events.length)];
            
            this.broadcastEvent('market_event.triggered', {
                event: selectedEvent,
                cycle: this.currentCycle
            });
        }
    }

    /**
     * Check for victory conditions
     */
    checkVictoryConditions() {
        if (this.currentCycle >= this.maxCycles) {
            this.broadcastEvent('game.victory_check', {
                cycle: this.currentCycle,
                finalCycle: true
            });
        }
    }

    /**
     * Schedule automatic phase advancement
     */
    schedulePhaseAdvance(delay) {
        this.clearPhaseTimer();
        
        this.phaseTimer = setTimeout(() => {
            this.advancePhase();
        }, delay * 1000); // Convert to milliseconds
    }

    /**
     * Clear the phase timer
     */
    clearPhaseTimer() {
        if (this.phaseTimer) {
            clearTimeout(this.phaseTimer);
            this.phaseTimer = null;
        }
    }

    /**
     * End the game
     */
    endGame() {
        try {
            this.gameState = 'ended';
            this.clearPhaseTimer();
            
            this.broadcastEvent('game.ended', {
                finalCycle: this.currentCycle
            });
        } catch (error) {
            this.errorHandler.handleError(error, 'GameCycleManager.endGame');
        }
    }

    /**
     * Pause the game
     */
    pauseGame() {
        if (this.gameState === 'active') {
            this.gameState = 'paused';
            this.clearPhaseTimer();
            
            this.broadcastEvent('game.paused', {
                cycle: this.currentCycle,
                phase: this.currentPhase
            });
        }
    }

    /**
     * Resume the game
     */
    resumeGame() {
        if (this.gameState === 'paused') {
            this.gameState = 'active';
            
            // Restart phase timer if needed
            const phaseConfig = this.phaseConfigs[this.currentPhase];
            if (phaseConfig.autoAdvance) {
                this.schedulePhaseAdvance(phaseConfig.timeLimit);
            }
            
            this.broadcastEvent('game.resumed', {
                cycle: this.currentCycle,
                phase: this.currentPhase
            });
        }
    }

    /**
     * Get current game status
     */
    getStatus() {
        return {
            currentCycle: this.currentCycle,
            maxCycles: this.maxCycles,
            currentPhase: this.currentPhase,
            phaseIndex: this.phaseIndex,
            gameState: this.gameState,
            cycleProgress: this.currentCycle / this.maxCycles,
            phaseProgress: this.phaseIndex / this.cyclePhases.length
        };
    }

    /**
     * Force advance to a specific phase (for testing/admin)
     */
    forceAdvanceToPhase(phaseName) {
        try {
            const phaseIndex = this.cyclePhases.indexOf(phaseName);
            if (phaseIndex === -1) {
                throw new Error(`Invalid phase name: ${phaseName}`);
            }
            
            this.endCurrentPhase();
            this.phaseIndex = phaseIndex;
            this.currentPhase = phaseName;
            this.startCurrentPhase();
            
            this.broadcastEvent('phase.forced', {
                phase: this.currentPhase,
                cycle: this.currentCycle
            });
        } catch (error) {
            this.errorHandler.handleError(error, 'GameCycleManager.forceAdvanceToPhase');
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