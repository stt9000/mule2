# Manual Test Plan: Phase 2, Step 4 - Turn Structure and Game Flow

## Overview
This test plan covers manual testing of the game flow components implemented in Phase 2, Step 4. These tests should be performed to verify that all turn structure and game flow systems work correctly.

## Prerequisites
- Node.js environment set up
- All Phase 2, Step 4 components implemented
- Basic understanding of M.U.L.E. game mechanics

## Test Environment Setup

### 1. Create Test Players
```javascript
const testPlayers = [
    { id: 'player1', name: 'Alice', gold: 1200 },
    { id: 'player2', name: 'Bob', gold: 800 },
    { id: 'player3', name: 'Charlie', gold: 1000 },
    { id: 'player4', name: 'Diana', gold: 600 }
];
```

### 2. Initialize Game Flow Controller
```javascript
import { GameFlowController } from './src/models/index.js';
const flowController = new GameFlowController({ 
    autoSave: false, 
    storageType: 'memory' 
});
```

---

## Test Suite 1: Game Initialization

### Test 1.1: Basic Game Initialization
**Objective:** Verify game can be initialized with valid players

**Steps:**
1. Create GameFlowController instance
2. Call `initializeGame()` with test players
3. Verify initialization result

**Expected Results:**
- `initializeGame()` returns `{ success: true, gameId: <string> }`
- Game status shows `isInitialized: true`
- Player count matches input
- Current cycle is 1
- Current phase is 'territory_selection'

**Test Code:**
```javascript
const result = await flowController.initializeGame(testPlayers);
console.log('Init result:', result);
console.log('Game status:', flowController.getGameStatus());
```

### Test 1.2: Invalid Initialization
**Objective:** Verify proper error handling for invalid inputs

**Steps:**
1. Try to initialize with empty player array
2. Try to initialize with null players
3. Try to initialize twice

**Expected Results:**
- Empty players: `{ success: false, error: "At least one player is required" }`
- Null players: Error caught and handled
- Double initialization: Should work (reinitialize)

---

## Test Suite 2: Game Cycle Management

### Test 2.1: Phase Progression
**Objective:** Verify phases advance in correct order

**Steps:**
1. Initialize game
2. Record initial phase
3. Call `flowController.cycleManager.advancePhase()` multiple times
4. Observe phase changes

**Expected Results:**
- Phases progress: territory_selection → construct_outfitting → resource_production → auction_phase → end_cycle_events
- After end_cycle_events, cycle increments and returns to territory_selection
- Events are fired for each phase change

**Test Code:**
```javascript
console.log('Initial phase:', flowController.getGameStatus().currentPhase);

for (let i = 0; i < 6; i++) {
    flowController.cycleManager.advancePhase();
    const status = flowController.getGameStatus();
    console.log(`Step ${i + 1}: Cycle ${status.currentCycle}, Phase ${status.currentPhase}`);
}
```

### Test 2.2: Game Completion
**Objective:** Verify game ends after maximum cycles

**Steps:**
1. Initialize game with maxCycles: 2
2. Advance through all phases until game ends
3. Verify game end event and final state

**Expected Results:**
- Game ends after cycle 2, end_cycle_events phase
- Game status shows `gameStatus: 'ended'`
- Final results are calculated
- Game end event is fired

---

## Test Suite 3: Turn Management

### Test 3.1: Turn Order Calculation
**Objective:** Verify turn order follows M.U.L.E. rules (poorest first)

**Steps:**
1. Initialize game with players having different gold amounts
2. Check initial turn order
3. Modify player wealth and recalculate

**Expected Results:**
- Turn order: Diana (600) → Bob (800) → Charlie (1000) → Alice (1200)
- Turn order updates when wealth changes

**Test Code:**
```javascript
flowController.turnManager.calculateTurnOrder();
const turnOrder = flowController.turnManager.turnOrder;
console.log('Turn order:', turnOrder.map(p => `${p.name} (${p.gold}g)`));
```

### Test 3.2: Player Action Execution
**Objective:** Verify player actions are processed correctly

**Steps:**
1. Start turn sequence
2. Execute valid player action
3. Execute invalid player action
4. Verify action tracking

**Expected Results:**
- Valid actions succeed and are logged
- Invalid actions fail with appropriate errors
- Actions are tracked per player per cycle

