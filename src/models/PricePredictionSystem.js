/**
 * PricePredictionSystem
 * Predicts future price movements based on market data
 */
export default class PricePredictionSystem {
    constructor(marketDataService) {
        this.marketDataService = marketDataService;
        
        // Prediction configuration
        this.config = {
            historyWindow: 10,      // Number of historical points to consider
            predictionHorizon: 3,   // How many steps ahead to predict
            minDataPoints: 5,       // Minimum data points needed for prediction
            smoothingFactor: 0.3,   // Exponential smoothing factor
            volatilityWeight: 0.2   // Weight given to volatility in predictions
        };
        
        // Cached predictions
        this.predictions = new Map();
        this.lastUpdateTime = new Map();
        this.updateInterval = 5000; // Update predictions every 5 seconds
        
        // Pattern recognition
        this.patterns = {
            uptrend: { threshold: 0.1, weight: 1.2 },
            downtrend: { threshold: -0.1, weight: 0.8 },
            volatility: { threshold: 0.15, weight: 1.0 },
            stability: { threshold: 0.05, weight: 1.0 }
        };
    }
    
    /**
     * Get price prediction for a resource
     */
    getPrediction(resource) {
        // Check cache
        const lastUpdate = this.lastUpdateTime.get(resource) || 0;
        const now = Date.now();
        
        if (now - lastUpdate < this.updateInterval && this.predictions.has(resource)) {
            return this.predictions.get(resource);
        }
        
        // Generate new prediction
        const prediction = this.generatePrediction(resource);
        
        // Cache result
        this.predictions.set(resource, prediction);
        this.lastUpdateTime.set(resource, now);
        
        return prediction;
    }
    
    /**
     * Generate prediction for resource
     */
    generatePrediction(resource) {
        const priceHistory = this.marketDataService.priceHistory.get(resource) || [];
        
        // Not enough data
        if (priceHistory.length < this.config.minDataPoints) {
            return this.getDefaultPrediction(resource);
        }
        
        // Extract recent prices
        const recentPrices = priceHistory
            .slice(-this.config.historyWindow)
            .map(entry => entry.price);
        
        // Calculate indicators
        const trend = this.calculateTrend(recentPrices);
        const volatility = this.calculateVolatility(recentPrices);
        const pattern = this.identifyPattern(recentPrices);
        const support = this.findSupportLevel(recentPrices);
        const resistance = this.findResistanceLevel(recentPrices);
        
        // Generate predictions
        const currentPrice = recentPrices[recentPrices.length - 1];
        const predictions = this.projectPrices(
            currentPrice,
            trend,
            volatility,
            pattern
        );
        
        // Calculate confidence
        const confidence = this.calculateConfidence(
            recentPrices.length,
            volatility,
            pattern
        );
        
        return {
            resource: resource,
            currentPrice: currentPrice,
            predictions: predictions,
            trend: trend,
            volatility: volatility,
            pattern: pattern,
            support: support,
            resistance: resistance,
            confidence: confidence,
            timestamp: Date.now()
        };
    }
    
    /**
     * Calculate price trend
     */
    calculateTrend(prices) {
        if (prices.length < 2) {
            return 0;
        }
        
        // Simple linear regression
        const n = prices.length;
        const indices = Array.from({ length: n }, (_, i) => i);
        
        const sumX = indices.reduce((a, b) => a + b, 0);
        const sumY = prices.reduce((a, b) => a + b, 0);
        const sumXY = indices.reduce((sum, x, i) => sum + x * prices[i], 0);
        const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        
        // Normalize to percentage
        const avgPrice = sumY / n;
        return slope / avgPrice;
    }
    
