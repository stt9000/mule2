// Test script for resource production system
import { GameFlowController } from './src/models/index.js';

console.log('=== Testing Resource Production System ===\n');

// Create a test game flow controller
const gameFlow = new GameFlowController({
    mapWidth: 3,
    mapHeight: 3,
    autoSave: false
});

// Initialize with test players
const players = [
    { id: 'player1', name: 'Test Player 1', color: 0xff0000 },
    { id: 'player2', name: 'Test Player 2', color: 0x00ff00 }
];

gameFlow.initializeGame(players, {
    mapSize: { width: 3, height: 3 },
    startingGold: 1000
});

// Get some territories
const territories = gameFlow.territoryGrid.territories;
const territory1 = territories[0]; // First territory
const territory2 = territories[1]; // Second territory

console.log('Setting up test scenario...');

// Give territories to players
territory1.ownerId = 'player1';
territory2.ownerId = 'player2';

// Place constructs
territory1.construct = {
    type: 'mana_conduit',
    level: 1,
    ownerId: 'player1'
};

territory2.construct = {
    type: 'vitality_well',
    level: 2,
    ownerId: 'player2'
};

// Set terrain types if not already set
if (!territory1.terrainType) territory1.terrainType = territory1.type || 'ancient_grove';
if (!territory2.terrainType) territory2.terrainType = territory2.type || 'crystalline_cave';

console.log(`Territory 1: ${territory1.terrainType} with ${territory1.construct.type}`);
console.log(`Territory 2: ${territory2.terrainType} with ${territory2.construct.type}`);

// Test resource production calculation
console.log('\n=== Testing Production Calculation ===');

const calculator = gameFlow.cycleManager.resourceCalculator;
if (!calculator) {
    gameFlow.cycleManager.resourceCalculator = new (await import('./src/models/ResourceProductionCalculator.js')).default(gameFlow);
}

const production1 = gameFlow.cycleManager.resourceCalculator.calculateTerritoryProduction(territory1);
const production2 = gameFlow.cycleManager.resourceCalculator.calculateTerritoryProduction(territory2);

console.log('\nTerritory 1 production:', production1);
console.log('Territory 2 production:', production2);

// Test full cycle production
console.log('\n=== Testing Full Cycle Production ===');
const cycleProduction = gameFlow.cycleManager.resourceCalculator.calculateCycleProduction();
console.log('Cycle production results:', JSON.stringify(cycleProduction, null, 2));

// Test resource storage
console.log('\n=== Testing Resource Storage ===');
const player1 = gameFlow.stateManager.getPlayer('player1');
const player2 = gameFlow.stateManager.getPlayer('player2');

console.log('Player 1 resources before:', player1.resources);
console.log('Player 2 resources before:', player2.resources);

const storage = gameFlow.cycleManager.resourceStorage;
const storageResult1 = storage.addResources(player1, { mana: 50, vitality: 30 });
const storageResult2 = storage.addResources(player2, { vitality: 120 }); // Test overflow

console.log('\nPlayer 1 storage result:', storageResult1);
console.log('Player 2 storage result:', storageResult2);

console.log('\nPlayer 1 resources after:', player1.resources);
console.log('Player 2 resources after:', player2.resources);

// Test resource decay
console.log('\n=== Testing Resource Decay ===');
const decay = gameFlow.cycleManager.resourceDecay;
const decayPreview1 = decay.calculatePotentialDecay(player1);
const decayPreview2 = decay.calculatePotentialDecay(player2);

console.log('Player 1 decay preview:', decayPreview1);
console.log('Player 2 decay preview:', decayPreview2);

// Apply decay
const decayResult1 = decay.applyDecay(player1);
const decayResult2 = decay.applyDecay(player2);

console.log('\nPlayer 1 decay result:', decayResult1);
console.log('Player 2 decay result:', decayResult2);

console.log('\n=== Test Complete ===');