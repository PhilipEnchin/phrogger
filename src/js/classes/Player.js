import Resources from '../resources';
import {
  GAME_STATE, TILE, ROWS_COUNT, COLUMN_COUNT, IMAGE, ACTION,
} from '../constants';

const [SPRITE, PIXEL_ADJUST] = [IMAGE.BOY, -15];
class Player {
  constructor(ctx) {
    this.row = 4;
    this.column = 1;
    this.hidden = false;
    this.moveable = false;
    this.collisionDetectionOn = false;
    this.collisionTime = null;

    this.ctx = ctx;
  }

  init(game, board, enemyHandler) {
    this.game = game;
    this.board = board;
    this.enemyHandler = enemyHandler;
    this.setPosition(this.column, this.row);
  }

  setState(state) {
    const {
      TITLE, INSTRUCTIONS, LEVEL_TITLE, PLAY, PAUSED, GAME_OVER, DIED, WIN_LEVEL, REINCARNATE,
    } = GAME_STATE;
    switch (state) {
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
      case TITLE:
      case INSTRUCTIONS:
      case LEVEL_TITLE:
      case REINCARNATE:
        this.setPosition((COLUMN_COUNT - 1) / 2, ROWS_COUNT - 1);
      case DIED:
      case WIN_LEVEL:
        this.collisionDetectionOn = false;
        this.moveable = false;
        this.hidden = false;
      case GAME_OVER: break;
      default: throw new Error(`Unrecognized game state: ${state}`);
    }
  }

  // Detects a fatal collision
  update(dt, now) {
    if (this.collisionDetectionOn && this.collisionTime && now > this.collisionTime) this.die();
  }

  render() {
    if (!this.hidden) this.ctx.drawImage(Resources.get(SPRITE), this.x, this.y);
  }

  setPosition(x, y) {
    // Make sure player isn't moving off screen...
    this.column = Math.min(Math.max(x, 0), COLUMN_COUNT - 1);
    this.row = Math.min(Math.max(y, 0), ROWS_COUNT - 1);

    const coordinates = this.board.pixelCoordinatesForBoardCoordinates(this.column, this.row);
    this.x = coordinates.x;
    this.y = coordinates.y + PIXEL_ADJUST;

    const tile = this.board.tileTypes[this.column][this.row];
    switch (tile) {
      case TILE.STONE: // Road! Calculate upcoming collisions!
        this.collisionTime = this.enemyHandler.collisionTimeForCoordinates(this.column, this.row);
        break;
      case TILE.WATER: // Water! Dead :(
        this.die();
      case TILE.GRASS: // Grass! Safe! (Cancel collision)
        this.collisionTime = this.enemyHandler.collisionTimeForCoordinates();
        break;
      default: throw new Error(`Unrecognized tile type: ${tile}`);
    }
  }

  // If there isn't an upcoming collision, this will make one (for a newly spawned enemy)
  newEnemyInRow(collisionTime) {
    if (!this.collisionTime) { this.collisionTime = collisionTime; }
  }

  // Adjusts collision time after unpausing
  addPauseTimeToCollision(timePaused) {
    if (this.collisionTime) { this.collisionTime += timePaused; }
  }

  die() {
    this.game.setState(GAME_STATE.DIED);
  }

  handleInput(keyId) {
    if (this.moveable) {
      switch (keyId) {
        case ACTION.LEFT:
        case ACTION.RIGHT:
        case ACTION.UP:
        case ACTION.DOWN: this.move(keyId); break;
        default: throw new Error(`Unrecognized keyId: ${keyId}`);
      }
    }
  }

  move(action) {
    const { board } = this;
    let x = this.column;
    let y = this.row;
    switch (action) {
      case ACTION.LEFT: x--; break;
      case ACTION.RIGHT: x++; break;
      case ACTION.UP: y--; break;
      case ACTION.DOWN: y++; break;
      default: throw new Error(`Unrecognized action: ${action}`);
    }
    if (board.playerCanMoveHere(x, y)) this.setPosition(x, y);
  }
}

export default Player;
