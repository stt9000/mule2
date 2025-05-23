/**
 * ConstructManager
 * Manages the lifecycle of all constructs in the game
 */
import { CONSTRUCT_DEFINITIONS } from '../config/gameConfig.js';
import Construct from './Construct.js';

export default class ConstructManager {
    constructor(game) {
        this.game = game;
        this.constructs = new Map(); // constructId -> Construct
        this.installationQueue = [];
        this.productionCalculator = null; // Will be set by ResourceProductionCalculator
        
        // Helper method for getting players
        this.getPlayer = (playerId) => {
            let player = null;
            
            if (this.game.players && this.game.players instanceof Map) {
                player = this.game.players.get(playerId);
            } else if (this.game.stateManager) {
                const players = this.game.stateManager.gameState.players;
                player = players.find(p => p.id === playerId);
            } else if (this.game.turnManager) {
                player = this.game.turnManager.players.find(p => p.id === playerId);
            }
            
            // If player exists but doesn't have required methods, add them
            if (player && !player.canAfford) {
                player.canAfford = function(cost) {
                    for (const [type, amount] of Object.entries(cost)) {
                        if ((this.resources && this.resources[type] || 0) < amount) {
                            return false;
                        }
                    }
                    return true;
                };
            }
            
            if (player && !player.deductResources) {
                player.deductResources = function(cost) {
                    if (!this.canAfford(cost)) return false;
                    for (const [type, amount] of Object.entries(cost)) {
                        if (this.resources && this.resources[type] !== undefined) {
                            this.resources[type] -= amount;
                        }
                    }
                    return true;
                };
            }
            
            if (player && !player.inventory) {
                player.inventory = { constructs: [] };
            }
            
            return player;
        };
    }

    /**
     * Initialize the manager with game references
     */
    initialize(productionCalculator) {
        this.productionCalculator = productionCalculator;
    }

    /**
     * Purchase a construct for a player
     * @param {string} playerId - The player's ID
     * @param {string} constructType - The type of construct to purchase
     * @returns {Construct} The newly created construct
     */
    purchaseConstruct(playerId, constructType) {
        const player = this.getPlayer(playerId);
        const constructDef = CONSTRUCT_DEFINITIONS[constructType];
        
        if (!constructDef) {
            throw new Error(`Invalid construct type: ${constructType}`);
        }

        // Check if player can afford the construct
        const cost = this.getConstructCost(constructType, player);
        if (!player.canAfford(cost)) {
            throw new Error('Insufficient resources');
        }

        // Deduct resources
        player.deductResources(cost);

        // Create the construct
        const construct = new Construct({
            type: constructType,
            owner: player,
            level: 1,
            status: 'inventory'
        });

        // Add to player's inventory
        if (!player.inventory) {
            player.inventory = { constructs: [] };
        }
        player.inventory.constructs.push(construct);

        // Track in manager
        this.constructs.set(construct.id, construct);

        // Emit event
        if (this.game.events) {
            this.game.events.emit('construct-purchased', {
                player: player,
                construct: construct,
                cost: cost
            });
        }

        return construct;
    }

    /**
     * Get the cost of a construct, potentially with modifiers
     * @param {string} constructType - The type of construct
     * @param {Object} player - The player purchasing
     * @returns {Object} Cost object with resource amounts
     */
    getConstructCost(constructType, player) {
        const baseCost = { ...CONSTRUCT_DEFINITIONS[constructType].baseCost };
        
        // Apply any player modifiers or discounts
        // For now, just return base cost
        return baseCost;
    }

    /**
     * Initiate installation of a construct on a territory
     * @param {string} constructId - The construct's ID
     * @param {string} territoryId - The territory's ID
     * @param {string} playerId - The player's ID
     * @returns {Object} Installation object
     */
    initiateInstallation(constructId, territoryId, playerId) {
        const construct = this.constructs.get(constructId);
        const territory = this.game.territoryGrid ? 
            this.game.territoryGrid.getTerritory(territoryId) :
            this.game.gameFlowController?.territoryGrid?.getTerritory(territoryId);
        const player = this.getPlayer(playerId);

        // Validations
        if (!construct) {
            throw new Error('Construct not found');
        }

        if (!territory) {
            throw new Error('Territory not found');
        }

        if (territory.ownerId !== playerId) {
            throw new Error('Cannot place construct on unowned territory');
        }

        if (territory.construct) {
            throw new Error('Territory already has a construct');
        }

        if (construct.owner.id !== playerId) {
            throw new Error('Cannot place another player\'s construct');
        }

        // Update construct status
        construct.status = 'installing';

        // Calculate installation time
        const installTime = this.calculateInstallTime(construct, territory);

        // Create installation record
        const installation = {
            construct: construct,
            territory: territory,
            startTime: Date.now(),
            duration: installTime,
            playerId: playerId
        };

        this.installationQueue.push(installation);

        // Remove from player inventory
        const inventoryIndex = player.inventory.constructs.indexOf(construct);
        if (inventoryIndex > -1) {
            player.inventory.constructs.splice(inventoryIndex, 1);
        }

        return installation;
    }

