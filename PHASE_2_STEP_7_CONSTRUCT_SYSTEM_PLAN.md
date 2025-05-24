# Detailed Implementation Plan: Phase 2, Step 7 - Construct System

## Overview
The Construct System is the heart of the game's resource production mechanics, replacing M.U.L.E.s with magical constructs. This system must handle the complete lifecycle: purchase, transport, placement, installation risk, operation, and upgrades.

## Core Components Architecture

### 1. Data Models and Classes

```javascript
// Construct base class
class Construct {
  constructor(type, level = 1) {
    this.id = generateUniqueId();
    this.type = type; // 'mana_conduit', 'vitality_well', etc.
    this.level = level;
    this.efficiency = 1.0; // 0.0 to 1.0
    this.territory = null;
    this.status = 'inventory'; // inventory, transporting, installing, active, damaged
    this.productionHistory = [];
  }
}

// Construct type definitions
const CONSTRUCT_TYPES = {
  mana_conduit: {
    name: 'Mana Conduit',
    baseCost: { arcanum: 150, mana: 50 },
    baseProduction: { min: 8, max: 15 },
    resourceType: 'mana',
    installTime: { min: 10, max: 25 },
    bestTerrain: ['crystalline_caves'],
    icon: '💎'
  },
  vitality_well: {
    name: 'Vitality Well',
    baseCost: { arcanum: 150, vitality: 50 },
    baseProduction: { min: 6, max: 12 },
    resourceType: 'vitality',
    installTime: { min: 8, max: 20 },
    bestTerrain: ['ancient_groves'],
    icon: '🌿'
  },
  arcanum_extractor: {
    name: 'Arcanum Extractor',
    baseCost: { arcanum: 200, mana: 75 },
    baseProduction: { min: 4, max: 10 },
    resourceType: 'arcanum',
    installTime: { min: 15, max: 30 },
    bestTerrain: ['ruined_temples'],
    icon: '⚗️'
  },
  aether_resonator: {
    name: 'Aether Resonator',
    baseCost: { arcanum: 300, mana: 100, vitality: 50 },
    baseProduction: { min: 2, max: 8 },
    resourceType: 'aether',
    installTime: { min: 20, max: 40 },
    bestTerrain: ['volcanic_fields'],
    icon: '✨'
  }
};
```

### 2. Construct Manager System

```javascript
class ConstructManager {
  constructor(game) {
    this.game = game;
    this.constructs = new Map(); // constructId -> Construct
    this.installationQueue = [];
    this.productionCalculator = new ProductionCalculator();
  }

  purchaseConstruct(playerId, constructType) {
    const player = this.game.getPlayer(playerId);
    const cost = this.getConstructCost(constructType, player);
    
    if (!player.canAfford(cost)) {
      throw new Error('Insufficient resources');
    }
    
    player.deductResources(cost);
    const construct = new Construct(constructType);
    player.inventory.addConstruct(construct);
    this.constructs.set(construct.id, construct);
    
    return construct;
  }

  initiateInstallation(constructId, territoryId, playerId) {
    const construct = this.constructs.get(constructId);
    const territory = this.game.territoryManager.getTerritory(territoryId);
    
    if (territory.ownerId !== playerId) {
      throw new Error('Cannot place construct on unowned territory');
    }
    
    if (territory.construct) {
      throw new Error('Territory already has a construct');
    }
    
    construct.status = 'installing';
    const installation = {
      construct,
      territory,
      startTime: Date.now(),
      duration: this.calculateInstallTime(construct, territory),
      playerId
    };
    
    this.installationQueue.push(installation);
    return installation;
  }

  processInstallation(installation) {
    const roll = Math.floor(Math.random() * 6) + 1;
    const result = this.resolveInstallationRoll(roll, installation);
    
    if (result.success) {
      installation.construct.territory = installation.territory;
      installation.territory.construct = installation.construct;
      installation.construct.status = 'active';
      installation.construct.efficiency = result.efficiency;
    } else {
      installation.construct.status = 'damaged';
      installation.construct.efficiency = 0;
    }
    
    return result;
  }

  calculateProduction(construct) {
    if (construct.status !== 'active') return 0;
    
    const baseProduction = this.productionCalculator.calculate(
      construct,
      construct.territory
    );
    
    return Math.floor(baseProduction * construct.efficiency);
  }
}
```

