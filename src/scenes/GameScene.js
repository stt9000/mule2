import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.mapSize = { width: 8, height: 6 }; // 8x6 grid of territories
        this.hexSize = 100; // Size of hex tiles
    }

    create() {
        console.log("GameScene created");
        
        // Initialize game state if it doesn't exist yet
        if (!window.gameState) {
            window.gameState = {
                currentCycle: 1,
                totalCycles: 12,
                currentPlayerIndex: 0,
                players: [],
                marketPrices: {
                    mana: 50,
                    vitality: 40,
                    arcanum: 60,
                    aether: 70
                },
                TERRITORY_TYPES: {
                    ANCIENT_GROVE: 'ancient_grove',
                    CRYSTALLINE_CAVE: 'crystalline_cave',
                    RUINED_TEMPLE: 'ruined_temple',
                    MOUNTAIN_PEAK: 'mountain_peak',
                    MARSHLAND: 'marshland',
                    VOLCANIC_FIELD: 'volcanic_field'
                }
            };
        }
        
        // Connect to DOM UI
        this.setupUI();
        
        // Create hex grid map
        this.createMap();
        
        // Initialize players (temporary placeholder)
        this.initializePlayers();
        
        // Initialize game state and controls
        this.setupGameControls();
        
        // Configure camera to show the entire map
        this.setupCamera();
    }
    
    // Set up camera to show the entire map
    setupCamera() {
        // Calculate the bounds of the entire map
        const mapWidth = this.mapSize.width * this.hexSize * 1.5;
        const mapHeight = this.mapSize.height * this.hexSize * 0.866 * 2;
        
        // Center the camera on the map
        this.cameras.main.centerOn(mapWidth / 2, mapHeight / 2);
        
        // Determine appropriate zoom level to show the entire map
        const widthRatio = this.cameras.main.width / mapWidth;
        const heightRatio = this.cameras.main.height / mapHeight;
        
        // Use the smaller ratio to ensure everything fits
        const zoom = Math.min(widthRatio, heightRatio) * 0.8; // 80% to add some margin
        
        // Set zoom level
        this.cameras.main.setZoom(zoom);
        
        console.log(`Map size: ${mapWidth}x${mapHeight}, Camera zoom: ${zoom}`);
    }
    
    setupUI() {
        console.log("Setting up UI...");
        
        // Store references to DOM UI elements
        this.cycleText = document.getElementById('game-cycle');
        this.playerText = document.getElementById('player-name');
        this.playerColor = document.getElementById('player-color');
        this.goldText = document.getElementById('gold-display');
        this.territoryDetails = document.getElementById('territory-details');
        
        // Store references to resource displays
        this.manaDisplay = document.getElementById('mana-display');
        this.vitalityDisplay = document.getElementById('vitality-display');
        this.arcanumDisplay = document.getElementById('arcanum-display');
        this.aetherDisplay = document.getElementById('aether-display');
        
        console.log("UI elements found:", {
            cycleText: !!this.cycleText,
            playerText: !!this.playerText,
            playerColor: !!this.playerColor,
            goldText: !!this.goldText,
            territoryDetails: !!this.territoryDetails
        });
        
        // Set up button event listeners
        document.getElementById('end-turn-btn').addEventListener('click', () => {
            console.log("End turn button clicked");
            this.nextTurn();
        });
        
        document.getElementById('buy-land-btn').addEventListener('click', () => {
            console.log("Buy land button clicked");
            this.setSelectMode('buy-land');
        });
        
        document.getElementById('harvest-btn').addEventListener('click', () => {
            console.log("Harvest resources button clicked");
            this.harvestResources();
        });
        
        document.getElementById('upgrade-btn').addEventListener('click', () => {
            console.log("Upgrade territory button clicked");
            this.setSelectMode('upgrade');
        });
    }
    
    setSelectMode(mode) {
        this.selectMode = mode;
        console.log(`Select mode set to: ${mode}`);
        
        // Reset all button styles
        const buttons = [
            document.getElementById('buy-land-btn'),
            document.getElementById('upgrade-btn'),
            document.getElementById('harvest-btn')
        ];
        
        buttons.forEach(button => {
            if (button) {
                button.style.backgroundColor = '#4a5aa8';
                button.style.transform = 'scale(1)';
            }
        });
        
        // Highlight the selected button
        if (mode) {
            const activeButton = document.getElementById(`${mode}-btn`);
            if (activeButton) {
                activeButton.style.backgroundColor = '#7a8ad8';
                activeButton.style.transform = 'scale(1.05)';
            }
            
            // Show a helpful message
            this.showStatusMessage(`Click on a territory to ${mode.replace('-', ' ')}`);
        }
    }
    
    showStatusMessage(message) {
        // Create or update status message
        if (!this.statusMessage) {
            const messageContainer = document.createElement('div');
            messageContainer.id = 'status-message';
            messageContainer.style.position = 'absolute';
            messageContainer.style.bottom = '20px';
            messageContainer.style.left = '50%';
            messageContainer.style.transform = 'translateX(-50%)';
            messageContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            messageContainer.style.color = 'white';
            messageContainer.style.padding = '10px 20px';
            messageContainer.style.borderRadius = '5px';
            messageContainer.style.fontSize = '18px';
            messageContainer.style.zIndex = '100';
            messageContainer.style.pointerEvents = 'none'; // Don't block clicks
            
            document.getElementById('game-container').appendChild(messageContainer);
            this.statusMessage = messageContainer;
        }
        
        this.statusMessage.textContent = message;
        
        // Clear the message after 3 seconds
        if (this.statusMessageTimeout) {
            clearTimeout(this.statusMessageTimeout);
        }
        
        this.statusMessageTimeout = setTimeout(() => {
            if (this.statusMessage) {
                this.statusMessage.textContent = '';
            }
        }, 3000);
    }
    
    harvestResources() {
        console.log("Harvesting resources...");
        // Implement resource harvesting logic
    }
    
    createMap() {
        this.territories = [];
        
        // First, reduce hex size to ensure entire grid fits
        this.hexSize = 60; // Smaller hexes for better fit
        
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
                
                // Make territory interactive - use a simpler hit area
                // Directly make the graphics object interactive for more accurate hit detection
                hex.setInteractive(new Phaser.Geom.Polygon(points), Phaser.Geom.Polygon.Contains)
                   .setData('territory', territory);
                
                hex.on('pointerdown', () => {
                    this.selectTerritory(territory);
                });
                
                hex.on('pointerover', () => {
                    hex.lineStyle(3, 0xFFFF00, 1);
                    hex.strokePath();
                    
                    // Change cursor to show it's clickable
                    this.game.canvas.style.cursor = 'pointer';
                });
                
                hex.on('pointerout', () => {
                    hex.lineStyle(2, 0xFFFFFF, 1);
                    hex.strokePath();
                    
                    // Reset cursor
                    this.game.canvas.style.cursor = 'default';
                });
            }
        }
    }
    
    selectTerritory(territory) {
        console.log(`Selected territory at ${territory.id} of type ${territory.type}`);
        
        // Track the time of the last territory selection to prevent accidental double selections
        const now = Date.now();
        if (this.lastTerritorySelectTime && now - this.lastTerritorySelectTime < 300) {
            console.log("Preventing rapid territory selection");
            return; // Ignore rapid selections
        }
        this.lastTerritorySelectTime = now;
        
        // Clear previous selection highlight if any
        if (this.selectedTerritory && this.selectionHighlight) {
            this.selectionHighlight.destroy();
        }
        
        // Store reference to selected territory
        this.selectedTerritory = territory;
        
        // Create a selection highlight
        const highlightPoints = [];
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i;
            highlightPoints.push({
                x: territory.x + Math.cos(angle) * (this.hexSize + 5),
                y: territory.y + Math.sin(angle) * (this.hexSize + 5)
            });
        }
        
        // Draw selection highlight
        this.selectionHighlight = this.add.graphics();
        this.selectionHighlight.lineStyle(3, 0xFFFF00, 0.8);
        this.selectionHighlight.beginPath();
        this.selectionHighlight.moveTo(highlightPoints[0].x, highlightPoints[0].y);
        for (let i = 1; i < 6; i++) {
            this.selectionHighlight.lineTo(highlightPoints[i].x, highlightPoints[i].y);
        }
        this.selectionHighlight.closePath();
        this.selectionHighlight.strokePath();
        
        // Add pulsing animation to the selection
        this.tweens.add({
            targets: this.selectionHighlight,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1
        });
        
        // Update territory details in HTML UI
        if (this.territoryDetails) {
            const constructLevel = territory.construct ? territory.construct.level : 0;
            const constructInfo = territory.construct ? 
                `${this.formatTerritoryType(territory.construct.type)} (Level ${constructLevel})` : 
                'None';
                
            this.territoryDetails.innerHTML = `
                <div>
                    <p><strong>Territory ID:</strong> ${territory.id}</p>
                    <p><strong>Type:</strong> ${this.formatTerritoryType(territory.type)}</p>
                    <p><strong>Owner:</strong> ${territory.owner ? territory.owner.name : 'None'}</p>
                    <p><strong>Construct:</strong> ${constructInfo}</p>
                    ${territory.owner ? `<p><strong>Resource Production:</strong> ${this.calculateProduction(territory)} per cycle</p>` : ''}
                </div>
            `;
        }
        
        // Take action based on current selection mode
        if (this.selectMode === 'buy-land') {
            // Only proceed if the territory doesn't already have an action in progress
            if (!territory.actionInProgress) {
                territory.actionInProgress = true;
                this.buyLand(territory);
                setTimeout(() => { territory.actionInProgress = false; }, 500); // Prevent rapid actions
            }
        } else if (this.selectMode === 'upgrade') {
            // Only proceed if the territory doesn't already have an action in progress
            if (!territory.actionInProgress) {
                territory.actionInProgress = true;
                this.upgradeTerritory(territory);
                setTimeout(() => { territory.actionInProgress = false; }, 500); // Prevent rapid actions
            }
        }
    }
    
    calculateProduction(territory) {
        if (!territory.owner || !territory.construct) return 0;
        
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
        
        // Apply construct level modifier
        production += (territory.construct.level - 1) * 5;
        
        return production;
    }
    
    formatTerritoryType(type) {
        return type.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    buyLand(territory) {
        const currentPlayer = window.gameState.players[window.gameState.currentPlayerIndex];
        
        if (territory.owner) {
            this.showStatusMessage("Territory already owned!");
            return;
        }
        
        const cost = 100; // Basic cost for now
        
        if (currentPlayer.gold >= cost) {
            // Deduct gold
            currentPlayer.gold -= cost;
            
            // Assign territory to player
            territory.owner = currentPlayer;
            currentPlayer.territories.push(territory);
            
            // Clear existing graphics and redraw with player color border
            territory.graphics.clear();
            
            // Set fill color based on territory type
            switch (territory.type) {
                case 'ancient_grove':
                    territory.graphics.fillStyle(0x228822, 1); // Green
                    break;
                case 'crystalline_cave':
                    territory.graphics.fillStyle(0x4444FF, 1); // Blue
                    break;
                case 'ruined_temple':
                    territory.graphics.fillStyle(0xCCCCAA, 1); // Tan
                    break;
                case 'mountain_peak':
                    territory.graphics.fillStyle(0x888888, 1); // Gray
                    break;
                case 'marshland':
                    territory.graphics.fillStyle(0x557733, 1); // Olive
                    break;
                case 'volcanic_field':
                    territory.graphics.fillStyle(0xAA4422, 1); // Reddish brown
                    break;
            }
            
            // Draw hexagon points
            const xPos = territory.x;
            const yPos = territory.y;
            const points = [];
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 3 * i;
                points.push({
                    x: xPos + Math.cos(angle) * this.hexSize,
                    y: yPos + Math.sin(angle) * this.hexSize
                });
            }
            
            // Draw filled hexagon with player color border
            territory.graphics.lineStyle(4, currentPlayer.color, 1);
            territory.graphics.beginPath();
            territory.graphics.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < 6; i++) {
                territory.graphics.lineTo(points[i].x, points[i].y);
            }
            territory.graphics.closePath();
            territory.graphics.fillPath();
            territory.graphics.strokePath();
            
            // Flash effect for feedback
            this.tweens.add({
                targets: territory.graphics,
                alpha: 0.3,
                duration: 100,
                yoyo: true,
                repeat: 3,
                onComplete: () => {
                    territory.graphics.alpha = 1;
                }
            });
            
            // Add ownership marker
            const ownershipMarker = this.add.circle(xPos, yPos, this.hexSize / 4, currentPlayer.color);
            territory.ownershipMarker = ownershipMarker;
            
            // Update UI
            this.updatePlayerDisplay();
            this.selectTerritory(territory); // Refresh territory details
            
            // Show success message
            this.showStatusMessage(`${currentPlayer.name} bought territory ${territory.id} for ${cost} gold`);
            
            // Reset select mode
            this.selectMode = null;
            this.setSelectMode(null);
            
        } else {
            this.showStatusMessage(`Not enough gold! You need ${cost} gold.`);
        }
    }
    
    upgradeTerritory(territory) {
        console.log(`=== UPGRADE TERRITORY FUNCTION START ===`);
        const currentPlayer = window.gameState.players[window.gameState.currentPlayerIndex];
        
        // Check if player owns this territory
        if (!territory.owner || territory.owner !== currentPlayer) {
            this.showStatusMessage("You don't own this territory!");
            console.log(`Player doesn't own territory, can't upgrade`);
            return;
        }
        
        // Check if we're building a new construct or upgrading existing
        const buildingNew = !territory.construct;
        console.log(`Building new: ${buildingNew}`);
        
        if (buildingNew) {
            // BUILDING NEW CONSTRUCT
            
            // Determine construct type based on territory
            const constructType = this.getDefaultConstructType(territory.type);
            const buildCost = 200; // Fixed cost for new constructs
            
            console.log(`Building new ${constructType} (cost: ${buildCost}, player gold: ${currentPlayer.gold})`);
            
            if (currentPlayer.gold >= buildCost) {
                console.log(`Player has enough gold to build`);
                
                // Deduct gold from player
                currentPlayer.gold -= buildCost;
                
                // Create the construct data object
                const newConstruct = {
                    type: constructType,
                    level: 1
                };
                
                // Store the construct on territory and player
                territory.construct = newConstruct;
                currentPlayer.constructs.push(newConstruct);
                
                console.log(`Created new construct of type ${constructType} at level 1`);
                
                // Clean up any existing visuals
                if (territory.constructGraphic) {
                    territory.constructGraphic.destroy();
                }
                if (territory.constructText) {
                    territory.constructText.destroy();
                }
                
                // Create visual representation
                const constructGraphic = this.add.graphics();
                constructGraphic.fillStyle(0xFFFFFF, 0.8);
                constructGraphic.fillCircle(territory.x, territory.y, this.hexSize / 3);
                
                // Create level text
                const constructText = this.add.text(territory.x, territory.y, "1", {
                    font: '24px Arial',
                    fill: '#000000'
                }).setOrigin(0.5);
                
                // Store references to graphics objects
                territory.constructGraphic = constructGraphic;
                territory.constructText = constructText;
                
                // Add flash effect for feedback
                this.tweens.add({
                    targets: [constructGraphic, constructText],
                    alpha: 0.3,
                    duration: 150,
                    yoyo: true,
                    repeat: 3
                });
                
                // Update UI
                this.updatePlayerDisplay();
                this.selectTerritory(territory); // Refresh territory details
                
                this.showStatusMessage(`Built ${this.formatTerritoryType(constructType)} on territory ${territory.id} for ${buildCost} gold`);
            } else {
                console.log(`Not enough gold to build (need ${buildCost}, have ${currentPlayer.gold})`);
                this.showStatusMessage(`Not enough gold to build! You need ${buildCost} gold.`);
            }
        } else {
            // UPGRADING EXISTING CONSTRUCT
            
            // Retrieve current level directly from territory
            let currentLevel = territory.construct.level;
            
            // Ensure level is a number
            if (typeof currentLevel !== 'number') {
                currentLevel = parseInt(currentLevel) || 1;
                territory.construct.level = currentLevel;
            }
            
            // Calculate upgrade cost
            const upgradeCost = 150 * currentLevel;
            
            console.log(`Upgrading existing construct: current level ${currentLevel}, cost ${upgradeCost}, player gold ${currentPlayer.gold}`);
            
            // Check if upgrade is possible
            if (currentLevel >= 3) {
                console.log(`Construct already at max level (${currentLevel})`);
                this.showStatusMessage("Construct already at maximum level!");
                return;
            }
            
            if (currentPlayer.gold < upgradeCost) {
                console.log(`Not enough gold to upgrade (need ${upgradeCost}, have ${currentPlayer.gold})`);
                this.showStatusMessage(`Not enough gold to upgrade! You need ${upgradeCost} gold.`);
                return;
            }
            
            // Everything is fine, proceed with upgrade
            console.log(`Proceeding with upgrade from ${currentLevel} to ${currentLevel + 1}`);
            
            // Deduct gold
            currentPlayer.gold -= upgradeCost;
            
            // Increment level by exactly one
            territory.construct.level = currentLevel + 1;
            const newLevel = territory.construct.level;
            
            console.log(`Construct level after upgrade: ${newLevel}`);
            
            // Update level text
            if (territory.constructText) {
                territory.constructText.setText(newLevel.toString());
                
                // Add pulse effect for feedback
                this.tweens.add({
                    targets: territory.constructText,
                    scale: 1.5,
                    duration: 200,
                    yoyo: true,
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                        territory.constructText.setScale(1); // Ensure it resets properly
                    }
                });
            } else {
                console.log(`Warning: No construct text found to update`);
            }
            
            // Update UI
            this.updatePlayerDisplay();
            this.selectTerritory(territory); // Refresh territory details
            
            this.showStatusMessage(`Upgraded construct to level ${newLevel} for ${upgradeCost} gold`);
        }
        
        // Reset selection mode
        console.log(`=== UPGRADE TERRITORY FUNCTION END ===`);
        this.selectMode = null;
        this.setSelectMode(null);
    }
    
    getDefaultConstructType(territoryType) {
        switch (territoryType) {
            case 'ancient_grove': return 'vitality_well';
            case 'crystalline_cave': return 'mana_conduit';
            case 'ruined_temple': return 'arcanum_extractor';
            case 'volcanic_field': return 'aether_resonator';
            default: return 'basic_extractor';
        }
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
        window.gameState.currentCycle = 1;
        window.gameState.totalCycles = 12;
        
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
        
        // Store initial zoom for reference
        this.initialZoom = this.cameras.main.zoom;
        
        // Add zoom controls with less sensitivity and better limits
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            // Reduce sensitivity
            const zoomChange = deltaY * 0.0005;
            
            // Calculate new zoom with limits relative to initial zoom
            const minZoom = this.initialZoom * 0.5;  // Don't zoom out too far
            const maxZoom = this.initialZoom * 2.0;  // Don't zoom in too much
            
            const newZoom = Phaser.Math.Clamp(
                this.cameras.main.zoom - zoomChange,
                minZoom,
                maxZoom
            );
            
            this.cameras.main.setZoom(newZoom);
        });
        
        // Use a better double-click detection
        this.lastClickTime = 0;
        
        this.input.on('pointerdown', (pointer) => {
            const currentTime = new Date().getTime();
            const timeSinceLastClick = currentTime - this.lastClickTime;
            
            if (timeSinceLastClick < 300) {
                console.log("Double click detected - resetting view");
                
                // Reset zoom and position
                this.cameras.main.setZoom(this.initialZoom);
                
                // Recenter on map
                const mapWidth = this.mapSize.width * this.hexSize * 1.5;
                const mapHeight = this.mapSize.height * this.hexSize * 0.866 * 2;
                this.cameras.main.centerOn(mapWidth / 2, mapHeight / 2);
                
                this.showStatusMessage("View reset to default");
            }
            
            this.lastClickTime = currentTime;
        });
        
        // Add a reset button to the UI
        const resetButton = document.createElement('button');
        resetButton.id = 'reset-view-btn';
        resetButton.textContent = 'Reset View';
        resetButton.style.backgroundColor = '#4a5aa8';
        resetButton.style.color = 'white';
        resetButton.style.border = 'none';
        resetButton.style.padding = '10px 15px';
        resetButton.style.borderRadius = '5px';
        resetButton.style.cursor = 'pointer';
        resetButton.style.marginTop = '10px';
        
        resetButton.addEventListener('click', () => {
            console.log("Reset view button clicked");
            
            // Reset zoom and position
            this.cameras.main.setZoom(this.initialZoom);
            
            // Recenter on map
            const mapWidth = this.mapSize.width * this.hexSize * 1.5;
            const mapHeight = this.mapSize.height * this.hexSize * 0.866 * 2;
            this.cameras.main.centerOn(mapWidth / 2, mapHeight / 2);
            
            this.showStatusMessage("View reset to default");
        });
        
        // Add button to menu container
        const menuContainer = document.getElementById('menu-container');
        if (menuContainer) {
            menuContainer.appendChild(resetButton);
        }
        
        // Add keyboard shortcut 'R' to reset view
        this.input.keyboard.on('keydown-R', () => {
            console.log("R key pressed - resetting view");
            
            // Reset zoom and position
            this.cameras.main.setZoom(this.initialZoom);
            
            // Recenter on map
            const mapWidth = this.mapSize.width * this.hexSize * 1.5;
            const mapHeight = this.mapSize.height * this.hexSize * 0.866 * 2;
            this.cameras.main.centerOn(mapWidth / 2, mapHeight / 2);
            
            this.showStatusMessage("View reset to default");
        });
    }
    
    nextTurn() {
        // Visual feedback for button press
        const endTurnBtn = document.getElementById('end-turn-btn');
        if (endTurnBtn) {
            endTurnBtn.style.backgroundColor = '#2a3a98'; // Darker color for feedback
            
            // Reset after a short delay
            setTimeout(() => {
                endTurnBtn.style.backgroundColor = '#4a5aa8';
            }, 200);
        }
        
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
            
            // Show cycle notification
            this.showStatusMessage(`Starting Cycle ${window.gameState.currentCycle}!`);
        } else {
            // Show player turn notification
            const currentPlayer = window.gameState.players[window.gameState.currentPlayerIndex];
            this.showStatusMessage(`${currentPlayer.name}'s turn!`);
        }
        
        // Update display
        this.updatePlayerDisplay();
        
        // Reset any selection modes
        this.selectMode = null;
        this.setSelectMode(null); // This will reset button highlights
        
        // Clear territory selection
        if (this.selectedTerritory && this.selectionHighlight) {
            this.selectionHighlight.destroy();
            this.selectedTerritory = null;
            
            // Reset territory details
            if (this.territoryDetails) {
                this.territoryDetails.innerHTML = '<p>No territory selected</p>';
            }
        }
    }
    
    updatePlayerDisplay() {
        // Update UI with current player info
        if (!window.gameState || !window.gameState.players) {
            console.error("Game state or players not initialized");
            return;
        }
        
        const currentPlayer = window.gameState.players[window.gameState.currentPlayerIndex];
        
        if (this.cycleText) {
            this.cycleText.textContent = `${window.gameState.currentCycle}`;
        }
        
        if (this.playerText) {
            this.playerText.textContent = currentPlayer.name;
        }
        
        if (this.playerColor) {
            // Convert hex color to CSS
            const hexColor = '#' + currentPlayer.color.toString(16).padStart(6, '0');
            this.playerColor.style.backgroundColor = hexColor;
        }
        
        if (this.goldText) {
            this.goldText.textContent = currentPlayer.gold;
        }
        
        // Update resource displays
        if (this.manaDisplay) {
            this.manaDisplay.textContent = currentPlayer.resources.mana;
        }
        
        if (this.vitalityDisplay) {
            this.vitalityDisplay.textContent = currentPlayer.resources.vitality;
        }
        
        if (this.arcanumDisplay) {
            this.arcanumDisplay.textContent = currentPlayer.resources.arcanum;
        }
        
        if (this.aetherDisplay) {
            this.aetherDisplay.textContent = currentPlayer.resources.aether;
        }
    }
    
    produceResources() {
        console.log("=== RESOURCE PRODUCTION START ===");
        console.log("Producing resources for cycle", window.gameState.currentCycle);
        
        // Track total production for each player
        const productionSummary = {};
        window.gameState.players.forEach(player => {
            productionSummary[player.name] = {
                mana: 0,
                vitality: 0,
                arcanum: 0,
                aether: 0
            };
        });
        
        // Calculate resource production for all territories with constructs
        this.territories.forEach(territory => {
            if (territory.owner !== null && territory.construct !== null) {
                // Base production
                let production = 10;
                
                // Apply territory type modifier (bonus for matching construct type)
                let typeBonus = 0;
                switch (territory.type) {
                    case 'ancient_grove':
                        if (territory.construct.type === 'vitality_well') typeBonus = 5;
                        break;
                    case 'crystalline_cave':
                        if (territory.construct.type === 'mana_conduit') typeBonus = 5;
                        break;
                    case 'ruined_temple':
                        if (territory.construct.type === 'arcanum_extractor') typeBonus = 5;
                        break;
                    case 'volcanic_field':
                        if (territory.construct.type === 'aether_resonator') typeBonus = 5;
                        break;
                }
                
                // Apply construct level modifier
                const levelBonus = (territory.construct.level - 1) * 5;
                
                // Calculate final production
                production = production + typeBonus + levelBonus;
                
                // Determine resource type based on construct
                const resourceType = this.getResourceTypeForConstruct(territory.construct.type);
                
                // Add resources to player
                territory.owner.resources[resourceType] += production;
                
                // Track for summary
                productionSummary[territory.owner.name][resourceType] += production;
                
                console.log(`Territory ${territory.id} (${territory.type}): ${territory.construct.type} level ${territory.construct.level} produced ${production} ${resourceType} for ${territory.owner.name}`);
                console.log(`  Base: 10, Type bonus: ${typeBonus}, Level bonus: ${levelBonus}, Total: ${production}`);
            }
        });
        
        // Log production summary
        console.log("=== PRODUCTION SUMMARY ===");
        Object.keys(productionSummary).forEach(playerName => {
            const summary = productionSummary[playerName];
            const total = summary.mana + summary.vitality + summary.arcanum + summary.aether;
            if (total > 0) {
                console.log(`${playerName}: Mana ${summary.mana}, Vitality ${summary.vitality}, Arcanum ${summary.arcanum}, Aether ${summary.aether} (Total: ${total})`);
            }
        });
        
        // Show a status message about resource production
        let totalProduced = 0;
        Object.values(productionSummary).forEach(summary => {
            totalProduced += summary.mana + summary.vitality + summary.arcanum + summary.aether;
        });
        
        if (totalProduced > 0) {
            this.showStatusMessage(`Resource production complete! ${totalProduced} total resources produced this cycle.`);
        }
        
        console.log("=== RESOURCE PRODUCTION END ===");
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
        
        // Calculate final scores for all players
        const playerScores = [];
        let highestScore = 0;
        let winner = null;
        
        window.gameState.players.forEach(player => {
            // Calculate score using formula from game description
            const goldPoints = player.gold * 1;
            const territoryPoints = player.territories.length * 50;
            const constructPoints = player.constructs.length * 75;
            const constructLevelPoints = player.constructs.reduce((sum, construct) => sum + construct.level * 25, 0);
            const resourcePoints = (player.resources.mana + player.resources.vitality + player.resources.arcanum + player.resources.aether) * 2;
            
            const totalScore = goldPoints + territoryPoints + constructPoints + constructLevelPoints + resourcePoints;
            
            playerScores.push({
                player: player,
                score: totalScore,
                breakdown: {
                    gold: goldPoints,
                    territories: territoryPoints,
                    constructs: constructPoints,
                    constructLevels: constructLevelPoints,
                    resources: resourcePoints
                }
            });
            
            console.log(`${player.name} final score: ${totalScore}`);
            console.log(`  Gold: ${goldPoints}, Territories: ${territoryPoints}, Constructs: ${constructPoints}, Levels: ${constructLevelPoints}, Resources: ${resourcePoints}`);
                 
            if (totalScore > highestScore) {
                highestScore = totalScore;
                winner = player;
            }
        });
        
        // Sort players by score (highest first)
        playerScores.sort((a, b) => b.score - a.score);
        
        // Show end game screen with DOM
        const endGameOverlay = document.createElement('div');
        endGameOverlay.style.position = 'fixed';
        endGameOverlay.style.top = '0';
        endGameOverlay.style.left = '0';
        endGameOverlay.style.width = '100%';
        endGameOverlay.style.height = '100%';
        endGameOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        endGameOverlay.style.display = 'flex';
        endGameOverlay.style.flexDirection = 'column';
        endGameOverlay.style.justifyContent = 'center';
        endGameOverlay.style.alignItems = 'center';
        endGameOverlay.style.zIndex = '1000';
        endGameOverlay.style.padding = '20px';
        endGameOverlay.style.overflowY = 'auto';
        
        const gameOverTitle = document.createElement('h1');
        gameOverTitle.textContent = 'Game Over!';
        gameOverTitle.style.color = '#FFD700';
        gameOverTitle.style.fontSize = '48px';
        gameOverTitle.style.margin = '0 0 20px 0';
        gameOverTitle.style.textAlign = 'center';
        
        const winnerText = document.createElement('h2');
        winnerText.textContent = `🏆 Winner: ${winner.name}`;
        winnerText.style.color = '#FFD700';
        winnerText.style.fontSize = '36px';
        winnerText.style.margin = '0 0 30px 0';
        winnerText.style.textAlign = 'center';
        
        // Create scores table
        const scoresContainer = document.createElement('div');
        scoresContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        scoresContainer.style.borderRadius = '10px';
        scoresContainer.style.padding = '20px';
        scoresContainer.style.marginBottom = '30px';
        scoresContainer.style.minWidth = '600px';
        scoresContainer.style.maxWidth = '800px';
        
        const scoresTitle = document.createElement('h3');
        scoresTitle.textContent = 'Final Scores';
        scoresTitle.style.color = '#FFD700';
        scoresTitle.style.fontSize = '24px';
        scoresTitle.style.margin = '0 0 15px 0';
        scoresTitle.style.textAlign = 'center';
        
        scoresContainer.appendChild(scoresTitle);
        
        // Add each player's score
        playerScores.forEach((playerScore, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.style.display = 'flex';
            playerDiv.style.justifyContent = 'space-between';
            playerDiv.style.alignItems = 'center';
            playerDiv.style.padding = '10px';
            playerDiv.style.margin = '5px 0';
            playerDiv.style.backgroundColor = index === 0 ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)';
            playerDiv.style.borderRadius = '5px';
            playerDiv.style.borderLeft = index === 0 ? '4px solid #FFD700' : '4px solid transparent';
            
            const playerInfo = document.createElement('div');
            playerInfo.style.display = 'flex';
            playerInfo.style.flexDirection = 'column';
            
            const playerName = document.createElement('span');
            playerName.textContent = `${index + 1}. ${playerScore.player.name}`;
            playerName.style.fontWeight = 'bold';
            playerName.style.fontSize = '18px';
            playerName.style.color = index === 0 ? '#FFD700' : '#FFFFFF';
            
            const playerBreakdown = document.createElement('span');
            playerBreakdown.textContent = `Gold: ${playerScore.breakdown.gold} | Territories: ${playerScore.breakdown.territories} | Constructs: ${playerScore.breakdown.constructs} | Levels: ${playerScore.breakdown.constructLevels} | Resources: ${playerScore.breakdown.resources}`;
            playerBreakdown.style.fontSize = '12px';
            playerBreakdown.style.color = '#CCCCCC';
            playerBreakdown.style.marginTop = '5px';
            
            const playerTotal = document.createElement('span');
            playerTotal.textContent = playerScore.score.toString();
            playerTotal.style.fontSize = '24px';
            playerTotal.style.fontWeight = 'bold';
            playerTotal.style.color = index === 0 ? '#FFD700' : '#FFFFFF';
            
            playerInfo.appendChild(playerName);
            playerInfo.appendChild(playerBreakdown);
            
            playerDiv.appendChild(playerInfo);
            playerDiv.appendChild(playerTotal);
            
            scoresContainer.appendChild(playerDiv);
        });
        
        const playAgainButton = document.createElement('button');
        playAgainButton.textContent = 'Play Again';
        playAgainButton.style.backgroundColor = '#4a5aa8';
        playAgainButton.style.color = 'white';
        playAgainButton.style.border = 'none';
        playAgainButton.style.padding = '15px 30px';
        playAgainButton.style.borderRadius = '5px';
        playAgainButton.style.fontSize = '20px';
        playAgainButton.style.cursor = 'pointer';
        playAgainButton.style.transition = 'background-color 0.2s';
        
        playAgainButton.addEventListener('mouseover', () => {
            playAgainButton.style.backgroundColor = '#5c6ec9';
        });
        
        playAgainButton.addEventListener('mouseout', () => {
            playAgainButton.style.backgroundColor = '#4a5aa8';
        });
        
        playAgainButton.addEventListener('click', () => {
            // Remove overlay and restart game
            document.body.removeChild(endGameOverlay);
            this.scene.start('MainMenuScene');
        });
        
        endGameOverlay.appendChild(gameOverTitle);
        endGameOverlay.appendChild(winnerText);
        endGameOverlay.appendChild(scoresContainer);
        endGameOverlay.appendChild(playAgainButton);
        
        document.body.appendChild(endGameOverlay);
    }
    
    update() {
        // Game update logic
    }
}