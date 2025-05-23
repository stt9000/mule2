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
            // Show player setup screen
            this.showPlayerSetup();
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
    
    showPlayerSetup() {
        const { width, height } = this.cameras.main;
        
        // Clear the scene
        this.children.removeAll();
        
        // Title
        const title = this.add.text(width / 2, 50, 'Player Setup', {
            fontFamily: 'Georgia, serif',
            fontSize: '48px',
            color: '#FFD700',
            stroke: '#000',
            strokeThickness: 3
        });
        title.setOrigin(0.5);
        
        // Instructions
        const instructions = this.add.text(width / 2, 120, 'Player 1 is always Human. Choose types for other players:', {
            fontFamily: 'Georgia, serif',
            fontSize: '20px',
            color: '#FFFFFF'
        });
        instructions.setOrigin(0.5);
        
        // Player configurations
        const players = [
            { id: 'player1', name: 'Player 1', color: 0xFF0000, isAI: false },
            { id: 'player2', name: 'Player 2', color: 0x0000FF, isAI: true },
            { id: 'player3', name: 'Player 3', color: 0x00FF00, isAI: true },
            { id: 'player4', name: 'Player 4', color: 0xFFFF00, isAI: true }
        ];
        
        // Create player type selectors
        const startY = 200;
        const spacing = 80;
        
        players.forEach((player, index) => {
            const y = startY + (index * spacing);
            
            // Player label
            const label = this.add.text(width / 2 - 200, y, player.name, {
                fontFamily: 'Georgia, serif',
                fontSize: '28px',
                color: '#FFFFFF'
            });
            label.setOrigin(0, 0.5);
            
            // Color indicator
            const colorIndicator = this.add.rectangle(width / 2 - 50, y, 30, 30, player.color);
            
            if (index === 0) {
                // Player 1 is always human
                const humanText = this.add.text(width / 2 + 50, y, 'HUMAN', {
                    fontFamily: 'Georgia, serif',
                    fontSize: '24px',
                    color: '#00FF00'
                });
                humanText.setOrigin(0, 0.5);
            } else {
                // Type toggle button for other players
                const typeButton = this.add.text(width / 2 + 50, y, player.isAI ? 'AI' : 'HUMAN', {
                    fontFamily: 'Georgia, serif',
                    fontSize: '24px',
                    color: player.isAI ? '#FF8800' : '#00FF00',
                    backgroundColor: '#333333',
                    padding: { x: 20, y: 10 }
                });
                typeButton.setOrigin(0, 0.5);
                typeButton.setInteractive({ useHandCursor: true });
                
                // Store player reference on button
                typeButton.playerData = player;
                
                typeButton.on('pointerdown', () => {
                    // Toggle player type
                    player.isAI = !player.isAI;
                    typeButton.setText(player.isAI ? 'AI' : 'HUMAN');
                    typeButton.setStyle({ 
                        color: player.isAI ? '#FF8800' : '#00FF00' 
                    });
                });
                
                typeButton.on('pointerover', () => {
                    typeButton.setStyle({ backgroundColor: '#555555' });
                });
                
                typeButton.on('pointerout', () => {
                    typeButton.setStyle({ backgroundColor: '#333333' });
                });
            }
        });
        
        // Start game button
        const startButton = this.add.text(width / 2, height - 100, 'Start Game', {
            fontFamily: 'Georgia, serif',
            fontSize: '36px',
            color: '#FFFFFF',
            backgroundColor: '#004400',
            padding: { x: 40, y: 20 }
        });
        startButton.setOrigin(0.5);
        startButton.setInteractive({ useHandCursor: true });
        
        startButton.on('pointerover', () => {
            startButton.setStyle({ backgroundColor: '#006600' });
        });
        
        startButton.on('pointerout', () => {
            startButton.setStyle({ backgroundColor: '#004400' });
        });
        
        startButton.on('pointerdown', () => {
            // Store player configuration
            window.gamePlayerConfig = players;
            
            // Start the game
            this.scene.start('GameScene');
        });
        
        // Back button
        const backButton = this.add.text(50, height - 50, '< Back', {
            fontFamily: 'Georgia, serif',
            fontSize: '24px',
            color: '#CCCCCC'
        });
        backButton.setInteractive({ useHandCursor: true });
        
        backButton.on('pointerover', () => {
            backButton.setStyle({ color: '#FFFFFF' });
        });
        
        backButton.on('pointerout', () => {
            backButton.setStyle({ color: '#CCCCCC' });
        });
        
        backButton.on('pointerdown', () => {
            // Go back to main menu
            this.scene.restart();
        });
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