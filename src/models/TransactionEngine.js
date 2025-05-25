/**
 * TransactionEngine
 * Manages trade execution, validation, and settlement
 */
export default class TransactionEngine {
    constructor(gameStateManager, marketDataService) {
        this.gameStateManager = gameStateManager;
        this.marketDataService = marketDataService;
        
        // Transaction queues
        this.pendingTransactions = [];
        this.processingTransactions = [];
        this.completedTransactions = [];
        this.failedTransactions = [];
        
        // Transaction limits
        this.maxPendingTransactions = 100;
        this.maxCompletedHistory = 1000;
        
        // Validation rules
        this.minTradeAmount = 1;
        this.maxTradeAmount = 999;
        
        // Transaction ID counter
        this.transactionCounter = 0;
    }
    
    /**
     * Create a new transaction
     */
    createTransaction(buyerId, sellerId, resource, price, quantity) {
        // Generate unique ID
        const transactionId = `txn_${Date.now()}_${++this.transactionCounter}`;
        
        const transaction = {
            id: transactionId,
            buyerId: buyerId,
            sellerId: sellerId,
            resource: resource,
            price: price,
            quantity: quantity,
            status: 'pending',
            timestamp: Date.now(),
            attempts: 0,
            errors: []
        };
        
        // Add to pending queue
        this.pendingTransactions.push(transaction);
        
        // Trim queue if too long
        if (this.pendingTransactions.length > this.maxPendingTransactions) {
            const removed = this.pendingTransactions.shift();
            this.failTransaction(removed, 'Queue overflow');
        }
        
        return transactionId;
    }
    
    /**
     * Validate a transaction
     */
    validateTransaction(transaction) {
        const errors = [];
        
        // Check basic parameters
        if (!transaction.buyerId || !transaction.sellerId) {
            errors.push('Invalid buyer or seller ID');
        }
        
        if (transaction.buyerId === transaction.sellerId) {
            errors.push('Cannot trade with yourself');
        }
        
        if (!['mana', 'vitality', 'arcanum', 'aether'].includes(transaction.resource)) {
            errors.push('Invalid resource type');
        }
        
        if (transaction.price < 1 || transaction.price > 999) {
            errors.push('Price out of valid range (1-999)');
        }
        
        if (transaction.quantity < this.minTradeAmount || transaction.quantity > this.maxTradeAmount) {
            errors.push(`Quantity out of valid range (${this.minTradeAmount}-${this.maxTradeAmount})`);
        }
        
        // Check game state if available
        if (this.gameStateManager) {
            const gameState = this.gameStateManager.getState();
            if (gameState && gameState.players) {
                // Check buyer has enough gold
                const buyer = gameState.players[transaction.buyerId];
                if (buyer) {
                    const totalCost = transaction.price * transaction.quantity;
                    if ((buyer.gold || 0) < totalCost) {
                        errors.push(`Buyer lacks sufficient gold (needs ${totalCost}, has ${buyer.gold || 0})`);
                    }
                } else {
                    errors.push('Buyer not found in game state');
                }
                
                // Check seller has enough resources
                const seller = gameState.players[transaction.sellerId];
                if (seller) {
                    const sellerAmount = (seller.resources && seller.resources[transaction.resource]) || 0;
                    if (sellerAmount < transaction.quantity) {
                        errors.push(`Seller lacks sufficient ${transaction.resource} (needs ${transaction.quantity}, has ${sellerAmount})`);
                    }
                } else {
                    errors.push('Seller not found in game state');
                }
            }
        }
        
        return errors;
    }
    
    /**
     * Process pending transactions
     */
    processPendingTransactions() {
        const results = {
            processed: 0,
            succeeded: 0,
            failed: 0,
            errors: []
        };
        
        // Move pending to processing
        while (this.pendingTransactions.length > 0) {
            const transaction = this.pendingTransactions.shift();
            this.processingTransactions.push(transaction);
        }
        
        // Process each transaction
        const toProcess = [...this.processingTransactions];
        this.processingTransactions = [];
        
        toProcess.forEach(transaction => {
            results.processed++;
            
            // Validate
            const errors = this.validateTransaction(transaction);
            if (errors.length > 0) {
                transaction.errors = errors;
                this.failTransaction(transaction, errors.join(', '));
                results.failed++;
                results.errors.push({ id: transaction.id, errors });
                return;
            }
            
            // Execute
            const success = this.executeTransaction(transaction);
            if (success) {
                results.succeeded++;
            } else {
                results.failed++;
                results.errors.push({ 
                    id: transaction.id, 
                    errors: transaction.errors || ['Execution failed'] 
                });
            }
        });
        
        return results;
    }
    
