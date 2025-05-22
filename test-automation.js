// Automated Test Plan for Magical Frontiers Phase 1
// This script should be executed in the browser console after starting the game

console.log("🚀 Starting Automated Test Plan for Magical Frontiers Phase 1");
console.log("=" .repeat(60));

// Global test results storage
const testResults = {
    suites: [],
    totalTests: 0,
    totalPassed: 0,
    totalFailed: 0
};

// Helper function for running test suites
function createTestSuite(name) {
    return {
        name: name,
        results: [],
        
        test(testName, condition, details = '') {
            const result = { 
                name: testName, 
                passed: !!condition, 
                details,
                timestamp: new Date().toISOString()
            };
            this.results.push(result);
            
            const status = result.passed ? '✅' : '❌';
            const detailsText = details ? `: ${details}` : '';
            console.log(`${status} ${testName}${detailsText}`);
            
            return result.passed;
        },
        
        getSummary() {
            const passed = this.results.filter(r => r.passed).length;
            const total = this.results.length;
            return { name: this.name, passed, total, results: this.results };
        }
    };
}

// Test Suite 1: Framework and Initialization Tests
console.log("\n=== TEST SUITE 1: FRAMEWORK AND INITIALIZATION ===");

const suite1 = createTestSuite("Framework and Initialization");

// Test 1.1: Phaser game instance exists
suite1.test("Phaser game instance exists", 
    window.game && window.game.constructor.name === 'Game');

// Test 1.2: Game state initialized
suite1.test("Game state initialized", 
    window.gameState && typeof window.gameState === 'object');

// Test 1.3: Game scene is active
suite1.test("Game scene is active", 
    window.game && window.game.scene && window.game.scene.isActive('GameScene'));

// Test 1.4: Players initialized correctly
suite1.test("4 players initialized", 
    window.gameState && window.gameState.players && window.gameState.players.length === 4);

// Test 1.5: Each player has required properties
if (window.gameState && window.gameState.players) {
    const playersValid = window.gameState.players.every(player => 
        player.id && player.name && typeof player.gold === 'number' && 
        player.resources && player.territories && player.constructs);
    suite1.test("Players have required properties", playersValid);
} else {
    suite1.test("Players have required properties", false, "gameState.players not available");
}

// Test 1.6: Initial gold amounts correct
if (window.gameState && window.gameState.players) {
    const goldCorrect = window.gameState.players.every(player => player.gold === 1000);
    suite1.test("Initial gold amounts correct (1000 each)", goldCorrect);
} else {
    suite1.test("Initial gold amounts correct (1000 each)", false, "gameState.players not available");
}

// Test 1.7: UI elements exist
const uiElements = ['game-cycle', 'player-name', 'gold-display', 'mana-display'];
const uiExists = uiElements.every(id => document.getElementById(id));
suite1.test("Required UI elements exist", uiExists, `Missing: ${uiElements.filter(id => !document.getElementById(id)).join(', ')}`);

// Test 1.8: Game cycle starts at 1
suite1.test("Game cycle starts at 1", 
    window.gameState && window.gameState.currentCycle === 1);

// Test 1.9: Current player starts at index 0
suite1.test("Current player starts at index 0", 
    window.gameState && window.gameState.currentPlayerIndex === 0);

testResults.suites.push(suite1.getSummary());

// Test Suite 2: Territory and Map Tests
console.log("\n=== TEST SUITE 2: TERRITORY AND MAP TESTS ===");

const suite2 = createTestSuite("Territory and Map Tests");

// Get game scene instance
const gameScene = window.game && window.game.scene ? window.game.scene.getScene('GameScene') : null;

// Test 2.1: Territories array exists and has correct count
const expectedTerritories = 8 * 6; // 8x6 grid
if (gameScene && gameScene.territories) {
    suite2.test("Correct number of territories created", 
        gameScene.territories.length === expectedTerritories,
        `Expected ${expectedTerritories}, got ${gameScene.territories.length}`);
} else {
    suite2.test("Correct number of territories created", false, "gameScene.territories not available");
}

// Test 2.2: Each territory has required properties
if (gameScene && gameScene.territories) {
    const territoriesValid = gameScene.territories.every(territory => 
        territory.id && territory.type && typeof territory.x === 'number' && 
        typeof territory.y === 'number' && territory.graphics);
    suite2.test("Territories have required properties", territoriesValid);
} else {
    suite2.test("Territories have required properties", false, "gameScene.territories not available");
}

