/**
 * Concise verification test for all three critical fixes
 */

import { GameFlowController, TurnManager, TimeManager } from './src/models/index.js';

async function verifyAllFixes() {
    console.log('🎯 Verifying All Critical Fixes...\n');
    
    const results = {
        saveLoad: false,
        turnOrder: false,
        timerEvents: false
    };
    
    try {
        // Test 1: Save/Load Fix
        console.log('1. Testing Save/Load Version Handling...');
        const controller = new GameFlowController({ autoSave: false, storageType: 'memory' });
        
        const testPlayers = [
            { id: 'player1', name: 'Alice', gold: 1200 },
            { id: 'player2', name: 'Bob', gold: 800 }
        ];
        
        await controller.initializeGame(testPlayers);
        controller.stateManager.updateGameState({ testValue: 123 });
        
        const saveResult = await controller.saveGame('fix_test');
        const loadResult = await controller.loadGame('fix_test');
        
        results.saveLoad = saveResult.success && loadResult.success;
        console.log('   Save/Load Fix:', results.saveLoad ? '✅ PASSED' : '❌ FAILED');
        
        // Test 2: Turn Order Fix
        console.log('\n2. Testing Turn Order Calculation...');
        const turnTestPlayers = [
            { id: 'player1', name: 'Alice', gold: 1200 },   // Should be last
            { id: 'player2', name: 'Bob', gold: 800 },
            { id: 'player3', name: 'Charlie', gold: 1000 },
            { id: 'player4', name: 'Diana', gold: 600 }     // Should be first
        ];
        
        const turnManager = new TurnManager(turnTestPlayers);
        turnManager.calculateTurnOrder();
        
        const expectedOrder = ['Diana', 'Bob', 'Charlie', 'Alice'];
        const actualOrder = turnManager.turnOrder.map(p => p.name);
        
        results.turnOrder = JSON.stringify(expectedOrder) === JSON.stringify(actualOrder);
        console.log('   Expected:', expectedOrder.join(' → '));
        console.log('   Actual:  ', actualOrder.join(' → '));
        console.log('   Turn Order Fix:', results.turnOrder ? '✅ PASSED' : '❌ FAILED');
        
        // Test 3: Timer Events Fix (with minimal timeout)
        console.log('\n3. Testing Timer Event Broadcasting...');
        const timeManager = new TimeManager();
        let eventsReceived = 0;
        
        timeManager.on('timer.started', () => eventsReceived++);
        timeManager.on('timer.update', () => eventsReceived++);
        timeManager.on('timer.expired', () => eventsReceived++);
        
        timeManager.startPhaseTimer('test_phase', 1); // 1 second timer
        
        // Wait for timer to complete
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        results.timerEvents = eventsReceived >= 3; // Should have start + updates + expired
        console.log('   Events received:', eventsReceived);
        console.log('   Timer Events Fix:', results.timerEvents ? '✅ PASSED' : '❌ FAILED');
        
        // Cleanup
        timeManager.clearAllTimers();
        controller.destroy();
        
        // Overall results
        console.log('\n🏆 FINAL VERIFICATION RESULTS:');
        console.log('================================');
        console.log('Save/Load Version Handling:', results.saveLoad ? '✅ FIXED' : '❌ FAILED');
        console.log('Turn Order M.U.L.E. Rules: ', results.turnOrder ? '✅ FIXED' : '❌ FAILED');
        console.log('Timer Event Broadcasting: ', results.timerEvents ? '✅ FIXED' : '❌ FAILED');
        
        const allFixed = results.saveLoad && results.turnOrder && results.timerEvents;
        console.log('\nOverall Status:', allFixed ? '✅ ALL FIXES SUCCESSFUL' : '❌ SOME FIXES FAILED');
        
        if (allFixed) {
            console.log('\n🎉 Ready for production! All critical issues have been resolved.');
            console.log('The Phase 2, Step 4 implementation is now complete and functional.');
        } else {
            console.log('\n⚠️  Some issues remain. Check individual test results above.');
        }
        
        return allFixed;
        
    } catch (error) {
        console.error('❌ Verification failed with error:', error.message);
        return false;
    }
}

// Run verification
verifyAllFixes().then(success => {
    console.log('\n' + '='.repeat(60));
    console.log('ISSUE RESOLUTION PLAN EXECUTION:', success ? '✅ COMPLETED' : '❌ INCOMPLETE');
    process.exit(success ? 0 : 1);
}).catch(console.error);