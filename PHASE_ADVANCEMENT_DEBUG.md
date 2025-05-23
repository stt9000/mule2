# Phase Advancement Debug Guide

## Issue
After Player 1 selects a territory in the territory_selection phase, the game cycles through all players but doesn't advance to the construct_outfitting phase.

## Expected Flow
1. Territory Selection Phase starts
2. Each player (1-4) takes a turn to select a territory
3. After Player 4's turn ends, turn sequence should end
4. Phase should advance to Construct Outfitting
5. Territories should be resolved (disputes handled)
6. Each player takes turns placing constructs

## Debug Points Added

### TurnManager.js
- Added logging in `nextPlayer()` to track player index
- Added logging in `endTurnSequence()` to confirm it's called

### GameFlowController.js  
- Added logging in `onTurnSequenceEnded()` to track phase advancement

### GameCycleManager.js
- Added logging in `advancePhase()` to track phase changes
- Added territory dispute resolution in `endCurrentPhase()`

## Console Messages to Look For

1. **Turn Progression**:
   - "NextPlayer called. Current index: X, Total players: 4"
   - "New index after increment: X"
   - "All players have completed their turns - ending turn sequence" (should appear after Player 4)

2. **Phase Advancement**:
   - "TurnManager.endTurnSequence called - broadcasting turn_sequence.ended event"
   - "GameFlowController.onTurnSequenceEnded - advancing to next phase"
   - "GameCycleManager.advancePhase called - current phase: territory_selection, index: 0"
   - "Resolving territory disputes at end of territory selection phase"
   - "Advancing to phase: construct_outfitting"

3. **Territory Resolution**:
   - "Resolving territory selections..."
   - "Territory X awarded to playerY"

## Potential Issues

1. **Turn Sequence Not Ending**: 
   - Check if Player 4's turn is properly ending
   - Check if currentPlayerIndex is wrapping to 0

2. **Event Not Firing**:
   - Verify turn_sequence.ended event is broadcast
   - Verify GameFlowController receives the event

3. **Phase Not Advancing**:
   - Check if advancePhase() is called
   - Check for errors in phase advancement

4. **AI Turn Issues**:
   - AI players might not be properly ending turns
   - Action system might conflict with manual nextTurn calls

## Manual Test Steps

1. Open browser console (F12)
2. Start game at http://localhost:8080  
3. Click "Buy Land"
4. Click on a territory
5. Click "End Turn"
6. Watch console for the debug messages above
7. Note where the flow stops

## Fix Summary

1. Removed manual `nextTurn()` calls from AI players - let action system handle it
2. Added dispute resolution at end of territory_selection phase
3. Fixed construct placement to use proper game flow methods
4. Added debug logging throughout the turn/phase system