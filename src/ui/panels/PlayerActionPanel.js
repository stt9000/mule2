/**
 * PlayerActionPanel
 * UI panel for players to set their buy/sell positions in the auction
 */
export default class PlayerActionPanel {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.auctionManager = null;
        this.currentPlayer = null;
        
        // Panel configuration
        this.x = config.x || 50;
        this.y = config.y || 400;
        this.width = config.width || 300;
        this.height = config.height || 200;
        
        // Visual configuration
        this.backgroundColor = config.backgroundColor || 0x1a1a1a;
        this.borderColor = config.borderColor || 0x3498db;
        this.borderWidth = config.borderWidth || 2;
        
        // UI elements
        this.container = null;
        this.background = null;
        this.modeButtons = new Map(); // 'buy' or 'sell' buttons
        this.priceSlider = null;
        this.quantitySlider = null;
        this.confirmButton = null;
        this.cancelButton = null;
        
        // Current selection
        this.currentMode = 'buy';
        this.currentPrice = 50;
        this.currentQuantity = 5;
        
        this.create();
    }
    
    create() {
        // Create container
        this.container = this.scene.add.container(this.x, this.y);
        this.container.setDepth(1100); // Above auction hall
        
        // Initially hide the container
        this.container.setVisible(false);
        this.container.setAlpha(0);
        
        // Create background
        this.background = this.scene.add.graphics();
        this.background.fillStyle(this.backgroundColor, 0.95);
        this.background.fillRoundedRect(0, 0, this.width, this.height, 8);
        this.background.lineStyle(this.borderWidth, this.borderColor);
        this.background.strokeRoundedRect(0, 0, this.width, this.height, 8);
        this.container.add(this.background);
        
        // Create title
        const title = this.scene.add.text(this.width / 2, 15, 'Set Your Position', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        title.setOrigin(0.5, 0);
        this.container.add(title);
        
        // Create mode buttons
        this.createModeButtons();
        
        // Create price slider
        this.createPriceSlider();
        
        // Create quantity slider
        this.createQuantitySlider();
        
        // Create action buttons
        this.createActionButtons();
        
        // Initially hide
        this.hide();
    }
    
    createModeButtons() {
        const buttonY = 45;
        const buttonWidth = 120;
        const buttonHeight = 35;
        const spacing = 10;
        
        // Buy button
        const buyX = this.width / 2 - buttonWidth - spacing / 2;
        const buyButton = this.createButton(buyX, buttonY, buttonWidth, buttonHeight, 'BUY', 0x27ae60);
        buyButton.on('pointerdown', () => this.setMode('buy'));
        this.modeButtons.set('buy', buyButton);
        
        // Sell button
        const sellX = this.width / 2 + spacing / 2;
        const sellButton = this.createButton(sellX, buttonY, buttonWidth, buttonHeight, 'SELL', 0xe74c3c);
        sellButton.on('pointerdown', () => this.setMode('sell'));
        this.modeButtons.set('sell', sellButton);
        
        // Set initial mode
        this.setMode('buy');
    }
    
    createButton(x, y, width, height, text, color) {
        const button = this.scene.add.container(x, y);
        
        // Background
        const bg = this.scene.add.graphics();
        bg.fillStyle(color, 0.8);
        bg.fillRoundedRect(0, 0, width, height, 5);
        button.add(bg);
        
        // Text
        const label = this.scene.add.text(width / 2, height / 2, text, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        label.setOrigin(0.5);
        button.add(label);
        
        // Make interactive
        bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
        
        // Hover effect
        bg.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(color, 1);
            bg.fillRoundedRect(0, 0, width, height, 5);
        });
        
        bg.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(color, 0.8);
            bg.fillRoundedRect(0, 0, width, height, 5);
        });
        
        // Store references
        button.background = bg;
        button.label = label;
        button.normalColor = color;
        
        this.container.add(button);
        return bg;
    }
    
    createPriceSlider() {
        const sliderY = 90;
        
        // Label
        const label = this.scene.add.text(20, sliderY, 'Price: 50 GP', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffffff'
        });
        this.container.add(label);
        
        // Slider track
        const trackX = 20;
        const trackY = sliderY + 20;
        const trackWidth = this.width - 40;
        const trackHeight = 4;
        
        const track = this.scene.add.graphics();
        track.fillStyle(0x555555);
        track.fillRect(trackX, trackY, trackWidth, trackHeight);
        this.container.add(track);
        
        // Slider handle
        const handle = this.scene.add.graphics();
        handle.fillStyle(0x3498db);
        handle.fillCircle(0, 0, 8);
        handle.x = trackX + (trackWidth / 2); // Start at middle (50)
        handle.y = trackY + trackHeight / 2;
        this.container.add(handle);
        
        // Make handle draggable
        handle.setInteractive(new Phaser.Geom.Circle(0, 0, 8), Phaser.Geom.Circle.Contains);
        
        this.scene.input.setDraggable(handle);
        
        handle.on('drag', (pointer, dragX) => {
            // Constrain to track
            const minX = trackX;
            const maxX = trackX + trackWidth;
            handle.x = Phaser.Math.Clamp(dragX, minX, maxX);
            
            // Calculate price (10-100 range)
            const percent = (handle.x - minX) / trackWidth;
            this.currentPrice = Math.round(10 + percent * 90);
            label.setText(`Price: ${this.currentPrice} GP`);
            
            // Update available resources when price changes
            this.updateAvailableResources();
        });
        
        // Store references
        this.priceSlider = {
            label,
            track,
            handle,
            trackX,
            trackWidth
        };
    }
    
    createQuantitySlider() {
        const sliderY = 130;
        
        // Label
        const label = this.scene.add.text(20, sliderY, 'Quantity: 5', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffffff'
        });
        this.container.add(label);
        
        // Resource available label
        const availableLabel = this.scene.add.text(this.width - 20, sliderY, '(Available: 0)', {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#95a5a6'
        });
        availableLabel.setOrigin(1, 0);
        this.container.add(availableLabel);
        
        // Slider track
        const trackX = 20;
        const trackY = sliderY + 20;
        const trackWidth = this.width - 40;
        const trackHeight = 4;
        
        const track = this.scene.add.graphics();
        track.fillStyle(0x555555);
        track.fillRect(trackX, trackY, trackWidth, trackHeight);
        this.container.add(track);
        
        // Slider handle
        const handle = this.scene.add.graphics();
        handle.fillStyle(0x3498db);
        handle.fillCircle(0, 0, 8);
        handle.x = trackX + (trackWidth * 0.25); // Start at 5
        handle.y = trackY + trackHeight / 2;
        this.container.add(handle);
        
        // Make handle draggable
        handle.setInteractive(new Phaser.Geom.Circle(0, 0, 8), Phaser.Geom.Circle.Contains);
        
        this.scene.input.setDraggable(handle);
        
        handle.on('drag', (pointer, dragX) => {
            // Constrain to track
            const minX = trackX;
            const maxX = trackX + trackWidth;
            handle.x = Phaser.Math.Clamp(dragX, minX, maxX);
            
            // Calculate quantity (1-20 range)
            const percent = (handle.x - minX) / trackWidth;
            this.currentQuantity = Math.max(1, Math.round(percent * 20));
            label.setText(`Quantity: ${this.currentQuantity}`);
        });
        
        // Store references
        this.quantitySlider = {
            label,
            availableLabel,
            track,
            handle,
            trackX,
            trackWidth
        };
    }
    
    createActionButtons() {
        const buttonY = this.height - 35;
        const buttonWidth = 100;
        const buttonHeight = 25;
        const spacing = 10;
        
        // Confirm button
        const confirmX = this.width / 2 - buttonWidth - spacing / 2;
        const confirmBg = this.scene.add.graphics();
        confirmBg.fillStyle(0x3498db, 0.8);
        confirmBg.fillRoundedRect(confirmX, buttonY, buttonWidth, buttonHeight, 5);
        this.container.add(confirmBg);
        
        const confirmText = this.scene.add.text(confirmX + buttonWidth / 2, buttonY + buttonHeight / 2, 'CONFIRM', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        confirmText.setOrigin(0.5);
        this.container.add(confirmText);
        
        confirmBg.setInteractive(new Phaser.Geom.Rectangle(confirmX, buttonY, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
        confirmBg.on('pointerdown', () => this.onConfirm());
        
        // Cancel button
        const cancelX = this.width / 2 + spacing / 2;
        const cancelBg = this.scene.add.graphics();
        cancelBg.fillStyle(0xe74c3c, 0.8);
        cancelBg.fillRoundedRect(cancelX, buttonY, buttonWidth, buttonHeight, 5);
        this.container.add(cancelBg);
        
        const cancelText = this.scene.add.text(cancelX + buttonWidth / 2, buttonY + buttonHeight / 2, 'CANCEL', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        cancelText.setOrigin(0.5);
        this.container.add(cancelText);
        
        cancelBg.setInteractive(new Phaser.Geom.Rectangle(cancelX, buttonY, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
        cancelBg.on('pointerdown', () => this.onCancel());
        
        this.confirmButton = { bg: confirmBg, text: confirmText };
        this.cancelButton = { bg: cancelBg, text: cancelText };
    }
    
    setMode(mode) {
        this.currentMode = mode;
        
        // Update button visuals
        this.modeButtons.forEach((button, buttonMode) => {
            const container = button.parent;
            if (buttonMode === mode) {
                container.background.clear();
                container.background.fillStyle(container.normalColor, 1);
                container.background.fillRoundedRect(0, 0, 120, 35, 5);
                container.background.lineStyle(2, 0xffffff);
                container.background.strokeRoundedRect(0, 0, 120, 35, 5);
            } else {
                container.background.clear();
                container.background.fillStyle(container.normalColor, 0.5);
                container.background.fillRoundedRect(0, 0, 120, 35, 5);
            }
        });
        
        // Update available resources display
        this.updateAvailableResources();
    }
    
    setPlayer(player) {
        this.currentPlayer = player;
        
        // Reset to defaults
        this.currentPrice = 50;
        this.currentQuantity = 5;
        this.setMode('buy');
        
        // Update sliders
        if (this.priceSlider) {
            const percent = (this.currentPrice - 10) / 90;
            this.priceSlider.handle.x = this.priceSlider.trackX + (this.priceSlider.trackWidth * percent);
            this.priceSlider.label.setText(`Price: ${this.currentPrice} GP`);
        }
        
        if (this.quantitySlider) {
            const percent = (this.currentQuantity - 1) / 19;
            this.quantitySlider.handle.x = this.quantitySlider.trackX + (this.quantitySlider.trackWidth * percent);
            this.quantitySlider.label.setText(`Quantity: ${this.currentQuantity}`);
        }
        
        // Update available resources
        this.updateAvailableResources();
    }
    
    updateAvailableResources() {
        if (!this.currentPlayer || !this.auctionManager || !this.quantitySlider) return;
        
        const currentResource = this.auctionManager.currentResource;
        if (!currentResource) return;
        
        let available = 0;
        let maxQuantity = 20;
        
        if (this.currentMode === 'sell') {
            // For selling, check player's resources
            available = this.currentPlayer.resources?.[currentResource] || 0;
            maxQuantity = Math.min(20, available);
        } else {
            // For buying, check player's gold
            const playerGold = this.currentPlayer.gold || 0;
            const maxAffordable = Math.floor(playerGold / this.currentPrice);
            available = playerGold;
            maxQuantity = Math.min(20, maxAffordable);
        }
        
        // Update available label
        if (this.currentMode === 'sell') {
            this.quantitySlider.availableLabel.setText(`(Available: ${available} ${currentResource})`);
        } else {
            this.quantitySlider.availableLabel.setText(`(Gold: ${available})`);
        }
        
        // Constrain current quantity to available
        if (this.currentQuantity > maxQuantity) {
            this.currentQuantity = Math.max(1, maxQuantity);
            this.quantitySlider.label.setText(`Quantity: ${this.currentQuantity}`);
            
            // Update slider position
            const percent = (this.currentQuantity - 1) / 19;
            this.quantitySlider.handle.x = this.quantitySlider.trackX + (this.quantitySlider.trackWidth * percent);
        }
    }
    
    onConfirm() {
        if (!this.currentPlayer || !this.auctionManager) {
            console.error('No player or auction manager set');
            return;
        }
        
        // Update player position in auction
        const success = this.auctionManager.updatePlayerPosition(
            this.currentPlayer.id,
            this.currentPrice,
            this.currentMode,
            this.currentQuantity
        );
        
        if (success) {
            console.log(`Player ${this.currentPlayer.id} set ${this.currentMode} position at ${this.currentPrice} for ${this.currentQuantity} units`);
            this.hide();
            
            // Emit event
            this.scene.events.emit('player-position-set', {
                playerId: this.currentPlayer.id,
                mode: this.currentMode,
                price: this.currentPrice,
                quantity: this.currentQuantity
            });
        } else {
            console.error('Failed to set player position');
        }
    }
    
    onCancel() {
        this.hide();
    }
    
    show(player, auctionManager) {
        this.auctionManager = auctionManager;
        this.setPlayer(player);
        this.container.setVisible(true);
        this.container.setAlpha(0);
        
        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: 200,
            ease: 'Power2'
        });
    }
    
    hide() {
        this.scene.tweens.add({
            targets: this.container,
            alpha: 0,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                this.container.setVisible(false);
            }
        });
    }
    
    destroy() {
        this.container.destroy();
    }
}