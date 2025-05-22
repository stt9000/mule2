import { GAME_SETTINGS } from '../config/gameConfig.js';
import ErrorHandler from '../utils/ErrorHandler.js';

/**
 * GameCycleManager
 * Manages game cycles and phase progression
 */
export default class GameCycleManager {
    constructor(gameConfig = {}) {
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
        
        // Event system
        this.eventListeners = {};
        this.errorHandler = new ErrorHandler();
        
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
                this.schedulePhaseAdvance(phaseConfig.timeLimit);
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
        this.broadcastEvent('resource_production.started', {
            cycle: this.currentCycle
        });
        
        // Auto-advance after production calculations
        this.schedulePhaseAdvance(this.phaseConfigs.resource_production.timeLimit);
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
     * Process resource decay at end of cycle
     */
    processResourceDecay() {
        this.broadcastEvent('resource_decay.processing', {
            cycle: this.currentCycle
        });
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