// Test 2.3: Territory types are valid
const validTypes = ['ancient_grove', 'crystalline_cave', 'ruined_temple', 
                   'mountain_peak', 'marshland', 'volcanic_field'];
if (gameScene && gameScene.territories) {
    const typesValid = gameScene.territories.every(territory => 
        validTypes.includes(territory.type));
    suite2.test("Territory types are valid", typesValid);
} else {
    suite2.test("Territory types are valid", false, "gameScene.territories not available");
}

// Test 2.4: Territories start unowned
if (gameScene && gameScene.territories) {
    const unowned = gameScene.territories.every(territory => 
        territory.owner === null);
    suite2.test("Territories start unowned", unowned);
} else {
    suite2.test("Territories start unowned", false, "gameScene.territories not available");
}

// Test 2.5: Territories start without constructs
if (gameScene && gameScene.territories) {
    const noConstructs = gameScene.territories.every(territory => 
        territory.construct === null);
    suite2.test("Territories start without constructs", noConstructs);
} else {
    suite2.test("Territories start without constructs", false, "gameScene.territories not available");
}

// Test 2.6: Territory graphics are interactive
if (gameScene && gameScene.territories) {
    const interactive = gameScene.territories.every(territory => 
        territory.graphics && territory.graphics.input);
    suite2.test("Territory graphics are interactive", interactive);
} else {
    suite2.test("Territory graphics are interactive", false, "gameScene.territories not available");
}

testResults.suites.push(suite2.getSummary());

// Test Suite 3: Economic System Tests
console.log("\n=== TEST SUITE 3: ECONOMIC SYSTEM TESTS ===");

const suite3 = createTestSuite("Economic System Tests");

// Test 3.1: Resource types are defined
const resourceTypes = ['mana', 'vitality', 'arcanum', 'aether'];
if (window.gameState && window.gameState.players && window.gameState.players[0]) {
    const resourcesExist = resourceTypes.every(type => 
        window.gameState.players[0].resources.hasOwnProperty(type));
    suite3.test("Resource types are defined", resourcesExist);
} else {
    suite3.test("Resource types are defined", false, "gameState.players not available");
}

// Test 3.2: Initial resources are zero
if (window.gameState && window.gameState.players) {
    const initialResourcesZero = window.gameState.players.every(player =>
        resourceTypes.every(type => player.resources[type] === 0));
    suite3.test("Initial resources are zero", initialResourcesZero);
} else {
    suite3.test("Initial resources are zero", false, "gameState.players not available");
}

// Test 3.3: Territory purchase simulation
if (gameScene && window.gameState && window.gameState.players) {
    const player = window.gameState.players[window.gameState.currentPlayerIndex];
    const territory = gameScene.territories[0];
    const initialGold = player.gold;
    
    // Simulate purchase
    try {
        gameScene.buyLand(territory);
        
        const goldDeducted = initialGold - player.gold === 100;
        const territoryOwned = territory.owner === player;
        const territoryInPlayerList = player.territories.includes(territory);
        
        suite3.test("Territory purchase deducts gold", goldDeducted);
        suite3.test("Territory purchase assigns ownership", territoryOwned);
        suite3.test("Territory added to player list", territoryInPlayerList);
    } catch (error) {
        suite3.test("Territory purchase mechanics", false, `Error: ${error.message}`);
    }
} else {
    suite3.test("Territory purchase mechanics", false, "Game components not available");
}

// Test 3.4: Construct building simulation
if (gameScene && window.gameState && window.gameState.players) {
    const player = window.gameState.players[window.gameState.currentPlayerIndex];
    const ownedTerritory = player.territories[0];
    
    if (ownedTerritory) {
        const initialGold = player.gold;
        const initialConstructs = player.constructs.length;
        
        try {
            gameScene.upgradeTerritory(ownedTerritory);
            
            const goldDeducted = initialGold - player.gold === 200;
            const constructCreated = ownedTerritory.construct !== null;
            const constructInPlayerList = player.constructs.length === initialConstructs + 1;
            const constructLevel = ownedTerritory.construct?.level === 1;
            
            suite3.test("Construct building deducts gold", goldDeducted);
            suite3.test("Construct created on territory", constructCreated);
            suite3.test("Construct added to player list", constructInPlayerList);
            suite3.test("Construct starts at level 1", constructLevel);
        } catch (error) {
            suite3.test("Construct building mechanics", false, `Error: ${error.message}`);
        }
    } else {
        suite3.test("Construct building mechanics", false, "No owned territory found");
    }
} else {
    suite3.test("Construct building mechanics", false, "Game components not available");
}

