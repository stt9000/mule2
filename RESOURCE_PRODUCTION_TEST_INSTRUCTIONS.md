# Resource Production System Test Instructions

## Testing the Resource Production System

The resource production system has been fully implemented according to STEP_6_RESOURCE_PRODUCTION_PLAN.md. Here's how to test it:

### 1. Open the Visual Test Page
Navigate to: http://localhost:8080/test-production-visual.html

### 2. Start a New Game
1. Click "New Game" in the main menu
2. Set players as desired (Human or AI)
3. Start the game

### 3. Test Setup
Once in the game:
1. Click **"Setup Test Territories"** button - This gives each player territories with constructs
2. Click **"Show Player Resources"** button - Verify players start with 0 resources

### 4. Skip to Production Phase
1. Click **"Skip to Production Phase"** button
2. The phase display should show "RESOURCE PRODUCTION"
3. Watch the console log for production events

### 5. Observe Production Animation
When in the production phase, you should see:
- Floating numbers appear above territories showing resource production
- Resource particles flowing from territories 
- Production messages in the log showing which territories produced what
- Player resources being updated

### 6. Production Summary Panel
After production completes:
- A summary panel should appear showing:
  - Cycle number
  - Each player's total production
  - Breakdown by resource type
- Click "Continue" to close the panel

### 7. Verify Storage and Overflow
1. Click **"Show Player Resources"** after production
2. Resources should be added to players
3. If resources exceed storage capacity (100 for most, 50 for aether):
   - Excess converts to gold at 50% value
   - Log shows overflow conversion

### 8. Test Multiple Cycles
1. Click **"Advance Phase"** repeatedly to go through phases
2. When you reach production phase again, observe:
   - Resources accumulating
   - Storage limits being respected
   - Overflow conversions

### 9. Test Resource Decay
At the end of each cycle (end_cycle_events phase):
- Resources decay based on type:
  - Mana: 20% decay
  - Vitality: 50% decay (organic, decays fastest)
  - Arcanum: 0% decay (stable)
  - Aether: 10% decay
- Check player resources before and after to verify decay

## What to Look For

### Visual Elements
- ✅ Floating "+X" text above territories during production
- ✅ Resource-colored particles (Blue=Mana, Green=Vitality, Orange=Arcanum, Purple=Aether)
- ✅ Production summary panel with player breakdowns
- ✅ Smooth animations and transitions

### Game Mechanics
- ✅ Correct base production values (15 mana, 12 vitality, 10 arcanum, 5 aether)
- ✅ Level bonuses (+50% per level above 1)
- ✅ Terrain modifiers applying correctly
- ✅ Synergy bonuses for matching construct/terrain (+25%)
- ✅ Storage limits enforced (100/100/100/50)
- ✅ Overflow conversion to gold
- ✅ Resource decay at cycle end

### Console Log Messages
Look for these in the browser console or test page log:
- "Resource production started for cycle X"
- "Territory X produced Y resource"
- "Player received: {resources}"
- "Overflow converted to X gold"
- "Production phase completed!"

## Common Issues

1. **No production happening**: Make sure territories have both owners AND constructs
2. **No visual effects**: Check browser console for errors
3. **Panel not showing**: Verify ProductionSummaryPanel is created in GameScene

## Manual Testing Commands

You can also test via browser console:
```javascript
// Get current player resources
gameScene.gameFlowController.stateManager.getAllPlayers().forEach(p => 
  console.log(p.name, p.resources)
);

// Manually trigger production
gameScene.gameFlowController.cycleManager.executeResourceProduction();

// Check storage info
const player = gameScene.gameFlowController.stateManager.getPlayer('player1');
console.log(gameScene.gameFlowController.cycleManager.resourceStorage.getStorageInfo(player));
```

## Success Criteria

The resource production system is working correctly if:
1. Resources are generated each production phase
2. Visual feedback shows production clearly
3. Storage limits are enforced
4. Overflow converts to gold
5. Production summary panel displays
6. Resources decay at cycle end
7. All calculations match the design formulas