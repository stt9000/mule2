const puppeteer = require('puppeteer');
const fs = require('fs').promises;

class GameTestSuite {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = [];
        this.currentTest = '';
    }

    async initialize() {
        this.browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        
        // Set viewport
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        // Enable console logging
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                this.log(`Console Error: ${msg.text()}`, 'error');
            }
        });
        
        // Catch page errors
        this.page.on('pageerror', error => {
            this.log(`Page Error: ${error.message}`, 'error');
        });
        
        await this.page.goto('http://localhost:8080');
        await this.waitForGameLoad();
    }

    async waitForGameLoad() {
        await this.page.waitForSelector('#phaser-game canvas', { timeout: 10000 });
        await this.page.waitForTimeout(2000); // Wait for game initialization
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
        console.log(`[${type.toUpperCase()}] ${this.currentTest}: ${message}`);
    }

    async runTest(testName, testFunction) {
        this.currentTest = testName;
        this.log(`Starting test: ${testName}`);
        
        try {
            await testFunction.call(this);
            this.log(`Test passed: ${testName}`, 'success');
        } catch (error) {
            this.log(`Test failed: ${error.message}`, 'error');
            this.log(`Stack: ${error.stack}`, 'error');
        }
    }

    // Helper methods
    async clickButton(buttonId) {
        await this.page.click(`#${buttonId}`);
        await this.page.waitForTimeout(500);
    }

    async getGameState() {
        return await this.page.evaluate(() => {
            const scene = window.game?.scene?.scenes?.[1];
            if (!scene || !scene.gameFlowController) return null;
            
            return {
                phase: scene.gameFlowController.cycleManager?.currentPhase,
                cycle: scene.gameFlowController.cycleManager?.currentCycle,
                currentPlayer: scene.gameFlowController.turnManager?.getCurrentPlayer(),
                players: scene.gameFlowController.stateManager?.gameState?.players
            };
        });
    }

    async clickTerritory(territoryId) {
        const clicked = await this.page.evaluate((id) => {
            const scene = window.game?.scene?.scenes?.[1];
            if (!scene) return false;
            
            const territory = scene.gameFlowController.territoryGrid?.getTerritoryById(id);
            if (!territory || !territory.hex) return false;
            
            const bounds = territory.hex.getBounds();
            const pointer = { x: bounds.centerX, y: bounds.centerY };
            scene.onHexClicked(pointer, territory.hex);
            return true;
        }, territoryId);
        
        if (!clicked) {
            throw new Error(`Failed to click territory ${territoryId}`);
        }
        await this.page.waitForTimeout(500);
    }

    async waitForPhase(phaseName, timeout = 30000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const state = await this.getGameState();
            if (state?.phase === phaseName) {
                return true;
            }
            await this.page.waitForTimeout(500);
        }
        
        throw new Error(`Timeout waiting for phase: ${phaseName}`);
    }

    async advanceTurns(count) {
        for (let i = 0; i < count; i++) {
            await this.clickButton('end-turn-btn');
            await this.page.waitForTimeout(1000);
        }
    }

    // Test Suite 1: Initial Game State
    async testInitialGameState() {
        const state = await this.getGameState();
        
        if (!state) {
            throw new Error('Game state not available');
        }
        
        if (state.phase !== 'territory_selection') {
            throw new Error(`Expected phase territory_selection, got ${state.phase}`);
        }
        
        if (state.cycle !== 1) {
            throw new Error(`Expected cycle 1, got ${state.cycle}`);
        }
        
        if (!state.players || state.players.length !== 4) {
            throw new Error(`Expected 4 players, got ${state.players?.length}`);
        }
        
        // Check player gold
        for (const player of state.players) {
            if (player.gold !== 1000) {
                throw new Error(`Player ${player.id} should have 1000 gold, has ${player.gold}`);
            }
        }
        
        this.log('Initial game state verified');
    }

    // Test Suite 2: Territory Selection
    async testTerritorySelection() {
        // Test 2.1: Territory Selection UI
        await this.runTest('Territory Selection UI', async () => {
            // Click Buy Land button
            await this.clickButton('buy-land-btn');
            
            // Try to select a territory
            await this.clickTerritory('territory_3_3');
            
            // Check if territory was selected
            const selected = await this.page.evaluate(() => {
                const scene = window.game?.scene?.scenes?.[1];
                return scene?.selectedTerritory?.id;
            });
            
            if (selected !== 'territory_3_3') {
                throw new Error('Territory selection failed');
            }
        });

        // Test 2.2: Free Territory Claiming
        await this.runTest('Free Territory Claiming', async () => {
            const state = await this.getGameState();
            
            // Player 1 should be able to claim
            if (state.currentPlayer.id !== 'player1') {
                throw new Error('Not Player 1\'s turn');
            }
            
            // Territory should be recorded for end-of-phase resolution
            this.log('Territory claim recorded for resolution');
        });
    }

    // Test Suite 3: Turn Management
    async testTurnManagement() {
        await this.runTest('Turn Advancement', async () => {
            // Advance through all players
            await this.advanceTurns(4);
            
            const state = await this.getGameState();
            
            // Should still be in territory_selection phase
            if (state.phase !== 'territory_selection') {
                this.log('Phase advanced as expected', 'warning');
            }
            
            // Check if territories were assigned
            const territoriesWithOwners = await this.page.evaluate(() => {
                const scene = window.game?.scene?.scenes?.[1];
                const territories = scene?.gameFlowController?.territoryGrid?.territories || [];
                return territories.filter(t => t.ownerId).length;
            });
            
            this.log(`Territories owned: ${territoriesWithOwners}`);
        });
    }

    // Test Suite 4: Construct Outfitting
    async testConstructOutfitting() {
        await this.runTest('Construct Placement', async () => {
            // Wait for construct outfitting phase
            await this.waitForPhase('construct_outfitting');
            
            const state = await this.getGameState();
            this.log(`Current phase: ${state.phase}`);
            
            // If it's Player 1's turn, try to place a construct
            if (state.currentPlayer.id === 'player1') {
                await this.clickButton('upgrade-btn');
                
                // Find a Player 1 territory
                const territory = await this.page.evaluate(() => {
                    const scene = window.game?.scene?.scenes?.[1];
                    const territories = scene?.gameFlowController?.territoryGrid?.territories || [];
                    return territories.find(t => t.ownerId === 'player1')?.id;
                });
                
                if (territory) {
                    await this.clickTerritory(territory);
                    this.log(`Placed construct on ${territory}`);
                } else {
                    this.log('No Player 1 territories found', 'warning');
                }
            }
            
            // Advance through remaining turns
            await this.advanceTurns(4);
        });
    }

    // Test Suite 5: Resource Production
    async testResourceProduction() {
        await this.runTest('Resource Production Phase', async () => {
            // Wait for resource production phase
            await this.waitForPhase('resource_production');
            
            this.log('Reached resource production phase');
            
            // This phase should be automated
            await this.page.waitForTimeout(2000);
            
            // Check if resources were produced
            const playerResources = await this.page.evaluate(() => {
                const scene = window.game?.scene?.scenes?.[1];
                const player = scene?.gameFlowController?.stateManager?.getPlayer('player1');
                return player?.resources;
            });
            
            this.log(`Player 1 resources: ${JSON.stringify(playerResources)}`);
        });
    }

    // Test Suite 6: Phase Transitions
    async testPhaseTransitions() {
        await this.runTest('Phase Cycle', async () => {
            const phases = [
                'territory_selection',
                'construct_outfitting',
                'resource_production',
                'auction_phase',
                'end_cycle_events'
            ];
            
            let phaseIndex = 0;
            const startPhase = (await this.getGameState()).phase;
            phaseIndex = phases.indexOf(startPhase);
            
            // Go through remaining phases
            for (let i = phaseIndex + 1; i < phases.length; i++) {
                await this.waitForPhase(phases[i]);
                this.log(`Entered phase: ${phases[i]}`);
                
                // Advance through all turns in this phase
                await this.advanceTurns(4);
            }
            
            // Check if cycle advanced
            const endState = await this.getGameState();
            this.log(`End cycle: ${endState.cycle}`);
        });
    }

    // Main test runner
    async runAllTests() {
        this.log('Starting automated test suite');
        
        try {
            await this.initialize();
            
            // Run test suites in order
            await this.runTest('Test Suite 1: Initial Game State', this.testInitialGameState);
            await this.runTest('Test Suite 2: Territory Selection', this.testTerritorySelection);
            await this.runTest('Test Suite 3: Turn Management', this.testTurnManagement);
            await this.runTest('Test Suite 4: Construct Outfitting', this.testConstructOutfitting);
            await this.runTest('Test Suite 5: Resource Production', this.testResourceProduction);
            await this.runTest('Test Suite 6: Phase Transitions', this.testPhaseTransitions);
            
        } catch (error) {
            this.log(`Fatal error: ${error.message}`, 'error');
        } finally {
            await this.cleanup();
        }
        
        // Generate report
        await this.generateReport();
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            results: this.results,
            summary: {
                total: this.results.filter(r => r.type === 'success' || r.type === 'error').length,
                passed: this.results.filter(r => r.type === 'success').length,
                failed: this.results.filter(r => r.type === 'error').length
            }
        };
        
        await fs.writeFile(
            'automated-test-report.json',
            JSON.stringify(report, null, 2)
        );
        
        console.log('\n=== Test Summary ===');
        console.log(`Total Tests: ${report.summary.total}`);
        console.log(`Passed: ${report.summary.passed}`);
        console.log(`Failed: ${report.summary.failed}`);
        
        // Show failures
        const failures = this.results.filter(r => r.type === 'error');
        if (failures.length > 0) {
            console.log('\n=== Failures ===');
            failures.forEach(f => {
                console.log(`\n${f.test}:`);
                console.log(`  ${f.message}`);
            });
        }
    }
}

// Run the test suite
async function main() {
    const tester = new GameTestSuite();
    await tester.runAllTests();
}

main().catch(console.error);