/**
 * ResourceQueueManager
 * Manages the queue of resources for auction rotation
 */
export default class ResourceQueueManager {
    constructor(auctionManager) {
        this.auctionManager = auctionManager;
        
        // Resource queue configuration
        this.defaultResources = ['mana', 'vitality', 'arcanum', 'aether'];
        this.resourceQueue = [...this.defaultResources];
        this.currentIndex = -1;
        
        // Timing configuration (from GAME_RULES.md)
        this.resourceDuration = 90; // 90 seconds per resource
        this.transitionDelay = 5; // 5 seconds between resources
        
        // State tracking
        this.isActive = false;
        this.isPaused = false;
        this.transitionTimer = null;
        
        // Event tracking
        this.queueHistory = [];
        this.completedResources = new Set();
    }
    
    /**
     * Initialize the resource queue
     */
    initialize(resources = null) {
        if (resources && Array.isArray(resources)) {
            this.resourceQueue = [...resources];
        } else {
            this.resourceQueue = [...this.defaultResources];
        }
        
        this.currentIndex = -1;
        this.completedResources.clear();
        this.queueHistory = [];
        this.isActive = false;
        
        console.log('Resource queue initialized:', this.resourceQueue);
    }
    
    /**
     * Start the resource queue
     */
    start() {
        if (this.isActive) {
            console.warn('Resource queue already active');
            return false;
        }
        
        this.isActive = true;
        this.isPaused = false;
        console.log('Starting resource queue');
        
        // Start with first resource
        this.advanceToNextResource();
        return true;
    }
    
    /**
     * Advance to the next resource in queue
     */
    advanceToNextResource() {
        if (!this.isActive || this.isPaused) {
            return false;
        }
        
        // Check if all resources completed
        if (this.completedResources.size >= this.resourceQueue.length) {
            console.log('All resources completed');
            this.complete();
            return false;
        }
        
        // Find next uncompleted resource
        let attempts = 0;
        do {
            this.currentIndex = (this.currentIndex + 1) % this.resourceQueue.length;
            attempts++;
        } while (this.completedResources.has(this.getCurrentResource()) && 
                 attempts < this.resourceQueue.length);
        
        const currentResource = this.getCurrentResource();
        if (!currentResource) {
            console.error('No valid resource found');
            return false;
        }
        
        console.log(`Advancing to resource: ${currentResource}`);
        
        // Record in history
        this.queueHistory.push({
            resource: currentResource,
            startTime: Date.now(),
            index: this.currentIndex
        });
        
        // Start auction for this resource
        if (this.auctionManager) {
            this.auctionManager.startResourceAuction(currentResource);
            
            // Set up transition timer
            this.scheduleNextTransition();
        }
        
        return true;
    }
    
    /**
     * Schedule transition to next resource
     */
    scheduleNextTransition() {
        // Clear any existing timer
        if (this.transitionTimer) {
            clearTimeout(this.transitionTimer);
        }
        
        // Calculate total time (auction duration + transition delay)
        const totalTime = (this.resourceDuration + this.transitionDelay) * 1000;
        
        this.transitionTimer = setTimeout(() => {
            this.onResourceComplete();
        }, totalTime);
    }
    
    /**
     * Handle resource auction completion
     */
    onResourceComplete() {
        const currentResource = this.getCurrentResource();
        console.log(`Resource auction complete: ${currentResource}`);
        
        // Mark as completed
        this.completedResources.add(currentResource);
        
        // End current auction
        if (this.auctionManager) {
            this.auctionManager.endResourceAuction();
        }
        
        // Advance to next after a short delay
        setTimeout(() => {
            this.advanceToNextResource();
        }, this.transitionDelay * 1000);
    }
    
    /**
     * Pause the queue
     */
    pause() {
        if (!this.isActive || this.isPaused) {
            return false;
        }
        
        this.isPaused = true;
        
        // Clear transition timer
        if (this.transitionTimer) {
            clearTimeout(this.transitionTimer);
            this.transitionTimer = null;
        }
        
        console.log('Resource queue paused');
        return true;
    }
    
    /**
     * Resume the queue
     */
    resume() {
        if (!this.isActive || !this.isPaused) {
            return false;
        }
        
        this.isPaused = false;
        
        // Reschedule transition if needed
        if (this.auctionManager && this.auctionManager.auctionPhase === 'active') {
            this.scheduleNextTransition();
        }
        
        console.log('Resource queue resumed');
        return true;
    }
    
    /**
     * Skip current resource
     */
    skipCurrent() {
        if (!this.isActive || this.isPaused) {
            return false;
        }
        
        const currentResource = this.getCurrentResource();
        console.log(`Skipping resource: ${currentResource}`);
        
        // Clear timer
        if (this.transitionTimer) {
            clearTimeout(this.transitionTimer);
        }
        
        // Mark as completed and advance
        this.completedResources.add(currentResource);
        
        // End current auction
        if (this.auctionManager) {
            this.auctionManager.endResourceAuction();
        }
        
        // Advance immediately
        this.advanceToNextResource();
        return true;
    }
    
    /**
     * Complete the queue
     */
    complete() {
        console.log('Completing resource queue');
        
        this.isActive = false;
        this.isPaused = false;
        
        // Clear timer
        if (this.transitionTimer) {
            clearTimeout(this.transitionTimer);
            this.transitionTimer = null;
        }
        
        // Emit completion event if auction manager has events
        if (this.auctionManager?.events) {
            this.auctionManager.events.emit('auction.queue.complete', {
                completedResources: Array.from(this.completedResources),
                history: this.queueHistory
            });
        }
    }
    
    /**
     * Get current resource
     */
    getCurrentResource() {
        if (this.currentIndex < 0 || this.currentIndex >= this.resourceQueue.length) {
            return null;
        }
        return this.resourceQueue[this.currentIndex];
    }
    
    /**
     * Get remaining resources
     */
    getRemainingResources() {
        return this.resourceQueue.filter(resource => 
            !this.completedResources.has(resource)
        );
    }
    
    /**
     * Get queue status
     */
    getStatus() {
        return {
            isActive: this.isActive,
            isPaused: this.isPaused,
            currentResource: this.getCurrentResource(),
            currentIndex: this.currentIndex,
            completedResources: Array.from(this.completedResources),
            remainingResources: this.getRemainingResources(),
            totalResources: this.resourceQueue.length,
            progress: this.completedResources.size / this.resourceQueue.length
        };
    }
    
    /**
     * Reset the queue
     */
    reset() {
        this.currentIndex = -1;
        this.completedResources.clear();
        this.queueHistory = [];
        this.isActive = false;
        this.isPaused = false;
        
        if (this.transitionTimer) {
            clearTimeout(this.transitionTimer);
            this.transitionTimer = null;
        }
        
        console.log('Resource queue reset');
    }
    
    /**
     * Clean up
     */
    destroy() {
        if (this.transitionTimer) {
            clearTimeout(this.transitionTimer);
            this.transitionTimer = null;
        }
        
        this.reset();
    }
}