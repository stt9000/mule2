import Phaser from 'phaser';
import { GameFlowController, Construct } from '../models/index.js';
import { TERRITORY_COLORS, GAME_SETTINGS, PLAYER_COLORS, CONSTRUCT_DEFINITIONS } from '../config/gameConfig.js';
import HexUtils from '../utils/HexUtils.js';
import ProductionSummaryPanel from '../ui/panels/ProductionSummaryPanel.js';
import ConstructSystemIntegration from '../integration/ConstructSystemIntegration.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.mapSize = GAME_SETTINGS.MAP_SIZE;
        this.hexSize = 60; // Smaller for better fit
        this.hexUtils = new HexUtils(this.hexSize);
        this.gameFlowController = null;
        this.territoryGraphics = new Map(); // Map territory ID to graphics
        this.resourceParticles = null; // Resource particle systems
        this.resourceAnimations = []; // Active resource animations
        this.productionSummaryPanel = null; // Production summary UI panel
        this.selectionHighlight = null; // Territory selection highlight
        this.selectionTween = null; // Selection animation tween
        this.selectedTerritory = null; // Currently selected territory
    }

    create() {
        console.log("GameScene created");
        
        // Initialize Game Flow Controller
        this.gameFlowController = new GameFlowController({
            mapWidth: this.mapSize.width,
            mapHeight: this.mapSize.height,
            autoSave: true
        });
        
        // Set up event listeners for game flow events
        this.setupGameFlowListeners();
        
        // Initialize the game with players
        const players = this.getInitialPlayers();
        this.gameFlowController.initializeGame(players, {
            mapSize: this.mapSize,
            startingGold: GAME_SETTINGS.STARTING_GOLD
        });
        
        // Start the game flow (phases and turns)
        console.log('Starting game flow...');
        this.gameFlowController.startGameFlow();
        
        // Set initial phase display
        if (this.phaseText) {
            const initialPhase = this.gameFlowController.cycleManager?.currentPhase || 'territory_selection';
            this.phaseText.textContent = this.formatPhase(initialPhase);
        }
        
        // Connect to DOM UI
        this.setupUI();
        
        // Create hex grid map
        this.createMap();
        
        // Initialize game state and controls
        this.setupGameControls();
        
        // Configure camera to show the entire map
        this.setupCamera();
        
        // Update player display to show initial resources
        this.updatePlayerDisplay();
        
        // Initialize resource visualization
        this.initializeResourceVisualization();
        
        // Create UI panels
        this.productionSummaryPanel = new ProductionSummaryPanel(this);
        
        // Initialize Construct System
        this.constructSystem = new ConstructSystemIntegration(this);
        this.constructSystem.initialize();
        
        // Listen for construct purchases to update UI
        this.events.on('construct-purchased', (data) => {
            console.log('Construct purchased, updating player display');
            // Update the main UI to reflect new resource values
            this.updatePlayerDisplay();
        });
        
        // Expose to test harness if available
        if (window.testHarness) {
            window.testHarness.setGameScene(this);
        }
    }
    
    setupGameFlowListeners() {
        // Listen to game flow events
        this.gameFlowController.on('cycle.started', this.onCycleStarted.bind(this));
        this.gameFlowController.on('phase.started', this.onPhaseStarted.bind(this));
        this.gameFlowController.on('phase.ended', this.onPhaseEnded.bind(this));
        this.gameFlowController.on('turn.started', this.onTurnStarted.bind(this));
        this.gameFlowController.on('turn.ended', this.onTurnEnded.bind(this));
        this.gameFlowController.on('timer.warning', this.onTimerWarning.bind(this));
        this.gameFlowController.on('timer.expired', this.onTimerExpired.bind(this));
        this.gameFlowController.on('territory.ownership_changed', this.onTerritoryOwnershipChanged.bind(this));
        this.gameFlowController.on('territories.resolved', this.onTerritoriesResolved.bind(this));
        
        // Resource production events
        this.gameFlowController.on('resource_production.started', this.onResourceProductionStarted.bind(this));
        this.gameFlowController.on('territory.produced', this.onTerritoryProduced.bind(this));
        this.gameFlowController.on('player.production_applied', this.onPlayerProductionApplied.bind(this));
        this.gameFlowController.on('resource_production.completed', this.onResourceProductionCompleted.bind(this));
        
        // Resource decay events
        this.gameFlowController.on('resource_decay.processing', this.onResourceDecayProcessing.bind(this));
        this.gameFlowController.on('player.resources_decayed', this.onPlayerResourcesDecayed.bind(this));
        this.gameFlowController.on('resource_decay.completed', this.onResourceDecayCompleted.bind(this));
        
        // Gold transaction events
        this.gameFlowController.on('gold.deducted', this.onGoldDeducted.bind(this));
        this.gameFlowController.on('gold.added', this.onGoldAdded.bind(this));
    }
    
    getInitialPlayers() {
        // Check if we have player configuration from the setup screen
        if (window.gamePlayerConfig && window.gamePlayerConfig.length > 0) {
            return window.gamePlayerConfig;
        } else if (window.players && window.players.length > 0) {
            return window.players;
        } else {
            // Create 4 default players for testing (Player 1 human, others AI)
            return [
                { id: 'player1', name: 'Player 1', color: PLAYER_COLORS[0], isAI: false },
                { id: 'player2', name: 'Player 2', color: PLAYER_COLORS[1], isAI: true },
                { id: 'player3', name: 'Player 3', color: PLAYER_COLORS[2], isAI: true },
                { id: 'player4', name: 'Player 4', color: PLAYER_COLORS[3], isAI: true }
            ];
        }
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
        this.phaseText = document.getElementById('game-phase');
        this.playerText = document.getElementById('player-name');
        this.playerColor = document.getElementById('player-color');
        this.goldText = document.getElementById('gold-display');
        this.territoryDetails = document.getElementById('territory-details');
        
        // Store references to resource displays
        this.manaDisplay = document.getElementById('mana-display');
        this.vitalityDisplay = document.getElementById('vitality-display');
        this.arcanumDisplay = document.getElementById('arcanum-display');
        this.aetherDisplay = document.getElementById('aether-display');
        
        // Timer elements
        this.timerContainer = document.getElementById('timer-container');
        this.timerDisplay = document.getElementById('turn-timer');
        this.turnTimerInterval = null;
        
        console.log("UI elements found:", {
            cycleText: !!this.cycleText,
            playerText: !!this.playerText,
            playerColor: !!this.playerColor,
            goldText: !!this.goldText,
            territoryDetails: !!this.territoryDetails,
            timerContainer: !!this.timerContainer,
            timerDisplay: !!this.timerDisplay
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
            // Always set to upgrade mode when clicked
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
            if (mode === 'upgrade') {
                const currentPlayer = this.gameFlowController.turnManager.getCurrentPlayer();
                if (currentPlayer && this.gameFlowController.territoryGrid) {
                    const territories = this.gameFlowController.territoryGrid.territories || [];
                    const playerTerritories = territories.filter(t => 
                        t.owner === currentPlayer.id || t.ownerId === currentPlayer.id
                    );
                    const upgradeableTerritories = playerTerritories.filter(t => 
                        !t.construct || (t.construct && t.construct.level < 3)
                    );
                    
                    if (upgradeableTerritories.length > 0) {
                        this.showStatusMessage(`Click on your territories to build or upgrade constructs (${upgradeableTerritories.length} available)`);
                    } else {
                        this.showStatusMessage('No territories available for upgrade');
                    }
                } else {
                    this.showStatusMessage('Click on a territory to upgrade');
                }
            } else {
                this.showStatusMessage(`Click on a territory to ${mode.replace('-', ' ')}`);
            }
        }
        
        // Show/hide cancel upgrade button based on mode
        this.updateUpgradeModeUI(mode);
    }
    
    updateUpgradeModeUI(mode) {
        // Create or update the upgrade mode indicator
        let modeIndicator = document.getElementById('upgrade-mode-indicator');
        
        if (mode === 'upgrade') {
            if (!modeIndicator) {
                // Create the indicator
                modeIndicator = document.createElement('div');
                modeIndicator.id = 'upgrade-mode-indicator';
                modeIndicator.style.position = 'absolute';
                modeIndicator.style.top = '20px';
                modeIndicator.style.left = '50%';
                modeIndicator.style.transform = 'translateX(-50%)';
                modeIndicator.style.backgroundColor = 'rgba(122, 138, 216, 0.9)';
                modeIndicator.style.color = 'white';
                modeIndicator.style.padding = '15px 30px';
                modeIndicator.style.borderRadius = '25px';
                modeIndicator.style.fontSize = '18px';
                modeIndicator.style.fontWeight = 'bold';
                modeIndicator.style.zIndex = '150';
                modeIndicator.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                modeIndicator.style.display = 'flex';
                modeIndicator.style.alignItems = 'center';
                modeIndicator.style.gap = '15px';
                
                // Add indicator text
                const text = document.createElement('span');
                text.textContent = '🔨 UPGRADE MODE ACTIVE';
                modeIndicator.appendChild(text);
                
                // Add cancel button
                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Exit Upgrade Mode';
                cancelBtn.style.padding = '5px 15px';
                cancelBtn.style.backgroundColor = '#dc3545';
                cancelBtn.style.color = 'white';
                cancelBtn.style.border = 'none';
                cancelBtn.style.borderRadius = '15px';
                cancelBtn.style.cursor = 'pointer';
                cancelBtn.style.fontSize = '14px';
                cancelBtn.onclick = () => {
                    this.setSelectMode(null);
                    this.showStatusMessage('Upgrade mode ended');
                };
                
                modeIndicator.appendChild(cancelBtn);
                document.getElementById('game-container').appendChild(modeIndicator);
            }
        } else {
            // Remove the indicator
            if (modeIndicator) {
                modeIndicator.remove();
            }
        }
    }
    
    showStatusMessage(message, type = 'info') {
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
        
        // Apply styling based on message type
        if (type === 'error') {
            this.statusMessage.style.backgroundColor = 'rgba(200, 0, 0, 0.8)';
            this.statusMessage.style.color = 'white';
        } else if (type === 'warning') {
            this.statusMessage.style.backgroundColor = 'rgba(200, 150, 0, 0.8)';
            this.statusMessage.style.color = 'white';
        } else {
            this.statusMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            this.statusMessage.style.color = 'white';
        }
        
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
    
    showHomesteadMessage() {
        // Create a special homestead announcement
        const existingAnnouncement = document.getElementById('homestead-announcement');
        if (existingAnnouncement) {
            existingAnnouncement.remove();
        }
        
        const announcement = document.createElement('div');
        announcement.id = 'homestead-announcement';
        announcement.style.cssText = `
            position: absolute;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.95), rgba(255, 235, 0, 0.95));
            color: #1a1a2d;
            padding: 20px 40px;
            border-radius: 10px;
            font-size: 20px;
            font-weight: bold;
            text-align: center;
            z-index: 1000;
            box-shadow: 0 4px 20px rgba(255, 215, 0, 0.5);
            border: 2px solid #FFD700;
            max-width: 600px;
        `;
        
        announcement.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 10px; color: #8B4513;">
                🏰 Royal Decree from the Arcane Council 🏰
            </div>
            <div style="font-size: 18px; line-height: 1.5;">
                The <strong>Mystic Empire of Aethermoor</strong> grants each settler<br>
                ONE FREE HOMESTEAD PLOT<br>
                to encourage development of the frontier lands!
            </div>
            <div style="font-size: 16px; margin-top: 10px; font-style: italic;">
                Choose your territory wisely - your first claim costs nothing!
            </div>
        `;
        
        document.getElementById('game-container').appendChild(announcement);
        
        // Fade out after 6 seconds
        setTimeout(() => {
            announcement.style.transition = 'opacity 1s ease-out';
            announcement.style.opacity = '0';
            setTimeout(() => announcement.remove(), 1000);
        }, 6000);
        
        // Also show regular status message
        this.showStatusMessage('Territory Selection Phase - Choose your FREE homestead!');
    }
    
    showConstructSelectionDialog(territory, callback) {
        console.log('showConstructSelectionDialog called for territory:', territory.id);
        
        // Use the new construct selection panel if available
        if (this.constructSystem && this.constructSystem.openSelection) {
            const currentPlayer = this.gameFlowController.turnManager.getCurrentPlayer();
            
            // Store the selected territory for later use
            this.selectedTerritoryForConstruct = territory;
            
            // Check if player has constructs in inventory
            if (currentPlayer.inventory && currentPlayer.inventory.constructs && currentPlayer.inventory.constructs.length > 0) {
                console.log('Player has constructs in inventory, showing selection panel');
                // Player has constructs in inventory, show selection panel
                this.constructSystem.openSelection(currentPlayer, (construct) => {
                    console.log('Construct selected from inventory:', construct.type);
                    // Place the selected construct on the territory
                    this.placeConstructFromInventory(territory, construct);
                });
            } else {
                console.log('No constructs in inventory, opening shop');
                // No constructs in inventory, show shop to buy new ones
                this.constructSystem.openShop();
                
                // After purchase, immediately place on the pre-selected territory
                const purchaseHandler = (data) => {
                    if (data.construct && this.selectedTerritoryForConstruct) {
                        console.log('Construct purchased, placing on pre-selected territory:', this.selectedTerritoryForConstruct.id);
                        
                        // Use the new inventory placement flow to place the construct
                        this.placeConstructFromInventory(this.selectedTerritoryForConstruct, data.construct);
                        
                        // Clear the selected territory
                        this.selectedTerritoryForConstruct = null;
                        
                        // Show success message
                        this.showStatusMessage(`${data.construct.type} is being installed on territory!`, 'success');
                    }
                };
                this.events.once('construct-purchased', purchaseHandler);
            }
            return;
        }
        
        // Fallback to old dialog (kept for backwards compatibility)
        const existingDialog = document.getElementById('construct-dialog');
        if (existingDialog) {
            console.log('Removing existing dialog');
            document.getElementById('game-container').removeChild(existingDialog);
        }
        
        // Create dialog container
        const dialogContainer = document.createElement('div');
        dialogContainer.id = 'construct-dialog';
        dialogContainer.style.cssText = `
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            background-color: rgba(20, 20, 20, 0.95) !important;
            border: 2px solid #FFD700 !important;
            border-radius: 10px !important;
            padding: 20px !important;
            z-index: 10000 !important;
            min-width: 400px !important;
            display: block !important;
            visibility: visible !important;
        `;
        
        // Title
        const title = document.createElement('h3');
        title.textContent = 'Magical Constructs';
        title.style.color = '#FFD700';
        title.style.marginBottom = '10px';
        title.style.textAlign = 'center';
        dialogContainer.appendChild(title);
        
        // Subtitle
        const subtitle = document.createElement('p');
        subtitle.textContent = 'Note: This is the old interface. Press C to open the new Construct Shop.';
        subtitle.style.color = '#aaa';
        subtitle.style.marginBottom = '20px';
        subtitle.style.textAlign = 'center';
        subtitle.style.fontSize = '14px';
        dialogContainer.appendChild(subtitle);
        
        // Build construct types from imported definitions
        const constructTypes = [];
        Object.entries(CONSTRUCT_DEFINITIONS).forEach(([type, def]) => {
            const costParts = [];
            Object.entries(def.baseCost).forEach(([resource, amount]) => {
                costParts.push(`${amount} ${resource}`);
            });
            
            constructTypes.push({
                type: type,
                name: def.name,
                icon: def.icon,
                cost: costParts.join(', '),
                description: def.description,
                resourceType: def.resourceType
            });
        });
        
        console.log('Creating construct buttons...');
        constructTypes.forEach(construct => {
            const button = document.createElement('button');
            button.style.display = 'block';
            button.style.width = '100%';
            button.style.margin = '10px 0';
            button.style.padding = '15px';
            button.style.backgroundColor = '#333';
            button.style.color = 'white';
            button.style.border = '1px solid #666';
            button.style.borderRadius = '5px';
            button.style.cursor = 'pointer';
            button.style.fontSize = '16px';
            button.style.textAlign = 'left';
            
            button.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 24px;">${construct.icon || ''}</span>
                    <div>
                        <strong>${construct.name}</strong><br>
                        <small style="color: #88ccff">Cost: ${construct.cost}</small><br>
                        <small style="color: #aaa">${construct.description}</small><br>
                        <small style="color: #ffcc66">Produces: ${construct.resourceType}</small>
                    </div>
                </div>
            `;
            
            button.onmouseover = () => {
                button.style.backgroundColor = '#444';
                button.style.borderColor = '#FFD700';
            };
            
            button.onmouseout = () => {
                button.style.backgroundColor = '#333';
                button.style.borderColor = '#666';
            };
            
            button.onclick = () => {
                console.log(`Construct button clicked: ${construct.type}`);
                // Disable all buttons to prevent double-clicking
                const allButtons = dialogContainer.querySelectorAll('button');
                allButtons.forEach(btn => btn.disabled = true);
                
                // Remove dialog first
                const dialog = document.getElementById('construct-dialog');
                if (dialog && dialog.parentNode) {
                    console.log('Dialog being removed after button click');
                    dialog.parentNode.removeChild(dialog);
                }
                // Then execute callback
                console.log('Calling callback with:', construct.type);
                if (this.isShowingConstructDialog) {
                    this.isShowingConstructDialog = false;
                }
                callback(construct.type);
            };
            
            dialogContainer.appendChild(button);
        });
        
        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.display = 'block';
        cancelButton.style.width = '100%';
        cancelButton.style.margin = '20px 0 0 0';
        cancelButton.style.padding = '10px';
        cancelButton.style.backgroundColor = '#600';
        cancelButton.style.color = 'white';
        cancelButton.style.border = 'none';
        cancelButton.style.borderRadius = '5px';
        cancelButton.style.cursor = 'pointer';
        cancelButton.style.fontSize = '16px';
        
        cancelButton.onclick = () => {
            const dialog = document.getElementById('construct-dialog');
            if (dialog && dialog.parentNode) {
                console.log('Cancel button clicked, removing dialog');
                dialog.parentNode.removeChild(dialog);
            }
            if (this.isShowingConstructDialog) {
                this.isShowingConstructDialog = false;
            }
        };
        
        dialogContainer.appendChild(cancelButton);
        
        // Add to game container
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(dialogContainer);
            console.log('Dialog added to game container');
            
            // Verify dialog is visible
            setTimeout(() => {
                const dialog = document.getElementById('construct-dialog');
                if (dialog) {
                    console.log('Dialog still exists after creation');
                    console.log('Dialog display:', dialog.style.display);
                    console.log('Dialog visibility:', dialog.style.visibility);
                    console.log('Dialog offsetParent:', dialog.offsetParent !== null);
                    console.log('Dialog dimensions:', dialog.offsetWidth, 'x', dialog.offsetHeight);
                } else {
                    console.error('Dialog disappeared after creation!');
                }
            }, 100);
        } else {
            console.error('Game container not found!');
            document.body.appendChild(dialogContainer);
        }
        
        // Add click outside to close - DISABLED for debugging
        // setTimeout(() => {
        //     const closeOnClickOutside = (e) => {
        //         if (!dialogContainer.contains(e.target)) {
        //             const dialog = document.getElementById('construct-dialog');
        //             if (dialog && dialog.parentNode) {
        //                 dialog.parentNode.removeChild(dialog);
        //             }
        //             document.removeEventListener('click', closeOnClickOutside);
        //         }
        //     };
        //     document.addEventListener('click', closeOnClickOutside);
        // }, 100); // Small delay to prevent immediate closure
        
        console.log('Dialog setup complete - click outside handler DISABLED');
    }
    
    // Helper method to reset dialog state if it gets stuck
    resetConstructDialogState() {
        console.log('Resetting construct dialog state');
        this.isShowingConstructDialog = false;
        const dialog = document.getElementById('construct-dialog');
        if (dialog && dialog.parentNode) {
            dialog.parentNode.removeChild(dialog);
        }
    }
    
    harvestResources() {
        console.log("Harvesting resources...");
        // Implement resource harvesting logic
    }
    
    createMap() {
        if (!this.gameFlowController || !this.gameFlowController.territoryGrid) {
            console.error("Game flow controller not initialized");
            return;
        }
        
        const territoryGrid = this.gameFlowController.territoryGrid;
        
        // Create visual representation for each territory
        territoryGrid.territories.forEach(territory => {
            // Get pixel position from axial coordinates
            const pixelPos = this.hexUtils.axialToPixel(territory.q, territory.r);
            
            // Create hexagon graphics
            const hex = this.add.graphics();
            
            // Get territory color based on type
            const color = TERRITORY_COLORS[territory.type] || 0x888888;
            hex.fillStyle(color, 1);
            
            // Draw hexagon
            hex.lineStyle(2, 0xFFFFFF, 1);
            
            // Get hex corners
            const corners = this.hexUtils.getHexCorners(territory.q, territory.r);
            
            // Draw filled hexagon
            hex.beginPath();
            hex.moveTo(corners[0].x, corners[0].y);
            for (let i = 1; i < 6; i++) {
                hex.lineTo(corners[i].x, corners[i].y);
            }
            hex.closePath();
            hex.fillPath();
            hex.strokePath();
            
            // Store graphics reference
            this.territoryGraphics.set(territory.id, hex);
            territory.hex = hex;
            
            // Make territory interactive
            hex.setInteractive(new Phaser.Geom.Polygon(corners), Phaser.Geom.Polygon.Contains)
               .setData('territory', territory)
               .setData('territoryId', territory.id);
            
            hex.on('pointerdown', () => {
                this.onTerritoryClick(territory);
            });
                
            
            hex.on('pointerover', () => {
                // Keep owner color if territory is owned, otherwise use yellow
                const owner = territory.ownerId ? 
                    this.gameFlowController.stateManager.getPlayer(territory.ownerId) : null;
                const hoverColor = owner ? owner.color : 0xFFFF00;
                hex.lineStyle(3, hoverColor, 1);
                hex.strokePath();
                
                // Change cursor to show it's clickable
                this.game.canvas.style.cursor = 'pointer';
            });
            
            hex.on('pointerout', () => {
                // Reset to owner color if owned, otherwise white
                const owner = territory.ownerId ? 
                    this.gameFlowController.stateManager.getPlayer(territory.ownerId) : null;
                const borderColor = owner ? owner.color : 0xFFFFFF;
                hex.lineStyle(2, borderColor, 0.8);
                hex.strokePath();
                
                // Reset cursor
                this.game.canvas.style.cursor = 'default';
            });
            
            // Add territory type label
            const label = this.add.text(pixelPos.x, pixelPos.y, territory.getTypeName().split(' ')[0], {
                fontSize: '12px',
                fill: '#FFFFFF',
                align: 'center'
            });
            label.setOrigin(0.5);
        });
        
        // Listen for territory events from game flow
        this.gameFlowController.on('territory.claimed', this.onTerritoryClaimed.bind(this));
        this.gameFlowController.on('territory.selected', this.onTerritorySelected.bind(this));
    }
    
    onTerritoryClick(territory) {
        console.log(`Clicked territory ${territory.id} of type ${territory.type}`);
        
        // Debug: Check game state
        const gameStatus = this.gameFlowController.getGameStatus();
        console.log('Game Status:', {
            phase: gameStatus.currentPhase,
            cycle: gameStatus.currentCycle,
            isInitialized: gameStatus.isInitialized,
            turnInfo: gameStatus.turnInfo
        });
        
        const currentPlayer = this.gameFlowController.turnManager.getCurrentPlayer();
        if (!currentPlayer) {
            console.log("No current player - turn sequence may not have started");
            // For now, allow selection without turn validation for testing
            const firstPlayer = this.gameFlowController.stateManager.gameState.players[0];
            if (firstPlayer) {
                console.log("Using first player for selection:", firstPlayer.id);
                this.gameFlowController.territoryGrid.selectTerritory(territory.id, firstPlayer.id);
            }
            return;
        }
        
        console.log("Current player:", currentPlayer.id, currentPlayer.name);
        
        // Use the game flow controller to select the territory
        const selected = this.gameFlowController.territoryGrid.selectTerritory(territory.id, currentPlayer.id);
        console.log("Selection result:", selected);
    }
    
    onTerritorySelected(event) {
        const { territory, playerId } = event;
        console.log(`Territory ${territory.id} selected by player ${playerId}`);
        console.log('Territory object:', territory);
        
        // Check if this is for the current player - ignore selections from other players
        const currentPlayer = this.gameFlowController.turnManager.getCurrentPlayer();
        if (currentPlayer && currentPlayer.id !== playerId) {
            console.log(`Ignoring selection from ${playerId} - current player is ${currentPlayer.id}`);
            return;
        }
        
        // Clear previous selection highlight
        if (this.selectionHighlight) {
            this.selectionHighlight.destroy();
        }
        
        // Store reference to selected territory
        this.selectedTerritory = territory;
        
        // Check if territory has coordinates
        if (territory.q !== undefined && territory.r !== undefined) {
            console.log('Territory coordinates:', { q: territory.q, r: territory.r });
        } else {
            console.error('Territory missing q,r coordinates!');
            return;
        }
        
        // Get pixel position from axial coordinates
        const pixelPos = this.hexUtils.axialToPixel(territory.q, territory.r);
        console.log('Pixel position:', pixelPos);
        
        // Create a selection highlight using hex corners
        const highlightCorners = this.hexUtils.getHexCorners(territory.q, territory.r);
        
        // Scale up corners slightly for highlight effect
        const highlightPoints = highlightCorners.map(corner => ({
            x: pixelPos.x + (corner.x - pixelPos.x) * 1.1,
            y: pixelPos.y + (corner.y - pixelPos.y) * 1.1
        }));
        
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
        this.selectionTween = this.tweens.add({
            targets: this.selectionHighlight,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1
        });
        
        // Update territory details in HTML UI
        if (this.territoryDetails) {
            const owner = territory.ownerId ? 
                this.gameFlowController.stateManager.getPlayer(territory.ownerId) : null;
            const constructInfo = territory.construct ? 
                `${this.formatTerritoryType(territory.construct.type)} (Level ${territory.construct.level || 1})` : 
                'None';
                
            this.territoryDetails.innerHTML = `
                <div>
                    <p><strong>Territory ID:</strong> ${territory.id}</p>
                    <p><strong>Type:</strong> ${territory.getTypeName()}</p>
                    <p><strong>Owner:</strong> ${owner ? owner.name : 'None'}</p>
                    <p><strong>Construct:</strong> ${constructInfo}</p>
                    ${territory.ownerId ? `<p><strong>Resource Production:</strong> ${this.calculateTerritoryProduction(territory)} per cycle</p>` : ''}
                    <p><strong>Base Modifiers:</strong></p>
                    <ul>
                        ${Object.entries(territory.baseModifiers).map(([resource, modifier]) => 
                            `<li>${resource}: ${modifier > 1 ? '+' : ''}${Math.round((modifier - 1) * 100)}%</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }
        
        // Take action based on current selection mode
        if (this.selectMode === 'buy-land') {
            // Use the territory acquisition system to claim the territory
            const currentPlayer = this.gameFlowController.turnManager.getCurrentPlayer();
            const currentPhase = this.gameFlowController.cycleManager?.currentPhase;
            
            console.log('Buy-land mode - Current phase:', currentPhase);
            console.log('Current player:', currentPlayer);
            console.log('Territory owner:', territory.ownerId);
            
            // Check if turn sequence has been started
            if (!currentPlayer && currentPhase === 'territory_selection') {
                console.log('Turn sequence not started, starting it now...');
                this.gameFlowController.turnManager.startTurnSequence();
                // Update current player reference
                currentPlayer = this.gameFlowController.turnManager.getCurrentPlayer();
                if (currentPlayer) {
                    console.log('Turn sequence started, current player:', currentPlayer.id);
                }
            }
            
            if (currentPlayer && !territory.ownerId) {
                // Check if it's an AI player's turn
                if (currentPlayer.isAI) {
                    this.showStatusMessage(`It's ${currentPlayer.name}'s turn (AI)`, 'warning');
                    return;
                }
                
                console.log('Attempting to claim territory:', territory.id);
                const result = this.gameFlowController.territoryAcquisition.attemptClaim(currentPlayer.id, territory.id);
                console.log('Claim result:', result);
                
                if (result.success) {
                    if (result.type === 'disputed') {
                        this.showStatusMessage('Territory selection recorded - may be disputed', 'warning');
                    } else {
                        this.showStatusMessage('Territory selected! Will be resolved at end of phase');
                    }
                } else {
                    this.showStatusMessage(result.reason || 'Cannot claim this territory', 'error');
                }
            } else if (territory.ownerId) {
                this.showStatusMessage('Territory already owned!', 'error');
            } else if (!currentPlayer) {
                this.showStatusMessage('No active player for claiming', 'error');
            }
        } else if (this.selectMode === 'upgrade') {
            // Handle territory improvements
            if (territory.ownerId === playerId) {
                // During construct phase, place constructs
                const currentPhase = this.gameFlowController.cycleManager?.currentPhase;
                if (currentPhase === 'construct_outfitting') {
                    this.upgradeTerritory(territory);
                } else {
                    this.showStatusMessage('You can only place constructs during the Construct Outfitting phase!', 'error');
                }
            } else {
                this.showStatusMessage('You can only upgrade your own territories!', 'error');
            }
        }
    }
    
    placeConstructFromInventory(territory, construct) {
        console.log('Placing construct from inventory:', construct.type, 'on territory:', territory.id);
        
        // Use the ConstructManager to initiate installation
        if (this.gameFlowController.constructManager) {
            try {
                const installation = this.gameFlowController.constructManager.initiateInstallation(
                    construct.id,
                    territory.id,
                    construct.owner.id
                );
                
                // Start the installation animation
                if (this.constructSystem && this.constructSystem.systems.installationAnimator) {
                    this.constructSystem.systems.installationAnimator.playInstallation(installation);
                    
                    // Listen for completion event
                    this.events.once('installation-completed', (data) => {
                        console.log('Installation completed:', data.result);
                        this.updateTerritoryDisplay();
                    });
                }
            } catch (error) {
                console.error('Failed to place construct:', error);
                this.showStatusMessage(error.message, 'error');
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
    
    updateTerritoryOwnership(territory) {
        // Update the visual representation of territory ownership
        if (!territory || !territory.hex) return;
        
        const owner = territory.ownerId ? 
            this.gameFlowController.stateManager.getPlayer(territory.ownerId) : null;
        
        if (owner) {
            // Update the hex border color to match player color
            territory.hex.lineStyle(2, owner.color || 0xFF0000, 0.8);
            territory.hex.strokePath();
            
            // Trigger a re-render of the hex
            const event = {
                territory: territory,
                playerId: owner.id
            };
            this.onTerritoryOwnershipChanged(event);
        }
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
        
        // Check if dialog is already open
        if (document.getElementById('construct-dialog')) {
            console.log('Construct dialog already open, ignoring click');
            return;
        }
        
        // Add a flag to prevent multiple dialogs
        if (this.isShowingConstructDialog) {
            console.log('Already showing construct dialog, ignoring');
            // Check if dialog actually exists
            const existingDialog = document.getElementById('construct-dialog');
            if (!existingDialog) {
                console.log('Flag was set but no dialog exists, resetting flag');
                this.isShowingConstructDialog = false;
            } else {
                return;
            }
        }
        this.isShowingConstructDialog = true;
        
        const currentPlayer = this.gameFlowController.turnManager.getCurrentPlayer();
        
        console.log('Current player in upgradeTerritory:', currentPlayer);
        console.log('Is AI?', currentPlayer?.isAI);
        
        if (!currentPlayer) {
            this.showStatusMessage("No active player!");
            this.isShowingConstructDialog = false;
            return;
        }
        
        // Check if player owns this territory
        if (!territory.ownerId || territory.ownerId !== currentPlayer.id) {
            this.showStatusMessage("You don't own this territory!");
            console.log(`Player ${currentPlayer.id} doesn't own territory ${territory.id} (owned by ${territory.ownerId})`);
            this.isShowingConstructDialog = false;
            return;
        }
        
        // Check if we're building a new construct or upgrading existing
        const buildingNew = !territory.construct;
        console.log(`Building new: ${buildingNew}`);
        
        if (buildingNew) {
            // BUILDING NEW CONSTRUCT
            
            // Show construct selection dialog
            console.log('About to show construct selection dialog');
            console.log('Current player before dialog:', this.gameFlowController.turnManager.getCurrentPlayer());
            console.log('Player is AI?', this.gameFlowController.turnManager.getCurrentPlayer()?.isAI);
            
            // Check if this is being called for an AI player by mistake
            if (currentPlayer.isAI) {
                console.error('ERROR: Trying to show dialog for AI player!');
                this.isShowingConstructDialog = false;
                return;
            }
            
            this.showConstructSelectionDialog(territory, (selectedType) => {
                console.log('Construct selection callback called with:', selectedType);
                const constructType = selectedType;
                const buildCost = 200; // Fixed cost for new constructs
                
                // Re-fetch current player in case state changed
                const updatedPlayer = this.gameFlowController.turnManager.getCurrentPlayer();
                
                console.log(`Building new ${constructType} (cost: ${buildCost}, player gold: ${updatedPlayer.gold})`);
                
                if (updatedPlayer.gold >= buildCost) {
                console.log(`Player has enough gold to build`);
                
                // Deduct gold using GoldManager
                const goldResult = this.gameFlowController.goldManager.deductGold(
                    updatedPlayer.id, 
                    buildCost, 
                    `Build ${constructType}`
                );
                
                if (!goldResult.success) {
                    this.showStatusMessage(goldResult.error, 'error');
                    return;
                }
                
                // Create the construct using the Construct class
                const newConstruct = new Construct({
                    id: `construct_${territory.id}_${Date.now()}`,
                    type: constructType,
                    level: 1,
                    owner: updatedPlayer,
                    status: 'inventory' // Start in inventory for proper installation flow
                });
                
                console.log(`Created new construct of type ${constructType} at level 1`);
                
                // Force use the installation animation if available
                if (this.constructSystem && this.constructSystem.systems && this.constructSystem.systems.installationAnimator) {
                    console.log('Using installation animation flow');
                    
                    // Create a simplified installation object that will work
                    const installation = {
                        construct: newConstruct,
                        territory: territory,
                        startTime: Date.now(),
                        duration: 20, // 20 seconds
                        playerId: updatedPlayer.id
                    };
                    
                    // Play the animation immediately
                    this.constructSystem.systems.installationAnimator.playInstallation(installation);
                    
                    // Listen for completion event
                    this.events.once('installation-completed', (data) => {
                        console.log('Installation completed:', data.result);
                        
                        // Apply the result to the territory
                        if (data.result.success) {
                            territory.construct = newConstruct;
                            newConstruct.status = 'active';
                            newConstruct.efficiency = data.result.efficiency || 1;
                        } else {
                            // Installation failed - refund gold
                            updatedPlayer.gold += buildCost;
                            this.showStatusMessage('Installation failed! Gold refunded.', 'error');
                        }
                        
                        this.updateTerritoryDisplay();
                        this.updatePlayerDisplay();
                    });
                    
                    // Also handle cancellation
                    this.events.once('installation-cancelled', (data) => {
                        console.log('Installation cancelled');
                        // Refund gold
                        updatedPlayer.gold += buildCost;
                        this.updatePlayerDisplay();
                        this.showStatusMessage('Installation cancelled. Gold refunded.', 'warning');
                    });
                    
                } else if (this.gameFlowController.constructManager) {
                    try {
                        // Add to player's inventory temporarily
                        if (!updatedPlayer.inventory) {
                            updatedPlayer.inventory = { constructs: [] };
                        }
                        updatedPlayer.inventory.constructs.push(newConstruct);
                        
                        // Initiate installation
                        const installation = this.gameFlowController.constructManager.initiateInstallation(
                            newConstruct.id,
                            territory.id,
                            updatedPlayer.id
                        );
                        
                        // Make sure installation has all needed data
                        if (!installation.territory.q && territory.q !== undefined) {
                            installation.territory = territory;
                        }
                        
                        // Start the installation animation
                        console.log('Checking for constructSystem:', !!this.constructSystem);
                        console.log('Checking for installationAnimator:', !!this.constructSystem?.systems?.installationAnimator);
                        console.log('Installation object:', installation);
                        
                        if (this.constructSystem && this.constructSystem.systems.installationAnimator) {
                            console.log('Starting installation animation!');
                            this.constructSystem.systems.installationAnimator.playInstallation(installation);
                            
                            // Listen for completion event
                            this.events.once('installation-completed', (data) => {
                                console.log('Installation completed:', data.result);
                                this.updateTerritoryDisplay();
                                
                                // Update UI to show new resources
                                this.updatePlayerDisplay();
                            });
                        } else {
                            console.warn('Installation animator not available, falling back to direct placement');
                            // Fallback: direct placement without animation
                            territory.construct = newConstruct;
                            newConstruct.status = 'active';
                            this.updateTerritoryDisplay();
                        }
                    } catch (error) {
                        console.error('Failed to initiate installation:', error);
                        this.showStatusMessage(error.message, 'error');
                        
                        // Refund the gold on error
                        updatedPlayer.gold += buildCost;
                        this.updatePlayerDisplay();
                    }
                } else {
                    // Fallback: direct placement without animation
                    territory.construct = newConstruct;
                    newConstruct.status = 'active';
                    
                    // Get pixel position for the territory
                    const pixelPos = this.hexUtils.axialToPixel(territory.q, territory.r);
                    
                    // Create visual representation
                    const constructGraphic = this.add.graphics();
                    constructGraphic.fillStyle(0xFFFFFF, 0.8);
                    constructGraphic.fillCircle(pixelPos.x, pixelPos.y, this.hexSize / 3);
                    
                    // Create level text
                    const constructText = this.add.text(pixelPos.x, pixelPos.y, "1", {
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
                    
                    this.showStatusMessage(`Built ${this.formatTerritoryType(constructType)} on territory ${territory.id} for ${buildCost} gold`);
                    
                    // Update available territories count
                    this.time.delayedCall(100, () => {
                        this.setSelectMode('upgrade'); // Refresh the message with updated count
                    });
                    
                    // Execute the action through turn manager
                    this.gameFlowController.turnManager.executePlayerAction(updatedPlayer, {
                        type: 'place_construct',
                        target: territory.id,
                        constructType: constructType
                    });
                }
            } else {
                console.log(`Not enough gold to build (need ${buildCost}, have ${updatedPlayer.gold})`);
                this.showStatusMessage(`Not enough gold to build! You need ${buildCost} gold.`);
            }
            }); // End of construct selection callback
            
            // Return early - dialog is handling the rest
            return;
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
            
            // Deduct gold using GoldManager
            const goldResult = this.gameFlowController.goldManager.deductGold(
                currentPlayer.id, 
                upgradeCost, 
                `Upgrade construct to level ${currentLevel + 1}`
            );
            
            if (!goldResult.success) {
                this.showStatusMessage(goldResult.error, 'error');
                return;
            }
            
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
            
            this.showStatusMessage(`Upgraded construct to level ${newLevel} for ${upgradeCost} gold`);
            
            // Update available territories count
            this.time.delayedCall(100, () => {
                this.setSelectMode('upgrade'); // Refresh the message with updated count
            });
            
            // Execute the action through turn manager
            this.gameFlowController.turnManager.executePlayerAction(currentPlayer, {
                type: 'upgrade_construct',
                target: territory.id,
                newLevel: newLevel
            });
            // Don't reset selection mode - allow multiple upgrades
            console.log(`=== UPGRADE TERRITORY FUNCTION END (upgrade existing) ===`);
            // Keep selection mode active to allow multiple upgrades
            
            // Show helpful message to continue
            this.time.delayedCall(500, () => {
                const currentPlayer = this.gameFlowController.turnManager.getCurrentPlayer();
                if (currentPlayer && currentPlayer.gold >= 150) {
                    this.showStatusMessage('Click another territory to continue upgrading, or click "Cancel Upgrade" to finish');
                } else if (currentPlayer && currentPlayer.gold < 150) {
                    this.showStatusMessage('Not enough gold for more upgrades. Click "Cancel Upgrade" to finish');
                }
            });
        }
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
        console.log('nextTurn called');
        
        // Visual feedback for button press
        const endTurnBtn = document.getElementById('end-turn-btn');
        if (endTurnBtn) {
            endTurnBtn.style.backgroundColor = '#2a3a98'; // Darker color for feedback
            
            // Reset after a short delay
            setTimeout(() => {
                endTurnBtn.style.backgroundColor = '#4a5aa8';
            }, 200);
        }
        
        // Use the GameFlowController to advance turn
        if (this.gameFlowController && this.gameFlowController.turnManager) {
            const currentPlayer = this.gameFlowController.turnManager.getCurrentPlayer();
            if (currentPlayer) {
                console.log('Ending turn for player:', currentPlayer.id);
                this.gameFlowController.turnManager.endPlayerTurn(currentPlayer);
            } else {
                console.error('No current player found');
                this.showStatusMessage('No active player turn', 'error');
            }
        } else {
            console.error('GameFlowController or TurnManager not available');
            this.showStatusMessage('Cannot end turn - game not properly initialized', 'error');
            return;
        }
        
        // Update display
        this.updatePlayerDisplay();
        
        // Reset any selection modes
        this.selectMode = null;
        this.setSelectMode(null); // This will reset button highlights
        
        // Clear territory selection
        this.clearTerritorySelection();
    }
    
    updatePlayerDisplay() {
        // Update UI with current player info using GameFlowController
        if (!this.gameFlowController) {
            console.error("GameFlowController not initialized");
            return;
        }
        
        const currentPlayerFromTurn = this.gameFlowController.turnManager.getCurrentPlayer();
        if (!currentPlayerFromTurn) {
            console.error("No current player found");
            return;
        }
        
        // Get fresh player data from state manager to ensure we have latest gold values
        const currentPlayer = this.gameFlowController.stateManager.getPlayer(currentPlayerFromTurn.id);
        if (!currentPlayer) {
            console.error("Player not found in state manager");
            return;
        }
        
        const gameState = this.gameFlowController.stateManager.gameState;
        
        if (this.cycleText && gameState) {
            this.cycleText.textContent = `${gameState.currentCycle || 1}`;
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
            this.goldText.textContent = currentPlayer.gold || 0;
        }
        
        // Update resource displays - check if resources exist
        if (this.manaDisplay) {
            this.manaDisplay.textContent = currentPlayer.resources?.mana || 0;
        }
        
        if (this.vitalityDisplay) {
            this.vitalityDisplay.textContent = currentPlayer.resources?.vitality || 0;
        }
        
        if (this.arcanumDisplay) {
            this.arcanumDisplay.textContent = currentPlayer.resources?.arcanum || 0;
        }
        
        if (this.aetherDisplay) {
            this.aetherDisplay.textContent = currentPlayer.resources?.aether || 0;
        }
    }
    
    /**
     * Update the visual display of territories with constructs
     */
    updateTerritoryDisplay() {
        if (!this.gameFlowController || !this.gameFlowController.territoryGrid) {
            console.warn('Cannot update territory display - no territory grid');
            return;
        }
        
        // Iterate through all territories and update their construct visuals
        const territories = this.gameFlowController.territoryGrid.territories || [];
        territories.forEach(territory => {
            if (territory.construct) {
                // Get pixel position for the territory
                const pixelPos = this.hexUtils.axialToPixel(territory.q, territory.r);
                
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
                constructGraphic.fillCircle(pixelPos.x, pixelPos.y, this.hexSize / 3);
                
                // Create level text
                const constructText = this.add.text(pixelPos.x, pixelPos.y, 
                    territory.construct.level ? territory.construct.level.toString() : "1", 
                    {
                        font: '24px Arial',
                        fill: '#000000'
                    }
                ).setOrigin(0.5);
                
                // Store references to graphics objects
                territory.constructGraphic = constructGraphic;
                territory.constructText = constructText;
                
                // Add efficiency indicator if construct has efficiency
                if (territory.construct.efficiency !== undefined && territory.construct.efficiency !== 1) {
                    const efficiencyColor = territory.construct.efficiency > 1 ? 0x00ff00 : 0xff8800;
                    const efficiencyText = this.add.text(
                        pixelPos.x, 
                        pixelPos.y + 25, 
                        `${Math.round(territory.construct.efficiency * 100)}%`,
                        {
                            font: '12px Arial',
                            fill: '#' + efficiencyColor.toString(16).padStart(6, '0')
                        }
                    ).setOrigin(0.5);
                    territory.efficiencyText = efficiencyText;
                }
            }
        });
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
    
    // Game Flow Event Handlers
    onCycleStarted(event) {
        const { cycle } = event;
        if (this.cycleText) {
            this.cycleText.textContent = `Cycle ${cycle} of ${GAME_SETTINGS.TOTAL_CYCLES}`;
        }
    }
    
    onPhaseStarted(event) {
        const { phase } = event;
        const formattedPhase = this.formatPhase(phase);
        
        // Clear any pending AI turn end timer when phase changes
        if (this.aiTurnEndTimer) {
            console.log('Phase change - clearing pending AI turn end timer');
            this.aiTurnEndTimer.remove();
            this.aiTurnEndTimer = null;
        }
        
        // Update phase display in UI
        if (this.phaseText) {
            this.phaseText.textContent = formattedPhase;
        }
        
        // Show phase-specific messages
        if (phase === 'territory_selection') {
            // Show homestead message for territory selection
            this.showHomesteadMessage();
        } else {
            this.showStatusMessage(`Phase: ${formattedPhase}`);
        }
        
        // Don't automatically select mode - let player choose
        // Clear any previous selection mode
        this.setSelectMode(null);
    }
    
    onPhaseEnded(event) {
        const { phase } = event;
        console.log('Phase ended:', phase);
        
        // Special handling for end of territory selection phase
        if (phase === 'territory_selection') {
            console.log('Territory selection phase ended - checking for resolved territories');
            
            // Force a visual update of all territories after dispute resolution
            this.time.delayedCall(500, () => {
                this.updateAllTerritoryVisuals();
            });
        }
    }
    
    onTurnStarted(event) {
        const { player } = event;
        console.log('onTurnStarted called for player:', player.id);
        
        // Clear any pending AI turn end timer
        if (this.aiTurnEndTimer) {
            console.log('Clearing pending AI turn end timer');
            this.aiTurnEndTimer.remove();
            this.aiTurnEndTimer = null;
        }
        
        // Remove any open construct dialog when turn changes
        const existingDialog = document.getElementById('construct-dialog');
        if (existingDialog) {
            console.log('Removing construct dialog on turn change');
            existingDialog.parentNode.removeChild(existingDialog);
        }
        
        // Clear any active selection modes when turn changes
        console.log('Clearing selection mode...');
        this.setSelectMode(null);
        
        // Clear territory selection
        console.log('Clearing territory selection...');
        this.clearTerritorySelection();
        
        this.updatePlayerDisplay();
        this.showStatusMessage(`${player.name}'s turn!`);
        
        // Start turn timer
        this.startTurnTimer(player);
        
        const currentPhase = this.gameFlowController.cycleManager?.currentPhase;
        
        // If it's an AI player's turn, handle AI actions based on phase
        if (player.isAI) {
            if (currentPhase === 'territory_selection') {
                console.log('AI player turn - making territory selection');
                // Give more time for turn to properly start before AI acts
                this.time.delayedCall(2000, () => {
                    this.makeAITerritorySelection(player);
                });
            } else if (currentPhase === 'construct_outfitting') {
                console.log('AI player turn - placing constructs');
                // Give more time for turn to properly start before AI acts
                this.time.delayedCall(2000, () => {
                    this.makeAIConstructPlacement(player);
                });
            } else {
                // For other phases, just end turn
                this.time.delayedCall(1000, () => {
                    this.nextTurn();
                });
            }
        } else {
            // Human player's turn - provide instructions based on phase
            if (currentPhase === 'territory_selection') {
                this.showStatusMessage('Select a territory to claim (click Buy Land first)');
                // Make sure Buy Land button is enabled
                const buyLandBtn = document.getElementById('buy-land-btn');
                if (buyLandBtn) {
                    buyLandBtn.disabled = false;
                }
            } else if (currentPhase === 'construct_outfitting') {
                // Check if player has territories and gold
                const playerTerritories = this.gameFlowController.territoryGrid?.getPlayerTerritories(player.id) || [];
                const hasGold = player.gold >= 200;
                
                if (playerTerritories.length === 0) {
                    this.showStatusMessage('You have no territories. Click End Turn to continue.');
                } else if (!hasGold) {
                    this.showStatusMessage('Not enough gold for constructs (need 200). Click End Turn.');
                } else {
                    this.showStatusMessage('Click Upgrade Territory, then click your territories to build constructs (200 gold each)');
                    // Enable the upgrade button
                    const upgradeBtn = document.getElementById('upgrade-btn');
                    if (upgradeBtn) {
                        upgradeBtn.disabled = false;
                    }
                }
            } else if (currentPhase === 'auction_phase') {
                this.showStatusMessage('Auction phase - bidding coming soon. Click End Turn.');
            } else if (currentPhase === 'resource_production' || currentPhase === 'end_cycle_events') {
                // Automated phases - end turn automatically
                this.showStatusMessage('Automated phase - processing...');
                this.time.delayedCall(1000, () => {
                    this.nextTurn();
                });
            }
        }
    }
    
    onTurnEnded(event) {
        // Stop the turn timer when turn ends
        this.stopTurnTimer();
    }
    
    onTimerWarning(event) {
        const { remainingTime, urgencyLevel } = event;
        if (urgencyLevel === 'critical') {
            this.showStatusMessage(`WARNING: ${remainingTime} seconds remaining!`, 'warning');
        }
    }
    
    onTimerExpired(event) {
        this.showStatusMessage('Time expired! Turn ending...', 'error');
    }
    
    onTerritoryOwnershipChanged(event) {
        const { territoryId, newOwner } = event;
        const territory = this.gameFlowController.territoryGrid.getTerritoryById(territoryId);
        
        if (territory && territory.hex) {
            const owner = this.gameFlowController.stateManager.getPlayer(newOwner);
            if (owner) {
                // Update the hex border to show ownership
                territory.hex.lineStyle(2, owner.color, 0.8);
                territory.hex.strokePath();
            }
        }
    }
    
    onTerritoriesResolved(event) {
        console.log('Territories resolved, updating all territory visuals');
        this.updateAllTerritoryVisuals();
        this.showStatusMessage('Territory disputes resolved!');
    }
    
    updateAllTerritoryVisuals() {
        // Update all territory visuals to show ownership
        const territories = this.gameFlowController.territoryGrid?.territories || [];
        territories.forEach(territory => {
            if (territory.ownerId && territory.hex) {
                const owner = this.gameFlowController.stateManager.getPlayer(territory.ownerId);
                if (owner) {
                    territory.hex.lineStyle(2, owner.color, 0.8);
                    territory.hex.strokePath();
                    
                    // Add ownership marker if not already present
                    if (!territory.ownershipMarker) {
                        const pixelPos = this.hexUtils.axialToPixel(territory.q, territory.r);
                        territory.ownershipMarker = this.add.circle(pixelPos.x, pixelPos.y, this.hexSize / 4, owner.color);
                    }
                }
            }
        });
    }
    
    onTerritoryClaimed(event) {
        const { territoryId, newOwner } = event;
        const territory = this.gameFlowController.territoryGrid.getTerritoryById(territoryId);
        if (territory && territory.hex) {
            // Update visual to show ownership
            this.updateTerritoryVisual(territory);
        }
    }
    
    updateTerritoryVisual(territory) {
        if (!territory.hex) return;
        
        const owner = this.gameFlowController.stateManager.getPlayer(territory.ownerId);
        if (owner) {
            // Add owner indicator
            territory.hex.lineStyle(4, owner.color || 0xFFFFFF, 1);
            territory.hex.strokePath();
        }
    }
    
    // Removed duplicate method - using the no-parameter version above
    
    formatPhase(phase) {
        return phase.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
    
    clearTerritorySelection() {
        console.log('clearTerritorySelection called - selectedTerritory:', !!this.selectedTerritory, 'selectionHighlight:', !!this.selectionHighlight);
        
        // Clear selection in TerritoryGrid
        if (this.gameFlowController && this.gameFlowController.territoryGrid) {
            this.gameFlowController.territoryGrid.clearSelection();
        }
        
        // Stop the tween animation if it exists
        if (this.selectionTween) {
            this.selectionTween.stop();
            this.selectionTween = null;
        }
        
        // Always try to clear the highlight if it exists
        if (this.selectionHighlight) {
            this.selectionHighlight.destroy();
            this.selectionHighlight = null;
        }
        
        // Clear selected territory
        this.selectedTerritory = null;
        
        // Reset territory details
        if (this.territoryDetails) {
            this.territoryDetails.innerHTML = '<p>No territory selected</p>';
        }
    }
    
    makeAITerritorySelection(player) {
        console.log(`AI ${player.name} selecting territory...`);
        
        // Get all unowned territories
        const territories = this.gameFlowController.territoryGrid?.territories || [];
        const unownedTerritories = territories.filter(t => !t.ownerId);
        
        if (unownedTerritories.length === 0) {
            console.log('No unowned territories available');
            // End turn immediately if no territories available
            this.nextTurn();
            return;
        }
        
        // Sort territories by value (AI prefers higher value territories)
        const sortedTerritories = unownedTerritories.sort((a, b) => {
            const aValue = a.getWorth ? a.getWorth() : 100;
            const bValue = b.getWorth ? b.getWorth() : 100;
            return bValue - aValue;
        });
        
        // Select one of the top 3 territories randomly
        const topTerritories = sortedTerritories.slice(0, Math.min(3, sortedTerritories.length));
        const selectedTerritory = topTerritories[Math.floor(Math.random() * topTerritories.length)];
        
        console.log(`AI ${player.name} selected territory ${selectedTerritory.id} (worth: ${selectedTerritory.getWorth ? selectedTerritory.getWorth() : 'unknown'})`);
        
        // Make the selection
        const result = this.gameFlowController.territoryAcquisition.attemptClaim(player.id, selectedTerritory.id);
        
        if (result.success) {
            // Get territory type for better message
            const territoryType = selectedTerritory.type ? 
                this.formatTerritoryType(selectedTerritory.type) : 
                'territory';
            
            this.showStatusMessage(`${player.name} claimed ${territoryType} at ${selectedTerritory.id}`, 'info');
            
            // Visual feedback - briefly highlight the selected territory
            if (selectedTerritory.hex) {
                selectedTerritory.hex.lineStyle(4, player.color, 1);
                selectedTerritory.hex.strokePath();
                
                this.time.delayedCall(800, () => {
                    selectedTerritory.hex.lineStyle(2, player.color, 0.8);
                    selectedTerritory.hex.strokePath();
                });
            }
            
            // End turn after a delay - store the timer so we can cancel it if needed
            if (this.aiTurnEndTimer) {
                this.aiTurnEndTimer.remove();
            }
            this.aiTurnEndTimer = this.time.delayedCall(2000, () => {
                const currentPhase = this.gameFlowController?.cycleManager?.currentPhase;
                console.log(`AI ${player.name} ending turn after territory selection - current phase: ${currentPhase}`);
                // Only call nextTurn if we're still in the same phase
                if (currentPhase === 'territory_selection') {
                    this.nextTurn();
                } else {
                    console.log(`Phase has changed to ${currentPhase}, not calling nextTurn`);
                }
                this.aiTurnEndTimer = null;
            });
        } else {
            console.log(`AI ${player.name} failed to select territory, ending turn`);
            // If selection failed, end turn immediately
            this.nextTurn();
        }
    }
    
    makeAIConstructPlacement(player) {
        console.log(`AI ${player.name} placing constructs...`);
        
        // Track AI actions for summary
        const aiActions = [];
        
        // Get player's territories without constructs
        const playerTerritories = this.gameFlowController.territoryGrid?.getPlayerTerritories(player.id) || [];
        const emptyTerritories = playerTerritories.filter(t => !t.construct);
        
        if (emptyTerritories.length === 0) {
            console.log('No territories without constructs');
            this.showStatusMessage(`${player.name} has no empty territories for constructs`);
            this.time.delayedCall(2000, () => {
                this.nextTurn();
            });
            return;
        }
        
        // Check if player has enough gold (200 for basic construct)
        if (player.gold < 200) {
            console.log(`${player.name} doesn't have enough gold for constructs`);
            this.showStatusMessage(`${player.name} has insufficient gold for constructs (needs 200)`);
            this.time.delayedCall(2000, () => {
                this.nextTurn();
            });
            return;
        }
        
        // AI strategy: Try to build multiple constructs if possible
        let constructsBuilt = 0;
        const maxConstructs = Math.min(3, Math.floor(player.gold / 200), emptyTerritories.length);
        
        // Shuffle territories for variety
        const shuffledTerritories = [...emptyTerritories].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < maxConstructs; i++) {
            if (player.gold < 200) break;
            
            const selectedTerritory = shuffledTerritories[i];
            console.log(`AI ${player.name} attempting to build construct on territory ${selectedTerritory.id}`);
            
            // Place construct and track the action
            const constructType = this.getDefaultConstructType(selectedTerritory.type);
            const success = this.placeAIConstruct(player, selectedTerritory);
            
            if (success) {
                constructsBuilt++;
                const territoryType = this.formatTerritoryType(selectedTerritory.type);
                aiActions.push(`Built ${this.formatTerritoryType(constructType)} on ${territoryType}`);
                
                // Visual feedback
                if (selectedTerritory.hex) {
                    selectedTerritory.hex.lineStyle(4, player.color, 1);
                    selectedTerritory.hex.strokePath();
                    
                    this.time.delayedCall(800, () => {
                        selectedTerritory.hex.lineStyle(2, player.color, 0.8);
                        selectedTerritory.hex.strokePath();
                    });
                }
            }
        }
        
        // Show summary of AI actions
        if (aiActions.length > 0) {
            const summary = `${player.name}: ${aiActions.join(', ')}`;
            this.showStatusMessage(summary, 'info');
        } else {
            this.showStatusMessage(`${player.name} built no constructs this turn`);
        }
        
        // End turn after showing actions - store the timer so we can cancel it if needed
        if (this.aiTurnEndTimer) {
            this.aiTurnEndTimer.remove();
        }
        this.aiTurnEndTimer = this.time.delayedCall(3000, () => {
            console.log(`AI ${player.name} ending turn after construct placement`);
            // Only call nextTurn if we're still in the same phase
            if (this.gameFlowController?.cycleManager?.currentPhase === 'construct_outfitting') {
                this.nextTurn();
            } else {
                console.log('Phase has changed, not calling nextTurn');
            }
            this.aiTurnEndTimer = null;
        });
    }
    
    placeAIConstruct(player, territory) {
        console.log(`AI placing construct for ${player.name} on territory ${territory.id}`);
        
        // Determine construct type based on territory
        const constructType = this.getDefaultConstructType(territory.type);
        const buildCost = 200;
        
        // Deduct gold using GoldManager
        const goldResult = this.gameFlowController.goldManager.deductGold(
            player.id, 
            buildCost, 
            `AI Build ${constructType}`
        );
        
        if (!goldResult.success) {
            console.log(`AI failed to deduct gold: ${goldResult.error}`);
            return false;
        }
        
        // Create the construct using the Construct class
        const newConstruct = new Construct({
            id: `construct_${territory.id}_${Date.now()}`,
            type: constructType,
            level: 1,
            owner: player
        });
        
        // Store the construct on territory
        territory.construct = newConstruct;
        
        console.log(`AI created ${constructType} on territory ${territory.id}`);
        
        // Create visual representation
        const pixelPos = this.hexUtils.axialToPixel(territory.q, territory.r);
        
        // Clean up any existing visuals
        if (territory.constructGraphic) {
            territory.constructGraphic.destroy();
        }
        if (territory.constructText) {
            territory.constructText.destroy();
        }
        
        const constructGraphic = this.add.graphics();
        constructGraphic.fillStyle(0xFFFFFF, 0.8);
        constructGraphic.fillCircle(pixelPos.x, pixelPos.y, this.hexSize / 3);
        
        const constructText = this.add.text(pixelPos.x, pixelPos.y, "1", {
            font: '24px Arial',
            fill: '#000000'
        }).setOrigin(0.5);
        
        territory.constructGraphic = constructGraphic;
        territory.constructText = constructText;
        
        // Execute the action through turn manager
        this.gameFlowController.turnManager.executePlayerAction(player, {
            type: 'place_construct',
            target: territory.id,
            constructType: constructType
        });
        
        // Return success
        return true;
    }
    
    calculateTerritoryProduction(territory) {
        if (!territory.construct) return 0;
        
        const production = territory.calculateProductionSummary();
        return production ? production.amount : 0;
    }
    
    showImprovementOptions(territory) {
        console.log('Show improvement options for territory:', territory.id);
        
        const currentPlayer = this.gameFlowController.turnManager.getCurrentPlayer();
        if (!currentPlayer) return;
        
        // Check if territory already has a construct
        if (territory.construct) {
            this.showStatusMessage('This territory already has a construct!', 'warning');
            return;
        }
        
        // Check if player has enough gold (200 for basic construct)
        if (currentPlayer.gold < 200) {
            this.showStatusMessage('Not enough gold! You need 200 gold to build a construct.', 'error');
            return;
        }
        
        // Determine construct type based on territory type
        const constructType = this.getDefaultConstructType(territory.type);
        
        // Ask for confirmation
        const confirmMessage = `Build ${this.formatTerritoryType(constructType)} for 200 gold?`;
        
        // For now, auto-build (in a full implementation, you'd show a UI)
        console.log(confirmMessage);
        
        // Build the construct
        const construct = {
            type: constructType,
            level: 1,
            ownerId: currentPlayer.id
        };
        
        if (territory.placeConstruct) {
            // Use the action system to place the construct
            const action = {
                type: 'place_construct',
                target: territory.id,
                constructType: constructType,
                cost: 200
            };
            
            // Execute the action through the turn manager
            const success = this.gameFlowController.turnManager.executePlayerAction(currentPlayer, action);
            
            if (success) {
                // Place the construct
                territory.placeConstruct(construct);
                
                // Deduct gold
                currentPlayer.gold -= 200;
                
                // Update displays
                this.updatePlayerDisplay();
                
                // Add visual feedback
                const pixelPos = this.hexUtils.axialToPixel(territory.q, territory.r);
                const constructIcon = this.add.circle(pixelPos.x, pixelPos.y - 10, 8, 0xFFD700);
                constructIcon.setStrokeStyle(2, 0x000000);
                
                // Add level text
                const levelText = this.add.text(pixelPos.x, pixelPos.y - 10, '1', {
                    fontSize: '12px',
                    color: '#000000',
                    fontWeight: 'bold'
                });
                levelText.setOrigin(0.5);
                
                territory.constructVisual = constructIcon;
                territory.constructText = levelText;
                
                this.showStatusMessage(`Built ${this.formatTerritoryType(constructType)} on ${territory.id}!`);
                
                // Reset select mode
                this.selectMode = null;
                this.setSelectMode(null);
            } else {
                this.showStatusMessage('Cannot place construct - action failed', 'error');
            }
        }
    }
    
    startTurnTimer(player) {
        console.log('GameScene.startTurnTimer called for player:', player.id);
        
        // Clear any existing timer first
        this.stopTurnTimer();
        
        // Don't show timer for automated phases
        const currentPhase = this.gameFlowController.cycleManager?.currentPhase;
        if (currentPhase === 'resource_production' || currentPhase === 'end_cycle_events') {
            console.log('Timer hidden - automated phase:', currentPhase);
            if (this.timerContainer) {
                this.timerContainer.style.display = 'none';
            }
            return;
        }
        
        // Get time limit for current phase
        const phaseConfig = this.gameFlowController.turnManager?.phaseActionConfigs[currentPhase];
        const timeLimit = phaseConfig?.timeLimit || 120; // Default 2 minutes
        
        console.log('Phase config:', { currentPhase, timeLimit, player: player.id });
        
        // Show timer for ALL players (including humans)
        console.log('Showing timer for all players');
        
        // Create or update the timer bar
        if (!this.timerBar) {
            this.createTimerBar();
        }
        
        if (this.timerContainer) {
            this.timerContainer.style.display = 'block';
        }
        
        // Store the start time to prevent timer jumping
        this.timerStartTime = Date.now();
        this.totalTime = timeLimit;
        this.updateTimerBar(timeLimit, timeLimit);
        
        // Update timer every 100ms for smooth animation
        this.turnTimerInterval = setInterval(() => {
            // Calculate remaining time based on elapsed time to prevent jumps
            const elapsed = (Date.now() - this.timerStartTime) / 1000;
            const remainingTime = Math.max(0, this.totalTime - elapsed);
            
            this.updateTimerBar(remainingTime, this.totalTime);
            
            if (remainingTime <= 0) {
                this.stopTurnTimer();
            }
        }, 100);
    }
    
    stopTurnTimer() {
        if (this.turnTimerInterval) {
            clearInterval(this.turnTimerInterval);
            this.turnTimerInterval = null;
        }
        
        if (this.timerContainer) {
            this.timerContainer.style.display = 'none';
        }
        
        // Clean up timer bar references
        this.timerBar = null;
        this.timerText = null;
    }
    
    createTimerBar() {
        // Clear existing timer display content
        if (this.timerContainer) {
            this.timerContainer.innerHTML = '';
            
            // Create container for the bar
            const barContainer = document.createElement('div');
            barContainer.style.cssText = `
                width: 100%;
                height: 24px;
                background-color: rgba(0, 0, 0, 0.5);
                border: 2px solid #f5c542;
                border-radius: 12px;
                padding: 2px;
                position: relative;
                overflow: hidden;
            `;
            
            // Create the progress bar
            const progressBar = document.createElement('div');
            progressBar.id = 'timer-progress-bar';
            progressBar.style.cssText = `
                height: 100%;
                width: 100%;
                background-color: #f5c542;
                border-radius: 10px;
                transition: width 0.1s linear, background-color 0.3s ease;
            `;
            
            // Create time text overlay
            const timeText = document.createElement('div');
            timeText.id = 'timer-text';
            timeText.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-weight: bold;
                font-size: 14px;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
                pointer-events: none;
            `;
            
            barContainer.appendChild(progressBar);
            barContainer.appendChild(timeText);
            this.timerContainer.appendChild(barContainer);
            
            // Store references
            this.timerBar = progressBar;
            this.timerText = timeText;
        }
    }
    
    updateTimerBar(remainingTime, totalTime) {
        if (!this.timerBar || !this.timerText) return;
        
        // Calculate percentage
        const percentage = Math.max(0, (remainingTime / totalTime) * 100);
        
        // Update bar width
        this.timerBar.style.width = percentage + '%';
        
        // Change color when time is running low (15 seconds)
        if (remainingTime <= 15) {
            this.timerBar.style.backgroundColor = '#ff4444';
            if (this.timerBar.parentElement) {
                this.timerBar.parentElement.style.borderColor = '#ff4444';
            }
        } else if (remainingTime <= 30) {
            this.timerBar.style.backgroundColor = '#ffaa44';
            if (this.timerBar.parentElement) {
                this.timerBar.parentElement.style.borderColor = '#ffaa44';
            }
        } else {
            this.timerBar.style.backgroundColor = '#f5c542';
            if (this.timerBar.parentElement) {
                this.timerBar.parentElement.style.borderColor = '#f5c542';
            }
        }
        
        // Update time text
        const displaySeconds = Math.ceil(remainingTime);
        const minutes = Math.floor(displaySeconds / 60);
        const secs = displaySeconds % 60;
        this.timerText.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    destroy() {
        // Clean up timer when scene is destroyed
        this.stopTurnTimer();
        
        // Clean up UI panels
        if (this.productionSummaryPanel) {
            this.productionSummaryPanel.destroy();
        }
        
        super.destroy();
    }
    
    // Resource Production Visualization Methods
    initializeResourceVisualization() {
        // Define resource colors
        this.resourceColors = {
            gold: 0xFFD700,      // Gold
            mana: 0x0080ff,      // Blue
            food: 0x00ff00,      // Green
            smithium: 0xff8000,  // Orange
            vitality: 0x00ff00,  // Green (legacy)
            arcanum: 0xff8000,   // Orange (legacy)
            aether: 0xff00ff     // Purple (legacy)
        };
        
        // Create particle emitters for each resource type
        this.resourceParticles = {};
        
        // Create a simple white circle texture for particles if it doesn't exist
        if (!this.textures.exists('particle')) {
            const graphics = this.make.graphics({ x: 0, y: 0 }, false);
            graphics.fillStyle(0xffffff);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('particle', 8, 8);
            graphics.destroy();
        }
        
        Object.keys(this.resourceColors).forEach(resource => {
            const particles = this.add.particles(0, 0, 'particle', {
                tint: this.resourceColors[resource],
                scale: { start: 0.5, end: 0 },
                speed: { min: 50, max: 150 },
                lifespan: 1000,
                frequency: -1,
                emitting: false
            });
            this.resourceParticles[resource] = particles;
        });
    }
    
    getResourceColor(resource) {
        return this.resourceColors[resource] || 0xffffff;
    }
    
    onResourceProductionStarted(event) {
        console.log('GameScene.onResourceProductionStarted called');
        console.log('Resource production started:', event);
        this.showStatusMessage('Resources are being produced...', 'info');
        
        // Debug: Check if any territories will produce
        if (event.results) {
            const count = event.results.individualProduction?.length || 0;
            console.log(`Number of territories producing: ${count}`);
            if (count === 0) {
                console.warn('No territories are producing! Make sure territories have constructs.');
                this.showStatusMessage('No territories have constructs to produce resources!', 'warning');
            }
        }
    }
    
    onTerritoryProduced(event) {
        console.log('GameScene.onTerritoryProduced called:', event);
        const { territoryId, resource, amount, playerId } = event;
        
        // Get territory from grid
        const territory = this.gameFlowController.territoryGrid?.getTerritoryById(territoryId);
        if (!territory) {
            console.error('Territory not found:', territoryId);
            return;
        }
        
        // Show production animation
        this.showResourceProduction(territory, resource, amount);
    }
    
    onPlayerProductionApplied(event) {
        const { playerName, resources, storageResults } = event;
        
        // Update player display to show new resources
        this.updatePlayerDisplay();
        
        // Show overflow message if any
        if (storageResults.goldFromOverflow > 0) {
            this.showStatusMessage(
                `${playerName} converted overflow to ${storageResults.goldFromOverflow} gold!`, 
                'warning'
            );
        }
    }
    
    onResourceProductionCompleted(event) {
        const { summary } = event;
        console.log('Production completed:', summary);
        
        // Show production summary
        this.showProductionSummary(summary);
    }
    
    showResourceProduction(territory, resource, amount) {
        console.log(`showResourceProduction called: territory=${territory.id}, resource=${resource}, amount=${amount}`);
        if (amount <= 0) return;
        
        // Get territory position
        const pos = this.hexUtils.axialToPixel(territory.q, territory.r);
        console.log(`Territory position:`, pos);
        
        // Create floating text showing +X resource
        const color = `#${this.resourceColors[resource].toString(16).padStart(6, '0')}`;
        const text = this.add.text(pos.x, pos.y - 30, `+${amount}`, {
            fontSize: '20px',
            color: color,
            stroke: '#000000',
            strokeThickness: 3,
            fontWeight: 'bold'
        });
        text.setOrigin(0.5);
        
        // Animate text floating up and fading
        this.tweens.add({
            targets: text,
            y: pos.y - 80,
            alpha: 0,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => text.destroy()
        });
        
        // Emit particles from territory
        this.emitResourceParticles(pos, resource, amount);
        
        // Add resource icon next to text
        const iconSize = 16;
        const icon = this.add.graphics();
        icon.x = pos.x + 20;
        icon.y = pos.y - 30;
        
        // Draw resource-specific icon
        this.drawResourceIcon(icon, resource, iconSize);
        
        // Animate icon with text
        this.tweens.add({
            targets: icon,
            y: pos.y - 80,
            alpha: 0,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => icon.destroy()
        });
    }
    
    drawResourceIcon(graphics, resource, size) {
        const color = this.resourceColors[resource];
        graphics.fillStyle(color, 1);
        graphics.lineStyle(1, 0x000000, 1);
        
        switch (resource) {
            case 'mana':
                // Crystal shape
                graphics.beginPath();
                graphics.moveTo(0, -size);
                graphics.lineTo(size * 0.7, -size * 0.3);
                graphics.lineTo(size * 0.7, size * 0.3);
                graphics.lineTo(0, size);
                graphics.lineTo(-size * 0.7, size * 0.3);
                graphics.lineTo(-size * 0.7, -size * 0.3);
                graphics.closePath();
                break;
            case 'vitality':
                // Leaf shape
                graphics.beginPath();
                graphics.moveTo(0, -size);
                graphics.quadraticCurveTo(size * 0.5, -size * 0.5, size * 0.5, 0);
                graphics.quadraticCurveTo(size * 0.5, size * 0.5, 0, size);
                graphics.quadraticCurveTo(-size * 0.5, size * 0.5, -size * 0.5, 0);
                graphics.quadraticCurveTo(-size * 0.5, -size * 0.5, 0, -size);
                graphics.closePath();
                break;
            case 'arcanum':
                // Gear shape
                graphics.fillCircle(0, 0, size * 0.6);
                for (let i = 0; i < 6; i++) {
                    const angle = (i * Math.PI * 2) / 6;
                    const x = Math.cos(angle) * size * 0.8;
                    const y = Math.sin(angle) * size * 0.8;
                    graphics.fillCircle(x, y, size * 0.3);
                }
                break;
            case 'aether':
                // Star shape
                graphics.beginPath();
                for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI * 2) / 8;
                    const radius = i % 2 === 0 ? size : size * 0.5;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    if (i === 0) {
                        graphics.moveTo(x, y);
                    } else {
                        graphics.lineTo(x, y);
                    }
                }
                graphics.closePath();
                break;
        }
        
        graphics.fillPath();
        graphics.strokePath();
    }
    
    emitResourceParticles(from, resource, amount) {
        const emitter = this.resourceParticles[resource];
        if (!emitter) return;
        
        // Set emitter position
        emitter.setPosition(from.x, from.y);
        
        // Emit particles based on amount
        const particleCount = Math.min(amount * 2, 50);
        emitter.explode(particleCount);
    }
    
    showProductionSummary(summary) {
        console.log('Showing production summary:', summary);
        
        // Remove any existing summary
        const existingSummary = document.getElementById('production-summary-modal');
        if (existingSummary) {
            document.body.removeChild(existingSummary);
        }
        
        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'production-summary-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;
        
        // Create modal content
        const content = document.createElement('div');
        content.style.cssText = `
            background-color: rgba(20, 20, 20, 0.95);
            border: 3px solid #FFD700;
            border-radius: 15px;
            padding: 30px;
            max-width: 90%;
            max-height: 80%;
            overflow-y: auto;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        `;
        
        // Title
        const title = document.createElement('h2');
        title.textContent = 'Resource Production Summary';
        title.style.cssText = `
            color: #FFD700;
            text-align: center;
            margin: 0 0 20px 0;
            font-size: 28px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        `;
        content.appendChild(title);
        
        // Create table
        const table = document.createElement('table');
        table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 16px;
        `;
        
        // Table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.style.cssText = `
            background-color: rgba(255, 215, 0, 0.2);
            border-bottom: 2px solid #FFD700;
        `;
        
        const headers = ['Player', 'Mana', 'Vitality', 'Arcanum', 'Aether', 'Total'];
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            th.style.cssText = `
                padding: 12px;
                text-align: left;
                color: #FFD700;
                font-weight: bold;
            `;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Table body
        const tbody = document.createElement('tbody');
        
        // Process production data by player
        const playerProductions = {};
        
        // First, initialize all players with zero production
        const allPlayers = this.gameFlowController.stateManager.gameState.players;
        allPlayers.forEach(player => {
            playerProductions[player.id] = {
                name: player.name,
                territories: [],
                totals: { gold: 0, mana: 0, food: 0, smithium: 0, vitality: 0, arcanum: 0, aether: 0 }
            };
        });
        
        console.log('Production summary data structure:', summary);
        
        // Extract production data from summary - handle multiple formats
        if (summary.playerProduction && Array.isArray(summary.playerProduction)) {
            // Format: { playerProduction: [{playerId, resources: {mana: X, ...}}] }
            summary.playerProduction.forEach(playerData => {
                if (playerProductions[playerData.playerId]) {
                    Object.entries(playerData.resources || {}).forEach(([resource, amount]) => {
                        playerProductions[playerData.playerId].totals[resource] = amount;
                    });
                }
            });
        }
        
        if (summary.individualProduction && Array.isArray(summary.individualProduction)) {
            // Format: { individualProduction: [{playerId, resource, amount, territoryId}] }
            summary.individualProduction.forEach(prod => {
                if (playerProductions[prod.playerId]) {
                    // Add to totals if not already set by playerProduction
                    if (!summary.playerProduction) {
                        playerProductions[prod.playerId].totals[prod.resource] = 
                            (playerProductions[prod.playerId].totals[prod.resource] || 0) + prod.amount;
                    }
                    
                    // Add territory details
                    playerProductions[prod.playerId].territories.push({
                        territoryId: prod.territoryId,
                        resource: prod.resource,
                        amount: prod.amount
                    });
                    
                    playerProductions[prod.playerId].totals[prod.resource] += prod.amount;
                }
            });
        }
        
        // Add rows for each player
        Object.values(playerProductions).forEach(playerData => {
            const row = document.createElement('tr');
            row.style.cssText = `
                background-color: rgba(255, 255, 255, 0.05);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            `;
            
            // Player name cell
            const playerCell = document.createElement('td');
            playerCell.textContent = playerData.name;
            playerCell.style.cssText = `
                padding: 15px;
                color: #FFFFFF;
                font-weight: bold;
                font-size: 18px;
            `;
            row.appendChild(playerCell);
            
            // Resource totals
            const resources = ['mana', 'vitality', 'arcanum', 'aether'];
            resources.forEach(resource => {
                const cell = document.createElement('td');
                const amount = playerData.totals[resource] || 0;
                cell.textContent = amount > 0 ? amount : '-';
                cell.style.cssText = `
                    padding: 15px;
                    text-align: center;
                    color: ${amount > 0 ? `#${this.resourceColors[resource].toString(16).padStart(6, '0')}` : '#666666'};
                    font-weight: bold;
                    font-size: 20px;
                `;
                row.appendChild(cell);
            });
            
            // Total cell
            const totalCell = document.createElement('td');
            const total = Object.values(playerData.totals).reduce((sum, val) => sum + (val || 0), 0);
            totalCell.textContent = (isNaN(total) || total === 0) ? '-' : total;
            totalCell.style.cssText = `
                padding: 15px;
                text-align: center;
                color: ${(isNaN(total) || total === 0) ? '#666666' : '#FFD700'};
                font-weight: bold;
                font-size: 22px;
                text-shadow: ${(isNaN(total) || total === 0) ? 'none' : '2px 2px 4px rgba(0, 0, 0, 0.5)'};
            `;
            row.appendChild(totalCell);
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        content.appendChild(table);
        
        // Continue button
        const continueButton = document.createElement('button');
        continueButton.textContent = 'Continue';
        continueButton.style.cssText = `
            display: block;
            margin: 0 auto;
            padding: 10px 30px;
            background-color: #4a5aa8;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 18px;
            cursor: pointer;
            transition: background-color 0.2s;
        `;
        
        continueButton.addEventListener('mouseover', () => {
            continueButton.style.backgroundColor = '#5c6ec9';
        });
        
        continueButton.addEventListener('mouseout', () => {
            continueButton.style.backgroundColor = '#4a5aa8';
        });
        
        continueButton.addEventListener('click', () => {
            document.body.removeChild(modal);
            // Let the game continue
            this.showStatusMessage('Production phase complete!', 'info');
        });
        
        content.appendChild(continueButton);
        modal.appendChild(content);
        document.body.appendChild(modal);
    }
    
    // Resource Decay Event Handlers
    onResourceDecayProcessing(event) {
        console.log('Resource decay processing:', event);
        this.showStatusMessage('Resources are decaying...', 'warning');
    }
    
    onPlayerResourcesDecayed(event) {
        const { playerName, decayed, preserved } = event;
        
        // Show decay amounts
        const decayText = Object.entries(decayed)
            .filter(([_, amount]) => amount > 0)
            .map(([resource, amount]) => `${resource}: -${amount}`)
            .join(', ');
            
        if (decayText) {
            this.showStatusMessage(`${playerName} lost ${decayText} to decay`, 'warning');
        }
        
        // Update player display
        this.updatePlayerDisplay();
    }
    
    onResourceDecayCompleted(event) {
        const { summary } = event;
        console.log('Decay completed:', summary);
        
        // Show total decay summary
        const totalDecay = Object.values(summary.totalDecayed).reduce((sum, val) => sum + val, 0);
        if (totalDecay > 0) {
            this.showStatusMessage(`Total resources decayed: ${totalDecay}`, 'warning');
        }
    }
    
    // Gold Transaction Event Handlers
    onGoldDeducted(event) {
        const { playerId, amount, reason, newBalance } = event;
        const player = this.gameFlowController.stateManager.getPlayer(playerId);
        
        if (player) {
            this.showStatusMessage(`${player.name} spent ${amount} gold on ${reason} (Balance: ${newBalance})`, 'warning');
            
            // Show floating text at player panel
            this.showFloatingGoldText(playerId, `-${amount}`, 0xff0000);
        }
        
        // Update player display
        this.updatePlayerDisplay();
    }
    
    onGoldAdded(event) {
        const { playerId, amount, reason, newBalance } = event;
        const player = this.gameFlowController.stateManager.getPlayer(playerId);
        
        if (player) {
            this.showStatusMessage(`${player.name} gained ${amount} gold from ${reason} (Balance: ${newBalance})`, 'success');
            
            // Show floating text at player panel
            this.showFloatingGoldText(playerId, `+${amount}`, 0x00ff00);
        }
        
        // Update player display
        this.updatePlayerDisplay();
    }
    
    showFloatingGoldText(playerId, text, color) {
        // Find player panel position
        const playerIndex = this.gameFlowController.stateManager.gameState.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return;
        
        // Calculate position based on player panel
        const x = 100 + (playerIndex * 200);
        const y = 50;
        
        // Create floating text
        const floatingText = this.add.text(x, y, text, {
            fontSize: '24px',
            color: `#${color.toString(16).padStart(6, '0')}`,
            stroke: '#000000',
            strokeThickness: 3,
            fontWeight: 'bold'
        });
        floatingText.setOrigin(0.5);
        
        // Animate floating up and fading
        this.tweens.add({
            targets: floatingText,
            y: y - 50,
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => floatingText.destroy()
        });
    }
}