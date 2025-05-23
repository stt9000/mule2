# Manual Test Plan: Phase 2, Step 5 - Territory Management System

## Overview
This test plan covers manual testing of the territory management system implemented in Phase 2, Step 5. These tests verify territory claiming, improvements, visualization, and integration with the game flow system from Step 4.

## Prerequisites
- Node.js environment set up
- All Phase 2, Step 4 components implemented (Game Flow)
- All Phase 2, Step 5 components implemented (Territory Management)
- Game server running (`npm start`)
- Browser with developer console access
- Basic understanding of M.U.L.E. game mechanics

## Test Environment Setup

### 1. Start Game Server
```bash
npm start
```

### 2. Open Game in Browser
- Navigate to http://localhost:8080
- Open browser developer console (F12)
- Note: Game will auto-initialize with GameFlowController and TerritoryGrid

### 3. Default Test Players
The game creates 4 default players:
- Player 1 (Red) - Starting gold: 1000
- Player 2 (Blue) - Starting gold: 1000  
- Player 3 (Green) - Starting gold: 1000
- Player 4 (Yellow) - Starting gold: 1000

---

## Test Suite 1: Territory Grid Initialization

### Test 1.1: Grid Generation
**Objective:** Verify territory grid is created correctly

**Steps:**
1. Start new game
2. Open browser console
3. Execute: `window.gameScene = this.scene.scenes[1]`
4. Execute: `console.log(window.gameScene.gameFlowController.territoryGrid.getStatistics())`

**Expected Results:**
- 48 total territories (8x6 grid)
- Each territory has unique ID (territory_x_y)
- Territory types distributed randomly among:
  - Ancient Grove (Green)
  - Crystalline Cave (Blue)
  - Ruined Temple (Tan)
  - Mountain Peak (Gray)
  - Marshland (Olive)
  - Volcanic Field (Reddish brown)

### Test 1.2: Visual Representation
**Objective:** Verify territories display correctly

**Steps:**
1. Observe game map after loading
2. Count visible hexagons
3. Verify color coding matches territory types

**Expected Results:**
- 48 hexagonal territories visible
- Each territory shows type-appropriate color
- Hexagons arranged in proper grid pattern
- Territory labels visible

---

## Test Suite 2: Territory Selection and Claiming

### Test 2.1: Territory Selection UI
**Objective:** Verify territory selection interface works

**Steps:**
1. Wait for Territory Selection phase
2. Hover mouse over different territories
3. Click on an unowned territory
4. Observe visual feedback

**Expected Results:**
- Hover effect: Yellow border highlight
- Cursor changes to pointer on hover
- Click selects territory with pulsing yellow highlight
- Territory details panel updates with:
  - Territory ID
  - Territory type
  - Owner (None)
  - Base modifiers

### Test 2.2: Free Territory Claiming
**Objective:** Verify players can claim territories

**Steps:**
1. During Player 1's turn in Territory Selection phase
2. Click an unowned territory
3. Verify claim success
4. Check UI updates

**Expected Results:**
- Territory ownership transfers to Player 1
- Territory border changes to player color (red)
- No gold deducted (free claim)
- Action logged in console
- Turn advances to next player

---

## Test Suite 3: Territory Disputes and Turn Order

### Test 3.1: Turn Order by Wealth
**Objective:** Verify poorest player goes first (M.U.L.E. rule)

**Steps:**
1. In console: `window.gameScene.gameFlowController.stateManager.updateGameState({ players: [{...window.gameScene.gameFlowController.stateManager.gameState.players[0], gold: 1200}, {...window.gameScene.gameFlowController.stateManager.gameState.players[1], gold: 800}, {...window.gameScene.gameFlowController.stateManager.gameState.players[2], gold: 1000}, {...window.gameScene.gameFlowController.stateManager.gameState.players[3], gold: 600}] })`
2. Wait for next Territory Selection phase
3. Observe turn order

**Expected Results:**
- Turn order: Player 4 (600g) → Player 2 (800g) → Player 3 (1000g) → Player 1 (1200g)
- UI shows current player name and color
- Only current player can claim territories

### Test 3.2: Territory Disputes
**Objective:** Verify dispute resolution when multiple players want same territory

**Steps:**
1. Set up test where multiple players have free claims
2. Have them attempt to claim same valuable territory
3. Let phase end
4. Check dispute resolution

**Expected Results:**
- Territory marked as disputed during phase
- At phase end, poorest player wins dispute
- Console shows dispute resolution event
- Other players notified of outcome

### Test 3.3: Out-of-Turn Actions
**Objective:** Verify players cannot act out of turn

**Steps:**
1. During Player 1's turn
2. Try to claim territory as Player 2
3. Wait for Player 2's turn
4. Try same action

