/**
 * ConstructSystemIntegration
 * Integrates all construct system components into the game
 */
import ConstructShopPanel from '../ui/panels/ConstructShopPanel.js';
import ConstructSelectionPanel from '../ui/panels/ConstructSelectionPanel.js';
import ConstructManagementPanel from '../ui/panels/ConstructManagementPanel.js';
import ProductionMonitorDOM from '../ui/panels/ProductionMonitorDOM.js';
import ConstructPlacementMode from '../ui/ConstructPlacementMode.js';
import InstallationAnimator from '../ui/InstallationAnimator.js';
import { CONSTRUCT_DEFINITIONS } from '../config/gameConfig.js';

export default class ConstructSystemIntegration {
    constructor(scene) {
        this.scene = scene;
        this.panels = {};
        this.systems = {};
        this.isInitialized = false;
    }

    /**
     * Initialize all construct system components
     */
    initialize() {
        if (this.isInitialized) {
            console.warn('Construct system already initialized');
            return;
        }

        console.log('Initializing Construct System...');

        // Create UI panels
        this.createPanels();

        // Create systems
        this.createSystems();

        // Setup event listeners
        this.setupEventListeners();

        // Add UI controls
        this.addUIControls();

        // Initialize construct manager with production calculator
        this.initializeConstructManager();

        this.isInitialized = true;
        console.log('Construct System initialized successfully');
    }

    /**
     * Create all UI panels
     */
    createPanels() {
        // Construct Shop Panel
        this.panels.shop = new ConstructShopPanel(
            this.scene,
            this.scene.cameras.main.width / 2,
            this.scene.cameras.main.height / 2
        );

        // Construct Selection Panel (for placing from inventory)
        this.panels.selection = new ConstructSelectionPanel(
            this.scene,
            this.scene.cameras.main.width / 2,
            this.scene.cameras.main.height / 2
        );

        // Construct Management Panel
        this.panels.management = new ConstructManagementPanel(
            this.scene,
            this.scene.cameras.main.width / 2,
            this.scene.cameras.main.height / 2
        );

        // Production Monitor - DOM version to avoid camera issues
        this.panels.monitor = new ProductionMonitorDOM(this.scene);
        console.log('Production Monitor (DOM) created:', this.panels.monitor);
    }

    /**
     * Create game systems
     */
    createSystems() {
        // Placement Mode
        this.systems.placementMode = new ConstructPlacementMode(this.scene);

        // Installation Animator
        this.systems.installationAnimator = new InstallationAnimator(this.scene);

        // Make systems accessible to scene
        this.scene.constructPlacementMode = this.systems.placementMode;
        this.scene.installationAnimator = this.systems.installationAnimator;
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Shop events
        this.scene.events.on('construct-purchased', this.onConstructPurchased, this);
        this.scene.events.on('construct-shop-opened', this.onShopOpened, this);
        this.scene.events.on('construct-shop-closed', this.onShopClosed, this);

        // Placement events
        this.scene.events.on('placement-mode-activated', this.onPlacementModeActivated, this);
        this.scene.events.on('placement-cancelled', this.onPlacementCancelled, this);
        this.scene.events.on('installation-started', this.onInstallationStarted, this);

        // Installation events
        this.scene.events.on('installation-completed', this.onInstallationCompleted, this);
        this.scene.events.on('installation-cancelled', this.onInstallationCancelled, this);

        // Management events
        this.scene.events.on('construct-upgrade-requested', this.onUpgradeRequested, this);
        this.scene.events.on('construct-repair-requested', this.onRepairRequested, this);

        // Game flow events
        if (this.scene.gameFlowController) {
            // Phase events
            this.scene.gameFlowController.on('phase.started', this.onPhaseStarted.bind(this));
            this.scene.gameFlowController.on('phase.ended', this.onPhaseEnded.bind(this));

            // Production events
            this.scene.gameFlowController.on('resource_production.started', this.onProductionStarted.bind(this));
            this.scene.gameFlowController.on('resource_production.completed', this.onProductionCompleted.bind(this));
        }
    }

    /**
     * Initialize construct manager with dependencies
     */
    initializeConstructManager() {
        const constructManager = this.scene.gameFlowController?.constructManager;
        const productionCalculator = this.scene.gameFlowController?.resourceProductionCalculator;

        if (constructManager && productionCalculator) {
            constructManager.initialize(productionCalculator);
            console.log('ConstructManager initialized with ProductionCalculator');
        }
    }

