/**
 * Integration test for AuctionHallPanel
 * Tests the UI component integration with auction system
 */
import AuctionManager from './src/models/AuctionManager.js';
import MarketDataService from './src/models/MarketDataService.js';
import TransactionEngine from './src/models/TransactionEngine.js';

// Test runner
function runIntegrationTests() {
    console.log('=== Testing Auction System Integration ===\n');
    
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
    
    // Test 1: Full auction flow integration
    test('Complete auction flow works correctly', () => {
        // Create mock game state manager
        const gameStateManager = {
            getState: () => ({
                players: {
                    'player1': {
                        id: 'player1',
                        name: 'Player 1',
                        gold: 1000,
                        resources: { mana: 50, vitality: 30, arcanum: 20, aether: 10 }
                    },
                    'player2': {
                        id: 'player2',
                        name: 'Player 2',
                        gold: 800,
                        resources: { mana: 100, vitality: 80, arcanum: 60, aether: 40 }
                    }
                }
            })
        };
        
        // Create services
        const marketData = new MarketDataService(gameStateManager);
        const transactionEngine = new TransactionEngine(gameStateManager, marketData);
        const auctionManager = new AuctionManager({ events: null });
        
        // Start auction
        auctionManager.startAuctionPhase();
        assert(auctionManager.auctionPhase === 'setup', 'Should be in setup phase');
        
        // Simulate timer to start resource auction
        auctionManager.updateTimer(30);
        assert(auctionManager.auctionPhase === 'active', 'Should start active phase');
        assert(auctionManager.currentResource === 'mana', 'Should start with mana');
        
        // Place player positions
        auctionManager.updatePlayerPosition('player1', 60, 'buy', 10);
        auctionManager.updatePlayerPosition('player2', 50, 'sell', 10);
        
        // Check trade detection
        auctionManager.checkForTrades();
        assert(auctionManager.pendingTrades.length === 1, 'Should detect trade');
        
        // End auction and process trades
        const tradesBeforeEnd = [...auctionManager.pendingTrades]; // Copy before clearing
        const success = auctionManager.endResourceAuction();
        assert(success === true, 'Should end auction successfully');
        
        // Process through transaction engine
        tradesBeforeEnd.forEach(trade => {
            transactionEngine.createTransaction(
                trade.buyerId,
                trade.sellerId,
                trade.resource,
                trade.price,
                trade.quantity
            );
        });
        
        const results = transactionEngine.processPendingTransactions();
        assert(results.succeeded === 1, 'Should process trade successfully');
        
        // Check market data was updated
        const marketSummary = marketData.getMarketSummary('mana');
        assert(marketSummary.currentPrice === 55, 'Should record trade price');
    });
    
    // Test 2: Multi-resource auction cycle
    test('Multi-resource auction cycle', () => {
        const auctionManager = new AuctionManager({ events: null });
        const resources = ['mana', 'vitality', 'arcanum', 'aether'];
        let currentIndex = 0;
        
        // Start auction
        auctionManager.startAuctionPhase();
        auctionManager.updateTimer(30); // Skip setup
        
        // Test cycling through resources
        for (let i = 0; i < 4; i++) {
            assert(auctionManager.currentResource === resources[i], `Should be auctioning ${resources[i]}`);
            
            // Place some positions
            auctionManager.updatePlayerPosition('player1', 50 + i * 5, 'buy', 5);
            auctionManager.updatePlayerPosition('player2', 50 - i * 5, 'sell', 5);
            
            // End current resource
            auctionManager.endResourceAuction();
            
            if (i < 3) {
                // Manually start next resource (in real app this would be automatic)
                auctionManager.startResourceAuction(resources[i + 1]);
                assert(auctionManager.auctionPhase === 'active', 'Should remain active');
                assert(auctionManager.currentResource === resources[i + 1], 'Should move to next resource');
            } else {
                // After last resource, should still be active (aether)
                assert(auctionManager.currentResource === 'aether', 'Should be on last resource');
            }
        }
    });
    
    // Test 3: Price validation in UI context
    test('Price validation for UI display', () => {
        const auctionManager = new AuctionManager({ events: null });
        auctionManager.startAuctionPhase();
        auctionManager.startResourceAuction('mana');
        
        // Test price boundaries
        const validPrices = [10, 50, 100];
        const invalidPrices = [5, 105, -10, 0];
        
        validPrices.forEach(price => {
            const result = auctionManager.updatePlayerPosition('player1', price, 'buy', 5);
            assert(result === true, `Should accept valid price ${price}`);
        });
        
        invalidPrices.forEach(price => {
            const result = auctionManager.updatePlayerPosition('player1', price, 'buy', 5);
            assert(result === false, `Should reject invalid price ${price}`);
        });
    });
    
    // Test 4: Market data visualization requirements
    test('Market data provides UI requirements', () => {
        const gameStateManager = {
            getState: () => ({
                players: {
                    'player1': { 
                        id: 'player1', 
                        resources: { mana: 100, vitality: 50 }
                    }
                }
            })
        };
        
        const marketData = new MarketDataService(gameStateManager);
        
        // Record some trades for trend analysis
        for (let i = 0; i < 5; i++) {
            marketData.recordTrade('mana', 45 + i * 2, 10);
        }
        
        const summary = marketData.getMarketSummary('mana');
        
        // Check UI-relevant data
        assert(summary.currentPrice !== undefined, 'Should have current price');
        assert(summary.trend !== undefined, 'Should have trend');
        assert(summary.metrics !== undefined, 'Should have metrics');
        assert(summary.marketPressure !== undefined, 'Should have market pressure');
        assert(summary.trend === 'rising', 'Should detect rising trend');
    });
    
    // Test 5: Player position updates for animation
    test('Player position tracking for animations', () => {
        const auctionManager = new AuctionManager({ events: null });
        auctionManager.startAuctionPhase();
        auctionManager.startResourceAuction('vitality');
        
        // Initial position
        auctionManager.updatePlayerPosition('player1', 40, 'buy', 8);
        let position = auctionManager.playerPositions.get('player1');
        assert(position.price === 40, 'Should set initial price');
        
        // Update position (simulating drag)
        auctionManager.updatePlayerPosition('player1', 45, 'buy', 8);
        position = auctionManager.playerPositions.get('player1');
        assert(position.price === 45, 'Should update price');
        
        // Change mode
        auctionManager.updatePlayerPosition('player1', 45, 'sell', 8);
        position = auctionManager.playerPositions.get('player1');
        assert(position.mode === 'sell', 'Should update mode');
    });
    
    // Test 6: Auction state for UI visibility
    test('Auction states trigger UI visibility', () => {
        const auctionManager = new AuctionManager({ events: null });
        
        // Initial state
        let state = auctionManager.getState();
        assert(state.phase === 'inactive', 'Should start inactive');
        
        // Setup phase
        auctionManager.startAuctionPhase();
        state = auctionManager.getState();
        assert(state.phase === 'setup', 'Should show setup');
        assert(state.timeRemaining === 30, 'Should have setup timer');
        
        // Active phase
        auctionManager.startResourceAuction('arcanum');
        state = auctionManager.getState();
        assert(state.phase === 'active', 'Should show active');
        assert(state.currentResource === 'arcanum', 'Should show current resource');
        
        // Resolution phase
        auctionManager.auctionPhase = 'resolution';
        state = auctionManager.getState();
        assert(state.phase === 'resolution', 'Should show resolution');
    });
    
    // Test 7: Trade execution feedback
    test('Trade execution provides feedback for UI', () => {
        // Create persistent state
        const state = {
            players: {
                'player1': { id: 'player1', gold: 500, resources: { aether: 20 } },
                'player2': { id: 'player2', gold: 300, resources: { aether: 50 } }
            }
        };
        
        const gameStateManager = {
            getState: () => state
        };
        
        const marketData = new MarketDataService(gameStateManager);
        const transactionEngine = new TransactionEngine(gameStateManager, marketData);
        
        // Create transaction (50 * 10 = 500, player1 has exactly 500 gold)
        const txnId = transactionEngine.createTransaction('player1', 'player2', 'aether', 50, 10);
        
        // Process
        const results = transactionEngine.processPendingTransactions();
        
        // Get transaction for UI feedback
        const transaction = transactionEngine.getTransaction(txnId);
        assert(transaction.status === 'completed', 'Should complete transaction');
        assert(transaction.price === 50, 'Should have price for display');
        assert(transaction.quantity === 10, 'Should have quantity for display');
        
        // Check market event was created
        const events = marketData.getRecentEvents();
        assert(events.length > 0, 'Should create market event');
        assert(events[0].type === 'trade', 'Should be trade event');
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
runIntegrationTests();