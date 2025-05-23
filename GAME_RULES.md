# Magical Frontiers: Complete Game Rules

## Table of Contents
1. [Game Overview](#game-overview)
2. [Game Setup](#game-setup)
3. [Game Flow](#game-flow)
4. [Phases of Play](#phases-of-play)
5. [Resources](#resources)
6. [Territories](#territories)
7. [Constructs](#constructs)
8. [Economic System](#economic-system)
9. [Victory Conditions](#victory-conditions)
10. [Special Rules](#special-rules)

## Game Overview

Magical Frontiers is an economic strategy game where 1-4 wizards compete to develop a magical realm through strategic territory acquisition, resource management, and construct placement. The game balances individual wealth accumulation with collective realm survival.

### Core Concepts
- **Territories**: Magical land plots that produce resources
- **Constructs**: Magical devices that extract resources from territories
- **Resources**: Four types of magical essences that power the economy
- **Market**: Dynamic trading system with fluctuating prices

## Game Setup

### Initial Conditions
- Each player starts with **1000 gold pieces**
- The realm contains **24-36 territories** (6 per player minimum)
- No initial territory ownership
- All territories begin without constructs
- Market prices start at base values

### Player Roles (Optional)
Players may choose a specialization:
- **Elementalist**: +10% mana production, -5% mana costs
- **Vitalist**: +10% vitality production, vitality decays 10% slower
- **Artificer**: +10% arcanum production, -10% construct costs
- **Aethermancer**: +20% aether discovery chance

## Game Flow

The game consists of multiple **cycles** (rounds), each containing several phases:

1. **Territory Selection Phase** - Claim free territories
2. **Territory Auction Phase** - Bid on additional territories
3. **Construct Phase** - Build and upgrade constructs
4. **Resource Production Phase** - Territories produce resources
5. **Market Phase** - Buy and sell resources
6. **Upkeep Phase** - Pay maintenance and resource decay

### Turn Order
- Determined randomly at game start
- Rotates each phase (last becomes first)
- Ties in auctions favor the player with less wealth

### Time Limits
- **Human players**: 2 minutes per action
- **AI players**: Act immediately
- **Auctions**: 60 seconds total
- **Market**: 90 seconds per resource

## Phases of Play

### 1. Territory Selection Phase

**Free Selection Round**:
- Each player selects ONE unclaimed territory
- Selection is **completely FREE** (no gold cost)
- Players act in turn order
- If two players select the same territory simultaneously, the poorer player wins

**Territory Values** are based on:
- Resource production modifiers
- Proximity to owned territories
- Remaining game time

### 2. Territory Auction Phase

After free selection, remaining territories are auctioned:
- **Starting bid**: Territory base value
- **Minimum increment**: 10 gold
- **Auction type**: Ascending bid
- **Winner**: Highest bidder pays immediately

### 3. Construct Phase

Players may build or upgrade constructs on their territories.

**Building New Constructs**:
- Select construct type from Artificers' Guild
- Pay construction cost
- Place on any owned territory without a construct
- **No limit on constructs built per turn** (only limited by resources)

**Upgrading Constructs**:
- Upgrade existing constructs to higher levels
- **Players may upgrade the same territory multiple times per turn**
- Each upgrade level must be purchased sequentially (can't skip levels)
- Pay upgrade cost for each level

**Construct Placement Rules**:
- One construct per territory maximum
- Construct cannot be moved once placed
- Damaged constructs must be repaired before upgrading

### 4. Resource Production Phase

Each territory with a construct produces resources based on:

```
Production = (Base × Terrain Modifier × Construct Level) + Bonuses - Interference
```

**Production Factors**:
- **Base Production**: Determined by construct type
- **Terrain Modifier**: Territory-specific bonus/penalty
- **Construct Level**: 1.0x (Basic), 1.5x (Enhanced), 2.0x (Masterwork)
- **Synergy Bonus**: +10% for each adjacent same-type construct
- **Interference**: -20% from adjacent enemy constructs

### 5. Market Phase

The central market allows resource trading.

**Market Mechanics**:
- Resources traded in order: Mana → Vitality → Arcanum → Aether
- Real-time bidding system
- Players indicate buying (high price) or selling (low price)
- Transactions occur when bid meets ask
- **Guild tax**: 5% on all transactions

**Price Calculation**:
```
Price = Base Price × (1 + [(Demand - Supply) ÷ Equilibrium] × Volatility)
```

### 6. Upkeep Phase

**Resource Decay**:
- Mana: 20% per cycle
- Vitality: 50% per cycle
- Arcanum: 0% (stable)
- Aether: 10% chance of complete discharge

**Storage Limits**:
- Base capacity: 100 units per resource
- Overflow converts to gold at 50% market rate
- Storage can be upgraded with improvements

## Resources

### Mana (Energy Equivalent)
- **Function**: Powers constructs and spells
- **Base Production**: 10-25 units/cycle
- **Base Price**: 20 gold
- **Special**: Required for all magical operations

### Vitality (Food Equivalent)
- **Function**: Sustains wizards, determines action time
- **Base Production**: 8-20 units/cycle
- **Base Price**: 25 gold
- **Special**: Shortage reduces action time

### Arcanum (Building Material)
- **Function**: Required for construct creation
- **Base Production**: 5-15 units/cycle
- **Base Price**: 35 gold
- **Special**: No decay, most stable resource

### Aether (Luxury Resource)
- **Function**: High-level enchantments
- **Base Production**: 3-30 units/cycle (highly variable)
- **Base Price**: 100 gold
- **Special**: Volatile pricing, random events

## Territories

### Territory Types and Modifiers

1. **Ancient Groves**: Vitality +25%, Arcanum -10%
2. **Crystalline Caves**: Mana +30%, Vitality -5%
3. **Ruined Temples**: Arcanum +20%, Mana +10%
4. **Mountain Peaks**: All resources +15% (harder to develop)
5. **Marshlands**: Vitality +35%, Mana -15%
6. **Volcanic Fields**: Arcanum +25%, Aether +10%

### Territory Improvements

Can be built to enhance territories:

| Improvement | Cost | Effect |
|------------|------|--------|
| Wardstones | 100 arcanum, 50 mana | Reduce interference by 50% |
| Harmonic Anchors | 150 arcanum, 100 mana | Enhance synergy bonuses by 50% |
| Purification Circles | 200 arcanum, 150 vitality | Remove negative terrain modifiers |
| Focus Pillars | 300 arcanum, 200 mana, 100 vitality | 10% chance to double production |

## Constructs

### Construct Types and Costs

| Construct Type | Creation Cost | Function |
|---------------|---------------|----------|
| Mana Conduit | 150 arcanum, 50 mana | Produces mana |
| Vitality Well | 150 arcanum, 50 vitality | Produces vitality |
| Arcanum Extractor | 200 arcanum, 75 mana | Produces arcanum |
| Aether Resonator | 300 arcanum, 100 mana, 50 vitality | Produces aether |

### Upgrade Costs and Effects

| Level | Cost Multiplier | Production | Special |
|-------|----------------|------------|---------|
| Basic (1) | 1.0x | 1.0x | Standard production |
| Enhanced (2) | 1.5x original | 1.5x | +50% efficiency |
| Masterwork (3) | 2.5x original | 2.0x | Special abilities |

**Multiple Upgrades Per Turn**: Players may upgrade the same construct multiple times in a single turn if they have sufficient resources.

### Installation Process

1. Purchase construct at Artificers' Guild (gold cost: 200-500)
2. Transport to territory (time based on distance)
3. Perform binding ritual
4. Roll d6 for installation:
   - 1: Critical failure (50% repair cost)
   - 2: Magical backfire (wizard damaged)
   - 3: Unstable (75% efficiency)
   - 4-6: Success

## Economic System

### Market Events

Random events affect the economy:

| Event | Effect |
|-------|--------|
| Magical Convergence | Mana -40% price, others +10% |
| Life Bloom | Vitality production doubles, price -30% |
| Ancient Discovery | Arcanum price -35% |
| Aether Storm | Aether production doubles but unstable |
| Mana Drought | Mana production halved, prices spike |
| Planar Interference | All production -20%, prices +25% |

### Trading Rules

- **Direct Trading**: Players may trade resources directly (10% distance penalty)
- **Market Trading**: Through central auction system (5% tax)
- **Emergency Sharing**: Free transfers to prevent realm collapse

## Victory Conditions

### Scoring

Final score calculated as:
```
Score = Gold + (Territories × 50) + (Constructs × 75) + (Construct Levels × 25) + (Resources × 2)
```

### Game End Triggers

The game ends when:
- Fixed number of cycles complete (typically 12)
- Realm collapse occurs
- All territories are developed
- Players vote to end

### Realm Survival

The realm must maintain minimum resource levels:
- **3 cycles** without sufficient vitality: Magical beings weaken
- **3 cycles** without sufficient mana: Constructs begin failing
- **5 cycles** with both shortages: Realm collapse (50% improvements lost)

## Special Rules

### Cooperative Elements

- **Magical Harmonics**: Patterns of territory control grant bonuses
- **Ley Line Mastery**: Connected territories enhance production
- **Communal Enchantments**: Players pool resources for realm benefits

### Competitive Elements

- **Resource Monopoly**: Control 60% of one resource type for +20% prices
- **Interference Warfare**: Strategic construct placement to hinder opponents
- **Market Manipulation**: Corner markets through strategic buying

### Balance Mechanisms

- **Catch-up Mechanics**: Trailing players receive helpful events
- **Leader Targeting**: Random negative events affect wealthy players more
- **Diminishing Returns**: Each additional territory of same type produces less

### AI Behavior

AI players follow these priorities:
1. Claim high-value territories
2. Build constructs on best territories first
3. Maintain resource balance
4. Upgrade constructs when profitable
5. Trade to prevent shortages

---

## Quick Reference

### Phase Order
1. Territory Selection (free)
2. Territory Auction (gold)
3. Construct Phase (build/upgrade)
4. Production Phase (automatic)
5. Market Phase (trading)
6. Upkeep Phase (decay/storage)

### Key Numbers
- Starting Gold: 1000
- Base Storage: 100 units
- Market Tax: 5%
- Guild Surcharge: 10%
- Action Time: 2 minutes
- Auction Time: 60 seconds

### Important Notes
- Territory claiming is FREE during selection phase
- Multiple construct upgrades allowed per turn
- Resource decay happens every cycle
- Cooperation needed for realm survival
- Individual wealth determines winner