# Step 6: Resource Production Implementation Plan

## Overview
This plan details the implementation of the resource production system for Magical Frontiers, including resource generation calculations, storage, visualization, and decay mechanics.

## Current Status Assessment

### What's Already Implemented:
1. Basic resource types defined (Mana, Vitality, Arcanum, Aether)
2. Territory types with base modifiers
3. Construct types that produce specific resources
4. Basic player resource storage in Player model
5. Resource display in UI (shows current amounts)

### What Needs Implementation:
1. Automated resource generation during production phase
2. Production calculation formulas with all modifiers
3. Resource storage limits and overflow handling
4. Resource visualization during production
5. Resource decay mechanics at end of cycle
6. Production summary and reporting

## Implementation Tasks

### Task 1: Resource Production Calculator
**File**: `src/models/ResourceProductionCalculator.js`

```javascript
export default class ResourceProductionCalculator {
    constructor(gameFlowController) {
        this.gameFlow = gameFlowController;
    }
    
    // Calculate production for a single territory
    calculateTerritoryProduction(territory) {
        // Base production = 10 * construct level
        // Apply territory type modifier
        // Apply construct-territory synergy bonus
        // Apply interference from adjacent territories
        // Apply random events/market conditions
        // Return { resource: amount } object
    }
    
    // Calculate total production for all territories
    calculateCycleProduction() {
        // For each territory with construct
        // Calculate individual production
        // Aggregate by player
        // Return production summary
    }
    
    // Apply production modifiers
    applyProductionModifiers(baseProduction, territory) {
        // Territory type modifier (0.8x to 1.5x)
        // Construct level bonus (+10% per level)
        // Synergy bonus (+25% for matching type)
        // Interference penalty (-5% per adjacent enemy)
        // Weather/event modifiers
    }
}
```

### Task 2: Resource Storage System
**File**: `src/models/ResourceStorage.js`

```javascript
export default class ResourceStorage {
    constructor() {
        this.storageCapacity = {
            mana: 100,
            vitality: 100,
            arcanum: 100,
            aether: 50  // Rarer resource, less storage
        };
        this.upgradeLevel = 0;
    }
    
    // Add resources with overflow handling
    addResources(player, resources) {
        // Check current amounts
        // Add new resources
        // Handle overflow (convert to gold? lose excess?)
        // Log transaction
        // Return actual amounts added
    }
    
    // Upgrade storage capacity
    upgradeStorage(resourceType) {
        // Increase capacity
        // Cost calculation
        // Visual feedback
    }
    
    // Check if player can store resources
    canStore(player, resources) {
        // Compare with current capacity
        // Return true/false with reasons
    }
}
```

### Task 3: Production Phase Handler
**Update**: `src/models/GameCycleManager.js`

```javascript
executeResourceProduction() {
    console.log('=== RESOURCE PRODUCTION PHASE ===');
    
    // 1. Calculate all production
    const calculator = new ResourceProductionCalculator(this.gameFlow);
    const productionResults = calculator.calculateCycleProduction();
    
    // 2. Show production animation/visualization
    this.broadcastEvent('production.started', { results: productionResults });
    
    // 3. Apply production to players (with delays for visual effect)
    productionResults.forEach((result, index) => {
        setTimeout(() => {
            this.applyProductionToPlayer(result);
        }, index * 500);
    });
    
    // 4. Show production summary
    setTimeout(() => {
        this.broadcastEvent('production.completed', { 
            summary: this.generateProductionSummary(productionResults) 
        });
    }, productionResults.length * 500 + 1000);
}
```

### Task 4: Resource Visualization
**Update**: `src/scenes/GameScene.js`

```javascript
// Add to GameScene class
initializeResourceVisualization() {
    // Create resource flow particles system
    this.resourceParticles = {
        mana: this.createResourceParticleEmitter(0x0080ff),
        vitality: this.createResourceParticleEmitter(0x00ff00),
        arcanum: this.createResourceParticleEmitter(0xff8000),
        aether: this.createResourceParticleEmitter(0xff00ff)
    };
}

showResourceProduction(territory, resource, amount) {
    // Get territory position
    const pos = this.hexUtils.axialToPixel(territory.q, territory.r);
    
    // Create floating text showing +X resource
    const text = this.add.text(pos.x, pos.y - 30, `+${amount}`, {
        fontSize: '18px',
        color: this.getResourceColor(resource),
        stroke: '#000000',
        strokeThickness: 3
    });
    
    // Animate text floating up and fading
    this.tweens.add({
        targets: text,
        y: pos.y - 80,
        alpha: 0,
        duration: 2000,
        ease: 'Power2',
        onComplete: () => text.destroy()
    });
    
    // Emit particles from territory to player panel
    this.emitResourceParticles(pos, resource, amount);
}

emitResourceParticles(from, resource, amount) {
    // Create particle trail from territory to resource display
    // Number of particles based on amount
    // Color based on resource type
    // Arc trajectory to UI panel
}
```

