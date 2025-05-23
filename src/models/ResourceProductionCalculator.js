export default class ResourceProductionCalculator {
    constructor(gameFlowController) {
        this.gameFlow = gameFlowController;
        
        // Base production values
        this.baseProduction = {
            mana: 15,
            vitality: 12,
            arcanum: 10,
            aether: 5
        };
        
        // Territory type modifiers
        this.territoryModifiers = {
            ancient_grove: { vitality: 1.25, arcanum: 0.9 },
            crystalline_cave: { mana: 1.3, vitality: 0.95 },
            ruined_temple: { arcanum: 1.2, mana: 1.1 },
            mountain_peak: { mana: 1.15, vitality: 1.15, arcanum: 1.15 },
            marshland: { vitality: 1.35, mana: 0.85 },
            volcanic_field: { arcanum: 1.25, aether: 1.1 }
        };
        
        // Construct-territory synergy bonus
        this.synergyBonus = 1.25;
        
        // Interference penalty per adjacent enemy construct
        this.interferencePenalty = 0.05;
        
        // Bonus per construct level
        this.levelBonus = 0.5; // +50% per level above 1
    }
    
    calculateTerritoryProduction(territory) {
        if (!territory.construct || !territory.construct.type) {
            return null;
        }
        
        const construct = territory.construct;
        const resourceType = this.getResourceTypeFromConstruct(construct.type);
        
        if (!resourceType) {
            return null;
        }
        
        // Start with base production
        let production = this.baseProduction[resourceType];
        
        // Apply construct level bonus
        const level = construct.level || 1;
        production *= (1 + (level - 1) * this.levelBonus);
        
        // Apply territory type modifier
        const terrainModifiers = this.territoryModifiers[territory.terrainType] || {};
        const terrainMod = terrainModifiers[resourceType] || 1.0;
        production *= terrainMod;
        
        // Apply synergy bonus if construct matches optimal terrain
        if (this.hasSynergy(territory.terrainType, construct.type)) {
            production *= this.synergyBonus;
        }
        
        // Apply interference from adjacent enemy territories
        const interferenceCount = this.calculateInterference(territory);
        production *= (1 - interferenceCount * this.interferencePenalty);
        
        // Apply any active events or modifiers
        production = this.applyEventModifiers(production, resourceType);
        
        return {
            territoryId: territory.id,
            playerId: territory.ownerId,
            constructType: construct.type,
            resource: resourceType,
            amount: Math.floor(production),
            modifiers: {
                base: this.baseProduction[resourceType],
                level: level,
                terrain: terrainMod,
                synergy: this.hasSynergy(territory.terrainType, construct.type),
                interference: interferenceCount
            }
        };
    }
    
    calculateCycleProduction() {
        const productionResults = [];
        const playerTotals = new Map();
        
        // Get players from game or state manager
        const players = this.gameFlow?.game?.players || 
                       this.gameFlow?.stateManager?.gameState?.players || 
                       [];
        
        // Initialize player totals
        players.forEach(player => {
            playerTotals.set(player.id, {
                playerId: player.id,
                playerName: player.name,
                resources: {
                    mana: 0,
                    vitality: 0,
                    arcanum: 0,
                    aether: 0
                },
                territories: []
            });
        });
        
        // Get territories from territory grid
        const territories = this.gameFlow?.territoryGrid?.territories || 
                          this.gameFlow?.game?.territories || 
                          [];
        
        console.log(`ResourceProductionCalculator: Found ${territories.length} territories`);
        const territoriesWithOwners = territories.filter(t => t.ownerId);
        const territoriesWithConstructs = territories.filter(t => t.ownerId && t.construct);
        console.log(`- Territories with owners: ${territoriesWithOwners.length}`);
        console.log(`- Territories with constructs: ${territoriesWithConstructs.length}`);
        
        // Calculate production for each territory
        territories.forEach(territory => {
            if (territory.ownerId && territory.construct) {
                const production = this.calculateTerritoryProduction(territory);
                
                if (production) {
                    productionResults.push(production);
                    
                    // Add to player totals
                    const playerTotal = playerTotals.get(production.playerId);
                    if (playerTotal) {
                        playerTotal.resources[production.resource] += production.amount;
                        playerTotal.territories.push({
                            territoryId: territory.id,
                            terrainType: territory.terrainType,
                            resource: production.resource,
                            amount: production.amount
                        });
                    }
                }
            }
        });
        
        return {
            individualProduction: productionResults,
            playerTotals: Array.from(playerTotals.values()),
            cycleNumber: this.gameFlow?.cycleManager?.currentCycle || 
                        this.gameFlow?.game?.currentCycle || 
                        1
        };
    }
    
    getResourceTypeFromConstruct(constructType) {
        const resourceMap = {
            'mana_conduit': 'mana',
            'vitality_well': 'vitality',
            'arcanum_extractor': 'arcanum',
            'aether_resonator': 'aether'
        };
        
        return resourceMap[constructType] || null;
    }
    
    hasSynergy(terrainType, constructType) {
        const synergies = {
            'crystalline_cave': ['mana_conduit'],
            'ancient_grove': ['vitality_well'],
            'ruined_temple': ['arcanum_extractor'],
            'volcanic_field': ['aether_resonator', 'arcanum_extractor'],
            'mountain_peak': ['mana_conduit', 'arcanum_extractor'],
            'marshland': ['vitality_well']
        };
        
        const terrainSynergies = synergies[terrainType] || [];
        return terrainSynergies.includes(constructType);
    }
    
    calculateInterference(territory) {
        let interferenceCount = 0;
        
        // Get adjacent territories
        const adjacentCoords = this.getAdjacentCoordinates(territory.q, territory.r);
        
        adjacentCoords.forEach(coord => {
            // Use territory grid to find adjacent territories
            const territoryGrid = this.gameFlow.territoryGrid;
            if (territoryGrid) {
                const adjacentTerritory = territoryGrid.getTerritoryAt(coord.q, coord.r);
                if (adjacentTerritory && 
                    adjacentTerritory.ownerId && 
                    adjacentTerritory.ownerId !== territory.ownerId &&
                    adjacentTerritory.construct) {
                    interferenceCount++;
                }
            }
        });
        
        return interferenceCount;
    }
    
    getAdjacentCoordinates(q, r) {
        // Hex coordinate neighbors
        const directions = [
            {q: 1, r: 0},
            {q: 1, r: -1},
            {q: 0, r: -1},
            {q: -1, r: 0},
            {q: -1, r: 1},
            {q: 0, r: 1}
        ];
        
        return directions.map(dir => ({
            q: q + dir.q,
            r: r + dir.r
        }));
    }
    
    applyEventModifiers(production, resourceType) {
        // Check for active market events
        const activeMarketEvent = this.gameFlow?.game?.activeMarketEvent || 
                                  this.gameFlow?.stateManager?.getActiveMarketEvent?.();
        
        if (activeMarketEvent) {
            const event = activeMarketEvent;
            
            switch (event.type) {
                case 'magical_convergence':
                    if (resourceType === 'mana') {
                        production *= 1.5;
                    }
                    break;
                case 'life_bloom':
                    if (resourceType === 'vitality') {
                        production *= 2.0;
                    }
                    break;
                case 'ancient_discovery':
                    if (resourceType === 'arcanum') {
                        production *= 1.35;
                    }
                    break;
                case 'aether_storm':
                    if (resourceType === 'aether') {
                        production *= 2.0;
                    }
                    break;
                case 'mana_drought':
                    if (resourceType === 'mana') {
                        production *= 0.5;
                    }
                    break;
                case 'planar_interference':
                    production *= 0.8;
                    break;
            }
        }
        
        return production;
    }
    
    /**
     * Calculate production for a specific construct
     * Used by ConstructManager
     * @param {Construct} construct - The construct to calculate for
     * @returns {number} Production amount
     */
    calculateConstructProduction(construct) {
        if (!construct.territory) {
            return 0;
        }
        
        const production = this.calculateTerritoryProduction(construct.territory);
        return production ? production.amount : 0;
    }
}