/**
 * Models index file
 * Exports all game data models and flow control systems
 */
import Territory from './Territory.js';
import Construct from './Construct.js';
import ConstructManager from './ConstructManager.js';
import Resource from './Resource.js';
import Player from './Player.js';
import Market from './Market.js';
import Game from './Game.js';

// Game flow control systems
import GameCycleManager from './GameCycleManager.js';
import TurnManager from './TurnManager.js';
import TimeManager from './TimeManager.js';
import GameStateManager from './GameStateManager.js';
import GamePersistence from './GamePersistence.js';
import GameFlowController from './GameFlowController.js';

// Territory management systems
import TerritoryGrid from './TerritoryGrid.js';
import TerritoryAcquisition from './TerritoryAcquisition.js';
import TerritoryImprovement from './TerritoryImprovement.js';

// Resource management systems
import ResourceProductionCalculator from './ResourceProductionCalculator.js';
import ResourceStorage from './ResourceStorage.js';
import ResourceDecay from './ResourceDecay.js';

// Economy management
import GoldManager from './GoldManager.js';

// Auction system
import AuctionManager from './AuctionManager.js';
import MarketDataService from './MarketDataService.js';
import TransactionEngine from './TransactionEngine.js';

export {
    Territory,
    Construct,
    ConstructManager,
    Resource,
    Player,
    Market,
    Game,
    GameCycleManager,
    TurnManager,
    TimeManager,
    GameStateManager,
    GamePersistence,
    GameFlowController,
    TerritoryGrid,
    TerritoryAcquisition,
    TerritoryImprovement,
    ResourceProductionCalculator,
    ResourceStorage,
    ResourceDecay,
    GoldManager,
    AuctionManager,
    MarketDataService,
    TransactionEngine
};

export default {
    Territory,
    Construct,
    ConstructManager,
    Resource,
    Player,
    Market,
    Game,
    GameCycleManager,
    TurnManager,
    TimeManager,
    GameStateManager,
    GamePersistence,
    GameFlowController,
    TerritoryGrid,
    TerritoryAcquisition,
    TerritoryImprovement,
    ResourceProductionCalculator,
    ResourceStorage,
    ResourceDecay,
    GoldManager,
    AuctionManager,
    MarketDataService,
    TransactionEngine
};