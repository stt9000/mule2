/**
 * Test plan for AuctionManager
 * Tests core auction state management functionality
 */

import AuctionManager from './src/models/AuctionManager.js';

// Test results collector
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// Test helper
function test(name, fn) {
    try {
        fn();
        testResults.passed++;
        testResults.tests.push({ name, status: 'PASSED' });
        console.log(`✅ ${name}`);
    } catch (error) {
        testResults.failed++;
        testResults.tests.push({ name, status: 'FAILED', error: error.message });
        console.error(`❌ ${name}: ${error.message}`);
    }
}

// Test assert helper
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

// Run all tests
function runTests() {
    console.log('=== Testing AuctionManager ===\n');
    
    // Test 1: Initialization
    test('AuctionManager initializes correctly', () => {
        const manager = new AuctionManager();
        assert(manager.auctionPhase === 'inactive', 'Should start inactive');
        assert(manager.currentResource === null, 'Should have no resource');
        assert(manager.playerPositions.size === 0, 'Should have no player positions');
        assert(manager.priceHistory.size === 4, 'Should have price history for 4 resources');
    });
    
    // Test 2: Start auction phase
    test('Can start auction phase', () => {
        const manager = new AuctionManager();
        const result = manager.startAuctionPhase();
        assert(result === true, 'Should return true');
        assert(manager.auctionPhase === 'setup', 'Should be in setup phase');
        assert(manager.timeRemaining === 30, 'Should have 30 seconds setup time');
    });
    
    // Test 3: Start resource auction
    test('Can start resource auction', () => {
        const manager = new AuctionManager();
        manager.startAuctionPhase();
        const result = manager.startResourceAuction('mana');
        assert(result === true, 'Should return true');
        assert(manager.currentResource === 'mana', 'Should be auctioning mana');
        assert(manager.auctionPhase === 'active', 'Should be in active phase');
        assert(manager.timeRemaining === 120, 'Should have 120 seconds auction time');
    });
    
    // Test 4: Invalid resource type
    test('Rejects invalid resource type', () => {
        const manager = new AuctionManager();
        const result = manager.startResourceAuction('invalid');
        assert(result === false, 'Should return false for invalid resource');
    });
    
    // Test 5: Update player position
    test('Can update player position', () => {
        const manager = new AuctionManager();
        manager.startAuctionPhase();
        manager.startResourceAuction('mana');
        
        const result = manager.updatePlayerPosition('player1', 45, 'buy', 10);
        assert(result === true, 'Should return true');
        assert(manager.playerPositions.has('player1'), 'Should have player position');
        
        const position = manager.playerPositions.get('player1');
        assert(position.price === 45, 'Should have correct price');
        assert(position.mode === 'buy', 'Should have correct mode');
        assert(position.quantity === 10, 'Should have correct quantity');
    });
    
    // Test 6: Price validation
    test('Validates price range', () => {
        const manager = new AuctionManager();
        manager.startAuctionPhase();
        manager.startResourceAuction('mana');
        
        const tooLow = manager.updatePlayerPosition('player1', 5, 'buy');
        assert(tooLow === false, 'Should reject price below minimum');
        
        const tooHigh = manager.updatePlayerPosition('player1', 105, 'buy');
        assert(tooHigh === false, 'Should reject price above maximum');
        
        const justRight = manager.updatePlayerPosition('player1', 50, 'buy');
        assert(justRight === true, 'Should accept price in range');
    });
    
    // Test 7: Trade detection
    test('Detects and executes trades', () => {
        const manager = new AuctionManager();
        manager.startAuctionPhase();
        manager.startResourceAuction('mana');
        
        // Add buyer at 60
        manager.updatePlayerPosition('buyer1', 60, 'buy', 5);
        // Add seller at 55 - should trigger trade
        manager.updatePlayerPosition('seller1', 55, 'sell', 5);
        
        assert(manager.pendingTrades.length === 1, 'Should have one pending trade');
        const trade = manager.pendingTrades[0];
        assert(trade.buyerId === 'buyer1', 'Should have correct buyer');
        assert(trade.sellerId === 'seller1', 'Should have correct seller');
        assert(trade.price === 57 || trade.price === 58, 'Should have average price');
        assert(trade.quantity === 5, 'Should have correct quantity');
        
        // Players should be removed from positions after trade
        assert(!manager.playerPositions.has('buyer1'), 'Buyer should be removed');
        assert(!manager.playerPositions.has('seller1'), 'Seller should be removed');
    });
    
    // Test 8: No trade when prices don't overlap
    test('No trade when prices do not overlap', () => {
        const manager = new AuctionManager();
        manager.startAuctionPhase();
        manager.startResourceAuction('mana');
        
        // Add buyer at 50
        manager.updatePlayerPosition('buyer1', 50, 'buy', 5);
        // Add seller at 55 - no overlap
        manager.updatePlayerPosition('seller1', 55, 'sell', 5);
        
        assert(manager.pendingTrades.length === 0, 'Should have no trades');
        assert(manager.playerPositions.has('buyer1'), 'Buyer should remain');
        assert(manager.playerPositions.has('seller1'), 'Seller should remain');
    });
    
    // Test 9: End resource auction
    test('Can end resource auction', () => {
        const manager = new AuctionManager();
        manager.startAuctionPhase();
        manager.startResourceAuction('mana');
        
        // Add a trade
        manager.updatePlayerPosition('buyer1', 60, 'buy', 5);
        manager.updatePlayerPosition('seller1', 55, 'sell', 5);
        
        const result = manager.endResourceAuction();
        assert(result === true, 'Should return true');
        assert(manager.auctionPhase === 'resolution', 'Should be in resolution phase');
        assert(manager.transactions.length === 1, 'Should have processed transaction');
        assert(manager.pendingTrades.length === 0, 'Should clear pending trades');
    });
    
    // Test 10: Price history tracking
    test('Tracks price history', () => {
        const manager = new AuctionManager();
        const initialHistory = manager.priceHistory.get('mana');
        assert(initialHistory.length === 1, 'Should have initial price');
        
        manager.startAuctionPhase();
        manager.startResourceAuction('mana');
        manager.lastTradePrice = 65;
        manager.endResourceAuction();
        
        const updatedHistory = manager.priceHistory.get('mana');
        assert(updatedHistory.length === 2, 'Should have two prices');
        assert(updatedHistory[1] === 65, 'Should have new price');
    });
    
    // Test 11: Timer updates
    test('Timer counts down', () => {
        const manager = new AuctionManager();
        manager.startAuctionPhase();
        assert(manager.timeRemaining === 30, 'Should start at 30');
        
        manager.updateTimer(10);
        assert(manager.timeRemaining === 20, 'Should decrease by 10');
        
        manager.updateTimer(20);
        // After timer reaches 0 in setup, it auto-starts mana auction with 120s
        assert(manager.timeRemaining === 120, 'Should reset to 120 for mana auction');
        assert(manager.auctionPhase === 'active', 'Should auto-start mana auction');
        assert(manager.currentResource === 'mana', 'Should be auctioning mana');
    });
    
    // Test 12: Get state
    test('Returns current state', () => {
        const manager = new AuctionManager();
        manager.startAuctionPhase();
        manager.startResourceAuction('vitality');
        manager.updatePlayerPosition('player1', 45, 'buy', 8);
        
        const state = manager.getState();
        assert(state.phase === 'active', 'Should have correct phase');
        assert(state.currentResource === 'vitality', 'Should have correct resource');
        assert(state.playerPositions.length === 1, 'Should have player position');
        assert(state.playerPositions[0].playerId === 'player1', 'Should have correct player');
    });
    
    // Test 13: Reset functionality
    test('Can reset auction system', () => {
        const manager = new AuctionManager();
        manager.startAuctionPhase();
        manager.startResourceAuction('arcanum');
        manager.updatePlayerPosition('player1', 70, 'sell');
        
        manager.reset();
        assert(manager.auctionPhase === 'inactive', 'Should be inactive');
        assert(manager.currentResource === null, 'Should have no resource');
        assert(manager.playerPositions.size === 0, 'Should have no positions');
        assert(manager.timeRemaining === 0, 'Should have no time');
    });
    
    // Display results
    console.log('\n=== Test Results ===');
    console.log(`Total tests: ${testResults.passed + testResults.failed}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    
    if (testResults.failed > 0) {
        console.log('\nFailed tests:');
        testResults.tests
            .filter(t => t.status === 'FAILED')
            .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
    }
    
    return testResults.failed === 0;
}

// Run the tests
runTests();