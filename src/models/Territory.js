import { RESOURCE_TYPES } from '../config/gameConfig.js';
import ErrorHandler from '../utils/ErrorHandler.js';

/**
 * Territory Model
 * Represents a magical territory (ley line nexus) in the game world
 * Integrated with GameFlowController for state management
 */
export default class Territory {
    /**
     * Create a new Territory
     * @param {Object} config - Territory configuration
     * @param {string} config.id - Unique identifier
     * @param {number} config.q - Q coordinate (axial)
     * @param {number} config.r - R coordinate (axial)
     * @param {string} config.type - Territory type from TERRITORY_TYPES
     * @param {number} config.x - X position on screen
     * @param {number} config.y - Y position on screen
     * @param {GameFlowController} config.gameFlowController - Game flow controller instance
     */
    constructor(config) {
        this.id = config.id;
        this.q = config.q;
        this.r = config.r;
        this.type = config.type;
        this.x = config.x;
        this.y = config.y;
        
        // References to visual components
        this.hex = null;
        this.icon = null;
        this.ownerIndicator = null;
        this.constructVisual = null;
        
        // Game state
        this.owner = null;
        this.ownerId = null; // Store player ID for persistence
        this.construct = null;
        this.improvements = [];
        
        // Production modifiers
        this.baseModifiers = this.getDefaultBaseModifiers(); // From territory type
        this.improvementModifiers = {}; // From improvements
        this.interferenceModifiers = {}; // From neighboring territories
        
        // Production tracking
        this.enchantmentLevel = 0;
        this.lastProductionCycle = 0;
        
        // Visual state
        this.isHighlighted = false;
        this.isSelected = false;
        
        // Integration with game flow
        this.gameFlow = config.gameFlowController;
        this.eventSystem = config.gameFlowController;
        
        // Error handling
        this.errorHandler = new ErrorHandler();
    }
    
    /**
     * Get default base modifiers for territory type
     */
    getDefaultBaseModifiers() {
        const modifiers = {
            ancient_grove: { vitality: 1.25, mana: 1.0, arcanum: 0.9 },
            crystalline_cave: { vitality: 0.95, mana: 1.3, arcanum: 1.0 },
            ruined_temple: { vitality: 1.0, mana: 1.1, arcanum: 1.2 },
            mountain_peak: { vitality: 1.15, mana: 1.15, arcanum: 1.15 },
            marshland: { vitality: 1.35, mana: 0.85, arcanum: 1.0 },
            volcanic_field: { vitality: 1.0, mana: 1.0, arcanum: 1.25, aether: 1.1 }
        };
        return modifiers[this.type] || { vitality: 1.0, mana: 1.0, arcanum: 1.0 };
    }
    
    /**
     * Calculate production for this territory
     * @param {string} resourceType - The type of resource to calculate
     * @returns {number} The amount produced
     */
    calculateProduction(resourceType) {
        if (!this.construct) {
            return 0;
        }
        
        // Resource types don't match? No production
        // Get resource type from construct
        let constructResourceType;
        if (this.construct.getResourceType) {
            constructResourceType = this.construct.getResourceType();
        } else {
            // Handle plain object constructs (legacy)
            const resourceTypeMap = {
                mana_conduit: 'mana',
                vitality_well: 'vitality',
                arcanum_extractor: 'arcanum',
                aether_resonator: 'aether'
            };
            constructResourceType = resourceTypeMap[this.construct.type] || 'mana';
        }
        if (resourceType !== constructResourceType) {
            return 0;
        }
        
        // Get base production from construct
        let baseProduction = 10; // Default base production
        if (this.construct.getBaseProduction) {
            baseProduction = this.construct.getBaseProduction();
        } else {
            // Handle plain object constructs (legacy)
            const baseProductionMap = {
                mana_conduit: 15,
                vitality_well: 12,
                arcanum_extractor: 10,
                aether_resonator: 8
            };
            baseProduction = baseProductionMap[this.construct.type] || 10;
        }
        
        let production = baseProduction;
        
        // Apply territory type modifiers
        if (this.baseModifiers[resourceType]) {
            production += production * this.baseModifiers[resourceType];
        }
        
        // Apply construct level multiplier
        let levelMultiplier = 1.0;
        if (this.construct.getProductionMultiplier) {
            levelMultiplier = this.construct.getProductionMultiplier();
        } else {
            // Handle plain object constructs (legacy)
            const level = this.construct.level || 1;
            levelMultiplier = level === 1 ? 1.0 : level === 2 ? 1.5 : 2.0;
        }
        production *= levelMultiplier;
        
        // Apply improvements
        let improvementBonus = 0;
        for (const modifier of Object.values(this.improvementModifiers)) {
            if (typeof modifier === 'number') {
                improvementBonus += modifier;
            }
        }
        production += production * improvementBonus;
        
        // Apply interference penalties
        let interference = 0;
        for (const modifier of Object.values(this.interferenceModifiers)) {
            if (typeof modifier === 'number') {
                interference += modifier;
            }
        }
        production -= production * interference;
        
        return Math.max(0, Math.floor(production));
    }
    
