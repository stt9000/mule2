/**
 * Test script for turn order calculation fix
 */

import { GameFlowController, TurnManager } from './src/models/index.js';

async function testTurnOrderFix() {
    console.log('🧪 Testing Turn Order Calculation Fix...\n');
    
    try {
        // Test players with specific gold amounts for M.U.L.E. poorest-first rule
        const testPlayers = [
            { id: 'player1', name: 'Alice', gold: 1200 },   // Richest (should go last)
            { id: 'player2', name: 'Bob', gold: 800 },      // Second poorest
            { id: 'player3', name: 'Charlie', gold: 1000 }, // Second richest
            { id: 'player4', name: 'Diana', gold: 600 }     // Poorest (should go first)
        ];
        
        console.log('1. Testing direct TurnManager...');
        const turnManager = new TurnManager(testPlayers);
        
        console.log('\n   Initial players:');
        testPlayers.forEach(p => console.log(`   - ${p.name}: ${p.gold} gold`));
        
        console.log('\n   Calculating turn order...');
        turnManager.calculateTurnOrder();
        
        const expectedOrder = ['Diana', 'Bob', 'Charlie', 'Alice'];
        const actualOrder = turnManager.turnOrder.map(p => p.name);
        
        console.log('\n   Expected order (poorest first):', expectedOrder.join(' → '));
        console.log('   Actual order:', actualOrder.join(' → '));
        
        const directTestPassed = JSON.stringify(expectedOrder) === JSON.stringify(actualOrder);
        console.log('   Direct test result:', directTestPassed ? '✅ PASSED' : '❌ FAILED');
        
        console.log('\n2. Testing through GameFlowController...');
        const controller = new GameFlowController({ 
            autoSave: false, 
            storageType: 'memory' 
        });
        
        const initResult = await controller.initializeGame(testPlayers);
        console.log('   Game initialization:', initResult.success ? '✅ SUCCESS' : '❌ FAILED');
        
        // Check if players maintain their gold values
        const gameState = controller.getGameStatus();
        console.log('\n   Player gold values after initialization:');
        
        // Access players from the state manager directly
        const players = controller.stateManager.gameState.players;
        if (players && players.length > 0) {
            players.forEach(p => {
                console.log(`   - ${p.name}: ${p.gold} gold`);
            });
        } else {
            console.log('   No players found in game state');
            console.log('   Game state keys:', Object.keys(gameState));
        }
        
        // Force turn order recalculation
        controller.turnManager.calculateTurnOrder();
        
        const controllerOrder = controller.turnManager.turnOrder.map(p => p.name);
        console.log('\n   Controller turn order:', controllerOrder.join(' → '));
        
        const controllerTestPassed = JSON.stringify(expectedOrder) === JSON.stringify(controllerOrder);
        console.log('   Controller test result:', controllerTestPassed ? '✅ PASSED' : '❌ FAILED');
        
        console.log('\n3. Testing wealth calculation details...');
        const wealthDetails = controller.turnManager.turnOrder.map(player => ({
            name: player.name,
            gold: player.gold,
            territories: (player.territories || []).length,
            constructs: (player.constructs || []).length,
            totalWealth: controller.turnManager.calculatePlayerWealth(player)
        }));
        
        console.log('   Wealth breakdown:');
        wealthDetails.forEach(w => {
            console.log(`   - ${w.name}: ${w.totalWealth} total (${w.gold} gold + ${w.territories * 50} territories + ${w.constructs * 75} constructs)`);
        });
        
        console.log('\n4. Testing with modified wealth...');
        // Add a territory to Alice to ensure she stays last
        controller.stateManager.gameState.players[0].territories = ['territory1'];
        
        // Recalculate
        controller.turnManager.calculateTurnOrder();
        const modifiedOrder = controller.turnManager.turnOrder.map(p => p.name);
        console.log('   Modified order (Alice +territory):', modifiedOrder.join(' → '));
        
        // Alice should still be last
        const aliceStillLast = modifiedOrder[modifiedOrder.length - 1] === 'Alice';
        console.log('   Alice still last with territory:', aliceStillLast ? '✅ YES' : '❌ NO');
        
        // Cleanup
        controller.destroy();
        
        console.log('\n🎯 Turn Order Fix Test Summary:');
        const allTestsPassed = directTestPassed && controllerTestPassed && aliceStillLast;
        console.log('   Overall result:', allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
        
        if (!allTestsPassed) {
            console.log('\n   Failed tests:');
            if (!directTestPassed) console.log('   - Direct TurnManager test');
            if (!controllerTestPassed) console.log('   - GameFlowController test');
            if (!aliceStillLast) console.log('   - Wealth modification test');
        }
        
        return allTestsPassed;
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.error(error.stack);
        return false;
    }
}

// Run the test
testTurnOrderFix().then(success => {
    console.log('\n' + '='.repeat(50));
    console.log('Turn Order Fix Test:', success ? '✅ PASSED' : '❌ FAILED');
    process.exit(success ? 0 : 1);
}).catch(console.error);