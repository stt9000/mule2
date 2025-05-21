import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
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
        
        // Load game assets here
        // Placeholder assets for now - we'll add real assets later
        this.load.image('logo', 'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/phaser3-logo.png');
    }

    create() {
        // Display logo briefly
        const logo = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'logo');
        logo.setScale(0.5);
        
        // Fade out and transition to main menu
        this.tweens.add({
            targets: logo,
            alpha: 0,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                this.scene.start('MainMenuScene');
            }
        });
    }
}