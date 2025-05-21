import Phaser from 'phaser';

export default class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        const { width, height } = this.cameras.main;
        
        // Title
        const title = this.add.text(width / 2, height / 4, 'Magical Frontiers', {
            fontFamily: 'Georgia, "Goudy Bookletter 1911", Times, serif',
            fontSize: '64px',
            color: '#FFD700',
            stroke: '#000',
            strokeThickness: 4,
            shadow: { color: '#000', fill: true, offsetX: 2, offsetY: 2, blur: 4 }
        });
        title.setOrigin(0.5);
        
        // Subtitle
        const subtitle = this.add.text(width / 2, height / 4 + 70, 'M.U.L.E. Reimagined in Fantasy', {
            fontFamily: 'Georgia, serif',
            fontSize: '32px',
            color: '#ADD8E6',
            stroke: '#000',
            strokeThickness: 2,
            shadow: { color: '#000', fill: true, offsetX: 1, offsetY: 1, blur: 2 }
        });
        subtitle.setOrigin(0.5);
        
        // Create start button
        const startButton = this.add.text(width / 2, height / 2 + 50, 'Start Game', {
            fontFamily: 'Georgia, serif',
            fontSize: '32px',
            color: '#FFFFFF',
            stroke: '#000',
            strokeThickness: 1
        });
        startButton.setOrigin(0.5);
        startButton.setPadding(20);
        startButton.setInteractive({ useHandCursor: true });
        
        // Button effects
        startButton.on('pointerover', () => {
            startButton.setStyle({ color: '#FFD700' });
        });
        
        startButton.on('pointerout', () => {
            startButton.setStyle({ color: '#FFFFFF' });
        });
        
        startButton.on('pointerdown', () => {
            // Start the game
            this.scene.start('GameScene');
        });
        
        // Options button
        const optionsButton = this.add.text(width / 2, height / 2 + 130, 'Options', {
            fontFamily: 'Georgia, serif',
            fontSize: '32px',
            color: '#FFFFFF',
            stroke: '#000',
            strokeThickness: 1
        });
        optionsButton.setOrigin(0.5);
        optionsButton.setPadding(20);
        optionsButton.setInteractive({ useHandCursor: true });
        
        optionsButton.on('pointerover', () => {
            optionsButton.setStyle({ color: '#FFD700' });
        });
        
        optionsButton.on('pointerout', () => {
            optionsButton.setStyle({ color: '#FFFFFF' });
        });
        
        // Credits
        const creditText = this.add.text(width / 2, height - 50, 'Based on M.U.L.E. by Ozark Softscape', {
            fontFamily: 'Georgia, serif',
            fontSize: '16px',
            color: '#CCCCCC'
        });
        creditText.setOrigin(0.5);
        
        // Add magical particle effects
        this.addMagicalParticles();
    }
    
    addMagicalParticles() {
        // Create blue/purple mana-like particles
        this.manaParticles = this.add.particles(0, 0, 'logo', {
            scale: { start: 0.1, end: 0 },
            alpha: { start: 0.3, end: 0 },
            tint: 0x8080ff,
            lifespan: 2000,
            speed: { min: 20, max: 50 },
            quantity: 1,
            blendMode: 'ADD',
            emitting: true,
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Rectangle(0, 0, this.cameras.main.width, this.cameras.main.height),
                quantity: 40
            }
        });
    }
}