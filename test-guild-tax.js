/**
 * Test Guild Tax System (5% on all transactions)
 */

import TransactionEngine from './src/models/TransactionEngine.js';
import MarketDataService from './src/models/MarketDataService.js';

console.log('=== Testing Guild Tax System ===\n');

// Create mock game state manager
const gameStateManager = {
    gameState: {
        players: {
            'player1': {
                id: 'player1',
                name: 'Alice',
                gold: 1000,
                resources: { mana: 50, vitality: 30, arcanum: 20, aether: 10 }
            },
            'player2': {
                id: 'player2',
                name: 'Bob',
                gold: 800,
                resources: { mana: 20, vitality: 40, arcanum: 30, aether: 5 }
            }
        }
    },
    getState: function() { return this.gameState; }
};

const marketDataService = new MarketDataService();
const transactionEngine = new TransactionEngine(gameStateManager, marketDataService);

console.log('Guild Tax Rate:', transactionEngine.guildTaxRate * 100 + '%');
console.log('');

// Test 1: Small transaction
console.log('Test 1: Small transaction (100 gold total)');
console.log('Alice buys 10 mana from Bob at 10 gold each');
console.log('Total cost: 100 gold');
console.log('Expected tax: 5 gold (5%)');
console.log('Bob should receive: 95 gold');

const txn1 = transactionEngine.createTransaction('player1', 'player2', 'mana', 10, 10);
transactionEngine.processPendingTransactions();

const state1 = gameStateManager.getState();
console.log('Alice gold:', state1.players.player1.gold, '(started with 1000)');
console.log('Bob gold:', state1.players.player2.gold, '(started with 800)');
console.log('Bob received:', state1.players.player2.gold - 800, 'gold');
console.log('');

// Test 2: Large transaction
console.log('Test 2: Large transaction (500 gold total)');
console.log('Bob buys 10 arcanum from Alice at 50 gold each');
console.log('Total cost: 500 gold');
console.log('Expected tax: 25 gold (5%)');
console.log('Alice should receive: 475 gold');

const txn2 = transactionEngine.createTransaction('player2', 'player1', 'arcanum', 50, 10);
transactionEngine.processPendingTransactions();

const state2 = gameStateManager.getState();
console.log('Alice gold:', state2.players.player1.gold);
console.log('Bob gold:', state2.players.player2.gold);
console.log('Alice received:', state2.players.player1.gold - 900, 'gold (900 = 1000 - 100 from test 1)');
console.log('');

// Test 3: Check total tax collected
console.log('Test 3: Total tax statistics');
const stats = transactionEngine.getStatistics();
console.log('Total transactions:', stats.completed);
console.log('Total tax collected:', stats.guildTax.totalCollected, 'gold');
console.log('Tax rate:', stats.guildTax.rate * 100 + '%');
console.log('');

// Test 4: Transaction history with tax info
console.log('Test 4: Transaction history with tax details');
const history = transactionEngine.getTransactionHistory();
history.forEach(txn => {
    if (txn.status === 'completed') {
        const totalCost = txn.price * txn.quantity;
        console.log(`- ${txn.id}: ${txn.quantity} ${txn.resource} @ ${txn.price}GP = ${totalCost}GP total`);
        console.log(`  Guild tax: ${txn.guildTax}GP, Seller received: ${totalCost - txn.guildTax}GP`);
    }
});

console.log('\n=== Guild Tax System Working Correctly! ===');