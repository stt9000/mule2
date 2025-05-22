/**
 * Territory Model
 * Represents a magical territory (ley line nexus) in the game world
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
        this.construct = null;
        this.improvements = [];
        
        // Production modifiers
        this.baseModifiers = {}; // From territory type
        this.improvementModifiers = {}; // From improvements
        this.interferenceModifiers = {}; // From neighboring territories
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
        const constructResourceType = this.construct.getResourceType();
        if (resourceType !== constructResourceType) {
            return 0;
        }
        
        // Base production from construct
        let production = this.construct.getBaseProduction();
        
        // Apply territory type modifiers
        if (this.baseModifiers[resourceType]) {
            production += production * this.baseModifiers[resourceType];
        }
        
        // Apply construct level multiplier
        production *= this.construct.getProductionMultiplier();
        
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
     * @param {Object} player - The player who now owns this territory
     */
    setOwner(player) {
        // Remove this territory from previous owner's list
        if (this.owner) {
            const index = this.owner.territories.indexOf(this);
            if (index !== -1) {
                this.owner.territories.splice(index, 1);
            }
        }
        
        this.owner = player;
        
        // Add to new owner's territories
        if (player) {
            player.territories.push(this);
        }
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
}