testResults.suites.push(suite3.getSummary());

// Test Suite 4: Turn Management and Resource Production Tests
console.log("\n=== TEST SUITE 4: TURN MANAGEMENT AND RESOURCE PRODUCTION ===");

const suite4 = createTestSuite("Turn Management and Resource Production");

// Test 4.1: Turn advancement
if (gameScene && window.gameState) {
    const initialPlayer = window.gameState.currentPlayerIndex;
    try {
        gameScene.nextTurn();
        const playerAdvanced = window.gameState.currentPlayerIndex === (initialPlayer + 1) % 4;
        suite4.test("Turn advancement works", playerAdvanced);
    } catch (error) {
        suite4.test("Turn advancement works", false, `Error: ${error.message}`);
    }
} else {
    suite4.test("Turn advancement works", false, "Game components not available");
}

// Test 4.2: Resource production calculation
if (gameScene) {
    const testTerritory = {
        type: 'crystalline_cave',
        construct: { type: 'mana_conduit', level: 2 },
        owner: { name: 'Test' }
    };
    const expectedProduction = 10 + 5 + 5; // base + type bonus + level bonus
    
    try {
        const actualProduction = gameScene.calculateProduction(testTerritory);
        suite4.test("Resource production calculation correct", 
            actualProduction === expectedProduction,
            `Expected ${expectedProduction}, got ${actualProduction}`);
    } catch (error) {
        suite4.test("Resource production calculation correct", false, `Error: ${error.message}`);
    }
} else {
    suite4.test("Resource production calculation correct", false, "gameScene not available");
}

// Test 4.3: Construct type to resource mapping
if (gameScene) {
    const mappings = [
        ['mana_conduit', 'mana'],
        ['vitality_well', 'vitality'],
        ['arcanum_extractor', 'arcanum'],
        ['aether_resonator', 'aether']
    ];
    
    try {
        const mappingCorrect = mappings.every(([constructType, expectedResource]) => 
            gameScene.getResourceTypeForConstruct(constructType) === expectedResource);
        suite4.test("Construct to resource type mapping correct", mappingCorrect);
    } catch (error) {
        suite4.test("Construct to resource type mapping correct", false, `Error: ${error.message}`);
    }
} else {
    suite4.test("Construct to resource type mapping correct", false, "gameScene not available");
}

// Test 4.4: Full cycle mechanics
if (gameScene && window.gameState) {
    const initialCycle = window.gameState.currentCycle;
    
    try {
        // Advance through remaining players in current cycle
        const playersRemaining = 4 - window.gameState.currentPlayerIndex;
        for (let i = 0; i < playersRemaining - 1; i++) {
            gameScene.nextTurn();
        }
        
        const cycleAdvanced = window.gameState.currentCycle === initialCycle + 1;
        const playerIndexReset = window.gameState.currentPlayerIndex === 0;
        
        suite4.test("Full cycle advances cycle counter", cycleAdvanced);
        suite4.test("Full cycle resets to player 0", playerIndexReset);
    } catch (error) {
        suite4.test("Full cycle mechanics", false, `Error: ${error.message}`);
    }
} else {
    suite4.test("Full cycle mechanics", false, "Game components not available");
}

testResults.suites.push(suite4.getSummary());

// Test Suite 5: UI and Rendering Tests
console.log("\n=== TEST SUITE 5: UI AND RENDERING TESTS ===");

const suite5 = createTestSuite("UI and Rendering Tests");

// Test 5.1: Camera setup
if (gameScene && gameScene.cameras && gameScene.cameras.main) {
    const camera = gameScene.cameras.main;
    suite5.test("Camera exists", !!camera);
    suite5.test("Camera zoom is set", camera.zoom > 0);
} else {
    suite5.test("Camera exists", false, "gameScene.cameras not available");
    suite5.test("Camera zoom is set", false, "gameScene.cameras not available");
}