## Interface Components

### 1. Construct Shop Panel

**When Used:**
- Phase: Construct Outfitting phase only
- Turn Order: During each player's individual turn
- Frequency: Once per cycle per player (optional)
- Time Limit: Part of the player's construct outfitting time allocation

**Purpose:**
- Primary: Allow players to purchase new constructs using their accumulated resources
- Strategic: Show all available construct types with their stats for informed decision-making
- Economic: Display real-time resource costs vs. player's current resources
- Planning: Help players understand which constructs work best on which terrain types

```javascript
class ConstructShopPanel extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    this.scene = scene;
    this.constructButtons = [];
    this.createShopInterface();
  }

  createShopInterface() {
    // Background panel
    const bg = this.scene.add.rectangle(0, 0, 400, 600, 0x2a2a4a);
    bg.setStrokeStyle(2, 0x6666ff);
    this.add(bg);
    
    // Title
    const title = this.scene.add.text(0, -280, '⚒️ Artificers\' Guild', {
      fontSize: '24px',
      color: '#ffffff'
    });
    title.setOrigin(0.5);
    this.add(title);
    
    // Create construct listings
    let yOffset = -200;
    Object.entries(CONSTRUCT_TYPES).forEach(([type, data]) => {
      const listing = this.createConstructListing(type, data, yOffset);
      this.add(listing);
      yOffset += 120;
    });
    
    // Resource display
    this.resourceDisplay = this.createResourceDisplay();
    this.add(this.resourceDisplay);
  }

  createConstructListing(type, data, yOffset) {
    const container = this.scene.add.container(0, yOffset);
    
    // Icon and name
    const icon = this.scene.add.text(-150, 0, data.icon, { fontSize: '32px' });
    const name = this.scene.add.text(-100, -10, data.name, { fontSize: '18px' });
    
    // Cost display
    const costText = this.formatCost(data.baseCost);
    const cost = this.scene.add.text(-100, 10, costText, { 
      fontSize: '14px',
      color: '#ffcc00' 
    });
    
    // Production info
    const prodText = `Production: ${data.baseProduction.min}-${data.baseProduction.max} ${data.resourceType}/cycle`;
    const production = this.scene.add.text(-100, 30, prodText, { 
      fontSize: '12px',
      color: '#aaaaaa' 
    });
    
    // Purchase button
    const purchaseBtn = this.createButton('Purchase', 100, 0, () => {
      this.onPurchaseClick(type);
    });
    
    container.add([icon, name, cost, production, purchaseBtn]);
    return container;
  }

  onPurchaseClick(constructType) {
    const player = this.scene.gameManager.currentPlayer;
    const cost = CONSTRUCT_TYPES[constructType].baseCost;
    
    if (player.canAfford(cost)) {
      this.scene.gameManager.constructManager.purchaseConstruct(
        player.id, 
        constructType
      );
      this.updateResourceDisplay();
      this.scene.events.emit('construct-purchased', constructType);
    } else {
      this.showInsufficientResourcesWarning();
    }
  }
}
```

### 2. Construct Placement Interface

**When Used:**
- Phase: Construct Outfitting phase
- Turn Order: Immediately after purchasing a construct OR when accessing inventory
- Trigger: Player clicks "Place Construct" or selects construct from inventory
- Time Limit: Counts against player's outfitting phase time

**Purpose:**
- Navigation: Guide player to select which territory receives the construct
- Risk Assessment: Show installation success probabilities before commitment
- Territory Validation: Ensure only owned territories can receive constructs
- Time Management: Display remaining time to create urgency

