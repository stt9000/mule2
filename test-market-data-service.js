/**
 * Test suite for MarketDataService
 */
import MarketDataService from './src/models/MarketDataService.js';

// Mock game state manager
const mockGameStateManager = {
    getState: () => ({
        players: {
            'player1': {
                id: 'player1',
                resources: {
                    mana: 50,
                    vitality: 30,
                    arcanum: 20,
                    aether: 10
                },
                plannedConstructs: [
                    {
                        resourceCost: {
                            mana: 40,
                            vitality: 20
                        }
                    }
                ]
            },
            'player2': {
                id: 'player2',
                resources: {
                    mana: 100,
                    vitality: 80,
                    arcanum: 60,
                    aether: 40
                },
                plannedConstructs: [
                    {
                        resourceCost: {
                            arcanum: 100,
                            aether: 50
                        }
                    }
                ]
            }
        }
    })
};

// Test runner
function runTests() {
    console.log('=== Testing MarketDataService ===\n');
    
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
    
    // Test 1: MarketDataService initialization
    test('MarketDataService initializes correctly', () => {
        const service = new MarketDataService(mockGameStateManager);
        assert(service.priceHistory.size === 4, 'Should have 4 resources');
        assert(service.marketMetrics.size === 4, 'Should have metrics for 4 resources');
        assert(service.supplyData.size === 4, 'Should have supply data for 4 resources');
        assert(service.demandData.size === 4, 'Should have demand data for 4 resources');
        
        // Check initial values
        const manaHistory = service.priceHistory.get('mana');
        assert(manaHistory.length === 1, 'Should have initial price entry');
        assert(manaHistory[0].price === 50, 'Initial price should be 50');
    });
    
    // Test 2: Record trade
    test('Can record trades', () => {
        const service = new MarketDataService(mockGameStateManager);
        
        const result = service.recordTrade('mana', 55, 10);
        assert(result === true, 'Should successfully record trade');
        
        const history = service.priceHistory.get('mana');
        assert(history.length === 2, 'Should have 2 price entries');
        assert(history[1].price === 55, 'Should record correct price');
        assert(history[1].volume === 10, 'Should record correct volume');
    });
    
    // Test 3: Market metrics calculation
    test('Calculates market metrics correctly', () => {
        const service = new MarketDataService(mockGameStateManager);
        
        // Record several trades
        service.recordTrade('mana', 45, 5);
        service.recordTrade('mana', 55, 8);
        service.recordTrade('mana', 60, 12);
        service.recordTrade('mana', 50, 7);
        
        const metrics = service.marketMetrics.get('mana');
        assert(metrics.min === 45, 'Should track minimum price');
        assert(metrics.max === 60, 'Should track maximum price');
        assert(metrics.avg === 52, 'Should calculate correct average');
        assert(metrics.volatility > 0, 'Should calculate volatility');
    });
    
    // Test 4: Supply and demand calculation
    test('Calculates supply and demand', () => {
        const service = new MarketDataService(mockGameStateManager);
        service.calculateSupplyDemand();
        
        // Check mana supply (player1: 50, player2: 100)
        const manaSupply = service.supplyData.get('mana');
        assert(manaSupply.total === 150, 'Should calculate total mana supply');
        assert(manaSupply.byPlayer.get('player1') === 50, 'Should track player1 mana');
        assert(manaSupply.byPlayer.get('player2') === 100, 'Should track player2 mana');
        
        // Check arcanum demand (player2 needs 100 but has 60, so needs 40)
        const arcanumDemand = service.demandData.get('arcanum');
        assert(arcanumDemand.total === 40, 'Should calculate arcanum demand');
        assert(arcanumDemand.byPlayer.get('player2') === 40, 'Should track player2 demand');
    });
    
    // Test 5: Price trend analysis
    test('Analyzes price trends', () => {
        const service = new MarketDataService(mockGameStateManager);
        
        // Create rising trend
        for (let i = 0; i < 10; i++) {
            service.recordTrade('mana', 50 + i * 2, 5);
        }
        
        const trend = service.getPriceTrend('mana');
        assert(trend === 'rising', 'Should detect rising trend');
        
        // Create falling trend
        for (let i = 0; i < 10; i++) {
            service.recordTrade('vitality', 70 - i * 2, 5);
        }
        
        const vitalityTrend = service.getPriceTrend('vitality');
        assert(vitalityTrend === 'falling', 'Should detect falling trend');
    });
    
    // Test 6: Market pressure calculation
    test('Calculates market pressure', () => {
        const service = new MarketDataService(mockGameStateManager);
        service.calculateSupplyDemand();
        
        // Manually set supply/demand for testing
        service.supplyData.set('mana', { total: 100, byPlayer: new Map() });
        service.demandData.set('mana', { total: 200, byPlayer: new Map() });
        
        const pressure = service.calculateMarketPressure('mana');
        assert(pressure === 'high_demand', 'Should detect high demand');
        
        service.supplyData.set('vitality', { total: 200, byPlayer: new Map() });
        service.demandData.set('vitality', { total: 50, byPlayer: new Map() });
        
        const vitalityPressure = service.calculateMarketPressure('vitality');
        assert(vitalityPressure === 'high_supply', 'Should detect high supply');
    });
    
    // Test 7: Market events
    test('Tracks market events', () => {
        const service = new MarketDataService(mockGameStateManager);
        
        service.recordTrade('mana', 55, 10);
        service.recordTrade('vitality', 45, 8);
        
        const events = service.getRecentEvents();
        assert(events.length === 2, 'Should track events');
        assert(events[0].type === 'trade', 'Should record trade events');
        assert(events[0].resource === 'mana', 'Should track resource');
        assert(events[1].resource === 'vitality', 'Should track multiple resources');
    });
    
    // Test 8: Market summary
    test('Provides market summary', () => {
        const service = new MarketDataService(mockGameStateManager);
        service.calculateSupplyDemand();
        service.recordTrade('mana', 55, 10);
        
        const summary = service.getMarketSummary('mana');
        assert(summary.resource === 'mana', 'Should include resource name');
        assert(summary.currentPrice === 55, 'Should show current price');
        assert(summary.metrics !== undefined, 'Should include metrics');
        assert(summary.supply >= 0, 'Should include supply');
        assert(summary.demand >= 0, 'Should include demand');
        assert(summary.trend !== undefined, 'Should include trend');
        assert(summary.marketPressure !== undefined, 'Should include market pressure');
    });
    
    // Test 9: Get all market data
    test('Returns all market data', () => {
        const service = new MarketDataService(mockGameStateManager);
        service.calculateSupplyDemand();
        
        const allData = service.getAllMarketData();
        assert(allData.resources !== undefined, 'Should include resources');
        assert(allData.events !== undefined, 'Should include events');
        assert(Object.keys(allData.resources).length === 4, 'Should have data for all resources');
    });
    
    // Test 10: History trimming
    test('Trims price history', () => {
        const service = new MarketDataService(mockGameStateManager);
        
        // Add more than max history length
        for (let i = 0; i < 110; i++) {
            service.recordTrade('mana', 50 + i % 10, 5);
        }
        
        const history = service.priceHistory.get('mana');
        assert(history.length === 100, 'Should trim to max length');
    });
    
    // Test 11: Invalid resource handling
    test('Handles invalid resources', () => {
        const service = new MarketDataService(mockGameStateManager);
        
        const result = service.recordTrade('invalid', 50, 10);
        assert(result === false, 'Should reject invalid resource');
        
        const summary = service.getMarketSummary('invalid');
        assert(summary.currentPrice === 50, 'Should return default for invalid resource');
    });
    
    // Test 12: Reset functionality
    test('Can reset market data', () => {
        const service = new MarketDataService(mockGameStateManager);
        
        // Add some data
        service.recordTrade('mana', 55, 10);
        service.calculateSupplyDemand();
        
        // Reset
        service.reset();
        
        // Check reset
        const history = service.priceHistory.get('mana');
        assert(history.length === 1, 'Should reset to initial state');
        assert(history[0].price === 50, 'Should have default price');
        assert(service.marketEvents.length === 0, 'Should clear events');
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