import Board from './Board';
import Resources from '../resources';

/**
 * The MapAccessories class deals with objects that can be placed on the map at
 * the beginning of a level. The possible objects are a rock, a key, and a heart.
 * @constructor
 */
class MapAccessories {
  constructor() {
    /**
     * An array of all active accessories
     * @type {Array.<Object<string, number | Object.<string, Object.<string, number>>>>}
     */
    this.accessories = [];
    /** @type {Object.<string, number | Object<string, Object<string, number>>>} */
    this.rockAccessory = null;
    /** @type {Object.<string, number | Object<string, Object<string, number>>>} */
    this.keyAccessory = null;
    /** @type {Object.<string, number | Object<string, Object<string, number>>>} */
    this.heartAccessory = null;
    /** @type{boolean} */ this.hidden = true;
    /**
     * The leftmost column number where the rock might end up in a given level.
     * @type {number}
     */
    this.leftMostRockPosition = 0;
    /**
     * The leftmost column number where the key might end up in a given level.
     * @type {number}
     */
    this.leftMostKeyPosition = 0;
  }

  init(game, board) {
    this.game = game;
    this.board = board;
  }

  /**
   * Places accessories on game board before a level begins.
   */
  placeAccessories() {
    const { board } = this;
    // If rock and key are already placed, don't place them again!
    if (this.accessories.indexOf(this.rockAccessory) !== -1
      && this.accessories.indexOf(this.keyAccessory) !== -1) { return; }
    // Rock...
    this.accessories = [];
    let rockLocation = Board.randomBoardLocationInRows(0);
    while (rockLocation.column < this.leftMostRockPosition) {
      rockLocation = Board.randomBoardLocationInRows(0);
    }
    board.setTile(rockLocation.column, rockLocation.row, Board.Tile.STONE);
    this.rockAccessory = this.packageAccessory(MapAccessories.Type.ROCK, rockLocation);
    this.rockAccessory.coordinates.y += MapAccessories.ROCK_PIXEL_ADJUST;
    // Key...
    let keyLocation = board.randomRoadBoardLocation();
    while (keyLocation.column < this.leftMostKeyPosition) {
      keyLocation = board.randomRoadBoardLocation();
    }
    this.keyAccessory = this.packageAccessory(MapAccessories.Type.KEY, keyLocation);
    this.keyAccessory.coordinates.y += MapAccessories.KEY_PIXEL_ADJUST;

    // Add rock and key to accessories array
    this.accessories.splice(0, 0, this.rockAccessory, this.keyAccessory);

    // Heart...
    if (Math.random() <= MapAccessories.PROBABILITY_OF_EXTRA_LIFE) {
      let heartLocation = board.randomRoadBoardLocation();
      while (heartLocation.column === keyLocation.column && heartLocation.row === keyLocation.row) {
        heartLocation = board.randomRoadBoardLocation();
      }
      this.heartAccessory = this.packageAccessory(MapAccessories.Type.HEART, heartLocation);
      this.accessories.push(this.heartAccessory);
    }
  }

  /**
   * Packages the accessory and its location (both board- and pixel-coordinates)
   * into an object.
   * @param {number} type Accessory type.
   * @param {Object.<string, number>} Row-column coordinates.
   * @return {Object.<string, number | Object.<string, number>>} An object that
   *     contains the type of accessory, its row-column coordinates, and its pixel
   *     coordinates.
   */
  packageAccessory(accessoryType, location) {
    return {
      accessoryType,
      location,
      coordinates: this.board.pixelCoordinatesForBoardCoordinates(location.column, location.row),
    };
  }

  /**
   * Returns whether the move is legal, taking into account map accessories, and
   * takes the appropriate action in the case of an accessory whose collection has
   * a consequence.
   * @param {number} x Column number.
   * @param {number} y Row number.
   * @return {boolean} Whether the move is legal, looking only at map accessories.
   */
  playerCanMoveHere(x, y) {
    // Player can't occupy the same space as the rock
    if (this.accessories.indexOf(this.rockAccessory) !== -1
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

  /**
   * Changes settings in the MapAccessories object as a result of a change in game
   * state
   * @param {number} state The new game state.
   */
  setState(state) {
    const { game } = this;
    switch (state) {
      case game.State.LEVEL_TITLE:
        this.hidden = true;
        this.placeAccessories();
        break;
      case game.State.REINCARNATE:
        this.hidden = true;
        this.accessories.splice(0, 0, this.rockAccessory, this.keyAccessory);
        break;
      case game.State.PLAY:
        this.hidden = false;
        break;
      case game.State.DIED:
        this.hidden = false;
        this.heartAccessory = null;
        this.accessories = [];
        break;
      case game.State.GAME_OVER:
        this.hidden = true;
        this.rockAccessory = null;
        this.keyAccessory = null;
        this.accessories = [];
        break;
      default:
        this.hidden = true;
    }
  }

  /**
   * Renders all active map accessories.
   */
  render() {
    if (!this.hidden) {
      let image;
      let coordinates;
      this.accessories.forEach(accessoryObject => {
        image = Resources.get(MapAccessories.IMAGE_URL_ARRAY[accessoryObject.accessoryType]);
        coordinates = accessoryObject.coordinates;
        ctx.drawImage(image, coordinates.x, coordinates.y);
      }, this);
    }
  }
}

/**
 * Enum for possible accessory types.
 * @enum {number}
 */
MapAccessories.Type = { KEY: 0, ROCK: 1, HEART: 2 };
/**
 * Array of image URLs that correspond with the possible accessory types.
 * @const {Array.<string>}
 */
MapAccessories.IMAGE_URL_ARRAY = [
  'images/Key.png',
  'images/Rock.png',
  'images/Heart.png',
];
/** @const */ MapAccessories.ROCK_PIXEL_ADJUST = -25;
/** @const */ MapAccessories.KEY_PIXEL_ADJUST = -15;
/** @const */ MapAccessories.PROBABILITY_OF_EXTRA_LIFE = 1 / 20;

export default MapAccessories;
