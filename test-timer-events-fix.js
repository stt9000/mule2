/**
 * Test script for timer event broadcasting fix
 */

import { TimeManager } from './src/models/index.js';

async function testTimerEventsFix() {
    console.log('🧪 Testing Timer Event Broadcasting Fix...\n');
    
    try {
        const timeManager = new TimeManager();
        const events = [];
        
        console.log('1. Setting up event listeners...');
        
        // Add comprehensive event listeners
        timeManager.on('timer.started', (data) => {
            events.push(`STARTED: ${data.timerId} (${data.phase})`);
            console.log('✅ Timer started event received:', data);
        });
        
        timeManager.on('timer.update', (data) => {
            events.push(`UPDATE: ${data.remainingTime}s (${data.urgencyLevel})`);
            console.log('✅ Timer update event received:', data.remainingTime + 's');
        });
        
        timeManager.on('timer.expired', (data) => {
            events.push(`EXPIRED: ${data.timerId}`);
            console.log('✅ Timer expired event received:', data);
        });
        
        console.log('   Event listeners set up successfully');
        
        console.log('\n2. Starting a 3-second timer...');
        timeManager.startPhaseTimer('test_phase', 3);
        
        console.log('   Timer started, waiting for events...');
        
        // Wait 4 seconds to capture all events
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        console.log('\n3. Analyzing received events...');
        console.log('   Total events received:', events.length);
        console.log('   Events:', events);
        
        // Check for required events
        const hasStartEvent = events.some(e => e.includes('STARTED'));
        const hasUpdateEvents = events.filter(e => e.includes('UPDATE')).length > 0;
        const hasExpiredEvent = events.some(e => e.includes('EXPIRED'));
        
        console.log('\n   Event analysis:');
        console.log('   - Start event:', hasStartEvent ? '✅ RECEIVED' : '❌ MISSING');
        console.log('   - Update events:', hasUpdateEvents ? `✅ RECEIVED (${events.filter(e => e.includes('UPDATE')).length})` : '❌ MISSING');
        console.log('   - Expired event:', hasExpiredEvent ? '✅ RECEIVED' : '❌ MISSING');
        
        console.log('\n4. Testing timer status...');
        const timerStatus = timeManager.getTimerStatus();
        console.log('   Timer status:', timerStatus);
        console.log('   Has active timers:', timeManager.hasActiveTimers() ? '❌ YES (should be no)' : '✅ NO');
        
        console.log('\n5. Testing multiple timers...');
        timeManager.startPhaseTimer('test_phase_2', 2);
        timeManager.startPlayerTimer('test_player', 'test_phase', 2);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const statusAfterMultiple = timeManager.getTimerStatus();
        console.log('   Multiple timers status:');
        console.log('   - Global timer:', statusAfterMultiple.globalTimer ? '✅ ACTIVE' : '❌ NONE');
        console.log('   - Player timers:', Object.keys(statusAfterMultiple.playerTimers).length);
        
        console.log('\n6. Testing pause/resume...');
        const eventsBeforePause = events.length;
        
        timeManager.pauseAllTimers();
        console.log('   Timers paused');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const eventsAfterPause = events.length;
        const eventsDuringPause = eventsAfterPause - eventsBeforePause;
        console.log('   Events during pause:', eventsDuringPause, eventsDuringPause === 0 ? '✅ NONE (correct)' : '❌ SOME (incorrect)');
        
        timeManager.resumeAllTimers();
        console.log('   Timers resumed');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Cleanup
        timeManager.clearAllTimers();
        
        console.log('\n🎯 Timer Events Fix Test Summary:');
        const allTestsPassed = hasStartEvent && hasUpdateEvents && hasExpiredEvent && eventsDuringPause === 0;
        console.log('   Overall result:', allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
        
        if (!allTestsPassed) {
            console.log('\n   Failed tests:');
            if (!hasStartEvent) console.log('   - Timer start events not received');
            if (!hasUpdateEvents) console.log('   - Timer update events not received');
            if (!hasExpiredEvent) console.log('   - Timer expired events not received');
            if (eventsDuringPause !== 0) console.log('   - Events fired during pause (should not happen)');
        }
        
        return allTestsPassed;
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.error(error.stack);
        return false;
    }
}

// Run the test
testTimerEventsFix().then(success => {
    console.log('\n' + '='.repeat(50));
    console.log('Timer Events Fix Test:', success ? '✅ PASSED' : '❌ FAILED');
    process.exit(success ? 0 : 1);
}).catch(console.error);