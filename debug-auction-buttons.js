/**
 * Debug script to add test buttons to the game scene
 * Run this in the browser console when the auction hall is visible
 */

// Function to add debug buttons
function addDebugButtons(scene) {
    console.log('Adding debug buttons to scene');
    
    // Create a simple test button
    const testButton = scene.add.rectangle(400, 50, 150, 40, 0xff0000);
    testButton.setInteractive();
    testButton.setDepth(2000); // Very high depth
    
    const testText = scene.add.text(400, 50, 'TEST CLICK', {
        fontSize: '16px',
        color: '#ffffff'
    });
    testText.setOrigin(0.5);
    testText.setDepth(2001);
    
    testButton.on('pointerdown', () => {
        console.log('Test button clicked!');
        alert('Test button works!');
    });
    
    testButton.on('pointerover', () => {
        testButton.setFillStyle(0xff6666);
    });
    
    testButton.on('pointerout', () => {
        testButton.setFillStyle(0xff0000);
    });
    
    // Try to access the auction panel
    if (scene.auctionHallPanel) {
        console.log('AuctionHallPanel found:', scene.auctionHallPanel);
        console.log('Container visible:', scene.auctionHallPanel.container.visible);
        console.log('Container alpha:', scene.auctionHallPanel.container.alpha);
        console.log('Container depth:', scene.auctionHallPanel.container.depth);
        
        // Check player action panel
        console.log('PlayerActionPanel exists:', !!scene.playerActionPanel);
        
        // Try to get players
        if (scene.gameFlowController?.stateManager) {
            const gameState = scene.gameFlowController.stateManager.gameState;
            console.log('Game state:', gameState);
            console.log('Players:', gameState?.players);
        }
        
        // Try to trigger buy directly
        console.log('Attempting to trigger buy action...');
        scene.auctionHallPanel.onBuyClick();
    } else {
        console.log('No auction hall panel found on scene');
    }
}

// Instructions for use
console.log(`
Debug Auction Buttons Script
===========================

To use this script:
1. Make sure the game is running and auction hall is visible
2. Open browser console (F12)
3. Find the game scene object (usually: game.scene.scenes[1] or similar)
4. Run: addDebugButtons(gameScene)

Example:
  const gameScene = game.scene.scenes.find(s => s.scene.key === 'GameScene');
  addDebugButtons(gameScene);

The script will:
- Add a red TEST button at the top
- Log debug information about the auction panel
- Try to trigger the buy action directly
`);

// Export for use
window.addDebugButtons = addDebugButtons;