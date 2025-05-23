// Test resource production system end-to-end
import { GameFlowController } from './src/models/index.js';

console.log('=== RESOURCE PRODUCTION SYSTEM TEST ===\n');

// Create game flow controller
const gameFlow = new GameFlowController({
    mapWidth: 5,
    mapHeight: 5,
    autoSave: false
});

// Create test players
const players = [
    { id: 'player1', name: 'Player 1', color: 0xFF0000, isAI: false },
    { id: 'player2', name: 'Player 2', color: 0x0000FF, isAI: true }
];

// Initialize game
gameFlow.initializeGame(players, {
    startingGold: 1000
});

console.log('Game initialized with', players.length, 'players\n');

// Manually set up some territories with constructs for testing
const territories = gameFlow.territoryGrid.territories;

// Give Player 1 some territories with constructs
territories[0].ownerId = 'player1';
territories[0].terrainType = 'crystalline_cave';
territories[0].construct = {
    type: 'mana_conduit',
    level: 2
};

territories[1].ownerId = 'player1';
territories[1].terrainType = 'ancient_grove';
territories[1].construct = {
    type: 'vitality_well',
    level: 1
};

// Give Player 2 some territories
territories[5].ownerId = 'player2';
territories[5].terrainType = 'ruined_temple';
territories[5].construct = {
    type: 'arcanum_extractor',
    level: 2
};

territories[6].ownerId = 'player2';
territories[6].terrainType = 'volcanic_field';
territories[6].construct = {
    type: 'aether_resonator',
    level: 1
};

console.log('Territory setup:');
console.log('- Player 1: 2 territories with constructs');
console.log('- Player 2: 2 territories with constructs\n');

// Listen for production events
let productionStarted = false;
let productionResults = null;
let playerProductionApplied = [];

gameFlow.on('resource_production.started', (event) => {
    productionStarted = true;
    console.log('Resource production started for cycle', event.cycle);
});

gameFlow.on('territory.produced', (event) => {
    console.log(`Territory ${event.territoryId} produced ${event.amount} ${event.resource}`);
});

gameFlow.on('player.production_applied', (event) => {
    playerProductionApplied.push(event);
    console.log(`\n${event.playerName} received:`, event.resources);
    if (event.storageResults.goldFromOverflow > 0) {
        console.log(`  Overflow converted to ${event.storageResults.goldFromOverflow} gold`);
    }
});

gameFlow.on('resource_production.completed', (event) => {
    productionResults = event.summary;
    console.log('\nProduction phase completed!');
});

// Test resource decay
gameFlow.on('resource_decay.processing', (event) => {
    console.log('\n=== RESOURCE DECAY PHASE ===');
    console.log('Processing decay for cycle', event.cycle);
});

gameFlow.on('player.resources_decayed', (event) => {
    const totalDecay = Object.values(event.decayed).reduce((sum, val) => sum + val, 0);
    if (totalDecay > 0) {
        console.log(`${event.playerName} lost:`, event.decayed);
    }
});

// Advance to resource production phase
console.log('Starting game flow...\n');
gameFlow.startGameFlow();

// Skip through territory selection and construct phases
console.log('Advancing through phases to reach resource production...\n');

// Force advance to production phase for testing
gameFlow.cycleManager.phaseIndex = 1; // Skip to construct phase
gameFlow.cycleManager.advancePhase(); // This should go to resource production

// Wait for production to complete
setTimeout(() => {
    console.log('\n=== TEST RESULTS ===');
    
    if (productionStarted) {
        console.log('✓ Production phase started successfully');
    } else {
        console.log('✗ Production phase did not start');
    }
    
    if (playerProductionApplied.length > 0) {
        console.log('✓ Resources were applied to players');
        
        // Check player resources
        const player1 = gameFlow.stateManager.getPlayer('player1');
        const player2 = gameFlow.stateManager.getPlayer('player2');
        
        console.log('\nFinal player resources:');
        console.log('Player 1:', player1.resources);
        console.log('Player 2:', player2.resources);
    } else {
        console.log('✗ No resources were applied');
    }
    
    if (productionResults) {
        console.log('✓ Production summary was generated');
        console.log('\nProduction summary:', {
            cycleNumber: productionResults.cycleNumber,
            playerCount: productionResults.playerSummaries?.length || 0
        });
    } else {
        console.log('✗ No production summary generated');
    }
    
    // Test storage limits
    console.log('\n=== STORAGE TEST ===');
    const player1 = gameFlow.stateManager.getPlayer('player1');
    const storageInfo = gameFlow.cycleManager.resourceStorage.getStorageInfo(player1);
    console.log('Player 1 storage:', storageInfo);
    
    // Test adding resources that exceed capacity
    console.log('\nTesting overflow handling...');
    const overflowTest = gameFlow.cycleManager.resourceStorage.addResources(player1, {
        mana: 200,
        vitality: 50
    });
    console.log('Overflow results:', overflowTest);
    console.log('Player 1 gold after overflow:', player1.gold);
    
    // Test decay preview
    console.log('\n=== DECAY PREVIEW ===');
    const decayPreview = gameFlow.cycleManager.resourceDecay.calculatePotentialDecay(player1);
    console.log('Potential decay for Player 1:', decayPreview);
    
    console.log('\n=== TEST COMPLETE ===');
    
}, 6000); // Wait for production animations to complete