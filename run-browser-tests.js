// Simple test runner that loads the browser test suite
const fs = require('fs');
const path = require('path');

// Read the browser test suite
const testSuite = fs.readFileSync(path.join(__dirname, 'browser-test-suite.js'), 'utf8');

// Create a simple HTML file that runs the tests
const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Runner</title>
</head>
<body>
    <h1>Running Tests...</h1>
    <div id="results"></div>
    
    <script>
        // Simulate minimal game environment for testing
        window.game = {
            scene: {
                scenes: [null, {
                    gameFlowController: {
                        cycleManager: { currentPhase: 'territory_selection', currentCycle: 1 },
                        turnManager: { 
                            getCurrentPlayer: () => ({ id: 'player1', name: 'Player 1' }),
                            canPlayerAct: () => true
                        },
                        stateManager: {
                            gameState: {
                                players: [
                                    { id: 'player1', name: 'Player 1', gold: 1000, resources: {} },
                                    { id: 'player2', name: 'Player 2', gold: 1000, resources: {} },
                                    { id: 'player3', name: 'Player 3', gold: 1000, resources: {} },
                                    { id: 'player4', name: 'Player 4', gold: 1000, resources: {} }
                                ]
                            },
                            getPlayer: (id) => window.game.scene.scenes[1].gameFlowController.stateManager.gameState.players.find(p => p.id === id)
                        },
                        territoryGrid: {
                            territories: [
                                { id: 'territory_3_3', ownerId: null, q: 3, r: 3 },
                                { id: 'territory_1_1', ownerId: null, q: 1, r: 1 }
                            ],
                            getTerritoryById: (id) => window.game.scene.scenes[1].gameFlowController.territoryGrid.territories.find(t => t.id === id),
                            getPlayerTerritories: (playerId) => window.game.scene.scenes[1].gameFlowController.territoryGrid.territories.filter(t => t.ownerId === playerId)
                        }
                    },
                    onTerritoryClick: () => {},
                    selectedTerritory: null
                }]
            }
        };
        
        // Mock DOM elements
        document.getElementById = (id) => ({
            click: () => console.log('Button clicked:', id),
            textContent: ''
        });
        
        // Run the test suite
        ${testSuite}
    </script>
</body>
</html>
`;

// Write the test runner HTML
fs.writeFileSync('test-runner-output.html', html);
console.log('Test runner created: test-runner-output.html');
console.log('Open this file in a browser to see the test results.');