/**
 * Test ResourceQueueManager functionality
 */

import AuctionManager from './src/models/AuctionManager.js';
import ResourceQueueManager from './src/models/ResourceQueueManager.js';
import { EventEmitter } from 'events';

console.log('=== Testing ResourceQueueManager ===\n');

// Create mock event emitter
const events = new EventEmitter();

// Create auction manager with events
const auctionManager = {
    events: events,
    auctionPhase: 'inactive',
    currentResource: null,
    startResourceAuction: function(resource) {
        console.log(`[AuctionManager] Starting ${resource} auction`);
        this.currentResource = resource;
        this.auctionPhase = 'active';
        return true;
    },
    endResourceAuction: function() {
        console.log(`[AuctionManager] Ending ${this.currentResource} auction`);
        this.auctionPhase = 'resolution';
        this.currentResource = null;
        return true;
    }
};

// Create resource queue manager
const queueManager = new ResourceQueueManager(auctionManager);

// Test 1: Initialize and start queue
console.log('Test 1: Initialize and start queue');
queueManager.initialize();
const status1 = queueManager.getStatus();
console.log('Initial status:', status1);
console.log('');

// Test 2: Start the queue
console.log('Test 2: Start the queue');
queueManager.start();
const status2 = queueManager.getStatus();
console.log('After start:', status2);
console.log('');

// Test 3: Check resource progression
console.log('Test 3: Check resource progression');
console.log('Waiting for first resource to complete...\n');

// Listen for events
events.on('auction.queue.progress', (data) => {
    console.log('Queue progress event:', data);
});

events.on('auction.queue.transition', (data) => {
    console.log('Queue transition event:', data);
});

events.on('auction.queue.complete', (data) => {
    console.log('Queue complete event:', data);
    console.log('\n=== All tests completed ===');
    process.exit(0);
});

// Simulate faster progression for testing
console.log('Simulating resource completion...\n');

// Override durations for faster testing
queueManager.resourceDuration = 2; // 2 seconds
queueManager.transitionDelay = 1; // 1 second

// Restart with faster timing
queueManager.reset();
queueManager.start();

// Show status periodically
let checkCount = 0;
const statusInterval = setInterval(() => {
    checkCount++;
    const status = queueManager.getStatus();
    console.log(`Status check ${checkCount}:`, {
        currentResource: status.currentResource,
        completedResources: status.completedResources,
        progress: Math.round(status.progress * 100) + '%'
    });
    
    if (!status.isActive) {
        clearInterval(statusInterval);
    }
}, 1500);

// Prevent hanging
setTimeout(() => {
    console.log('\nTest timeout reached');
    clearInterval(statusInterval);
    process.exit(1);
}, 20000);