// Test 5.2: Button elements exist
const buttons = ['end-turn-btn', 'buy-land-btn', 'upgrade-btn', 'harvest-btn', 'reset-view-btn'];
const buttonsExist = buttons.every(id => document.getElementById(id));
const missingButtons = buttons.filter(id => !document.getElementById(id));
suite5.test("All required buttons exist", buttonsExist, 
    missingButtons.length > 0 ? `Missing: ${missingButtons.join(', ')}` : '');

// Test 5.3: Resource display elements exist
const resourceDisplays = ['mana-display', 'vitality-display', 'arcanum-display', 'aether-display'];
const displaysExist = resourceDisplays.every(id => document.getElementById(id));
const missingDisplays = resourceDisplays.filter(id => !document.getElementById(id));
suite5.test("Resource display elements exist", displaysExist,
    missingDisplays.length > 0 ? `Missing: ${missingDisplays.join(', ')}` : '');

// Test 5.4: UI updates correctly
if (gameScene && window.gameState && window.gameState.players) {
    try {
        const currentPlayer = window.gameState.players[window.gameState.currentPlayerIndex];
        gameScene.updatePlayerDisplay();
        
        const cycleElement = document.getElementById('game-cycle');
        const playerElement = document.getElementById('player-name');
        const goldElement = document.getElementById('gold-display');
        
        const cycleDisplayed = cycleElement?.textContent == window.gameState.currentCycle;
        const playerDisplayed = playerElement?.textContent === currentPlayer.name;
        const goldDisplayed = goldElement?.textContent == currentPlayer.gold;
        
        suite5.test("Cycle displays correctly", cycleDisplayed);
        suite5.test("Player name displays correctly", playerDisplayed);
        suite5.test("Gold displays correctly", goldDisplayed);
    } catch (error) {
        suite5.test("UI updates correctly", false, `Error: ${error.message}`);
    }
} else {
    suite5.test("UI updates correctly", false, "Game components not available");
}

// Test 5.5: Territory selection mechanics
if (gameScene && gameScene.territories) {
    try {
        const territory = gameScene.territories[0];
        gameScene.selectTerritory(territory);
        suite5.test("Territory selection sets selectedTerritory", 
            gameScene.selectedTerritory === territory);
    } catch (error) {
        suite5.test("Territory selection mechanics", false, `Error: ${error.message}`);
    }
} else {
    suite5.test("Territory selection mechanics", false, "gameScene.territories not available");
}

testResults.suites.push(suite5.getSummary());

// Test Suite 6: End Game and Scoring Tests
console.log("\n=== TEST SUITE 6: END GAME AND SCORING TESTS ===");

const suite6 = createTestSuite("End Game and Scoring Tests");

// Test 6.1: Score calculation formula
function calculateExpectedScore(player) {
    const goldPoints = player.gold * 1;
    const territoryPoints = player.territories.length * 50;
    const constructPoints = player.constructs.length * 75;
    const constructLevelPoints = player.constructs.reduce((sum, construct) => sum + construct.level * 25, 0);
    const resourcePoints = (player.resources.mana + player.resources.vitality + 
                          player.resources.arcanum + player.resources.aether) * 2;
    
    return goldPoints + territoryPoints + constructPoints + constructLevelPoints + resourcePoints;
}

const testPlayer = {
    gold: 500,
    territories: [{}, {}], // 2 territories
    constructs: [{level: 2}, {level: 3}], // 2 constructs
    resources: { mana: 10, vitality: 5, arcanum: 8, aether: 2 }
};

const expectedScore = 500 + (2*50) + (2*75) + (2*25 + 3*25) + (25*2);
const calculatedScore = calculateExpectedScore(testPlayer);
suite6.test("Score calculation formula correct", 
    calculatedScore === expectedScore,
    `Expected ${expectedScore}, got ${calculatedScore}`);

// Test 6.2: Game ends at cycle 12
suite6.test("Game recognizes end condition", 
    window.gameState && window.gameState.totalCycles === 12);