**Expected Results:**
- Out-of-turn clicks ignored
- Console may show "Not your turn" message
- Actions only work during player's turn
- Turn indicator clearly shows active player

---

## Test Suite 4: Territory Improvements

### Test 4.1: Improvement Options
**Objective:** Verify improvement system displays correctly

**Steps:**
1. Own at least one territory
2. Enter Construct Outfitting phase
3. Select owned territory
4. Check improvement options

**Expected Results:**
- Improvement options display:
  - Wardstone (100 arcanum, 50 mana) - Reduces interference 50%
  - Harmonic Anchor (150 arcanum, 100 mana) - +50% enchantment bonus
  - Purification Circle (200 arcanum, 150 vitality) - Removes negative modifiers
  - Focus Pillar (300 arcanum, 200 mana, 100 vitality) - 10% double production
- Only affordable improvements are selectable
- Costs clearly displayed

### Test 4.2: Building Improvements
**Objective:** Verify improvement construction process

**Steps:**
1. Ensure player has required resources
2. Select owned territory
3. Choose Wardstone improvement
4. Confirm construction
5. Note completion cycle (current + 2)

**Expected Results:**
- Resources deducted immediately (100 arcanum, 50 mana)
- Construction begins with "Under Construction" status
- Completion cycle shown
- Turn consumed by action
- Cannot build duplicate improvements

### Test 4.3: Construction Progress
**Objective:** Verify multi-cycle construction

**Steps:**
1. Start improvement construction
2. End turn and advance cycles
3. Check construction status each cycle
4. Verify completion at correct cycle

**Expected Results:**
- Construction persists across cycles
- Status shows cycles remaining
- Improvement activates at completion cycle
- Visual indicator when complete
- Effects apply immediately upon completion

---

## Test Suite 5: Production and Modifiers

### Test 5.1: Territory Production Calculation
**Objective:** Verify production calculations with modifiers

**Steps:**
1. Place Mana Conduit on Crystalline Cave (+30% mana)
2. Check base production
3. Add Harmonic Anchor improvement
4. Check enhanced production

**Expected Results:**
- Base production: 10-25 mana
- With terrain bonus: +30% 
- With improvement: Additional +50% enchantment
- Interference: -10% (or -5% with Wardstone)
- Final calculation shown in territory details

### Test 5.2: Improvement Effects
**Objective:** Verify improvement effects apply correctly

**Steps:**
1. Test each improvement type:
   - Wardstone on territory with interference
   - Harmonic Anchor on enchanted territory
   - Purification Circle on Marshland (-15% mana)
   - Focus Pillar production doubling

**Expected Results:**
- Wardstone: Interference reduced from 10% to 5%
- Harmonic Anchor: +50% to enchantment bonuses
- Purification Circle: Negative modifiers become neutral (1.0)
- Focus Pillar: 10% chance to double production each cycle

### Test 5.3: Production Phase
**Objective:** Verify resources produced correctly

**Steps:**
1. Place various constructs on territories
2. Enter Resource Production phase
3. Check resource gains for each player
4. Verify calculations match expected

**Expected Results:**
- Each territory with construct produces resources
- Amount based on: base * terrain * level * improvements - interference
- Resources added to player inventory
- Production log shows details
- Visual effects during production

---

## Test Suite 6: Visual Feedback and UI

### Test 6.1: Territory Visual States
**Objective:** Verify visual feedback for territory states

**Steps:**
1. Observe unowned territories
2. Claim a territory
3. Select different territories
4. Hover over territories

**Expected Results:**
- Unowned: White border, terrain color fill
- Owned: Player color border (4px), terrain color fill
- Selected: Pulsing yellow highlight
- Hovered: Yellow border (3px)
- Territory type label visible
- Smooth visual transitions

### Test 6.2: UI Panel Updates
**Objective:** Verify UI panels update correctly

**Steps:**
1. Select different territories
2. Change game phases
3. Switch players
4. Build improvements

**Expected Results:**
- Territory panel shows:
  - Territory ID and type
  - Owner name or "None"
  - Construct type and level
  - Improvements list
  - Production details
- Player panel updates:
  - Current player name
  - Player color indicator
  - Gold amount
  - Resource counts
- Phase indicator updates

### Test 6.3: Status Messages
**Objective:** Verify status messages display correctly

**Steps:**
1. Perform various actions
2. Trigger warnings (timer)
3. Cause errors (invalid actions)

**Expected Results:**
- Success messages in default color
- Warnings in yellow/orange
- Errors in red
- Messages auto-dismiss after 3 seconds
- Critical messages persist longer

---

## Test Suite 7: Save/Load with Territories

### Test 7.1: Save Territory State
**Objective:** Verify territory state saves correctly