    /**
     * Calculate installation time based on construct and territory
     * @param {Construct} construct - The construct being installed
     * @param {Territory} territory - The target territory
     * @returns {number} Installation time in seconds
     */
    calculateInstallTime(construct, territory) {
        const def = CONSTRUCT_DEFINITIONS[construct.type];
        const min = def.installTime.min;
        const max = def.installTime.max;
        
        // Random time between min and max
        return min + Math.random() * (max - min);
    }

    /**
     * Process an installation and determine success/failure
     * @param {Object} installation - The installation to process
     * @returns {Object} Result object with success status and details
     */
    processInstallation(installation) {
        // Roll dice (1-6)
        const roll = Math.floor(Math.random() * 6) + 1;
        const result = this.resolveInstallationRoll(roll, installation);

        if (result.success) {
            // Successfully installed
            installation.construct.territory = installation.territory;
            installation.territory.construct = installation.construct;
            installation.construct.status = 'active';
            installation.construct.efficiency = result.efficiency;
        } else {
            // Failed installation
            installation.construct.status = 'damaged';
            installation.construct.efficiency = 0;
        }

        // Remove from installation queue
        const queueIndex = this.installationQueue.indexOf(installation);
        if (queueIndex > -1) {
            this.installationQueue.splice(queueIndex, 1);
        }

        // Emit event
        if (this.game.events) {
            this.game.events.emit('construct-installed', {
                installation: installation,
                result: result
            });
        }

        return result;
    }

    /**
     * Resolve installation roll outcome
     * @param {number} roll - Dice roll (1-6)
     * @param {Object} installation - The installation
     * @returns {Object} Result with success, efficiency, and message
     */
    resolveInstallationRoll(roll, installation) {
        switch (roll) {
            case 6:
                return {
                    success: true,
                    efficiency: 1.1, // 110% efficiency
                    rollValue: roll,
                    outcome: 'perfect',
                    message: 'Perfect installation! The construct resonates with exceptional power.',
                    bonus: '+10% production efficiency'
                };
            case 4:
            case 5:
                return {
                    success: true,
                    efficiency: 1.0, // 100% efficiency
                    rollValue: roll,
                    outcome: 'good',
                    message: 'Successful installation! The construct is operating normally.'
                };
            case 3:
                return {
                    success: true,
                    efficiency: 0.75, // 75% efficiency
                    rollValue: roll,
                    outcome: 'poor',
                    message: 'Unstable binding. The construct operates at reduced efficiency.',
                    penalty: '-25% production efficiency'
                };
            case 2:
                return {
                    success: false,
                    efficiency: 0,
                    rollValue: roll,
                    outcome: 'backfire',
                    message: 'Magical backfire! The binding ritual failed and damaged the construct.',
                    penalty: 'Construct damaged, requires repair'
                };
            case 1:
                return {
                    success: false,
                    efficiency: 0,
                    rollValue: roll,
                    outcome: 'critical_failure',
                    message: 'Critical failure! The construct was severely damaged during installation.',
                    penalty: 'Construct heavily damaged, expensive repair needed'
                };
            default:
                return {
                    success: true,
                    efficiency: 1.0,
                    rollValue: roll,
                    outcome: 'good',
                    message: 'Installation completed.'
                };
        }
    }

    /**
     * Calculate production for a construct
     * @param {Construct} construct - The construct to calculate for
     * @returns {number} Production amount
     */
    calculateProduction(construct) {
        if (construct.status !== 'active') return 0;
        
        if (this.productionCalculator) {
            return this.productionCalculator.calculateConstructProduction(construct);
        }

        // Fallback calculation if no production calculator
        const def = CONSTRUCT_DEFINITIONS[construct.type];
        const baseProduction = (def.baseProduction.min + def.baseProduction.max) / 2;
        const levelMultiplier = construct.getProductionMultiplier();
        
        return Math.floor(baseProduction * levelMultiplier * construct.efficiency);
    }

