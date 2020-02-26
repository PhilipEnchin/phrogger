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

  setRow(rowNumber, tileType) {
    if (tileType === TILE.STONE) {
      this.roadRowNumbers.push(...(this.roadRowNumbers.includes(rowNumber) ? [] : [rowNumber]));
    } else {
      const rowArrayIndex = this.roadRowNumbers.indexOf(rowNumber);
      if (rowArrayIndex !== -1) this.roadRowNumbers.splice(rowArrayIndex, 1);
    }
    COLS.forEach(c => this.setTile(c, rowNumber, tileType));
  }

  setTile(colNumber, rowNumber, tileType) {
    switch (this.game.state) {
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

  // Adds this tile change to the upcoming tile change animation.
  addTileChangeToPending(column, row, tileType) {
    this.pendingTileChanges.changes.push({
      location: { column, row },
      tileType,
      duration: Math.random(), // A randomly generated time (processed in update())
    });
    this.pendingTileChanges.status = ANIMATION_STATE.CONTAINS_NEW_CHANGES;
  }

  // Prepare if required, and update animation between levels
  update(dt, now) {
    switch (this.pendingTileChanges.status) {
      case ANIMATION_STATE.NOTHING_TO_ANIMATE: break;
      case ANIMATION_STATE.CONTAINS_NEW_CHANGES: {
        const { changes } = this.pendingTileChanges;
        changes.sort((a, b) => a.duration - b.duration);
        // Use the randomly generated values as delta-time, and replace those
        // with corresponding system time
        let previousValue = 0;
        let totalTime = changes[changes.length - 1].duration;
        changes.forEach(change => {
          previousValue = change.duration += previousValue;
        });
        totalTime += previousValue;
        // Scale the time to fit the time alotted for the animation
        changes.reverse().forEach(change => {
          change.duration *= this.game.timeRemaining * 9 / totalTime / 10;
          change.duration += now;
        });
        this.pendingTileChanges.status = ANIMATION_STATE.ANIMATE;
      }
      case ANIMATION_STATE.ANIMATE: {
        const { changes } = this.pendingTileChanges;
        // Animate changes that are to be complete at this time
        while (changes.length && now >= changes[changes.length - 1].duration) {
          const { location, tileType } = changes.pop();
          this.tileTypes[location.column][location.row] = tileType;
        }
        if (!changes.length) this.pendingTileChanges.status = ANIMATION_STATE.NOTHING_TO_ANIMATE;
        break;
      }
      default: throw new Error(`Unknown animation state: ${this.pendingTileChanges.status}`);
    }
  }

  randomRoadYCoordinate() {
    const roadRowIndex = Math.floor(Math.random() * this.roadRowNumbers.length);
    const rowIndex = this.roadRowNumbers[roadRowIndex];
    return this.pixelCoordinatesForBoardCoordinates(0, rowIndex).y;
  }

  randomRoadBoardLocation() {
    return {
      column: Math.floor(Math.random() * COLUMN_COUNT),
      row: this.roadRowNumbers[Math.floor(Math.random() * this.roadRowNumbers.length)],
    };
  }

  // Checks location validity and win state before moving player
  playerCanMoveHere(x, y) {
    // If mapAccessories says player can move, and isn't trying to move off the game board...
    if (this.mapAccessories.playerCanMoveHere(x, y)
    && x < COLUMN_COUNT && x >= 0 && y < ROWS_COUNT && y >= 0) {
      // If the player is hitting the top row and isn't drowning, level is won!
      if (y === 0 && this.tileTypes[x][y] !== TILE.WATER) this.game.setState(GAME_STATE.WIN_LEVEL);
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
