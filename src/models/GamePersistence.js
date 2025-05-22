import ErrorHandler from '../utils/ErrorHandler.js';

/**
 * GamePersistence
 * Handles saving and loading game state with multiple storage options
 */
export default class GamePersistence {
    constructor(storageType = 'localStorage') {
        this.storageType = storageType;
        this.autoSaveInterval = 30000; // 30 seconds
        this.autoSaveTimer = null;
        this.gameKeyPrefix = 'magical_frontiers_';
        this.maxSaveSlots = 10;
        
        // Event system
        this.eventListeners = {};
        this.errorHandler = new ErrorHandler();
        
        // Storage validation
        this.supportedStorageTypes = ['localStorage', 'indexedDB', 'memory'];
        if (!this.supportedStorageTypes.includes(storageType)) {
            console.warn(`Unsupported storage type: ${storageType}, falling back to localStorage`);
            this.storageType = 'localStorage';
        }
        
        // Check browser support
        this.validateStorageSupport();
        
        // In-memory storage for fallback
        this.memoryStorage = new Map();
    }

    /**
     * Validate browser storage support
     */
    validateStorageSupport() {
        try {
            if (this.storageType === 'localStorage' && typeof localStorage === 'undefined') {
                console.warn('localStorage not supported, falling back to memory storage');
                this.storageType = 'memory';
            }
            
            if (this.storageType === 'indexedDB' && typeof indexedDB === 'undefined') {
                console.warn('IndexedDB not supported, falling back to localStorage');
                this.storageType = 'localStorage';
            }
        } catch (error) {
            console.warn('Storage validation failed, using memory storage');
            this.storageType = 'memory';
        }
    }

    /**
     * Save game state
     */
    async saveGame(gameState, slotName = 'autosave') {
        try {
            const saveData = {
                version: '1.0',
                timestamp: Date.now(),
                slotName: slotName,
                gameState: {
                    ...this.cloneGameState(gameState),
                    version: '1.0'  // Add version to gameState for consistency
                },
                metadata: this.extractMetadata(gameState),
                checksum: this.generateChecksum(gameState)
            };

            let result;
            switch (this.storageType) {
                case 'localStorage':
                    result = await this.saveToLocalStorage(slotName, saveData);
                    break;
                case 'indexedDB':
                    result = await this.saveToIndexedDB(slotName, saveData);
                    break;
                case 'memory':
                    result = await this.saveToMemory(slotName, saveData);
                    break;
                default:
                    throw new Error(`Unknown storage type: ${this.storageType}`);
            }
            
            this.broadcastEvent('save.completed', {
                slotName: slotName,
                timestamp: saveData.timestamp,
                metadata: saveData.metadata,
                storageType: this.storageType
            });
            
            return result;
        } catch (error) {
            this.errorHandler.handleError(error, 'GamePersistence.saveGame');
            this.broadcastEvent('save.failed', {
                slotName: slotName,
                error: error.message
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * Load game state
     */
    async loadGame(slotName) {
        try {
            let saveData;
            
            switch (this.storageType) {
                case 'localStorage':
                    saveData = await this.loadFromLocalStorage(slotName);
                    break;
                case 'indexedDB':
                    saveData = await this.loadFromIndexedDB(slotName);
                    break;
                case 'memory':
                    saveData = await this.loadFromMemory(slotName);
                    break;
                default:
                    throw new Error(`Unknown storage type: ${this.storageType}`);
            }
            
            if (!saveData) {
                return { success: false, error: 'Save file not found' };
            }
            
            // Validate save data
            const validation = this.validateSaveData(saveData);
            if (!validation.valid) {
                return { success: false, error: `Save file corrupted: ${validation.error}` };
            }
            
            this.broadcastEvent('load.completed', {
                slotName: slotName,
                metadata: saveData.metadata,
                timestamp: saveData.timestamp
            });
            
            return { 
                success: true, 
                gameState: saveData.gameState, 
                metadata: saveData.metadata,
                timestamp: saveData.timestamp
            };
        } catch (error) {
            this.errorHandler.handleError(error, 'GamePersistence.loadGame');
            this.broadcastEvent('load.failed', {
                slotName: slotName,
                error: error.message
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * Save to localStorage
     */
    async saveToLocalStorage(slotName, saveData) {
        try {
            const key = this.getStorageKey(slotName);
            const serialized = JSON.stringify(saveData);
            
            // Check storage quota
            const estimatedSize = new Blob([serialized]).size;
            if (estimatedSize > 5 * 1024 * 1024) { // 5MB limit
                throw new Error('Save file too large for localStorage');
            }
            
            localStorage.setItem(key, serialized);
            
            return { 
                success: true, 
                slotName, 
                timestamp: saveData.timestamp,
                size: estimatedSize,
                storageType: 'localStorage'
            };
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                throw new Error('Storage quota exceeded');
            }
            throw error;
        }
    }

    /**
     * Load from localStorage
     */
    async loadFromLocalStorage(slotName) {
        const key = this.getStorageKey(slotName);
        const serialized = localStorage.getItem(key);
        
        if (!serialized) {
            return null;
        }
        
        return JSON.parse(serialized);
    }

    /**
     * Save to IndexedDB
     */
    async saveToIndexedDB(slotName, saveData) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MagicalFrontiers', 1);
            
            request.onerror = () => reject(new Error('Failed to open IndexedDB'));
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('saves')) {
                    db.createObjectStore('saves', { keyPath: 'slotName' });
                }
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['saves'], 'readwrite');
                const store = transaction.objectStore('saves');
                
                const putRequest = store.put({
                    slotName: slotName,
                    data: saveData,
                    timestamp: saveData.timestamp
                });
                
                putRequest.onsuccess = () => {
                    resolve({
                        success: true,
                        slotName,
                        timestamp: saveData.timestamp,
                        storageType: 'indexedDB'
                    });
                };
                
                putRequest.onerror = () => reject(new Error('Failed to save to IndexedDB'));
            };
        });
    }

    /**
     * Load from IndexedDB
     */
    async loadFromIndexedDB(slotName) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MagicalFrontiers', 1);
            
            request.onerror = () => reject(new Error('Failed to open IndexedDB'));
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('saves')) {
                    resolve(null);
                    return;
                }
                
