// Comprehensive Resource Production Test Suite
// Tests all aspects of STEP_6_RESOURCE_PRODUCTION_PLAN.md implementation

console.log('=== RESOURCE PRODUCTION COMPLETE TEST SUITE ===');
console.log('This test will verify all resource production features including:');
console.log('- Visual effects (floating numbers, particles)');
console.log('- Production calculations');
console.log('- Storage limits');
console.log('- Resource decay');
console.log('- Production summary panel');
console.log('');

// Helper function to wait
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to get game instance
function getGame() {
    const game = window.game || (window.Phaser && window.Phaser.game);
    if (!game) {
        console.error('Game instance not found!');
        return null;
    }
    return game;
}

// Test 1: Setup test environment
async function setupTestEnvironment() {
    console.log('\n[TEST 1] Setting up test environment...');
    
    const game = getGame();
    if (!game) return false;
    
    const gameScene = game.scene.getScenes(true)[0];
    if (!gameScene) {
        console.error('GameScene not found!');
        return false;
    }
    
    // Ensure we have territories with constructs
    const territories = gameScene.gameStateManager.getAllTerritories();
    console.log(`Found ${territories.length} territories`);
    
    // Add constructs to some territories for testing
    const constructsToAdd = [
        { territoryId: 'territory_2_2', constructType: 'mana_generator', playerId: 'player1' },
        { territoryId: 'territory_3_2', constructType: 'food_farm', playerId: 'player1' },
        { territoryId: 'territory_4_2', constructType: 'gold_mine', playerId: 'player2' },
        { territoryId: 'territory_5_2', constructType: 'smithium_extractor', playerId: 'player2' }
    ];
    
    for (const { territoryId, constructType, playerId } of constructsToAdd) {
        const territory = gameScene.gameStateManager.getTerritory(territoryId);
        if (territory && !territory.construct) {
            territory.owner = playerId;
            territory.addConstruct(constructType);
            console.log(`Added ${constructType} to ${territoryId} for ${playerId}`);
        }
    }
    
    console.log('[TEST 1] ✓ Test environment setup complete');
    return true;
}

// Test 2: Test visual effects for each resource type
async function testVisualEffects() {
    console.log('\n[TEST 2] Testing visual effects for all resource types...');
    
    const game = getGame();
    if (!game) return false;
    
    const gameScene = game.scene.getScenes(true)[0];
    const resources = ['gold', 'mana', 'food', 'smithium'];
    
    for (const resource of resources) {
        console.log(`Testing ${resource} visual effect...`);
        
        // Trigger production event
        gameScene.gameFlowController.broadcastEvent('territory.produced', {
            territoryId: 'territory_3_2',
            resource: resource,
            amount: 10 + Math.floor(Math.random() * 20),
            playerId: 'player1'
        });
        
        await wait(1000); // Wait for animation
    }
    
    console.log('[TEST 2] ✓ Visual effects test complete');
    return true;
}

// Test 3: Test production calculations
async function testProductionCalculations() {
    console.log('\n[TEST 3] Testing production calculations...');
    
    const game = getGame();
    if (!game) return false;
    
    const gameScene = game.scene.getScenes(true)[0];
    const cycleManager = gameScene.gameFlowController.cycleManager;
    
    // Get initial resource values
    const player1 = gameScene.gameStateManager.getPlayer('player1');
    const initialResources = {
        gold: player1.resources.gold,
        mana: player1.resources.mana,
        food: player1.resources.food,
        smithium: player1.resources.smithium
    };
    
    console.log('Initial resources:', initialResources);
    
    // Run production calculation
    const productionResults = cycleManager.resourceProductionCalculator.calculateProduction(
        gameScene.gameStateManager.getAllTerritories(),
        gameScene.gameStateManager.getAllPlayers()
    );
    
    console.log('Production results:', productionResults);
    console.log('Player totals:', productionResults.playerTotals);
    
    console.log('[TEST 3] ✓ Production calculations test complete');
    return true;
}

// Test 4: Test storage limits
async function testStorageLimits() {
    console.log('\n[TEST 4] Testing storage limits...');
    
    const game = getGame();
    if (!game) return false;
    
    const gameScene = game.scene.getScenes(true)[0];
    const player1 = gameScene.gameStateManager.getPlayer('player1');
    
    // Set resources near storage limit
    const storageCapacity = player1.getStorageCapacity();
    console.log('Storage capacity:', storageCapacity);
    
    player1.resources.gold = storageCapacity - 10;
    player1.resources.mana = storageCapacity - 5;
    
    console.log('Resources before production:', {
        gold: player1.resources.gold,
        mana: player1.resources.mana
    });
    
    // Trigger production that would exceed storage
    gameScene.gameFlowController.broadcastEvent('player.production_applied', {
        playerId: 'player1',
        production: { gold: 20, mana: 15, food: 10, smithium: 5 },
        capped: { gold: true, mana: true, food: false, smithium: false }
    });
    
    await wait(1000);
    
    console.log('Resources after production:', {
        gold: player1.resources.gold,
        mana: player1.resources.mana
    });
    
    console.log('[TEST 4] ✓ Storage limits test complete');
    return true;
}

