import Phaser from 'phaser';

export default class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        const { width, height } = this.cameras.main;
        
        // Add background elements
        this.createBackground();
        
        // Add logo
        const logo = this.add.image(width / 2, height / 4 - 30, 'logo');
        
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
        
        // Add menu container
        const menuContainer = this.add.container(width / 2, height / 2 + 50);
        
        // Create buttons
        this.createMenuButtons(menuContainer);
        
        // Credits
        const creditText = this.add.text(width / 2, height - 50, 'Based on M.U.L.E. by Ozark Softscape', {
            fontFamily: 'Georgia, serif',
            fontSize: '16px',
            color: '#CCCCCC'
        });
        creditText.setOrigin(0.5);
        
        // Version number
        const versionText = this.add.text(width - 20, height - 20, 'v0.1.0', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#888888'
        });
        versionText.setOrigin(1);
        
        // Add magical particle effects
        this.addMagicalParticles();
        
        // Add subtle animation to logo
        this.tweens.add({
            targets: logo,
            y: logo.y + 10,
            duration: 2000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
    }
    
    createBackground() {
        const { width, height } = this.cameras.main;
        
        // Add background gradient
        const background = this.add.graphics();
        background.fillGradientStyle(
            0x1a1a2d, 0x1a1a2d, 0x0f0f1a, 0x0f0f1a, 1
        );
        background.fillRect(0, 0, width, height);
        
        // Add some decorative elements
        const stars = this.add.graphics();
        stars.fillStyle(0xFFFFFF, 0.3);
        
        // Generate random stars
        for (let i = 0; i < 100; i++) {
            const size = Math.random() * 2 + 1;
            const x = Math.random() * width;
            const y = Math.random() * height;
            stars.fillCircle(x, y, size);
        }
    }
    
    createMenuButtons(container) {
        const buttonStyle = {
            fontFamily: 'Georgia, serif',
            fontSize: '32px',
            color: '#FFFFFF',
            stroke: '#000',
            strokeThickness: 1
        };
        
        const buttons = [
            { text: 'Start Game', scene: 'GameScene' },
            { text: 'Options', action: () => this.showOptions() },
            { text: 'Credits', action: () => this.showCredits() }
        ];
        
        buttons.forEach((buttonConfig, i) => {
            // Create button background
            const buttonBg = this.add.image(0, i * 80, 'button');
            buttonBg.setInteractive({ useHandCursor: true });
            
            // Create button text
            const buttonText = this.add.text(0, i * 80, buttonConfig.text, buttonStyle);
            buttonText.setOrigin(0.5);
            
            // Add to container
            container.add([buttonBg, buttonText]);
            
            // Button effects
            buttonBg.on('pointerover', () => {
                buttonBg.setTint(0xffcc00);
                buttonText.setColor('#FFD700');
            });
            
            buttonBg.on('pointerout', () => {
                buttonBg.clearTint();
                buttonText.setColor('#FFFFFF');
            });
            
            buttonBg.on('pointerdown', () => {
                // Add click effect
                this.tweens.add({
                    targets: [buttonBg, buttonText],
                    scaleX: 0.95,
                    scaleY: 0.95,
                    duration: 100,
                    yoyo: true,
                    onComplete: () => {
                        if (buttonConfig.scene) {
                            this.scene.start(buttonConfig.scene);
                        } else if (buttonConfig.action) {
                            buttonConfig.action();
                        }
                    }
                });
            });
        });
    }
    
    showOptions() {
        console.log('Options menu - to be implemented');
        // Will implement options menu in future phase
    }
    
    showCredits() {
        console.log('Credits - to be implemented');
        // Will implement credits screen in future phase
    }
    
    addMagicalParticles() {
        // Create magical particles using Phaser's particle system
        const colors = [0x8080ff, 0x80ff80, 0xff8080, 0xffff80]; // Match resource colors
        
        for (const color of colors) {
            this.add.particles(0, 0, 'white', {
                x: { min: 0, max: this.cameras.main.width },
                y: { min: 0, max: this.cameras.main.height },
                scale: { start: 0.5, end: 0 },
                alpha: { start: 0.5, end: 0 },
                speed: { min: 10, max: 30 },
                angle: { min: 0, max: 360 },
                lifespan: { min: 2000, max: 4000 },
                quantity: 1,
                frequency: 500,
                tint: color,
                blendMode: 'ADD'
            });
        }
    }
}