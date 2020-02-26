import Resources from '../resources';
import {
  GAME_STATE, TILE, COL_WIDTH_PIXELS, ROW_HEIGHT_PIXELS, ROWS_COUNT, COLUMN_COUNT, IMAGE,
} from '../constants';

const ANIMATION_STATE = {
  CONTAINS_NEW_CHANGES: 0, // Queues new animation sequence
  ANIMATE: 1, // Animation in progess
  NOTHING_TO_ANIMATE: 2, // Animation complete
};

const IMAGE_URL_ARRAY = [IMAGE.WATER, IMAGE.STONE, IMAGE.GRASS];

const [ROWS, COLS] = [ROWS_COUNT, COLUMN_COUNT].map(c => [...Array(c)].map((_, i) => i));

class Board {
  constructor(ctx) {
    this.tileTypes = []; // 2d array of tile types
    this.tilePixels = []; // 2d array of tile coordinates
    this.roadRowNumbers = []; // Row indices that are roads (per level)
    this.pendingTileChanges = { // (Between-level animations)
      status: null,
      changes: [],
    };

    this.ctx = ctx;
  }

  init(game, mapAccessories) {
    const rowTypes = ROWS.map(r => r === 0 ? TILE.WATER : TILE.GRASS);

    COLS.forEach(c => {
      this.tilePixels.push([]);
      this.tileTypes.push([...rowTypes]);
      const x = c * COL_WIDTH_PIXELS;
      ROWS.forEach(r => {
        this.tilePixels[c].push({ x, y: r * ROW_HEIGHT_PIXELS });
      });
    });

    this.pendingTileChanges.status = ANIMATION_STATE.NOTHING_TO_ANIMATE;

    this.game = game;
    this.mapAccessories = mapAccessories;
  }

  setState(state) {
    const {
      TITLE, INSTRUCTIONS, LEVEL_TITLE, PLAY, PAUSED, GAME_OVER, DIED, WIN_LEVEL, REINCARNATE,
    } = GAME_STATE;
    switch (state) {
      case TITLE:
        this.setRows(
          0, TILE.WATER,
          [1, 2, 3, 4], TILE.STONE,
          TILE.GRASS,
        );
        break;
      case INSTRUCTIONS:
      case LEVEL_TITLE:
      case PLAY:
      case PAUSED:
      case GAME_OVER:
      case DIED:
      case WIN_LEVEL:
      case REINCARNATE: break;
      default: throw new Error(`Unrecognized game state: ${state}`);
    }
  }

  pixelCoordinatesForBoardCoordinates(colNumber, rowNumber) {
    return { ...this.tilePixels[colNumber][rowNumber] };
  }

  /* 0 or more arguments in pairs: A row number or array of row numbers followed by a tile type for
     that row. An optional final single tile type argument for all remaining rows. */
  setRows(...args) {
    const remainingRows = new Set(ROWS); // Rows not yet set
    args.forEach((tileType, i) => {
      if (i % 2) {
        (Array.isArray(args[i - 1]) ? args[i - 1] : [args[i - 1]]).forEach(row => {
          this.setRow(row, tileType);
          remainingRows.delete(row);
        });
      }
    });
    if (args.length % 2) {
      const tileType = args[args.length - 1];
      remainingRows.forEach(row => this.setRow(row, tileType));
    }
  }

  /**
   * Takes a row number and a tile type, and sets that row to that tile type. This
   * method uses Board.prototype.setTile() to actually set the individual tiles.
   * @param {number} rowNumber The row number, from top to bottom, starting at zero.
   * @param {tileType} tileType The type of tile
   */
  setRow(rowNumber, tileType) {
    if (tileType === TILE.STONE) { // If row is set to be a road...
      if (this.roadRowNumbers.indexOf(rowNumber) === -1) {
        this.roadRowNumbers.push(rowNumber); // Remember this row is a road
      } else {
        return; // This row is already a road. Do nothing.
      }
    } else { // This row is going to be non-road. Un-remember this row is a road
      const rowArrayIndex = this.roadRowNumbers.indexOf(rowNumber);
      if (rowArrayIndex !== -1) { // This row is going from road to something else
        this.roadRowNumbers.splice(rowArrayIndex, 1);
      }
    }
    // Set tiles in this row
    for (let col = COLUMN_COUNT - 1; col >= 0; col--) {
      this.setTile(col, rowNumber, tileType);
    }
  }

  /**
   * Takes column and row numbers, and a tile type, and sets that tile. Depending
   * on the game state, this method will either set the tile immediately, or add
   * it to the collection of tile changes that will animate.
   * @param {number} colNumber The column number, from left to right, starting at
   *     zero
   * @param {number} rowNumber The row number, from top to bottom, starting at zero.
   * @param {tileType} tileType The type of tile
   */
  setTile(colNumber, rowNumber, tileType) {
    const { game } = this;
    switch (game.state) {
      case GAME_STATE.PLAY:
      case GAME_STATE.TITLE:
        this.tileTypes[colNumber][rowNumber] = tileType;
        break;
      default: // If the state isn't specified above, animate this change
        if (this.tileTypes[colNumber][rowNumber] !== tileType) {
          this.addTileChangeToPending(colNumber, rowNumber, tileType);
        }
    }
  }

