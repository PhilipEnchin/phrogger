import Board from './Board';
import EnemyHandler from './EnemyHandler';
import HeadsUp from './HeadsUp';
import MapAccessories from './MapAccessories';
import Player from './Player';
import {
  WIDTH, HEIGHT, GAME_STATE, TILE, STARTING_LIVES,
  REINCARNATE_DURATION, WIN_LEVEL_DURATION, DIE_DURATION,
  KEY, ACTION, LEVEL_ROWS, LEVEL_SPEEDS, LEVEL_SPAWN_INTERVALS_AND_VARIANCES,
  LEVEL_KEY_LEFT_BOUNDARY, LEVEL_ROCK_LEFT_BOUNDARY,
} from '../constants';

const HIGH_SCORE_COOKIE_KEY = 'highScore';
const COOKIE_EXPIRY = new Date(new Date().setFullYear(new Date().getFullYear() + 15)).toUTCString();

class Game {
  constructor(ctx) {
    this.timeRemaining = 0; // ...for showing level-titles, etc.
    this.state = null;
    this.lives = null;
    this.level = null;
    this.highScore = null;
    this.distanceToHighScore = null; // Positive when high score is beaten

    document.addEventListener('keydown', ({ keyCode }) => {
      const keyId = KEY[keyCode];
      if (keyId) this.handleInput(keyId);
    });

    this.ctx = ctx;
  }

  // Initializes the objects that need initializing, and initiates the game.
  init() {
    this.board = new Board(this.ctx);
    this.enemyHandler = new EnemyHandler(this.ctx);
    this.player = new Player(this.ctx);
    this.hud = new HeadsUp(this.ctx);
    this.mapAccessories = new MapAccessories(this.ctx);

    this.board.init(this, this.mapAccessories);
    this.enemyHandler.init(this, this.board, this.player);
    this.player.init(this, this.board, this.enemyHandler);
    this.hud.init(this);
    this.mapAccessories.init(this, this.board);

    // Read cookie and store current high score
    const cookieString = document.cookie;
    const highScoreKeyIndex = cookieString.indexOf(HIGH_SCORE_COOKIE_KEY);
    this.highScore = highScoreKeyIndex < 0 ? 0
      : parseInt(cookieString.substring(cookieString.indexOf('=', highScoreKeyIndex) + 1), 10);

    this.setState(GAME_STATE.TITLE);
  }

  setState(state) {
    const {
      TITLE, INSTRUCTIONS, LEVEL_TITLE, PLAY, PAUSED, GAME_OVER, DIED, WIN_LEVEL, REINCARNATE,
    } = GAME_STATE;

    this.state = state;

    [this.hud, this.board, this.enemyHandler, this.player, this.mapAccessories]
      .forEach(o => o.setState(state));

    switch (state) {
      case TITLE:
        this.lives = STARTING_LIVES;
        this.distanceToHighScore = this.highScore + 1;
        break;
      case LEVEL_TITLE:
      case REINCARNATE:
        this.timeRemaining = REINCARNATE_DURATION;
        break;
      case WIN_LEVEL:
        this.timeRemaining = WIN_LEVEL_DURATION;
        this.board.setRows(0, TILE.WATER);
        this.setLevel(this.level + 1);
        break;
      case DIED:
        this.timeRemaining = DIE_DURATION;
        break;
      case INSTRUCTIONS:
      case PLAY:
      case PAUSED:
      case GAME_OVER: break;
      default: throw new Error(`Unrecognized game state: ${state}`);
    }
  }

  handleInput(keyId) {
    switch (keyId) {
      case ACTION.UP:
      case ACTION.DOWN:
      case ACTION.LEFT:
      case ACTION.RIGHT:
        return this.player.handleInput(keyId);
      case ACTION.PAUSE:
        switch (this.state) {
          case GAME_STATE.PLAY: return this.setState(GAME_STATE.PAUSED);
          case GAME_STATE.PAUSED: return this.setState(GAME_STATE.PLAY);
          default: return null;
        }
      case ACTION.SPACE:
        switch (this.state) {
          case GAME_STATE.TITLE: return this.setState(GAME_STATE.INSTRUCTIONS);
          case GAME_STATE.INSTRUCTIONS:
            this.setLevel(1); return this.setState(GAME_STATE.LEVEL_TITLE);
          case GAME_STATE.GAME_OVER: return this.setState(GAME_STATE.TITLE);
          default: return null;
        }
      default: throw new Error(`Unrecognized keyId: ${keyId}`);
    }
  }

