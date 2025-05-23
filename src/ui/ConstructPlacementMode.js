/**
 * ConstructPlacementMode
 * Handles the UI and logic for placing constructs on territories
 */
import { CONSTRUCT_DEFINITIONS } from '../config/gameConfig.js';

export default class ConstructPlacementMode {
    constructor(scene) {
        this.scene = scene;
        this.selectedConstruct = null;
        this.validTerritories = [];
        this.territoryHighlights = new Map(); // territory -> highlight graphics
        this.successRateTexts = new Map(); // territory -> success rate text
        this.placementIndicator = null;
        this.confirmationModal = null;
        this.isActive = false;
    }

    /**
     * Activate placement mode for a specific construct
     * @param {Construct} construct - The construct to place
     */
    activatePlacementMode(construct) {
        if (this.isActive) {
            this.deactivatePlacementMode();
        }

        this.selectedConstruct = construct;
        this.isActive = true;
        
        console.log(`Activating placement mode for ${construct.type}`);
        
        // Highlight valid territories
        this.highlightValidTerritories();
        
        // Create placement UI
        this.createPlacementUI();
        
        // Setup click handlers
        this.setupTerritoryClickHandlers();
        
        // Emit event
        this.scene.events.emit('placement-mode-activated', { construct });
    }

    /**
     * Highlight territories where the construct can be placed
     */
    highlightValidTerritories() {
        const player = this.getCurrentPlayer();
        if (!player) {
            console.error('No current player found');
            return;
        }

        // Get all territories owned by the player without constructs
        const territories = this.scene.gameFlowController?.territoryGrid?.territories || [];
        
        this.validTerritories = territories.filter(territory => 
            territory.ownerId === player.id && !territory.construct
        );

        console.log(`Found ${this.validTerritories.length} valid territories for placement`);

        // Create highlights for each valid territory
        this.validTerritories.forEach(territory => {
            // Create highlight graphics
            const highlight = this.scene.add.graphics();
            highlight.lineStyle(3, 0x00ff00, 0.8);
            
            // Draw hexagon highlight (using the scene's hex utils if available)
            if (this.scene.hexUtils) {
                const points = this.scene.hexUtils.getHexCorners(territory.x, territory.y);
                highlight.beginPath();
                highlight.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    highlight.lineTo(points[i].x, points[i].y);
                }
                highlight.closePath();
                highlight.strokePath();
            } else {
                // Fallback to circle if hex utils not available
                highlight.strokeCircle(territory.x, territory.y, 40);
            }
            
            // Add pulsing animation
            this.scene.tweens.add({
                targets: highlight,
                alpha: { from: 0.8, to: 0.3 },
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
            
            this.territoryHighlights.set(territory.id, highlight);
            
            // Calculate and show success rate
            const successRate = this.calculateSuccessRate(territory);
            const rateText = this.scene.add.text(
                territory.x, 
                territory.y - 50, 
                `${successRate}%`, 
                { 
                    fontSize: '16px', 
                    color: '#00ff00',
                    backgroundColor: '#000000',
                    padding: { x: 5, y: 2 },
                    fontFamily: 'Arial'
                }
            );
            rateText.setOrigin(0.5);
            rateText.setDepth(100);
            
            this.successRateTexts.set(territory.id, rateText);
            
            // Make territory interactive if it has graphics
            const territoryGraphics = this.scene.territoryGraphics?.get(territory.id);
            if (territoryGraphics) {
                territoryGraphics.setInteractive();
                territoryGraphics.removeAllListeners(); // Clear existing listeners
            }
        });
    }

    /**
     * Calculate success rate for placing construct on a territory
     */
    calculateSuccessRate(territory) {
        const constructManager = this.scene.gameFlowController?.constructManager;
        const player = this.getCurrentPlayer();
        
        if (constructManager && player) {
            return constructManager.calculateSuccessRate(
                this.selectedConstruct,
                territory,
                player
            );
        }
        
        // Fallback calculation
        let baseRate = 83;
        const def = CONSTRUCT_DEFINITIONS[this.selectedConstruct.type];
        
        if (def && def.bestTerrain.includes(territory.terrainType || territory.type)) {
            baseRate += 10;
        }
        
        return Math.min(95, Math.max(50, baseRate));
    }

    /**
     * Create the placement mode UI overlay
     */
    createPlacementUI() {
        // Create info panel
        const panel = this.scene.add.container(this.scene.cameras.main.width / 2, 50);
        panel.setDepth(1000);
        
        // Background
        const bg = this.scene.add.rectangle(0, 0, 400, 80, 0x000000, 0.8);
        bg.setStrokeStyle(2, 0x00ff00);
        panel.add(bg);
        
        // Construct info
        const def = CONSTRUCT_DEFINITIONS[this.selectedConstruct.type];
        const infoText = this.scene.add.text(0, -20, 
            `Placing: ${def.icon} ${def.name}`, 
            {
                fontSize: '18px',
                color: '#ffffff',
                fontFamily: 'Arial'
            }
        );
        infoText.setOrigin(0.5);
        panel.add(infoText);
        
        // Instructions
        const instructText = this.scene.add.text(0, 10,
            'Click on a highlighted territory to place construct',
            {
                fontSize: '14px',
                color: '#aaaaaa',
                fontFamily: 'Arial'
            }
        );
        instructText.setOrigin(0.5);
        panel.add(instructText);
        
        // Cancel button
        const cancelBtn = this.createCancelButton(180, 0);
        panel.add(cancelBtn);
        
        this.placementUI = panel;
        
        // Add escape key handler
        this.escapeKey = this.scene.input.keyboard.addKey('ESC');
        this.escapeKey.on('down', () => {
            this.cancelPlacement();
        });
    }

    /**
     * Setup click handlers for territories
     */
    setupTerritoryClickHandlers() {
        // Add click handler to the scene
        this.clickHandler = (pointer) => {
            // Check if click is on a valid territory
            this.validTerritories.forEach(territory => {
                const distance = Phaser.Math.Distance.Between(
                    pointer.worldX, pointer.worldY,
                    territory.x, territory.y
                );
                
                // Check if click is within territory bounds (approximate)
                if (distance < 40) {
                    this.onTerritoryClick(territory);
                }
            });
        };
        
        this.scene.input.on('pointerdown', this.clickHandler);
        
        // Add hover effects
        this.hoverHandler = (pointer) => {
            let hoveredTerritory = null;
            
            this.validTerritories.forEach(territory => {
                const distance = Phaser.Math.Distance.Between(
                    pointer.worldX, pointer.worldY,
                    territory.x, territory.y
                );
                
                if (distance < 40) {
                    hoveredTerritory = territory;
                }
            });
            
            // Update cursor
            if (hoveredTerritory) {
                this.scene.input.setDefaultCursor('pointer');
            } else {
                this.scene.input.setDefaultCursor('default');
            }
        };
        
        this.scene.input.on('pointermove', this.hoverHandler);
    }

    /**
     * Handle territory click
     */
    onTerritoryClick(territory) {
        if (!this.validTerritories.includes(territory)) return;
        
        console.log(`Territory clicked: ${territory.id}`);
        this.showInstallationConfirmation(territory);
    }

    /**
     * Show installation confirmation modal
     */
    showInstallationConfirmation(territory) {
        // Create confirmation modal
        const modal = this.scene.add.container(
            this.scene.cameras.main.width / 2,
            this.scene.cameras.main.height / 2
        );
        modal.setDepth(1100);
        
        // Modal background
        const modalBg = this.scene.add.rectangle(0, 0, 400, 250, 0x000000, 0.9);
        modalBg.setStrokeStyle(2, 0x4444ff);
        modal.add(modalBg);
        
        // Title
        const def = CONSTRUCT_DEFINITIONS[this.selectedConstruct.type];
        const title = this.scene.add.text(0, -90, 'Confirm Construct Placement', {
            fontSize: '20px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        title.setOrigin(0.5);
        modal.add(title);
        
        // Construct info
        const constructInfo = this.scene.add.text(0, -50,
            `${def.icon} ${def.name}`,
            {
                fontSize: '18px',
                color: '#ffcc00',
                fontFamily: 'Arial'
            }
        );
        constructInfo.setOrigin(0.5);
        modal.add(constructInfo);
        
        // Territory info
        const terrainName = territory.terrainType || territory.type || 'Unknown';
        const territoryInfo = this.scene.add.text(0, -20,
            `Territory: ${terrainName} at (${Math.round(territory.x)}, ${Math.round(territory.y)})`,
            {
                fontSize: '14px',
                color: '#aaaaaa',
                fontFamily: 'Arial'
            }
        );
        territoryInfo.setOrigin(0.5);
        modal.add(territoryInfo);
        
        // Success rate
        const successRate = this.calculateSuccessRate(territory);
        const rateColor = successRate >= 90 ? '#00ff00' : successRate >= 70 ? '#ffff00' : '#ff8800';
        const successInfo = this.scene.add.text(0, 10,
            `Installation Success Rate: ${successRate}%`,
            {
                fontSize: '16px',
                color: rateColor,
                fontFamily: 'Arial'
            }
        );
        successInfo.setOrigin(0.5);
        modal.add(successInfo);
        
        // Risk warning if low success rate
        if (successRate < 70) {
            const warning = this.scene.add.text(0, 35,
                '⚠️ Warning: High risk of installation failure!',
                {
                    fontSize: '12px',
                    color: '#ff4444',
                    fontFamily: 'Arial'
                }
            );
            warning.setOrigin(0.5);
            modal.add(warning);
        }
        
        // Buttons
        const confirmBtn = this.createButton('Confirm', -70, 80, () => {
            modal.destroy();
            this.startInstallation(territory);
        });
        modal.add(confirmBtn);
        
        const cancelBtn = this.createButton('Cancel', 70, 80, () => {
            modal.destroy();
        }, 0xaa4444);
        modal.add(cancelBtn);
        
        this.confirmationModal = modal;
    }

    /**
     * Start the installation process
     */
    startInstallation(territory) {
        console.log(`Starting installation on territory ${territory.id}`);
        
        const constructManager = this.scene.gameFlowController?.constructManager;
        const player = this.getCurrentPlayer();
        
        if (!constructManager || !player) {
            console.error('Missing constructManager or player');
            return;
        }
        
        try {
            // Clear placement mode first
            this.deactivatePlacementMode();
            
            // Initiate installation
            const installation = constructManager.initiateInstallation(
                this.selectedConstruct.id,
                territory.id,
                player.id
            );
            
            // Emit event for animation system
            this.scene.events.emit('installation-started', {
                installation: installation,
                territory: territory,
                construct: this.selectedConstruct
            });
            
            // If there's an installation animator, use it
            if (this.scene.installationAnimator) {
                this.scene.installationAnimator.playInstallation(installation);
            }
            
        } catch (error) {
            console.error('Failed to start installation:', error);
            this.showError(error.message);
        }
    }

    /**
     * Cancel placement mode
     */
    cancelPlacement() {
        console.log('Placement cancelled');
        
        // Return construct to inventory if needed
        const player = this.getCurrentPlayer();
        if (player && this.selectedConstruct && 
            this.selectedConstruct.status === 'placing') {
            this.selectedConstruct.status = 'inventory';
        }
        
        this.deactivatePlacementMode();
        
        // Emit event
        this.scene.events.emit('placement-cancelled', {
            construct: this.selectedConstruct
        });
    }

    /**
     * Deactivate placement mode and clean up
     */
    deactivatePlacementMode() {
        this.isActive = false;
        
        // Remove highlights
        this.territoryHighlights.forEach(highlight => {
            highlight.destroy();
        });
        this.territoryHighlights.clear();
        
        // Remove success rate texts
        this.successRateTexts.forEach(text => {
            text.destroy();
        });
        this.successRateTexts.clear();
        
        // Remove UI
        if (this.placementUI) {
            this.placementUI.destroy();
            this.placementUI = null;
        }
        
        // Remove confirmation modal if exists
        if (this.confirmationModal) {
            this.confirmationModal.destroy();
            this.confirmationModal = null;
        }
        
        // Remove event handlers
        if (this.clickHandler) {
            this.scene.input.off('pointerdown', this.clickHandler);
            this.clickHandler = null;
        }
        
        if (this.hoverHandler) {
            this.scene.input.off('pointermove', this.hoverHandler);
            this.hoverHandler = null;
        }
        
        if (this.escapeKey) {
            this.escapeKey.removeAllListeners();
            this.escapeKey = null;
        }
        
        // Reset cursor
        this.scene.input.setDefaultCursor('default');
        
        // Clear selected construct
        this.selectedConstruct = null;
        this.validTerritories = [];
    }

    /**
     * Create a button helper
     */
    createButton(text, x, y, callback, bgColor = 0x4466aa) {
        const button = this.scene.add.container(x, y);
        
        const bg = this.scene.add.rectangle(0, 0, 100, 35, bgColor);
        bg.setStrokeStyle(2, bgColor + 0x222222);
        bg.setInteractive();
        
        const label = this.scene.add.text(0, 0, text, {
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        label.setOrigin(0.5);
        
        button.add([bg, label]);
        
        bg.on('pointerover', () => {
            bg.setFillStyle(bgColor + 0x111111);
        });
        
        bg.on('pointerout', () => {
            bg.setFillStyle(bgColor);
        });
        
        bg.on('pointerup', () => {
            if (callback) callback();
        });
        
        return button;
    }

    /**
     * Create cancel button
     */
    createCancelButton(x, y) {
        const button = this.scene.add.container(x, y);
        
        const bg = this.scene.add.circle(0, 0, 15, 0xaa4444);
        bg.setStrokeStyle(2, 0xcc6666);
        bg.setInteractive();
        
        const label = this.scene.add.text(0, 0, '✕', {
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        label.setOrigin(0.5);
        
        button.add([bg, label]);
        
        bg.on('pointerover', () => {
            bg.setFillStyle(0xcc5555);
        });
        
        bg.on('pointerout', () => {
            bg.setFillStyle(0xaa4444);
        });
        
        bg.on('pointerup', () => {
            this.cancelPlacement();
        });
        
        return button;
    }

    /**
     * Get current player helper
     */
    getCurrentPlayer() {
        return this.scene.gameFlowController?.turnManager?.currentPlayer ||
               this.scene.gameFlowController?.gameStateManager?.getCurrentPlayer();
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorText = this.scene.add.text(
            this.scene.cameras.main.width / 2,
            this.scene.cameras.main.height / 2,
            `Error: ${message}`,
            {
                fontSize: '18px',
                color: '#ff4444',
                backgroundColor: '#000000',
                padding: { x: 20, y: 10 },
                fontFamily: 'Arial'
            }
        );
        errorText.setOrigin(0.5);
        errorText.setDepth(1200);
        
        this.scene.tweens.add({
            targets: errorText,
            alpha: 0,
            y: errorText.y - 50,
            duration: 3000,
            ease: 'Power2',
            onComplete: () => {
                errorText.destroy();
            }
        });
    }
}