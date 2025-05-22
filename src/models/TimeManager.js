import ErrorHandler from '../utils/ErrorHandler.js';

/**
 * TimeManager
 * Manages timers, time limits, and time-based game events
 */
export default class TimeManager {
    constructor() {
        this.globalTimer = null;
        this.playerTimers = new Map();
        this.phaseTimeouts = {
            territory_selection: 120, // 2 minutes per player
            construct_outfitting: 180, // 3 minutes per player
            auction_phase: 300, // 5 minutes total
            resource_production: 30, // 30 seconds (automated)
            end_cycle_events: 15 // 15 seconds
        };
        
        // Individual time reserves for players
        this.playerTimeBanks = new Map();
        this.defaultTimeBankAmount = 600; // 10 minutes total reserve
        
        // Urgency thresholds for warnings
        this.urgencyThresholds = {
            warning: 30, // warn at 30 seconds
            critical: 10 // critical at 10 seconds
        };
        
        // Timer update interval
        this.updateInterval = 1000; // 1 second
        this.updateTimer = null;
        
        // Event system
        this.eventListeners = {};
        this.errorHandler = new ErrorHandler();
        
        // Timer states
        this.isPaused = false;
        this.pausedTimers = [];
    }

    /**
     * Start a phase timer
     */
    startPhaseTimer(phase, duration = null, playerId = null) {
        try {
            this.clearCurrentTimer();
            const timeLimit = duration || this.phaseTimeouts[phase];
            
            console.log(`Starting phase timer: ${phase}, duration: ${timeLimit}s`);
            
            this.globalTimer = {
                id: this.generateTimerId(),
                type: 'phase',
                phase: phase,
                playerId: playerId,
                startTime: Date.now(),
                duration: timeLimit * 1000, // convert to milliseconds
                remainingTime: timeLimit * 1000,
                isActive: true,
                isPaused: false
            };
            
            this.startTimerUpdates();
            this.scheduleTimeWarnings();
            
            console.log(`Timer started with ID: ${this.globalTimer.id}`);
            
            this.broadcastEvent('timer.started', {
                timerId: this.globalTimer.id,
                type: 'phase',
                phase: phase,
                duration: timeLimit,
                playerId: playerId
            });
        } catch (error) {
            console.error('Timer start failed:', error);
            this.errorHandler.handleError(error, 'TimeManager.startPhaseTimer');
        }
    }

    /**
     * Start a player-specific timer
     */
    startPlayerTimer(playerId, phase, duration = null) {
        try {
            const timeLimit = duration || this.phaseTimeouts[phase];
            
            // Check player's time bank
            let availableTime = this.getPlayerTimeBank(playerId);
            const actualTimeLimit = Math.min(timeLimit, availableTime / 1000);
            
            const timer = {
                id: this.generateTimerId(),
                type: 'player',
                phase: phase,
                playerId: playerId,
                startTime: Date.now(),
                duration: actualTimeLimit * 1000,
                remainingTime: actualTimeLimit * 1000,
                isActive: true,
                isPaused: false
            };
            
            this.playerTimers.set(playerId, timer);
            
            if (!this.updateTimer) {
                this.startTimerUpdates();
            }
            
            this.broadcastEvent('player_timer.started', {
                timerId: timer.id,
                playerId: playerId,
                phase: phase,
                duration: actualTimeLimit,
                timeBankRemaining: this.getPlayerTimeBank(playerId)
            });
        } catch (error) {
            this.errorHandler.handleError(error, 'TimeManager.startPlayerTimer');
        }
    }

    /**
     * Start timer update loop
     */
    startTimerUpdates() {
        if (this.updateTimer) return;
        
        this.updateTimer = setInterval(() => {
            this.updateAllTimers();
        }, this.updateInterval);
    }

