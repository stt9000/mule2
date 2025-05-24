/**
 * ConstructSelectionPanel
 * Shows available constructs from player's inventory for placement
 */
import { CONSTRUCT_DEFINITIONS } from '../../config/gameConfig.js';

export default class ConstructSelectionPanel extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);
        this.scene = scene;
        this.isVisible = false;
        this.selectedConstruct = null;
        this.inventoryItems = [];
        this.onConstructSelected = null; // Callback function
        
        // Panel dimensions
        this.panelWidth = 500;
        this.panelHeight = 400;
        
        // Add to scene
        this.scene.add.existing(this);
        this.setDepth(1000);
        
        this.createPanel();
        this.hide();
    }
    
    createPanel() {
        // Background
        this.background = this.scene.add.rectangle(0, 0, this.panelWidth, this.panelHeight, 0x2a2a4a, 0.95);
        this.background.setStrokeStyle(3, 0x6666ff);
        this.add(this.background);
        
        // Title
        this.titleText = this.scene.add.text(0, -this.panelHeight/2 + 30, 'Select Construct to Place', {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        this.titleText.setOrigin(0.5);
        this.add(this.titleText);
        
        // Subtitle
        this.subtitleText = this.scene.add.text(0, -this.panelHeight/2 + 55, 'Choose from your inventory', {
            fontSize: '14px',
            color: '#aaaaaa',
            fontFamily: 'Arial'
        });
        this.subtitleText.setOrigin(0.5);
        this.add(this.subtitleText);
        
        // Inventory container
        this.inventoryContainer = this.scene.add.container(0, -20);
        this.add(this.inventoryContainer);
        
        // No constructs message (initially hidden)
        this.emptyMessage = this.scene.add.text(0, 0, 'No constructs in inventory!', {
            fontSize: '18px',
            color: '#ff6666',
            fontFamily: 'Arial'
        });
        this.emptyMessage.setOrigin(0.5);
        this.emptyMessage.setVisible(false);
        this.add(this.emptyMessage);
        
        // Close button
        this.createCloseButton();
        
        // Cancel button
        this.createCancelButton();
    }
    
    createCloseButton() {
        const button = this.scene.add.container(this.panelWidth/2 - 20, -this.panelHeight/2 + 20);
        
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
        this.add(button);
        
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
    }
    
    createCancelButton() {
        const button = this.scene.add.container(0, this.panelHeight/2 - 40);
        
        const bg = this.scene.add.rectangle(0, 0, 120, 35, 0x666666, 0.8);
        bg.setStrokeStyle(2, 0x888888);
        bg.setInteractive();
        
        const label = this.scene.add.text(0, 0, 'Cancel', {
            fontSize: '16px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        label.setOrigin(0.5);
        
        button.add([bg, label]);
        this.add(button);
        
        bg.on('pointerover', () => {
            bg.setFillStyle(0x777777);
            this.scene.input.setDefaultCursor('pointer');
        });
        
        bg.on('pointerout', () => {
            bg.setFillStyle(0x666666);
            this.scene.input.setDefaultCursor('default');
        });
        
        bg.on('pointerup', () => {
            this.hide();
        });
    }
    
    updateInventoryDisplay(player) {
        // Clear existing items
        this.inventoryContainer.removeAll(true);
        this.inventoryItems = [];
        
        // Get constructs from player inventory
        const inventory = player.inventory?.constructs || [];
        
        if (inventory.length === 0) {
            this.emptyMessage.setVisible(true);
            return;
        }
        
        this.emptyMessage.setVisible(false);
        
        // Create item displays
        const startY = -100;
        const itemHeight = 80;
        const spacing = 10;
        
        inventory.forEach((construct, index) => {
            const yPos = startY + (index * (itemHeight + spacing));
            const item = this.createInventoryItem(construct, yPos);
            this.inventoryContainer.add(item);
            this.inventoryItems.push(item);
        });
    }
    
    createInventoryItem(construct, yPos) {
        const container = this.scene.add.container(0, yPos);
        const definition = CONSTRUCT_DEFINITIONS[construct.type];
        
        // Background
        const bg = this.scene.add.rectangle(0, 0, this.panelWidth - 60, itemHeight, 0x3a3a5a, 0.8);
        bg.setStrokeStyle(2, 0x5555aa);
        bg.setInteractive();
        container.add(bg);
        
        // Icon
        const icon = this.scene.add.text(-200, 0, definition.icon || '🏗️', {
            fontSize: '32px'
        });
        icon.setOrigin(0.5);
        container.add(icon);
        
        // Name
        const name = this.scene.add.text(-150, -20, definition.name, {
            fontSize: '18px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        name.setOrigin(0, 0.5);
        container.add(name);
        
        // Description
        const desc = this.scene.add.text(-150, 5, definition.description, {
            fontSize: '12px',
            color: '#aaaaaa',
            fontFamily: 'Arial',
            wordWrap: { width: 250 }
        });
        desc.setOrigin(0, 0.5);
        container.add(desc);
        
        // Resource type indicator
        const resourceIcon = this.getResourceIcon(definition.resourceType);
        const resourceText = this.scene.add.text(130, -10, `Produces: ${resourceIcon}`, {
            fontSize: '14px',
            color: '#88cc88',
            fontFamily: 'Arial'
        });
        resourceText.setOrigin(0.5);
        container.add(resourceText);
        
        // Level/Status
        const statusText = this.scene.add.text(130, 10, `Level ${construct.level}`, {
            fontSize: '12px',
            color: '#aaaaaa',
            fontFamily: 'Arial'
        });
        statusText.setOrigin(0.5);
        container.add(statusText);
        
        // Hover effects
        bg.on('pointerover', () => {
            bg.setFillStyle(0x4a4a6a);
            bg.setStrokeStyle(3, 0x7777ff);
            this.scene.input.setDefaultCursor('pointer');
        });
        
        bg.on('pointerout', () => {
            bg.setFillStyle(0x3a3a5a);
            bg.setStrokeStyle(2, 0x5555aa);
            this.scene.input.setDefaultCursor('default');
        });
        
        // Click to select
        bg.on('pointerup', () => {
            this.selectConstruct(construct);
        });
        
        return container;
    }
    
    getResourceIcon(resourceType) {
        const icons = {
            mana: '💎',
            vitality: '🌿',
            arcanum: '⚗️',
            aether: '✨'
        };
        return icons[resourceType] || '❓';
    }
    
    selectConstruct(construct) {
        this.selectedConstruct = construct;
        
        // Call the callback if provided
        if (this.onConstructSelected) {
            this.onConstructSelected(construct);
        }
        
        // Hide the panel
        this.hide();
        
        // Emit event
        this.scene.events.emit('construct-selected', {
            construct: construct,
            player: this.currentPlayer
        });
    }
    
    show(player, callback = null) {
        if (!player) {
            console.error('No player provided to construct selection panel');
            return;
        }
        
        this.currentPlayer = player;
        this.onConstructSelected = callback;
        this.isVisible = true;
        this.setVisible(true);
        
        // Update inventory display
        this.updateInventoryDisplay(player);
        
        // Fade in animation
        this.setAlpha(0);
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
        
        // Emit event
        this.scene.events.emit('construct-selection-opened');
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
                this.selectedConstruct = null;
                this.onConstructSelected = null;
            }
        });
        
        // Emit event
        this.scene.events.emit('construct-selection-closed');
    }
    
    toggle(player, callback = null) {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show(player, callback);
        }
    }
}