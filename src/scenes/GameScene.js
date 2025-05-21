import Phaser from 'phaser';
import HexUtils from '../utils/HexUtils';
import CameraControls from '../utils/CameraControls';
import ErrorDisplay from '../components/ErrorDisplay';
import { GAME_SETTINGS, TERRITORY_TYPES, TERRITORY_COLORS, RESOURCE_TYPES } from '../config/gameConfig';
import { Game, Territory, Player, Construct, Resource, Market } from '../models';
import ErrorHandler from '../utils/ErrorHandler';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.mapSize = GAME_SETTINGS.MAP_SIZE;
        this.hexUtils = new HexUtils(GAME_SETTINGS.HEX_SIZE);
        this.territories = [];
        this.selectedTerritory = null;
    }

    create() {
        // Set up camera controls
        this.cameraControls = new CameraControls(this, {
            minZoom: 0.5,
            maxZoom: 2.0,
            padding: 100
        });
        
        // Create map first (so it's behind UI)
        this.createMap();
        
        // Initialize game data
        this.initializeGameData();
        
        // Set up UI elements
        this.setupUI();
        
        // Create error display
        this.errorDisplay = new ErrorDisplay(this);
        
        // Set camera bounds based on map size
        const mapWidth = this.mapSize.width * this.hexUtils.width * 0.75;
        const mapHeight = this.mapSize.height * this.hexUtils.height + this.hexUtils.height / 2;
        this.cameraControls.setBounds(0, 0, mapWidth, mapHeight);
        this.cameraControls.centerOn(mapWidth / 2, mapHeight / 2);
    }
    
    initializeGameData() {
        // Create game model
        this.game = new Game({
            playerCount: 4,
            totalCycles: GAME_SETTINGS.TOTAL_CYCLES,
            mapSize: GAME_SETTINGS.MAP_SIZE
        });
        
        // Register event listeners
        this.setupGameEvents();
        
        // Initialize territories in the game model based on map data
        this.game.initializeTerritories(this.territories);
        
        // Update UI to match initial game state
        this.updateUI();
    }
    
    /**
     * Set up game event listeners
     */
    setupGameEvents() {
        // Listen for player turn changes
        this.game.on('turnChanged', (data) => {
            this.updatePlayerDisplay();
        });
        
        // Listen for cycle completion
        this.game.on('cycleComplete', (data) => {
            this.cycleText.setText(`Cycle: ${data.cycle}/${data.totalCycles}`);
        });
        
        // Listen for territory assignment
        this.game.on('territoryAssigned', (data) => {
            this.updateTerritoryVisuals(data.territory);
        });
        
        // Listen for construct creation
        this.game.on('constructCreated', (data) => {
            this.updateTerritoryVisuals(data.territory);
        });
        
        // Listen for market updates
        this.game.on('marketUpdate', (data) => {
            this.updateResourceDisplay(data.prices);
        });
        
        // Listen for game over
        this.game.on('gameOver', (data) => {
            this.showGameOverScreen(data);
        });
        
        // Listen for errors
        this.game.on('error', (data) => {
            this.handleGameError(data.error);
        });
        
        // Listen for recovery attempts
        this.game.on('recoveryAttempt', (data) => {
            this.showRecoveryAttempt(data.error, data.recovery);
        });
        
        // Listen for recovery success
        this.game.on('recoverySuccess', (data) => {
            this.showRecoverySuccess(data.error, data.recovery, data.result);
        });
        
        // Listen for recovery failure
        this.game.on('recoveryFailure', (data) => {
            this.showRecoveryFailure(data.error, data.recovery);
        });
    }
    
    /**
     * Handle a game error
     * @param {Object} error - Error object
     */
    handleGameError(error) {
        if (!this.errorDisplay) return;
        
        // Show error in UI
        this.errorDisplay.showError(error);
        
        // Play error sound if applicable
        this.playErrorSound(error.type);
        
        // Show visual indicator if applicable
        this.showErrorIndicator(error);
    }
    
    /**
     * Play sound effect for an error
     * @param {string} errorType - Type of error
     */
    playErrorSound(errorType) {
        // Implement sound effects for different error types
        // Will be implemented with sound system in Phase 7
    }
    
    /**
     * Show visual indicator for an error
     * @param {Object} error - Error object
     */
    showErrorIndicator(error) {
        // If error relates to a territory, flash that territory
        if (error.data && error.data.territoryId) {
            const visualTerritory = this.territoryMap[error.data.territoryId];
            if (visualTerritory && visualTerritory.hex) {
                // Flash the territory in red
                this.flashObject(visualTerritory.hex, 0xFF0000);
            }
        }
        
        // If error relates to a player, flash player info
        if (error.data && error.data.playerId) {
            // Could flash player UI elements
        }
    }
    
    /**
     * Flash an object to indicate an error
     * @param {Phaser.GameObjects.GameObject} object - Object to flash
     * @param {number} color - Color to flash to
     */
    flashObject(object, color) {
        if (!object) return;
        
        const originalTint = object.tintTopLeft;
        
        // Create flash tween
        this.tweens.add({
            targets: object,
            tint: color,
            duration: 100,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                object.setTint(originalTint);
            }
        });
    }
    
    /**
     * Show recovery attempt message
     * @param {Object} error - Error object
     * @param {Object} recovery - Recovery action
     */
    showRecoveryAttempt(error, recovery) {
        if (!this.errorDisplay) return;
        this.errorDisplay.showInfo(`Attempting to recover: ${recovery.message}`);
    }
    
    /**
     * Show recovery success message
     * @param {Object} error - Error object
     * @param {Object} recovery - Recovery action
     * @param {Object} result - Recovery result
     */
    showRecoverySuccess(error, recovery, result) {
        if (!this.errorDisplay) return;
        this.errorDisplay.showInfo(`Recovery successful: ${result.message || 'Game resumed'}`);
    }
    
    /**
     * Show recovery failure message
     * @param {Object} error - Error object
     * @param {Object} recovery - Recovery action
     */
    showRecoveryFailure(error, recovery) {
        if (!this.errorDisplay) return;
        this.errorDisplay.showWarning(`Recovery failed. Please try a different action.`);
    }
    
    /**
     * Update all UI elements to match game state
     */
    updateUI() {
        // Update cycle display
        this.cycleText.setText(`Cycle: ${this.game.currentCycle}/${this.game.totalCycles}`);
        
        // Update player display
        this.updatePlayerDisplay();
        
        // Update resource display
        this.updateResourceDisplay();
        
        // Update territory visuals
        for (const territory of Object.values(this.game.territories)) {
            this.updateTerritoryVisuals(territory);
        }
    }
    
    /**
     * Update the resource display to show current prices and amounts
     * @param {Object} prices - Optional market prices to display
     */
    updateResourceDisplay(prices = null) {
        const currentPlayer = this.game.getCurrentPlayer();
        
        // Get market prices if not provided
        if (!prices && this.game.market) {
            prices = Object.fromEntries(
                Object.entries(this.game.resources).map(
                    ([type, resource]) => [type, resource.currentPrice]
                )
            );
        }
        
        // Update resource text displays
        for (const [key, text] of Object.entries(this.resourceTexts)) {
            const amount = currentPlayer.resources[key] || 0;
            const price = prices ? prices[key] : '—';
            text.setText(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${amount} (${price} gp)`);
        }
        
        // Update gold display
        this.goldText.setText(`Gold: ${currentPlayer.gold}`);
    }
    
    /**
     * Update the visuals for a territory to match its game state
     * @param {Territory} territory - The territory to update
     */
    updateTerritoryVisuals(territory) {
        // Find the visual representation of this territory
        const visualTerritory = this.territoryMap[territory.id];
        if (!visualTerritory) return;
        
        // Update owner color if territory is owned
        if (territory.owner) {
            // Show owner indicator
            if (!visualTerritory.ownerIndicator) {
                visualTerritory.ownerIndicator = this.add.circle(
                    visualTerritory.x,
                    visualTerritory.y,
                    GAME_SETTINGS.HEX_SIZE * 0.8,
                    territory.owner.color,
                    0.3
                );
                this.mapContainer.add(visualTerritory.ownerIndicator);
            } else {
                visualTerritory.ownerIndicator.fillColor = territory.owner.color;
                visualTerritory.ownerIndicator.visible = true;
            }
        } else if (visualTerritory.ownerIndicator) {
            // Hide owner indicator if territory is not owned
            visualTerritory.ownerIndicator.visible = false;
        }
        
        // Update construct visualization if territory has a construct
        if (territory.construct) {
            // Create or update construct visual
            if (!visualTerritory.constructVisual) {
                // For now, just show a simple shape for the construct type
                const constructColor = this.getConstructColor(territory.construct.type);
                visualTerritory.constructVisual = this.add.circle(
                    visualTerritory.x,
                    visualTerritory.y,
                    GAME_SETTINGS.HEX_SIZE * 0.4,
                    constructColor,
                    0.8
                );
                visualTerritory.constructVisual.setStrokeStyle(2, 0xFFFFFF, 0.8);
                this.mapContainer.add(visualTerritory.constructVisual);
            } else {
                const constructColor = this.getConstructColor(territory.construct.type);
                visualTerritory.constructVisual.fillColor = constructColor;
                visualTerritory.constructVisual.visible = true;
            }
            
            // Show construct level
            if (!visualTerritory.levelText) {
                visualTerritory.levelText = this.add.text(
                    visualTerritory.x,
                    visualTerritory.y,
                    territory.construct.level.toString(),
                    {
                        fontFamily: 'sans-serif',
                        fontSize: '16px',
                        color: '#FFFFFF',
                        align: 'center'
                    }
                ).setOrigin(0.5);
                this.mapContainer.add(visualTerritory.levelText);
            } else {
                visualTerritory.levelText.setText(territory.construct.level.toString());
                visualTerritory.levelText.visible = true;
            }
        } else {
            // Hide construct visuals if no construct
            if (visualTerritory.constructVisual) {
                visualTerritory.constructVisual.visible = false;
            }
            if (visualTerritory.levelText) {
                visualTerritory.levelText.visible = false;
            }
        }
    }
    
    /**
     * Get color for a construct type
     * @param {string} constructType - Type of construct
     * @returns {number} Color as hex number
     */
    getConstructColor(constructType) {
        switch (constructType) {
            case 'mana_conduit': return 0x8080FF;
            case 'vitality_well': return 0x80FF80;
            case 'arcanum_extractor': return 0xFF8080;
            case 'aether_resonator': return 0xFFFF80;
            default: return 0xFFFFFF;
        }
    }
    
    setupUI() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Add game UI elements
        this.add.rectangle(width - 200, height / 2, 400, height, 0x222244, 0.7)
            .setOrigin(0.5);
            
        // Header for the UI panel
        this.add.text(width - 200, 20, 'Magical Frontiers', {
            fontFamily: 'Georgia, serif',
            fontSize: '24px',
            color: '#FFD700',
            align: 'center'
        }).setOrigin(0.5, 0);
        
        // Cycle display
        this.cycleText = this.add.text(width - 200, 60, 'Cycle: 1/12', {
            fontFamily: 'sans-serif',
            fontSize: '18px',
            color: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5, 0);
        
        // Current player display
        this.playerText = this.add.text(width - 200, 100, 'Current Player: Player 1', {
            fontFamily: 'sans-serif',
            fontSize: '18px',
            color: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5, 0);
        
        // Resource display
        const resourceY = 150;
        this.add.text(width - 350, resourceY, 'Resources:', {
            fontFamily: 'sans-serif',
            fontSize: '20px',
            color: '#FFFFFF'
        });
        
        // Resource counters
        this.resourceTexts = {};
        
        const resources = [
            { key: 'mana', name: 'Mana', color: '#8080FF' },
            { key: 'vitality', name: 'Vitality', color: '#80FF80' },
            { key: 'arcanum', name: 'Arcanum', color: '#FF8080' },
            { key: 'aether', name: 'Aether', color: '#FFFF80' }
        ];
        
        resources.forEach((resource, i) => {
            this.resourceTexts[resource.key] = this.add.text(
                width - 350, 
                resourceY + 30 + (i * 25),
                `${resource.name}: 0 (${window.gameState.marketPrices[resource.key]} gp)`,
                {
                    fontFamily: 'sans-serif',
                    fontSize: '16px',
                    color: resource.color
                }
            );
        });
        
        // Gold display
        this.goldText = this.add.text(width - 350, resourceY + 30 + (resources.length * 25), 'Gold: 1000', {
            fontFamily: 'sans-serif',
            fontSize: '18px',
            color: '#FFD700'
        });
        
        // Action buttons
        const buttonY = height - 200;
        const buttonStyle = {
            fontFamily: 'sans-serif',
            fontSize: '16px',
            color: '#FFFFFF',
            backgroundColor: '#444466',
            padding: {
                x: 10,
                y: 5
            },
            fixedWidth: 180
        };
        
        // Create buttons
        ['End Turn', 'Buy Construct', 'Market', 'View Territories'].forEach((text, i) => {
            const button = this.add.text(width - 200, buttonY + (i * 40), text, buttonStyle)
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });
                
            // Add hover effect
            button.on('pointerover', () => {
                button.setStyle({ color: '#FFD700' });
            });
            
            button.on('pointerout', () => {
                button.setStyle({ color: '#FFFFFF' });
            });
            
            // Add click handler
            button.on('pointerdown', () => {
                this.handleButtonClick(text);
            });
        });
    }
    
    handleButtonClick(buttonText) {
        switch(buttonText) {
            case 'End Turn':
                console.log('End turn clicked');
                // Advance to next player or cycle
                this.nextTurn();
                break;
            case 'Buy Construct':
                console.log('Buy construct clicked');
                // Show construct purchase UI
                break;
            case 'Market':
                console.log('Market clicked');
                // Show market/auction UI
                break;
            case 'View Territories':
                console.log('View territories clicked');
                // Show territories overview
                break;
        }
    }
    
    createMap() {
        this.territoryEntities = []; // Visual and interaction territory objects
        this.territoryMap = {}; // For quick look-up by coordinates
        this.mapContainer = this.add.container(0, 0);
        
        // Create hex grid map using axial coordinates
        for (let r = 0; r < this.mapSize.height; r++) {
            // Adjust the starting q based on the row to create a more rectangular grid
            const qStart = Math.floor(r / 2);
            const qEnd = qStart + this.mapSize.width;
            
            for (let q = qStart; q < qEnd; q++) {
                // Get pixel position from axial coordinates
                const pos = this.hexUtils.axialToPixel(q, r);
                
                // Determine territory type - using different distribution methods
                // For now, we'll use a semi-random approach that creates realistic clusters
                const territoryType = this.determineTerrritoryType(q, r);
                
                // Create hex visuals using the hex outline image
                const hex = this.add.image(pos.x, pos.y, 'hex_outline');
                hex.setTint(TERRITORY_COLORS[territoryType]);
                this.mapContainer.add(hex);
                
                // Create territory data object for the game model
                const territory = {
                    id: `${q},${r}`,
                    q: q,
                    r: r,
                    type: territoryType,
                    x: pos.x,
                    y: pos.y
                };
                
                // Create visual entity for the territory
                const visualEntity = {
                    id: territory.id,
                    q: territory.q,
                    r: territory.r,
                    type: territory.type,
                    x: territory.x,
                    y: territory.y,
                    hex: hex,
                    ownerIndicator: null,
                    constructVisual: null,
                    levelText: null
                };
                
                this.territoryEntities.push(visualEntity);
                this.territoryMap[territory.id] = visualEntity;
                
                // Store the territory for the game model
                this.territories.push(territory);
                
                // Make territory interactive
                hex.setInteractive();
                hex.on('pointerdown', () => {
                    // Get the territory from the game model for selection
                    const gameTerritory = this.game.territories[territory.id];
                    if (gameTerritory) {
                        this.selectTerritory(gameTerritory);
                    }
                });
                
                hex.on('pointerover', () => {
                    hex.setTint(0xFFFF00); // Highlight on hover
                });
                
                hex.on('pointerout', () => {
                    // Reset to original color
                    hex.setTint(TERRITORY_COLORS[territoryType]);
                    
                    // If this is the selected territory, keep it highlighted differently
                    const gameTerritory = this.game.territories[territory.id];
                    if (this.selectedTerritory && gameTerritory && 
                        this.selectedTerritory.id === gameTerritory.id) {
                        hex.setTint(0xFFFFFF);
                    }
                });
                
                // Add a small icon to represent the territory type
                this.addTerritoryIcon(visualEntity);
            }
        }
    }
    
    /**
     * Determine territory type based on position and neighboring territories
     * Uses a simple noise-based approach to create natural-looking clusters
     */
    determineTerrritoryType(q, r) {
        // Use a simple noise function for more natural-looking terrain
        // For now, just use a simple mapping based on position
        const noiseValue = Math.sin(q * 0.5) * Math.cos(r * 0.5) * 0.5 + 0.5;
        
        // Create more natural clusters by checking neighbors if this isn't the first territory
        let neighborTypes = {};
        
        // Check existing neighbors to create clusters
        if (this.territoryMap) {
            const neighbors = this.hexUtils.neighbors(q, r);
            neighbors.forEach(neighbor => {
                const territory = this.territoryMap[`${neighbor.q},${neighbor.r}`];
                if (territory) {
                    if (!neighborTypes[territory.type]) {
                        neighborTypes[territory.type] = 0;
                    }
                    neighborTypes[territory.type]++;
                }
            });
        }
        
        // Determine type based on neighbors and noise
        const territoryTypes = Object.values(TERRITORY_TYPES);
        
        // If we have neighbors, use them to influence the choice
        if (Object.keys(neighborTypes).length > 0) {
            // 70% chance to match a neighbor
            if (Math.random() < 0.7) {
                // Create weighted array of neighboring types
                const weightedTypes = [];
                Object.entries(neighborTypes).forEach(([type, count]) => {
                    for (let i = 0; i < count; i++) {
                        weightedTypes.push(type);
                    }
                });
                return weightedTypes[Math.floor(Math.random() * weightedTypes.length)];
            }
        }
        
        // Otherwise use noise value to determine type
        const index = Math.floor(noiseValue * territoryTypes.length);
        return territoryTypes[index];
    }
    
    /**
     * Add a visual icon for each territory type
     */
    addTerritoryIcon(territory) {
        // For now, just use a colored dot to represent territory type
        const icon = this.add.circle(territory.x, territory.y, 10, TERRITORY_COLORS[territory.type], 1);
        icon.setStrokeStyle(1, 0xffffff);
        this.mapContainer.add(icon);
        
        // Store reference to the icon
        territory.icon = icon;
    }
    
    /**
     * Select a territory and show its details
     * @param {Territory} territory - The territory to select
     */
    selectTerritory(territory) {
        console.log(`Selected territory at ${territory.id} of type ${territory.type}`);
        
        // Update selected territory
        this.selectedTerritory = territory;
        
        // Change highlight for selected territory
        const visualTerritory = this.territoryMap[territory.id];
        if (visualTerritory) {
            visualTerritory.hex.setTint(0xFFFFFF);
        }
        
        // Show territory details in UI
        // For now, we'll just update a text field
        if (!this.territoryInfoText) {
            this.territoryInfoText = this.add.text(
                this.cameras.main.width - 350,
                400,
                '',
                {
                    fontFamily: 'sans-serif',
                    fontSize: '14px',
                    color: '#FFFFFF',
                    wordWrap: { width: 300 }
                }
            );
        }
        
        // Calculate territory resource production details
        let productionInfo = '';
        if (territory.construct) {
            const resourceType = territory.construct.getResourceType();
            const production = territory.calculateProduction(resourceType);
            productionInfo = `Production: ${production} ${resourceType}/cycle`;
        }
        
        // Set text with territory details
        this.territoryInfoText.setText(
            `Territory: ${territory.id}\n` +
            `Type: ${territory.type}\n` +
            `Owner: ${territory.owner ? territory.owner.name : 'None'}\n` +
            `Construct: ${territory.construct ? territory.construct.type : 'None'}\n` +
            `Level: ${territory.construct ? territory.construct.level : '-'}\n` +
            productionInfo
        );
        
        // Show territory actions panel based on state
        this.showTerritoryActions(territory);
    }
    
    /**
     * Show territory action buttons based on territory state
     * @param {Territory} territory - The selected territory
     */
    showTerritoryActions(territory) {
        // Clear existing action buttons
        if (this.actionButtons) {
            this.actionButtons.forEach(button => button.destroy());
        }
        this.actionButtons = [];
        
        const currentPlayer = this.game.getCurrentPlayer();
        const isOwned = territory.owner !== null;
        const isOwnedByCurrentPlayer = territory.owner === currentPlayer;
        const hasConstruct = territory.construct !== null;
        
        const buttonY = 530;
        const buttonWidth = 160;
        const buttonHeight = 40;
        const buttonSpacing = 50;
        const buttonStyle = {
            fontSize: '14px',
            fill: '#FFFFFF',
            backgroundColor: '#444466',
            padding: {
                x: 10,
                y: 5
            }
        };
        
        if (!isOwned) {
            // Show claim button
            const claimButton = this.add.text(
                this.cameras.main.width - 350 + buttonWidth/2,
                buttonY,
                'Claim Territory',
                buttonStyle
            ).setOrigin(0.5);
            
            claimButton.setInteractive({ useHandCursor: true });
            claimButton.on('pointerdown', () => {
                const result = this.game.assignTerritory(territory.id, currentPlayer);
                if (!result.success) {
                    // If there was an error, it will be shown via the error handler
                    console.log("Failed to claim territory:", result.message);
                }
            });
            
            this.actionButtons.push(claimButton);
        } else if (isOwnedByCurrentPlayer && !hasConstruct) {
            // Show build construct buttons based on territory type
            const constructTypeOptions = this.getCompatibleConstructTypes(territory.type);
            
            constructTypeOptions.forEach((type, index) => {
                const buildButton = this.add.text(
                    this.cameras.main.width - 350 + buttonWidth/2,
                    buttonY + index * buttonSpacing,
                    `Build ${this.formatConstructName(type)}`,
                    buttonStyle
                ).setOrigin(0.5);
                
                buildButton.setInteractive({ useHandCursor: true });
                buildButton.on('pointerdown', () => {
                    const result = this.game.createConstruct(territory.id, type, currentPlayer);
                    if (!result.success) {
                        // If there was an error, it will be shown via the error handler
                        console.log("Failed to build construct:", result.message);
                    }
                });
                
                this.actionButtons.push(buildButton);
            });
        } else if (isOwnedByCurrentPlayer && hasConstruct) {
            // Show upgrade button if construct is not max level
            if (territory.construct.level < 3) {
                const upgradeButton = this.add.text(
                    this.cameras.main.width - 350 + buttonWidth/2,
                    buttonY,
                    'Upgrade Construct',
                    buttonStyle
                ).setOrigin(0.5);
                
                upgradeButton.setInteractive({ useHandCursor: true });
                upgradeButton.on('pointerdown', () => {
                    const costs = territory.construct.getUpgradeCosts();
                    territory.construct.upgrade(costs, currentPlayer);
                    this.updateTerritoryVisuals(territory);
                });
                
                this.actionButtons.push(upgradeButton);
            }
            
            // Show add improvement button
            const improvementButton = this.add.text(
                this.cameras.main.width - 350 + buttonWidth/2,
                buttonY + buttonSpacing,
                'Add Improvement',
                buttonStyle
            ).setOrigin(0.5);
            
            improvementButton.setInteractive({ useHandCursor: true });
            improvementButton.on('pointerdown', () => {
                // Would show improvement selection UI here
                console.log('Improvement selection - to be implemented');
            });
            
            this.actionButtons.push(improvementButton);
        }
    }
    
    /**
     * Get construct types that are compatible with a territory type
     * @param {string} territoryType - Type of territory
     * @returns {Array} Array of compatible construct types
     */
    getCompatibleConstructTypes(territoryType) {
        // All territories can have any construct, but some combinations 
        // are more efficient based on territory modifiers
        const allTypes = [
            'mana_conduit',
            'vitality_well',
            'arcanum_extractor',
            'aether_resonator'
        ];
        
        // Could filter or prioritize based on territory type
        return allTypes;
    }
    
    /**
     * Format construct type into a readable name
     * @param {string} type - Construct type
     * @returns {string} Formatted name
     */
    formatConstructName(type) {
        return type
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    /**
     * This method is now a no-op since player initialization
     * is handled by the Game model when it's created
     */
    initializePlayers() {
        // Nothing to do here anymore - Game model handles this
    }
    
    setupGameControls() {
        // Camera controls are now handled by the CameraControls class
        
        // Add keyboard shortcuts
        this.input.keyboard.on('keydown-SPACE', () => {
            this.nextTurn();
        });
        
        this.input.keyboard.on('keydown-M', () => {
            console.log('Market view toggled');
            // Will implement market view in Phase 3
        });
    }
    
    /**
     * Update market prices - now handled by Game model
     */
    updateMarketPrices() {
        if (this.game && this.game.market) {
            this.game.market.updatePrices(this.game.playerCount);
        }
    }
    
    /**
     * Advance to the next player's turn
     */
    nextTurn() {
        // Advance to the next turn in the game model
        this.game.nextTurn();
        
        // Update UI
        this.updatePlayerDisplay();
    }
    
    /**
     * Update the player display based on current game state
     */
    updatePlayerDisplay() {
        const currentPlayer = this.game.getCurrentPlayer();
        this.playerText.setText(`Current Player: ${currentPlayer.name}`);
        
        // Update resource display
        this.updateResourceDisplay();
    }
    
    /**
     * Show the game over screen
     * @param {Object} data - Game over data
     */
    showGameOverScreen(data) {
        // Create an overlay for the game over screen
        this.endGame();
    }
    
    /**
     * Show game over screen with final scores
     * @param {Object} data - Final game data from Game model 
     */
    endGame(data) {
        console.log('Game over!');
        
        // Get results from model if not provided
        if (!data) {
            data = this.game.endGame();
        }
        
        const { winner, scores } = data;
        
        // Create game over overlay
        const overlay = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.7
        );
        
        // Create results panel
        const resultsPanel = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            500,
            400,
            0x222244,
            0.9
        );
        resultsPanel.setStrokeStyle(4, 0x4444AA);
        
        // Add title
        this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - 150,
            'Game Over!',
            {
                fontFamily: 'Georgia, serif',
                fontSize: '48px',
                color: '#FFD700',
                align: 'center',
                stroke: '#000',
                strokeThickness: 6
            }
        ).setOrigin(0.5);
        
        // Add winner announcement
        this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - 80,
            `Winner: ${winner.name}`,
            {
                fontFamily: 'Georgia, serif',
                fontSize: '32px',
                color: '#FFFFFF',
                align: 'center'
            }
        ).setOrigin(0.5);
        
        // Show player scores
        const scoreStartY = this.cameras.main.height / 2 - 20;
        
        scores.forEach((scoreData, index) => {
            const player = scoreData.player;
            const score = scoreData.score;
            
            // Create score text
            const textColor = player === winner ? '#FFD700' : '#FFFFFF';
            this.add.text(
                this.cameras.main.width / 2 - 180,
                scoreStartY + (index * 40),
                `${player.name}:`,
                {
                    fontFamily: 'Georgia, serif',
                    fontSize: '24px',
                    color: textColor,
                    align: 'right'
                }
            ).setOrigin(0, 0.5);
            
            this.add.text(
                this.cameras.main.width / 2 + 20,
                scoreStartY + (index * 40),
                `${score} points`,
                {
                    fontFamily: 'Georgia, serif',
                    fontSize: '24px',
                    color: textColor,
                    align: 'left'
                }
            ).setOrigin(0, 0.5);
        });
        
        // Add restart button
        const restartButton = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 150,
            200,
            50,
            0x444466
        );
        restartButton.setStrokeStyle(2, 0x8888AA);
        restartButton.setInteractive({ useHandCursor: true });
        
        const restartText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 150,
            'Play Again',
            {
                fontFamily: 'Georgia, serif',
                fontSize: '24px',
                color: '#FFFFFF'
            }
        ).setOrigin(0.5);
        
        // Button effects
        restartButton.on('pointerover', () => {
            restartButton.fillColor = 0x6666AA;
            restartText.setColor('#FFD700');
        });
        
        restartButton.on('pointerout', () => {
            restartButton.fillColor = 0x444466;
            restartText.setColor('#FFFFFF');
        });
        
        restartButton.on('pointerdown', () => {
            // Restart the game
            this.scene.start('MainMenuScene');
        });
    }
    
    update(time, delta) {
        // Update camera controls
        if (this.cameraControls) {
            this.cameraControls.update(time, delta);
        }
        
        // Update error display
        if (this.errorDisplay) {
            this.errorDisplay.update(time, delta);
        }
        
        // Update game model if needed
        // This could be used for real-time features like auction countdowns
        
        // Check for game over
        if (this.game && !this.game.paused && this.game.checkGameEnd()) {
            this.endGame();
        }
    }
}