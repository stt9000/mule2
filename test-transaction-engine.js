/**
 * Test suite for TransactionEngine
 */
import TransactionEngine from './src/models/TransactionEngine.js';
import MarketDataService from './src/models/MarketDataService.js';

// Mock game state manager
const createMockGameStateManager = () => {
    // Store state to persist changes
    const state = {
        players: {
            'player1': {
                id: 'player1',
                gold: 500,
                resources: {
                    mana: 50,
                    vitality: 30,
                    arcanum: 20,
                    aether: 10
                }
            },
            'player2': {
                id: 'player2',
                gold: 300,
                resources: {
                    mana: 100,
                    vitality: 80,
                    arcanum: 60,
                    aether: 40
                }
            },
            'player3': {
                id: 'player3',
                gold: 50,
                resources: {
                    mana: 10,
                    vitality: 5,
                    arcanum: 0,
                    aether: 0
                }
            }
        }
    };
    
    return {
        getState: () => state
    };
};

// Test runner
function runTests() {
    console.log('=== Testing TransactionEngine ===\n');
    
    const tests = [];
    const testResults = {
        passed: 0,
        failed: 0,
        failedTests: []
    };
    
    // Helper function
    function test(name, fn) {
        tests.push({ name, fn });
    }
    
    function assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }
    
    // Test 1: TransactionEngine initialization
    test('TransactionEngine initializes correctly', () => {
        const gameStateManager = createMockGameStateManager();
        const marketDataService = new MarketDataService(gameStateManager);
        const engine = new TransactionEngine(gameStateManager, marketDataService);
        
        assert(engine.pendingTransactions.length === 0, 'Should start with no pending transactions');
        assert(engine.completedTransactions.length === 0, 'Should start with no completed transactions');
        assert(engine.transactionCounter === 0, 'Should start with counter at 0');
    });
    
    // Test 2: Create transaction
    test('Can create transactions', () => {
        const engine = new TransactionEngine();
        
        const txnId = engine.createTransaction('player1', 'player2', 'mana', 55, 10);
        assert(txnId.startsWith('txn_'), 'Should generate transaction ID');
        assert(engine.pendingTransactions.length === 1, 'Should add to pending queue');
        
        const transaction = engine.pendingTransactions[0];
        assert(transaction.buyerId === 'player1', 'Should set buyer ID');
        assert(transaction.sellerId === 'player2', 'Should set seller ID');
        assert(transaction.resource === 'mana', 'Should set resource');
        assert(transaction.price === 55, 'Should set price');
        assert(transaction.quantity === 10, 'Should set quantity');
        assert(transaction.status === 'pending', 'Should set pending status');
    });
    
    // Test 3: Validate valid transaction
    test('Validates valid transactions', () => {
        const gameStateManager = createMockGameStateManager();
        const engine = new TransactionEngine(gameStateManager);
        
        const transaction = {
            buyerId: 'player1',
            sellerId: 'player2',
            resource: 'mana',
            price: 50,
            quantity: 10
        };
        
        const errors = engine.validateTransaction(transaction);
        assert(errors.length === 0, 'Valid transaction should have no errors');
    });
    
    // Test 4: Validate invalid transactions
    test('Detects invalid transactions', () => {
        const gameStateManager = createMockGameStateManager();
        const engine = new TransactionEngine(gameStateManager);
        
        // Self-trade
        let errors = engine.validateTransaction({
            buyerId: 'player1',
            sellerId: 'player1',
            resource: 'mana',
            price: 50,
            quantity: 10
        });
        assert(errors.some(e => e.includes('yourself')), 'Should detect self-trade');
        
        // Invalid resource
        errors = engine.validateTransaction({
            buyerId: 'player1',
            sellerId: 'player2',
            resource: 'invalid',
            price: 50,
            quantity: 10
        });
        assert(errors.some(e => e.includes('Invalid resource')), 'Should detect invalid resource');
        
        // Insufficient gold
        errors = engine.validateTransaction({
            buyerId: 'player3',
            sellerId: 'player2',
            resource: 'mana',
            price: 100,
            quantity: 10  // Total: 1000 gold, player3 has 50
        });
        assert(errors.some(e => e.includes('lacks sufficient gold')), 'Should detect insufficient gold');
        
        // Insufficient resources
        errors = engine.validateTransaction({
            buyerId: 'player2',
            sellerId: 'player3',
            resource: 'arcanum',
            price: 50,
            quantity: 10  // player3 has 0 arcanum
        });
        assert(errors.some(e => e.includes('lacks sufficient arcanum')), 'Should detect insufficient resources');
    });
    
    // Test 5: Process transactions
    test('Processes pending transactions', () => {
        const gameStateManager = createMockGameStateManager();
        const marketDataService = new MarketDataService(gameStateManager);
        const engine = new TransactionEngine(gameStateManager, marketDataService);
        
        // Create valid transaction
        engine.createTransaction('player1', 'player2', 'mana', 30, 10);
        
        // Process
        const results = engine.processPendingTransactions();
        assert(results.processed === 1, 'Should process 1 transaction');
        assert(results.succeeded === 1, 'Should succeed');
        assert(results.failed === 0, 'Should not fail');
        assert(engine.completedTransactions.length === 1, 'Should add to completed');
        
        // Check market data was recorded
        const marketData = marketDataService.getMarketSummary('mana');
        assert(marketData.currentPrice === 30, 'Should record price in market data');
    });
    
    // Test 6: Execute transaction updates game state
    test('Executes transactions correctly', () => {
        const gameStateManager = createMockGameStateManager();
        const engine = new TransactionEngine(gameStateManager);
        
        // Create and process transaction
        engine.createTransaction('player1', 'player2', 'mana', 30, 10);
        engine.processPendingTransactions();
        
        // Get fresh game state after transaction
        const gameState = gameStateManager.getState();
        const buyer = gameState.players['player1'];
        const seller = gameState.players['player2'];
        
        // Check updates (initial: buyer=500, seller=300)
        console.log('Buyer gold:', buyer.gold, 'Seller gold:', seller.gold);
        console.log('Buyer mana:', buyer.resources.mana, 'Seller mana:', seller.resources.mana);
        assert(buyer.gold === 200, 'Should deduct gold from buyer (500 - 300 = 200)');
        assert(seller.gold === 600, 'Should add gold to seller (300 + 300 = 600)');
        assert(buyer.resources.mana === 60, 'Should add resources to buyer (50 + 10 = 60)');
        assert(seller.resources.mana === 90, 'Should deduct resources from seller (100 - 10 = 90)');
    });
    
    // Test 7: Transaction history
    test('Tracks transaction history', () => {
        const gameStateManager = createMockGameStateManager();
        const engine = new TransactionEngine(gameStateManager);
        
        // Create multiple transactions
        engine.createTransaction('player1', 'player2', 'mana', 50, 5);
        engine.createTransaction('player2', 'player1', 'vitality', 40, 8);
        engine.createTransaction('player3', 'player2', 'mana', 100, 10); // Will fail - insufficient gold
        
        engine.processPendingTransactions();
        
        // Check history
        const allHistory = engine.getTransactionHistory({});
        assert(allHistory.length === 3, 'Should have 3 transactions in history');
        
        const player1History = engine.getTransactionHistory({ playerId: 'player1' });
        assert(player1History.length === 2, 'Should filter by player');
        
        const manaHistory = engine.getTransactionHistory({ resource: 'mana' });
        assert(manaHistory.length === 2, 'Should filter by resource');
        
        const completedHistory = engine.getTransactionHistory({ status: 'completed' });
        assert(completedHistory.length === 2, 'Should filter by status');
    });
    
    // Test 8: Transaction statistics
    test('Calculates transaction statistics', () => {
        const gameStateManager = createMockGameStateManager();
        const engine = new TransactionEngine(gameStateManager);
        
        // Create transactions
        // Transaction 1: player1 buys 10 mana at 50 = 500 gold (player1 has 500)
        // Transaction 2: player1 buys 20 mana at 60 = 1200 gold (player1 now has 0, will fail)
        // Transaction 3: player2 buys 15 vitality at 40 = 600 gold (player2 has 300 + 500 = 800)
        engine.createTransaction('player1', 'player2', 'mana', 50, 10);
        engine.createTransaction('player2', 'player1', 'vitality', 40, 15);
        engine.createTransaction('player1', 'player2', 'mana', 20, 5); // Smaller transaction
        
        engine.processPendingTransactions();
        
        const stats = engine.getStatistics();
        assert(stats.completed === 3, 'Should count completed');
        assert(stats.successRate === 100, 'Should calculate success rate');
        assert(stats.volumeByResource.mana === 15, 'Should track mana volume (10 + 5)');
        assert(stats.volumeByResource.vitality === 15, 'Should track vitality volume');
        
        // Average price: (50*10 + 20*5) / 15 = 600/15 = 40
        assert(stats.averagePriceByResource.mana === 40, 'Should calculate average price');
    });
    
    // Test 9: Get transaction by ID
    test('Can retrieve transaction by ID', () => {
        const engine = new TransactionEngine();
        
        const txnId = engine.createTransaction('player1', 'player2', 'mana', 50, 10);
        const transaction = engine.getTransaction(txnId);
        
        assert(transaction !== undefined, 'Should find transaction');
        assert(transaction.id === txnId, 'Should return correct transaction');
    });
    
    // Test 10: Queue overflow handling
    test('Handles queue overflow', () => {
        const engine = new TransactionEngine();
        engine.maxPendingTransactions = 5; // Set low limit for testing
        
        // Create more than max
        for (let i = 0; i < 7; i++) {
            engine.createTransaction('player1', 'player2', 'mana', 50, 5);
        }
        
        assert(engine.pendingTransactions.length === 5, 'Should limit pending queue');
        assert(engine.failedTransactions.length === 2, 'Should fail overflow transactions');
    });
    
    // Test 11: Clear history
    test('Can clear transaction history', () => {
        const gameStateManager = createMockGameStateManager();
        const engine = new TransactionEngine(gameStateManager);
        
        // Create and process transactions
        engine.createTransaction('player1', 'player2', 'mana', 50, 10);
        engine.processPendingTransactions();
        
        assert(engine.completedTransactions.length > 0, 'Should have completed transactions');
        
        // Clear
        engine.clearHistory();
        
        assert(engine.completedTransactions.length === 0, 'Should clear completed');
        assert(engine.failedTransactions.length === 0, 'Should clear failed');
    });
    
    // Test 12: Reset engine
    test('Can reset transaction engine', () => {
        const gameStateManager = createMockGameStateManager();
        const engine = new TransactionEngine(gameStateManager);
        
        // Create transactions
        engine.createTransaction('player1', 'player2', 'mana', 50, 10);
        engine.transactionCounter = 5;
        
        // Reset
        engine.reset();
        
        assert(engine.pendingTransactions.length === 0, 'Should clear pending');
        assert(engine.transactionCounter === 0, 'Should reset counter');
    });
    
    // Run all tests
    tests.forEach(({ name, fn }) => {
        try {
            fn();
            console.log(`✅ ${name}`);
            testResults.passed++;
        } catch (error) {
            console.log(`❌ ${name}: ${error.message}`);
            testResults.failed++;
            testResults.failedTests.push({ name, error: error.message });
        }
    });
    
    // Summary
    console.log('\n=== Test Results ===');
    console.log(`Total tests: ${tests.length}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    
    if (testResults.failedTests.length > 0) {
        console.log('\nFailed tests:');
        testResults.failedTests
            .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
    }
    
    return testResults.failed === 0;
}

// Run the tests
runTests();