/**
 * ErrorHandler Utility
 * Centralizes error handling across the game
 */
export default class ErrorHandler {
    constructor() {
        this.errors = [];
        this.listeners = [];
        this.maxErrors = 100; // Maximum number of errors to store
    }

    /**
     * Error types for categorization and handling
     */
    static errorTypes = {
        VALIDATION: 'validation',
        RESOURCE: 'resource',
        ACTION: 'action',
        SYSTEM: 'system',
        NETWORK: 'network',
        UNKNOWN: 'unknown'
    };

    /**
     * Log an error to the error stack
     * @param {string} type - Error type from errorTypes
     * @param {string} message - Error message
     * @param {Object} data - Additional error data
     * @returns {Object} The error object
     */
    logError(type, message, data = {}) {
        const error = {
            id: Date.now() + Math.random().toString(36).substring(2, 9),
            type: Object.values(ErrorHandler.errorTypes).includes(type) 
                ? type 
                : ErrorHandler.errorTypes.UNKNOWN,
            message,
            data,
            timestamp: new Date(),
            handled: false
        };

        // Add to error stack
        this.errors.unshift(error);
        
        // Limit the number of stored errors
        if (this.errors.length > this.maxErrors) {
            this.errors.pop();
        }

        // Notify listeners
        this.notifyListeners(error);

        console.error(`[${error.type.toUpperCase()}] ${message}`, data);
        return error;
    }

    /**
     * Log a validation error
     * @param {string} message - Error message
     * @param {Object} data - Additional error data
     * @returns {Object} The error object
     */
    logValidationError(message, data = {}) {
        return this.logError(ErrorHandler.errorTypes.VALIDATION, message, data);
    }

    /**
     * Log a resource error
     * @param {string} message - Error message
     * @param {Object} data - Additional error data
     * @returns {Object} The error object
     */
    logResourceError(message, data = {}) {
        return this.logError(ErrorHandler.errorTypes.RESOURCE, message, data);
    }

    /**
     * Log an action error
     * @param {string} message - Error message
     * @param {Object} data - Additional error data
     * @returns {Object} The error object
     */
    logActionError(message, data = {}) {
        return this.logError(ErrorHandler.errorTypes.ACTION, message, data);
    }

    /**
     * Log a system error
     * @param {string} message - Error message
     * @param {Object} data - Additional error data
     * @returns {Object} The error object
     */
    logSystemError(message, data = {}) {
        return this.logError(ErrorHandler.errorTypes.SYSTEM, message, data);
    }

    /**
     * Handle an error (convenience method for catching exceptions)
     * @param {Error} error - The caught error
     * @param {string} context - Context where the error occurred
     * @returns {Object} The error object
     */
    handleError(error, context = 'Unknown') {
        const errorData = {
            context: context,
            stack: error.stack,
            name: error.name
        };
        
        return this.logError(ErrorHandler.errorTypes.SYSTEM, error.message, errorData);
    }

    /**
     * Check if there are any unhandled errors
     * @returns {boolean} True if there are unhandled errors
     */
    hasErrors() {
        return this.getUnhandledErrors().length > 0;
    }

    /**
     * Mark an error as handled
     * @param {string} errorId - ID of the error to mark as handled
     */
    markErrorHandled(errorId) {
        const error = this.errors.find(e => e.id === errorId);
        if (error) {
            error.handled = true;
        }
    }

    /**
     * Get all unhandled errors
     * @returns {Array} Array of unhandled errors
     */
    getUnhandledErrors() {
        return this.errors.filter(e => !e.handled);
    }

    /**
     * Get errors of a specific type
     * @param {string} type - Error type to filter by
     * @returns {Array} Array of errors of the specified type
     */
    getErrorsByType(type) {
        return this.errors.filter(e => e.type === type);
    }

    /**
     * Clear all errors
     */
    clearErrors() {
        this.errors = [];
    }

    /**
     * Add an error listener
     * @param {Function} listener - Function to call when an error occurs
     */
    addListener(listener) {
        if (typeof listener === 'function' && !this.listeners.includes(listener)) {
            this.listeners.push(listener);
        }
    }

    /**
     * Remove an error listener
     * @param {Function} listener - Listener to remove
     */
    removeListener(listener) {
        const index = this.listeners.indexOf(listener);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Notify all listeners of a new error
     * @param {Object} error - The error object
     */
    notifyListeners(error) {
        for (const listener of this.listeners) {
            try {
                listener(error);
            } catch (e) {
                console.error('Error in error listener:', e);
            }
        }
    }

    /**
     * Get a suggested recovery action for an error
     * @param {Object} error - The error object
     * @returns {Object|null} Recovery action or null if none available
     */
    getRecoveryAction(error) {
        if (!error) return null;

        switch (error.type) {
            case ErrorHandler.errorTypes.RESOURCE:
                return {
                    type: 'resource_recovery',
                    message: 'Try acquiring more resources or choosing a different action.',
                    action: () => {
                        return { success: true, message: 'Resources refreshed' };
                    }
                };

            case ErrorHandler.errorTypes.VALIDATION:
                return {
                    type: 'validation_recovery',
                    message: 'Check input parameters and try again.',
                    data: error.data
                };

            case ErrorHandler.errorTypes.ACTION:
                return {
                    type: 'action_recovery',
                    message: 'Try a different action or wait for conditions to change.'
                };

            case ErrorHandler.errorTypes.SYSTEM:
                return {
                    type: 'system_recovery',
                    message: 'Try refreshing the game or reloading the application.'
                };

            default:
                return null;
        }
    }

    /**
     * Create a result object with error information
     * @param {boolean} success - Whether the operation was successful
     * @param {string} message - Result message
     * @param {Object} data - Additional result data
     * @param {Object} error - Error object if operation failed
     * @returns {Object} Result object
     */
    static createResult(success, message, data = {}, error = null) {
        return {
            success,
            message,
            data,
            error,
            timestamp: new Date()
        };
    }

    /**
     * Create a success result
     * @param {string} message - Success message
     * @param {Object} data - Additional result data
     * @returns {Object} Success result
     */
    static createSuccess(message, data = {}) {
        return ErrorHandler.createResult(true, message, data);
    }

    /**
     * Create an error result
     * @param {string} message - Error message
     * @param {Object} data - Additional result data
     * @param {Object} error - Error object
     * @returns {Object} Error result
     */
    static createError(message, data = {}, error = null) {
        return ErrorHandler.createResult(false, message, data, error);
    }
}