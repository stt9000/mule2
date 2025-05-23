/**
 * ConstructShopPanel
 * UI panel for purchasing constructs from the Artificers' Guild
 */
import { CONSTRUCT_DEFINITIONS } from '../../config/gameConfig.js';

export default class ConstructShopPanel extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);
        this.scene = scene;
        this.constructButtons = [];
        this.isVisible = false;
        this.selectedConstruct = null;
        
        // Add to scene
        this.scene.add.existing(this);
        this.setDepth(1000); // Ensure it appears above game elements
        
        this.createShopInterface();
        this.hide(); // Start hidden
    }

    createShopInterface() {
        // Background panel
        const panelWidth = 450;
        const panelHeight = 650;
        
        const bg = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x2a2a4a, 0.95);
        bg.setStrokeStyle(3, 0x6666ff);
        this.add(bg);
        
        // Title
        const title = this.scene.add.text(0, -panelHeight/2 + 30, '⚒️ Artificers\' Guild - Construct Shop', {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        title.setOrigin(0.5);
        this.add(title);
        
        // Subtitle
        const subtitle = this.scene.add.text(0, -panelHeight/2 + 60, 'Purchase magical constructs for your territories', {
            fontSize: '14px',
            color: '#aaaaaa',
            fontFamily: 'Arial'
        });
        subtitle.setOrigin(0.5);
        this.add(subtitle);
        
        // Create construct listings
        let yOffset = -panelHeight/2 + 100;
        Object.entries(CONSTRUCT_DEFINITIONS).forEach(([type, data], index) => {
            const listing = this.createConstructListing(type, data, yOffset);
            this.add(listing);
            yOffset += 130;
        });
        
        // Resource display
        this.resourceDisplay = this.createResourceDisplay(-panelHeight/2 + 580);
        this.add(this.resourceDisplay);
        
        // Close button
        const closeBtn = this.createCloseButton(panelWidth/2 - 30, -panelHeight/2 + 30);
        this.add(closeBtn);
    }

    createConstructListing(type, data, yOffset) {
        const container = this.scene.add.container(0, yOffset);
        const listingWidth = 400;
        const listingHeight = 110;
        
        // Listing background
        const listingBg = this.scene.add.rectangle(0, 0, listingWidth, listingHeight, 0x1a1a3a, 0.8);
        listingBg.setStrokeStyle(1, 0x4444aa);
        container.add(listingBg);
        
        // Icon
        const icon = this.scene.add.text(-listingWidth/2 + 30, -20, data.icon, { 
            fontSize: '36px',
            fontFamily: 'Arial'
        });
        icon.setOrigin(0.5);
        container.add(icon);
        
        // Name and description
        const name = this.scene.add.text(-listingWidth/2 + 70, -25, data.name, { 
            fontSize: '18px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        name.setOrigin(0, 0.5);
        container.add(name);
        
        const desc = this.scene.add.text(-listingWidth/2 + 70, -5, data.description, { 
            fontSize: '12px',
            color: '#aaaaaa',
            fontFamily: 'Arial'
        });
        desc.setOrigin(0, 0.5);
        container.add(desc);
        
        // Cost display
        const costText = this.formatCost(data.baseCost);
        const cost = this.scene.add.text(-listingWidth/2 + 70, 15, `Cost: ${costText}`, { 
            fontSize: '14px',
            color: '#ffcc00',
            fontFamily: 'Arial'
        });
        cost.setOrigin(0, 0.5);
        container.add(cost);
        
        // Production info
        const prodText = `Production: ${data.baseProduction.min}-${data.baseProduction.max} ${data.resourceType}/cycle`;
        const production = this.scene.add.text(-listingWidth/2 + 70, 35, prodText, { 
            fontSize: '12px',
            color: '#88cc88',
            fontFamily: 'Arial'
        });
        production.setOrigin(0, 0.5);
        container.add(production);
        
        // Best terrain info
        const terrainText = `Best on: ${data.bestTerrain.join(', ')}`;
        const terrain = this.scene.add.text(-listingWidth/2 + 70, 50, terrainText, { 
            fontSize: '11px',
            color: '#8888cc',
            fontFamily: 'Arial'
        });
        terrain.setOrigin(0, 0.5);
        container.add(terrain);
        
        // Purchase button
        const purchaseBtn = this.createButton('Purchase', listingWidth/2 - 70, 0, () => {
            this.onPurchaseClick(type);
        });
        container.add(purchaseBtn);
        
        // Store button reference
        this.constructButtons.push({
            type: type,
            button: purchaseBtn,
            container: container
        });
        
        // Make listing interactive
        listingBg.setInteractive();
        listingBg.on('pointerover', () => {
            listingBg.setStrokeStyle(2, 0x8888ff);
        });
        listingBg.on('pointerout', () => {
            listingBg.setStrokeStyle(1, 0x4444aa);
        });
        
        return container;
    }

    createButton(text, x, y, callback) {
        const button = this.scene.add.container(x, y);
        
        const bg = this.scene.add.rectangle(0, 0, 100, 35, 0x4466aa);
        bg.setStrokeStyle(2, 0x6688cc);
        bg.setInteractive();
        
        const label = this.scene.add.text(0, 0, text, {
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        label.setOrigin(0.5);
        
        button.add([bg, label]);
        
        // Button interactions
        bg.on('pointerover', () => {
            bg.setFillStyle(0x5577bb);
            this.scene.input.setDefaultCursor('pointer');
        });
        
        bg.on('pointerout', () => {
            bg.setFillStyle(0x4466aa);
            this.scene.input.setDefaultCursor('default');
        });
        
        bg.on('pointerdown', () => {
            bg.setScale(0.95);
        });
        
        bg.on('pointerup', () => {
            bg.setScale(1);
            if (callback) callback();
        });
        
        return button;
    }

    createCloseButton(x, y) {
        const button = this.scene.add.container(x, y);
        
        const bg = this.scene.add.circle(0, 0, 15, 0xaa4444);
        bg.setStrokeStyle(2, 0xcc6666);
        bg.setInteractive();
        
        const label = this.scene.add.text(0, 0, '✕', {
            fontSize: '16px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        label.setOrigin(0.5);
        
        button.add([bg, label]);
        
        bg.on('pointerover', () => {
            bg.setFillStyle(0xcc5555);
            this.scene.input.setDefaultCursor('pointer');
        });
        
        bg.on('pointerout', () => {
            bg.setFillStyle(0xaa4444);
            this.scene.input.setDefaultCursor('default');
        });
        
        bg.on('pointerup', () => {
            this.hide();
        });
        
        return button;
    }

    createResourceDisplay(y) {
        const container = this.scene.add.container(0, y);
        
        // Background
        const bg = this.scene.add.rectangle(0, 0, 400, 40, 0x1a1a2a);
        bg.setStrokeStyle(1, 0x4444aa);
        container.add(bg);
        
        // Resource text
        this.resourceText = this.scene.add.text(0, 0, 'Your Resources: Loading...', {
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        this.resourceText.setOrigin(0.5);
        container.add(this.resourceText);
        
        return container;
    }

    formatCost(costObj) {
        const parts = [];
        for (const [resource, amount] of Object.entries(costObj)) {
            parts.push(`${amount} ${resource}`);
        }
        return parts.join(', ');
    }

    onPurchaseClick(constructType) {
        const player = this.getCurrentPlayer();
        if (!player) {
            console.error('No current player found');
            return;
        }
        
        const constructManager = this.scene.gameFlowController?.constructManager;
        if (!constructManager) {
            console.error('ConstructManager not found');
            return;
        }
        
        const cost = CONSTRUCT_DEFINITIONS[constructType].baseCost;
        
        // Check if player can afford
        if (!player.canAfford(cost)) {
            this.showInsufficientResourcesWarning();
            return;
        }
        
        try {
            // Purchase the construct
            const construct = constructManager.purchaseConstruct(player.id, constructType);
            
            // Update display
            this.updateResourceDisplay();
            
            // Show success message
            this.showPurchaseSuccess(constructType);
            
            // Emit event for other systems
            this.scene.events.emit('construct-purchased', {
                construct: construct,
                player: player
            });
            
        } catch (error) {
            console.error('Failed to purchase construct:', error);
            this.showPurchaseError(error.message);
        }
    }

    getCurrentPlayer() {
        return this.scene.gameFlowController?.turnManager?.currentPlayer ||
               this.scene.gameFlowController?.gameStateManager?.getCurrentPlayer();
    }

    updateResourceDisplay() {
        const player = this.getCurrentPlayer();
        if (!player || !this.resourceText) return;
        
        const resourceParts = [];
        for (const [type, amount] of Object.entries(player.resources)) {
            if (amount > 0) {
                resourceParts.push(`${type}: ${amount}`);
            }
        }
        
        this.resourceText.setText(`Your Resources: ${resourceParts.join(', ')}`);
    }

    showInsufficientResourcesWarning() {
        // Create temporary warning message
        const warning = this.scene.add.text(0, 0, 'Insufficient Resources!', {
            fontSize: '20px',
            color: '#ff4444',
            fontFamily: 'Arial',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 }
        });
        warning.setOrigin(0.5);
        warning.setDepth(1100);
        this.add(warning);
        
        // Fade out and destroy
        this.scene.tweens.add({
            targets: warning,
            alpha: 0,
            y: -50,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                warning.destroy();
            }
        });
    }

    showPurchaseSuccess(constructType) {
        const data = CONSTRUCT_DEFINITIONS[constructType];
        const message = this.scene.add.text(0, 0, `${data.icon} ${data.name} purchased!`, {
            fontSize: '18px',
            color: '#44ff44',
            fontFamily: 'Arial',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 }
        });
        message.setOrigin(0.5);
        message.setDepth(1100);
        this.add(message);
        
        // Fade out and destroy
        this.scene.tweens.add({
            targets: message,
            alpha: 0,
            y: -50,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                message.destroy();
            }
        });
    }

    showPurchaseError(errorMessage) {
        const message = this.scene.add.text(0, 0, `Error: ${errorMessage}`, {
            fontSize: '16px',
            color: '#ff4444',
            fontFamily: 'Arial',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 }
        });
        message.setOrigin(0.5);
        message.setDepth(1100);
        this.add(message);
        
        // Fade out and destroy
        this.scene.tweens.add({
            targets: message,
            alpha: 0,
            y: -50,
            duration: 3000,
            ease: 'Power2',
            onComplete: () => {
                message.destroy();
            }
        });
    }

    show() {
        this.isVisible = true;
        this.setVisible(true);
        this.updateResourceDisplay();
        
        // Fade in animation
        this.setAlpha(0);
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
        
        // Emit event
        this.scene.events.emit('construct-shop-opened');
    }

    hide() {
        this.isVisible = false;
        
        // Fade out animation
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.setVisible(false);
            }
        });
        
        // Reset cursor
        this.scene.input.setDefaultCursor('default');
        
        // Emit event
        this.scene.events.emit('construct-shop-closed');
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
}