    /**
     * Add an improvement to this territory
     * @param {Object} improvement - Improvement object
     */
    addImprovement(improvement) {
        this.improvements.push(improvement);
        
        // Apply modifiers from the improvement
        if (improvement.modifiers) {
            for (const [resource, value] of Object.entries(improvement.modifiers)) {
                if (!this.improvementModifiers[resource]) {
                    this.improvementModifiers[resource] = 0;
                }
                this.improvementModifiers[resource] += value;
            }
        }
    }
    
    /**
     * Add interference from a nearby territory
     * @param {string} sourceId - ID of the interfering territory
     * @param {Object} modifiers - Interference modifiers by resource type
     */
    addInterference(sourceId, modifiers) {
        this.interferenceModifiers[sourceId] = modifiers;
    }
    
    /**
     * Remove interference from a territory
     * @param {string} sourceId - ID of the interfering territory
     */
    removeInterference(sourceId) {
        delete this.interferenceModifiers[sourceId];
    }
    
    /**
     * Set the base modifiers for this territory
     * @param {Object} modifiers - Modifiers by resource type
     */
    setBaseModifiers(modifiers) {
        this.baseModifiers = modifiers;
    }
    
    /**
     * Get the owner of this territory
     * @returns {Object|null} The player who owns this territory, or null
     */
    getOwner() {
        return this.owner;
    }
    
    /**
     * Set the owner of this territory
     * @param {Object|string} playerOrId - The player object or player ID
     */
    setOwner(playerOrId) {
        try {
            const playerId = typeof playerOrId === 'string' ? playerOrId : playerOrId?.id;
            const previousOwner = this.owner;
            const previousOwnerId = this.ownerId;
            
            // Remove this territory from previous owner's list
            if (this.owner) {
                const index = this.owner.territories.indexOf(this);
                if (index !== -1) {
                    this.owner.territories.splice(index, 1);
                }
            }
            
            // Set new owner
            if (typeof playerOrId === 'string') {
                this.ownerId = playerOrId;
                this.owner = null; // Will be resolved later
            } else {
                this.owner = playerOrId;
                this.ownerId = playerOrId?.id || null;
            }
            
            // Add to new owner's territories
            if (this.owner) {
                this.owner.territories.push(this);
            }
            
            // Update through state manager if game flow is available
            if (this.gameFlow && this.gameFlow.stateManager) {
                const territories = this.gameFlow.stateManager.gameState.territories.map(t => 
                    t.id === this.id ? { ...t, owner: this.ownerId } : t
                );
                
                this.gameFlow.stateManager.updateGameState({ territories });
                
                // Log the action
                this.gameFlow.stateManager.logPlayerAction(playerId, 'claim_territory', {
                    territoryId: this.id,
                    territoryType: this.type,
                    previousOwner: previousOwnerId
                });
            }
            
            // Emit event if event system is available
            if (this.eventSystem) {
                this.eventSystem.broadcastEvent('territory.claimed', {
                    territoryId: this.id,
                    newOwner: playerId,
                    previousOwner: previousOwnerId,
                    cycle: this.gameFlow?.cycleManager?.currentCycle
                });
            }
            
            return true;
        } catch (error) {
            this.errorHandler?.handleError(error, 'Territory.setOwner');
            return false;
        }
    }
    
