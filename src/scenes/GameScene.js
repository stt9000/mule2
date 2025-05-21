import Phaser from 'phaser';
import HexUtils from '../utils/HexUtils';
import CameraControls from '../utils/CameraControls';
import { GAME_SETTINGS, TERRITORY_TYPES, TERRITORY_COLORS } from '../config/gameConfig';

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
        
        // Set camera bounds based on map size
        const mapWidth = this.mapSize.width * this.hexUtils.width * 0.75;
        const mapHeight = this.mapSize.height * this.hexUtils.height + this.hexUtils.height / 2;
        this.cameraControls.setBounds(0, 0, mapWidth, mapHeight);
        this.cameraControls.centerOn(mapWidth / 2, mapHeight / 2);
    }
    
    initializeGameData() {
        // Initialize players
        this.initializePlayers();
        
        // Initialize market prices
        this.updateMarketPrices();
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
        this.territories = [];
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
                
                // Store territory data with axial coordinates
                const territory = {
                    id: `${q},${r}`,
                    q: q,
                    r: r,
                    type: territoryType,
                    x: pos.x,
                    y: pos.y,
                    hex: hex,
                    owner: null,
                    construct: null,
                    improvements: []
                };
                
                this.territories.push(territory);
                this.territoryMap[`${q},${r}`] = territory;
                
                // Make territory interactive
                hex.setInteractive();
                hex.on('pointerdown', () => {
                    this.selectTerritory(territory);
                });
                
                hex.on('pointerover', () => {
                    hex.setTint(0xFFFF00); // Highlight on hover
                });
                
                hex.on('pointerout', () => {
                    // Reset to original color
                    hex.setTint(TERRITORY_COLORS[territoryType]);
                    
                    // If this is the selected territory, keep it highlighted differently
                    if (this.selectedTerritory === territory) {
                        hex.setTint(0xFFFFFF);
                    }
                });
                
                // Add a small icon to represent the territory type
                this.addTerritoryIcon(territory);
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
    
    selectTerritory(territory) {
        console.log(`Selected territory at ${territory.id} of type ${territory.type}`);
        
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
        
        // Set text with territory details
        this.territoryInfoText.setText(
            `Territory: ${territory.id}\n` +
            `Type: ${territory.type}\n` +
            `Owner: ${territory.owner ? territory.owner.name : 'None'}\n` +
            `Construct: ${territory.construct ? territory.construct.type : 'None'}`
        );
    }
    
    initializePlayers() {
        // Create game state object
        this.gameState = {
            players: [],
            currentPlayerIndex: 0,
            currentCycle: 1,
            totalCycles: GAME_SETTINGS.TOTAL_CYCLES,
            marketPrices: {}
        };
        
        // Create four players for testing
        const playerColors = [0xFF0000, 0x0000FF, 0x00FF00, 0xFFFF00];
        
        for (let i = 0; i < 4; i++) {
            this.gameState.players.push({
                id: i + 1,
                name: `Player ${i + 1}`,
                color: playerColors[i],
                gold: GAME_SETTINGS.STARTING_GOLD,
                resources: {
                    mana: 0,
                    vitality: 0,
                    arcanum: 0,
                    aether: 0
                },
                territories: [],
                constructs: []
            });
        }
        
        this.gameState.currentPlayerIndex = 0;
        this.updatePlayerDisplay();
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
    
    // Add a method to update market prices
    updateMarketPrices() {
        // Import from config later
        const { BASE_PRICES } = require('../config/gameConfig');
        
        // Initialize market prices with base prices
        this.gameState.marketPrices = { ...BASE_PRICES };
    }
    
    nextTurn() {
        // Advance to next player
        this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % this.gameState.players.length;
        
        // If we've gone through all players, advance to next cycle
        if (this.gameState.currentPlayerIndex === 0) {
            this.gameState.currentCycle++;
            
            if (this.gameState.currentCycle > this.gameState.totalCycles) {
                this.endGame();
                return;
            }
            
            // Produce resources for all territories
            this.produceResources();
            
            // Update cycle display
            this.cycleText.setText(`Cycle: ${this.gameState.currentCycle}/${this.gameState.totalCycles}`);
        }
        
        this.updatePlayerDisplay();
    }
    
    updatePlayerDisplay() {
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
        this.playerText.setText(`Current Player: ${currentPlayer.name}`);
        
        // Update resource display
        for (const [key, text] of Object.entries(this.resourceTexts)) {
            text.setText(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${currentPlayer.resources[key]} (${this.gameState.marketPrices[key]} gp)`);
        }
        
        // Update gold display
        this.goldText.setText(`Gold: ${currentPlayer.gold}`);
    }
    
    produceResources() {
        // Calculate resource production for all territories with constructs
        this.territories.forEach(territory => {
            if (territory.owner !== null && territory.construct !== null) {
                // For now, use a simple production formula
                // Later, we'll implement the full formula from the design doc
                let production = 10; // Base production
                
                // Get resource type for this construct
                const resourceType = this.getResourceTypeForConstruct(territory.construct.type);
                
                // Apply territory modifiers based on config
                const territoryModifiers = require('../config/gameConfig').TERRITORY_MODIFIERS;
                const modifiers = territoryModifiers[territory.type];
                
                if (modifiers && modifiers[resourceType]) {
                    production += production * modifiers[resourceType];
                }
                
                // Add resources to player
                territory.owner.resources[resourceType] += Math.floor(production);
            }
        });
        
        // Apply resource decay
        const decayRates = require('../config/gameConfig').DECAY_RATES;
        this.gameState.players.forEach(player => {
            Object.entries(decayRates).forEach(([resourceType, rate]) => {
                if (rate > 0) {
                    // Calculate how much is lost to decay
                    const amountDecayed = Math.floor(player.resources[resourceType] * rate);
                    player.resources[resourceType] -= amountDecayed;
                }
            });
        });
    }
    
    getResourceTypeForConstruct(constructType) {
        switch (constructType) {
            case 'mana_conduit': return 'mana';
            case 'vitality_well': return 'vitality';
            case 'arcanum_extractor': return 'arcanum';
            case 'aether_resonator': return 'aether';
            default: return 'mana';
        }
    }
    
    endGame() {
        console.log('Game over!');
        // Calculate final scores
        let highestScore = 0;
        let winner = null;
        
        this.gameState.players.forEach(player => {
            // Calculate score using formula from game description
            const score = 
                player.gold * 1 +
                player.territories.length * 50 +
                player.constructs.length * 75 +
                // Sum of construct levels * 25
                player.constructs.reduce((sum, construct) => sum + construct.level * 25, 0) +
                // Sum of resources * 2
                (player.resources.mana + 
                 player.resources.vitality + 
                 player.resources.arcanum + 
                 player.resources.aether) * 2;
                 
            if (score > highestScore) {
                highestScore = score;
                winner = player;
            }
        });
        
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
        
        this.gameState.players.forEach((player, index) => {
            // Calculate score for this player
            const score = 
                player.gold * 1 +
                player.territories.length * 50 +
                player.constructs.length * 75 +
                player.constructs.reduce((sum, construct) => sum + construct.level * 25, 0) +
                (player.resources.mana + 
                 player.resources.vitality + 
                 player.resources.arcanum + 
                 player.resources.aether) * 2;
            
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
    }
}