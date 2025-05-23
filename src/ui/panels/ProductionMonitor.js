/**
 * ProductionMonitor
 * Real-time production monitoring panel for resource generation
 */
import { CONSTRUCT_DEFINITIONS, RESOURCE_COLORS } from '../../config/gameConfig.js';

export default class ProductionMonitor extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);
        this.scene = scene;
        this.productionBars = new Map();
        this.alertItems = [];
        this.isVisible = false;
        this.isExpanded = false;
        this.lastProductionData = null;
        
        // Add to scene
        this.scene.add.existing(this);
        this.setDepth(1100); // High depth to ensure visibility
        this.setScrollFactor(0, 0); // Fixed position on screen
        
        this.createMonitor();
        
        // Start hidden but ensure we're properly initialized first
        this.setVisible(false);
        this.setAlpha(1); // Ensure alpha is 1, we'll use visibility to hide
        this.isVisible = false;
    }

    createMonitor() {
        // Get screen dimensions
        const screenWidth = this.scene.cameras.main.width;
        const screenHeight = this.scene.cameras.main.height;
        
        // Compact mode dimensions - horizontal bar across bottom
        this.compactWidth = Math.min(screenWidth - 40, 1200); // Leave some padding
        this.compactHeight = 80; // Shorter height for bottom bar
        
        // Expanded mode dimensions
        this.expandedWidth = Math.min(screenWidth - 40, 1200);
        this.expandedHeight = 300; // Less tall than before
        
        // Create both modes
        this.createCompactMode();
        this.createExpandedMode();
        
        // Start in compact mode
        this.setMode(false);
    }

    createCompactMode() {
        this.compactContainer = this.scene.add.container(0, 0);
        this.add(this.compactContainer);
        
        // Background - ensure it's filled
        const bg = this.scene.add.rectangle(0, 0, this.compactWidth, this.compactHeight, 0x1a1a3a, 0.95);
        bg.setStrokeStyle(3, 0x5555ff);
        bg.setInteractive();
        this.compactContainer.add(bg);
        
        
        // Click to expand
        bg.on('pointerover', () => {
            bg.setStrokeStyle(2, 0x7777ff);
        });
        
        bg.on('pointerout', () => {
            bg.setStrokeStyle(2, 0x5555ff);
        });
        
        bg.on('pointerup', () => {
            this.toggleExpanded();
        });
        
        // Title on the left
        const title = this.scene.add.text(-this.compactWidth/2 + 20, 0, '📊 Production Monitor', {
            fontSize: '16px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        title.setOrigin(0, 0.5);
        this.compactContainer.add(title);
        
        // Cycle indicator next to title
        this.compactCycleText = this.scene.add.text(-this.compactWidth/2 + 200, 0, 'Cycle 0 of 0', {
            fontSize: '14px',
            color: '#aaaaaa',
            fontFamily: 'Arial'
        });
        this.compactCycleText.setOrigin(0, 0.5);
        this.compactContainer.add(this.compactCycleText);
        
        // Compact production bars - horizontal layout
        this.createCompactBars();
        
        // Expand button on the right
        const expandBtn = this.scene.add.text(this.compactWidth/2 - 30, 0, '⬇', {
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#4466aa',
            padding: { x: 5, y: 2 }
        });
        expandBtn.setOrigin(0.5);
        expandBtn.setInteractive();
        this.compactContainer.add(expandBtn);
        
        expandBtn.on('pointerup', () => {
            this.toggleExpanded();
        });
    }

    createCompactBars() {
        const resources = ['mana', 'vitality', 'arcanum', 'aether'];
        const barWidth = 120;
        const barHeight = 20;
        const spacing = 180; // Space between resource sections
        const startX = -200; // Start position after title and cycle text
        
        resources.forEach((resource, index) => {
            const xPos = startX + (index * spacing);
            
            // Resource icon
            const icon = this.getResourceIcon(resource);
            const iconText = this.scene.add.text(xPos - 50, 0, icon, {
                fontSize: '16px'
            });
            iconText.setOrigin(0.5);
            this.compactContainer.add(iconText);
            
            // Resource name
            const label = this.scene.add.text(xPos - 30, 0, resource.charAt(0).toUpperCase() + resource.slice(1), {
                fontSize: '12px',
                color: '#ffffff',
                fontFamily: 'Arial'
            });
            label.setOrigin(0, 0.5);
            this.compactContainer.add(label);
            
            // Bar background
            const barBg = this.scene.add.rectangle(xPos + 30, 0, barWidth, barHeight, 0x333333);
            barBg.setOrigin(0, 0.5);
            this.compactContainer.add(barBg);
            
            // Bar fill
            const color = this.getResourceColor(resource);
            const barFill = this.scene.add.rectangle(xPos + 30, 0, 0, barHeight - 2, color);
            barFill.setOrigin(0, 0.5);
            this.compactContainer.add(barFill);
            
            // Amount text
            const amountText = this.scene.add.text(xPos + barWidth + 35, 0, '0/c', {
                fontSize: '11px',
                color: '#ffffff',
                fontFamily: 'Arial'
            });
            amountText.setOrigin(0, 0.5);
            this.compactContainer.add(amountText);
            
            // Store bar references
            this.productionBars.set(`compact_${resource}`, {
                barBg,
                barFill,
                amountText,
                maxWidth: barWidth
            });
        });
    }

    createExpandedMode() {
        this.expandedContainer = this.scene.add.container(0, 0);
        this.add(this.expandedContainer);
        
        // Background
        const bg = this.scene.add.rectangle(0, 0, this.expandedWidth, this.expandedHeight, 0x1a1a3a, 0.95);
        bg.setStrokeStyle(3, 0x5555ff);
        this.expandedContainer.add(bg);
        
        // Title - adjust position for horizontal layout
        const title = this.scene.add.text(-this.expandedWidth/2 + 30, -this.expandedHeight/2 + 25, '📊 Production Monitor - Detailed View', {
            fontSize: '18px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        title.setOrigin(0, 0.5);
        this.expandedContainer.add(title);
        
        // Cycle indicator - position at top center
        this.expandedCycleText = this.scene.add.text(0, -this.expandedHeight/2 + 25, 'Cycle 0 of 0', {
            fontSize: '16px',
            color: '#aaaaaa',
            fontFamily: 'Arial'
        });
        this.expandedCycleText.setOrigin(0.5);
        this.expandedContainer.add(this.expandedCycleText);
        
        // Production phase indicator - next to cycle text
        this.phaseIndicator = this.scene.add.text(150, -this.expandedHeight/2 + 25, '', {
            fontSize: '14px',
            color: '#88cc88',
            fontFamily: 'Arial'
        });
        this.phaseIndicator.setOrigin(0, 0.5);
        this.expandedContainer.add(this.phaseIndicator);
        
        // Detailed production section
        this.createDetailedProductionBars();
        
        // Territory breakdown section - bottom left
        this.territoryBreakdownContainer = this.scene.add.container(-this.expandedWidth/3, 50);
        this.expandedContainer.add(this.territoryBreakdownContainer);
        
        // Alerts section - bottom right
        this.alertsContainer = this.scene.add.container(this.expandedWidth/3, 50);
        this.expandedContainer.add(this.alertsContainer);
        
        // Collapse button
        const collapseBtn = this.scene.add.text(this.expandedWidth/2 - 30, -this.expandedHeight/2 + 25, '⬆', {
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#4466aa',
            padding: { x: 5, y: 2 }
        });
        collapseBtn.setOrigin(0.5);
        collapseBtn.setInteractive();
        this.expandedContainer.add(collapseBtn);
        
        collapseBtn.on('pointerup', () => {
            this.toggleExpanded();
        });
        
        // Close button
        const closeBtn = this.createCloseButton(this.expandedWidth/2 - 20, -this.expandedHeight/2 + 20);
        this.expandedContainer.add(closeBtn);
    }

    createDetailedProductionBars() {
        const resources = ['mana', 'vitality', 'arcanum', 'aether'];
        const barWidth = 180;
        const barHeight = 25;
        const spacing = 250; // Horizontal spacing
        const startX = -450; // Start position for horizontal layout
        const yPos = -60; // Fixed Y position
        
        // Section title
        const sectionTitle = this.scene.add.text(-this.expandedWidth/2 + 30, yPos - 40, 'Resource Production This Cycle:', {
            fontSize: '16px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        sectionTitle.setOrigin(0, 0.5);
        this.expandedContainer.add(sectionTitle);
        
        resources.forEach((resource, index) => {
            const xPos = startX + (index * spacing);
            
            // Resource icon
            const icon = this.getResourceIcon(resource);
            const iconText = this.scene.add.text(xPos, yPos, icon, {
                fontSize: '24px'
            });
            iconText.setOrigin(0.5);
            this.expandedContainer.add(iconText);
            
            // Resource name
            const label = this.scene.add.text(xPos + 25, yPos, resource.charAt(0).toUpperCase() + resource.slice(1), {
                fontSize: '14px',
                color: '#ffffff',
                fontFamily: 'Arial'
            });
            label.setOrigin(0, 0.5);
            this.expandedContainer.add(label);
            
            // Bar background
            const barBg = this.scene.add.rectangle(xPos, yPos + 30, barWidth, barHeight, 0x333333);
            barBg.setOrigin(0.5);
            this.expandedContainer.add(barBg);
            
            // Bar fill
            const color = this.getResourceColor(resource);
            const barFill = this.scene.add.rectangle(xPos - barWidth/2, yPos + 30, 0, barHeight - 2, color);
            barFill.setOrigin(0, 0.5);
            this.expandedContainer.add(barFill);
            
            // Amount text
            const amountText = this.scene.add.text(xPos, yPos + 55, '0/cycle', {
                fontSize: '14px',
                color: '#ffffff',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            });
            amountText.setOrigin(0.5);
            this.expandedContainer.add(amountText);
            
            // Store bar references
            this.productionBars.set(`expanded_${resource}`, {
                barBg,
                barFill,
                amountText,
                maxWidth: barWidth
            });
        });
    }

    updateProduction(productionData) {
        if (!productionData) return;
        
        this.lastProductionData = productionData;
        
        // Update cycle text
        const cycleText = `Cycle ${productionData.currentCycle || 1} of ${productionData.totalCycles || 12}`;
        if (this.compactCycleText) this.compactCycleText.setText(cycleText);
        if (this.expandedCycleText) this.expandedCycleText.setText(cycleText);
        
        // Update phase indicator
        if (this.phaseIndicator && productionData.phase) {
            this.phaseIndicator.setText(`Phase: ${this.formatPhase(productionData.phase)}`);
        }
        
        // Update production bars
        const production = productionData.production || {};
        const maxProduction = productionData.maxProduction || {};
        
        Object.entries(production).forEach(([resource, amount]) => {
            // Update compact bar
            const compactBar = this.productionBars.get(`compact_${resource}`);
            if (compactBar) {
                const max = maxProduction[resource] || 100;
                const fillWidth = Math.min((amount / max) * compactBar.maxWidth, compactBar.maxWidth);
                
                // Animate bar fill
                this.scene.tweens.add({
                    targets: compactBar.barFill,
                    width: fillWidth,
                    duration: 500,
                    ease: 'Power2'
                });
                
                compactBar.amountText.setText(`${amount}/c`);
            }
            
            // Update expanded bar
            const expandedBar = this.productionBars.get(`expanded_${resource}`);
            if (expandedBar) {
                const max = maxProduction[resource] || 100;
                const fillWidth = Math.min((amount / max) * expandedBar.maxWidth, expandedBar.maxWidth);
                
                // Animate bar fill
                this.scene.tweens.add({
                    targets: expandedBar.barFill,
                    width: fillWidth,
                    duration: 500,
                    ease: 'Power2'
                });
                
                expandedBar.amountText.setText(`${amount}/cycle`);
            }
        });
        
        // Update territory breakdown if in expanded mode
        if (this.isExpanded && productionData.territoryBreakdown) {
            this.updateTerritoryBreakdown(productionData.territoryBreakdown);
        }
        
        // Update alerts
        if (productionData.alerts) {
            this.updateAlerts(productionData.alerts);
        }
        
        // Pulse effect for new production
        this.pulseEffect();
    }

    updateTerritoryBreakdown(breakdown) {
        this.territoryBreakdownContainer.removeAll(true);
        
        if (!breakdown || breakdown.length === 0) return;
        
        // Title
        const title = this.scene.add.text(0, -20, 'Production by Territory:', {
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        title.setOrigin(0.5);
        this.territoryBreakdownContainer.add(title);
        
        // Show top producing territories
        const topTerritories = breakdown.slice(0, 3);
        topTerritories.forEach((territory, index) => {
            const yPos = index * 20;
            const text = this.scene.add.text(-150, yPos, 
                `${territory.type}: ${territory.amount} ${territory.resource}`,
                {
                    fontSize: '12px',
                    color: '#aaaaaa',
                    fontFamily: 'Arial'
                }
            );
            this.territoryBreakdownContainer.add(text);
        });
    }

    updateAlerts(alerts) {
        this.alertsContainer.removeAll(true);
        this.alertItems = [];
        
        if (!alerts || alerts.length === 0) return;
        
        const title = this.scene.add.text(0, -20, '⚠️ Alerts:', {
            fontSize: '14px',
            color: '#ffaa00',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        title.setOrigin(0.5);
        this.alertsContainer.add(title);
        
        alerts.slice(0, 3).forEach((alert, index) => {
            const alertText = this.scene.add.text(0, index * 18, alert, {
                fontSize: '12px',
                color: '#ffaaaa',
                fontFamily: 'Arial',
                wordWrap: { width: 380 },
                align: 'center'
            });
            alertText.setOrigin(0.5);
            this.alertsContainer.add(alertText);
            this.alertItems.push(alertText);
        });
    }

    pulseEffect() {
        // Subtle pulse animation to indicate new data
        const target = this.isExpanded ? this.expandedContainer : this.compactContainer;
        
        this.scene.tweens.add({
            targets: target,
            scale: 1.02,
            duration: 300,
            yoyo: true,
            ease: 'Sine.easeInOut'
        });
    }

    getResourceIcon(resource) {
        const icons = {
            mana: '💎',
            vitality: '🌿',
            arcanum: '⚗️',
            aether: '✨'
        };
        return icons[resource] || '❓';
    }

    getResourceColor(resource) {
        const colors = {
            mana: 0x8888ff,
            vitality: 0x88ff88,
            arcanum: 0xff8888,
            aether: 0xff88ff
        };
        return colors[resource] || 0xffffff;
    }

    formatPhase(phase) {
        return phase.replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    setMode(expanded) {
        this.isExpanded = expanded;
        
        if (this.compactContainer) {
            this.compactContainer.setVisible(!expanded);
        }
        
        if (this.expandedContainer) {
            this.expandedContainer.setVisible(expanded);
        }
        
        
        // Update with last data if available
        if (this.lastProductionData) {
            this.updateProduction(this.lastProductionData);
        }
    }

    toggleExpanded() {
        this.setMode(!this.isExpanded);
        
        // Animate transition
        const target = this.isExpanded ? this.expandedContainer : this.compactContainer;
        target.setScale(0.8);
        target.setAlpha(0);
        
        this.scene.tweens.add({
            targets: target,
            scale: 1,
            alpha: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
    }

    createCloseButton(x, y) {
        const button = this.scene.add.container(x, y);
        
        const bg = this.scene.add.circle(0, 0, 12, 0xaa4444);
        bg.setStrokeStyle(2, 0xcc6666);
        bg.setInteractive();
        
        const label = this.scene.add.text(0, 0, '✕', {
            fontSize: '12px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        label.setOrigin(0.5);
        
        button.add([bg, label]);
        
        bg.on('pointerup', () => {
            this.hide();
        });
        
        return button;
    }

    show() {
        // Start in compact mode
        this.setMode(false);
        
        // Make sure position is set
        this.setPosition('bottom');
        
        // Set visibility AFTER all setup
        this.isVisible = true;
        this.setVisible(true);
        
        // Ensure we're visible and fade in if needed
        if (this.alpha < 1) {
            // Only fade in if alpha is not already 1
            this.scene.tweens.add({
                targets: this,
                alpha: 1,
                duration: 300,
                ease: 'Power2'
            });
        } else {
            // Already at full alpha, just ensure visibility
            this.setAlpha(1);
        }
        
        // Emit event
        this.scene.events.emit('production-monitor-opened');
    }

    hide() {
        console.log('ProductionMonitor.hide() called');
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
        
        // Emit event
        this.scene.events.emit('production-monitor-closed');
    }

    toggle() {
        console.log('ProductionMonitor.toggle() called, isVisible:', this.isVisible);
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Position the monitor at the bottom of the screen
     * @param {string} position - 'bottom', 'top', 'bottom-left', 'bottom-right', etc.
     */
    setPosition(position = 'bottom') {
        const padding = 10;
        
        // Since we're using scrollFactor(0,0), we position relative to the screen, not the world
        const gameWidth = this.scene.sys.game.config.width || 1200;
        const gameHeight = this.scene.sys.game.config.height || 900;
        
        switch (position) {
            case 'bottom':
                // Position at bottom of screen (fixed UI position)
                const zoom = this.scene.cameras.main.zoom;
                
                // We need to position in world coordinates but accounting for zoom
                // Since the camera is zoomed, we need to adjust our position
                const worldX = this.scene.cameras.main.centerX;
                const worldY = this.scene.cameras.main.centerY + (gameHeight / 2 / zoom) - (this.compactHeight / 2 / zoom) - (padding / zoom);
                
                this.x = worldX;
                this.y = worldY;
                
                // Scale down to counteract camera zoom
                this.setScale(1 / zoom);
                
                console.log(`Monitor positioned at (${this.x}, ${this.y}) with scale ${1/zoom} to counter zoom ${zoom}`);
                break;
            case 'top':
                // Center horizontally at top
                this.x = gameWidth / 2;
                this.y = this.compactHeight / 2 + padding;
                break;
            case 'top-left':
                this.x = this.compactWidth / 2 + padding;
                this.y = this.compactHeight / 2 + padding;
                break;
            case 'top-right':
                this.x = gameWidth - this.compactWidth / 2 - padding;
                this.y = this.compactHeight / 2 + padding;
                break;
            case 'bottom-left':
                this.x = this.compactWidth / 2 + padding;
                this.y = gameHeight - this.compactHeight / 2 - padding;
                break;
            case 'bottom-right':
                this.x = gameWidth - this.compactWidth / 2 - padding;
                this.y = gameHeight - this.compactHeight / 2 - padding;
                break;
            default:
                // Default to bottom center
                this.x = gameWidth / 2;
                this.y = gameHeight - this.compactHeight / 2 - padding;
                break;
        }
    }
}