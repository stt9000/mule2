import { RESOURCE_TYPES } from '../config/gameConfig.js';
import ErrorHandler from '../utils/ErrorHandler.js';

// Improvement definitions
export const IMPROVEMENTS = {
    wardstone: {
        name: "Wardstone",
        cost: { arcanum: 100, mana: 50 },
        effect: { interference_reduction: 0.5 },
        constructionTime: 2, // cycles
        description: "Reduces magical interference by 50%"
    },
    harmonic_anchor: {
        name: "Harmonic Anchor",
        cost: { arcanum: 150, mana: 100 },
        effect: { enchantment_bonus: 0.5 },
        constructionTime: 3,
        description: "Enhances enchantment bonuses by 50%"
    },
    purification_circle: {
        name: "Purification Circle",
        cost: { arcanum: 200, vitality: 150 },
        effect: { remove_negative_modifiers: true },
        constructionTime: 3,
        description: "Eliminates negative terrain modifiers"
    },
    focus_pillar: {
        name: "Focus Pillar",
        cost: { arcanum: 300, mana: 200, vitality: 100 },
        effect: { double_production_chance: 0.1 },
        constructionTime: 4,
        description: "10% chance to double production each cycle"
    }
};

/**
 * TerritoryImprovement
 * Represents an improvement that can be built on a territory
 */
export default class TerritoryImprovement {
    constructor(territory, improvementType, gameFlowController) {
        this.territory = territory;
        this.type = improvementType;
        this.gameFlow = gameFlowController;
        this.eventSystem = gameFlowController;
        this.config = IMPROVEMENTS[improvementType];
        
        if (!this.config) {
            throw new Error(`Unknown improvement type: ${improvementType}`);
        }
        
        this.constructionStartCycle = null;
        this.constructionTime = this.config.constructionTime;
        this.isActive = false;
        this.isUnderConstruction = false;
        
        // Error handling
        this.errorHandler = new ErrorHandler();
    }

    /**
     * Check if improvement can be built
     */
    canBuild(playerId) {
        if (!this.gameFlow) return false;
        
        const player = this.gameFlow.stateManager?.gameState?.players.find(p => p.id === playerId);
        const cost = this.config.cost;
        const currentPhase = this.gameFlow.cycleManager?.currentPhase;
        
        return player && 
               this.hasResources(player, cost) && 
               !this.territory.hasImprovement(this.type) &&
               this.territory.ownerId === playerId &&
               currentPhase === 'construct_outfitting' &&
               this.gameFlow.turnManager?.canPlayerAct(playerId, { type: 'build_improvement' });
    }

    /**
     * Start construction
     */
    startConstruction(playerId) {
        try {
            if (!this.canBuild(playerId)) {
                return { success: false, reason: 'Cannot build improvement' };
            }

            const player = this.gameFlow.stateManager?.gameState?.players.find(p => p.id === playerId);
            const cost = this.config.cost;
            
            // Spend resources through state manager
            this.spendResources(player, cost);
            
            // Start construction
            this.isUnderConstruction = true;
            this.constructionStartCycle = this.gameFlow.cycleManager?.currentCycle || 1;
            
            // Add to territory
            this.territory.addImprovement(this);
            
            // Log action
            this.gameFlow.stateManager?.logPlayerAction(playerId, 'start_improvement', {
                territoryId: this.territory.id,
                improvementType: this.type,
                cost: cost,
                completionCycle: this.constructionStartCycle + this.constructionTime
            });

            // Consume player action
            this.gameFlow.turnManager?.executePlayerAction(player, {
                type: 'build_improvement',
                target: this.territory.id,
                improvement: this.type
            });

            // Schedule completion
            this.scheduleCompletion();
            
            // Emit event
            this.eventSystem?.broadcastEvent('improvement.started', {
                territoryId: this.territory.id,
                improvementType: this.type,
                playerId: playerId,
                completionCycle: this.constructionStartCycle + this.constructionTime
            });
            
            return { 
                success: true, 
                completionCycle: this.constructionStartCycle + this.constructionTime 
            };
        } catch (error) {
            this.errorHandler.handleError(error, 'TerritoryImprovement.startConstruction');
            return { success: false, reason: error.message };
        }
    }

    /**
     * Schedule improvement completion
     */
    scheduleCompletion() {
        if (!this.eventSystem) return;
        
        const completionHandler = (event) => {
            if (event.cycle >= this.constructionStartCycle + this.constructionTime) {
                this.completeConstruction();
                // Remove this listener after completion
                this.eventSystem.off('cycle.started', completionHandler);
            }
        };
        
        this.eventSystem.on('cycle.started', completionHandler);
    }

    /**
     * Complete construction
     */
    completeConstruction() {
        this.isUnderConstruction = false;
        this.isActive = true;
        
        // Apply improvement effects
        this.applyEffects();
        
        this.eventSystem?.broadcastEvent('improvement.completed', {
            territoryId: this.territory.id,
            improvementType: this.type,
            cycle: this.gameFlow?.cycleManager?.currentCycle
        });
    }