```javascript
class ConstructPlacementMode {
  constructor(scene) {
    this.scene = scene;
    this.selectedConstruct = null;
    this.validTerritories = [];
    this.placementIndicator = null;
  }

  activatePlacementMode(construct) {
    this.selectedConstruct = construct;
    this.highlightValidTerritories();
    this.createPlacementUI();
    this.setupTerritoryClickHandlers();
  }

  highlightValidTerritories() {
    const player = this.scene.gameManager.currentPlayer;
    this.validTerritories = this.scene.territoryManager.getTerritories()
      .filter(t => t.ownerId === player.id && !t.construct);
    
    this.validTerritories.forEach(territory => {
      const highlight = this.scene.add.graphics();
      highlight.lineStyle(3, 0x00ff00, 0.8);
      highlight.strokeHexagon(territory.x, territory.y, territory.size);
      territory.highlight = highlight;
      
      // Show success rate
      const successRate = this.calculateSuccessRate(territory);
      const rateText = this.scene.add.text(
        territory.x, 
        territory.y - 30, 
        `${successRate}%`, 
        { fontSize: '16px', color: '#00ff00' }
      );
      rateText.setOrigin(0.5);
      territory.successRateText = rateText;
    });
  }

  calculateSuccessRate(territory) {
    let baseRate = 83;
    const constructType = CONSTRUCT_TYPES[this.selectedConstruct.type];
    
    // Terrain bonus
    if (constructType.bestTerrain.includes(territory.type)) {
      baseRate += 10;
    }
    
    // Other modifiers
    baseRate += this.scene.gameManager.getPlayerSkillBonus();
    baseRate -= this.scene.gameManager.getTimePressurePenalty();
    
    return Math.min(95, Math.max(50, baseRate));
  }

  onTerritoryClick(territory) {
    if (!this.validTerritories.includes(territory)) return;
    
    this.showInstallationConfirmation(territory);
  }

  showInstallationConfirmation(territory) {
    const modal = new ConfirmationModal(this.scene, {
      title: 'Confirm Construct Placement',
      message: `Place ${this.selectedConstruct.name} on ${territory.name}?`,
      successRate: this.calculateSuccessRate(territory),
      onConfirm: () => this.startInstallation(territory),
      onCancel: () => this.cancelPlacement()
    });
    modal.show();
  }

  startInstallation(territory) {
    this.clearHighlights();
    const installation = this.scene.gameManager.constructManager.initiateInstallation(
      this.selectedConstruct.id,
      territory.id,
      this.scene.gameManager.currentPlayer.id
    );
    
    this.scene.installationAnimator.playInstallation(installation);
  }
}
```

### 3. Installation Animation System

**When Used:**
- Phase: Construct Outfitting phase
- Trigger: Immediately after player confirms territory selection
- Duration: 10-40 seconds of real-time animation
- Blocking: Player cannot take other actions during installation

**Purpose:**
- Tension Building: Create suspense during the risk resolution
- Feedback: Show the magical binding process visually
- Immersion: Make the construct placement feel significant and magical
- Time Consumption: Use up precious outfitting phase time

```javascript
class InstallationAnimator {
  constructor(scene) {
    this.scene = scene;
    this.currentAnimation = null;
  }

  playInstallation(installation) {
    const modal = this.createInstallationModal();
    this.currentAnimation = modal;
    
    // Create magical binding animation
    const ritual = this.createRitualAnimation(
      installation.territory.x,
      installation.territory.y
    );
    
    // Progress bar
    const progressBar = this.createProgressBar(modal);
    
    // Animate progress
    const duration = installation.duration * 1000; // Convert to ms
    this.scene.tweens.add({
      targets: progressBar,
      scaleX: 1,
      duration: duration,
      ease: 'Linear',
      onComplete: () => this.completeInstallation(installation)
    });
    
    // Particle effects
    this.createMagicalParticles(installation.territory);
  }

  createRitualAnimation(x, y) {
    const graphics = this.scene.add.graphics();
    const symbols = [];
    
    // Create rotating magical symbols
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i;
      const symbolX = x + Math.cos(angle) * 50;
      const symbolY = y + Math.sin(angle) * 50;
      
      const symbol = this.scene.add.sprite(symbolX, symbolY, 'magical-symbol');
      symbol.setScale(0);
      symbols.push(symbol);
      
      this.scene.tweens.add({
        targets: symbol,
        scale: 1,
        rotation: Math.PI * 2,
        duration: 2000,
        repeat: -1
      });
    }
    
    return { graphics, symbols };
  }

  completeInstallation(installation) {
    // Roll dice for outcome
    const result = this.scene.gameManager.constructManager.processInstallation(installation);
    
    // Show result
    this.showInstallationResult(result, installation);
    
    // Clean up animation
    this.cleanupAnimation();
  }

  showInstallationResult(result, installation) {
    const resultModal = new InstallationResultModal(this.scene, {
      result: result,
      construct: installation.construct,
      territory: installation.territory,
      onContinue: () => this.scene.nextPhase()
    });
    resultModal.show();
  }
}
```