    /**
     * Check if territory can be claimed by player
     */
    canBeClaimedBy(playerId) {
        if (!this.gameFlow) return this.owner === null;
        
        const currentPhase = this.gameFlow.cycleManager.currentPhase;
        const turnManager = this.gameFlow.turnManager;
        
        // Get the player object from the state manager
        const player = this.gameFlow.stateManager?.getPlayer(playerId);
        if (!player) {
            return false;
        }
        
        return this.owner === null && 
               this.ownerId === null &&
               currentPhase === 'territory_selection' &&
               turnManager.canPlayerAct(player, { type: 'claim_territory' });
    }
    
    /**
     * Place a construct on this territory
     * @param {Object} construct - The construct to place
     * @returns {boolean} Whether the placement was successful
     */
    placeConstruct(construct) {
        if (!this.owner || this.construct) {
            return false;
        }
        
        this.construct = construct;
        construct.territory = this;
        
        // Add to owner's constructs
        this.owner.constructs.push(construct);
        
        return true;
    }
    
    /**
     * Remove the construct from this territory
     * @returns {Object|null} The removed construct, or null if there wasn't one
     */
    removeConstruct() {
        if (!this.construct) {
            return null;
        }
        
        const construct = this.construct;
        this.construct = null;
        
        // Remove from owner's constructs
        if (this.owner) {
            const index = this.owner.constructs.indexOf(construct);
            if (index !== -1) {
                this.owner.constructs.splice(index, 1);
            }
        }
        
        return construct;
    }
    
    /**
     * Get a value that estimates the relative worth of this territory
     * @returns {number} A value representing the territory's worth
     */
    getWorth() {
        let worth = 100; // Base worth
        
        // Add worth based on resource modifiers
        for (const modifier of Object.values(this.baseModifiers)) {
            if (modifier > 0) {
                worth += modifier * 100;
            }
        }
        
        // Subtract worth for negative modifiers
        for (const modifier of Object.values(this.baseModifiers)) {
            if (modifier < 0) {
                worth += modifier * 50; // Less penalty for negatives
            }
        }
        
        return worth;
    }
    
    /**
     * Check if territory has specific improvement
     */
    hasImprovement(improvementType) {
        return this.improvements.some(imp => imp.type === improvementType);
    }
    
    /**
     * Calculate improvement bonuses
     */
    calculateImprovementBonus() {
        let bonus = 0;
        
        this.improvements.forEach(improvement => {
            if (improvement.isActive) {
                switch (improvement.type) {
                    case 'harmonic_anchor':
                        bonus += 0.5;
                        break;
                    case 'focus_pillar':
                        // This is handled separately for double production chance
                        break;
                }
            }
        });
        
        return bonus;
    }
    
    /**
     * Calculate magical interference
     */
    calculateInterference() {
        let interference = 0;
        
        // Check for wardstone protection
        const hasWardstone = this.hasImprovement('wardstone');
        const baseInterference = 0.1; // Base 10% interference
        
        if (hasWardstone) {
            interference = baseInterference * 0.5; // 50% reduction
        } else {
            interference = baseInterference;
        }
        
        // Add interference from neighboring territories
        for (const modifier of Object.values(this.interferenceModifiers)) {
            if (typeof modifier === 'number') {
                interference += modifier;
            }
        }
        
        return Math.max(0, Math.min(1, interference)); // Clamp between 0 and 1
    }
    
    /**
     * Get adjacent territories from a territory grid
     */
    getAdjacentTerritories(territoryGrid) {
        const adjacent = [];
        const directions = [
            {q: -1, r: 0}, {q: 1, r: 0},
            {q: 0, r: -1}, {q: 0, r: 1},
            {q: -1, r: 1}, {q: 1, r: -1}
        ];
        
        directions.forEach(dir => {
            const newQ = this.q + dir.q;
            const newR = this.r + dir.r;
            const territory = territoryGrid.getTerritoryAt(newQ, newR);
            if (territory) {
                adjacent.push(territory);
            }
        });
        
        return adjacent;
    }
    
