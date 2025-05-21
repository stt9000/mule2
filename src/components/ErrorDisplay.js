/**
 * ErrorDisplay Component
 * Manages displaying error messages to the user
 */
export default class ErrorDisplay {
    /**
     * Create a new error display component
     * @param {Phaser.Scene} scene - The Phaser scene this component belongs to
     * @param {Object} config - Configuration options
     */
    constructor(scene, config = {}) {
        this.scene = scene;
        this.config = {
            maxDisplayTime: 5000, // How long to show errors in ms
            fadeOutTime: 500, // Fade out time in ms
            maxErrorsVisible: 3, // Maximum number of errors to show at once
            width: 400, // Width of error container
            padding: 10, // Padding around errors
            background: 0x222244, // Background color
            alpha: 0.9, // Background opacity
            errorColor: 0xFF5555, // Color for error text
            warningColor: 0xFFAA55, // Color for warning text
            infoColor: 0x55AAFF, // Color for info text
            fontSize: 14, // Font size
            ...config
        };
        
        // Queue of errors to display
        this.errorQueue = [];
        
        // Currently displayed errors
        this.displayedErrors = [];
        
        // Create container for error displays
        this.container = this.scene.add.container(
            this.scene.cameras.main.width - this.config.width - 20,
            20
        );
        
        // Make container invisible initially
        this.container.setAlpha(0);
    }
    
    /**
     * Show an error message
     * @param {Object} error - Error object to display
     * @param {number} duration - Optional override for display duration
     */
    showError(error, duration = this.config.maxDisplayTime) {
        if (!error) return;
        
        // Add to queue with metadata
        this.errorQueue.push({
            error,
            duration,
            type: 'error',
            displayTime: 0
        });
        
        // Process queue
        this.processQueue();
    }
    
    /**
     * Show a warning message
     * @param {string} message - Warning message to display
     * @param {number} duration - Optional override for display duration
     */
    showWarning(message, duration = this.config.maxDisplayTime) {
        this.errorQueue.push({
            error: { message },
            duration,
            type: 'warning',
            displayTime: 0
        });
        
        // Process queue
        this.processQueue();
    }
    
    /**
     * Show an info message
     * @param {string} message - Info message to display
     * @param {number} duration - Optional override for display duration
     */
    showInfo(message, duration = this.config.maxDisplayTime) {
        this.errorQueue.push({
            error: { message },
            duration,
            type: 'info',
            displayTime: 0
        });
        
        // Process queue
        this.processQueue();
    }
    
    /**
     * Process the error queue
     */
    processQueue() {
        // Display errors if there's space and items in queue
        while (
            this.displayedErrors.length < this.config.maxErrorsVisible && 
            this.errorQueue.length > 0
        ) {
            const errorInfo = this.errorQueue.shift();
            this.displayError(errorInfo);
        }
    }
    
    /**
     * Display an error in the UI
     * @param {Object} errorInfo - Error info object
     */
    displayError(errorInfo) {
        const { error, type } = errorInfo;
        
        // Get position for this error
        const y = this.displayedErrors.length * 
            (this.config.fontSize + this.config.padding * 2 + 5);
        
        // Create background
        const bg = this.scene.add.rectangle(
            0,
            y,
            this.config.width,
            this.config.fontSize + this.config.padding * 2,
            this.config.background,
            this.config.alpha
        );
        bg.setOrigin(0, 0);
        
        // Determine text color based on error type
        let textColor = '#FFFFFF';
        switch (type) {
            case 'error':
                textColor = this.rgbToHex(this.config.errorColor);
                break;
            case 'warning':
                textColor = this.rgbToHex(this.config.warningColor);
                break;
            case 'info':
                textColor = this.rgbToHex(this.config.infoColor);
                break;
        }
        
        // Create text
        const text = this.scene.add.text(
            this.config.padding,
            y + this.config.padding,
            error.message,
            { 
                font: `${this.config.fontSize}px Arial`,
                fill: textColor,
                wordWrap: { width: this.config.width - this.config.padding * 2 }
            }
        );
        
        // Create close button
        const closeButton = this.scene.add.text(
            this.config.width - this.config.padding,
            y + this.config.padding,
            '✕',
            { font: `${this.config.fontSize}px Arial`, fill: '#FFFFFF' }
        );
        closeButton.setOrigin(1, 0);
        closeButton.setInteractive({ useHandCursor: true });
        
        // Close button handler
        closeButton.on('pointerdown', () => {
            this.removeError(errorInfo);
        });
        
        // Group elements
        const group = {
            errorInfo,
            bg,
            text,
            closeButton,
            container: this.scene.add.container(0, 0, [bg, text, closeButton])
        };
        
        // Add to container
        this.container.add(group.container);
        
        // Animate in
        this.container.setAlpha(1);
        
        // Add to displayed errors
        this.displayedErrors.push(group);
        
        // Start timer for auto-removal
        errorInfo.timer = this.scene.time.delayedCall(
            errorInfo.duration, 
            () => this.removeError(errorInfo)
        );
    }
    
    /**
     * Remove an error from display
     * @param {Object} errorInfo - Error info to remove
     */
    removeError(errorInfo) {
        // Find the error group
        const index = this.displayedErrors.findIndex(
            group => group.errorInfo === errorInfo
        );
        
        if (index === -1) return;
        
        const group = this.displayedErrors[index];
        
        // Cancel timer if exists
        if (errorInfo.timer) {
            errorInfo.timer.remove();
        }
        
        // Animate out
        this.scene.tweens.add({
            targets: group.container,
            alpha: 0,
            x: this.config.width,
            duration: this.config.fadeOutTime,
            onComplete: () => {
                // Remove from container
                this.container.remove(group.container, true);
                group.container.destroy();
                
                // Remove from array
                this.displayedErrors.splice(index, 1);
                
                // Reposition remaining errors
                this.repositionErrors();
                
                // Process queue for new errors
                this.processQueue();
                
                // Hide container if no more errors
                if (this.displayedErrors.length === 0) {
                    this.container.setAlpha(0);
                }
            }
        });
    }
    
    /**
     * Reposition errors after one is removed
     */
    repositionErrors() {
        this.displayedErrors.forEach((group, index) => {
            const y = index * (this.config.fontSize + this.config.padding * 2 + 5);
            
            this.scene.tweens.add({
                targets: group.container,
                y: y,
                duration: 200,
                ease: 'Power1'
            });
        });
    }
    
    /**
     * Clear all displayed errors
     */
    clearAll() {
        // Remove all errors
        [...this.displayedErrors].forEach(group => {
            this.removeError(group.errorInfo);
        });
        
        // Clear queue
        this.errorQueue = [];
    }
    
    /**
     * Update the error display
     * @param {number} time - Current time
     * @param {number} delta - Time delta
     */
    update(time, delta) {
        // Update display timers
        this.displayedErrors.forEach(group => {
            group.errorInfo.displayTime += delta;
            
            // Fade out when getting close to expiration
            if (
                group.errorInfo.timer && 
                group.errorInfo.timer.getOverallProgress() > 0.8
            ) {
                const remainingTime = group.errorInfo.duration - group.errorInfo.displayTime;
                const fadeProgress = 1 - (remainingTime / (this.config.maxDisplayTime * 0.2));
                
                group.container.setAlpha(Math.max(0.2, 1 - fadeProgress));
            }
        });
    }
    
    /**
     * Convert RGB hex to string format for Phaser text
     * @param {number} rgb - RGB color as hex number
     * @returns {string} Color as hex string
     */
    rgbToHex(rgb) {
        return '#' + rgb.toString(16).padStart(6, '0');
    }
}