### 4. Installation Result Display

**When Used:**
- Phase: Construct Outfitting phase
- Trigger: Immediately after installation process completes
- Duration: 5-10 seconds, then auto-dismisses or requires click
- Impact: Determines construct's effectiveness for rest of game

**Purpose:**
- Resolution: Show the outcome of the risk/reward decision
- Information: Communicate the construct's actual production capacity
- Celebration/Commiseration: Provide emotional response to success/failure
- Planning: Give data for future turn planning

### 5. Construct Management Panel

**When Used:**
- Phase: Any phase (persistent interface element)
- Access: Via UI button "My Constructs" or hotkey
- Purpose: Always-available overview of player's construct empire
- Updates: Real-time as constructs produce, get damaged, or upgraded

**Purpose:**
- Monitoring: Track all constructs and their current status
- Maintenance: Identify constructs needing repair or upgrade
- Planning: Help decide where to invest resources next
- Optimization: Show efficiency problems and solutions

```javascript
class ConstructManagementPanel extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    this.scene = scene;
    this.constructList = [];
    this.createPanel();
  }

  createPanel() {
    // Panel background
    const bg = this.scene.add.rectangle(0, 0, 500, 400, 0x1a1a2a);
    bg.setStrokeStyle(2, 0x4444ff);
    this.add(bg);
    
    // Title
    const title = this.scene.add.text(0, -180, '🏗️ Your Magical Constructs', {
      fontSize: '20px',
      color: '#ffffff'
    });
    title.setOrigin(0.5);
    this.add(title);
    
    // Scrollable construct list
    this.constructListContainer = this.scene.add.container(0, 0);
    this.add(this.constructListContainer);
    
    this.updateConstructList();
  }

  updateConstructList() {
    this.constructListContainer.removeAll(true);
    
    const player = this.scene.gameManager.currentPlayer;
    const constructs = this.scene.gameManager.constructManager.getPlayerConstructs(player.id);
    
    let yOffset = -120;
    constructs.forEach(construct => {
      if (construct.status === 'active') {
        const entry = this.createConstructEntry(construct, yOffset);
        this.constructListContainer.add(entry);
        yOffset += 80;
      }
    });
  }

  createConstructEntry(construct, yOffset) {
    const container = this.scene.add.container(0, yOffset);
    const territory = construct.territory;
    
    // Territory info
    const territoryText = this.scene.add.text(-200, -20, 
      `Territory: ${territory.name} (${territory.x},${territory.y})`,
      { fontSize: '14px', color: '#aaaaaa' }
    );
    
    // Construct info
    const constructInfo = CONSTRUCT_TYPES[construct.type];
    const nameText = this.scene.add.text(-200, 0,
      `${constructInfo.icon} ${constructInfo.name} - Level ${construct.level}`,
      { fontSize: '16px', color: '#ffffff' }
    );
    
    // Production info
    const production = this.scene.gameManager.constructManager.calculateProduction(construct);
    const prodText = this.scene.add.text(-200, 20,
      `Production: ${production} ${constructInfo.resourceType}/cycle`,
      { fontSize: '14px', color: '#00ff00' }
    );
    
    // Status indicator
    const statusText = this.getStatusText(construct);
    const status = this.scene.add.text(100, 0, statusText.text, {
      fontSize: '12px',
      color: statusText.color
    });
    
    // Action buttons
    const upgradeBtn = this.createSmallButton('Upgrade', 180, -15, () => {
      this.onUpgradeClick(construct);
    });
    
    const inspectBtn = this.createSmallButton('Inspect', 180, 15, () => {
      this.onInspectClick(construct);
    });
    
    container.add([territoryText, nameText, prodText, status, upgradeBtn, inspectBtn]);
    return container;
  }

  getStatusText(construct) {
    if (construct.efficiency === 1.0) {
      return { text: '✅ Producing', color: '#00ff00' };
    } else if (construct.efficiency >= 0.75) {
      return { text: '⚠️ Reduced Efficiency', color: '#ffaa00' };
    } else {
      return { text: '❌ Needs Repair', color: '#ff0000' };
    }
  }
}
```

### 6. Construct Upgrade Interface

