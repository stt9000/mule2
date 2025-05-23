export default class ResourceStorage {
    constructor() {
        this.baseCapacity = {
            mana: 100,
            vitality: 100,
            arcanum: 100,
            aether: 50
        };
        
        // Player storage upgrades tracked separately
        this.playerUpgrades = new Map();
        
        // Overflow conversion rate (excess resources to gold)
        this.overflowConversionRate = 0.5; // 50% value when converting overflow
    }
    
    initializePlayer(playerId) {
        if (!this.playerUpgrades.has(playerId)) {
            this.playerUpgrades.set(playerId, {
                mana: 0,
                vitality: 0,
                arcanum: 0,
                aether: 0
            });
        }
    }
    
    getStorageCapacity(playerId, resourceType) {
        this.initializePlayer(playerId);
        const upgrades = this.playerUpgrades.get(playerId);
        const upgradeLevel = upgrades[resourceType] || 0;
        
        // Each upgrade level adds 50% more capacity
        return this.baseCapacity[resourceType] * (1 + upgradeLevel * 0.5);
    }
    
    getAllCapacities(playerId) {
        const capacities = {};
        Object.keys(this.baseCapacity).forEach(resource => {
            capacities[resource] = this.getStorageCapacity(playerId, resource);
        });
        return capacities;
    }
    
    addResources(player, resources) {
        const results = {
            added: {},
            overflow: {},
            goldFromOverflow: 0
        };
        
        Object.entries(resources).forEach(([resourceType, amount]) => {
            if (amount <= 0) return;
            
            const currentAmount = player.resources[resourceType] || 0;
            const capacity = this.getStorageCapacity(player.id, resourceType);
            const availableSpace = capacity - currentAmount;
            
            if (availableSpace >= amount) {
                // All resources can be stored
                player.resources[resourceType] = currentAmount + amount;
                results.added[resourceType] = amount;
            } else {
                // Some overflow
                const storedAmount = Math.max(0, availableSpace);
                const overflowAmount = amount - storedAmount;
                
                player.resources[resourceType] = capacity;
                results.added[resourceType] = storedAmount;
                results.overflow[resourceType] = overflowAmount;
                
                // Convert overflow to gold
                const basePrice = this.getBasePrice(resourceType);
                const goldValue = Math.floor(overflowAmount * basePrice * this.overflowConversionRate);
                results.goldFromOverflow += goldValue;
                player.gold += goldValue;
            }
        });
        
        return results;
    }
    
    upgradeStorage(player, resourceType) {
        this.initializePlayer(player.id);
        const upgrades = this.playerUpgrades.get(player.id);
        const currentLevel = upgrades[resourceType] || 0;
        
        // Calculate upgrade cost
        const baseCost = 500;
        const upgradeCost = baseCost * Math.pow(2, currentLevel); // Doubles each level
        
        if (player.gold < upgradeCost) {
            return {
                success: false,
                reason: 'Insufficient gold',
                required: upgradeCost,
                available: player.gold
            };
        }
        
        // Deduct cost and upgrade
        player.gold -= upgradeCost;
        upgrades[resourceType] = currentLevel + 1;
        
        const newCapacity = this.getStorageCapacity(player.id, resourceType);
        
        return {
            success: true,
            newLevel: currentLevel + 1,
            newCapacity: newCapacity,
            cost: upgradeCost
        };
    }
    
    canStore(player, resources) {
        const capacities = this.getAllCapacities(player.id);
        const issues = [];
        
        Object.entries(resources).forEach(([resourceType, amount]) => {
            if (amount <= 0) return;
            
            const currentAmount = player.resources[resourceType] || 0;
            const capacity = capacities[resourceType];
            const totalAfterAdding = currentAmount + amount;
            
            if (totalAfterAdding > capacity) {
                issues.push({
                    resource: resourceType,
                    overflow: totalAfterAdding - capacity,
                    capacity: capacity,
                    current: currentAmount
                });
            }
        });
        
        return {
            canStore: issues.length === 0,
            issues: issues
        };
    }
    
    getBasePrice(resourceType) {
        const basePrices = {
            mana: 20,
            vitality: 25,
            arcanum: 35,
            aether: 100
        };
        
        return basePrices[resourceType] || 10;
    }
    
    getStorageInfo(player) {
        const info = {
            resources: {},
            upgrades: this.playerUpgrades.get(player.id) || {}
        };
        
        Object.keys(this.baseCapacity).forEach(resource => {
            const current = player.resources[resource] || 0;
            const capacity = this.getStorageCapacity(player.id, resource);
            
            info.resources[resource] = {
                current: current,
                capacity: capacity,
                percentage: Math.round((current / capacity) * 100),
                upgradeLevel: info.upgrades[resource] || 0
            };
        });
        
        return info;
    }
}