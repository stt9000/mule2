import Territory from './Territory.js';
import { TERRITORY_TYPES } from '../config/gameConfig.js';
import ErrorHandler from '../utils/ErrorHandler.js';

/**
 * TerritoryGrid
 * Manages the hexagonal grid of territories and their interactions
 */
export default class TerritoryGrid {
    constructor(width, height, gameFlowController) {
        this.width = width;
        this.height = height;
        this.gameFlow = gameFlowController;
        this.eventSystem = gameFlowController;
        this.territories = [];
        this.territoryMap = new Map(); // For quick lookup by id or coordinates
        this.selectedTerritory = null;
        this.hoveredTerritory = null;
        
        // Error handling
        this.errorHandler = new ErrorHandler();
        
        // Generate initial territories
        this.generateTerritories();
        
        // Defer event listener setup until after GameFlowController is fully initialized
        // This will be called by GameFlowController after all systems are ready
    }

    /**
     * Generate the territory grid
     */
    generateTerritories() {
        const territoryTypes = Object.values(TERRITORY_TYPES || [
            'ancient_grove', 'crystalline_cave', 'ruined_temple', 
            'mountain_peak', 'marshland', 'volcanic_field'
        ]);
        
        // Use offset coordinates for hexagonal grid
        for (let r = 0; r < this.height; r++) {
            for (let q = 0; q < this.width; q++) {
                const id = `territory_${q}_${r}`;
                const type = territoryTypes[Math.floor(Math.random() * territoryTypes.length)];
                
                // Calculate screen position (hexagonal layout)
                const hexSize = 50;
                const x = hexSize * 3/2 * q;
                const y = hexSize * Math.sqrt(3) * (r + 0.5 * (q & 1));
                
                const territory = new Territory({
                    id: id,
                    q: q,
                    r: r,
                    type: type,
                    x: x,
                    y: y,
                    gameFlowController: this.gameFlow
                });
                
                this.territories.push(territory);
                this.territoryMap.set(id, territory);
                this.territoryMap.set(`${q},${r}`, territory);
            }
        }
        
        // Calculate adjacent territories and interference
        this.calculateAdjacencies();
    }

    /**
     * Setup event listeners for game flow integration
     */
    setupEventListeners() {
        if (!this.eventSystem) return;
        
        this.eventSystem.on('phase.started', this.onPhaseStarted.bind(this));
        this.eventSystem.on('turn.started', this.onTurnStarted.bind(this));
        this.eventSystem.on('timer.warning', this.onTimerWarning.bind(this));
        this.eventSystem.on('cycle.started', this.onCycleStarted.bind(this));
    }

    /**
     * Calculate adjacencies for all territories
     */
    calculateAdjacencies() {
        this.territories.forEach(territory => {
            const adjacent = territory.getAdjacentTerritories(this);
            // Store adjacency information if needed
            territory.adjacentTerritories = adjacent;
        });
    }

    /**
     * Get territory at specific coordinates
     */
    getTerritoryAt(q, r) {
        return this.territoryMap.get(`${q},${r}`);
    }

    /**
     * Get territory by ID
     */
    getTerritoryById(id) {
        return this.territoryMap.get(id);
    }

    /**
     * Select a territory
     */
    selectTerritory(territoryId, playerId) {
        console.log('TerritoryGrid.selectTerritory called:', { territoryId, playerId });
        
        const territory = this.getTerritoryById(territoryId);
        const currentPhase = this.gameFlow?.cycleManager?.currentPhase;
        
        console.log('Territory found:', !!territory, territory?.id);
        
        if (!territory) {
            console.log('Territory not found!');
            return false;
        }

        // Emit selection attempt event
        this.eventSystem?.broadcastEvent('territory.selection.attempted', {
            territoryId,
            playerId,
            cycle: this.gameFlow?.cycleManager?.currentCycle,
            phase: currentPhase
        });

        // Validate selection based on current game state
        const canSelect = this.canSelectTerritory(territory, playerId);
        console.log('Can select territory:', canSelect);
        
        if (canSelect) {
            // Deselect previous territory
            if (this.selectedTerritory) {
                this.selectedTerritory.isSelected = false;
            }
            
            this.selectedTerritory = territory;
            territory.isSelected = true;
            
            console.log('Broadcasting territory.selected event');
            this.eventSystem?.broadcastEvent('territory.selected', {
                territory: territory,
                playerId: playerId
            });
            return true;
        }
        
        return false;
    }
    