    /**
     * Apply improvement effects to territory
     */
    applyEffects() {
        const effects = this.config.effect;
        
        switch (this.type) {
            case 'wardstone':
                // Interference reduction is handled in territory calculation
                break;
                
            case 'harmonic_anchor':
                // Enchantment bonus is handled in territory calculation
                break;
                
            case 'purification_circle':
                if (effects.remove_negative_modifiers) {
                    // Reset negative modifiers to 1.0
                    const modifiers = { ...this.territory.baseModifiers };
                    Object.keys(modifiers).forEach(resource => {
                        if (modifiers[resource] < 1.0) {
                            modifiers[resource] = 1.0;
                        }
                    });
                    this.territory.setBaseModifiers(modifiers);
                }
                break;
                
            case 'focus_pillar':
                // Double production chance is handled during production calculation
                break;
        }
    }

    /**
     * Check if player has required resources
     */
    hasResources(player, cost) {
        return Object.entries(cost).every(([resource, amount]) => 
            (player.resources[resource] || 0) >= amount
        );
    }

    /**
     * Spend resources for improvement
     */
    spendResources(player, cost) {
        const updatedResources = { ...player.resources };
        Object.entries(cost).forEach(([resource, amount]) => {
            updatedResources[resource] = (updatedResources[resource] || 0) - amount;
        });
        
        // Update through state manager
        const players = this.gameFlow.stateManager?.gameState?.players.map(p => 
            p.id === player.id ? { ...p, resources: updatedResources } : p
        );
        
        this.gameFlow.stateManager?.updateGameState({ players });
    }

    /**
     * Apply production effects
     */
    applyProductionEffects(baseProduction) {
        if (!this.isActive) return baseProduction;
        
        let production = baseProduction;
        
        // Apply focus pillar double production chance
        if (this.type === 'focus_pillar' && Math.random() < this.config.effect.double_production_chance) {
            production *= 2;
            
            this.eventSystem?.broadcastEvent('production.doubled', {
                territoryId: this.territory.id,
                improvementType: this.type,
                originalProduction: baseProduction,
                doubledProduction: production
            });
        }
        
        return production;
    }

    /**
     * Update for new cycle
     */
    updateForNewCycle(currentCycle) {
        // Check if construction should complete
        if (this.isUnderConstruction && 
            currentCycle >= this.constructionStartCycle + this.constructionTime) {
            this.completeConstruction();
        }
    }

    /**
     * Serialize improvement for saving
     */
    serialize() {
        return {
            type: this.type,
            constructionStartCycle: this.constructionStartCycle,
            isActive: this.isActive,
            isUnderConstruction: this.isUnderConstruction
        };
    }

    /**
     * Restore from saved data
     */
    static deserialize(data, territory, gameFlowController) {
        const improvement = new TerritoryImprovement(territory, data.type, gameFlowController);
        improvement.constructionStartCycle = data.constructionStartCycle;
        improvement.isActive = data.isActive;
        improvement.isUnderConstruction = data.isUnderConstruction;
        
        // Re-apply effects if active
        if (improvement.isActive) {
            improvement.applyEffects();
        }
        
        // Re-schedule completion if under construction
        if (improvement.isUnderConstruction) {
            improvement.scheduleCompletion();
        }
        
        return improvement;
    }

    /**
     * Get improvement display info
     */
    getDisplayInfo() {
        return {
            type: this.type,
            name: this.config.name,
            description: this.config.description,
            cost: this.config.cost,
            isActive: this.isActive,
            isUnderConstruction: this.isUnderConstruction,
            turnsRemaining: this.isUnderConstruction ? 
                Math.max(0, (this.constructionStartCycle + this.constructionTime) - 
                    (this.gameFlow?.cycleManager?.currentCycle || 0)) : 0
        };
    }

    /**
     * Get improvement value for wealth calculation
     */
    getValue() {
        // Calculate value based on resource cost
        let value = 0;
        const prices = this.gameFlow?.stateManager?.gameState?.market?.prices || {};
        
        Object.entries(this.config.cost).forEach(([resource, amount]) => {
            value += amount * (prices[resource] || 20);
        });
        
        // Add premium for completed improvements
        if (this.isActive) {
            value *= 1.5;
        }
        
        return Math.floor(value);
    }
}

/**
 * Get all available improvements
 */
export function getAllImprovements() {
    return Object.keys(IMPROVEMENTS);
}

/**
 * Get improvement info by type
 */
export function getImprovementInfo(type) {
    return IMPROVEMENTS[type] || null;
}

/**
 * Check if improvement type exists
 */
export function isValidImprovementType(type) {
    return type in IMPROVEMENTS;
}