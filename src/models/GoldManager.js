/**
 * GoldManager - Centralized gold transaction management
 * Ensures all gold transactions are properly tracked and applied
 */
export default class GoldManager {
    constructor(gameFlowController) {
        this.gameFlow = gameFlowController;
        this.transactionHistory = [];
    }
    
    /**
     * Deduct gold from a player with validation
     */
    deductGold(playerId, amount, reason) {
        const player = this.gameFlow.stateManager.getPlayer(playerId);
        if (!player) {
            console.error(`Player ${playerId} not found`);
            return { success: false, error: 'Player not found' };
        }
        
        if (player.gold < amount) {
            console.log(`Player ${playerId} has insufficient gold: ${player.gold} < ${amount}`);
            return { success: false, error: 'Insufficient gold', required: amount, available: player.gold };
        }
        
        // Deduct gold
        const previousGold = player.gold;
        player.gold -= amount;
        
        // Log transaction
        const transaction = {
            id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            playerId: playerId,
            amount: -amount,
            reason: reason,
            previousBalance: previousGold,
            newBalance: player.gold,
            timestamp: Date.now()
        };
        
        this.transactionHistory.push(transaction);
        
        // Sync with state manager
        this.gameFlow.stateManager.updateGameState({ 
            players: this.gameFlow.stateManager.gameState.players 
        });
        
        // Broadcast event
        this.gameFlow.broadcastEvent('gold.deducted', {
            playerId: playerId,
            amount: amount,
            reason: reason,
            newBalance: player.gold
        });
        
        // Force UI update
        this.gameFlow.broadcastEvent('player.gold_changed', {
            playerId: playerId,
            newBalance: player.gold
        });
        
        console.log(`Gold deducted: ${playerId} -${amount} gold for ${reason} (new balance: ${player.gold})`);
        
        return { success: true, newBalance: player.gold, transaction: transaction };
    }
    
    /**
     * Add gold to a player
     */
    addGold(playerId, amount, reason) {
        const player = this.gameFlow.stateManager.getPlayer(playerId);
        if (!player) {
            console.error(`Player ${playerId} not found`);
            return { success: false, error: 'Player not found' };
        }
        
        // Add gold
        const previousGold = player.gold;
        player.gold += amount;
        
        // Log transaction
        const transaction = {
            id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            playerId: playerId,
            amount: amount,
            reason: reason,
            previousBalance: previousGold,
            newBalance: player.gold,
            timestamp: Date.now()
        };
        
        this.transactionHistory.push(transaction);
        
        // Sync with state manager
        this.gameFlow.stateManager.updateGameState({ 
            players: this.gameFlow.stateManager.gameState.players 
        });
        
        // Broadcast event
        this.gameFlow.broadcastEvent('gold.added', {
            playerId: playerId,
            amount: amount,
            reason: reason,
            newBalance: player.gold
        });
        
        console.log(`Gold added: ${playerId} +${amount} gold for ${reason} (new balance: ${player.gold})`);
        
        return { success: true, newBalance: player.gold, transaction: transaction };
    }
    
    /**
     * Check if player can afford amount
     */
    canAfford(playerId, amount) {
        const player = this.gameFlow.stateManager.getPlayer(playerId);
        return player && player.gold >= amount;
    }
    
    /**
     * Get player's gold balance
     */
    getBalance(playerId) {
        const player = this.gameFlow.stateManager.getPlayer(playerId);
        return player ? player.gold : 0;
    }
    
    /**
     * Get transaction history for a player
     */
    getPlayerTransactions(playerId) {
        return this.transactionHistory.filter(t => t.playerId === playerId);
    }
    
    /**
     * Get all recent transactions
     */
    getRecentTransactions(limit = 10) {
        return this.transactionHistory.slice(-limit);
    }
}