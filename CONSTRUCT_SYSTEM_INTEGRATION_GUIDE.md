# Construct System Integration Guide

## Overview
This guide explains how to integrate the complete Construct System into the Magical Frontiers game.

## System Components

### 1. Core Models
- **Construct.js** - The construct entity with production, upgrade, and repair functionality
- **ConstructManager.js** - Manages construct lifecycle (purchase, placement, installation, production)

### 2. UI Panels
- **ConstructShopPanel.js** - Shop interface for purchasing constructs
- **ConstructManagementPanel.js** - Management interface for viewing and maintaining constructs  
- **ProductionMonitor.js** - Real-time production monitoring (compact/expanded modes)

### 3. Game Systems
- **ConstructPlacementMode.js** - Territory selection and placement UI
- **InstallationAnimator.js** - Installation ritual animations and result display

### 4. Integration
- **ConstructSystemIntegration.js** - Ties everything together

## Integration Steps

### Step 1: Import the Integration Module

In your GameScene.js, add:

```javascript
import ConstructSystemIntegration from '../integration/ConstructSystemIntegration.js';
```

### Step 2: Initialize in Scene Create

```javascript
create() {
    // ... existing scene setup ...
    
    // Initialize Construct System
    this.constructSystem = new ConstructSystemIntegration(this);
    this.constructSystem.initialize();
}
```

### Step 3: Connect to Game Flow Controller

In GameFlowController initialization:

```javascript
// Add ConstructManager to game flow controller
import { ConstructManager } from './models/index.js';

initializeGame(players, settings) {
    // ... existing initialization ...
    
    // Initialize construct manager
    this.constructManager = new ConstructManager(this);
    
    // Connect to resource production calculator
    if (this.resourceProductionCalculator) {
        this.constructManager.initialize(this.resourceProductionCalculator);
    }
}
```

### Step 4: Update Resource Production

In ResourceProductionCalculator, the construct production methods are already integrated.

### Step 5: Add to Save/Load System

In GamePersistence.js:

```javascript
saveGame() {
    const saveData = {
        // ... existing save data ...
        constructs: this.gameFlow.constructManager?.serialize() || null
    };
    // ... save logic ...
}

loadGame(saveData) {
    // ... existing load logic ...
    
    // Load constructs
    if (saveData.constructs && this.gameFlow.constructManager) {
        this.gameFlow.constructManager.deserialize(saveData.constructs, this.gameFlow);
    }
}
```

## Usage

### Player Actions by Phase

#### Territory Selection Phase
- No construct actions available
- Can view construct management panel

#### Construct Outfitting Phase  
- Open shop (S key or button)
- Purchase constructs
- Place constructs on territories
- View management panel

#### Resource Production Phase
- Production monitor automatically appears
- Shows real-time resource generation
- Displays alerts for issues

#### Market Auction Phase
- Can view management panel
- Plan based on production

### Keyboard Shortcuts
- **S** - Toggle shop
- **M** - Toggle management panel  
- **P** - Toggle production monitor
- **ESC** - Cancel placement mode

### UI Flow
1. Player opens shop and purchases construct
2. Placement mode activates automatically
3. Player clicks valid territory
4. Installation animation plays
5. Result shown (success/failure)
6. If successful, construct produces resources each cycle

## Configuration

### Construct Types
Defined in `gameConfig.js`:
- Mana Conduit - Best on Crystalline Caves
- Vitality Well - Best on Ancient Groves
- Arcanum Extractor - Best on Ruined Temples
- Aether Resonator - Best on Volcanic Fields

### Production Rates
- Base production: 8-15 (Mana), 6-12 (Vitality), 4-10 (Arcanum), 2-8 (Aether)
- Level multipliers: 1.0x (L1), 1.5x (L2), 2.0x (L3)
- Terrain synergy bonus: +25%
- Efficiency modifiers apply

### Installation Success Rates
- Base: 83%
- Terrain match bonus: +10%
- Roll outcomes:
  - 1: Critical failure (construct damaged)
  - 2: Backfire (installation failed)
  - 3: Poor success (75% efficiency)
  - 4-5: Good success (100% efficiency)
  - 6: Perfect (110% efficiency)

## Troubleshooting

### Common Issues

1. **Constructs not producing**
   - Check construct status (must be 'active')
   - Verify territory ownership
   - Check efficiency (0% = no production)

2. **Can't place constructs**
   - Only during Construct Outfitting phase
   - Territory must be owned by player
   - Territory can't already have a construct

3. **UI panels not showing**
   - Check if ConstructSystemIntegration is initialized
   - Verify event listeners are connected
   - Check panel visibility states

## API Reference

### Events

#### Emitted by System
- `construct-purchased` - When player buys construct
- `placement-mode-activated` - Placement mode starts
- `installation-started` - Installation begins
- `installation-completed` - Installation finished
- `construct-upgraded` - Construct upgraded
- `construct-repaired` - Construct repaired

#### Listened by System
- `phase.started` - Enable/disable UI by phase
- `resource_production.started` - Show production monitor
- `resource_production.completed` - Update production data

### Public Methods

#### ConstructManager
- `purchaseConstruct(playerId, constructType)`
- `initiateInstallation(constructId, territoryId, playerId)`
- `calculateProduction(construct)`
- `getPlayerConstructs(playerId)`
- `getActiveConstructs()`

#### UI Panels
- `show()` / `hide()` / `toggle()`
- `updateResourceDisplay()` (Shop)
- `updateConstructList()` (Management)
- `updateProduction(data)` (Monitor)

## Testing

Run visual tests:
- `test-shop-visual.html` - Shop interface
- `test-placement-visual.html` - Placement system
- `test-installation-visual.html` - Installation animations

The Construct System is now fully integrated and ready for gameplay!