                const transaction = db.transaction(['saves'], 'readonly');
                const store = transaction.objectStore('saves');
                const getRequest = store.get(slotName);
                
                getRequest.onsuccess = (event) => {
                    const result = event.target.result;
                    resolve(result ? result.data : null);
                };
                
                getRequest.onerror = () => reject(new Error('Failed to load from IndexedDB'));
            };
        });
    }

    /**
     * Save to memory (fallback)
     */
    async saveToMemory(slotName, saveData) {
        this.memoryStorage.set(slotName, saveData);
        
        return {
            success: true,
            slotName,
            timestamp: saveData.timestamp,
            storageType: 'memory'
        };
    }

    /**
     * Load from memory
     */
    async loadFromMemory(slotName) {
        return this.memoryStorage.get(slotName) || null;
    }

    /**
     * Get available save slots
     */
    async getSaveSlots() {
        try {
            let slots = [];
            
            switch (this.storageType) {
                case 'localStorage':
                    slots = await this.getLocalStorageSlots();
                    break;
                case 'indexedDB':
                    slots = await this.getIndexedDBSlots();
                    break;
                case 'memory':
                    slots = await this.getMemorySlots();
                    break;
            }
            
            return slots.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            this.errorHandler.handleError(error, 'GamePersistence.getSaveSlots');
            return [];
        }
    }

    /**
     * Get localStorage save slots
     */
    async getLocalStorageSlots() {
        const slots = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.gameKeyPrefix)) {
                try {
                    const slotName = key.replace(this.gameKeyPrefix, '');
                    const data = JSON.parse(localStorage.getItem(key));
                    
                    slots.push({
                        name: slotName,
                        timestamp: data.timestamp,
                        metadata: data.metadata,
                        size: new Blob([localStorage.getItem(key)]).size
                    });
                } catch (error) {
                    console.warn(`Corrupted save slot: ${key}`);
                }
            }
        }
        
        return slots;
    }

    /**
     * Get IndexedDB save slots
     */
    async getIndexedDBSlots() {
        return new Promise((resolve) => {
            const request = indexedDB.open('MagicalFrontiers', 1);
            
            request.onerror = () => resolve([]);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('saves')) {
                    resolve([]);
                    return;
                }
                
                const transaction = db.transaction(['saves'], 'readonly');
                const store = transaction.objectStore('saves');
                const getAllRequest = store.getAll();
                
                getAllRequest.onsuccess = (event) => {
                    const results = event.target.result;
                    const slots = results.map(result => ({
                        name: result.slotName,
                        timestamp: result.data.timestamp,
                        metadata: result.data.metadata
                    }));
                    resolve(slots);
                };
                
                getAllRequest.onerror = () => resolve([]);
            };
        });
    }

    /**
     * Get memory save slots
     */
    async getMemorySlots() {
        const slots = [];
        
        for (const [slotName, saveData] of this.memoryStorage.entries()) {
            slots.push({
                name: slotName,
                timestamp: saveData.timestamp,
                metadata: saveData.metadata
            });
        }
        
        return slots;
    }

    /**
     * Delete save slot
     */
    async deleteSave(slotName) {
        try {
            switch (this.storageType) {
                case 'localStorage':
                    localStorage.removeItem(this.getStorageKey(slotName));
                    break;
                case 'indexedDB':
                    await this.deleteFromIndexedDB(slotName);
                    break;
                case 'memory':
                    this.memoryStorage.delete(slotName);
                    break;
            }
            
            this.broadcastEvent('save.deleted', { slotName });
            return { success: true };
        } catch (error) {
            this.errorHandler.handleError(error, 'GamePersistence.deleteSave');
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete from IndexedDB
     */
    async deleteFromIndexedDB(slotName) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MagicalFrontiers', 1);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['saves'], 'readwrite');
                const store = transaction.objectStore('saves');
                
                const deleteRequest = store.delete(slotName);
                deleteRequest.onsuccess = () => resolve();
                deleteRequest.onerror = () => reject(new Error('Failed to delete from IndexedDB'));
            };
            
            request.onerror = () => reject(new Error('Failed to open IndexedDB'));
        });
    }

    /**
     * Enable auto-save
     */
    enableAutoSave(gameStateManager, interval = null) {
        this.disableAutoSave();
        
        const saveInterval = interval || this.autoSaveInterval;
        
        this.autoSaveTimer = setInterval(async () => {
            try {
                await this.saveGame(gameStateManager.gameState, 'autosave');
            } catch (error) {
                console.warn('Auto-save failed:', error.message);
            }
        }, saveInterval);
        
        this.broadcastEvent('autosave.enabled', { interval: saveInterval });
    }

    /**
     * Disable auto-save
     */
    disableAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
            this.broadcastEvent('autosave.disabled');
        }
    }

    /**
     * Extract metadata from game state
     */
    extractMetadata(gameState) {
        return {
            playerCount: gameState.players.length,
            currentCycle: gameState.currentCycle,
            currentPhase: gameState.currentPhase,
            gameStatus: gameState.gameStatus,
            elapsedTime: Date.now() - gameState.startTime,
            playerNames: gameState.players.map(p => p.name || p.id)
        };
    }

    /**
     * Validate save data integrity
     */
    validateSaveData(saveData) {
        try {
            // Check version compatibility
            if (!saveData.version || saveData.version !== '1.0') {
                return { valid: false, error: 'Incompatible save version' };
            }
            
            // Check required fields
            if (!saveData.gameState || !saveData.metadata || !saveData.timestamp) {
                return { valid: false, error: 'Missing required save data fields' };
            }
            
            // Validate checksum if present
            if (saveData.checksum) {
                const currentChecksum = this.generateChecksum(saveData.gameState);
                if (currentChecksum !== saveData.checksum) {
                    return { valid: false, error: 'Save data checksum mismatch' };
                }
            }
            
            // Basic game state validation
            const gameState = saveData.gameState;
            if (!gameState.gameId || !gameState.players || !Array.isArray(gameState.players)) {
                return { valid: false, error: 'Invalid game state structure' };
            }
            
            return { valid: true };
        } catch (error) {
            return { valid: false, error: `Validation error: ${error.message}` };
        }
    }

    /**
     * Generate checksum for save data integrity
     */
    generateChecksum(gameState) {
        try {
            const stateString = JSON.stringify(gameState);
            let hash = 0;
            
            for (let i = 0; i < stateString.length; i++) {
                const char = stateString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            
            return hash.toString(36);
        } catch (error) {
            return null;
        }
    }

    /**
     * Clone game state for saving
     */
    cloneGameState(gameState) {
        return JSON.parse(JSON.stringify(gameState));
    }

    /**
     * Get storage key for slot
     */
    getStorageKey(slotName) {
        return `${this.gameKeyPrefix}${slotName}`;
    }

    /**
     * Export save file for sharing/backup
     */
    async exportSave(slotName) {
        try {
            const saveResult = await this.loadGame(slotName);
            if (!saveResult.success) {
                throw new Error(saveResult.error);
            }
            
            const exportData = {
                version: '1.0',
                exportTime: Date.now(),
                originalSlot: slotName,
                saveData: saveResult
            };
            
            return {
                success: true,
                data: JSON.stringify(exportData),
                filename: `magical_frontiers_${slotName}_${Date.now()}.json`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Import save file from external source
     */
    async importSave(saveFileContent, newSlotName) {
        try {
            const importData = JSON.parse(saveFileContent);
            
            if (importData.version !== '1.0') {
                throw new Error('Incompatible import file version');
            }
            
            const result = await this.saveGame(importData.saveData.gameState, newSlotName);
            
            this.broadcastEvent('save.imported', {
                originalSlot: importData.originalSlot,
                newSlot: newSlotName,
                metadata: importData.saveData.metadata
            });
            
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get storage usage statistics
     */
    async getStorageStats() {
        try {
            const slots = await this.getSaveSlots();
            let totalSize = 0;
            
            if (this.storageType === 'localStorage') {
                slots.forEach(slot => {
                    totalSize += slot.size || 0;
                });
            }
            
            return {
                totalSlots: slots.length,
                totalSize: totalSize,
                storageType: this.storageType,
                maxSlots: this.maxSaveSlots,
                availableSlots: this.maxSaveSlots - slots.length
            };
        } catch (error) {
            return { totalSlots: 0, totalSize: 0, storageType: this.storageType };
        }
    }

    /**
     * Event system methods
     */
    on(eventName, callback) {
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        this.eventListeners[eventName].push(callback);
    }

    off(eventName, callback) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName] = this.eventListeners[eventName]
                .filter(listener => listener !== callback);
        }
    }

    broadcastEvent(eventName, data = {}) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.errorHandler.handleError(error, `Event callback for ${eventName}`);
                }
            });
        }
    }
}