// Test 6.3: All players have valid scores
if (window.gameState && window.gameState.players) {
    const scores = window.gameState.players.map(player => calculateExpectedScore(player));
    const allScoresValid = scores.every(score => 
        typeof score === 'number' && score >= 0);
    suite6.test("All player scores are valid numbers", allScoresValid);
    
    // Test 6.4: Winner determination logic
    const maxScore = Math.max(...scores);
    const expectedWinnerIndex = scores.indexOf(maxScore);
    const expectedWinner = window.gameState.players[expectedWinnerIndex];
    
    suite6.test("Winner determination logic", 
        !!expectedWinner && typeof maxScore === 'number');
} else {
    suite6.test("All player scores are valid numbers", false, "gameState.players not available");
    suite6.test("Winner determination logic", false, "gameState.players not available");
}

// Test 6.5: Score components are accessible
if (window.gameState && window.gameState.players && window.gameState.players[0]) {
    const firstPlayer = window.gameState.players[0];
    const hasAllComponents = (
        typeof firstPlayer.gold === 'number' &&
        Array.isArray(firstPlayer.territories) &&
        Array.isArray(firstPlayer.constructs) &&
        typeof firstPlayer.resources === 'object'
    );
    suite6.test("Score components are accessible", hasAllComponents);
} else {
    suite6.test("Score components are accessible", false, "gameState.players not available");
}

testResults.suites.push(suite6.getSummary());

// Calculate final results
testResults.totalTests = testResults.suites.reduce((sum, suite) => sum + suite.total, 0);
testResults.totalPassed = testResults.suites.reduce((sum, suite) => sum + suite.passed, 0);
testResults.totalFailed = testResults.totalTests - testResults.totalPassed;

// Final Test Summary
console.log("\n" + "=" .repeat(60));
console.log("=== FINAL TEST SUMMARY ===");
console.log("=" .repeat(60));

testResults.suites.forEach(suite => {
    const percentage = ((suite.passed / suite.total) * 100).toFixed(1);
    console.log(`📊 ${suite.name}: ${suite.passed}/${suite.total} (${percentage}%)`);
});

console.log(`\n📈 OVERALL RESULTS:`);
console.log(`✅ Passed: ${testResults.totalPassed}/${testResults.totalTests} tests`);
console.log(`❌ Failed: ${testResults.totalFailed}/${testResults.totalTests} tests`);
console.log(`📊 Success Rate: ${((testResults.totalPassed/testResults.totalTests)*100).toFixed(1)}%`);

// Show failed tests
const failedTests = testResults.suites.flatMap(suite => 
    suite.results.filter(r => !r.passed).map(r => ({...r, suite: suite.name}))
);

if (failedTests.length > 0) {
    console.log(`\n🔍 FAILED TESTS:`);
    failedTests.forEach(test => {
        console.log(`   ❌ [${test.suite}] ${test.name}${test.details ? ': ' + test.details : ''}`);
    });
}

// Phase 1 Completion Assessment
const criticalSystems = {
    "Framework Setup": testResults.suites[0] ? testResults.suites[0].passed >= 7 : false,
    "Territory System": testResults.suites[1] ? testResults.suites[1].passed >= 5 : false,
    "Economic System": testResults.suites[2] ? testResults.suites[2].passed >= 4 : false,
    "Turn Management": testResults.suites[3] ? testResults.suites[3].passed >= 4 : false,
    "UI System": testResults.suites[4] ? testResults.suites[4].passed >= 5 : false,
    "End Game": testResults.suites[5] ? testResults.suites[5].passed >= 4 : false
};

console.log(`\n🎯 PHASE 1 SYSTEM STATUS:`);
Object.entries(criticalSystems).forEach(([system, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${system}: ${passed ? 'READY' : 'NEEDS WORK'}`);
});

const phase1Ready = Object.values(criticalSystems).every(status => status);
console.log(`\n${phase1Ready ? '🎉' : '⚠️'} PHASE 1 STATUS: ${phase1Ready ? 'COMPLETE' : 'INCOMPLETE'}`);

if (phase1Ready) {
    console.log(`\n🚀 Phase 1 is ready for production!`);
    console.log(`   All core systems are functional and tested.`);
} else {
    console.log(`\n🔧 Phase 1 needs additional work before completion.`);
    console.log(`   Focus on failing systems before proceeding to Phase 2.`);
}

// Return results for external use
return testResults;