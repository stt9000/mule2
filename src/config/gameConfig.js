// Game configuration constants

export const RESOURCE_TYPES = {
    MANA: 'mana',
    VITALITY: 'vitality',
    ARCANUM: 'arcanum',
    AETHER: 'aether'
};

export const TERRITORY_TYPES = {
    ANCIENT_GROVE: 'ancient_grove',
    CRYSTALLINE_CAVE: 'crystalline_cave',
    RUINED_TEMPLE: 'ruined_temple',
    MOUNTAIN_PEAK: 'mountain_peak',
    MARSHLAND: 'marshland',
    VOLCANIC_FIELD: 'volcanic_field'
};

export const CONSTRUCT_TYPES = {
    MANA_CONDUIT: 'mana_conduit',
    VITALITY_WELL: 'vitality_well',
    ARCANUM_EXTRACTOR: 'arcanum_extractor',
    AETHER_RESONATOR: 'aether_resonator'
};

export const TERRITORY_COLORS = {
    [TERRITORY_TYPES.ANCIENT_GROVE]: 0x228822, // Green
    [TERRITORY_TYPES.CRYSTALLINE_CAVE]: 0x4444FF, // Blue
    [TERRITORY_TYPES.RUINED_TEMPLE]: 0xCCCCAA, // Tan
    [TERRITORY_TYPES.MOUNTAIN_PEAK]: 0x888888, // Gray
    [TERRITORY_TYPES.MARSHLAND]: 0x557733, // Olive
    [TERRITORY_TYPES.VOLCANIC_FIELD]: 0xAA4422 // Reddish brown
};

export const RESOURCE_COLORS = {
    [RESOURCE_TYPES.MANA]: '#8080FF', // Blue/purple
    [RESOURCE_TYPES.VITALITY]: '#80FF80', // Green
    [RESOURCE_TYPES.ARCANUM]: '#FF8080', // Red
    [RESOURCE_TYPES.AETHER]: '#FFFF80' // Yellow
};

export const TERRITORY_MODIFIERS = {
    [TERRITORY_TYPES.ANCIENT_GROVE]: {
        [RESOURCE_TYPES.VITALITY]: 0.25, // +25%
        [RESOURCE_TYPES.ARCANUM]: -0.10 // -10%
    },
    [TERRITORY_TYPES.CRYSTALLINE_CAVE]: {
        [RESOURCE_TYPES.MANA]: 0.30, // +30%
        [RESOURCE_TYPES.VITALITY]: -0.05 // -5%
    },
    [TERRITORY_TYPES.RUINED_TEMPLE]: {
        [RESOURCE_TYPES.ARCANUM]: 0.20, // +20%
        [RESOURCE_TYPES.MANA]: 0.10 // +10%
    },
    [TERRITORY_TYPES.MOUNTAIN_PEAK]: {
        [RESOURCE_TYPES.MANA]: 0.15, // +15%
        [RESOURCE_TYPES.VITALITY]: 0.15, // +15%
        [RESOURCE_TYPES.ARCANUM]: 0.15, // +15%
        [RESOURCE_TYPES.AETHER]: 0.15 // +15%
    },
    [TERRITORY_TYPES.MARSHLAND]: {
        [RESOURCE_TYPES.VITALITY]: 0.35, // +35%
        [RESOURCE_TYPES.MANA]: -0.15 // -15%
    },
    [TERRITORY_TYPES.VOLCANIC_FIELD]: {
        [RESOURCE_TYPES.ARCANUM]: 0.25, // +25%
        [RESOURCE_TYPES.AETHER]: 0.10 // +10%
    }
};

export const BASE_PRICES = {
    [RESOURCE_TYPES.MANA]: 20,
    [RESOURCE_TYPES.VITALITY]: 25,
    [RESOURCE_TYPES.ARCANUM]: 35,
    [RESOURCE_TYPES.AETHER]: 100
};

export const PRODUCTION_RATES = {
    [RESOURCE_TYPES.MANA]: { min: 10, max: 25 },
    [RESOURCE_TYPES.VITALITY]: { min: 8, max: 20 },
    [RESOURCE_TYPES.ARCANUM]: { min: 5, max: 15 },
    [RESOURCE_TYPES.AETHER]: { min: 3, max: 30 }
};

export const DECAY_RATES = {
    [RESOURCE_TYPES.MANA]: 0.20, // 20% per cycle
    [RESOURCE_TYPES.VITALITY]: 0.50, // 50% per cycle
    [RESOURCE_TYPES.ARCANUM]: 0, // No decay
    [RESOURCE_TYPES.AETHER]: 0.10 // 10% chance of discharge per cycle
};

export const PLAYER_COLORS = [
    0xFF0000, // Red
    0x0000FF, // Blue
    0x00FF00, // Green
    0xFFFF00  // Yellow
];

export const GAME_SETTINGS = {
    TOTAL_CYCLES: 12,
    STARTING_GOLD: 1000,
    MAP_SIZE: { width: 8, height: 6 },
    HEX_SIZE: 100
};