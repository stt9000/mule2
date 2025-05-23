/**
 * Test script for gold deduction system
 */
import { GameFlowController } from './src/models/index.js';

async function testGoldDeduction() {
    console.log('=== Testing Gold Deduction System ===\n');
    
    // Initialize game
    const gameFlow = new GameFlowController({
        mapWidth: 3,
        mapHeight: 3,
        autoSave: false
    });
    
    const players = [
        { id: 'p1', name: 'Player 1', color: 0xff0000 },
        { id: 'p2', name: 'Player 2', color: 0x00ff00 }
    ];
    
    gameFlow.initializeGame(players, {
        mapSize: { width: 3, height: 3 },
        startingGold: 1000
    });
    
    // Pause to prevent timers
    gameFlow.pauseGame();
    
    // Test 1: Territory claiming (should be FREE during territory_selection phase)
    console.log('Test 1: Territory Selection (Free Claims)');
    const territory1 = gameFlow.territoryGrid.territories[0];
    const player1 = gameFlow.stateManager.getPlayer('p1');
    
    console.log(`Player 1 gold before claiming: ${player1.gold}`);
    
    const claimResult = gameFlow.territoryAcquisition.attemptClaim('p1', territory1.id);
    console.log(`Claim result:`, claimResult);
    console.log(`Player 1 gold after claiming: ${player1.gold}`);
    console.log(`Expected: Gold should remain 1000 (free claim)\n`);
    
    // Test 2: Construct placement (should cost 200 gold)
    console.log('Test 2: Construct Placement');
    gameFlow.cycleManager.forceAdvanceToPhase('construct_outfitting');
    
    // First assign the territory to player
    gameFlow.territoryAcquisition.resolveDisputes();
    territory1.ownerId = 'p1';
    
    console.log(`Player 1 gold before building: ${player1.gold}`);
    
    // Build construct using GoldManager
    const constructCost = 200;
    const goldResult = gameFlow.goldManager.deductGold('p1', constructCost, 'Build mana_conduit');
    
    console.log(`Gold deduction result:`, goldResult);
    console.log(`Player 1 gold after building: ${player1.gold}`);
    console.log(`Expected: Gold should be 800 (1000 - 200)\n`);
    
    // Test 3: Insufficient gold
    console.log('Test 3: Insufficient Gold Check');
    const player2 = gameFlow.stateManager.getPlayer('p2');
    player2.gold = 100; // Set low gold
    
    console.log(`Player 2 gold: ${player2.gold}`);
    const failResult = gameFlow.goldManager.deductGold('p2', 500, 'Test purchase');
    
    console.log(`Deduction result:`, failResult);
    console.log(`Player 2 gold after failed deduction: ${player2.gold}`);
    console.log(`Expected: Gold should remain 100 (insufficient funds)\n`);
    
    // Test 4: Gold addition (from resource overflow)
    console.log('Test 4: Gold Addition');
    const initialGold = player1.gold;
    
    const addResult = gameFlow.goldManager.addGold('p1', 250, 'Resource overflow conversion');
    console.log(`Add result:`, addResult);
    console.log(`Player 1 gold: ${initialGold} -> ${player1.gold}`);
    console.log(`Expected: Gold increased by 250\n`);
    
    // Test 5: Transaction history
    console.log('Test 5: Transaction History');
    const transactions = gameFlow.goldManager.getPlayerTransactions('p1');
    console.log(`Player 1 transactions:`, transactions);
    
    // Test summary
    console.log('\n=== Test Summary ===');
    console.log(`Player 1 final gold: ${player1.gold}`);
    console.log(`Player 2 final gold: ${player2.gold}`);
    console.log(`Total transactions: ${gameFlow.goldManager.transactionHistory.length}`);
    
    // Listen for gold events
    let eventCount = 0;
    gameFlow.on('gold.deducted', (event) => {
        console.log(`\nEvent: Gold deducted - ${event.playerId} spent ${event.amount} on ${event.reason}`);
        eventCount++;
    });
    
    gameFlow.on('gold.added', (event) => {
        console.log(`\nEvent: Gold added - ${event.playerId} gained ${event.amount} from ${event.reason}`);
        eventCount++;
    });
    
    // Test event firing
    console.log('\n=== Testing Event System ===');
    gameFlow.goldManager.deductGold('p1', 50, 'Event test');
    
    setTimeout(() => {
        console.log(`\nEvents fired: ${eventCount}`);
        console.log('\n✅ Gold deduction system test complete!');
    }, 100);
}

// Run test
testGoldDeduction().catch(console.error);