    /**
     * Stop timer updates
     */
    stopTimerUpdates() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }

    /**
     * Update all active timers
     */
    updateAllTimers() {
        if (this.isPaused) {
            console.log('Timer updates paused');
            return;
        }
        
        try {
            console.log('Updating all timers...');
            
            // Update global timer
            if (this.globalTimer && this.globalTimer.isActive && !this.globalTimer.isPaused) {
                console.log(`Updating global timer: ${this.globalTimer.id}`);
                this.updateSingleTimer(this.globalTimer); // Rename to avoid confusion
            }
            
            // Update player timers
            this.playerTimers.forEach((timer, playerId) => {
                if (timer.isActive && !timer.isPaused) {
                    console.log(`Updating player timer: ${playerId}`);
                    this.updateSingleTimer(timer);
                }
            });
        } catch (error) {
            console.error('Timer update error:', error);
            this.errorHandler.handleError(error, 'TimeManager.updateAllTimers');
        }
    }

    /**
     * Update a specific timer
     */
    updateSingleTimer(timer) {
        const elapsed = Date.now() - timer.startTime;
        timer.remainingTime = Math.max(0, timer.duration - elapsed);
        
        const secondsRemaining = Math.ceil(timer.remainingTime / 1000);
        const urgencyLevel = this.getUrgencyLevel(secondsRemaining);
        
        console.log(`Timer ${timer.id}: ${secondsRemaining}s remaining (${urgencyLevel})`);
        
        // Broadcast update
        this.broadcastEvent('timer.update', {
            timerId: timer.id,
            type: timer.type,
            playerId: timer.playerId,
            phase: timer.phase,
            remainingTime: secondsRemaining,
            urgencyLevel: urgencyLevel,
            progress: 1 - (timer.remainingTime / timer.duration)
        });
        
        // Check for warnings
        this.checkTimeWarnings(timer, secondsRemaining);
        
        // Check for expiration
        if (timer.remainingTime <= 0) {
            console.log(`Timer ${timer.id} expired!`);
            this.handleTimerExpired(timer);
        }
    }

    /**
     * Check and broadcast time warnings
     */
    checkTimeWarnings(timer, secondsRemaining) {
        // Only warn once at each threshold
        if (!timer.warnings) {
            timer.warnings = new Set();
        }
        
        if (secondsRemaining <= this.urgencyThresholds.critical && !timer.warnings.has('critical')) {
            timer.warnings.add('critical');
            this.broadcastEvent('timer.warning', {
                timerId: timer.id,
                type: timer.type,
                playerId: timer.playerId,
                level: 'critical',
                remainingTime: secondsRemaining
            });
        } else if (secondsRemaining <= this.urgencyThresholds.warning && !timer.warnings.has('warning')) {
            timer.warnings.add('warning');
            this.broadcastEvent('timer.warning', {
                timerId: timer.id,
                type: timer.type,
                playerId: timer.playerId,
                level: 'warning',
                remainingTime: secondsRemaining
            });
        }
    }

    /**
     * Get urgency level based on remaining time
     */
    getUrgencyLevel(secondsRemaining) {
        if (secondsRemaining <= this.urgencyThresholds.critical) return 'critical';
        if (secondsRemaining <= this.urgencyThresholds.warning) return 'warning';
        return 'normal';
    }

    /**
     * Handle timer expiration
     */
    handleTimerExpired(timer) {
        try {
            console.log(`Handling timer expiration: ${timer.id}`);
            timer.isActive = false;
            
            this.broadcastEvent('timer.expired', {
                timerId: timer.id,
                type: timer.type,
                phase: timer.phase,
                playerId: timer.playerId
            });
            
            // Handle different timer types
            switch (timer.type) {
                case 'phase':
                    this.handlePhaseTimerExpired(timer);
                    break;
                case 'player':
                    this.handlePlayerTimerExpired(timer);
                    break;
            }
            
            // Clean up expired timer
            if (timer.type === 'phase' && this.globalTimer === timer) {
                this.globalTimer = null;
            } else if (timer.type === 'player') {
                this.playerTimers.delete(timer.playerId);
            }
            
            // Stop updates if no active timers
            if (!this.hasActiveTimers()) {
                this.stopTimerUpdates();
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'TimeManager.handleTimerExpired');
        }
    }

    /**
     * Handle phase timer expiration
     */
    handlePhaseTimerExpired(timer) {
        switch (timer.phase) {
            case 'territory_selection':
                this.broadcastEvent('phase.timeout', { phase: 'territory_selection' });
                break;
            case 'construct_outfitting':
                this.broadcastEvent('phase.timeout', { phase: 'construct_outfitting' });
                break;
            case 'auction_phase':
                this.broadcastEvent('phase.timeout', { phase: 'auction_phase' });
                break;
            case 'resource_production':
                this.broadcastEvent('phase.timeout', { phase: 'resource_production' });
                break;
            case 'end_cycle_events':
                this.broadcastEvent('phase.timeout', { phase: 'end_cycle_events' });
                break;
        }
    }

    /**
     * Handle player timer expiration
     */
    handlePlayerTimerExpired(timer) {
        // Deduct time from player's time bank
        this.deductFromTimeBank(timer.playerId, timer.duration);
        
        this.broadcastEvent('player.timeout', {
            playerId: timer.playerId,
            phase: timer.phase,
            timeBankRemaining: this.getPlayerTimeBank(timer.playerId)
        });
    }

    /**
     * Schedule time warnings
     */
    scheduleTimeWarnings() {
        // Warnings are handled in the update loop for more responsive timing
    }

    /**
     * Pause all timers
     */
    pauseAllTimers() {
        this.isPaused = true;
        const pauseTime = Date.now();
        
        // Pause global timer
        if (this.globalTimer && this.globalTimer.isActive) {
            this.globalTimer.pausedAt = pauseTime;
            this.globalTimer.isPaused = true;
        }
        
        // Pause player timers
        this.playerTimers.forEach(timer => {
            if (timer.isActive) {
                timer.pausedAt = pauseTime;
                timer.isPaused = true;
            }
        });
        
        this.broadcastEvent('timers.paused', { pauseTime });
    }

    /**
     * Resume all timers
     */
    resumeAllTimers() {
        const resumeTime = Date.now();
        
        // Resume global timer
        if (this.globalTimer && this.globalTimer.isPaused) {
            const pauseDuration = resumeTime - this.globalTimer.pausedAt;
            this.globalTimer.startTime += pauseDuration;
            this.globalTimer.isPaused = false;
            delete this.globalTimer.pausedAt;
        }
        
        // Resume player timers
        this.playerTimers.forEach(timer => {
            if (timer.isPaused) {
                const pauseDuration = resumeTime - timer.pausedAt;
                timer.startTime += pauseDuration;
                timer.isPaused = false;
                delete timer.pausedAt;
            }
        });
        
        this.isPaused = false;
        this.broadcastEvent('timers.resumed', { resumeTime });
        
        if (this.hasActiveTimers()) {
            this.startTimerUpdates();
        }
    }

    /**
     * Clear current global timer
     */
    clearCurrentTimer() {
        if (this.globalTimer) {
            this.globalTimer.isActive = false;
            this.globalTimer = null;
        }
    }

    /**
     * Clear player timer
     */
    clearPlayerTimer(playerId) {
        const timer = this.playerTimers.get(playerId);
        if (timer) {
            timer.isActive = false;
            this.playerTimers.delete(playerId);
        }
    }

    /**
     * Clear all timers
     */
    clearAllTimers() {
        this.clearCurrentTimer();
        this.playerTimers.clear();
        this.stopTimerUpdates();
        
        this.broadcastEvent('timers.cleared');
    }

    /**
     * Check if there are any active timers
     */
    hasActiveTimers() {
        if (this.globalTimer && this.globalTimer.isActive) return true;
        
        for (let timer of this.playerTimers.values()) {
            if (timer.isActive) return true;
        }
        
        return false;
    }

    /**
     * Get player time bank (remaining reserve time)
     */
    getPlayerTimeBank(playerId) {
        if (!this.playerTimeBanks.has(playerId)) {
            this.playerTimeBanks.set(playerId, this.defaultTimeBankAmount * 1000); // Convert to ms
        }
        return this.playerTimeBanks.get(playerId);
    }

    /**
     * Set player time bank
     */
    setPlayerTimeBank(playerId, timeInSeconds) {
        this.playerTimeBanks.set(playerId, timeInSeconds * 1000);
    }

    /**
     * Deduct time from player's time bank
     */
    deductFromTimeBank(playerId, timeUsedMs) {
        const currentBank = this.getPlayerTimeBank(playerId);
        const newBank = Math.max(0, currentBank - timeUsedMs);
        this.playerTimeBanks.set(playerId, newBank);
        
        this.broadcastEvent('time_bank.updated', {
            playerId: playerId,
            timeUsed: timeUsedMs / 1000,
            remainingTime: newBank / 1000
        });
    }

    /**
     * Add time to player's time bank (bonus time)
     */
    addToTimeBank(playerId, timeToAddSeconds) {
        const currentBank = this.getPlayerTimeBank(playerId);
        const newBank = currentBank + (timeToAddSeconds * 1000);
        this.playerTimeBanks.set(playerId, newBank);
        
        this.broadcastEvent('time_bank.bonus', {
            playerId: playerId,
            timeAdded: timeToAddSeconds,
            newTotal: newBank / 1000
        });
    }

    /**
     * Get timer status
     */
    getTimerStatus() {
        const status = {
            isPaused: this.isPaused,
            globalTimer: null,
            playerTimers: {},
            timeBanks: {}
        };
        
        if (this.globalTimer) {
            status.globalTimer = {
                id: this.globalTimer.id,
                type: this.globalTimer.type,
                phase: this.globalTimer.phase,
                remainingTime: Math.ceil(this.globalTimer.remainingTime / 1000),
                isActive: this.globalTimer.isActive,
                isPaused: this.globalTimer.isPaused
            };
        }
        
        this.playerTimers.forEach((timer, playerId) => {
            status.playerTimers[playerId] = {
                id: timer.id,
                phase: timer.phase,
                remainingTime: Math.ceil(timer.remainingTime / 1000),
                isActive: timer.isActive,
                isPaused: timer.isPaused
            };
        });
        
        this.playerTimeBanks.forEach((timeMs, playerId) => {
            status.timeBanks[playerId] = Math.ceil(timeMs / 1000);
        });
        
        return status;
    }

    /**
     * Force expire a timer (for testing/admin)
     */
    forceExpireTimer(timerId) {
        let timer = null;
        
        if (this.globalTimer && this.globalTimer.id === timerId) {
            timer = this.globalTimer;
        } else {
            for (let playerTimer of this.playerTimers.values()) {
                if (playerTimer.id === timerId) {
                    timer = playerTimer;
                    break;
                }
            }
        }
        
        if (timer) {
            timer.remainingTime = 0;
            this.handleTimerExpired(timer);
        }
    }

    /**
     * Generate unique timer ID
     */
    generateTimerId() {
        return `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
        console.log(`Broadcasting timer event: ${eventName}`, data);
        
        if (this.eventListeners[eventName]) {
            console.log(`Found ${this.eventListeners[eventName].length} listeners for ${eventName}`);
            this.eventListeners[eventName].forEach((callback, index) => {
                try {
                    console.log(`Calling listener ${index} for ${eventName}`);
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener ${index}:`, error);
                    this.errorHandler.handleError(error, `Event callback for ${eventName}`);
                }
            });
        } else {
            console.log(`No listeners found for event: ${eventName}`);
        }
    }
}