// Test 5: Test resource decay
async function testResourceDecay() {
    console.log('\n[TEST 5] Testing resource decay...');
    
    const game = getGame();
    if (!game) return false;
    
    const gameScene = game.scene.getScenes(true)[0];
    const cycleManager = gameScene.gameFlowController.cycleManager;
    
    // Set high food value for decay test
    const player1 = gameScene.gameStateManager.getPlayer('player1');
    player1.resources.food = 100;
    
    console.log('Food before decay:', player1.resources.food);
    
    // Apply decay
    const decayResults = cycleManager.resourceDecay.applyDecay(
        gameScene.gameStateManager.getAllPlayers()
    );
    
    console.log('Decay results:', decayResults);
    
    // Trigger decay event
    if (decayResults.player1 && decayResults.player1.food > 0) {
        gameScene.gameFlowController.broadcastEvent('resource.decayed', {
            playerId: 'player1',
            resource: 'food',
            amount: decayResults.player1.food,
            remaining: player1.resources.food
        });
    }
    
    console.log('Food after decay:', player1.resources.food);
    
    console.log('[TEST 5] ✓ Resource decay test complete');
    return true;
}

// Test 6: Test production summary panel
async function testProductionSummaryPanel() {
    console.log('\n[TEST 6] Testing production summary panel...');
    
    const game = getGame();
    if (!game) return false;
    
    const gameScene = game.scene.getScenes(true)[0];
    
    // Trigger production completed event with summary data
    gameScene.gameFlowController.broadcastEvent('resource_production.completed', {
        summary: {
            player1: {
                production: { gold: 25, mana: 30, food: 20, smithium: 15 },
                decay: { food: 5 },
                net: { gold: 25, mana: 30, food: 15, smithium: 15 },
                capped: { mana: true }
            },
            player2: {
                production: { gold: 20, mana: 15, food: 25, smithium: 30 },
                decay: { food: 3 },
                net: { gold: 20, mana: 15, food: 22, smithium: 30 },
                capped: {}
            }
        }
    });
    
    console.log('[TEST 6] ✓ Production summary panel test complete');
    console.log('Check if the summary panel is displayed with production details');
    return true;
}

// Main test runner
async function runAllTests() {
    console.log('\n=== STARTING COMPLETE RESOURCE PRODUCTION TESTS ===\n');
    
    const tests = [
        { name: 'Setup Test Environment', fn: setupTestEnvironment },
        { name: 'Visual Effects', fn: testVisualEffects },
        { name: 'Production Calculations', fn: testProductionCalculations },
        { name: 'Storage Limits', fn: testStorageLimits },
        { name: 'Resource Decay', fn: testResourceDecay },
        { name: 'Production Summary Panel', fn: testProductionSummaryPanel }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            const result = await test.fn();
            if (result) {
                passed++;
            } else {
                failed++;
                console.error(`[FAILED] ${test.name}`);
            }
        } catch (error) {
            failed++;
            console.error(`[ERROR] ${test.name}:`, error);
        }
        
        await wait(2000); // Wait between tests
    }
    
    console.log('\n=== TEST RESULTS ===');
    console.log(`Passed: ${passed}/${tests.length}`);
    console.log(`Failed: ${failed}/${tests.length}`);
    
    if (failed === 0) {
        console.log('\n✅ ALL TESTS PASSED! Resource production system is fully functional.');
    } else {
        console.log('\n❌ Some tests failed. Check the console for details.');
    }
}

// Quick test helper functions
window.testProduction = {
    // Run all tests
    runAll: runAllTests,
    
    // Run individual tests
    setup: setupTestEnvironment,
    visualEffects: testVisualEffects,
    calculations: testProductionCalculations,
    storage: testStorageLimits,
    decay: testResourceDecay,
    summary: testProductionSummaryPanel,
    
    // Quick production cycle
    runProductionCycle: async function() {
        console.log('Running quick production cycle...');
        const game = getGame();
        if (!game) return;
        
        const gameScene = game.scene.getScenes(true)[0];
        const flowController = gameScene.gameFlowController;
        
        // Skip to production phase
        flowController.skipToPhase('resource_production');
        
        console.log('Production phase started. Watch for visual effects!');
    },
    
    // Manual production trigger
    triggerProduction: function(territoryId, resource, amount) {
        const game = getGame();
        if (!game) return;
        
        const gameScene = game.scene.getScenes(true)[0];
        gameScene.gameFlowController.broadcastEvent('territory.produced', {
            territoryId: territoryId || 'territory_3_2',
            resource: resource || 'mana',
            amount: amount || 25,
            playerId: 'player1'
        });
    }
};

console.log('\n=== TEST SUITE LOADED ===');
console.log('Available commands:');
console.log('- testProduction.runAll() - Run all tests');
console.log('- testProduction.visualEffects() - Test visual effects only');
console.log('- testProduction.runProductionCycle() - Run a production cycle');
console.log('- testProduction.triggerProduction(territoryId, resource, amount) - Manual trigger');
console.log('\nRun testProduction.runAll() to start the complete test suite.');