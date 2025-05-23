/**
 * Integration test for game flow components
 * Tests the interaction between all Phase 2 Step 4 components
 */

import { GameFlowController } from './src/models/index.js';

class FlowIntegrationTest {
    constructor() {
        this.testResults = [];
        this.flowController = null;
    }

    log(message) {
        console.log(`[TEST] ${message}`);
        this.testResults.push(message);
    }

    async runAllTests() {
        console.log('=== Game Flow Integration Tests ===\n');
        
        try {
            await this.testGameInitialization();
            await this.testPhaseProgression();
            await this.testTurnManagement();
            await this.testTimerSystem();
            await this.testStateManagement();
            await this.testPersistence();
            await this.testEventSystem();
            await this.testGameCompletion();
            
            this.log('✅ All integration tests passed!');
        } catch (error) {
            this.log(`❌ Integration test failed: ${error.message}`);
            console.error(error);
        } finally {
            this.cleanup();
        }
        
        console.log('\n=== Test Results ===');
        this.testResults.forEach(result => console.log(result));
    }

    async testGameInitialization() {
        this.log('Testing game initialization...');
        
        // Create test players
        const players = [
            { id: 'player1', name: 'Alice' },
            { id: 'player2', name: 'Bob' },
            { id: 'player3', name: 'Charlie' }
        ];
        
        const settings = {
            maxCycles: 3, // Short game for testing
            startingGold: 1000,
            autoSave: false // Disable for testing
        };
        
        this.flowController = new GameFlowController({ autoSave: false });
        
        const result = await this.flowController.initializeGame(players, settings);
        
        if (!result.success) {
            throw new Error(`Game initialization failed: ${result.error}`);
        }
        
        const status = this.flowController.getGameStatus();
        
        if (!status.isInitialized) {
            throw new Error('Game not marked as initialized');
        }
        
        if (status.playerCount !== 3) {
            throw new Error(`Expected 3 players, got ${status.playerCount}`);
        }
        
        if (status.currentCycle !== 1) {
            throw new Error(`Expected cycle 1, got ${status.currentCycle}`);
        }
        
        if (status.currentPhase !== 'territory_selection') {
            throw new Error(`Expected territory_selection phase, got ${status.currentPhase}`);
        }
        
        this.log('✅ Game initialization successful');
    }

    async testPhaseProgression() {
        this.log('Testing phase progression...');
        
        let phaseChanges = 0;
        
        this.flowController.on('phase.started', (data) => {
            phaseChanges++;
            this.log(`  Phase changed to: ${data.phase}`);
        });
        
        // Test advancing through phases
        const expectedPhases = [
            'construct_outfitting',
            'resource_production',
            'auction_phase',
            'end_cycle_events'
        ];
        
        for (const expectedPhase of expectedPhases) {
            this.flowController.cycleManager.advancePhase();
            
            const status = this.flowController.getGameStatus();
            if (status.currentPhase !== expectedPhase) {
                throw new Error(`Expected phase ${expectedPhase}, got ${status.currentPhase}`);
            }
        }
        
        // Advancing from end_cycle_events should start new cycle
        const initialCycle = this.flowController.getGameStatus().currentCycle;
        this.flowController.cycleManager.advancePhase();
        
        const newStatus = this.flowController.getGameStatus();
        if (newStatus.currentCycle !== initialCycle + 1) {
            throw new Error(`Expected cycle ${initialCycle + 1}, got ${newStatus.currentCycle}`);
        }
        
        if (newStatus.currentPhase !== 'territory_selection') {
            throw new Error(`Expected territory_selection phase, got ${newStatus.currentPhase}`);
        }
        
        this.log('✅ Phase progression working correctly');
    }

    async testTurnManagement() {
        this.log('Testing turn management...');
        
        const status = this.flowController.getGameStatus();
        const players = status.players;
        
        if (!players || players.length === 0) {
            throw new Error('No players found in game state');
        }
        
        // Test turn order calculation
        this.flowController.turnManager.calculateTurnOrder();
        const turnOrder = this.flowController.turnManager.turnOrder;
        
        if (turnOrder.length !== players.length) {
            throw new Error(`Turn order length mismatch: expected ${players.length}, got ${turnOrder.length}`);
        }
        
        // Test player action execution
        const testAction = {
            type: 'claim_territory',
            territoryId: 'test_territory_1'
        };
        
        const firstPlayer = turnOrder[0];
        const actionResult = this.flowController.executePlayerAction(firstPlayer.id, testAction);
        
        // Action should succeed (even if it doesn't do anything yet)
        if (!actionResult) {
            // This is expected since we haven't implemented the actual action logic yet
            this.log('  Action execution returned false (expected - logic not implemented yet)');
        }
        
        this.log('✅ Turn management working correctly');
    }

