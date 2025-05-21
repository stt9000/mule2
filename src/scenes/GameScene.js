import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.mapSize = { width: 8, height: 6 }; // 8x6 grid of territories
        this.hexSize = 100; // Size of hex tiles
    }

    create() {
        // Basic UI setup
        this.setupUI();
        
        // Create hex grid map
        this.createMap();
        
        // Initialize players (temporary placeholder)
        this.initializePlayers();
        
        // Initialize game state and controls
        this.setupGameControls();
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
        
        // Create hex grid map using placeholder graphics
        for (let y = 0; y < this.mapSize.height; y++) {
            for (let x = 0; x < this.mapSize.width; x++) {
                // Calculate hex position (using offset coordinates)
                const xPos = x * this.hexSize * 1.5;
                const yPos = y * this.hexSize * 0.866 * 2 + (x % 2) * this.hexSize * 0.866;
                
                // Create hexagon shape for the territory
                const territoryTypes = Object.values(window.gameState.TERRITORY_TYPES);
                // Randomly assign territory type for now
                const territoryType = territoryTypes[Math.floor(Math.random() * territoryTypes.length)];
                
                // Create hexagon graphics
                const hex = this.add.graphics();
                
                // Set different colors based on territory type
                switch (territoryType) {
                    case 'ancient_grove':
                        hex.fillStyle(0x228822, 1); // Green
                        break;
                    case 'crystalline_cave':
                        hex.fillStyle(0x4444FF, 1); // Blue
                        break;
                    case 'ruined_temple':
                        hex.fillStyle(0xCCCCAA, 1); // Tan
                        break;
                    case 'mountain_peak':
                        hex.fillStyle(0x888888, 1); // Gray
                        break;
                    case 'marshland':
                        hex.fillStyle(0x557733, 1); // Olive
                        break;
                    case 'volcanic_field':
                        hex.fillStyle(0xAA4422, 1); // Reddish brown
                        break;
                }
                
                // Draw hexagon
                hex.lineStyle(2, 0xFFFFFF, 1);
                
                // Create points for hexagon
                const points = [];
                for (let i = 0; i < 6; i++) {
                    const angle = Math.PI / 3 * i;
                    points.push({
                        x: xPos + Math.cos(angle) * this.hexSize,
                        y: yPos + Math.sin(angle) * this.hexSize
                    });
                }
                
                // Draw filled hexagon
                hex.beginPath();
                hex.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < 6; i++) {
                    hex.lineTo(points[i].x, points[i].y);
                }
                hex.closePath();
                hex.fillPath();
                hex.strokePath();
                
                // Store territory data
                const territory = {
                    id: `${x}-${y}`,
                    type: territoryType,
                    x: xPos,
                    y: yPos,
                    graphics: hex,
                    owner: null,
                    construct: null,
                    improvements: []
                };
                
                this.territories.push(territory);
                
                // Make territory interactive
                const hitArea = new Phaser.Geom.Polygon(points);
                const hitAreaCallback = Phaser.Geom.Polygon.Contains;
                
                // Create invisible interactive zone
                const zone = this.add.zone(xPos, yPos, this.hexSize * 2, this.hexSize * 2)
                    .setInteractive(hitArea, hitAreaCallback)
                    .setData('territory', territory);
                    
                zone.on('pointerdown', () => {
                    this.selectTerritory(territory);
                });
                
                zone.on('pointerover', () => {
                    hex.lineStyle(3, 0xFFFF00, 1);
                    hex.strokePath();
                });
                
                zone.on('pointerout', () => {
                    hex.lineStyle(2, 0xFFFFFF, 1);
                    hex.strokePath();
                });
            }
        }
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
        // Create four players for testing
        window.gameState.players = [
            {
                id: 1,
                name: 'Player 1',
                color: 0xFF0000,
                gold: 1000,
                resources: {
                    mana: 0,
                    vitality: 0,
                    arcanum: 0,
                    aether: 0
                },
                territories: [],
                constructs: []
            },
            {
                id: 2,
                name: 'Player 2',
                color: 0x0000FF,
                gold: 1000,
                resources: {
                    mana: 0,
                    vitality: 0,
                    arcanum: 0,
                    aether: 0
                },
                territories: [],
                constructs: []
            },
            {
                id: 3,
                name: 'Player 3',
                color: 0x00FF00,
                gold: 1000,
                resources: {
                    mana: 0,
                    vitality: 0,
                    arcanum: 0,
                    aether: 0
                },
                territories: [],
                constructs: []
            },
            {
                id: 4,
                name: 'Player 4',
                color: 0xFFFF00,
                gold: 1000,
                resources: {
                    mana: 0,
                    vitality: 0,
                    arcanum: 0,
                    aether: 0
                },
                territories: [],
                constructs: []
            }
        ];
        
        window.gameState.currentPlayerIndex = 0;
        this.updatePlayerDisplay();
    }
    
    setupGameControls() {
        // Add camera controls for panning around the map
        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown && !pointer.wasTouch) {
                this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
                this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
            }
        });
        
        // Add zoom controls
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            const newZoom = this.cameras.main.zoom - deltaY * 0.001;
            this.cameras.main.setZoom(Phaser.Math.Clamp(newZoom, 0.5, 2));
        });
    }
    
    nextTurn() {
        // Advance to next player
        window.gameState.currentPlayerIndex = (window.gameState.currentPlayerIndex + 1) % window.gameState.players.length;
        
        // If we've gone through all players, advance to next cycle
        if (window.gameState.currentPlayerIndex === 0) {
            window.gameState.currentCycle++;
            
            if (window.gameState.currentCycle > window.gameState.totalCycles) {
                this.endGame();
                return;
            }
            
            // Produce resources for all territories
            this.produceResources();
            
            // Update cycle display
            this.cycleText.setText(`Cycle: ${window.gameState.currentCycle}/${window.gameState.totalCycles}`);
        }
        
        this.updatePlayerDisplay();
    }
    
    updatePlayerDisplay() {
        const currentPlayer = window.gameState.players[window.gameState.currentPlayerIndex];
        this.playerText.setText(`Current Player: ${currentPlayer.name}`);
        
        // Update resource display
        for (const [key, text] of Object.entries(this.resourceTexts)) {
            text.setText(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${currentPlayer.resources[key]} (${window.gameState.marketPrices[key]} gp)`);
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
                
                // Apply territory type modifier
                switch (territory.type) {
                    case 'ancient_grove':
                        if (territory.construct.type === 'vitality_well') production += 5;
                        break;
                    case 'crystalline_cave':
                        if (territory.construct.type === 'mana_conduit') production += 5;
                        break;
                    case 'ruined_temple':
                        if (territory.construct.type === 'arcanum_extractor') production += 5;
                        break;
                    case 'volcanic_field':
                        if (territory.construct.type === 'aether_resonator') production += 5;
                        break;
                }
                
                // Add resources to player
                const resourceType = this.getResourceTypeForConstruct(territory.construct.type);
                territory.owner.resources[resourceType] += production;
            }
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
        
        window.gameState.players.forEach(player => {
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
        
        // Show end game screen
        // For now, just show a message
        this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            400,
            200,
            0x000000,
            0.8
        );
        
        this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - 40,
            'Game Over!',
            {
                fontFamily: 'Georgia, serif',
                fontSize: '32px',
                color: '#FFD700',
                align: 'center'
            }
        ).setOrigin(0.5);
        
        this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 10,
            `Winner: ${winner.name}`,
            {
                fontFamily: 'sans-serif',
                fontSize: '24px',
                color: '#FFFFFF',
                align: 'center'
            }
        ).setOrigin(0.5);
    }
    
    update() {
        // Game update logic
    }
}