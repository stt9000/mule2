import Phaser from 'phaser';
import AssetRegistry from '../utils/AssetRegistry';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
        this.assetRegistry = new AssetRegistry();
    }

    preload() {
        // Create loading bar
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Loading UI
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
        
        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: {
                font: '20px monospace',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);
        
        const percentText = this.make.text({
            x: width / 2,
            y: height / 2,
            text: '0%',
            style: {
                font: '18px monospace',
                fill: '#ffffff'
            }
        });
        percentText.setOrigin(0.5, 0.5);
        
        // Magical background particles
        this.createLoadingParticles();
        
        // Update loading bar as assets are loaded
        this.load.on('progress', (value) => {
            percentText.setText(parseInt(value * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });
        
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
        });
        
        // For development, generate placeholder textures
        this.assetRegistry.generatePlaceholders(this);
        
        // When we have actual assets, we'll load them like this:
        // this.assetRegistry.preloadAll(this);
    }

    createLoadingParticles() {
        // Create a simple particle system for the loading screen
        const particles = this.add.particles(0, 0, 'white', {
            x: { min: 0, max: this.cameras.main.width },
            y: { min: 0, max: this.cameras.main.height },
            scale: { start: 0.5, end: 0 },
            speed: { min: 20, max: 50 },
            angle: { min: 0, max: 360 },
            blendMode: 'ADD',
            lifespan: 2000,
            quantity: 2
        });
        
        // Create a small white pixel for the particles
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRect(0, 0, 2, 2);
        graphics.generateTexture('white', 2, 2);
        
        this.loadingParticles = particles;
    }

    create() {
        // Display logo briefly
        const logo = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'logo');
        
        // Add title text
        const titleText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 80,
            'A Fantasy M.U.L.E. Reimagining',
            {
                fontFamily: 'Georgia, serif',
                fontSize: '24px',
                color: '#ADD8E6',
                align: 'center'
            }
        ).setOrigin(0.5);
        
        // Clean up loading particles after a delay
        this.time.delayedCall(1000, () => {
            if (this.loadingParticles) {
                this.loadingParticles.destroy();
            }
        });
        
        // Fade out and transition to main menu
        this.tweens.add({
            targets: [logo, titleText],
            alpha: 0,
            duration: 2000,
            ease: 'Power2',
            delay: 1500,
            onComplete: () => {
                this.scene.start('MainMenuScene');
            }
        });
    }
}