    /**
     * Serialize territory for saving/network
     */
    serialize() {
        return {
            id: this.id,
            type: this.type,
            q: this.q,
            r: this.r,
            x: this.x,
            y: this.y,
            ownerId: this.ownerId,
            construct: this.construct?.serialize ? this.construct.serialize() : null,
            improvements: this.improvements.map(i => i.serialize ? i.serialize() : i),
            enchantmentLevel: this.enchantmentLevel,
            lastProductionCycle: this.lastProductionCycle,
            baseModifiers: this.baseModifiers,
            improvementModifiers: this.improvementModifiers
        };
    }
    
    /**
     * Restore territory from saved data
     */
    restoreFromData(data) {
        this.ownerId = data.ownerId;
        this.enchantmentLevel = data.enchantmentLevel || 0;
        this.lastProductionCycle = data.lastProductionCycle || 0;
        
        // Restore modifiers
        if (data.baseModifiers) {
            this.baseModifiers = data.baseModifiers;
        }
        if (data.improvementModifiers) {
            this.improvementModifiers = data.improvementModifiers;
        }
        
        // Note: construct and improvements will need to be restored externally
        // as they require proper object instantiation
    }
    
    /**
     * Get territory display info
     */
    getDisplayInfo() {
        return {
            id: this.id,
            type: this.type,
            typeName: this.getTypeName(),
            position: { q: this.q, r: this.r, x: this.x, y: this.y },
            owner: this.ownerId,
            hasConstruct: !!this.construct,
            constructType: this.construct?.type,
            improvements: this.improvements.map(i => i.type || i),
            production: this.calculateProductionSummary(),
            modifiers: this.baseModifiers
        };
    }
    
    /**
     * Get human-readable territory type name
     */
    getTypeName() {
        const names = {
            ancient_grove: 'Ancient Grove',
            crystalline_cave: 'Crystalline Cave',
            ruined_temple: 'Ruined Temple',
            mountain_peak: 'Mountain Peak',
            marshland: 'Marshland',
            volcanic_field: 'Volcanic Field'
        };
        return names[this.type] || 'Unknown Territory';
    }
    
    /**
     * Calculate production summary for all resources
     */
    calculateProductionSummary() {
        if (!this.construct) return null;
        
        const resourceType = this.construct.getResourceType ? 
            this.construct.getResourceType() : this.construct.resourceType;
        
        const amount = this.calculateProduction(resourceType);
        
        return {
            resourceType: resourceType,
            amount: amount,
            breakdown: {
                base: this.construct.getBaseProduction ? 
                    this.construct.getBaseProduction() : this.construct.baseProduction || 0,
                terrainModifier: this.baseModifiers[resourceType] || 1.0,
                constructLevel: this.construct.level || 1,
                improvementBonus: this.calculateImprovementBonus(),
                enchantmentBonus: this.enchantmentLevel * 0.1,
                interference: this.calculateInterference()
            }
        };
    }
    
    /**
     * Check if territory is eligible for improvement
     */
    canAddImprovement(improvementType) {
        // Check if already has this improvement
        if (this.hasImprovement(improvementType)) {
            return false;
        }
        
        // Check improvement-specific requirements
        switch (improvementType) {
            case 'purification_circle':
                // Can only be built on territories with negative modifiers
                return Object.values(this.baseModifiers).some(mod => mod < 1.0);
            default:
                return true;
        }
    }
    
    /**
     * Update territory state for new cycle
     */
    updateForNewCycle(currentCycle) {
        // Update production tracking
        if (this.construct && this.ownerId) {
            this.lastProductionCycle = currentCycle;
        }
        
        // Update improvements
        this.improvements.forEach(improvement => {
            if (improvement.updateForNewCycle) {
                improvement.updateForNewCycle(currentCycle);
            }
        });
    }
}