    /**
     * Execute a single transaction
     */
    executeTransaction(transaction) {
        try {
            // Update game state if available
            if (this.gameStateManager) {
                const gameState = this.gameStateManager.getState();
                if (!gameState || !gameState.players) {
                    this.failTransaction(transaction, 'Game state not available');
                    return false;
                }
                
                const buyer = gameState.players[transaction.buyerId];
                const seller = gameState.players[transaction.sellerId];
                
                if (!buyer || !seller) {
                    this.failTransaction(transaction, 'Player not found');
                    return false;
                }
                
                // Calculate total cost
                const totalCost = transaction.price * transaction.quantity;
                
                // Perform the trade
                // Note: In real implementation, this would use gameStateManager methods
                // For now, we'll simulate the trade
                
                // Deduct gold from buyer
                buyer.gold = (buyer.gold || 0) - totalCost;
                
                // Add gold to seller
                seller.gold = (seller.gold || 0) + totalCost;
                
                // Transfer resources
                seller.resources = seller.resources || {};
                buyer.resources = buyer.resources || {};
                
                seller.resources[transaction.resource] = 
                    (seller.resources[transaction.resource] || 0) - transaction.quantity;
                    
                buyer.resources[transaction.resource] = 
                    (buyer.resources[transaction.resource] || 0) + transaction.quantity;
            }
            
            // Record in market data
            if (this.marketDataService) {
                this.marketDataService.recordTrade(
                    transaction.resource,
                    transaction.price,
                    transaction.quantity
                );
            }
            
            // Mark as completed
            transaction.status = 'completed';
            transaction.completedAt = Date.now();
            this.completedTransactions.push(transaction);
            
            // Trim history if too long
            if (this.completedTransactions.length > this.maxCompletedHistory) {
                this.completedTransactions.shift();
            }
            
            return true;
            
        } catch (error) {
            transaction.errors = [error.message];
            this.failTransaction(transaction, error.message);
            return false;
        }
    }
    
    /**
     * Fail a transaction
     */
    failTransaction(transaction, reason) {
        transaction.status = 'failed';
        transaction.failedAt = Date.now();
        transaction.failureReason = reason;
        this.failedTransactions.push(transaction);
        
        // Keep only recent failures
        if (this.failedTransactions.length > 100) {
            this.failedTransactions.shift();
        }
    }
    
    /**
     * Get transaction by ID
     */
    getTransaction(transactionId) {
        // Check all queues
        const allTransactions = [
            ...this.pendingTransactions,
            ...this.processingTransactions,
            ...this.completedTransactions,
            ...this.failedTransactions
        ];
        
        return allTransactions.find(t => t.id === transactionId);
    }
    
    /**
     * Get transaction history
     */
    getTransactionHistory(filter = {}) {
        let transactions = [...this.completedTransactions, ...this.failedTransactions];
        
        // Apply filters
        if (filter.playerId) {
            transactions = transactions.filter(t => 
                t.buyerId === filter.playerId || t.sellerId === filter.playerId
            );
        }
        
        if (filter.resource) {
            transactions = transactions.filter(t => t.resource === filter.resource);
        }
        
        if (filter.status) {
            transactions = transactions.filter(t => t.status === filter.status);
        }
        
        if (filter.startTime) {
            transactions = transactions.filter(t => t.timestamp >= filter.startTime);
        }
        
        if (filter.endTime) {
            transactions = transactions.filter(t => t.timestamp <= filter.endTime);
        }
        
        // Sort by timestamp descending
        transactions.sort((a, b) => b.timestamp - a.timestamp);
        
        // Limit results
        if (filter.limit) {
            transactions = transactions.slice(0, filter.limit);
        }
        
        return transactions;
    }
    
    /**
     * Get transaction statistics
     */
    getStatistics() {
        const stats = {
            pending: this.pendingTransactions.length,
            processing: this.processingTransactions.length,
            completed: this.completedTransactions.length,
            failed: this.failedTransactions.length,
            total: 0,
            successRate: 0,
            volumeByResource: {},
            averagePriceByResource: {}
        };
        
        stats.total = stats.completed + stats.failed;
        stats.successRate = stats.total > 0 ? 
            Math.round((stats.completed / stats.total) * 100) : 0;
        
        // Calculate volume and average prices
        const resources = ['mana', 'vitality', 'arcanum', 'aether'];
        resources.forEach(resource => {
            const resourceTrades = this.completedTransactions.filter(t => t.resource === resource);
            const totalVolume = resourceTrades.reduce((sum, t) => sum + t.quantity, 0);
            const totalValue = resourceTrades.reduce((sum, t) => sum + (t.price * t.quantity), 0);
            
            stats.volumeByResource[resource] = totalVolume;
            stats.averagePriceByResource[resource] = totalVolume > 0 ?
                Math.round(totalValue / totalVolume) : 0;
        });
        
        return stats;
    }
    
    /**
     * Clear transaction history
     */
    clearHistory() {
        this.completedTransactions = [];
        this.failedTransactions = [];
    }
    
    /**
     * Reset engine
     */
    reset() {
        this.pendingTransactions = [];
        this.processingTransactions = [];
        this.completedTransactions = [];
        this.failedTransactions = [];
        this.transactionCounter = 0;
    }
}