  /**
   * Adds this tile change to the upcoming tile change animation.
   * @param {number} colNumber The column number, from left to right, starting at
   *     zero
   * @param {number} rowNumber The row number, from top to bottom, starting at zero.
   * @param {tileType} tileType The type of tile
   */
  addTileChangeToPending(column, row, tileType) {
    this.pendingTileChanges.changes.push({
      location: { column, row }, // The location on the game board
      tileType, // The type of tile
      time: Math.random(), // A randomly generated time (processed in update())
    });
    this.pendingTileChanges.status = ANIMATION_STATE.CONTAINS_NEW_CHANGES;
  }

  /**
   * If the animation state is .CONTAINS_NEW_CHANGES, it completes the processing
   * of the data contained in this.pendingTileChanges and initiates the animation.
   * If the animation state is .ANIMATE, it animates the changes whose time has
   * come. Otherwise, this method does nothing.
   * @param {number} dt The time elapsed since the last update
   * @param {number} now The system time at the moment of invocation
   */
  update(dt, now) {
    const { game } = this;
    let changes; // Array of upcoming tile changes
    switch (this.pendingTileChanges.status) {
      case ANIMATION_STATE.NOTHING_TO_ANIMATE: break;
      case ANIMATION_STATE.CONTAINS_NEW_CHANGES: {
        changes = this.pendingTileChanges.changes;
        changes.sort((a, b) => a.time - b.time);
        // Use the randomly generated values as delta-time, and replace those
        // with corresponding system time
        let previousValue = 0;
        let totalTime = changes[changes.length - 1].time;
        changes.forEach(change => {
          previousValue = change.time += previousValue;
        });
        totalTime += previousValue;
        // Scale the time to fit the time alotted for the animation
        changes.forEach(change => {
          change.time *= game.timeRemaining * 9 / totalTime / 10;
          change.time += now;
        });
        this.pendingTileChanges.status = ANIMATION_STATE.ANIMATE;
      }
      case ANIMATION_STATE.ANIMATE: {
        changes = this.pendingTileChanges.changes;
        let change;
        let location;
        // Animate changes that are to be complete at this time
        while (changes.length > 0 && now >= changes[0].time) {
          change = changes.shift();
          location = change.location;
          this.tileTypes[location.column][location.row] = change.tileType;
        }
        if (changes.length === 0) { // No tile changes left, finish animation
          this.pendingTileChanges.status = ANIMATION_STATE.NOTHING_TO_ANIMATE;
        }
        break;
      }
      default: throw new Error(`Unknown animation state: ${this.pendingTileChanges.status}`);
    }
  }

  /**
   * Randomly generates a Y coordinate corresponding with a tile on an existing
   * road. Used when an enemy is generated to ensure its location is random but
   * placed correctly on a road.
   * @return {number} A vertical pixel coordinate corresponding with a road.
   */
  randomRoadYCoordinate() {
    const roadRowIndex = Math.floor(Math.random() * this.roadRowNumbers.length);
    const rowIndex = this.roadRowNumbers[roadRowIndex];
    return this.pixelCoordinatesForBoardCoordinates(0, rowIndex).y;
  }

  /**
   * @return {Object.<string, number>} An object that contains randomly generated
   *     row and column numbers.
   */
  randomRoadBoardLocation() {
    return {
      column: Math.floor(Math.random() * COLUMN_COUNT),
      row: this.roadRowNumbers[Math.floor(Math.random() * this.roadRowNumbers.length)],
    };
  }

  /**
   * Returns a boolean indicating whether or not the player is able to move to the
   * specified location. (The player cannot if the location is off the edge of the
   * game board, or if there's an object blocking its way.) Also calls the same
   * method on mapAccessories, and sets the game state to .WIN_LEVEL if the move
   * to the specified location results in passing the level.
   * @param {number} x A row number
   * @param {number} y A column number
   * @return {boolean} Whether the move is legal.
   */
  playerCanMoveHere(x, y) {
    const { game, mapAccessories: ma } = this;
    // If mapAccessories says player can move here, and the player isn't trying
    // to move off the game board...
    if (ma.playerCanMoveHere(x, y) && x < COLUMN_COUNT && x >= 0 && y < ROWS_COUNT && y >= 0) {
      // If the player is hitting the top row and isn't drowning, level is won!
      if (y === 0 && this.tileTypes[x][y] !== TILE.WATER) { game.setState(GAME_STATE.WIN_LEVEL); }
      return true; // Move is legal
    }
    return false; // Move is illegal
  }

  /**
   * Renders the game board.
   */
  render() {
    let coordinates;
    let image;
    for (let row = 0; row < ROWS_COUNT; row++) {
      for (let col = 0; col < COLUMN_COUNT; col++) {
        coordinates = this.tilePixels[col][row];
        image = Resources.get(IMAGE_URL_ARRAY[this.tileTypes[col][row]]);
        this.ctx.drawImage(image, coordinates.x, coordinates.y);
      }
    }
  }
}

export default Board;
