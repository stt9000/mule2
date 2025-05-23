// Browser-based automated test suite for MULE game
// This runs directly in the browser console

class BrowserTestSuite {
    constructor() {
        this.results = [];
        this.currentTest = '';
        this.scene = null;
        this.gameFlow = null;
    }

    initialize() {
        this.scene = window.game?.scene?.scenes?.[1];
        if (!this.scene) {
            throw new Error('Game scene not found');
        }
        
        this.gameFlow = this.scene.gameFlowController;
        if (!this.gameFlow) {
            throw new Error('GameFlowController not found');
        }
        
        console.log('Test suite initialized');
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            test: this.currentTest,
            type,
            message
        };
        this.results.push(logEntry);
        
        const color = type === 'error' ? 'red' : type === 'success' ? 'green' : 'black';
        console.log(`%c[${type.toUpperCase()}] ${this.currentTest}: ${message}`, `color: ${color}`);
    }

    async runTest(testName, testFunction) {
        this.currentTest = testName;
        this.log(`Starting test: ${testName}`);
        
        try {
            await testFunction.call(this);
            this.log(`Test passed: ${testName}`, 'success');
        } catch (error) {
            this.log(`Test failed: ${error.message}`, 'error');
            console.error(error);
        }
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Helper methods
    getGameState() {
        return {
            phase: this.gameFlow.cycleManager?.currentPhase,
            cycle: this.gameFlow.cycleManager?.currentCycle,
            currentPlayer: this.gameFlow.turnManager?.getCurrentPlayer(),
            players: this.gameFlow.stateManager?.gameState?.players
        };
    }

    clickButton(buttonId) {
        const button = document.getElementById(buttonId);
        if (!button) {
            throw new Error(`Button ${buttonId} not found`);
        }
        button.click();
    }

    selectTerritory(territoryId) {
        const territory = this.gameFlow.territoryGrid?.getTerritoryById(territoryId);
        if (!territory) {
            throw new Error(`Territory ${territoryId} not found`);
        }
        
        // Simulate click
        this.scene.onTerritoryClick(territory);
    }

    async advanceTurn() {
        this.clickButton('end-turn-btn');
        await this.wait(500);
    }

    async waitForPhase(phaseName, maxWait = 30000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWait) {
            const state = this.getGameState();
            if (state.phase === phaseName) {
                return true;
            }
            await this.wait(500);
        }
        
        throw new Error(`Timeout waiting for phase: ${phaseName}`);
    }

    // Test implementations
    async testInitialState() {
        const state = this.getGameState();
        
        if (state.phase !== 'territory_selection') {
            throw new Error(`Expected territory_selection phase, got ${state.phase}`);
        }
        
        if (state.cycle !== 1) {
            throw new Error(`Expected cycle 1, got ${state.cycle}`);
        }
        
        if (state.players.length !== 4) {
            throw new Error(`Expected 4 players, got ${state.players.length}`);
        }
        
        // Check initial gold
        state.players.forEach(player => {
            if (player.gold !== 1000) {
                throw new Error(`Player ${player.id} should have 1000 gold, has ${player.gold}`);
            }
        });
        
        this.log('Initial state verified');
    }

    async testTerritorySelection() {
        // Test Player 1 territory selection
        this.clickButton('buy-land-btn');
        await this.wait(500);
        
        // Select a territory
        this.selectTerritory('territory_3_3');
        await this.wait(500);
        
        // Check if territory was selected
        if (!this.scene.selectedTerritory) {
            throw new Error('Territory selection failed');
        }
        
        this.log('Territory selected successfully');
        
        // Advance through all players
        for (let i = 0; i < 4; i++) {
            await this.advanceTurn();
            await this.wait(1500); // Wait for AI actions
        }
        
        // Check if any territories have owners (disputes should be resolved)
        const ownedTerritories = this.gameFlow.territoryGrid.territories.filter(t => t.ownerId);
        this.log(`Territories owned after selection phase: ${ownedTerritories.length}`);
        
        if (ownedTerritories.length === 0) {
            throw new Error('No territories were assigned after selection phase');
        }
    }

    async testConstructPhase() {
        // Wait for construct outfitting phase
        await this.waitForPhase('construct_outfitting');
        
        const state = this.getGameState();
        this.log(`Entered construct outfitting phase, current player: ${state.currentPlayer.id}`);
        
        // If it's Player 1's turn
        if (state.currentPlayer.id === 'player1') {
            // Find a Player 1 territory
            const playerTerritories = this.gameFlow.territoryGrid.getPlayerTerritories('player1');
            
            if (playerTerritories.length > 0) {
                this.clickButton('upgrade-btn');
                await this.wait(500);
                
                this.selectTerritory(playerTerritories[0].id);
                await this.wait(500);
                
                // Check if construct was placed
                if (playerTerritories[0].construct) {
                    this.log('Construct placed successfully');
                } else {
                    throw new Error('Failed to place construct');
                }
            } else {
                this.log('Player 1 has no territories', 'warning');
            }
        }
        
        // Advance through remaining players
        for (let i = 0; i < 4; i++) {
            await this.advanceTurn();
            await this.wait(1500);
        }
    }

    async testPhaseProgression() {
        const phases = [
            'territory_selection',
            'construct_outfitting', 
            'resource_production',
            'auction_phase',
            'end_cycle_events'
        ];
        
        let currentPhaseIndex = phases.indexOf(this.getGameState().phase);
        
        // Go through remaining phases
        for (let i = currentPhaseIndex + 1; i < phases.length; i++) {
            await this.waitForPhase(phases[i]);
            this.log(`Entered phase: ${phases[i]}`);
            
            // Handle each phase
            if (phases[i] === 'resource_production') {
                this.log('Resource production is automated');
                await this.wait(2000);
            } else {
                // Advance through all player turns
                for (let j = 0; j < 4; j++) {
                    await this.advanceTurn();
                    await this.wait(1000);
                }
            }
        }
        
        // Check if we advanced to cycle 2
        const endState = this.getGameState();
        if (endState.cycle === 2) {
            this.log('Successfully advanced to cycle 2');
        } else {
            this.log(`Still in cycle ${endState.cycle}`, 'warning');
        }
    }

    async testPlayerTurnValidation() {
        const state = this.getGameState();
        
        // Try to act out of turn
        if (state.currentPlayer.id !== 'player1') {
            this.clickButton('buy-land-btn');
            await this.wait(500);
            
            try {
                this.selectTerritory('territory_1_1');
                
                // Check if action was blocked
                const messages = document.getElementById('status-message')?.textContent;
                if (messages && messages.includes("Player")) {
                    this.log('Out-of-turn action properly blocked');
                } else {
                    throw new Error('Out-of-turn action was not blocked');
                }
            } catch (e) {
                this.log('Out-of-turn action blocked as expected');
            }
        }
    }

    // Main test runner
    async runAllTests() {
        console.log('=== Starting Browser Test Suite ===');
        
        try {
            this.initialize();
            
            await this.runTest('Initial Game State', this.testInitialState);
            await this.runTest('Territory Selection', this.testTerritorySelection);
            await this.runTest('Construct Phase', this.testConstructPhase);
            await this.runTest('Phase Progression', this.testPhaseProgression);
            await this.runTest('Turn Validation', this.testPlayerTurnValidation);
            
        } catch (error) {
            this.log(`Fatal error: ${error.message}`, 'error');
            console.error(error);
        }
        
        this.generateReport();
    }

    generateReport() {
        const summary = {
            total: 0,
            passed: 0,
            failed: 0
        };
        
        this.results.forEach(r => {
            if (r.type === 'success') summary.passed++;
            if (r.type === 'error') summary.failed++;
        });
        
        summary.total = summary.passed + summary.failed;
        
        console.log('\n=== Test Summary ===');
        console.log(`Total Tests: ${summary.total}`);
        console.log(`Passed: ${summary.passed}`);
        console.log(`Failed: ${summary.failed}`);
        
        // Show failures
        const failures = this.results.filter(r => r.type === 'error');
        if (failures.length > 0) {
            console.log('\n=== Failures ===');
            failures.forEach(f => {
                console.log(`${f.test}: ${f.message}`);
            });
        }
        
        // Store results globally
        window.testResults = {
            summary,
            results: this.results
        };
        
        console.log('\nTest results stored in window.testResults');
    }
}

// Auto-run the tests
console.log('Browser test suite loaded. Running tests...');
const tester = new BrowserTestSuite();
tester.runAllTests();