    /**
     * Clear any selected territory
     */
    clearSelection() {
        console.log('TerritoryGrid.clearSelection called');
        if (this.selectedTerritory) {
            this.selectedTerritory.isSelected = false;
            this.selectedTerritory = null;
        }
    }

    /**
     * Check if territory can be selected
     */
    canSelectTerritory(territory, playerId) {
        if (!this.gameFlow) return true;
        
        const currentPhase = this.gameFlow.cycleManager?.currentPhase;
        const turnManager = this.gameFlow.turnManager;
        
        console.log('canSelectTerritory check:', {
            currentPhase,
            playerId,
            territoryId: territory.id,
            hasGameFlow: !!this.gameFlow,
            hasCycleManager: !!this.gameFlow.cycleManager
        });
        
        // Always allow selection for viewing purposes
        // Actions will be validated separately when trying to claim/modify
        return true;
        
        // Original phase-specific rules (commented out for now)
        /*
        switch (currentPhase) {
            case 'territory_selection':
                return turnManager.canPlayerAct(playerId, { type: 'claim_territory' });
            case 'construct_outfitting':
                return territory.ownerId === playerId;
            default:
                return false;
        }
        */
    }

    /**
     * Handle phase started event
     */
    onPhaseStarted(event) {
        const { phase } = event;
        
        switch (phase) {
            case 'territory_selection':
                this.resetSelectionState();
                this.enableTerritorySelection();
                break;
            case 'construct_outfitting':
                this.enableConstructPlacement();
                break;
            case 'resource_production':
                this.calculateAllProduction();
                break;
            default:
                this.disableInteraction();
        }
    }

    /**
     * Handle turn started event
     */
    onTurnStarted(event) {
        const currentPlayer = this.gameFlow?.turnManager?.getCurrentPlayer();
        
        if (currentPlayer) {
            // Highlight territories available to current player
            this.highlightAvailableTerritoriesForPlayer(currentPlayer.id);
        }
    }

    /**
     * Handle timer warning event
     */
    onTimerWarning(event) {
        if (event.urgencyLevel === 'critical') {
            this.highlightUrgentActions();
        }
    }

    /**
     * Handle cycle started event
     */
    onCycleStarted(event) {
        const { cycle } = event;
        
        // Update all territories for new cycle
        this.territories.forEach(territory => {
            territory.updateForNewCycle(cycle);
        });
    }

    /**
     * Reset selection state
     */
    resetSelectionState() {
        if (this.selectedTerritory) {
            this.selectedTerritory.isSelected = false;
        }
        this.selectedTerritory = null;
        
        this.territories.forEach(territory => {
            territory.isHighlighted = false;
        });
    }

    /**
     * Enable territory selection mode
     */
    enableTerritorySelection() {
        // Highlight unowned territories
        this.territories.forEach(territory => {
            if (!territory.ownerId) {
                territory.isHighlighted = true;
            }
        });
    }

    /**
     * Enable construct placement mode
     */
    enableConstructPlacement() {
        const currentPlayer = this.gameFlow?.turnManager?.getCurrentPlayer();
        
        if (currentPlayer) {
            // Highlight player's territories without constructs
            this.territories.forEach(territory => {
                if (territory.ownerId === currentPlayer.id && !territory.construct) {
                    territory.isHighlighted = true;
                }
            });
        }
    }

    /**
     * Disable interaction
     */
    disableInteraction() {
        this.resetSelectionState();
    }

    /**
     * Highlight territories available to player
     */
    highlightAvailableTerritoriesForPlayer(playerId) {
        const currentPhase = this.gameFlow?.cycleManager?.currentPhase;
        
        this.territories.forEach(territory => {
            switch (currentPhase) {
                case 'territory_selection':
                    territory.isHighlighted = !territory.ownerId;
                    break;
                case 'construct_outfitting':
                    territory.isHighlighted = territory.ownerId === playerId;
                    break;
                default:
                    territory.isHighlighted = false;
            }
        });
    }