    /**
     * Add UI control buttons
     */
    addUIControls() {
        // Only add keyboard shortcuts - no visible buttons
        // The buttons were overlapping the game board
        this.setupKeyboardShortcuts();
        
        // Show keyboard shortcut hints in console
        console.log('Construct System Keyboard Shortcuts:');
        console.log('  C or S - Open Construct Shop');
        console.log('  M - Open Construct Management');
        console.log('  P - Toggle Production Monitor');
    }


    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        // Create keyboard keys
        const keyS = this.scene.input.keyboard.addKey('S');
        const keyM = this.scene.input.keyboard.addKey('M');
        const keyP = this.scene.input.keyboard.addKey('P');
        const keyC = this.scene.input.keyboard.addKey('C');
        const shiftKey = this.scene.input.keyboard.addKey('SHIFT');

        // S or C - Open shop
        keyS.on('down', () => {
            if (!shiftKey.isDown) {
                this.panels.shop.toggle();
            }
        });

        keyC.on('down', () => {
            if (!shiftKey.isDown) {
                this.panels.shop.toggle();
            }
        });

        // M - Open management
        keyM.on('down', () => {
            if (!shiftKey.isDown) {
                this.panels.management.toggle();
            }
        });

        // P - Toggle production monitor
        keyP.on('down', () => {
            console.log('P key pressed, shift down:', shiftKey.isDown);
            if (!shiftKey.isDown) {
                console.log('Toggling production monitor');
                this.panels.monitor.toggle();
                
                // If showing, update with current production data
                if (this.panels.monitor.isVisible) {
                    this.updateCurrentProduction();
                }
            }
        });
    }

    // Event Handlers

    onConstructPurchased(data) {
        console.log('Construct purchased:', data.construct.type);
        
        // Check if we have a pre-selected territory (from territory click -> shop flow)
        if (this.scene.selectedTerritoryForConstruct) {
            console.log('Pre-selected territory found, placing construct immediately');
            // The GameScene will handle the placement
            this.panels.shop.hide();
        } else {
            // Normal flow: activate placement mode for selecting a territory
            if (data.construct && this.systems.placementMode) {
                this.systems.placementMode.activatePlacementMode(data.construct);
                this.panels.shop.hide(); // Hide shop during placement
            }
        }
    }

    onShopOpened() {
        // Close other panels
        this.panels.management.hide();
    }

    onShopClosed() {
        // Could show tips or other UI
    }

    onPlacementModeActivated(data) {
        console.log('Placement mode activated for:', data.construct.type);
    }

    onPlacementCancelled(data) {
        console.log('Placement cancelled');
        // Could return construct to inventory or refund
    }

    onInstallationStarted(data) {
        console.log('Installation started:', data.construct.type);
    }

    onInstallationCompleted(data) {
        console.log('Installation completed:', data.result.outcome);
        
        // Update management panel if open
        if (this.panels.management.isVisible) {
            this.panels.management.updateConstructList();
        }
        
        // Update production monitor to show new estimated production
        if (this.panels.monitor.isVisible) {
            setTimeout(() => {
                this.updateCurrentProduction();
            }, 500); // Small delay to ensure construct is fully placed
        }
    }

    onInstallationCancelled(data) {
        console.log('Installation cancelled');
    }

    onUpgradeRequested(data) {
        console.log('Upgrade requested for:', data.construct.type);
        // Could open upgrade interface
    }

    onRepairRequested(data) {
        console.log('Repair requested for:', data.construct.type);
        
        const player = this.scene.gameFlowController?.turnManager?.currentPlayer;
        if (player && player.canAfford(data.cost)) {
            // Perform repair
            if (data.construct.repair(data.cost, player)) {
                console.log('Construct repaired successfully');
                this.panels.management.updateConstructList();
            }
        } else {
            console.log('Cannot afford repair');
        }
    }

    onPhaseStarted(phase) {
        console.log('Phase started:', phase);
        
        // Enable/disable UI based on phase
        switch (phase) {
            case 'construct_outfitting':
                // Enable construct-related UI
                this.enableConstructUI(true);
                break;
            case 'resource_production':
                // Show production monitor
                if (!this.panels.monitor.isVisible) {
                    this.panels.monitor.show();
                }
                break;
            default:
                // Disable construct UI during other phases
                this.enableConstructUI(false);
                break;
        }
    }

    onPhaseEnded(phase) {
        if (phase === 'construct_outfitting') {
            // Ensure placement mode is cancelled
            if (this.systems.placementMode.isActive) {
                this.systems.placementMode.cancelPlacement();
            }
        }
    }

    onProductionStarted(data) {
        console.log('Resource production started', data);
        
        // Always show production monitor during production
        this.panels.monitor.show();
        
        // Initialize with zeros if no data yet
        const initData = {
            summary: {
                individualProduction: [],
                playerProduction: []
            }
        };
        
        this.updateProductionMonitor(data || initData);
    }

    onProductionCompleted(data) {
        console.log('Resource production completed', data);
        
        // Always update production monitor with final data
        if (data) {
            this.updateProductionMonitor(data);
        }
        
        // Keep monitor visible for a few seconds after production
        setTimeout(() => {
            if (this.panels.monitor.isVisible) {
                // Optionally hide after viewing
                // this.panels.monitor.hide();
            }
        }, 5000);
    }

    /**
     * Enable or disable construct UI
     */
    enableConstructUI(enabled) {
        // Could disable buttons or show messages during wrong phase
        if (!enabled) {
            this.panels.shop.hide();
            if (this.systems.placementMode.isActive) {
                this.systems.placementMode.cancelPlacement();
            }
        }
    }

    /**
     * Update production monitor with game data
     */
    updateProductionMonitor(productionData) {
        console.log('Updating production monitor with data:', productionData);
        
        // Format data for monitor
        const monitorData = {
            currentCycle: this.scene.gameFlowController?.cycleManager?.currentCycle || 1,
            totalCycles: this.scene.gameFlowController?.cycleManager?.totalCycles || 12,
            phase: this.scene.gameFlowController?.cycleManager?.currentPhase || 'unknown',
            production: {},
            maxProduction: {},
            territoryBreakdown: [],
            alerts: []
        };

        // Get current player ID
        const currentPlayerId = this.getCurrentPlayerId();
        
        // Initialize production totals
        const resourceTypes = ['mana', 'vitality', 'arcanum', 'aether'];
        resourceTypes.forEach(resource => {
            monitorData.production[resource] = 0;
        });
        
        // Calculate production from individual territories
        if (productionData.summary && productionData.summary.individualProduction) {
            productionData.summary.individualProduction.forEach(prod => {
                if (prod.playerId === currentPlayerId) {
                    monitorData.production[prod.resource] = (monitorData.production[prod.resource] || 0) + prod.amount;
                }
            });
        }
        
        // Alternative: check playerProduction if available
        if (productionData.summary && productionData.summary.playerProduction) {
            const playerProd = productionData.summary.playerProduction.find(p => p.playerId === currentPlayerId);
            if (playerProd && playerProd.resources) {
                Object.keys(playerProd.resources).forEach(resource => {
                    if (resourceTypes.includes(resource)) {
                        monitorData.production[resource] = playerProd.resources[resource];
                    }
                });
            }
        }

        // Set max production based on number of constructs
        const playerConstructCount = this.getPlayerConstructCount();
        monitorData.maxProduction = {
            mana: playerConstructCount * 20,
            vitality: playerConstructCount * 20,
            arcanum: playerConstructCount * 20,
            aether: playerConstructCount * 10
        };

        // Add territory breakdown
        if (productionData.individualProduction) {
            monitorData.territoryBreakdown = productionData.individualProduction
                .filter(prod => prod.playerId === this.getCurrentPlayerId())
                .map(prod => ({
                    type: prod.territoryType || 'unknown',
                    resource: prod.resource,
                    amount: prod.amount
                }))
                .slice(0, 5); // Top 5
        }

        // Add alerts for low efficiency constructs
        const constructManager = this.scene.gameFlowController?.constructManager;
        if (constructManager) {
            const playerConstructs = constructManager.getPlayerConstructs(this.getCurrentPlayerId());
            playerConstructs.forEach(construct => {
                if (construct.status === 'active' && construct.efficiency < 1.0) {
                    const territory = construct.territory;
                    const location = territory ? `(${Math.round(territory.x)}, ${Math.round(territory.y)})` : 'unknown';
                    monitorData.alerts.push(
                        `Territory ${location}: Construct at ${Math.floor(construct.efficiency * 100)}% efficiency`
                    );
                }
            });
        }

        // Update the monitor
        this.panels.monitor.updateProduction(monitorData);
    }

    /**
     * Get current player ID
     */
    getCurrentPlayerId() {
        return this.scene.gameFlowController?.turnManager?.currentPlayer?.id || 
               this.scene.gameFlowController?.gameStateManager?.getCurrentPlayer()?.id ||
               'player1';
    }
    
    /**
     * Get the number of constructs owned by current player
     */
    getPlayerConstructCount() {
        const playerId = this.getCurrentPlayerId();
        if (!playerId) return 0;
        
        let count = 0;
        const territories = this.scene.gameFlowController?.territoryGrid?.territories || [];
        territories.forEach(territory => {
            if (territory.ownerId === playerId && territory.construct) {
                count++;
            }
        });
        
        return count;
    }
    
    /**
     * Update production monitor with current estimated production
     */
    updateCurrentProduction() {
        console.log('Updating current production estimates');
        
        const currentPlayerId = this.getCurrentPlayerId();
        const territories = this.scene.gameFlowController?.territoryGrid?.territories || [];
        const calculator = this.scene.gameFlowController?.resourceProductionCalculator;
        
        // Calculate current production
        const production = {
            mana: 0,
            vitality: 0,
            arcanum: 0,
            aether: 0
        };
        
        territories.forEach(territory => {
            if (territory.ownerId === currentPlayerId && territory.construct && territory.construct.status === 'active') {
                // Use the production calculator if available
                if (calculator) {
                    const amount = calculator.calculateProduction(territory);
                    const resource = calculator.getResourceTypeFromConstruct(territory.construct.type);
                    if (resource && amount > 0) {
                        production[resource] = (production[resource] || 0) + amount;
                    }
                } else {
                    // Fallback: estimate based on construct type
                    const constructDef = CONSTRUCT_DEFINITIONS[territory.construct.type];
                    if (constructDef) {
                        const resource = constructDef.resourceType;
                        const baseAmount = (constructDef.baseProduction.min + constructDef.baseProduction.max) / 2;
                        const efficiency = territory.construct.efficiency || 1;
                        production[resource] = (production[resource] || 0) + Math.floor(baseAmount * efficiency);
                    }
                }
            }
        });
        
        // Create production data in expected format
        const productionData = {
            summary: {
                playerProduction: [{
                    playerId: currentPlayerId,
                    resources: production
                }]
            }
        };
        
        this.updateProductionMonitor(productionData);
    }

    // Public API Methods
    
    /**
     * Open the construct shop panel
     */
    openShop() {
        this.panels.shop.show();
    }
    
    /**
     * Open the construct selection panel (for placing from inventory)
     */
    openSelection(player, callback) {
        this.panels.selection.show(player, callback);
    }
    
    /**
     * Open the construct management panel
     */
    openManagement() {
        this.panels.management.show();
    }
    
    /**
     * Toggle the production monitor
     */
    toggleProductionMonitor() {
        this.panels.monitor.toggle();
    }
    
    /**
     * Clean up the construct system
     */
    destroy() {
        // Remove event listeners
        this.scene.events.off('construct-purchased', this.onConstructPurchased, this);
        this.scene.events.off('construct-shop-opened', this.onShopOpened, this);
        this.scene.events.off('construct-shop-closed', this.onShopClosed, this);
        this.scene.events.off('placement-mode-activated', this.onPlacementModeActivated, this);
        this.scene.events.off('placement-cancelled', this.onPlacementCancelled, this);
        this.scene.events.off('installation-started', this.onInstallationStarted, this);
        this.scene.events.off('installation-completed', this.onInstallationCompleted, this);
        this.scene.events.off('installation-cancelled', this.onInstallationCancelled, this);
        this.scene.events.off('construct-upgrade-requested', this.onUpgradeRequested, this);
        this.scene.events.off('construct-repair-requested', this.onRepairRequested, this);

        // Destroy panels
        Object.values(this.panels).forEach(panel => {
            if (panel && panel.destroy) {
                panel.destroy();
            }
        });

        // Destroy systems
        Object.values(this.systems).forEach(system => {
            if (system && system.destroy) {
                system.destroy();
            }
        });

        this.panels = {};
        this.systems = {};
        this.isInitialized = false;
    }
}