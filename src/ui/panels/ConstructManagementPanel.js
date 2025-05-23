/**
 * ConstructManagementPanel
 * UI panel for managing all player constructs
 */
import { CONSTRUCT_DEFINITIONS } from '../../config/gameConfig.js';

export default class ConstructManagementPanel extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);
        this.scene = scene;
        this.constructList = [];
        this.constructEntries = new Map(); // construct.id -> entry container
        this.isVisible = false;
        this.selectedConstruct = null;
        
        // Add to scene
        this.scene.add.existing(this);
        this.setDepth(1000);
        
        this.createPanel();
        this.hide(); // Start hidden
    }

    createPanel() {
        // Panel dimensions
        const panelWidth = 600;
        const panelHeight = 500;
        
        // Background
        const bg = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x1a1a2a, 0.95);
        bg.setStrokeStyle(3, 0x4444ff);
        this.add(bg);
        
        // Title
        const title = this.scene.add.text(0, -panelHeight/2 + 30, '🏗️ Your Magical Constructs', {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        title.setOrigin(0.5);
        this.add(title);
        
        // Subtitle with count
        this.subtitleText = this.scene.add.text(0, -panelHeight/2 + 55, 'Manage your active constructs', {
            fontSize: '14px',
            color: '#aaaaaa',
            fontFamily: 'Arial'
        });
        this.subtitleText.setOrigin(0.5);
        this.add(this.subtitleText);
        
        // Scrollable construct list area
        this.listContainer = this.scene.add.container(0, -50);
        this.add(this.listContainer);
        
        // No constructs message
        this.emptyMessage = this.scene.add.text(0, 0, 
            'No active constructs yet.\nPurchase constructs from the Artificers\' Guild\nand place them on your territories.',
            {
                fontSize: '16px',
                color: '#666666',
                fontFamily: 'Arial',
                align: 'center',
                lineSpacing: 5
            }
        );
        this.emptyMessage.setOrigin(0.5);
        this.emptyMessage.setVisible(false);
        this.listContainer.add(this.emptyMessage);
        
        // Summary section at bottom
        this.summaryContainer = this.scene.add.container(0, panelHeight/2 - 80);
        this.add(this.summaryContainer);
        
        this.createSummarySection();
        
        // Close button
        const closeBtn = this.createCloseButton(panelWidth/2 - 25, -panelHeight/2 + 25);
        this.add(closeBtn);
        
        // Refresh button
        const refreshBtn = this.createRefreshButton(-panelWidth/2 + 60, -panelHeight/2 + 30);
        this.add(refreshBtn);
    }

    createSummarySection() {
        // Background for summary
        const summaryBg = this.scene.add.rectangle(0, 0, 550, 60, 0x2a2a3a, 0.8);
        summaryBg.setStrokeStyle(1, 0x4444aa);
        this.summaryContainer.add(summaryBg);
        
        // Summary title
        const summaryTitle = this.scene.add.text(-250, -20, 'Production Summary:', {
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        this.summaryContainer.add(summaryTitle);
        
        // Resource production totals
        this.productionText = this.scene.add.text(-250, 0, 'Loading...', {
            fontSize: '12px',
            color: '#88cc88',
            fontFamily: 'Arial'
        });
        this.summaryContainer.add(this.productionText);
        
        // Total constructs
        this.totalConstructsText = this.scene.add.text(100, -20, 'Total Constructs: 0', {
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        this.summaryContainer.add(this.totalConstructsText);
        
        // Efficiency average
        this.efficiencyText = this.scene.add.text(100, 0, 'Avg Efficiency: 100%', {
            fontSize: '12px',
            color: '#88aaff',
            fontFamily: 'Arial'
        });
        this.summaryContainer.add(this.efficiencyText);
    }

    createConstructEntry(construct, yOffset) {
        const container = this.scene.add.container(0, yOffset);
        const entryWidth = 540;
        const entryHeight = 100;
        
        // Entry background
        const entryBg = this.scene.add.rectangle(0, 0, entryWidth, entryHeight, 0x2a2a3a, 0.9);
        entryBg.setStrokeStyle(2, 0x3333aa);
        entryBg.setInteractive();
        container.add(entryBg);
        
        // Hover effect
        entryBg.on('pointerover', () => {
            entryBg.setStrokeStyle(2, 0x5555cc);
            entryBg.setFillStyle(0x3a3a4a, 0.9);
        });
        
        entryBg.on('pointerout', () => {
            entryBg.setStrokeStyle(2, 0x3333aa);
            entryBg.setFillStyle(0x2a2a3a, 0.9);
        });
        
        // Construct icon and info
        const def = CONSTRUCT_DEFINITIONS[construct.type];
        const icon = this.scene.add.text(-entryWidth/2 + 40, -20, def.icon, {
            fontSize: '36px'
        });
        icon.setOrigin(0.5);
        container.add(icon);
        
        // Construct name and level
        const nameText = this.scene.add.text(-entryWidth/2 + 80, -25,
            `${def.name} - Level ${construct.level}`,
            {
                fontSize: '16px',
                color: '#ffffff',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            }
        );
        nameText.setOrigin(0, 0.5);
        container.add(nameText);
        
        // Territory info
        const territory = construct.territory;
        const territoryText = this.scene.add.text(-entryWidth/2 + 80, -5,
            `Territory: ${territory ? `${territory.terrainType || territory.type} (${Math.round(territory.x)}, ${Math.round(territory.y)})` : 'None'}`,
            {
                fontSize: '12px',
                color: '#aaaaaa',
                fontFamily: 'Arial'
            }
        );
        territoryText.setOrigin(0, 0.5);
        container.add(territoryText);
        
        // Production info
        const production = this.calculateProduction(construct);
        const prodText = this.scene.add.text(-entryWidth/2 + 80, 15,
            `Production: ${production} ${def.resourceType}/cycle`,
            {
                fontSize: '14px',
                color: '#88cc88',
                fontFamily: 'Arial'
            }
        );
        prodText.setOrigin(0, 0.5);
        container.add(prodText);
        
        // Status indicator
        const statusInfo = this.getStatusInfo(construct);
        const statusContainer = this.scene.add.container(-entryWidth/2 + 80, 35);
        container.add(statusContainer);
        
        const statusIcon = this.scene.add.text(0, 0, statusInfo.icon, {
            fontSize: '14px'
        });
        statusIcon.setOrigin(0, 0.5);
        statusContainer.add(statusIcon);
        
        const statusText = this.scene.add.text(20, 0, statusInfo.text, {
            fontSize: '12px',
            color: statusInfo.color,
            fontFamily: 'Arial'
        });
        statusText.setOrigin(0, 0.5);
        statusContainer.add(statusText);
        
        // Efficiency bar
        this.createEfficiencyBar(container, entryWidth/2 - 150, -20, construct.efficiency);
        
        // Action buttons
        const buttonsX = entryWidth/2 - 80;
        
        // Upgrade button (if not max level)
        if (construct.level < 3) {
            const upgradeBtn = this.createSmallButton('Upgrade', buttonsX, 10, () => {
                this.onUpgradeClick(construct);
            });
            container.add(upgradeBtn);
        }
        
        // Repair button (if damaged)
        if (construct.efficiency < 1.0) {
            const repairBtn = this.createSmallButton('Repair', buttonsX, 35, () => {
                this.onRepairClick(construct);
            }, 0xaa8844);
            container.add(repairBtn);
        }
        
        // Info button
        const infoBtn = this.createSmallButton('Info', buttonsX - 80, 10, () => {
            this.onInfoClick(construct);
        }, 0x4488aa);
        container.add(infoBtn);
        
        return container;
    }

    createEfficiencyBar(container, x, y, efficiency) {
        const barContainer = this.scene.add.container(x, y);
        container.add(barContainer);
        
        // Label
        const label = this.scene.add.text(-50, 0, 'Efficiency:', {
            fontSize: '12px',
            color: '#aaaaaa',
            fontFamily: 'Arial'
        });
        label.setOrigin(0, 0.5);
        barContainer.add(label);
        
        // Bar background
        const barBg = this.scene.add.rectangle(40, 0, 80, 12, 0x333333);
        barBg.setStrokeStyle(1, 0x555555);
        barContainer.add(barBg);
        
        // Bar fill
        const fillColor = efficiency >= 1.0 ? 0x44ff44 : 
                         efficiency >= 0.75 ? 0xffaa44 : 0xff4444;
        const barFill = this.scene.add.rectangle(
            40 - 40 + (efficiency * 80) / 2,
            0,
            efficiency * 80,
            10,
            fillColor
        );
        barContainer.add(barFill);
        
        // Percentage text
        const percentText = this.scene.add.text(90, 0, `${Math.floor(efficiency * 100)}%`, {
            fontSize: '11px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        percentText.setOrigin(0, 0.5);
        barContainer.add(percentText);
    }

    getStatusInfo(construct) {
        if (construct.status === 'damaged' || construct.efficiency === 0) {
            return {
                icon: '❌',
                text: 'Damaged - Needs Repair',
                color: '#ff4444'
            };
        } else if (construct.efficiency < 0.75) {
            return {
                icon: '⚠️',
                text: 'Low Efficiency',
                color: '#ffaa44'
            };
        } else if (construct.efficiency < 1.0) {
            return {
                icon: '⚠️',
                text: 'Reduced Efficiency',
                color: '#ffaa44'
            };
        } else if (construct.efficiency > 1.0) {
            return {
                icon: '⭐',
                text: 'Enhanced Production',
                color: '#44ffff'
            };
        } else {
            return {
                icon: '✅',
                text: 'Operating Normally',
                color: '#44ff44'
            };
        }
    }

    calculateProduction(construct) {
        const constructManager = this.scene.gameFlowController?.constructManager;
        if (constructManager) {
            return constructManager.calculateProduction(construct);
        }
        
        // Fallback calculation
        const def = CONSTRUCT_DEFINITIONS[construct.type];
        const baseProduction = (def.baseProduction.min + def.baseProduction.max) / 2;
        const levelMultiplier = construct.getProductionMultiplier();
        return Math.floor(baseProduction * levelMultiplier * construct.efficiency);
    }

    updateConstructList() {
        // Clear existing entries
        this.constructEntries.forEach(entry => entry.destroy());
        this.constructEntries.clear();
        this.listContainer.removeAll();
        
        // Get player constructs
        const player = this.getCurrentPlayer();
        const constructManager = this.scene.gameFlowController?.constructManager;
        
        if (!player || !constructManager) {
            this.emptyMessage.setVisible(true);
            this.listContainer.add(this.emptyMessage);
            return;
        }
        
        // Get all active constructs for the player
        const constructs = constructManager.getPlayerConstructs(player.id)
            .filter(c => c.status === 'active');
        
        if (constructs.length === 0) {
            this.emptyMessage.setVisible(true);
            this.listContainer.add(this.emptyMessage);
            this.updateSummary(constructs);
            return;
        }
        
        this.emptyMessage.setVisible(false);
        
        // Create entries for each construct
        let yOffset = -150;
        constructs.forEach(construct => {
            const entry = this.createConstructEntry(construct, yOffset);
            this.listContainer.add(entry);
            this.constructEntries.set(construct.id, entry);
            yOffset += 110;
        });
        
        // Update subtitle with count
        this.subtitleText.setText(`Managing ${constructs.length} active construct${constructs.length !== 1 ? 's' : ''}`);
        
        // Update summary
        this.updateSummary(constructs);
    }

    updateSummary(constructs) {
        // Calculate production totals
        const production = {
            mana: 0,
            vitality: 0,
            arcanum: 0,
            aether: 0
        };
        
        let totalEfficiency = 0;
        
        constructs.forEach(construct => {
            const def = CONSTRUCT_DEFINITIONS[construct.type];
            const amount = this.calculateProduction(construct);
            production[def.resourceType] += amount;
            totalEfficiency += construct.efficiency;
        });
        
        // Update production text
        const prodParts = [];
        Object.entries(production).forEach(([resource, amount]) => {
            if (amount > 0) {
                prodParts.push(`${resource}: ${amount}`);
            }
        });
        
        this.productionText.setText(
            prodParts.length > 0 ? prodParts.join(', ') + ' per cycle' : 'No production'
        );
        
        // Update totals
        this.totalConstructsText.setText(`Total Constructs: ${constructs.length}`);
        
        // Update efficiency
        const avgEfficiency = constructs.length > 0 ? 
            Math.floor((totalEfficiency / constructs.length) * 100) : 100;
        this.efficiencyText.setText(`Avg Efficiency: ${avgEfficiency}%`);
    }

    onUpgradeClick(construct) {
        console.log('Upgrade clicked for:', construct.type);
        
        // Show upgrade interface (could be a separate panel)
        this.scene.events.emit('construct-upgrade-requested', { construct });
        
        // For now, show costs
        const costs = construct.getUpgradeCosts();
        if (costs) {
            const costStr = Object.entries(costs)
                .map(([res, amt]) => `${amt} ${res}`)
                .join(', ');
            
            this.showMessage(`Upgrade to Level ${construct.level + 1} costs: ${costStr}`);
        }
    }

    onRepairClick(construct) {
        console.log('Repair clicked for:', construct.type);
        
        // Calculate repair cost (50% of base cost)
        const def = CONSTRUCT_DEFINITIONS[construct.type];
        const repairCost = {};
        Object.entries(def.baseCost).forEach(([resource, amount]) => {
            repairCost[resource] = Math.floor(amount * 0.5);
        });
        
        const costStr = Object.entries(repairCost)
            .map(([res, amt]) => `${amt} ${res}`)
            .join(', ');
        
        this.showMessage(`Repair costs: ${costStr}`);
        
        // Emit event for repair
        this.scene.events.emit('construct-repair-requested', { 
            construct,
            cost: repairCost
        });
    }

    onInfoClick(construct) {
        console.log('Info clicked for:', construct.type);
        
        // Show detailed construct information
        const def = CONSTRUCT_DEFINITIONS[construct.type];
        const territory = construct.territory;
        
        const info = [
            `${def.icon} ${def.name}`,
            `Level: ${construct.level}`,
            `Type: ${construct.type}`,
            `Resource: ${def.resourceType}`,
            `Efficiency: ${Math.floor(construct.efficiency * 100)}%`,
            `Territory: ${territory ? territory.type : 'None'}`,
            `Production: ${this.calculateProduction(construct)} per cycle`
        ];
        
        if (construct.level === 3 && construct.specialAbility) {
            info.push(`Special: ${construct.specialAbility.name}`);
        }
        
        this.showMessage(info.join('\n'));
    }

    showMessage(text) {
        const message = this.scene.add.text(0, 0, text, {
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 20, y: 15 },
            fontFamily: 'Arial',
            wordWrap: { width: 400 },
            align: 'center'
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

    createSmallButton(text, x, y, callback, bgColor = 0x4466aa) {
        const button = this.scene.add.container(x, y);
        
        const bg = this.scene.add.rectangle(0, 0, 70, 25, bgColor);
        bg.setStrokeStyle(1, bgColor + 0x222222);
        bg.setInteractive();
        
        const label = this.scene.add.text(0, 0, text, {
            fontSize: '12px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        label.setOrigin(0.5);
        
        button.add([bg, label]);
        
        bg.on('pointerover', () => {
            bg.setFillStyle(bgColor + 0x111111);
            this.scene.input.setDefaultCursor('pointer');
        });
        
        bg.on('pointerout', () => {
            bg.setFillStyle(bgColor);
            this.scene.input.setDefaultCursor('default');
        });
        
        bg.on('pointerup', () => {
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

    createRefreshButton(x, y) {
        const button = this.scene.add.container(x, y);
        
        const bg = this.scene.add.circle(0, 0, 20, 0x4466aa);
        bg.setStrokeStyle(2, 0x6688cc);
        bg.setInteractive();
        
        const label = this.scene.add.text(0, 0, '🔄', {
            fontSize: '16px'
        });
        label.setOrigin(0.5);
        
        button.add([bg, label]);
        
        bg.on('pointerover', () => {
            bg.setFillStyle(0x5577bb);
            this.scene.input.setDefaultCursor('pointer');
        });
        
        bg.on('pointerout', () => {
            bg.setFillStyle(0x4466aa);
            this.scene.input.setDefaultCursor('default');
        });
        
        bg.on('pointerup', () => {
            this.updateConstructList();
            
            // Spin animation
            this.scene.tweens.add({
                targets: label,
                rotation: Math.PI * 2,
                duration: 500,
                ease: 'Power2'
            });
        });
        
        return button;
    }

    getCurrentPlayer() {
        return this.scene.gameFlowController?.turnManager?.currentPlayer ||
               this.scene.gameFlowController?.gameStateManager?.getCurrentPlayer();
    }

    show() {
        this.isVisible = true;
        this.setVisible(true);
        this.updateConstructList();
        
        // Fade in animation
        this.setAlpha(0);
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
        
        // Emit event
        this.scene.events.emit('construct-management-opened');
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
        this.scene.events.emit('construct-management-closed');
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
}