  setLevel(newLevel) {
    const { enemyHandler, mapAccessories } = this;

    if (--this.distanceToHighScore < 0) {
      document.cookie = `${HIGH_SCORE_COOKIE_KEY}=${++this.highScore}; expires=${COOKIE_EXPIRY}`;
    }

    // Set game parameters per level
    this.board.setRows(...(LEVEL_ROWS[this.level = newLevel] || []));
    switch (newLevel) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
      case 8:
        enemyHandler.setSpeeds(...LEVEL_SPEEDS[newLevel]);
        enemyHandler.setSpawnIntervalAndVariance(...LEVEL_SPAWN_INTERVALS_AND_VARIANCES[newLevel]);
        mapAccessories.leftMostRockPosition = LEVEL_ROCK_LEFT_BOUNDARY[newLevel];
        mapAccessories.leftMostKeyPosition = LEVEL_KEY_LEFT_BOUNDARY[newLevel];
        break;
      case 12:
      case 15:
      case 18:
        mapAccessories.leftMostRockPosition = LEVEL_ROCK_LEFT_BOUNDARY[newLevel];
        mapAccessories.leftMostKeyPosition = LEVEL_KEY_LEFT_BOUNDARY[newLevel];
      default: // Level 9 and onward, make the game just a little faster
        enemyHandler.setSpawnIntervalAndVariance(
          enemyHandler.spawnInterval * 0.98, enemyHandler.spawnVariance * 0.99,
        );
        enemyHandler.setSpeeds(
          enemyHandler.lowerSpeedLimit * 1.04, enemyHandler.upperSpeedLimit * 1.06,
        );
    }
  }

  /**
   * Decreases the number of lives and initiates the next state, depending on the
   * number of lives remaining.
   */
  died() {
    if (--this.lives >= 0) { // At least one more life available
      this.setState(GAME_STATE.REINCARNATE);
    } else { // No more lives, game over.
      this.setState(GAME_STATE.GAME_OVER);
    }
  }

  /**
   * Adds a life and calls HeadsUp.extraLife() in order to update the HUD
   */
  extraLife() {
    this.lives++;
    this.hud.extraLife();
  }

  /**
   * Decrements the timer and takes the appropriate action if the timer runs out.
   */
  decrementTimer(dt) {
    if ((this.timeRemaining -= dt) <= 0) {
      switch (this.state) {
        case GAME_STATE.LEVEL_TITLE:
        case GAME_STATE.REINCARNATE: this.setState(GAME_STATE.PLAY); break;
        case GAME_STATE.WIN_LEVEL: this.setState(GAME_STATE.LEVEL_TITLE); break;
        case GAME_STATE.DIED: this.died(); break;
        default: throw new Error(`Unrecognized game state: ${this.state}`);
      }
    }
  }

  /**
   * Forwards the update command to other objects, and decrements timer if the
   * timer is active.
   * @param {number} dt The time elapsed since the last update
   * @param {number} now The system time at the moment of invocation
   */
  update(dt, now) {
    this.enemyHandler.update(dt, now);
    this.player.update(dt, now);
    this.board.update(dt, now);

    if (this.timeRemaining > 0) { // If timer is active...
      this.decrementTimer(dt);
    }
  }

  /**
   * Begins the rendering sequence by clearing the screen, then calling render()
   * methods in other objects.
   */
  render() {
    this.ctx.clearRect(0, 0, WIDTH, HEIGHT); // Clear background
    this.board.render(); // Render map
    this.mapAccessories.render(); // Render map accessores (rock, key, heart)
    this.player.render(); // Render player
    this.enemyHandler.render(); // Render all enemies
    this.hud.render(); // Render all text
  }
}

export default Game;