    /**
     * Highlight urgent actions
     */
    highlightUrgentActions() {
        // Add visual urgency to highlighted territories
        this.territories.forEach(territory => {
            if (territory.isHighlighted) {
                // This would trigger special urgency effects in the visual layer
                this.eventSystem?.broadcastEvent('territory.urgent', {
                    territoryId: territory.id
                });
            }
        });
    }

    /**
     * Calculate production for all territories
     */
    calculateAllProduction() {
        const productionResults = [];
        
        this.territories.forEach(territory => {
            if (territory.construct && territory.ownerId) {
                const production = territory.calculateProductionSummary();
                if (production) {
                    productionResults.push({
                        territoryId: territory.id,
                        ownerId: territory.ownerId,
                        production: production
                    });
                }
            }
        });
        
        this.eventSystem?.broadcastEvent('production.calculated', {
            results: productionResults,
            cycle: this.gameFlow?.cycleManager?.currentCycle
        });
        
        return productionResults;
    }

    /**
     * Get territories owned by player
     */
    getPlayerTerritories(playerId) {
        return this.territories.filter(territory => territory.ownerId === playerId);
    }

    /**
     * Get unowned territories
     */
    getUnownedTerritories() {
        return this.territories.filter(territory => !territory.ownerId);
    }

    /**
     * Get territories with constructs
     */
    getTerritoriesWithConstructs() {
        return this.territories.filter(territory => territory.construct !== null);
    }

    /**
     * Calculate magical interference between territories
     */
    calculateInterference() {
        // Clear existing interference
        this.territories.forEach(territory => {
            territory.interferenceModifiers = {};
        });
        
        // Calculate interference between adjacent territories with opposing constructs
        this.territories.forEach(territory => {
            if (!territory.construct || !territory.ownerId) return;
            
            const adjacent = territory.adjacentTerritories || [];
            adjacent.forEach(adjTerritory => {
                if (adjTerritory.construct && 
                    adjTerritory.ownerId && 
                    adjTerritory.ownerId !== territory.ownerId) {
                    
                    // Apply interference based on construct types
                    const interference = this.calculateInterferenceBetween(
                        territory.construct,
                        adjTerritory.construct
                    );
                    
                    if (interference > 0) {
                        territory.addInterference(adjTerritory.id, interference);
                    }
                }
            });
        });
    }

    /**
     * Calculate interference between two constructs
     */
    calculateInterferenceBetween(construct1, construct2) {
        // Basic interference calculation
        // Could be enhanced with construct type-specific rules
        return 0.05; // 5% interference
    }

    /**
     * Get serializable state
     */
    getSerializableState() {
        return {
            width: this.width,
            height: this.height,
            territories: this.territories.map(t => t.serialize()),
            selectedTerritory: this.selectedTerritory?.id || null
        };
    }

    /**
     * Restore from saved state
     */
    restoreFromState(savedState) {
        if (savedState.territories) {
            savedState.territories.forEach(territoryData => {
                const territory = this.getTerritoryById(territoryData.id);
                if (territory) {
                    territory.restoreFromData(territoryData);
                }
            });
        }
        
        if (savedState.selectedTerritory) {
            this.selectedTerritory = this.getTerritoryById(savedState.selectedTerritory);
        }
        
        // Recalculate adjacencies and interference
        this.calculateAdjacencies();
        this.calculateInterference();
    }

    /**
     * Get grid statistics
     */
    getStatistics() {
        return {
            totalTerritories: this.territories.length,
            ownedTerritories: this.territories.filter(t => t.ownerId).length,
            territoriesWithConstructs: this.territories.filter(t => t.construct).length,
            territoriesByType: this.getTerritoryCountByType(),
            ownershipByPlayer: this.getOwnershipByPlayer()
        };
    }

    /**
     * Get territory count by type
     */
    getTerritoryCountByType() {
        const counts = {};
        this.territories.forEach(territory => {
            counts[territory.type] = (counts[territory.type] || 0) + 1;
        });
        return counts;
    }

    /**
     * Get ownership count by player
     */
    getOwnershipByPlayer() {
        const counts = {};
        this.territories.forEach(territory => {
            if (territory.ownerId) {
                counts[territory.ownerId] = (counts[territory.ownerId] || 0) + 1;
            }
        });
        return counts;
    }
}