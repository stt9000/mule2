/**
 * Simple integration test for game flow components only
 * Tests the new Phase 2 Step 4 components without dependencies on existing models
 */

import GameCycleManager from './src/models/GameCycleManager.js';
import TurnManager from './src/models/TurnManager.js';
import TimeManager from './src/models/TimeManager.js';
import GameStateManager from './src/models/GameStateManager.js';
import GamePersistence from './src/models/GamePersistence.js';
import GameFlowController from './src/models/GameFlowController.js';

class SimpleFlowTest {
    constructor() {
        this.testResults = [];
    }

    log(message) {
        console.log(`[TEST] ${message}`);
        this.testResults.push(message);
    }

    async runAllTests() {
        console.log('=== Simple Game Flow Tests ===\n');
        
        try {
            await this.testIndividualComponents();
            await this.testFlowController();
            
            this.log('✅ All simple flow tests passed!');
        } catch (error) {
            this.log(`❌ Test failed: ${error.message}`);
            console.error(error);
        }
        
        console.log('\n=== Test Results ===');
        this.testResults.forEach(result => console.log(result));
    }

    async testIndividualComponents() {
        this.log('Testing individual components...');
        
        // Test GameCycleManager
        const cycleManager = new GameCycleManager();
        if (cycleManager.currentCycle !== 1) {
            throw new Error('CycleManager not initialized correctly');
        }
        this.log('  ✅ GameCycleManager created');
        
        // Test TurnManager
        const players = [
            { id: 'p1', name: 'Player1', gold: 1000, resources: {}, territories: [], constructs: [] },
            { id: 'p2', name: 'Player2', gold: 800, resources: {}, territories: [], constructs: [] }
        ];
        const turnManager = new TurnManager(players);
        turnManager.calculateTurnOrder();
        if (turnManager.turnOrder.length !== 2) {
            throw new Error('TurnManager not handling players correctly');
        }
        this.log('  ✅ TurnManager created and calculated turn order');
        
        // Test TimeManager
        const timeManager = new TimeManager();
        timeManager.startPhaseTimer('test_phase', 1);
        setTimeout(() => timeManager.clearCurrentTimer(), 100);
        this.log('  ✅ TimeManager created and started timer');
        
        // Test GameStateManager
        const stateManager = new GameStateManager();
        const initResult = stateManager.initializeGame(players, { startingGold: 1000 });
        if (!initResult) {
            throw new Error('StateManager failed to initialize');
        }
        this.log('  ✅ GameStateManager created and initialized');
        
        // Test GamePersistence
        const persistence = new GamePersistence('memory'); // Use memory storage for testing
        const saveResult = await persistence.saveGame(stateManager.gameState, 'test');
        if (!saveResult.success) {
            throw new Error('Persistence failed to save');
        }
        const loadResult = await persistence.loadGame('test');
        if (!loadResult.success) {
            throw new Error('Persistence failed to load');
        }
        this.log('  ✅ GamePersistence created and tested save/load');
    }

    async testFlowController() {
        this.log('Testing GameFlowController integration...');
        
        const flowController = new GameFlowController({ autoSave: false, storageType: 'memory' });
        
        // Test initialization
        const players = [
            { id: 'player1', name: 'Alice' },
            { id: 'player2', name: 'Bob' }
        ];
        
        const initResult = await flowController.initializeGame(players, { maxCycles: 2 });
        if (!initResult.success) {
            throw new Error(`FlowController initialization failed: ${initResult.error}`);
        }
        this.log('  ✅ GameFlowController initialized successfully');
        
        // Test status retrieval
        const status = flowController.getGameStatus();
        if (!status.isInitialized) {
            throw new Error('FlowController not marked as initialized');
        }
        if (status.playerCount !== 2) {
            throw new Error(`Expected 2 players, got ${status.playerCount}`);
        }
        this.log('  ✅ GameFlowController status correct');
        
        // Test phase advancement
        const initialPhase = status.currentPhase;
        flowController.cycleManager.advancePhase();
        const newStatus = flowController.getGameStatus();
        if (newStatus.currentPhase === initialPhase) {
            throw new Error('Phase did not advance');
        }
        this.log('  ✅ Phase advancement working');
        
        // Test event system
        let eventReceived = false;
        flowController.on('test.event', () => {
            eventReceived = true;
        });
        flowController.broadcastEvent('test.event');
        if (!eventReceived) {
            throw new Error('Event system not working');
        }
        this.log('  ✅ Event system working');
        
        // Test save/load
        const saveResult = await flowController.saveGame('integration_test');
        if (!saveResult.success) {
            throw new Error(`Save failed: ${saveResult.error}`);
        }
        
        const loadResult = await flowController.loadGame('integration_test');
        if (!loadResult.success) {
            throw new Error(`Load failed: ${loadResult.error}`);
        }
        this.log('  ✅ Save/load working');
        
        // Test cleanup
        flowController.destroy();
        this.log('  ✅ GameFlowController destroyed cleanly');
    }
}

// Run the tests
const test = new SimpleFlowTest();
test.runAllTests().catch(console.error);