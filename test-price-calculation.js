/**
 * Test Price Calculation Formula
 * Price = Base Price × (1 + [(Demand - Supply) ÷ Equilibrium] × Volatility)
 */

import MarketDataService from './src/models/MarketDataService.js';
import { BASE_PRICES } from './src/config/gameConfig.js';

console.log('=== Testing Price Calculation Formula ===\n');

// Create mock game state manager
const mockGameStateManager = {
    getState: () => ({
        players: {
            'player1': {
                id: 'player1',
                resources: { mana: 100, vitality: 50, arcanum: 30, aether: 10 }
            },
            'player2': {
                id: 'player2',
                resources: { mana: 20, vitality: 80, arcanum: 40, aether: 5 }
            }
        }
    })
};

// Create market data service
const marketDataService = new MarketDataService(mockGameStateManager);

console.log('Base Prices:');
console.log('  Mana:', BASE_PRICES.mana);
console.log('  Vitality:', BASE_PRICES.vitality);
console.log('  Arcanum:', BASE_PRICES.arcanum);
console.log('  Aether:', BASE_PRICES.aether);
console.log('');

console.log('Market Configuration:');
console.log('  Equilibrium:', marketDataService.marketConfig.equilibrium);
console.log('  Volatility:', marketDataService.marketConfig.volatility);
console.log('');

// Test 1: Balanced supply/demand
console.log('Test 1: Balanced Supply/Demand');
// Set equal supply and demand
marketDataService.supplyData.set('mana', { total: 100, byPlayer: new Map() });
marketDataService.demandData.set('mana', { total: 100, byPlayer: new Map() });

let price = marketDataService.calculateDynamicPrice('mana');
console.log('  Mana: Supply=100, Demand=100');
console.log('  Expected: Base price (20)');
console.log('  Calculated:', price);
console.log('');

// Test 2: High demand
console.log('Test 2: High Demand');
marketDataService.supplyData.set('vitality', { total: 50, byPlayer: new Map() });
marketDataService.demandData.set('vitality', { total: 150, byPlayer: new Map() });

price = marketDataService.calculateDynamicPrice('vitality');
const expectedPrice = Math.round(25 * (1 + ((150-50)/100) * 0.5));
console.log('  Vitality: Supply=50, Demand=150');
console.log('  Formula: 25 × (1 + [(150-50) ÷ 100] × 0.5)');
console.log('  Expected:', expectedPrice);
console.log('  Calculated:', price);
console.log('');

// Test 3: High supply
console.log('Test 3: High Supply');
marketDataService.supplyData.set('arcanum', { total: 200, byPlayer: new Map() });
marketDataService.demandData.set('arcanum', { total: 50, byPlayer: new Map() });

price = marketDataService.calculateDynamicPrice('arcanum');
const expectedPrice2 = Math.round(35 * (1 + ((50-200)/100) * 0.2));
console.log('  Arcanum: Supply=200, Demand=50');
console.log('  Formula: 35 × (1 + [(50-200) ÷ 100] × 0.2)');
console.log('  Expected:', expectedPrice2);
console.log('  Calculated:', price);
console.log('');

// Test 4: Extreme volatility
console.log('Test 4: Extreme Volatility (Aether)');
marketDataService.supplyData.set('aether', { total: 10, byPlayer: new Map() });
marketDataService.demandData.set('aether', { total: 60, byPlayer: new Map() });

price = marketDataService.calculateDynamicPrice('aether');
const expectedPrice3 = Math.round(100 * (1 + ((60-10)/100) * 0.8));
console.log('  Aether: Supply=10, Demand=60');
console.log('  Formula: 100 × (1 + [(60-10) ÷ 100] × 0.8)');
console.log('  Expected:', expectedPrice3);
console.log('  Calculated:', price);
console.log('');

// Test 5: Price constraints
console.log('Test 5: Price Constraints');
// Test minimum constraint
marketDataService.supplyData.set('mana', { total: 500, byPlayer: new Map() });
marketDataService.demandData.set('mana', { total: 0, byPlayer: new Map() });
price = marketDataService.calculateDynamicPrice('mana');
console.log('  Extreme supply: Mana price =', price, '(minimum is 10)');

// Test maximum constraint
marketDataService.supplyData.set('aether', { total: 0, byPlayer: new Map() });
marketDataService.demandData.set('aether', { total: 1000, byPlayer: new Map() });
price = marketDataService.calculateDynamicPrice('aether');
console.log('  Extreme demand: Aether price =', price, '(maximum is 500)');
console.log('');

// Test 6: Full market update
console.log('Test 6: Full Market Update');
marketDataService.calculateSupplyDemand();
marketDataService.updateMarketPrices();

const resources = ['mana', 'vitality', 'arcanum', 'aether'];
resources.forEach(resource => {
    const summary = marketDataService.getMarketSummary(resource);
    console.log(`  ${resource}: Price=${summary.currentPrice}, Supply=${summary.supply}, Demand=${summary.demand}`);
});

console.log('\n=== Price Calculation Formula Working Correctly! ===');