### Task 5: Resource Decay System
**File**: `src/models/ResourceDecay.js`

```javascript
export default class ResourceDecay {
    constructor() {
        this.decayRates = {
            mana: 0.10,      // 10% decay per cycle
            vitality: 0.15,  // 15% decay (organic, decays faster)
            arcanum: 0.05,   // 5% decay (stable)
            aether: 0.20     // 20% decay (volatile)
        };
    }
    
    // Apply decay at end of cycle
    applyDecay(player) {
        const decayedResources = {};
        
        Object.keys(player.resources).forEach(resource => {
            const currentAmount = player.resources[resource];
            const decayAmount = Math.floor(currentAmount * this.decayRates[resource]);
            decayedResources[resource] = decayAmount;
            player.resources[resource] = Math.max(0, currentAmount - decayAmount);
        });
        
        return decayedResources;
    }
    
    // Special storage to prevent decay
    getPreservationMethods() {
        return {
            mana: 'Mana Crystals (500g)',
            vitality: 'Life Pods (400g)',
            arcanum: 'Rune Stones (300g)',
            aether: 'Void Containers (600g)'
        };
    }
}
```

### Task 6: Production Summary UI
**File**: `src/ui/panels/ProductionSummaryPanel.js`

```javascript
export default class ProductionSummaryPanel {
    constructor(scene) {
        this.scene = scene;
        this.createPanel();
    }
    
    createPanel() {
        // Create modal panel
        // Dark background overlay
        // Centered panel with results
        // Animated resource counters
        // Territory breakdown
        // Continue button
    }
    
    show(productionData) {
        // Populate panel with data
        // Animate in
        // Show breakdown by territory
        // Show totals with animations
        // Handle continue button
    }
    
    createTerritoryRow(territory, production) {
        // Territory name and type
        // Construct type and level
        // Resources produced with icons
        // Modifiers applied
    }
}
```

## Implementation Order

### Phase 1: Core Calculation (Day 1-2)
1. Create ResourceProductionCalculator
2. Implement base production formulas
3. Add all modifiers (terrain, synergy, interference)
4. Test calculations with various scenarios

### Phase 2: Storage System (Day 2-3)
1. Create ResourceStorage class
2. Implement overflow handling
3. Add storage upgrade mechanics
4. Integrate with Player model

### Phase 3: Production Phase (Day 3-4)
1. Update GameCycleManager for production phase
2. Implement production execution flow
3. Add timing and sequencing
4. Connect to turn system

### Phase 4: Visualization (Day 4-5)
1. Create resource particle effects
2. Implement floating text animations
3. Add production animations
4. Create particle trails

### Phase 5: Decay System (Day 5-6)
1. Implement ResourceDecay class
2. Add end-of-cycle decay processing
3. Create preservation mechanics
4. Add decay warnings

### Phase 6: UI and Polish (Day 6-7)
1. Create ProductionSummaryPanel
2. Add production breakdown UI
3. Implement resource trend graphs
4. Add sound effects

## Testing Plan

### Unit Tests
- Production calculation accuracy
- Modifier stacking correctness
- Storage overflow handling
- Decay calculations

### Integration Tests
- Full production cycle flow
- Multi-territory production
- Player resource updates
- UI synchronization

### Visual Tests
- Particle effects performance
- Animation smoothness
- UI responsiveness
- Color consistency

## Configuration Data

### Resource Colors
```javascript
const RESOURCE_COLORS = {
    mana: 0x0080ff,      // Blue
    vitality: 0x00ff00,  // Green
    arcanum: 0xff8000,   // Orange
    aether: 0xff00ff     // Purple
};
```

### Production Modifiers
```javascript
const PRODUCTION_MODIFIERS = {
    territoryBonus: {
        ancient_grove: { vitality: 1.5 },
        crystalline_cave: { mana: 1.5 },
        ruined_temple: { arcanum: 1.5 },
        volcanic_field: { aether: 1.5 },
        mountain_peak: { all: 1.2 },
        marshland: { vitality: 1.3, others: 0.9 }
    },
    synergyBonus: 1.25,
    interferancePenalty: 0.05,
    levelBonus: 0.10
};
```

## Success Criteria

1. **Accurate Calculations**: Production matches design formulas
2. **Visual Feedback**: Clear indication of resource generation
3. **Performance**: Smooth animations with 60 FPS
4. **User Understanding**: Players can easily see what they produced and why
5. **Balance**: Resource generation rates create meaningful economic decisions

## Next Steps
After completing Step 6, we'll be ready to move to Step 7 (Construct System completion) and then Phase 3 (Economic Systems) with the auction system implementation.