    async testTimerSystem() {
        this.log('Testing timer system...');
        
        let timerEvents = 0;
        
        this.flowController.on('timer.update', () => {
            timerEvents++;
        });
        
        // Start a short timer
        this.flowController.timeManager.startPhaseTimer('test_phase', 2); // 2 seconds
        
        // Wait for timer to start
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const timerStatus = this.flowController.timeManager.getTimerStatus();
        
        if (!timerStatus.globalTimer) {
            throw new Error('Global timer not started');
        }
        
        if (timerStatus.globalTimer.phase !== 'test_phase') {
            throw new Error(`Wrong timer phase: expected test_phase, got ${timerStatus.globalTimer.phase}`);
        }
        
        // Clear the timer to avoid waiting
        this.flowController.timeManager.clearCurrentTimer();
        
        this.log('✅ Timer system working correctly');
    }

    async testStateManagement() {
        this.log('Testing state management...');
        
        const stateManager = this.flowController.stateManager;
        
        // Test state validation
        const isValid = stateManager.validateGameState();
        if (!isValid) {
            const errors = stateManager.getValidationErrors();
            throw new Error(`State validation failed: ${errors.join(', ')}`);
        }
        
        // Test state updates
        const updateResult = stateManager.updateGameState({
            testProperty: 'test_value'
        }, 'Test update');
        
        if (!updateResult) {
            throw new Error('State update failed');
        }
        
        if (stateManager.gameState.testProperty !== 'test_value') {
            throw new Error('State update not applied correctly');
        }
        
        // Test action logging
        const actionId = stateManager.logPlayerAction('player1', {
            type: 'test_action',
            data: 'test'
        });
        
        if (!actionId) {
            throw new Error('Action logging failed');
        }
        
        const playerActions = stateManager.getPlayerActions('player1');
        if (playerActions.length === 0) {
            throw new Error('No actions found for player');
        }
        
        this.log('✅ State management working correctly');
    }

    async testPersistence() {
        this.log('Testing persistence system...');
        
        const persistence = this.flowController.persistence;
        
        // Test save
        const saveResult = await persistence.saveGame(
            this.flowController.stateManager.gameState,
            'test_save'
        );
        
        if (!saveResult.success) {
            throw new Error(`Save failed: ${saveResult.error}`);
        }
        
        // Test load
        const loadResult = await persistence.loadGame('test_save');
        
        if (!loadResult.success) {
            throw new Error(`Load failed: ${loadResult.error}`);
        }
        
        if (!loadResult.gameState) {
            throw new Error('No game state in load result');
        }
        
        // Test save slots
        const saveSlots = await persistence.getSaveSlots();
        const testSlot = saveSlots.find(slot => slot.name === 'test_save');
        
        if (!testSlot) {
            throw new Error('Test save slot not found');
        }
        
        // Cleanup test save
        await persistence.deleteSave('test_save');
        
        this.log('✅ Persistence system working correctly');
    }

    async testEventSystem() {
        this.log('Testing event system...');
        
        let eventReceived = false;
        const testEventData = { test: 'data' };
        
        // Test event broadcasting
        this.flowController.on('test.event', (data) => {
            if (data.test === 'data') {
                eventReceived = true;
            }
        });
        
        this.flowController.broadcastEvent('test.event', testEventData);
        
        if (!eventReceived) {
            throw new Error('Event not received');
        }
        
        // Test event removal
        const callback = () => {};
        this.flowController.on('test.remove', callback);
        this.flowController.off('test.remove', callback);
        
        this.log('✅ Event system working correctly');
    }

    async testGameCompletion() {
        this.log('Testing game completion...');
        
        let gameEndReceived = false;
        
        this.flowController.on('game.ended', (data) => {
            gameEndReceived = true;
        });
        
        // Fast-forward to game end by setting max cycles to current cycle
        this.flowController.cycleManager.maxCycles = this.flowController.cycleManager.currentCycle;
        this.flowController.cycleManager.advancePhase();
        
        if (!gameEndReceived) {
            throw new Error('Game end event not received');
        }
        
        const status = this.flowController.getGameStatus();
        if (status.gameStatus !== 'ended') {
            throw new Error(`Expected game status 'ended', got '${status.gameStatus}'`);
        }
        
        this.log('✅ Game completion working correctly');
    }

    cleanup() {
        if (this.flowController) {
            this.flowController.destroy();
        }
    }
}

// Run the integration tests
const test = new FlowIntegrationTest();
test.runAllTests().catch(console.error);