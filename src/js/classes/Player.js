import Resources from '../resources';

/**
 * The Player object represents the player on the screen and handles input that
 * controls the player's movement.
 * @constructor
 */

const [SPRITE, PIXEL_ADJUST] = ['images/char-boy.png', -15];
class Player {
  constructor() {
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
  }

  /** Initializes player object */
  init(game, map, enemyHandler) {
    this.game = game;
    this.map = map;
    this.enemyHandler = enemyHandler;
    this.setPosition(this.column, this.row);
  }

  /**
   * Sets properties and calls methods on player when new game state is set.
   * @param {number} state New game state.
   */
  setState(state) {
    const { game, map } = this;
    switch (state) {
      case game.State.TITLE:
        this.hidden = false;
        this.moveable = false;
        this.setPosition((map.COLUMN_COUNT - 1) / 2, map.ROWS_COUNT - 1);
        this.collisionDetectionOn = false;
        break;
      case game.State.INSTRUCTIONS:
      case game.State.LEVEL_TITLE:
      case game.State.REINCARNATE:
        this.hidden = false;
        this.moveable = false;
        this.setPosition((map.COLUMN_COUNT - 1) / 2, map.ROWS_COUNT - 1);
        break;
      case game.State.PLAY:
        this.collisionDetectionOn = true;
        this.hidden = false;
        this.moveable = true;
        break;
      case game.State.PAUSED:
        this.collisionDetectionOn = false;
        this.hidden = true;
        this.moveable = false;
        break;
      case game.State.DIED:
        this.collisionDetectionOn = false;
        this.hidden = false;
        this.moveable = false;
      case game.State.WIN_LEVEL:
        this.collisionDetectionOn = false;
        this.moveable = false;
        this.hidden = false;
        break;
      case game.State.GAME_OVER: break;
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
    if (!this.hidden) { ctx.drawImage(Resources.get(SPRITE), this.x, this.y); }
  }

  /**
   * Sets the player's position, and updates this.collisionTime.
   * @param {number} x Column number.
   * @param {number} y Row number.
   */
  setPosition(x, y) {
    const { map, enemyHandler } = this;
    // Make sure player isn't moving off screen...
    this.column = Math.min(Math.max(x, 0), map.COLUMN_COUNT - 1);
    this.row = Math.min(Math.max(y, 0), map.ROWS_COUNT - 1);

    const coordinates = map.pixelCoordinatesForBoardCoordinates(this.column, this.row);
    this.x = coordinates.x;
    this.y = coordinates.y + PIXEL_ADJUST;

    const tile = map.tileTypes[this.column][this.row];
    switch (tile) {
      case map.Tile.STONE: // Road! Calculate upcoming collisions!
        this.collisionTime = enemyHandler.collisionTimeForCoordinates(this.column, this.row);
        break;
      case map.Tile.WATER: // Water! Dead :(
        this.die();
      case map.Tile.GRASS: // Grass! Safe! (Cancel collision)
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
    game.setState(game.State.DIED);
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
    const { map } = this;
    let x = this.column;
    let y = this.row;
    switch (directionString) {
      case 'left': x--; break;
      case 'right': x++; break;
      case 'up': y--; break;
      case 'down': y++; break;
      default: throw new Error(`Unrecognized directionString: ${directionString}`);
    }
    if (map.playerCanMoveHere(x, y)) { this.setPosition(x, y); }
  }
}

[Player.EDGE_ADJUST_RIGHT, Player.EDGE_ADJUST_LEFT] = [29, 30];

export default Player;