    /**
     * Get all constructs owned by a player
     * @param {string} playerId - The player's ID
     * @returns {Array} Array of constructs
     */
    getPlayerConstructs(playerId) {
        const constructs = [];
        
        this.constructs.forEach(construct => {
            if (construct.owner && construct.owner.id === playerId) {
                constructs.push(construct);
            }
        });

        return constructs;
    }

    /**
     * Get all active constructs in the game
     * @returns {Array} Array of active constructs
     */
    getActiveConstructs() {
        const constructs = [];
        
        this.constructs.forEach(construct => {
            if (construct.status === 'active') {
                constructs.push(construct);
            }
        });

        return constructs;
    }

    /**
     * Calculate success rate for placing a construct on a territory
     * @param {Construct} construct - The construct to place
     * @param {Territory} territory - The target territory
     * @param {Object} player - The player placing the construct
     * @returns {number} Success rate percentage (0-100)
     */
    calculateSuccessRate(construct, territory, player) {
        let baseRate = 83; // Base 83% success rate
        
        const def = CONSTRUCT_DEFINITIONS[construct.type];
        
        // Terrain bonus: +10% if construct matches best terrain
        if (def.bestTerrain.includes(territory.type)) {
            baseRate += 10;
        }
        
        // Player skill bonus (placeholder for future features)
        // baseRate += player.getSkillBonus();
        
        // Time pressure penalty (placeholder for future features)
        // baseRate -= this.game.getTimePressurePenalty();
        
        // Cap between 50% and 95%
        return Math.min(95, Math.max(50, baseRate));
    }

    /**
     * Update all constructs (called each game tick)
     */
    update() {
        // Process any ongoing installations
        const now = Date.now();
        const completedInstallations = [];

        this.installationQueue.forEach(installation => {
            const elapsed = now - installation.startTime;
            if (elapsed >= installation.duration * 1000) {
                completedInstallations.push(installation);
            }
        });

        // Process completed installations
        completedInstallations.forEach(installation => {
            this.processInstallation(installation);
        });
    }

    /**
     * Serialize construct manager state
     * @returns {Object} Serialized state
     */
    serialize() {
        const constructsArray = [];
        this.constructs.forEach(construct => {
            constructsArray.push({
                id: construct.id,
                type: construct.type,
                level: construct.level,
                ownerId: construct.owner ? construct.owner.id : null,
                territoryId: construct.territory ? construct.territory.id : null,
                efficiency: construct.efficiency,
                status: construct.status,
                productionHistory: construct.productionHistory
            });
        });

        return {
            constructs: constructsArray,
            installationQueue: this.installationQueue.map(inst => ({
                constructId: inst.construct.id,
                territoryId: inst.territory.id,
                playerId: inst.playerId,
                startTime: inst.startTime,
                duration: inst.duration
            }))
        };
    }

    /**
     * Deserialize construct manager state
     * @param {Object} data - Serialized data
     * @param {Game} game - Game instance
     */
    deserialize(data, game) {
        this.constructs.clear();
        this.installationQueue = [];

        // Recreate constructs
        data.constructs.forEach(constructData => {
            const owner = this.getPlayer(constructData.ownerId);
            const construct = new Construct({
                id: constructData.id,
                type: constructData.type,
                level: constructData.level,
                owner: owner,
                status: constructData.status
            });

            construct.efficiency = constructData.efficiency;
            construct.productionHistory = constructData.productionHistory;

            if (constructData.territoryId) {
                const territory = game.territoryGrid ? 
                    game.territoryGrid.getTerritory(constructData.territoryId) :
                    game.gameFlowController?.territoryGrid?.getTerritory(constructData.territoryId);
                if (territory) {
                    construct.territory = territory;
                    territory.construct = construct;
                }
            }

            this.constructs.set(construct.id, construct);
        });

        // Recreate installation queue
        data.installationQueue.forEach(instData => {
            const construct = this.constructs.get(instData.constructId);
            const territory = game.territoryGrid ? 
                game.territoryGrid.getTerritory(instData.territoryId) :
                game.gameFlowController?.territoryGrid?.getTerritory(instData.territoryId);
            
            if (construct && territory) {
                this.installationQueue.push({
                    construct: construct,
                    territory: territory,
                    playerId: instData.playerId,
                    startTime: instData.startTime,
                    duration: instData.duration
                });
            }
        });
    }
}