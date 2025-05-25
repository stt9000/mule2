/**
 * AuctionSystemIntegration
 * Integrates auction components with game flow
 */
export default class AuctionSystemIntegration {
    constructor(scene) {
        this.scene = scene;
        this.auctionManager = null;
        this.marketDataService = null;
        this.transactionEngine = null;
        this.gameStateManager = null;
        this.marketEventSystem = null;
        this.resourceQueueManager = null;
        this.auctionAnalytics = null;
        
        // Integration timers
        this.tradeCheckTimer = null;
        this.tradeCheckInterval = 500; // Check for trades every 500ms
        
        // Transaction queue
        this.pendingTransactions = [];
        this.isProcessing = false;
    }
    
    /**
     * Initialize the integration with auction components
     */
    initialize(auctionManager, marketDataService, transactionEngine, gameStateManager, marketEventSystem, resourceQueueManager) {
        this.auctionManager = auctionManager;
        this.marketDataService = marketDataService;
        this.transactionEngine = transactionEngine;
        this.gameStateManager = gameStateManager;
        this.marketEventSystem = marketEventSystem;
        this.resourceQueueManager = resourceQueueManager;
        
        // Connect market event system to auction manager
        if (this.auctionManager && this.marketEventSystem) {
            this.auctionManager.setMarketEventSystem(this.marketEventSystem);
        }
        
        // Connect resource queue manager to auction manager
        if (this.auctionManager && this.resourceQueueManager) {
            this.auctionManager.setResourceQueueManager(this.resourceQueueManager);
        }
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('AuctionSystemIntegration initialized');
    }
    
    /**
     * Set up event listeners for auction events
     */
    setupEventListeners() {
        // Listen for player position updates
        this.scene.events.on('player-position-set', this.onPlayerPositionSet.bind(this));
        
        // Listen for auction phase changes
        if (this.scene.gameFlowController) {
            this.scene.gameFlowController.on('auction_phase.started', this.onAuctionPhaseStarted.bind(this));
            this.scene.gameFlowController.on('auction_phase.ended', this.onAuctionPhaseEnded.bind(this));
        }
    }
    
    /**
     * Handle player position set event
     */
    onPlayerPositionSet(data) {
        console.log('Player position set:', data);
        
        // Check for new trades immediately
        this.checkForTrades();
    }
    
    /**
     * Handle auction phase start
     */
    onAuctionPhaseStarted() {
        // Start periodic trade checking
        this.startTradeChecking();
    }
    
    /**
     * Handle auction phase end
     */
    onAuctionPhaseEnded() {
        // Stop trade checking
        this.stopTradeChecking();
        
        // Process any remaining trades
        this.processAllPendingTrades();
    }
    
    /**
     * Start periodic trade checking
     */
    startTradeChecking() {
        if (this.tradeCheckTimer) {
            return; // Already running
        }
        
        this.tradeCheckTimer = this.scene.time.addEvent({
            delay: this.tradeCheckInterval,
            callback: this.checkForTrades,
            callbackScope: this,
            loop: true
        });
        
        console.log('Started trade checking timer');
    }
    
    /**
     * Stop periodic trade checking
     */
    stopTradeChecking() {
        if (this.tradeCheckTimer) {
            this.tradeCheckTimer.destroy();
            this.tradeCheckTimer = null;
            console.log('Stopped trade checking timer');
        }
    }
    
    /**
     * Check for new trades and queue them
     */
    checkForTrades() {
        if (!this.auctionManager || !this.auctionManager.currentResource) {
            return;
        }
        
        // Check for trades in auction manager
        this.auctionManager.checkForTrades();
        
        // Get pending trades from auction manager
        const auctionTrades = this.auctionManager.pendingTrades || [];
        
        // Convert to transaction engine format and queue
        auctionTrades.forEach(trade => {
            // Check if trade already queued
            const exists = this.pendingTransactions.some(t => 
                t.buyerId === trade.buyerId && 
                t.sellerId === trade.sellerId &&
                t.resource === trade.resource &&
                t.timestamp === trade.timestamp
            );
            
            if (!exists) {
                this.queueTransaction(trade);
            }
        });
        
        // Process queue
        this.processPendingTransactions();
    }
    
    /**
     * Queue a transaction for processing
     */
    queueTransaction(trade) {
        const transaction = {
            buyerId: trade.buyerId,
            sellerId: trade.sellerId,
            resource: trade.resource,
            price: trade.price,
            quantity: trade.quantity,
            timestamp: trade.timestamp,
            auctionTradeId: trade.id
        };
        
        this.pendingTransactions.push(transaction);
        console.log('Queued transaction:', transaction);
    }
    
