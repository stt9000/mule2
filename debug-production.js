// Debug script to check production setup
// Run this in the browser console during the game

console.log('=== PRODUCTION DEBUG ===');

// Check if we're in GameScene
if (typeof gameScene !== 'undefined' && gameScene.gameFlowController) {
    const gfc = gameScene.gameFlowController;
    
    // Check current phase
    console.log('Current phase:', gfc.cycleManager.currentPhase);
    
    // Check territories with constructs
    const territories = gfc.territoryGrid.territories;
    const territoriesWithConstructs = territories.filter(t => t.ownerId && t.construct);
    
    console.log(`\nTerritories with constructs: ${territoriesWithConstructs.length}`);
    territoriesWithConstructs.forEach(t => {
        console.log(`- Territory ${t.id}: owner=${t.ownerId}, construct=${t.construct.type}, level=${t.construct.level}`);
    });
    
    // Check if production calculator exists
    console.log('\nProduction calculator exists:', !!gfc.cycleManager.resourceCalculator);
    
    // Check if visual components exist
    console.log('ProductionSummaryPanel exists:', !!gameScene.productionSummaryPanel);
    console.log('Resource colors defined:', !!gameScene.resourceColors);
    
    // Manually calculate production to see what should happen
    if (territoriesWithConstructs.length > 0 && gfc.cycleManager.resourceCalculator) {
        console.log('\nCalculating expected production:');
        const calc = gfc.cycleManager.resourceCalculator;
        territoriesWithConstructs.forEach(t => {
            const prod = calc.calculateTerritoryProduction(t);
            if (prod) {
                console.log(`Territory ${t.id} should produce ${prod.amount} ${prod.resource}`);
            }
        });
    }
    
    // Check player resources before and after
    console.log('\nPlayer resources:');
    const players = gfc.stateManager.getAllPlayers();
    players.forEach(p => {
        console.log(`${p.name}:`, p.resources);
    });
    
} else {
    console.log('GameScene not available. Make sure you\'re in the game.');
}

console.log('\n=== To manually trigger production ===');
console.log('Run: gameScene.gameFlowController.cycleManager.executeResourceProduction()');