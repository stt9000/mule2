/**
 * Quick Test Runner - Tests core functionality without hanging
 */

import { GameFlowController } from './src/models/index.js';

async function runQuickTests() {
    let passed = 0;
    let failed = 0;
    
    console.log('🚀 Running Quick Core Tests\n');
    
    // Test 1: Basic Initialization
    try {
        console.log('Test 1: Game Initialization...');
        const gameFlow = new GameFlowController({
            mapWidth: 3,
            mapHeight: 3,
            autoSave: false
        });
        
        if (!gameFlow || !gameFlow.stateManager || !gameFlow.cycleManager) {
            throw new Error('Core systems not initialized');
        }
        
        // Initialize game
        const players = [
            { id: 'p1', name: 'Player 1', color: 0xff0000 },
            { id: 'p2', name: 'Player 2', color: 0x00ff00 }
        ];
        
        gameFlow.initializeGame(players, {
            mapSize: { width: 3, height: 3 },
            startingGold: 1000
        });
        
        // Immediately pause to prevent timers
        gameFlow.pauseGame();
        
        console.log('✅ PASSED\n');
        passed++;
    } catch (error) {
        console.log('❌ FAILED:', error.message, '\n');
        failed++;
    }
    
    // Test 2: Resource Production System
    try {
        console.log('Test 2: Resource Production System...');
        
        // Create minimal test setup
        const gameFlow = new GameFlowController({
            mapWidth: 2,
            mapHeight: 2,
            autoSave: false
        });
        
        gameFlow.initializeGame([
            { id: 'p1', name: 'Player 1', color: 0xff0000 }
        ], {
            mapSize: { width: 2, height: 2 },
            startingGold: 1000
        });
        
        gameFlow.pauseGame();
        
        // Setup test territory with construct
        const territory = gameFlow.territoryGrid.territories[0];
        territory.ownerId = 'p1';
        territory.terrainType = territory.type || 'crystalline_cave';
        territory.construct = {
            type: 'mana_conduit',
            level: 1,
            ownerId: 'p1'
        };
        
        // Initialize calculator
        const Calculator = (await import('./src/models/ResourceProductionCalculator.js')).default;
        const calculator = new Calculator(gameFlow);
        
        // Test production calculation
        const production = calculator.calculateTerritoryProduction(territory);
        if (!production || production.amount <= 0) {
            throw new Error('Production calculation failed');
        }
        
        console.log(`  Production result: ${production.amount} ${production.resource}`);
        console.log('✅ PASSED\n');
        passed++;
    } catch (error) {
        console.log('❌ FAILED:', error.message, '\n');
        failed++;
    }
    
    // Test 3: Resource Storage
    try {
        console.log('Test 3: Resource Storage...');
        
        const Storage = (await import('./src/models/ResourceStorage.js')).default;
        const storage = new Storage();
        
        const testPlayer = {
            id: 'test',
            name: 'Test Player',
            gold: 1000,
            resources: { mana: 0, vitality: 0, arcanum: 0, aether: 0 }
        };
        
        // Test adding resources
        const result = storage.addResources(testPlayer, { mana: 50, vitality: 150 });
        
        if (!result.added || result.added.mana !== 50) {
            throw new Error('Storage failed to add resources correctly');
        }
        
        if (!result.overflow || result.overflow.vitality !== 50) {
            throw new Error('Storage overflow not handled correctly');
        }
        
        console.log('  Storage handled correctly with overflow');
        console.log('✅ PASSED\n');
        passed++;
    } catch (error) {
        console.log('❌ FAILED:', error.message, '\n');
        failed++;
    }
    
    // Test 4: Resource Decay
    try {
        console.log('Test 4: Resource Decay...');
        
        const Decay = (await import('./src/models/ResourceDecay.js')).default;
        const decay = new Decay();
        
        const testPlayer = {
            id: 'test',
            name: 'Test Player',
            resources: { mana: 100, vitality: 100, arcanum: 100, aether: 100 }
        };
        
        const result = decay.applyDecay(testPlayer);
        
        if (result.decayed.mana !== 20) {
            throw new Error('Mana decay incorrect (expected 20%)');
        }
        
        if (result.decayed.vitality !== 50) {
            throw new Error('Vitality decay incorrect (expected 50%)');
        }
        
        if (result.decayed.arcanum !== 0) {
            throw new Error('Arcanum should not decay');
        }
        
        console.log('  Decay rates applied correctly');
        console.log('✅ PASSED\n');
        passed++;
    } catch (error) {
        console.log('❌ FAILED:', error.message, '\n');
        failed++;
    }
    
    // Test 5: Territory System
    try {
        console.log('Test 5: Territory System...');
        
        const gameFlow = new GameFlowController({
            mapWidth: 3,
            mapHeight: 3,
            autoSave: false
        });
        
        gameFlow.initializeGame([
            { id: 'p1', name: 'Player 1', color: 0xff0000 },
            { id: 'p2', name: 'Player 2', color: 0x00ff00 }
        ], {
            mapSize: { width: 3, height: 3 },
            startingGold: 1000
        });
        
        gameFlow.pauseGame();
        
        // Test territory claiming
        const territory = gameFlow.territoryGrid.territories[0];
        const result = gameFlow.territoryAcquisition.attemptClaim('p1', territory.id);
        
        if (!result.success) {
            throw new Error('Territory claim failed');
        }
        
        // Test dispute resolution
        gameFlow.territoryAcquisition.attemptClaim('p1', gameFlow.territoryGrid.territories[1].id);
        gameFlow.territoryAcquisition.attemptClaim('p2', gameFlow.territoryGrid.territories[1].id);
        gameFlow.territoryAcquisition.resolveDisputes();
        
        console.log('  Territory claiming and disputes working');
        console.log('✅ PASSED\n');
        passed++;
    } catch (error) {
        console.log('❌ FAILED:', error.message, '\n');
        failed++;
    }
    
    // Test 6: Phase Management
    try {
        console.log('Test 6: Phase Management...');
        
        const gameFlow = new GameFlowController({
            mapWidth: 2,
            mapHeight: 2,
            autoSave: false
        });
        
        gameFlow.initializeGame([
            { id: 'p1', name: 'Player 1', color: 0xff0000 }
        ], {
            mapSize: { width: 2, height: 2 },
            startingGold: 1000
        });
        
        gameFlow.pauseGame();
        
        const startPhase = gameFlow.cycleManager.currentPhase;
        gameFlow.cycleManager.forceAdvanceToPhase('construct_outfitting');
        const newPhase = gameFlow.cycleManager.currentPhase;
        
        if (startPhase === newPhase) {
            throw new Error('Phase did not advance');
        }
        
        console.log(`  Phase advanced from ${startPhase} to ${newPhase}`);
        console.log('✅ PASSED\n');
        passed++;
    } catch (error) {
        console.log('❌ FAILED:', error.message, '\n');
        failed++;
    }
    
    // Summary
    console.log('='.repeat(50));
    console.log('QUICK TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Total: ${passed + failed}`);
    console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    
    // Exit cleanly
    process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runQuickTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
});