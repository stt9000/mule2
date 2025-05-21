import Phaser from 'phaser';
import BootScene from '../scenes/BootScene';
import MainMenuScene from '../scenes/MainMenuScene';
import GameScene from '../scenes/GameScene';

/**
 * Magical Frontiers: M.U.L.E. Reimagined in Fantasy
 * A fantasy economic strategy game based on the classic M.U.L.E.
 * 
 * This is the main entry point for the game.
 */

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
    },
    render: {
        pixelArt: false,
        antialias: true
    }
};

// Create the game instance
const game = new Phaser.Game(config);

// Add a global reference to the game instance
window.game = game;

// Handle game resize events
window.addEventListener('resize', () => {
    game.scale.refresh();
});

// Add a loader for debugging
console.log('Magical Frontiers: Game initialized');