**Test Code:**
```javascript
const testAction = { type: 'claim_territory', territoryId: 'test1' };
const result = flowController.executePlayerAction('player1', testAction);
console.log('Action result:', result);

const actions = flowController.stateManager.getPlayerActions('player1');
console.log('Player actions:', actions);
```

### Test 3.3: Turn Time Limits
**Objective:** Verify turn timers work correctly

**Steps:**
1. Set short turn time limit (5 seconds)
2. Start a player turn
3. Wait for timeout
4. Verify forced turn end

**Expected Results:**
- Timer starts when turn begins
- Warning events fire at thresholds
- Turn ends automatically on timeout
- Next player's turn begins

---

## Test Suite 4: Time Management

### Test 4.1: Phase Timers
**Objective:** Verify phase timers function correctly

**Steps:**
1. Start a phase with a short timer (3 seconds)
2. Monitor timer updates
3. Wait for expiration
4. Verify phase advancement

**Expected Results:**
- Timer updates every second
- Warning events at 30s and 10s thresholds
- Phase advances automatically on expiration

**Test Code:**
```javascript
flowController.on('timer.update', (data) => {
    console.log(`Timer: ${data.remainingTime}s (${data.urgencyLevel})`);
});

flowController.on('timer.expired', (data) => {
    console.log('Timer expired for phase:', data.phase);
});

flowController.timeManager.startPhaseTimer('test_phase', 5);
```

### Test 4.2: Player Time Banks
**Objective:** Verify individual player time management

**Steps:**
1. Set player time banks
2. Start player timers
3. Monitor time deduction
4. Test time bank depletion

**Expected Results:**
- Player time banks track correctly
- Time is deducted from banks
- Events fire when banks are low

**Test Code:**
```javascript
flowController.timeManager.setPlayerTimeBank('player1', 60); // 1 minute
flowController.timeManager.startPlayerTimer('player1', 'territory_selection', 30);

const timeBank = flowController.timeManager.getPlayerTimeBank('player1');
console.log('Player1 time bank:', timeBank / 1000, 'seconds');
```

### Test 4.3: Pause and Resume
**Objective:** Verify timer pause/resume functionality

**Steps:**
1. Start multiple timers
2. Pause all timers
3. Wait a few seconds
4. Resume timers
5. Verify time doesn't advance during pause

**Expected Results:**
- Timers stop counting during pause
- Resume continues from paused time
- No time is lost during pause period

---

## Test Suite 5: State Management

### Test 5.1: State Validation
**Objective:** Verify game state validation works

**Steps:**
1. Initialize game with valid state
2. Modify state to invalid values
3. Attempt state update
4. Verify validation catches errors

**Expected Results:**
- Valid states pass validation
- Invalid states are rejected
- Validation errors are descriptive

**Test Code:**
```javascript
// Test valid state
const isValid = flowController.stateManager.validateGameState();
console.log('State valid:', isValid);

// Test invalid state update
const result = flowController.stateManager.updateGameState({
    currentCycle: -1 // Invalid
});
console.log('Invalid update result:', result);
```

### Test 5.2: State History
**Objective:** Verify state snapshots and history

**Steps:**
1. Take initial snapshot
2. Make several state changes
3. Take more snapshots
4. Restore previous snapshot
5. Verify restoration

**Expected Results:**
- Snapshots capture complete state
- History is maintained with limits
- Restoration works correctly

**Test Code:**
```javascript
const snapshotId = flowController.stateManager.saveStateSnapshot('Test snapshot');
console.log('Snapshot saved:', snapshotId);

// Make changes
flowController.stateManager.updateGameState({ testValue: 123 });

// Restore
const restored = flowController.stateManager.restoreStateSnapshot(snapshotId);
console.log('Restoration result:', restored);
```

### Test 5.3: Action Logging
**Objective:** Verify player actions are logged correctly

**Steps:**
1. Execute various player actions
2. Query action history
3. Verify action details

**Expected Results:**
- All actions are logged with timestamps
- Actions include player ID, type, and details
- History can be queried by player and cycle

---

## Test Suite 6: Persistence System

### Test 6.1: Save and Load
**Objective:** Verify save/load functionality

**Steps:**
1. Initialize and play partial game
2. Save game state
3. Load saved state
4. Verify game continues correctly

**Expected Results:**
- Save operation succeeds
- Load operation restores exact state
- Game can continue from loaded state

**Test Code:**
```javascript
// Save
const saveResult = await flowController.saveGame('test_save');
console.log('Save result:', saveResult);

// Load
const loadResult = await flowController.loadGame('test_save');
console.log('Load result:', loadResult);
```

