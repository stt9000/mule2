/**
 * Test Plan Execution Script
 * Executes all manual tests from the test plan
 */

import { GameFlowController } from './src/models/index.js';

class TestPlanExecutor {
    constructor() {
        this.testResults = [];
        this.currentSuite = '';
        this.flowController = null;
        this.testPlayers = [
            { id: 'player1', name: 'Alice', gold: 1200 },
            { id: 'player2', name: 'Bob', gold: 800 },
            { id: 'player3', name: 'Charlie', gold: 1000 },
            { id: 'player4', name: 'Diana', gold: 600 }
        ];
    }

    log(message, type = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${type}] ${this.currentSuite}: ${message}`;
        console.log(logMessage);
        this.testResults.push({ timestamp, type, suite: this.currentSuite, message });
    }

    pass(testName, details = '') {
        this.log(`✅ PASS: ${testName} ${details}`, 'PASS');
    }

    fail(testName, error, details = '') {
        this.log(`❌ FAIL: ${testName} - ${error} ${details}`, 'FAIL');
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async executeAllTests() {
        console.log('🚀 Starting Test Plan Execution');
        console.log('=====================================\n');

        try {
            await this.testSuite1_GameInitialization();
            await this.testSuite2_GameCycleManagement();
            await this.testSuite3_TurnManagement();
            await this.testSuite4_TimeManagement();
            await this.testSuite5_StateManagement();
            await this.testSuite6_PersistenceSystem();
            await this.testSuite7_EventSystem();
            await this.testSuite8_IntegrationTesting();
            await this.testSuite9_PerformanceTesting();

            this.generateTestReport();
        } catch (error) {
            this.log(`Critical test failure: ${error.message}`, 'ERROR');
            console.error(error);
        }
    }

    async testSuite1_GameInitialization() {
        this.currentSuite = 'Test Suite 1: Game Initialization';
        this.log('Starting Game Initialization tests');

        // Test 1.1: Basic Game Initialization
        try {
            this.flowController = new GameFlowController({ 
                autoSave: false, 
                storageType: 'memory' 
            });

            const result = await this.flowController.initializeGame(this.testPlayers);
            
            if (result.success && result.gameId) {
                this.pass('1.1 Basic Initialization', `GameID: ${result.gameId}`);
            } else {
                this.fail('1.1 Basic Initialization', 'No success or gameId returned');
            }

            const status = this.flowController.getGameStatus();
            
            if (status.isInitialized) {
                this.pass('1.1 Initialization Status', 'Game marked as initialized');
            } else {
                this.fail('1.1 Initialization Status', 'Game not marked as initialized');
            }

            if (status.playerCount === 4) {
                this.pass('1.1 Player Count', `Correct count: ${status.playerCount}`);
            } else {
                this.fail('1.1 Player Count', `Expected 4, got ${status.playerCount}`);
            }

            if (status.currentCycle === 1) {
                this.pass('1.1 Initial Cycle', `Cycle: ${status.currentCycle}`);
            } else {
                this.fail('1.1 Initial Cycle', `Expected 1, got ${status.currentCycle}`);
            }

            if (status.currentPhase === 'territory_selection') {
                this.pass('1.1 Initial Phase', `Phase: ${status.currentPhase}`);
            } else {
                this.fail('1.1 Initial Phase', `Expected territory_selection, got ${status.currentPhase}`);
            }

        } catch (error) {
            this.fail('1.1 Basic Initialization', error.message);
        }

        // Test 1.2: Invalid Initialization
        try {
            const testController = new GameFlowController({ autoSave: false, storageType: 'memory' });
            
            // Empty players test
            const emptyResult = await testController.initializeGame([]);
            if (!emptyResult.success && emptyResult.error.includes('player')) {
                this.pass('1.2 Empty Players', 'Correctly rejected empty player array');
            } else {
                this.fail('1.2 Empty Players', 'Should reject empty player array');
            }

            // Null players test
            try {
                const nullResult = await testController.initializeGame(null);
                this.fail('1.2 Null Players', 'Should have thrown error for null players');
            } catch (nullError) {
                this.pass('1.2 Null Players', 'Correctly threw error for null players');
            }

        } catch (error) {
            this.fail('1.2 Invalid Initialization', error.message);
        }

        this.log('Completed Game Initialization tests\n');
    }

    async testSuite2_GameCycleManagement() {
        this.currentSuite = 'Test Suite 2: Game Cycle Management';
        this.log('Starting Game Cycle Management tests');

        // Test 2.1: Phase Progression
        try {
            const expectedPhases = [
                'territory_selection',
                'construct_outfitting',
                'resource_production', 
                'auction_phase',
                'end_cycle_events',
                'territory_selection' // Back to start of cycle 2
            ];

            let currentPhaseIndex = 0;
            const initialStatus = this.flowController.getGameStatus();
            
            if (initialStatus.currentPhase === expectedPhases[0]) {
                this.pass('2.1 Initial Phase', `Correct starting phase: ${initialStatus.currentPhase}`);
                currentPhaseIndex = 1;
            }

            for (let i = 0; i < 5; i++) {
                this.flowController.cycleManager.advancePhase();
                const status = this.flowController.getGameStatus();
                
                if (status.currentPhase === expectedPhases[currentPhaseIndex]) {
                    this.pass(`2.1 Phase ${i + 1}`, `${status.currentPhase} (Cycle ${status.currentCycle})`);
                } else {
                    this.fail(`2.1 Phase ${i + 1}`, `Expected ${expectedPhases[currentPhaseIndex]}, got ${status.currentPhase}`);
                }
                currentPhaseIndex++;
            }

            // Check cycle increment
            const finalStatus = this.flowController.getGameStatus();
            if (finalStatus.currentCycle === 2) {
                this.pass('2.1 Cycle Increment', `Advanced to cycle ${finalStatus.currentCycle}`);
            } else {
                this.fail('2.1 Cycle Increment', `Expected cycle 2, got ${finalStatus.currentCycle}`);
            }

        } catch (error) {
            this.fail('2.1 Phase Progression', error.message);
        }

        // Test 2.2: Game Completion
        try {
            const shortGameController = new GameFlowController({ autoSave: false, storageType: 'memory' });
            await shortGameController.initializeGame(this.testPlayers.slice(0, 2), { maxCycles: 2 });

            let gameEndEventReceived = false;
            shortGameController.on('game.ended', () => {
                gameEndEventReceived = true;
            });

            // Fast forward to end
            shortGameController.cycleManager.maxCycles = 1;
            shortGameController.cycleManager.currentCycle = 1;
            
            // Advance to trigger game end
            for (let i = 0; i < 5; i++) {
                shortGameController.cycleManager.advancePhase();
            }

            const endStatus = shortGameController.getGameStatus();
            if (endStatus.gameStatus === 'ended') {
                this.pass('2.2 Game Completion', 'Game marked as ended');
            } else {
                this.fail('2.2 Game Completion', `Expected ended status, got ${endStatus.gameStatus}`);
            }

            if (gameEndEventReceived) {
                this.pass('2.2 Game End Event', 'Game end event fired');
            } else {
                this.fail('2.2 Game End Event', 'Game end event not received');
            }

        } catch (error) {
            this.fail('2.2 Game Completion', error.message);
        }

        this.log('Completed Game Cycle Management tests\n');
    }

    async testSuite3_TurnManagement() {
        this.currentSuite = 'Test Suite 3: Turn Management';
        this.log('Starting Turn Management tests');

        // Test 3.1: Turn Order Calculation
        try {
            this.flowController.turnManager.calculateTurnOrder();
            const turnOrder = this.flowController.turnManager.turnOrder;

            if (turnOrder.length === 4) {
                this.pass('3.1 Turn Order Length', `Correct number of players: ${turnOrder.length}`);
            } else {
                this.fail('3.1 Turn Order Length', `Expected 4 players, got ${turnOrder.length}`);
            }

            // Check order is poorest first (Diana 600, Bob 800, Charlie 1000, Alice 1200)
            const expectedOrder = ['Diana', 'Bob', 'Charlie', 'Alice'];
            const actualOrder = turnOrder.map(p => p.name);
            
            let orderCorrect = true;
            for (let i = 0; i < expectedOrder.length; i++) {
                if (actualOrder[i] !== expectedOrder[i]) {
                    orderCorrect = false;
                    break;
                }
            }

            if (orderCorrect) {
                this.pass('3.1 Turn Order Sequence', `Correct order: ${actualOrder.join(' → ')}`);
            } else {
                this.fail('3.1 Turn Order Sequence', `Expected ${expectedOrder.join(' → ')}, got ${actualOrder.join(' → ')}`);
            }

        } catch (error) {
            this.fail('3.1 Turn Order Calculation', error.message);
        }

        // Test 3.2: Player Action Execution
        try {
            const testAction = { type: 'claim_territory', territoryId: 'test1' };
            const actionResult = this.flowController.executePlayerAction('player1', testAction);
            
            // We expect this to fail since the action logic isn't implemented yet, but it should be handled gracefully
            if (typeof actionResult === 'boolean') {
                this.pass('3.2 Action Execution', 'Action execution method works (returned boolean)');
            } else {
                this.fail('3.2 Action Execution', 'Action execution should return boolean');
            }

            const playerActions = this.flowController.stateManager.getPlayerActions('player1');
            if (Array.isArray(playerActions)) {
                this.pass('3.2 Action Tracking', `Action tracking works (${playerActions.length} actions logged)`);
            } else {
                this.fail('3.2 Action Tracking', 'Action tracking not working');
            }

        } catch (error) {
            this.fail('3.2 Player Action Execution', error.message);
        }

        this.log('Completed Turn Management tests\n');
    }

    async testSuite4_TimeManagement() {
        this.currentSuite = 'Test Suite 4: Time Management';
        this.log('Starting Time Management tests');

        // Test 4.1: Phase Timers
        try {
            let timerUpdateCount = 0;
            let timerExpiredReceived = false;

            const updateHandler = (data) => {
                timerUpdateCount++;
                this.log(`Timer update: ${data.remainingTime}s (${data.urgencyLevel})`);
            };

            const expiredHandler = (data) => {
                timerExpiredReceived = true;
                this.log(`Timer expired for phase: ${data.phase}`);
            };

            this.flowController.timeManager.on('timer.update', updateHandler);
            this.flowController.timeManager.on('timer.expired', expiredHandler);

            this.flowController.timeManager.startPhaseTimer('test_phase', 3); // 3 second timer

            await this.sleep(4000); // Wait 4 seconds

            this.flowController.timeManager.off('timer.update', updateHandler);
            this.flowController.timeManager.off('timer.expired', expiredHandler);

            if (timerUpdateCount > 0) {
                this.pass('4.1 Timer Updates', `Received ${timerUpdateCount} timer updates`);
            } else {
                this.fail('4.1 Timer Updates', 'No timer updates received');
            }

            if (timerExpiredReceived) {
                this.pass('4.1 Timer Expiration', 'Timer expiration event received');
            } else {
                this.fail('4.1 Timer Expiration', 'Timer expiration event not received');
            }

        } catch (error) {
            this.fail('4.1 Phase Timers', error.message);
        }

        // Test 4.2: Player Time Banks
        try {
            this.flowController.timeManager.setPlayerTimeBank('player1', 60); // 1 minute
            const timeBank = this.flowController.timeManager.getPlayerTimeBank('player1');

            if (timeBank === 60000) { // Should be in milliseconds
                this.pass('4.2 Time Bank Setting', `Time bank set to ${timeBank / 1000}s`);
            } else {
                this.fail('4.2 Time Bank Setting', `Expected 60000ms, got ${timeBank}ms`);
            }

            this.flowController.timeManager.startPlayerTimer('player1', 'territory_selection', 2);
            await this.sleep(100); // Brief wait

            const timerStatus = this.flowController.timeManager.getTimerStatus();
            if (timerStatus.playerTimers && timerStatus.playerTimers['player1']) {
                this.pass('4.2 Player Timer', 'Player timer started successfully');
            } else {
                this.fail('4.2 Player Timer', 'Player timer not started');
            }

            this.flowController.timeManager.clearPlayerTimer('player1');

        } catch (error) {
            this.fail('4.2 Player Time Banks', error.message);
        }

        // Test 4.3: Pause and Resume
        try {
            this.flowController.timeManager.startPhaseTimer('pause_test', 10);
            await this.sleep(100);

            this.flowController.timeManager.pauseAllTimers();
            const pauseStatus = this.flowController.timeManager.getTimerStatus();

            if (pauseStatus.isPaused) {
                this.pass('4.3 Timer Pause', 'Timers paused successfully');
            } else {
                this.fail('4.3 Timer Pause', 'Timers not paused');
            }

            await this.sleep(500); // Wait while paused

            this.flowController.timeManager.resumeAllTimers();
            const resumeStatus = this.flowController.timeManager.getTimerStatus();

            if (!resumeStatus.isPaused) {
                this.pass('4.3 Timer Resume', 'Timers resumed successfully');
            } else {
                this.fail('4.3 Timer Resume', 'Timers not resumed');
            }

            this.flowController.timeManager.clearAllTimers();

        } catch (error) {
            this.fail('4.3 Pause and Resume', error.message);
        }

        this.log('Completed Time Management tests\n');
    }

    async testSuite5_StateManagement() {
        this.currentSuite = 'Test Suite 5: State Management';
        this.log('Starting State Management tests');

        // Test 5.1: State Validation
        try {
            const isValid = this.flowController.stateManager.validateGameState();
            
            if (isValid) {
                this.pass('5.1 State Validation', 'Current state is valid');
            } else {
                const errors = this.flowController.stateManager.getValidationErrors();
                this.fail('5.1 State Validation', `Validation errors: ${errors.join(', ')}`);
            }

            // Test invalid state update
            const invalidResult = this.flowController.stateManager.updateGameState({
                currentCycle: -1 // Invalid cycle
            });

            if (!invalidResult) {
                this.pass('5.1 Invalid State Rejection', 'Invalid state update rejected');
            } else {
                this.fail('5.1 Invalid State Rejection', 'Invalid state update was accepted');
            }

        } catch (error) {
            this.fail('5.1 State Validation', error.message);
        }

        // Test 5.2: State History
        try {
            const snapshotId = this.flowController.stateManager.saveStateSnapshot('Test snapshot');
            
            if (snapshotId) {
                this.pass('5.2 State Snapshot', `Snapshot saved with ID: ${snapshotId}`);
            } else {
                this.fail('5.2 State Snapshot', 'Snapshot not saved');
            }

            // Make changes
            this.flowController.stateManager.updateGameState({ testValue: 123 });

            // Check history
            const history = this.flowController.stateManager.getStateHistory();
            if (history.length > 0) {
                this.pass('5.2 State History', `History contains ${history.length} snapshots`);
            } else {
                this.fail('5.2 State History', 'No history snapshots found');
            }

            // Test restoration
            const restored = this.flowController.stateManager.restoreStateSnapshot(snapshotId);
            if (restored) {
                this.pass('5.2 State Restoration', 'State restored successfully');
            } else {
                this.fail('5.2 State Restoration', 'State restoration failed');
            }

        } catch (error) {
            this.fail('5.2 State History', error.message);
        }

        // Test 5.3: Action Logging
        try {
            const actionId = this.flowController.stateManager.logPlayerAction('player1', {
                type: 'test_action',
                data: 'test_data'
            });

            if (actionId) {
                this.pass('5.3 Action Logging', `Action logged with ID: ${actionId}`);
            } else {
                this.fail('5.3 Action Logging', 'Action not logged');
            }

            const playerActions = this.flowController.stateManager.getPlayerActions('player1');
            const testAction = playerActions.find(action => action.id === actionId);

            if (testAction) {
                this.pass('5.3 Action Retrieval', 'Logged action can be retrieved');
            } else {
                this.fail('5.3 Action Retrieval', 'Logged action not found');
            }

        } catch (error) {
            this.fail('5.3 Action Logging', error.message);
        }

        this.log('Completed State Management tests\n');
    }

    async testSuite6_PersistenceSystem() {
        this.currentSuite = 'Test Suite 6: Persistence System';
        this.log('Starting Persistence System tests');

        // Test 6.1: Save and Load
        try {
            const saveResult = await this.flowController.saveGame('test_save');
            
            if (saveResult.success) {
                this.pass('6.1 Save Game', `Game saved: ${saveResult.slotName}`);
            } else {
                this.fail('6.1 Save Game', `Save failed: ${saveResult.error}`);
            }

            // Modify state slightly
            this.flowController.stateManager.updateGameState({ testLoadValue: 456 });

            const loadResult = await this.flowController.loadGame('test_save');
            
            if (loadResult.success) {
                this.pass('6.1 Load Game', 'Game loaded successfully');
            } else {
                this.fail('6.1 Load Game', `Load failed: ${loadResult.error}`);
            }

        } catch (error) {
            this.fail('6.1 Save and Load', error.message);
        }

        // Test 6.2: Save Slot Management
        try {
            await this.flowController.saveGame('test_save_2');
            await this.flowController.saveGame('test_save_3');

            const slots = await this.flowController.getSaveSlots();
            
            if (slots.length >= 3) {
                this.pass('6.2 Save Slots', `Found ${slots.length} save slots`);
            } else {
                this.fail('6.2 Save Slots', `Expected at least 3 slots, found ${slots.length}`);
            }

            const deleteResult = await this.flowController.deleteSave('test_save_2');
            
            if (deleteResult.success) {
                this.pass('6.2 Delete Save', 'Save slot deleted successfully');
            } else {
                this.fail('6.2 Delete Save', 'Save slot deletion failed');
            }

        } catch (error) {
            this.fail('6.2 Save Slot Management', error.message);
        }

        this.log('Completed Persistence System tests\n');
    }

    async testSuite7_EventSystem() {
        this.currentSuite = 'Test Suite 7: Event System';
        this.log('Starting Event System tests');

        // Test 7.1: Event Broadcasting
        try {
            const eventLog = [];

            const phaseHandler = (data) => {
                eventLog.push(`Phase started: ${data.phase}`);
            };

            const testHandler = (data) => {
                eventLog.push(`Test event: ${data.message}`);
            };

            this.flowController.on('phase.started', phaseHandler);
            this.flowController.on('test.event', testHandler);

            // Trigger events
            this.flowController.broadcastEvent('test.event', { message: 'hello' });
            this.flowController.cycleManager.advancePhase(); // Should trigger phase.started

            if (eventLog.length >= 2) {
                this.pass('7.1 Event Broadcasting', `Received ${eventLog.length} events: ${eventLog.join(', ')}`);
            } else {
                this.fail('7.1 Event Broadcasting', `Only received ${eventLog.length} events`);
            }

            // Test unsubscription
            this.flowController.off('test.event', testHandler);
            this.flowController.broadcastEvent('test.event', { message: 'should not receive' });

            // Should not have added new event
            const eventsAfterUnsub = eventLog.filter(e => e.includes('should not receive'));
            if (eventsAfterUnsub.length === 0) {
                this.pass('7.1 Event Unsubscription', 'Event unsubscription works');
            } else {
                this.fail('7.1 Event Unsubscription', 'Still receiving events after unsubscription');
            }

        } catch (error) {
            this.fail('7.1 Event Broadcasting', error.message);
        }

        // Test 7.2: Event Error Handling
        try {
            const errorThrowingHandler = () => {
                throw new Error('Test error in event handler');
            };

            this.flowController.on('error.test', errorThrowingHandler);
            
            // This should not crash the system
            this.flowController.broadcastEvent('error.test');
            
            this.pass('7.2 Event Error Handling', 'System survived error in event handler');

        } catch (error) {
            this.fail('7.2 Event Error Handling', error.message);
        }

        this.log('Completed Event System tests\n');
    }

    async testSuite8_IntegrationTesting() {
        this.currentSuite = 'Test Suite 8: Integration Testing';
        this.log('Starting Integration Testing');

        // Test 8.1: Complete Game Flow
        try {
            const integrationController = new GameFlowController({ 
                autoSave: false, 
                storageType: 'memory' 
            });

            await integrationController.initializeGame(this.testPlayers.slice(0, 2), { maxCycles: 2 });

            // Test pause/resume
            integrationController.pauseGame();
            const pausedStatus = integrationController.getGameStatus();
            
            if (pausedStatus.gameStatus === 'paused') {
                this.pass('8.1 Game Pause', 'Game paused successfully');
            } else {
                this.fail('8.1 Game Pause', 'Game pause failed');
            }

            integrationController.resumeGame();
            const resumedStatus = integrationController.getGameStatus();
            
            if (resumedStatus.gameStatus === 'active') {
                this.pass('8.1 Game Resume', 'Game resumed successfully');
            } else {
                this.fail('8.1 Game Resume', 'Game resume failed');
            }

            // Test save/load during gameplay
            await integrationController.saveGame('integration_test');
            const saveLoadResult = await integrationController.loadGame('integration_test');
            
            if (saveLoadResult.success) {
                this.pass('8.1 Mid-Game Save/Load', 'Save/load works during gameplay');
            } else {
                this.fail('8.1 Mid-Game Save/Load', 'Save/load failed during gameplay');
            }

            integrationController.destroy();

        } catch (error) {
            this.fail('8.1 Complete Game Flow', error.message);
        }

        this.log('Completed Integration Testing\n');
    }

    async testSuite9_PerformanceTesting() {
        this.currentSuite = 'Test Suite 9: Performance Testing';
        this.log('Starting Performance Testing');

        // Test 9.1: Memory Usage (Basic)
        try {
            const controllers = [];
            
            // Create multiple controllers
            for (let i = 0; i < 5; i++) {
                const controller = new GameFlowController({ 
                    autoSave: false, 
                    storageType: 'memory' 
                });
                await controller.initializeGame(this.testPlayers.slice(0, 2));
                controllers.push(controller);
            }

            this.pass('9.1 Multiple Controllers', `Created ${controllers.length} controllers successfully`);

            // Cleanup
            controllers.forEach(controller => controller.destroy());
            this.pass('9.1 Cleanup', 'All controllers destroyed successfully');

        } catch (error) {
            this.fail('9.1 Memory Usage', error.message);
        }

        // Test 9.2: Timer Performance
        try {
            const startTime = Date.now();
            const timers = [];

            // Create multiple timers
            for (let i = 0; i < 10; i++) {
                this.flowController.timeManager.startPlayerTimer(`test_player_${i}`, 'test_phase', 5);
                timers.push(`test_player_${i}`);
            }

            await this.sleep(100); // Brief wait

            // Clear all timers
            timers.forEach(playerId => {
                this.flowController.timeManager.clearPlayerTimer(playerId);
            });

            const endTime = Date.now();
            const duration = endTime - startTime;

            this.pass('9.2 Timer Performance', `Created and cleared 10 timers in ${duration}ms`);

        } catch (error) {
            this.fail('9.2 Timer Performance', error.message);
        }

        this.log('Completed Performance Testing\n');
    }

    generateTestReport() {
        console.log('\n🏁 TEST EXECUTION COMPLETE');
        console.log('=====================================');

        const passes = this.testResults.filter(r => r.type === 'PASS').length;
        const fails = this.testResults.filter(r => r.type === 'FAIL').length;
        const total = passes + fails;

        console.log(`\n📊 SUMMARY STATISTICS:`);
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passes} (${((passes / total) * 100).toFixed(1)}%)`);
        console.log(`Failed: ${fails} (${((fails / total) * 100).toFixed(1)}%)`);

        if (fails > 0) {
            console.log(`\n❌ FAILED TESTS:`);
            this.testResults
                .filter(r => r.type === 'FAIL')
                .forEach(result => {
                    console.log(`  • ${result.suite}: ${result.message}`);
                });
        }

        console.log(`\n🎯 OVERALL RESULT: ${fails === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

        if (this.flowController) {
            this.flowController.destroy();
        }
    }
}

// Execute the test plan
const executor = new TestPlanExecutor();
executor.executeAllTests().catch(console.error);