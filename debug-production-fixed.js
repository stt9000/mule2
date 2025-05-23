// Debug script to check production setup
// Run this in the browser console during the game

console.log('=== PRODUCTION DEBUG ===');

// Find the Phaser game instance
const game = window.game || Phaser.GAMES[0];

if (!game) {
    console.error('No Phaser game found!');
} else {
    // Get the active scene (should be GameScene)
    const activeScene = game.scene.getScenes(true)[0];
    
    if (!activeScene || activeScene.scene.key !== 'GameScene') {
        console.error('GameScene not active. Current scene:', activeScene?.scene.key);
        console.log('Make sure you are in the game, not in the menu.');
    } else {
        const gfc = activeScene.gameFlowController;
        
        if (!gfc) {
            console.error('GameFlowController not found in GameScene');
        } else {
            // Check current phase
            console.log('Current phase:', gfc.cycleManager.currentPhase);
            console.log('Current cycle:', gfc.cycleManager.currentCycle);
            
            // Check territories with constructs
            const territories = gfc.territoryGrid.territories;
            const territoriesWithConstructs = territories.filter(t => t.ownerId && t.construct);
            
            console.log(`\nTerritories with constructs: ${territoriesWithConstructs.length}`);
            if (territoriesWithConstructs.length === 0) {
                console.warn('NO TERRITORIES HAVE CONSTRUCTS!');
                console.log('You need to place constructs in the Construct Outfitting phase first.');
                
                // Show all owned territories
                const ownedTerritories = territories.filter(t => t.ownerId);
                console.log(`\nOwned territories: ${ownedTerritories.length}`);
                ownedTerritories.forEach(t => {
                    console.log(`- Territory ${t.id}: owner=${t.ownerId}, construct=${t.construct ? t.construct.type : 'NONE'}`);
                });
            } else {
                territoriesWithConstructs.forEach(t => {
                    console.log(`- Territory ${t.id}: owner=${t.ownerId}, construct=${t.construct.type}, level=${t.construct.level}`);
                });
                
                // Check if production calculator exists
                console.log('\nProduction calculator exists:', !!gfc.cycleManager.resourceCalculator);
                
                // Manually calculate production to see what should happen
                if (gfc.cycleManager.resourceCalculator) {
                    console.log('\nCalculating expected production:');
                    const calc = gfc.cycleManager.resourceCalculator;
                    territoriesWithConstructs.forEach(t => {
                        const prod = calc.calculateTerritoryProduction(t);
                        if (prod) {
                            console.log(`Territory ${t.id} should produce ${prod.amount} ${prod.resource}`);
                        }
                    });
                }
            }
            
            // Check if visual components exist
            console.log('\nVisual components:');
            console.log('- ProductionSummaryPanel exists:', !!activeScene.productionSummaryPanel);
            console.log('- Resource colors defined:', !!activeScene.resourceColors);
            console.log('- Resource particles defined:', !!activeScene.resourceParticles);
            
            // Check player resources
            console.log('\nPlayer resources:');
            const players = gfc.stateManager.getAllPlayers();
            players.forEach(p => {
                console.log(`${p.name}: Gold=${p.gold}, Resources=`, p.resources);
            });
            
            // Provide helper functions
            window.debugProduction = {
                // Add test construct to first owned territory
                addTestConstruct: function() {
                    const owned = territories.find(t => t.ownerId && !t.construct);
                    if (owned) {
                        owned.construct = { type: 'mana_conduit', level: 1 };
                        console.log(`Added mana_conduit to territory ${owned.id}`);
                        // Update visual
                        if (activeScene.updateTerritoryVisual) {
                            activeScene.updateTerritoryVisual(owned);
                        }
                    } else {
                        console.log('No owned territory without construct found');
                    }
                },
                
                // Manually trigger production
                runProduction: function() {
                    console.log('Manually triggering resource production...');
                    gfc.cycleManager.executeResourceProduction();
                },
                
                // Skip to production phase
                skipToProduction: function() {
                    while (gfc.cycleManager.currentPhase !== 'resource_production') {
                        console.log(`Advancing from ${gfc.cycleManager.currentPhase}...`);
                        gfc.cycleManager.advancePhase();
                        if (gfc.cycleManager.currentPhase === 'territory_selection' && gfc.cycleManager.currentCycle > 1) {
                            console.log('New cycle started');
                            break;
                        }
                    }
                    console.log('Now in phase:', gfc.cycleManager.currentPhase);
                }
            };
            
            console.log('\n=== HELPER FUNCTIONS AVAILABLE ===');
            console.log('debugProduction.addTestConstruct() - Add a construct to an owned territory');
            console.log('debugProduction.runProduction() - Manually trigger production');
            console.log('debugProduction.skipToProduction() - Skip to production phase');
        }
    }
}