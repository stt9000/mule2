/**
 * Test TransactionEngine integration with AuctionManager
 */

import AuctionManager from './src/models/AuctionManager.js';
import TransactionEngine from './src/models/TransactionEngine.js';
// import GameStateManager from './src/models/GameStateManager.js';
import MarketDataService from './src/models/MarketDataService.js';
import { EventEmitter } from 'events';

console.log('=== Testing Transaction Integration ===\n');

// Create event emitter
const events = new EventEmitter();

// Create mock game state manager with test players
const gameStateManager = {
    gameState: {
        players: {
            'player1': {
                id: 'player1',
                name: 'Alice',
                gold: 1000,
                resources: {
                    mana: 50,
                    vitality: 30,
                    arcanum: 20,
                    aether: 10
                }
            },
            'player2': {
                id: 'player2',
                name: 'Bob',
                gold: 800,
                resources: {
                    mana: 20,
                    vitality: 40,
                    arcanum: 30,
                    aether: 5
                }
            }
        }
    },
    getState: function() {
        return this.gameState;
    }
};

// Create market data service
const marketDataService = new MarketDataService();

// Create transaction engine
const transactionEngine = new TransactionEngine(gameStateManager, marketDataService);

// Create auction manager
const auctionManager = new AuctionManager({ events });

// Test 1: Create a transaction
console.log('Test 1: Create and execute a transaction');
console.log('Initial state:');
const initialState = gameStateManager.getState();
console.log('Alice:', initialState.players.player1);
console.log('Bob:', initialState.players.player2);
console.log('');

// Create transaction: Alice buys 10 mana from Bob at 25 gold each
const txnId = transactionEngine.createTransaction('player1', 'player2', 'mana', 25, 10);
console.log('Created transaction:', txnId);

// Process the transaction
const result = transactionEngine.processPendingTransactions();
console.log('Processing result:', result);
console.log('');

// Check final state
console.log('Final state:');
const finalState = gameStateManager.getState();
console.log('Alice:', finalState.players.player1);
console.log('Bob:', finalState.players.player2);
console.log('');

// Test 2: Failed transaction (insufficient resources)
console.log('Test 2: Failed transaction (seller has insufficient resources)');
const txnId2 = transactionEngine.createTransaction('player2', 'player1', 'aether', 50, 20);
console.log('Created transaction:', txnId2);

const result2 = transactionEngine.processPendingTransactions();
console.log('Processing result:', result2);
console.log('');

// Test 3: Check transaction history
console.log('Test 3: Transaction history');
const history = transactionEngine.getTransactionHistory();
console.log('Total transactions:', history.length);
history.forEach(txn => {
    console.log(`- ${txn.id}: ${txn.status} - ${txn.buyerId} bought ${txn.quantity} ${txn.resource} from ${txn.sellerId} @ ${txn.price}GP`);
    if (txn.failureReason) {
        console.log(`  Failure: ${txn.failureReason}`);
    }
});
console.log('');

// Test 4: Get statistics
console.log('Test 4: Transaction statistics');
const stats = transactionEngine.getStatistics();
console.log('Statistics:', stats);

console.log('\n=== All tests completed ===');