### Test 6.2: Save Slot Management
**Objective:** Verify save slot operations

**Steps:**
1. Create multiple saves
2. List save slots
3. Delete specific saves
4. Verify slot management

**Expected Results:**
- Multiple saves can coexist
- Save list shows metadata
- Deletion works correctly

**Test Code:**
```javascript
const slots = await flowController.getSaveSlots();
console.log('Available saves:', slots);

const deleteResult = await flowController.deleteSave('test_save');
console.log('Delete result:', deleteResult);
```

### Test 6.3: Auto-save
**Objective:** Verify automatic saving works

**Steps:**
1. Enable auto-save with short interval
2. Play game for several cycles
3. Check for auto-save files
4. Disable auto-save

**Expected Results:**
- Auto-saves are created periodically
- Auto-save doesn't interfere with gameplay
- Auto-save can be disabled

---

## Test Suite 7: Event System

### Test 7.1: Event Broadcasting
**Objective:** Verify event system works correctly

**Steps:**
1. Subscribe to various events
2. Trigger events through gameplay
3. Verify events are received
4. Test event unsubscription

**Expected Results:**
- Events fire at correct times
- Event data is accurate
- Unsubscription prevents further events

**Test Code:**
```javascript
const eventLog = [];

flowController.on('phase.started', (data) => {
    eventLog.push(`Phase started: ${data.phase}`);
});

flowController.on('turn.started', (data) => {
    eventLog.push(`Turn started: ${data.player.name}`);
});

// Play game and check eventLog
```

### Test 7.2: Event Error Handling
**Objective:** Verify error handling in event callbacks

**Steps:**
1. Subscribe event handler that throws error
2. Trigger event
3. Verify game continues despite callback error

**Expected Results:**
- Callback errors don't crash game
- Other event handlers still work
- Errors are logged appropriately

---

## Test Suite 8: Integration Testing

### Test 8.1: Complete Game Flow
**Objective:** Verify all systems work together

**Steps:**
1. Initialize 4-player game
2. Play through complete cycles
3. Use all major features (save/load, pause/resume)
4. Complete game to end

**Expected Results:**
- Game flows smoothly from start to finish
- All systems interact correctly
- No memory leaks or performance issues

### Test 8.2: Error Recovery
**Objective:** Verify system resilience

**Steps:**
1. Force various error conditions
2. Verify graceful handling
3. Test recovery mechanisms

**Expected Results:**
- Errors are handled gracefully
- Game state remains consistent
- Recovery options work when available

---

## Test Suite 9: Performance Testing

### Test 9.1: Memory Usage
**Objective:** Verify no memory leaks

**Steps:**
1. Play extended game sessions
2. Monitor memory usage
3. Create/destroy many game instances

**Expected Results:**
- Memory usage remains stable
- No significant memory leaks
- Cleanup works properly

### Test 9.2: Timer Performance
**Objective:** Verify timer system performance

**Steps:**
1. Run many simultaneous timers
2. Test rapid timer creation/destruction
3. Monitor performance impact

**Expected Results:**
- Timer system handles load well
- No significant performance degradation
- Timers clean up properly

---

## Manual Test Execution

### Running Tests
1. Open browser console or Node.js environment
2. Import test modules
3. Execute test code snippets
4. Verify expected results
5. Log any discrepancies

### Test Results Documentation
For each test, record:
- Test name and objective
- Actual results vs expected
- Any errors or unexpected behavior
- Screenshots/logs if applicable
- Pass/Fail status

### Bug Reporting
If bugs are found:
- Document exact steps to reproduce
- Include error messages and stack traces
- Note browser/environment details
- Assign severity level
- Suggest potential fixes

---

## Success Criteria

All tests should pass with:
- ✅ Game initializes correctly with valid inputs
- ✅ Phase progression follows correct sequence  
- ✅ Turn management respects M.U.L.E. rules
- ✅ Timers function accurately and reliably
- ✅ State validation catches invalid data
- ✅ Save/load preserves game state exactly
- ✅ Events fire at appropriate times
- ✅ Error handling is graceful and informative
- ✅ Performance is acceptable under normal load
- ✅ Memory usage is stable over time

## Test Environment Notes

- Use multiple browsers for compatibility testing
- Test with different player counts (2-4 players)
- Vary game settings (cycle counts, time limits)
- Test edge cases (very short/long timers)
- Verify mobile device compatibility if applicable