    /**
     * Calculate price volatility
     */
    calculateVolatility(prices) {
        if (prices.length < 2) {
            return 0;
        }
        
        // Calculate standard deviation
        const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
        const squaredDiffs = prices.map(price => Math.pow(price - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / prices.length;
        const stdDev = Math.sqrt(variance);
        
        // Normalize to percentage
        return stdDev / mean;
    }
    
    /**
     * Identify price pattern
     */
    identifyPattern(prices) {
        const trend = this.calculateTrend(prices);
        const volatility = this.calculateVolatility(prices);
        
        if (trend > this.patterns.uptrend.threshold) {
            return 'uptrend';
        } else if (trend < this.patterns.downtrend.threshold) {
            return 'downtrend';
        } else if (volatility > this.patterns.volatility.threshold) {
            return 'volatile';
        } else {
            return 'stable';
        }
    }
    
    /**
     * Find support level
     */
    findSupportLevel(prices) {
        if (prices.length === 0) return 0;
        
        // Simple approach: recent minimum
        const recentMin = Math.min(...prices.slice(-5));
        return Math.floor(recentMin * 0.95); // 5% below recent min
    }
    
    /**
     * Find resistance level
     */
    findResistanceLevel(prices) {
        if (prices.length === 0) return 100;
        
        // Simple approach: recent maximum
        const recentMax = Math.max(...prices.slice(-5));
        return Math.ceil(recentMax * 1.05); // 5% above recent max
    }
    
    /**
     * Project future prices
     */
    projectPrices(currentPrice, trend, volatility, pattern) {
        const predictions = [];
        let price = currentPrice;
        
        const patternWeight = this.patterns[pattern]?.weight || 1.0;
        
        for (let i = 1; i <= this.config.predictionHorizon; i++) {
            // Apply trend
            price *= (1 + trend * patternWeight);
            
            // Add volatility component
            const volatilityImpact = (Math.random() - 0.5) * volatility * this.config.volatilityWeight;
            price *= (1 + volatilityImpact);
            
            // Apply bounds
            price = Math.max(10, Math.min(100, price));
            
            predictions.push({
                step: i,
                price: Math.round(price),
                range: {
                    low: Math.round(price * (1 - volatility)),
                    high: Math.round(price * (1 + volatility))
                }
            });
        }
        
        return predictions;
    }
    
    /**
     * Calculate prediction confidence
     */
    calculateConfidence(dataPoints, volatility, pattern) {
        let confidence = 0.5; // Base confidence
        
        // More data = higher confidence
        confidence += Math.min(0.3, dataPoints / 20 * 0.3);
        
        // Lower volatility = higher confidence
        confidence += Math.max(0, 0.2 - volatility);
        
        // Stable patterns = higher confidence
        if (pattern === 'stable' || pattern === 'uptrend') {
            confidence += 0.1;
        }
        
        return Math.min(0.9, Math.max(0.1, confidence));
    }
    
    /**
     * Get default prediction when insufficient data
     */
    getDefaultPrediction(resource) {
        const currentPrice = this.marketDataService.getCurrentPrice(resource);
        
        return {
            resource: resource,
            currentPrice: currentPrice,
            predictions: [
                { step: 1, price: currentPrice, range: { low: 40, high: 60 } },
                { step: 2, price: currentPrice, range: { low: 35, high: 65 } },
                { step: 3, price: currentPrice, range: { low: 30, high: 70 } }
            ],
            trend: 0,
            volatility: 0.1,
            pattern: 'unknown',
            support: 40,
            resistance: 60,
            confidence: 0.3,
            timestamp: Date.now()
        };
    }
    
    /**
     * Get prediction summary for all resources
     */
    getAllPredictions() {
        const resources = ['mana', 'vitality', 'arcanum', 'aether'];
        const summary = {};
        
        resources.forEach(resource => {
            summary[resource] = this.getPrediction(resource);
        });
        
        return summary;
    }
    
    /**
     * Get trading recommendation based on prediction
     */
    getRecommendation(resource, currentPosition = 0) {
        const prediction = this.getPrediction(resource);
        
        if (prediction.confidence < 0.4) {
            return { action: 'hold', confidence: prediction.confidence };
        }
        
        const currentPrice = prediction.currentPrice;
        const predictedPrice = prediction.predictions[0].price;
        const priceChange = (predictedPrice - currentPrice) / currentPrice;
        
        if (priceChange > 0.1 && prediction.pattern === 'uptrend') {
            return { 
                action: 'buy', 
                confidence: prediction.confidence,
                targetPrice: Math.round(currentPrice * 0.95),
                reason: 'Uptrend detected with positive price projection'
            };
        } else if (priceChange < -0.1 && prediction.pattern === 'downtrend') {
            return { 
                action: 'sell', 
                confidence: prediction.confidence,
                targetPrice: Math.round(currentPrice * 1.05),
                reason: 'Downtrend detected with negative price projection'
            };
        } else if (prediction.volatility > 0.2) {
            return { 
                action: 'wait', 
                confidence: prediction.confidence,
                reason: 'High volatility - wait for clearer signals'
            };
        }
        
        return { action: 'hold', confidence: prediction.confidence };
    }
}