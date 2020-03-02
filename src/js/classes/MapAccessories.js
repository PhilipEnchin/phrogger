import Resources from '../resources';
import {
  GAME_STATE, TILE, COLUMN_COUNT, IMAGE,
} from '../constants';

const IMAGE_URL_ARRAY = [IMAGE.KEY, IMAGE.ROCK, IMAGE.HEART];
const ACCESSORY_TYPE = { KEY: 0, ROCK: 1, HEART: 2 };
const ROCK_PIXEL_ADJUST = -25;
const KEY_PIXEL_ADJUST = -15;
const PROBABILITY_OF_EXTRA_LIFE = 1 / 20;

class MapAccessories {
  constructor(ctx) {
    this.accessories = []; // Key, rock, heart
    this.rockAccessory = null;
    this.keyAccessory = null;
    this.heartAccessory = null;
    this.hidden = true;
    this.leftMostRockPosition = 0;
    this.leftMostKeyPosition = 0;

    this.ctx = ctx;
  }

  init(game, board) {
    this.game = game;
    this.board = board;
  }

  placeAccessories() {
    const { board } = this;
    // If rock and key are already placed, don't place them again!
    if (this.accessories.includes(this.rockAccessory)
      && this.accessories.includes(this.keyAccessory)) return;

    // Rock...
    this.accessories = [];
    const rockCoords = {
      row: 0,
      column: Math.floor(Math.random() * (COLUMN_COUNT - this.leftMostRockPosition))
        + this.leftMostRockPosition,
    };
    board.setTile(rockCoords.column, rockCoords.row, TILE.STONE);
    this.rockAccessory = this.packageAccessory(ACCESSORY_TYPE.ROCK, rockCoords);
    this.rockAccessory.coordinates.y += ROCK_PIXEL_ADJUST;

    // Key...
    let keyCoords;
    do {
      keyCoords = board.randomRoadBoardLocation();
    } while (keyCoords.column < this.leftMostKeyPosition);
    this.keyAccessory = this.packageAccessory(ACCESSORY_TYPE.KEY, keyCoords);
    this.keyAccessory.coordinates.y += KEY_PIXEL_ADJUST;

    // Add rock and key to accessories array
    this.accessories.push(this.rockAccessory, this.keyAccessory);

    // Heart...
    if (Math.random() <= PROBABILITY_OF_EXTRA_LIFE) {
      let heartCoords;
      do {
        heartCoords = board.randomRoadBoardLocation();
      } while (heartCoords.column === keyCoords.column && heartCoords.row === keyCoords.row);
      this.heartAccessory = this.packageAccessory(ACCESSORY_TYPE.HEART, heartCoords);
      this.accessories.push(this.heartAccessory);
    }
  }

  // Packages the accessory with its location (both board- and pixel-coordinates)
  packageAccessory(accessoryType, location) {
    return {
      accessoryType,
      location,
      coordinates: this.board.pixelCoordinatesForBoardCoordinates(location.column, location.row),
    };
  }

  playerCanMoveHere(x, y) {
    // Player can't occupy the same space as the rock
    if (this.accessories.includes(this.rockAccessory)
      && this.rockAccessory.location.column === x
      && this.rockAccessory.location.row === y) {
      return false; // Move is illegal
    }
    // Player can collect heart for an extra life, then it disappears
    if (this.heartAccessory && this.heartAccessory.location.column === x
      && this.heartAccessory.location.row === y) {
      this.accessories.splice(this.accessories.indexOf(this.heartAccessory), 1);
      this.heartAccessory = null;
      this.game.extraLife();
    // Player can collect key to make rock go away, then it disappears
    } else if (this.accessories.includes(this.keyAccessory)
    && this.keyAccessory.location.column === x && this.keyAccessory.location.row === y) {
      this.accessories.splice(this.accessories.indexOf(this.rockAccessory), 1);
      this.accessories.splice(this.accessories.indexOf(this.keyAccessory), 1);
    }
    return true; // Move is legal
  }

  setState(state) {
    const {
      TITLE, INSTRUCTIONS, LEVEL_TITLE, PLAY, PAUSED, GAME_OVER, DIED, WIN_LEVEL, REINCARNATE,
    } = GAME_STATE;
    switch (state) {
      case LEVEL_TITLE:
        this.hidden = true;
        this.placeAccessories();
        break;
      case REINCARNATE:
        this.hidden = true;
        this.accessories.push(this.rockAccessory, this.keyAccessory);
        break;
      case PLAY:
        this.hidden = false;
        break;
      case DIED:
        this.hidden = false;
        this.heartAccessory = null;
        this.accessories = [];
        break;
      case GAME_OVER:
        this.hidden = true;
        this.rockAccessory = null;
        this.keyAccessory = null;
        this.accessories = [];
        break;
      case TITLE:
      case INSTRUCTIONS:
      case PAUSED:
      case WIN_LEVEL:
        this.hidden = true;
        break;
      default: throw new Error(`Unrecognized game state: ${state}`);
    }
  }

  render() {
    if (!this.hidden) {
      this.accessories.forEach(accessoryObject => {
        const image = Resources.get(IMAGE_URL_ARRAY[accessoryObject.accessoryType]);
        const { coordinates } = accessoryObject;
        this.ctx.drawImage(image, coordinates.x, coordinates.y);
      });
    }
  }
}

export default MapAccessories;
