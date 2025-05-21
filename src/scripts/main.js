import Phaser from 'phaser';
import BootScene from '../scenes/BootScene';
import MainMenuScene from '../scenes/MainMenuScene';
import GameScene from '../scenes/GameScene';

// Game configuration
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 1280,
    height: 720,
    backgroundColor: '#1a1a2d',
    scene: [BootScene, MainMenuScene, GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
};

// Create the game instance
window.game = new Phaser.Game(config);

// Global game state
window.gameState = {
    // Constants
    RESOURCE_TYPES: {
        MANA: 'mana',
        VITALITY: 'vitality',
        ARCANUM: 'arcanum',
        AETHER: 'aether'
    },
    TERRITORY_TYPES: {
        ANCIENT_GROVE: 'ancient_grove',
        CRYSTALLINE_CAVE: 'crystalline_cave',
        RUINED_TEMPLE: 'ruined_temple',
        MOUNTAIN_PEAK: 'mountain_peak',
        MARSHLAND: 'marshland',
        VOLCANIC_FIELD: 'volcanic_field'
    },
    CONSTRUCT_TYPES: {
        MANA_CONDUIT: 'mana_conduit',
        VITALITY_WELL: 'vitality_well',
        ARCANUM_EXTRACTOR: 'arcanum_extractor',
        AETHER_RESONATOR: 'aether_resonator'
    },
    // Player data
    players: [],
    currentPlayerIndex: 0,
    // Game cycle data
    currentCycle: 1,
    totalCycles: 12,
    // Economy data
    marketPrices: {},
    // Map data
    territories: [],
    // Initialize base prices for resources
    basePrice: {
        mana: 20,
        vitality: 25, 
        arcanum: 35,
        aether: 100
    },
    // Initialize game state
    init: function() {
        // Set initial market prices
        this.marketPrices = {
            mana: this.basePrice.mana,
            vitality: this.basePrice.vitality,
            arcanum: this.basePrice.arcanum,
            aether: this.basePrice.aether
        };
    }
};

// Initialize game state
window.gameState.init();