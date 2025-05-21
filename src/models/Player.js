/**
 * Player Model
 * Represents a wizard player in the game
 */
export default class Player {
    /**
     * Create a new player
     * @param {Object} config - Player configuration
     * @param {number} config.id - Unique identifier
     * @param {string} config.name - Player name
     * @param {number} config.color - Player color as hex value
     * @param {number} config.gold - Starting gold amount
     * @param {Object} config.resources - Starting resources by type
     * @param {string} config.specialization - Player specialization
     */
    constructor(config) {
        this.id = config.id;
        this.name = config.name || `Player ${this.id}`;
        this.color = config.color || 0xFFFFFF;
        this.gold = config.gold || 1000;
        
        // Resources
        this.resources = config.resources || {
            mana: 0,
            vitality: 0,
            arcanum: 0,
            aether: 0
        };
        
        // Owned properties
        this.territories = [];
        this.constructs = [];
        this.improvements = [];
        
        // Player attributes
        this.specialization = config.specialization || null;
        this.actionTime = 60; // Base action time in seconds
        this.specializationBonuses = {};
        
        // Initialize specialization bonuses
        if (this.specialization) {
            this.initializeSpecialization();
        }
        
        // Market transaction history
        this.transactions = [];
        
        // Game performance tracking
        this.score = 0;
        this.netWorth = this.calculateNetWorth();
        this.productionHistory = {};
    }
    
    /**
     * Initialize specialization bonuses
     */
    initializeSpecialization() {
        switch (this.specialization) {
            case 'elementalist': // Mana expert
                this.specializationBonuses = {
                    manaProduction: 0.2, // +20% mana production
                    manaDecay: -0.1     // -10% mana decay
                };
                break;
                
            case 'vitalist': // Life energy expert
                this.specializationBonuses = {
                    vitalityProduction: 0.2, // +20% vitality production
                    vitalityDecay: -0.15,    // -15% vitality decay
                    actionTime: 0.1          // +10% action time
                };
                break;
                
            case 'artificer': // Arcanum specialist
                this.specializationBonuses = {
                    arcanumProduction: 0.15, // +15% arcanum production
                    constructCost: -0.1,     // -10% construct cost
                    constructPlacement: 0.2  // +20% placement success chance
                };
                break;
                
            case 'aethermancer': // Rare resource detector
                this.specializationBonuses = {
                    aetherProduction: 0.25,  // +25% aether production
                    aetherDetection: true,   // Can detect aether deposits
                    marketInsight: true      // Gain market prediction ability
                };
                break;
        }
    }
    
    /**
     * Add resources to the player's inventory
     * @param {Object} resources - Resource amounts by type
     */
    addResources(resources) {
        for (const [type, amount] of Object.entries(resources)) {
            if (this.resources[type] !== undefined) {
                this.resources[type] += amount;
            }
        }
    }
    
    /**
     * Check if player has enough resources
     * @param {Object} resources - Resource amounts by type
     * @returns {boolean} Whether the player has enough resources
     */
    hasEnoughResources(resources) {
        // Check if player has enough of each resource
        for (const [type, amount] of Object.entries(resources)) {
            if ((this.resources[type] || 0) < amount) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Remove resources from player's inventory
     * @param {Object} resources - Resource amounts by type
     * @returns {boolean} Whether the player had enough resources
     */
    removeResources(resources) {
        // Check if player has enough resources
        if (!this.hasEnoughResources(resources)) {
            return false;
        }
        
        // Remove resources
        for (const [type, amount] of Object.entries(resources)) {
            this.resources[type] -= amount;
        }
        
        return true;
    }
    
    /**
     * Apply decay to player's resources
     * @param {Object} decayRates - Decay rates by resource type
     */
    applyResourceDecay(decayRates) {
        for (const [type, rate] of Object.entries(decayRates)) {
            if (this.resources[type] !== undefined) {
                // Apply specialization bonuses
                let adjustedRate = rate;
                const bonusKey = `${type}Decay`;
                if (this.specializationBonuses[bonusKey]) {
                    adjustedRate += this.specializationBonuses[bonusKey];
                }
                
                // Ensure rate is not negative
                adjustedRate = Math.max(0, adjustedRate);
                
                // Apply decay
                const decayAmount = Math.floor(this.resources[type] * adjustedRate);
                this.resources[type] -= decayAmount;
            }
        }
    }
    
    /**
     * Calculate the player's total net worth
     * @returns {number} The player's net worth
     */
    calculateNetWorth() {
        let worth = this.gold;
        
        // Add resource values
        for (const [type, amount] of Object.entries(this.resources)) {
            // Use a default value if current market price is not available
            const resourceValue = amount * 25; // Default average value
            worth += resourceValue;
        }
        
        // Add territory values
        worth += this.territories.length * 500;
        
        // Add construct values
        for (const construct of this.constructs) {
            worth += 200 * construct.level;
        }
        
        // Add improvement values
        worth += this.improvements.length * 300;
        
        this.netWorth = worth;
        return worth;
    }
    
    /**
     * Calculate the player's score according to the game formula
     * @returns {number} The player's score
     */
    calculateScore() {
        this.score = 
            this.gold * 1 +
            this.territories.length * 50 +
            this.constructs.length * 75 +
            // Sum of construct levels * 25
            this.constructs.reduce((sum, construct) => sum + construct.level * 25, 0) +
            // Sum of resources * 2
            (this.resources.mana + 
             this.resources.vitality + 
             this.resources.arcanum + 
             this.resources.aether) * 2;
             
        return this.score;
    }
    
    /**
     * Process a market transaction
     * @param {string} type - Transaction type ('buy' or 'sell')
     * @param {string} resourceType - Type of resource
     * @param {number} amount - Amount of resource
     * @param {number} price - Price per unit
     * @param {number} cycle - Game cycle when transaction occurred
     * @returns {boolean} Whether the transaction was successful
     */
    processTransaction(type, resourceType, amount, price, cycle) {
        // Check if this is a valid resource type
        if (this.resources[resourceType] === undefined) {
            return false;
        }
        
        const total = amount * price;
        
        if (type === 'buy') {
            // Check if player has enough gold
            if (this.gold < total) {
                return false;
            }
            
            // Update resources and gold
            this.resources[resourceType] += amount;
            this.gold -= total;
        } else if (type === 'sell') {
            // Check if player has enough resources
            if (this.resources[resourceType] < amount) {
                return false;
            }
            
            // Update resources and gold
            this.resources[resourceType] -= amount;
            this.gold += total;
        } else {
            return false;
        }
        
        // Record transaction
        this.transactions.push({
            type,
            resourceType,
            amount,
            price,
            total,
            cycle
        });
        
        return true;
    }
    
    /**
     * Get the player's current action time based on vitality
     * @param {number} requiredVitality - Vitality required for full action time
     * @returns {number} Action time in seconds
     */
    getCurrentActionTime(requiredVitality) {
        // Base action time
        let time = this.actionTime;
        
        // Apply specialization bonus
        if (this.specializationBonuses.actionTime) {
            time *= (1 + this.specializationBonuses.actionTime);
        }
        
        // Reduce based on vitality shortage
        if (this.resources.vitality < requiredVitality) {
            const ratio = this.resources.vitality / requiredVitality;
            time *= Math.max(0.3, ratio); // Minimum 30% of action time
        }
        
        return time;
    }
}