**When Used:**
- Phase: Construct Outfitting phase only
- Access: From Construct Management Panel → "Upgrade" button
- Prerequisites: Must own a construct and have sufficient resources
- Time Cost: Consumes significant outfitting phase time

**Purpose:**
- Power Scaling: Allow players to improve existing constructs
- Resource Sink: Provide meaningful use for accumulated resources
- Risk/Reward: Higher level upgrades have higher failure chances
- Strategic Choice: Upgrade vs. buying new constructs

### 7. Production Monitor

**When Used:**
- Phase: Resource Production phase (automatically displayed)
- Also Available: Any time as information panel
- Duration: Shows throughout production phase while resources generate
- Purpose: Real-time feedback on economic engine performance

**Purpose:**
- Production Tracking: Show exactly how much each construct produces
- Problem Identification: Highlight underperforming constructs
- Economic Planning: Help plan for upcoming auction phase
- Performance Validation: Confirm upgrade/investment decisions were correct

```javascript
class ProductionMonitor extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    this.scene = scene;
    this.productionBars = new Map();
    this.createMonitor();
  }

  createMonitor() {
    // Background
    const bg = this.scene.add.rectangle(0, 0, 400, 300, 0x1a1a3a);
    bg.setStrokeStyle(2, 0x5555ff);
    this.add(bg);
    
    // Title
    const title = this.scene.add.text(0, -130, '📊 Production Monitoring', {
      fontSize: '18px',
      color: '#ffffff'
    });
    title.setOrigin(0.5);
    this.add(title);
    
    // Cycle indicator
    this.cycleText = this.scene.add.text(0, -100, '', {
      fontSize: '14px',
      color: '#aaaaaa'
    });
    this.cycleText.setOrigin(0.5);
    this.add(this.cycleText);
    
    // Resource production bars
    this.createProductionBars();
    
    // Alerts section
    this.alertsContainer = this.scene.add.container(0, 80);
    this.add(this.alertsContainer);
  }

  createProductionBars() {
    const resources = ['mana', 'vitality', 'arcanum', 'aether'];
    const colors = [0x0088ff, 0x00ff88, 0xff8800, 0xff00ff];
    
    resources.forEach((resource, index) => {
      const yPos = -40 + (index * 30);
      
      // Resource icon and label
      const label = this.scene.add.text(-150, yPos, resource.toUpperCase(), {
        fontSize: '12px',
        color: '#ffffff'
      });
      
      // Production bar background
      const barBg = this.scene.add.rectangle(20, yPos, 200, 20, 0x333333);
      barBg.setOrigin(0, 0.5);
      
      // Production bar fill
      const barFill = this.scene.add.rectangle(20, yPos, 0, 18, colors[index]);
      barFill.setOrigin(0, 0.5);
      
      // Production text
      const prodText = this.scene.add.text(230, yPos, '0/cycle', {
        fontSize: '12px',
        color: '#ffffff'
      });
      prodText.setOrigin(0, 0.5);
      
      this.productionBars.set(resource, {
        barBg, barFill, prodText, maxWidth: 200
      });
      
      this.add([label, barBg, barFill, prodText]);
    });
  }

  updateProduction(productionData) {
    // Update cycle text
    this.cycleText.setText(`Cycle ${productionData.currentCycle} of ${productionData.totalCycles}`);
    
    // Update production bars
    Object.entries(productionData.production).forEach(([resource, amount]) => {
      const bar = this.productionBars.get(resource);
      if (bar) {
        const maxProduction = productionData.maxProduction[resource] || 100;
        const fillWidth = (amount / maxProduction) * bar.maxWidth;
        
        // Animate bar fill
        this.scene.tweens.add({
          targets: bar.barFill,
          width: fillWidth,
          duration: 500,
          ease: 'Power2'
        });
        
        bar.prodText.setText(`${amount}/cycle`);
      }
    });
    
    // Update alerts
    this.updateAlerts(productionData.alerts);
  }

  updateAlerts(alerts) {
    this.alertsContainer.removeAll(true);
    
    if (alerts.length === 0) return;
    
    const alertTitle = this.scene.add.text(0, 0, '⚠️ Alerts:', {
      fontSize: '14px',
      color: '#ffaa00'
    });
    alertTitle.setOrigin(0.5);
    this.alertsContainer.add(alertTitle);
    
    alerts.forEach((alert, index) => {
      const alertText = this.scene.add.text(0, 20 + (index * 15), alert, {
        fontSize: '12px',
        color: '#ffaaaa'
      });
      alertText.setOrigin(0.5);
      this.alertsContainer.add(alertText);
    });
  }
}
```