    /**
     * Process pending transactions
     */
    async processPendingTransactions() {
        if (this.isProcessing || this.pendingTransactions.length === 0) {
            return;
        }
        
        this.isProcessing = true;
        
        try {
            while (this.pendingTransactions.length > 0) {
                const transaction = this.pendingTransactions.shift();
                await this.processTransaction(transaction);
            }
        } catch (error) {
            console.error('Error processing transactions:', error);
        } finally {
            this.isProcessing = false;
        }
    }
    
    /**
     * Process a single transaction
     */
    async processTransaction(transaction) {
        console.log('Processing transaction:', transaction);
        
        // Create transaction in engine
        const txnId = this.transactionEngine.createTransaction(
            transaction.buyerId,
            transaction.sellerId,
            transaction.resource,
            transaction.price,
            transaction.quantity
        );
        
        // Process immediately
        const results = this.transactionEngine.processPendingTransactions();
        
        if (results.succeeded > 0) {
            // Update market data
            this.marketDataService.recordTrade(
                transaction.resource,
                transaction.price,
                transaction.quantity
            );
            
            // Show visual feedback
            this.showTransactionFeedback(transaction);
            
            // Remove from auction manager's pending trades
            this.removeAuctionTrade(transaction.auctionTradeId);
            
            // Record in analytics if available
            if (this.scene.auctionAnalytics) {
                this.scene.auctionAnalytics.recordTrade({
                    buyerId: transaction.buyerId,
                    sellerId: transaction.sellerId,
                    resource: transaction.resource,
                    price: transaction.price,
                    quantity: transaction.quantity,
                    timestamp: transaction.timestamp
                });
            }
            
            console.log('Transaction completed successfully');
        } else {
            console.error('Transaction failed:', results.errors);
            
            // Show error feedback
            this.showTransactionError(transaction, results.errors);
        }
        
        // Small delay between transactions for visual effect
        await this.delay(300);
    }
    
    /**
     * Remove trade from auction manager
     */
    removeAuctionTrade(tradeId) {
        if (!this.auctionManager || !tradeId) return;
        
        const index = this.auctionManager.pendingTrades.findIndex(t => t.id === tradeId);
        if (index !== -1) {
            this.auctionManager.pendingTrades.splice(index, 1);
        }
    }
    
    /**
     * Show visual feedback for successful transaction
     */
    showTransactionFeedback(transaction) {
        // Get player names
        const buyer = this.gameStateManager?.getPlayer(transaction.buyerId);
        const seller = this.gameStateManager?.getPlayer(transaction.sellerId);
        
        const buyerName = buyer?.name || `Player ${transaction.buyerId}`;
        const sellerName = seller?.name || `Player ${transaction.sellerId}`;
        
        // Create floating text
        const text = `${buyerName} bought ${transaction.quantity} ${transaction.resource} from ${sellerName} @ ${transaction.price}GP`;
        
        // Show in center of screen
        const centerX = this.scene.cameras.main.centerX;
        const centerY = this.scene.cameras.main.centerY;
        
        const feedbackText = this.scene.add.text(centerX, centerY, text, {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        });
        feedbackText.setOrigin(0.5);
        feedbackText.setDepth(2000);
        
        // Animate
        this.scene.tweens.add({
            targets: feedbackText,
            y: centerY - 100,
            alpha: 0,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => feedbackText.destroy()
        });
        
        // Update player displays
        this.scene.updatePlayerDisplay();
    }
    
    /**
     * Show error feedback for failed transaction
     */
    showTransactionError(transaction, errors) {
        const errorText = errors[0]?.errors?.[0] || 'Transaction failed';
        
        const centerX = this.scene.cameras.main.centerX;
        const centerY = this.scene.cameras.main.centerY;
        
        const feedbackText = this.scene.add.text(centerX, centerY + 50, errorText, {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        });
        feedbackText.setOrigin(0.5);
        feedbackText.setDepth(2000);
        
        // Animate
        this.scene.tweens.add({
            targets: feedbackText,
            alpha: 0,
            duration: 1500,
            delay: 500,
            ease: 'Power2',
            onComplete: () => feedbackText.destroy()
        });
    }
    
    /**
     * Process all pending trades at phase end
     */
    async processAllPendingTrades() {
        console.log('Processing all remaining trades...');
        
        // Get all pending trades from auction manager
        if (this.auctionManager && this.auctionManager.pendingTrades) {
            this.auctionManager.pendingTrades.forEach(trade => {
                this.queueTransaction(trade);
            });
            
            // Clear auction manager's pending trades
            this.auctionManager.pendingTrades = [];
        }
        
        // Process all queued transactions
        await this.processPendingTransactions();
        
        console.log('All trades processed');
    }
    
    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => this.scene.time.delayedCall(ms, resolve));
    }
    
    /**
     * Clean up
     */
    destroy() {
        this.stopTradeChecking();
        this.scene.events.off('player-position-set', this.onPlayerPositionSet, this);
    }
}