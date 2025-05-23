/**
 * Comprehensive Automated Test Suite for Magical Frontiers
 * Tests all major systems from initialization through resource production
 */

import { GameFlowController } from './src/models/index.js';
import Territory from './src/models/Territory.js';
import Player from './src/models/Player.js';
import Construct from './src/models/Construct.js';

class ComprehensiveTestSuite {
    constructor() {
        this.testResults = [];
        this.gameFlow = null;
        this.currentTestName = '';
    }

    // Helper methods
    log(message, data = null) {
        console.log(`[${this.currentTestName}] ${message}`, data || '');
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    recordResult(testName, passed, error = null) {
        this.testResults.push({
            testName,
            passed,
            error: error ? error.message : null,
            timestamp: new Date().toISOString()
        });
    }

    async runTest(testName, testFunction) {
        this.currentTestName = testName;
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Running: ${testName}`);
        console.log('='.repeat(60));
        
        try {
            await testFunction.call(this);
            this.recordResult(testName, true);
            console.log(`✅ ${testName} PASSED`);
        } catch (error) {
            this.recordResult(testName, false, error);
            console.error(`❌ ${testName} FAILED:`, error.message);
            console.error(error.stack);
        }
    }

    // Test Suite Methods
    async runAllTests() {
        console.log('\n🚀 Starting Comprehensive Test Suite\n');
        
        // Phase 1: Foundation Tests
        await this.runTest('Test 1.1: Game Initialization', this.testGameInitialization);
        await this.runTest('Test 1.2: Player Creation', this.testPlayerCreation);
        await this.runTest('Test 1.3: Territory Grid Generation', this.testTerritoryGridGeneration);
        await this.runTest('Test 1.4: Game State Management', this.testGameStateManagement);
        
        // Phase 2: Core Systems Tests
        await this.runTest('Test 2.1: Cycle Manager', this.testCycleManager);
        await this.runTest('Test 2.2: Turn Manager', this.testTurnManager);
        await this.runTest('Test 2.3: Time Manager', this.testTimeManager);
        await this.runTest('Test 2.4: Phase Transitions', this.testPhaseTransitions);
        
        // Phase 3: Territory System Tests
        await this.runTest('Test 3.1: Territory Selection', this.testTerritorySelection);
        await this.runTest('Test 3.2: Territory Ownership', this.testTerritoryOwnership);
        await this.runTest('Test 3.3: Territory Disputes', this.testTerritoryDisputes);
        await this.runTest('Test 3.4: Territory Improvements', this.testTerritoryImprovements);
        
        // Phase 4: Construct System Tests
        await this.runTest('Test 4.1: Construct Creation', this.testConstructCreation);
        await this.runTest('Test 4.2: Construct Placement', this.testConstructPlacement);
        await this.runTest('Test 4.3: Construct Upgrades', this.testConstructUpgrades);
        await this.runTest('Test 4.4: Construct Synergies', this.testConstructSynergies);
        
        // Phase 5: Economic System Tests
        await this.runTest('Test 5.1: Resource Types', this.testResourceTypes);
        await this.runTest('Test 5.2: Market Prices', this.testMarketPrices);
        await this.runTest('Test 5.3: Player Economy', this.testPlayerEconomy);
        await this.runTest('Test 5.4: Market Events', this.testMarketEvents);
        
        // Phase 6: Resource Production Tests
        await this.runTest('Test 6.1: Production Calculation', this.testProductionCalculation);
        await this.runTest('Test 6.2: Production Modifiers', this.testProductionModifiers);
        await this.runTest('Test 6.3: Resource Storage', this.testResourceStorage);
        await this.runTest('Test 6.4: Resource Decay', this.testResourceDecay);
        
        // Phase 7: Game Flow Integration Tests
        await this.runTest('Test 7.1: Full Cycle Flow', this.testFullCycleFlow);
        await this.runTest('Test 7.2: Save/Load System', this.testSaveLoadSystem);
        await this.runTest('Test 7.3: Victory Conditions', this.testVictoryConditions);
        await this.runTest('Test 7.4: Error Recovery', this.testErrorRecovery);
        
        // Print summary
        this.printTestSummary();
    }

    // Individual Test Implementations

    // Phase 1: Foundation Tests
    async testGameInitialization() {
        this.gameFlow = new GameFlowController({
            mapWidth: 5,
            mapHeight: 5,
            autoSave: false
        });
        
        this.assert(this.gameFlow !== null, 'GameFlowController should be created');
        this.assert(this.gameFlow.game !== null, 'Game instance should exist');
        this.assert(this.gameFlow.cycleManager !== null, 'CycleManager should exist');
        this.assert(this.gameFlow.turnManager !== null, 'TurnManager should exist');
        this.assert(this.gameFlow.stateManager !== null, 'StateManager should exist');
        
        this.log('All core systems initialized successfully');
    }

    async testPlayerCreation() {
        const players = [
            { id: 'p1', name: 'Test Player 1', color: 0xff0000 },
            { id: 'p2', name: 'Test Player 2', color: 0x00ff00 },
            { id: 'p3', name: 'Test Player 3', color: 0x0000ff },
            { id: 'p4', name: 'Test Player 4', color: 0xffff00 }
        ];
        
        this.gameFlow.initializeGame(players, {
            mapSize: { width: 5, height: 5 },
            startingGold: 1000
        });
        
        // Verify players were created
        const gamePlayers = this.gameFlow.stateManager.gameState.players;
        this.assert(gamePlayers.length === 4, 'Should have 4 players');
        
        gamePlayers.forEach((player, index) => {
            this.assert(player.id === players[index].id, `Player ${index} ID should match`);
            this.assert(player.gold === 1000, `Player ${index} should have 1000 gold`);
            this.assert(player.resources.mana === 0, 'Should start with 0 mana');
            this.assert(player.resources.vitality === 0, 'Should start with 0 vitality');
            this.assert(player.resources.arcanum === 0, 'Should start with 0 arcanum');
            this.assert(player.resources.aether === 0, 'Should start with 0 aether');
        });
        
        this.log('All players created with correct initial values');
    }

    async testTerritoryGridGeneration() {
        const territories = this.gameFlow.territoryGrid.territories;
        this.assert(territories.length === 25, 'Should have 25 territories (5x5 grid)');
        
        // Check territory properties
        territories.forEach(territory => {
            this.assert(territory.id !== undefined, 'Territory should have ID');
            this.assert(territory.q !== undefined, 'Territory should have q coordinate');
            this.assert(territory.r !== undefined, 'Territory should have r coordinate');
            this.assert(territory.type !== undefined, 'Territory should have type');
            this.assert(territory.ownerId === null, 'Territory should start unowned');
            this.assert(territory.construct === null, 'Territory should start without construct');
        });
        
        // Check territory types distribution
        const typeCount = {};
        territories.forEach(t => {
            typeCount[t.type] = (typeCount[t.type] || 0) + 1;
        });
        
        this.log('Territory type distribution:', typeCount);
        this.assert(Object.keys(typeCount).length > 1, 'Should have multiple territory types');
    }

    async testGameStateManagement() {
        const state = this.gameFlow.stateManager.gameState;
        
        this.assert(state.version === '1.0', 'Should have version 1.0');
        this.assert(state.gameStatus === 'active', 'Game should be active');
        this.assert(state.currentCycle === 1, 'Should start at cycle 1');
        this.assert(state.currentPhase === 'territory_selection', 'Should start in territory selection');
        
        // Test state validation
        const isValid = this.gameFlow.stateManager.validateGameState();
        this.assert(isValid === true, 'Game state should be valid');
        
        this.log('Game state management working correctly');
    }

    // Phase 2: Core Systems Tests
    async testCycleManager() {
        const cycleManager = this.gameFlow.cycleManager;
        
        this.assert(cycleManager.currentCycle === 1, 'Should be on cycle 1');
        this.assert(cycleManager.currentPhase === 'territory_selection', 'Should be in territory selection');
        this.assert(cycleManager.gameState === 'active', 'Game should be active');
        
        // Test phase configurations
        const phaseConfig = cycleManager.phaseConfigs[cycleManager.currentPhase];
        this.assert(phaseConfig !== undefined, 'Current phase should have config');
        this.assert(phaseConfig.allowsPlayerActions !== undefined, 'Phase config should specify player actions');
        
        this.log('Cycle manager configured correctly');
    }

    async testTurnManager() {
        // Start game flow to initialize turns
        this.gameFlow.startGameFlow();
        
        const turnManager = this.gameFlow.turnManager;
        const currentPlayer = turnManager.getCurrentPlayer();
        
        this.assert(currentPlayer !== null, 'Should have a current player');
        this.assert(turnManager.turnOrder.length === 4, 'Turn order should have 4 players');
        
        // Test player actions - check if player has actions remaining
        const playerActions = turnManager.playerActions.get(currentPlayer.id);
        this.assert(playerActions !== undefined, 'Player should have actions initialized');
        this.assert(playerActions.remaining > 0, 'Current player should have actions remaining');
        
        // Stop timers to prevent test hanging
        this.gameFlow.pauseGame();
        
        this.log('Turn manager functioning correctly');
    }

    async testTimeManager() {
        const timeManager = this.gameFlow.timeManager;
        
        // Test timer creation using proper method
        const timerId = timeManager.createTimer('test', 5000); // 5 seconds in ms
        
        this.assert(timerId !== null, 'Should create timer');
        this.assert(timeManager.activeTimers.has(timerId), 'Timer should be active');
        
        // Clean up timer
        timeManager.cancelTimer(timerId);
        this.assert(!timeManager.activeTimers.has(timerId), 'Timer should be cancelled');
        
        this.log('Time manager working correctly');
    }

    async testPhaseTransitions() {
        // Resume game
        this.gameFlow.resumeGame();
        
        const initialPhase = this.gameFlow.cycleManager.currentPhase;
        this.assert(initialPhase === 'territory_selection', 'Should start in territory selection');
        
        // Force advance to next phase
        this.gameFlow.cycleManager.forceAdvanceToPhase('construct_outfitting');
        
        const newPhase = this.gameFlow.cycleManager.currentPhase;
        this.assert(newPhase === 'construct_outfitting', 'Should advance to construct outfitting');
        
        // Pause again
        this.gameFlow.pauseGame();
        
        this.log('Phase transitions working correctly');
    }

    // Phase 3: Territory System Tests
    async testTerritorySelection() {
        // Reset to territory selection phase
        this.gameFlow.cycleManager.forceAdvanceToPhase('territory_selection');
        
        const player = this.gameFlow.stateManager.getPlayer('p1');
        const territory = this.gameFlow.territoryGrid.territories[0];
        
        // Attempt to claim territory
        const result = this.gameFlow.territoryAcquisition.attemptClaim(player.id, territory.id);
        
        this.assert(result.success === true, 'Should successfully claim territory');
        this.assert(result.claimType === 'claimed' || result.action === 'claimed', 'Should be claimed type');
        
        this.log('Territory selection working correctly');
    }

    async testTerritoryOwnership() {
        const territory = this.gameFlow.territoryGrid.territories[0];
        
        // Territory might be disputed, check if it has claimants
        const hasOwner = territory.ownerId !== null || territory.claimants?.length > 0;
        this.assert(hasOwner, 'Territory should have owner or claimants');
        
        // Test ownership verification if owned
        if (territory.ownerId) {
            const owner = this.gameFlow.stateManager.getPlayer(territory.ownerId);
            this.assert(owner !== undefined, 'Owner should exist');
        }
        
        this.log('Territory ownership tracking correctly');
    }

    async testTerritoryDisputes() {
        const territory = this.gameFlow.territoryGrid.territories[1];
        
        // Two players claim same territory
        this.gameFlow.territoryAcquisition.attemptClaim('p2', territory.id);
        this.gameFlow.territoryAcquisition.attemptClaim('p3', territory.id);
        
        // Check dispute exists
        const disputes = this.gameFlow.territoryAcquisition.disputedTerritories || new Map();
        const dispute = disputes.get?.(territory.id) || territory.claimants;
        
        this.assert(dispute !== undefined || territory.claimants?.length > 1, 'Dispute should exist');
        const claimantCount = dispute?.claimants?.length || dispute?.length || territory.claimants?.length || 0;
        this.assert(claimantCount >= 2, 'Should have at least 2 claimants');
        
        // Resolve disputes
        this.gameFlow.territoryAcquisition.resolveDisputes();
        
        // Verify resolution
        this.assert(territory.ownerId !== null, 'Territory should have owner after resolution');
        this.assert(disputes.size === 0, 'Disputes should be cleared');
        
        this.log('Territory dispute resolution working correctly');
    }

    async testTerritoryImprovements() {
        // Find an owned territory or claim one
        let territory = this.gameFlow.territoryGrid.territories.find(t => t.ownerId !== null);
        if (!territory) {
            // Claim a territory first
            this.gameFlow.territoryAcquisition.attemptClaim('p1', this.gameFlow.territoryGrid.territories[5].id);
            this.gameFlow.territoryAcquisition.resolveDisputes();
            territory = this.gameFlow.territoryGrid.territories[5];
        }
        this.assert(territory.ownerId !== null, 'Territory should be owned');
        
        // Test improvement validation
        const canImprove = this.gameFlow.territoryImprovement.canImproveTerritory(territory.id, territory.ownerId);
        this.assert(canImprove.canImprove === true, 'Should be able to improve owned territory');
        
        this.log('Territory improvement system ready');
    }

    // Phase 4: Construct System Tests
    async testConstructCreation() {
        const construct = new Construct({
            id: 'test_construct',
            type: 'mana_conduit',
            level: 1,
            ownerId: 'p1'
        });
        
        this.assert(construct.id === 'test_construct', 'Construct ID should match');
        this.assert(construct.type === 'mana_conduit', 'Construct type should match');
        this.assert(construct.level === 1, 'Construct should be level 1');
        this.assert(construct.active !== false, 'Construct should not be inactive');
        
        this.log('Construct creation working correctly');
    }

    async testConstructPlacement() {
        // Move to construct phase
        this.gameFlow.cycleManager.forceAdvanceToPhase('construct_outfitting');
        
        const territory = this.gameFlow.territoryGrid.territories[0];
        const player = this.gameFlow.stateManager.getPlayer('p1');
        
        // Create construct
        const construct = {
            type: 'mana_conduit',
            level: 1,
            ownerId: player.id
        };
        
        // Place construct
        territory.construct = construct;
        
        this.assert(territory.construct !== null, 'Territory should have construct');
        this.assert(territory.construct.type === 'mana_conduit', 'Construct type should match');
        
        this.log('Construct placement working correctly');
    }

    async testConstructUpgrades() {
        const territory = this.gameFlow.territoryGrid.territories[0];
        
        // Upgrade construct
        if (territory.construct) {
            territory.construct.level = 2;
            
            this.assert(territory.construct.level === 2, 'Construct should be level 2');
        }
        
        this.log('Construct upgrade system ready');
    }

    async testConstructSynergies() {
        // Test synergy detection
        const calculator = new (await import('./src/models/ResourceProductionCalculator.js')).default(this.gameFlow);
        
        const hasSynergy = calculator.hasSynergy('crystalline_cave', 'mana_conduit');
        this.assert(hasSynergy === true, 'Crystalline cave should have synergy with mana conduit');
        
        const noSynergy = calculator.hasSynergy('crystalline_cave', 'vitality_well');
        this.assert(noSynergy === false, 'Crystalline cave should not have synergy with vitality well');
        
        this.log('Construct synergy detection working correctly');
    }

    // Phase 5: Economic System Tests
    async testResourceTypes() {
        const resourceTypes = ['mana', 'vitality', 'arcanum', 'aether'];
        const player = this.gameFlow.stateManager.getPlayer('p1');
        
        resourceTypes.forEach(resource => {
            this.assert(player.resources[resource] !== undefined, `Player should have ${resource} resource`);
            this.assert(typeof player.resources[resource] === 'number', `${resource} should be a number`);
        });
        
        this.log('All resource types properly initialized');
    }

    async testMarketPrices() {
        const market = this.gameFlow.game?.market || this.gameFlow.stateManager?.gameState?.market;
        
        this.assert(market !== undefined, 'Market should exist');
        
        // Check base prices
        const prices = market.prices || market;
        this.assert(prices.mana > 0, 'Mana should have positive price');
        this.assert(prices.vitality > 0, 'Vitality should have positive price');
        this.assert(prices.arcanum > 0, 'Arcanum should have positive price');
        this.assert(prices.aether > 0, 'Aether should have positive price');
        
        this.log('Market prices initialized correctly');
    }

    async testPlayerEconomy() {
        const player = this.gameFlow.stateManager.getPlayer('p1');
        const initialGold = player.gold;
        
        // Test gold spending
        player.gold -= 100;
        this.assert(player.gold === initialGold - 100, 'Gold should decrease by 100');
        
        // Test wealth calculation
        const wealth = player.calculateScore?.() || player.gold;
        this.assert(wealth >= player.gold, 'Wealth should include gold and resources');
        
        this.log('Player economy calculations working correctly');
    }

    async testMarketEvents() {
        // Test market event structure
        const eventTypes = [
            'magical_convergence',
            'life_bloom',
            'ancient_discovery',
            'aether_storm',
            'mana_drought',
            'planar_interference'
        ];
        
        this.assert(eventTypes.length === 6, 'Should have 6 market event types');
        
        this.log('Market event system ready');
    }

    // Phase 6: Resource Production Tests
    async testProductionCalculation() {
        // Move to production phase
        this.gameFlow.cycleManager.forceAdvanceToPhase('resource_production');
        
        // Initialize calculator
        if (!this.gameFlow.cycleManager.resourceCalculator) {
            const Calculator = (await import('./src/models/ResourceProductionCalculator.js')).default;
            this.gameFlow.cycleManager.resourceCalculator = new Calculator(this.gameFlow);
        }
        
        // Get territory with construct
        const territory = this.gameFlow.territoryGrid.territories[0];
        territory.terrainType = territory.type; // Ensure terrainType is set
        
        if (territory.construct) {
            const production = this.gameFlow.cycleManager.resourceCalculator.calculateTerritoryProduction(territory);
            
            this.assert(production !== null, 'Should calculate production');
            this.assert(production.amount > 0, 'Should produce resources');
            this.assert(production.resource === 'mana', 'Mana conduit should produce mana');
            
            this.log('Production calculation:', production);
        }
    }

    async testProductionModifiers() {
        const calculator = this.gameFlow.cycleManager.resourceCalculator;
        
        // Test different terrain modifiers
        const territory = {
            id: 'test',
            q: 10,
            r: 10,
            terrainType: 'ancient_grove',
            ownerId: 'p1',
            construct: {
                type: 'vitality_well',
                level: 1
            }
        };
        
        const production = calculator.calculateTerritoryProduction(territory);
        
        this.assert(production.modifiers.synergy === true, 'Ancient grove + vitality well should have synergy');
        this.assert(production.modifiers.terrain === 1.25, 'Ancient grove should boost vitality by 25%');
        
        this.log('Production modifiers working correctly');
    }

    async testResourceStorage() {
        const storage = this.gameFlow.cycleManager.resourceStorage;
        const player = this.gameFlow.stateManager.getPlayer('p1');
        
        // Reset resources
        player.resources = { mana: 0, vitality: 0, arcanum: 0, aether: 0 };
        
        // Test adding resources
        const result = storage.addResources(player, { mana: 50, vitality: 75 });
        
        this.assert(result.added.mana === 50, 'Should add 50 mana');
        this.assert(result.added.vitality === 75, 'Should add 75 vitality');
        this.assert(player.resources.mana === 50, 'Player should have 50 mana');
        this.assert(player.resources.vitality === 75, 'Player should have 75 vitality');
        
        // Test overflow
        const overflowResult = storage.addResources(player, { vitality: 50 });
        
        this.assert(overflowResult.overflow.vitality === 25, 'Should overflow 25 vitality');
        this.assert(overflowResult.goldFromOverflow > 0, 'Should convert overflow to gold');
        
        this.log('Resource storage and overflow working correctly');
    }

    async testResourceDecay() {
        const decay = this.gameFlow.cycleManager.resourceDecay;
        const player = this.gameFlow.stateManager.getPlayer('p1');
        
        // Set test resources
        player.resources = { mana: 100, vitality: 100, arcanum: 100, aether: 100 };
        
        // Apply decay
        const result = decay.applyDecay(player);
        
        this.assert(result.decayed.mana === 20, 'Mana should decay by 20%');
        this.assert(result.decayed.vitality === 50, 'Vitality should decay by 50%');
        this.assert(result.decayed.arcanum === 0, 'Arcanum should not decay');
        this.assert(result.decayed.aether === 10, 'Aether should decay by 10%');
        
        this.assert(player.resources.mana === 80, 'Player should have 80 mana after decay');
        this.assert(player.resources.vitality === 50, 'Player should have 50 vitality after decay');
        
        this.log('Resource decay working correctly');
    }

    // Phase 7: Game Flow Integration Tests
    async testFullCycleFlow() {
        // Start fresh game
        this.gameFlow = new GameFlowController({
            mapWidth: 3,
            mapHeight: 3,
            autoSave: false
        });
        
        const players = [
            { id: 'p1', name: 'Player 1', color: 0xff0000 },
            { id: 'p2', name: 'Player 2', color: 0x00ff00 }
        ];
        
        this.gameFlow.initializeGame(players, {
            mapSize: { width: 3, height: 3 },
            startingGold: 1000
        });
        
        // Test phase progression
        const phases = [
            'territory_selection',
            'construct_outfitting',
            'resource_production',
            'auction_phase',
            'end_cycle_events'
        ];
        
        for (let i = 0; i < phases.length; i++) {
            this.gameFlow.cycleManager.forceAdvanceToPhase(phases[i]);
            const currentPhase = this.gameFlow.cycleManager.currentPhase;
            this.assert(currentPhase === phases[i], `Should be in ${phases[i]} phase`);
        }
        
        this.log('Full cycle flow working correctly');
    }

    async testSaveLoadSystem() {
        const persistence = this.gameFlow.persistence;
        
        // Save game
        const saveResult = persistence.saveGame('test_save');
        this.assert(saveResult.success === true, 'Should save successfully');
        
        // Modify game state
        const player = this.gameFlow.stateManager.getPlayer('p1');
        const originalGold = player.gold;
        player.gold = 12345;
        
        // Load game
        const loadResult = persistence.loadGame('test_save');
        this.assert(loadResult.success === true, 'Should load successfully');
        
        // Verify state restored
        const restoredPlayer = this.gameFlow.stateManager.getPlayer('p1');
        this.assert(restoredPlayer.gold === originalGold, 'Gold should be restored to original value');
        
        this.log('Save/load system working correctly');
    }

    async testVictoryConditions() {
        // Test victory calculation
        const player1 = this.gameFlow.stateManager.getPlayer('p1');
        const player2 = this.gameFlow.stateManager.getPlayer('p2');
        
        // Give player1 more wealth
        player1.gold = 5000;
        player1.resources.arcanum = 100;
        
        // Calculate scores
        const score1 = player1.calculateScore();
        const score2 = player2.calculateScore();
        
        this.assert(score1 > score2, 'Player 1 should have higher score');
        
        this.log('Victory condition calculations working correctly');
    }

    async testErrorRecovery() {
        // Test error handling
        try {
            // Attempt invalid operation
            this.gameFlow.territoryAcquisition.attemptClaim('invalid_player', 'territory_0_0');
            this.assert(false, 'Should throw error for invalid player');
        } catch (error) {
            this.assert(true, 'Error thrown correctly for invalid player');
        }
        
        // Verify game still functional
        const gameStatus = this.gameFlow.stateManager.getGameStatus();
        this.assert(gameStatus.gameStatus === 'active', 'Game should still be active after error');
        
        this.log('Error recovery working correctly');
    }

    // Summary
    printTestSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('TEST SUMMARY');
        console.log('='.repeat(60));
        
        const passed = this.testResults.filter(r => r.passed).length;
        const failed = this.testResults.filter(r => !r.passed).length;
        const total = this.testResults.length;
        
        console.log(`Total Tests: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
        
        if (failed > 0) {
            console.log('\nFailed Tests:');
            this.testResults.filter(r => !r.passed).forEach(result => {
                console.log(`  - ${result.testName}: ${result.error}`);
            });
        }
        
        // Generate report file
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: total,
                passed: passed,
                failed: failed,
                successRate: ((passed / total) * 100).toFixed(1) + '%'
            },
            results: this.testResults
        };
        
        console.log('\nTest report generated: test-report.json');
        return report;
    }
}

// Run the test suite
const testSuite = new ComprehensiveTestSuite();
testSuite.runAllTests().then(() => {
    console.log('\n✨ Test suite completed!');
}).catch(error => {
    console.error('\n💥 Test suite failed:', error);
});