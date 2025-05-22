/**
 * Test script for save/load version handling fix
 */

import { GameFlowController } from './src/models/index.js';

async function testSaveLoadFix() {
    console.log('🧪 Testing Save/Load Version Handling Fix...\n');
    
    try {
        // Create test controller
        const controller = new GameFlowController({ 
            autoSave: false, 
            storageType: 'memory' 
        });
        
        // Initialize with test players
        const testPlayers = [
            { id: 'player1', name: 'Alice', gold: 1200 },
            { id: 'player2', name: 'Bob', gold: 800 }
        ];
        
        console.log('1. Initializing game...');
        const initResult = await controller.initializeGame(testPlayers);
        console.log('   Init result:', initResult.success ? '✅ SUCCESS' : '❌ FAILED');
        
        // Get initial state
        const initialStatus = controller.getGameStatus();
        console.log('   Initial cycle:', initialStatus.currentCycle);
        console.log('   Initial phase:', initialStatus.currentPhase);
        console.log('   Game version:', controller.stateManager.gameState.version);
        
        // Make some changes to verify state preservation
        controller.cycleManager.advancePhase();
        controller.stateManager.updateGameState({ testValue: 12345 });
        
        const modifiedStatus = controller.getGameStatus();
        console.log('   Modified phase:', modifiedStatus.currentPhase);
        
        console.log('\n2. Testing save operation...');
        const saveResult = await controller.saveGame('version_test');
        console.log('   Save result:', saveResult.success ? '✅ SUCCESS' : '❌ FAILED');
        if (saveResult.success) {
            console.log('   Save slot:', saveResult.slotName);
            console.log('   Storage type:', saveResult.storageType);
        } else {
            console.log('   Save error:', saveResult.error);
        }
        
        // Modify state again to verify load restores correct state
        controller.cycleManager.advancePhase();
        controller.stateManager.updateGameState({ testValue: 67890 });
        
        console.log('\n3. Testing load operation...');
        const loadResult = await controller.loadGame('version_test');
        console.log('   Load result:', loadResult.success ? '✅ SUCCESS' : '❌ FAILED');
        if (!loadResult.success) {
            console.log('   Load error:', loadResult.error);
        }
        
        // Verify state was restored
        const restoredStatus = controller.getGameStatus();
        console.log('   Restored cycle:', restoredStatus.currentCycle);
        console.log('   Restored phase:', restoredStatus.currentPhase);
        console.log('   Test value:', controller.stateManager.gameState.testValue);
        
        // Check if test value was restored to 12345 (not 67890)
        const stateRestored = controller.stateManager.gameState.testValue === 12345;
        console.log('   State properly restored:', stateRestored ? '✅ YES' : '❌ NO');
        
        console.log('\n4. Testing save slot management...');
        await controller.saveGame('test_slot_2');
        await controller.saveGame('test_slot_3');
        
        const saveSlots = await controller.getSaveSlots();
        console.log('   Total save slots:', saveSlots.length);
        console.log('   Save slots:', saveSlots.map(s => s.name).join(', '));
        
        // Test delete
        const deleteResult = await controller.deleteSave('test_slot_2');
        console.log('   Delete result:', deleteResult.success ? '✅ SUCCESS' : '❌ FAILED');
        
        const slotsAfterDelete = await controller.getSaveSlots();
        console.log('   Slots after delete:', slotsAfterDelete.length);
        
        // Cleanup
        controller.destroy();
        
        console.log('\n🎯 Save/Load Fix Test Summary:');
        const allTestsPassed = saveResult.success && loadResult.success && stateRestored && deleteResult.success;
        console.log('   Overall result:', allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
        
        return allTestsPassed;
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.error(error.stack);
        return false;
    }
}

// Run the test
testSaveLoadFix().then(success => {
    console.log('\n' + '='.repeat(50));
    console.log('Save/Load Fix Test:', success ? '✅ PASSED' : '❌ FAILED');
    process.exit(success ? 0 : 1);
}).catch(console.error);