## Implementation Steps

### Step 1: Core Construct System (2-3 hours)
1. Implement Construct class with all properties
2. Create ConstructManager for lifecycle management
3. Implement CONSTRUCT_TYPES configuration
4. Build production calculation system

### Step 2: Shop Interface (2-3 hours)
1. Create ConstructShopPanel UI component
2. Implement purchase validation logic
3. Add resource cost checking
4. Create purchase confirmation flow

### Step 3: Placement System (3-4 hours)
1. Build territory highlighting system
2. Implement success rate calculations
3. Create placement confirmation modal
4. Add territory validation checks

### Step 4: Installation Process (3-4 hours)
1. Create installation animation system
2. Implement progress tracking
3. Build dice roll mechanics
4. Create result display system

### Step 5: Management Interface (2-3 hours)
1. Build construct listing panel
2. Add status indicators
3. Implement action buttons
4. Create efficiency warnings

### Step 6: Production Monitor (2-3 hours)
1. Create real-time production display
2. Implement resource counters
3. Add alert system
4. Build cycle tracking

### Step 7: Integration and Testing (2-3 hours)
1. Connect to turn management system
2. Integrate with resource system
3. Link to territory system
4. Test all user flows

## Key Integration Points

### With Turn Manager
```javascript
// During construct outfitting phase
turnManager.on('construct-outfitting-start', (player) => {
  ui.showConstructShop();
  ui.enableConstructPlacement();
});

turnManager.on('construct-outfitting-end', (player) => {
  ui.hideConstructShop();
  ui.disableConstructPlacement();
});
```

### With Resource System
```javascript
// Production calculation during resource phase
resourceManager.on('production-phase', () => {
  const production = constructManager.calculateAllProduction();
  resourceManager.addResources(production);
  ui.productionMonitor.updateProduction(production);
});
```

### With Territory System
```javascript
// Territory enhancement checks
territoryManager.on('improvement-built', (territory, improvement) => {
  if (territory.construct) {
    constructManager.recalculateEfficiency(territory.construct);
  }
});
```

## Interface Flow Throughout Game Phases

### Territory Selection Phase
- No construct interfaces active
- Players focus on claiming territories for future construct placement

### Construct Outfitting Phase
- Shop Interface: Player considers purchases
- Placement Interface: Player selects territory locations
- Installation Modal: Construct binding happens
- Result Display: Success/failure revealed
- Management Panel: Available for status checking
- Upgrade Interface: Available for improving existing constructs

### Resource Production Phase
- Production Monitor: Primary interface showing resource generation
- Management Panel: Available for status checking (read-only)

### Auction Phase
- Management Panel: Available for planning based on current resources
- Production Monitor: Available to review what was just produced

### End Cycle Events
- No construct interfaces - focus on event resolution

## Interface Integration with Game Pressure

### Time Pressure Integration
- Installation rituals consume precious turn time
- Upgrade processes eat into outfitting phase duration
- Shopping decisions must be made quickly
- Interface shows countdown timers to create urgency

### Economic Pressure Integration
- Resource costs display alongside current wealth
- Upgrade costs compete with new construct purchases
- Production monitoring shows return on investment
- Efficiency warnings indicate money being lost

### Strategic Pressure Integration
- Placement risks force calculated gambling
- Upgrade timing affects game-end scoring
- Construct portfolio optimization becomes crucial
- Territory synergy affects all construct decisions

## Testing Plan

### Unit Tests
- Construct creation and properties
- Cost calculations
- Production formulas
- Installation success rates

### Integration Tests
- Purchase flow completion
- Placement on valid territories
- Installation animations
- Production during cycles

### User Flow Tests
- Complete construct lifecycle
- Multiple constructs per player
- Upgrade processes
- Failure recovery

This detailed plan provides a complete blueprint for implementing the Construct System, with all seven interfaces fully integrated into the game flow. The system maintains the strategic depth of M.U.L.E.'s original design while adding fantasy elements and modern UI conveniences.