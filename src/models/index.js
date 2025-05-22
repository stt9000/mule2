/**
 * Models index file
 * Exports all game data models and flow control systems
 */
import Territory from './Territory.js';
import Construct from './Construct.js';
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

export {
    Territory,
    Construct,
    Resource,
    Player,
    Market,
    Game,
    GameCycleManager,
    TurnManager,
    TimeManager,
    GameStateManager,
    GamePersistence,
    GameFlowController
};

export default {
    Territory,
    Construct,
    Resource,
    Player,
    Market,
    Game,
    GameCycleManager,
    TurnManager,
    TimeManager,
    GameStateManager,
    GamePersistence,
    GameFlowController
};