import Board from './Board';
import Resources from '../resources';
import { GAME_STATE } from '../constants';

/**
 * The Player object represents the player on the screen and handles input that
 * controls the player's movement.
 * @constructor
 */

const [SPRITE, PIXEL_ADJUST] = ['images/char-boy.png', -15];
class Player {
  constructor(ctx) {
    /** @type {number} */ this.row = 4;
    /** @type {number} */ this.column = 1;
    /** @type {number} */ this.hidden = false;
    /** @type {number} */ this.moveable = false;
    /** @type {number} */ this.collisionDetectionOn = false;
    /**
     * Time of upcoming collision.
     * @type {number}
     */
    this.collisionTime = null;

    this.ctx = ctx;
  }

  /** Initializes player object */
  init(game, board, enemyHandler) {
    this.game = game;
    this.board = board;
    this.enemyHandler = enemyHandler;
    this.setPosition(this.column, this.row);
  }

  /**
   * Sets properties and calls methods on player when new game state is set.
   * @param {number} state New game state.
   */
  setState(state) {
    const {
      TITLE, INSTRUCTIONS, LEVEL_TITLE, PLAY, PAUSED, GAME_OVER, DIED, WIN_LEVEL, REINCARNATE,
    } = GAME_STATE;
    switch (state) {
      case TITLE:
        this.hidden = false;
        this.moveable = false;
        this.setPosition((Board.COLUMN_COUNT - 1) / 2, Board.ROWS_COUNT - 1);
        this.collisionDetectionOn = false;
        break;
      case INSTRUCTIONS:
      case LEVEL_TITLE:
      case REINCARNATE:
        this.hidden = false;
        this.moveable = false;
        this.setPosition((Board.COLUMN_COUNT - 1) / 2, Board.ROWS_COUNT - 1);
        break;
      case PLAY:
        this.collisionDetectionOn = true;
        this.hidden = false;
        this.moveable = true;
        break;
      case PAUSED:
        this.collisionDetectionOn = false;
        this.hidden = true;
        this.moveable = false;
        break;
      case DIED:
        this.collisionDetectionOn = false;
        this.hidden = false;
        this.moveable = false;
      case WIN_LEVEL:
        this.collisionDetectionOn = false;
        this.moveable = false;
        this.hidden = false;
        break;
      case GAME_OVER: break;
      default: throw new Error(`Unrecognized game state: ${state}`);
    }
  }

  /**
   * Detects a collision, if collision detection is on. Kills player if there's
   * been a collision. So sad.
   * @param {number} dt Time elapsed since last update.
   * @param {number} now System time an invocation.
   */
  update(dt, now) {
    if (this.collisionDetectionOn && this.collisionTime && now > this.collisionTime) {
      this.die();
    }
  }

  /** Render the player */
  render() {
    if (!this.hidden) { this.ctx.drawImage(Resources.get(SPRITE), this.x, this.y); }
  }

  /**
   * Sets the player's position, and updates this.collisionTime.
   * @param {number} x Column number.
   * @param {number} y Row number.
   */
  setPosition(x, y) {
    const { board, enemyHandler } = this;
    // Make sure player isn't moving off screen...
    this.column = Math.min(Math.max(x, 0), Board.COLUMN_COUNT - 1);
    this.row = Math.min(Math.max(y, 0), Board.ROWS_COUNT - 1);

    const coordinates = board.pixelCoordinatesForBoardCoordinates(this.column, this.row);
    this.x = coordinates.x;
    this.y = coordinates.y + PIXEL_ADJUST;

    const tile = board.tileTypes[this.column][this.row];
    switch (tile) {
      case Board.Tile.STONE: // Road! Calculate upcoming collisions!
        this.collisionTime = enemyHandler.collisionTimeForCoordinates(this.column, this.row);
        break;
      case Board.Tile.WATER: // Water! Dead :(
        this.die();
      case Board.Tile.GRASS: // Grass! Safe! (Cancel collision)
        this.collisionTime = enemyHandler.collisionTimeForCoordinates();
        break;
      default: throw new Error(`Unrecognized tile type: ${tile}`);
    }
  }

  /**
   * Is called when a new enemy is generated in the row occupied by the player.
   * Used to set a collision time if there isn't already an upcoming collision.
   * @param {number} collisionTime Time of the new collision.
   */
  newEnemyInRow(collisionTime) {
    if (!this.collisionTime) { this.collisionTime = collisionTime; }
  }

  /**
   * Is called when the game is unpaused. Adds timePaused to the collision time.
   * @param {number} timePaused The number of seconds for which the game was paused.
   */
  addPauseTimeToCollision(timePaused) {
    if (this.collisionTime) { this.collisionTime += timePaused; }
  }

  /**
   * Kills the player by setting the game state to .DIED.
   */
  die() {
    const { game } = this;
    game.setState(GAME_STATE.DIED);
  }

  /**
   * Handles keyboard input for the movement of the player.
   * @param {string} keyString String representing the direction of movement.
   */
  handleInput(keyString) {
    if (this.moveable) {
      switch (keyString) {
        case 'left':
        case 'right':
        case 'up':
        case 'down': this.move(keyString); break;
        default: throw new Error(`Unrecognized keyString: ${keyString}`);
      }
    }
  }

  /**
   * Moves player in the direction specified by directionString
   * @param {string} directionString String specifying the direction of movement.
   */
  move(directionString) {
    const { board } = this;
    let x = this.column;
    let y = this.row;
    switch (directionString) {
      case 'left': x--; break;
      case 'right': x++; break;
      case 'up': y--; break;
      case 'down': y++; break;
      default: throw new Error(`Unrecognized directionString: ${directionString}`);
    }
    if (board.playerCanMoveHere(x, y)) { this.setPosition(x, y); }
  }
}

[Player.EDGE_ADJUST_RIGHT, Player.EDGE_ADJUST_LEFT] = [29, 30];

export default Player;
