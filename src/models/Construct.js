/**
 * Construct Model
 * Represents a magical construct used for resource production
 */
export default class Construct {
    /**
     * Create a new magical construct
     * @param {Object} config - Construct configuration
     * @param {string} config.id - Unique identifier
     * @param {string} config.type - Type of construct from CONSTRUCT_TYPES
     * @param {number} config.level - Construct level (1-3)
     * @param {Object} config.owner - Player who owns this construct
     */
    constructor(config) {
        this.id = config.id || `construct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.type = config.type;
        this.level = config.level || 1;
        this.owner = config.owner || null;
        this.territory = null; // Will be set when placed
        this.efficiency = 1.0; // Can be reduced by events or damage
        this.status = config.status || 'inventory'; // inventory, transporting, installing, active, damaged
        this.productionHistory = [];
        
        // Visual components
        this.sprite = null;
        this.particles = null;
        
        // Special abilities unlocked at level 3
        this.specialAbility = null;
        if (this.level === 3) {
            this.initializeSpecialAbility();
        }
    }
    
    /**
     * Get the resource type this construct produces
     * @returns {string} Resource type
     */
    getResourceType() {
        switch (this.type) {
            case 'mana_conduit': return 'mana';
            case 'vitality_well': return 'vitality';
            case 'arcanum_extractor': return 'arcanum';
            case 'aether_resonator': return 'aether';
            default: return 'mana';
        }
    }
    
    /**
     * Get the base production amount for this construct
     * @returns {number} Base production amount
     */
    getBaseProduction() {
        // Base production values by construct type
        const baseProduction = {
            mana_conduit: 15,
            vitality_well: 12,
            arcanum_extractor: 10,
            aether_resonator: 8
        };
        
        return baseProduction[this.type] || 10;
    }
    
    /**
     * Get the production multiplier based on construct level
     * @returns {number} Production multiplier
     */
    getProductionMultiplier() {
        switch (this.level) {
            case 1: return 1.0;   // Basic
            case 2: return 1.5;   // Enhanced (+50%)
            case 3: return 2.0;   // Masterwork (+100%)
            default: return 1.0;
        }
    }
    
    /**
     * Initialize special ability based on construct type
     */
    initializeSpecialAbility() {
        switch (this.type) {
            case 'mana_conduit':
                this.specialAbility = {
                    name: 'Mana Resonance',
                    description: 'Adjacent mana conduits gain a 20% production bonus',
                    applyEffect: (territory) => {
                        // Check for adjacent mana conduits
                    }
                };
                break;
                
            case 'vitality_well':
                this.specialAbility = {
                    name: 'Life Bloom',
                    description: 'Has a 10% chance each cycle to generate 1 vitality for all players',
                    applyEffect: (gameState) => {
                        // Apply vitality to all players
                    }
                };
                break;
                
            case 'arcanum_extractor':
                this.specialAbility = {
                    name: 'Arcane Insight',
                    description: 'Provides a 15% discount on all construct upgrades',
                    applyEffect: (player) => {
                        // Apply discount to player
                    }
                };
                break;
                
            case 'aether_resonator':
                this.specialAbility = {
                    name: 'Aether Sense',
                    description: 'Reveals aether deposits in adjacent territories',
                    applyEffect: (territories) => {
                        // Reveal aether in adjacent territories
                    }
                };
                break;
        }
    }
    
    /**
     * Upgrade this construct to the next level
     * @param {Object} costs - Object containing the costs by resource type
     * @param {Object} player - The player performing the upgrade
     * @returns {boolean} Whether the upgrade was successful
     */
    upgrade(costs, player) {
        if (this.level >= 3) {
            return false; // Already at max level
        }
        
        // Check if player has enough resources
        for (const [resource, amount] of Object.entries(costs)) {
            if (player.resources[resource] < amount) {
                return false;
            }
        }
        
        // Deduct costs
        for (const [resource, amount] of Object.entries(costs)) {
            player.resources[resource] -= amount;
        }
        
        // Increase level
        this.level++;
        
        // Initialize special ability at level 3
        if (this.level === 3) {
            this.initializeSpecialAbility();
        }
        
        return true;
    }
    
    /**
     * Get the costs for upgrading this construct to the next level
     * @returns {Object|null} Object with costs by resource, or null if at max level
     */
    getUpgradeCosts() {
        if (this.level >= 3) {
            return null;
        }
        
        const baseCosts = {
            mana_conduit: { arcanum: 150, mana: 100 },
            vitality_well: { arcanum: 150, vitality: 100 },
            arcanum_extractor: { arcanum: 200, mana: 150 },
            aether_resonator: { arcanum: 300, mana: 200, vitality: 100 }
        };
        
        const costs = baseCosts[this.type] || { arcanum: 200 };
        
        // Multiply costs based on target level
        const multiplier = this.level === 1 ? 1.5 : 2.5; // Level 1->2: 150%, Level 2->3: 250%
        
        const upgradeCosts = {};
        for (const [resource, amount] of Object.entries(costs)) {
            upgradeCosts[resource] = Math.floor(amount * multiplier);
        }
        
        return upgradeCosts;
    }
    
    /**
     * Apply damage or instability to this construct
     * @param {number} amount - Percentage efficiency reduction (0-100)
     * @returns {number} The new efficiency value
     */
    applyDamage(amount) {
        this.efficiency = Math.max(0, this.efficiency - amount / 100);
        return this.efficiency;
    }
    
    /**
     * Repair this construct to full efficiency
     * @param {Object} costs - Object containing repair costs by resource
     * @param {Object} player - The player performing the repair
     * @returns {boolean} Whether the repair was successful
     */
    repair(costs, player) {
        if (this.efficiency >= 1.0) {
            return false; // Already at full efficiency
        }
        
        // Check if player has enough resources
        for (const [resource, amount] of Object.entries(costs)) {
            if (player.resources[resource] < amount) {
                return false;
            }
        }
        
        // Deduct costs
        for (const [resource, amount] of Object.entries(costs)) {
            player.resources[resource] -= amount;
        }
        
        // Restore efficiency
        this.efficiency = 1.0;
        
        return true;
    }
}