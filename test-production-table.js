// Test script for the new production summary table
console.log('=== TESTING PRODUCTION SUMMARY TABLE ===');

// Get game instance
const game = window.game || window.Phaser.game;
const gameScene = game.scene.getScenes(true)[0];

// Setup test data
function setupTestData() {
    console.log('Setting up test data...');
    
    // Add constructs to territories
    const testConstructs = [
        { territoryId: 'territory_2_2', type: 'gold_mine', owner: 'player1' },
        { territoryId: 'territory_3_2', type: 'mana_generator', owner: 'player1' },
        { territoryId: 'territory_4_2', type: 'food_farm', owner: 'player1' },
        { territoryId: 'territory_5_2', type: 'smithium_extractor', owner: 'player2' },
        { territoryId: 'territory_2_3', type: 'gold_mine', owner: 'player2' },
        { territoryId: 'territory_3_3', type: 'mana_generator', owner: 'player2' },
        { territoryId: 'territory_4_3', type: 'food_farm', owner: 'player3' },
        { territoryId: 'territory_5_3', type: 'smithium_extractor', owner: 'player3' }
    ];
    
    testConstructs.forEach(({ territoryId, type, owner }) => {
        const territory = gameScene.gameStateManager.getTerritory(territoryId);
        if (territory) {
            territory.owner = owner;
            territory.addConstruct(type);
            console.log(`Added ${type} to ${territoryId} for ${owner}`);
        }
    });
}

// Test the production summary display
function testProductionSummary() {
    console.log('Testing production summary display...');
    
    // Create test production data
    const testSummary = {
        cycleNumber: 3,
        individualProduction: [
            // Player 1 productions
            { playerId: 'player1', territoryId: 'territory_2_2', constructType: 'gold_mine', resource: 'gold', amount: 25 },
            { playerId: 'player1', territoryId: 'territory_3_2', constructType: 'mana_generator', resource: 'mana', amount: 30 },
            { playerId: 'player1', territoryId: 'territory_4_2', constructType: 'food_farm', resource: 'food', amount: 20 },
            
            // Player 2 productions
            { playerId: 'player2', territoryId: 'territory_5_2', constructType: 'smithium_extractor', resource: 'smithium', amount: 15 },
            { playerId: 'player2', territoryId: 'territory_2_3', constructType: 'gold_mine', resource: 'gold', amount: 25 },
            { playerId: 'player2', territoryId: 'territory_3_3', constructType: 'mana_generator', resource: 'mana', amount: 30 },
            
            // Player 3 productions
            { playerId: 'player3', territoryId: 'territory_4_3', constructType: 'food_farm', resource: 'food', amount: 20 },
            { playerId: 'player3', territoryId: 'territory_5_3', constructType: 'smithium_extractor', resource: 'smithium', amount: 15 }
        ],
        playerTotals: [
            { playerId: 'player1', resources: { gold: 25, mana: 30, food: 20, smithium: 0 } },
            { playerId: 'player2', resources: { gold: 25, mana: 30, food: 0, smithium: 15 } },
            { playerId: 'player3', resources: { gold: 0, mana: 0, food: 20, smithium: 15 } }
        ]
    };
    
    // Show the production summary
    gameScene.showProductionSummary(testSummary);
}

// Test with real production cycle
function testRealProduction() {
    console.log('Running real production cycle...');
    
    // Skip to production phase
    gameScene.gameFlowController.skipToPhase('resource_production');
}

// Export functions
window.testProdTable = {
    setup: setupTestData,
    showSummary: testProductionSummary,
    runProduction: testRealProduction,
    
    // Quick test with mock data
    quickTest: function() {
        console.log('Quick test with mock data...');
        testProductionSummary();
    }
};

console.log('\n=== TEST COMMANDS ===');
console.log('testProdTable.setup()        - Set up test constructs');
console.log('testProdTable.showSummary()  - Show test summary table');
console.log('testProdTable.runProduction() - Run real production cycle');
console.log('testProdTable.quickTest()     - Quick test with mock data');
console.log('\nRun testProdTable.quickTest() to see the new table immediately!');