**Steps:**
1. Claim several territories
2. Build improvements (some complete, some in progress)
3. Place constructs
4. Save game (manual or auto-save)
5. Check console: `window.gameScene.gameFlowController.saveGame('test_save')`

**Expected Results:**
- Save completes successfully
- Console shows save confirmation
- Territory ownership preserved
- Improvement states saved
- Construction progress tracked

### Test 7.2: Load Territory State
**Objective:** Verify territory state loads correctly

**Steps:**
1. After saving, refresh browser
2. Load saved game
3. Verify all territory states
4. Continue playing

**Expected Results:**
- All territories show correct owners
- Improvements at correct state
- Construction timers resume
- Visual state matches saved data
- Can continue game normally

---

## Test Suite 8: Phase Integration

### Test 8.1: Phase-Specific Territory Behavior
**Objective:** Verify territory system respects game phases

**Steps:**
1. Test each phase:
   - Territory Selection: Try claiming
   - Construct Outfitting: Try improvements
   - Resource Production: Check production
   - Auction: Try territory actions
   - End Cycle: Check dispute resolution

**Expected Results:**
- Territory Selection: Can claim unowned territories
- Construct Outfitting: Can only modify own territories
- Resource Production: Automatic, no territory actions
- Auction: No territory modifications allowed
- End Cycle: Disputes resolved, no player actions

### Test 8.2: Timer Integration
**Objective:** Verify timers affect territory actions

**Steps:**
1. Start territory action
2. Let phase timer expire
3. Start action with low time
4. Observe warnings

**Expected Results:**
- Timer warnings at 30s and 10s
- Actions cancelled on timeout
- Incomplete improvements lost
- Turn advances automatically

---

## Test Suite 9: Error Handling and Edge Cases

### Test 9.1: Invalid Territory Actions
**Objective:** Verify error handling for invalid actions

**Steps:**
1. Try to claim owned territory
2. Build improvement without resources
3. Place construct on enemy territory
4. Build duplicate improvements
5. Act out of turn

**Expected Results:**
- Clear error messages display
- "Territory already owned"
- "Insufficient resources"
- "Not your territory"
- "Improvement already exists"
- Game state remains stable

### Test 9.2: Rapid Actions
**Objective:** Verify system handles rapid inputs

**Steps:**
1. Click territories rapidly
2. Spam action buttons
3. Quick mouse movements
4. Multiple simultaneous actions

**Expected Results:**
- Actions properly throttled
- No duplicate claims
- No visual glitches
- Performance remains smooth

---

## Test Suite 10: Complete Gameplay Flow

### Test 10.1: Full Cycle with Territories
**Objective:** Verify complete game cycle with all territory features

**Steps:**
1. Start new 4-player game
2. Cycle 1: Each player claims 1 territory
3. Build improvements on some territories
4. Place constructs
5. Go through production phase
6. Continue for 3-4 cycles
7. Save and reload mid-game

**Expected Results:**
- All features work together smoothly
- Turn order updates based on wealth
- Production calculated correctly
- Improvements complete on schedule
- Save/load preserves all state
- No performance degradation

### Test 10.2: End Game
**Objective:** Verify game ends correctly with territories

**Steps:**
1. Play to final cycle
2. Check final scoring
3. Verify territory values counted

**Expected Results:**
- Territories add to final score (50 each)
- Improvements add value
- Constructs counted (75 per level)
- Winner determined correctly

---

## Test Summary Checklist

### Core Functionality
- [ ] Territory grid generates correctly (8x6)
- [ ] All 6 terrain types display properly
- [ ] Territory selection UI works smoothly
- [ ] Free claiming system functions
- [ ] Turn order follows wealth rule
- [ ] Territory disputes resolve correctly

### Improvements System  
- [ ] All 4 improvement types available
- [ ] Resource costs enforced
- [ ] Multi-cycle construction works
- [ ] Effects apply correctly
- [ ] Cannot build duplicates

### Visual/UI
- [ ] Territory colors match types
- [ ] Owner borders display correctly
- [ ] Hover/selection effects work
- [ ] UI panels update dynamically
- [ ] Status messages clear and timely

### Integration
- [ ] Phase restrictions enforced
- [ ] Timer warnings display
- [ ] Save/load preserves all territory data
- [ ] Production calculations accurate
- [ ] Error messages helpful

### Performance
- [ ] No lag with all territories claimed
- [ ] Smooth animations throughout
- [ ] Quick state updates
- [ ] Stable memory usage

## Known Issues Log
_Document any bugs found during testing:_

---

## Test Environment
- **Browser:** Chrome/Firefox/Safari
- **Node Version:** 14+
- **Screen Resolution:** 1920x1080 recommended
- **Test Date:** [Current Date]
- **Build Version:** Phase 2 Step 5 Complete