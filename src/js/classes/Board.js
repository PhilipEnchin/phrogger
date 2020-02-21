import Resources from '../resources';

/**
 * The Board class deals with anything relating to the game board. It has methods
 * for returning coordinates to any tile on the board, rendering the board, as
 * well as returning randomly generated coordinates. It stores and deals with
 * data for which tiles are which types, which rows are roads, as well as the
 * animation used for transitioning from one board to another.
 * @constructor
 */
class Board {
  constructor() {
    /**
     * A 2D array of tile-types
     * @type {Array.<Array.<number>>}
     */
    this.tileTypes = [];
    /**
     * A 2D array of all the tile coordinates, calculated in advance (in the
     * init() method) for quick and easy access!
     * @type {Array.<Array.<number>>}
     */
    this.tileCoordinates = [];
    /**
     * Array of row indices that are roads, used when generating enemy locations.
     * @type {Array<number>}
     */
    this.roadRowNumbers = [];
    /**
     * Object that stores an array of upcoming tile changes in an animation
     * between levels, and the status (an enum) of that animation.
     * @type {Object.<string, number|Array.<Object.<string, Object.<string,number>|number>>}
     */
    this.pendingTileChanges = {
      status: null,
      changes: []
    };
  };

  /**
   * Initializes game board, and caches coordinates of each tile.
   */
  init(game, mapAccessories) {
    var row, col;
    var rowTypes = [];
    //Store row types in a temporary array
    for (row = 0; row < Board.ROWS_COUNT; row++) {
      if (row === 0)
        rowTypes.push(Board.Tile.WATER);
      else
        rowTypes.push(Board.Tile.GRASS);
    }
    //Initialize tileTypes (using array from above) and tileCoordinates grids
    for (col = 0; col < Board.COLUMN_COUNT; col++) {
      this.tileCoordinates.push([]);
      this.tileTypes.push([]);
      var colPixel = col * this.COL_WIDTH_PIXELS;
      for (row = 0; row < Board.ROWS_COUNT; row++) {
        var coordinates = {
          x: col * Board.COL_WIDTH_PIXELS,
          y: row * Board.ROW_HEIGHT_PIXELS
        };
        this.tileCoordinates[col].push(coordinates);
        this.tileTypes[col].push(rowTypes[row]);
      }
    }

    this.pendingTileChanges.status = Board.AnimationState.NOTHING_TO_ANIMATE;

    this.game = game;
    this.mapAccessories = mapAccessories;
  };

  /**
   * Sets up map accordinly when game state is set.
   * @param {number} state The new game state.
   */
  setState(state) {
    switch (state) {
      case this.game.State.TITLE:
        this.setRows(
          0,Board.Tile.WATER,
          [1,2,3,4],Board.Tile.STONE,
          Board.Tile.GRASS
        );
        break;
    }
  };

  /**
   * Returns the pixel coordinates for the column and row corresponding to a tile.
   * @param {number} colNumber The column number, from left to right, starting at
   *     zero
   * @param {number} rowNumber The row number, from top to bottom, starting at zero.
   * @return {Object.<string,number>} The coordinates of the specified tile.
   */
  pixelCoordinatesForBoardCoordinates(colNumber, rowNumber) {
    var newCoordinates = {};
    var coordinates = this.tileCoordinates[colNumber][rowNumber];
    //Make a copy of the coordinates object to prevent accidental manipulation
    for (var key in coordinates) {
      if (coordinates.hasOwnProperty(key))
        newCoordinates[key] = coordinates[key];
    }
    return newCoordinates;
  };

  /**
   * Takes pairs of arguments. The first of each pair is either a row number or an
   * array of row numbers. The second of each pair is a tile type. Optionally, a
   * single extra tile type argument (or if no pairs are specified, a single
   * argument) can be used to apply that tile to all the rows now already specified
   * by the previous arguments. If that last one is omitted, no additional rows are
   * changed. This method uses Board.prototype.setRow() to actually set the rows.
   * @param {...*} var_args See above description.
   */
  setRows(var_args) {
    var args = Array.prototype.slice.call(arguments);
    var remainingRows = []; //Stores rows not yet set in this invocation
    var rowArray, tileType;
    for (var i = Board.ROWS_COUNT - 1; i >= 0; i--) {
      remainingRows.splice(0,0,i);
    };
    while(args.length > 1){ //If there is at least one pair remaining in args
      if (args[0].constructor === Number) //If the first arg is a number
        rowArray = [args.splice(0,1)[0]]; //Place in an array, then save
      else //If the first arg is an array
        rowArray = args.splice(0,1)[0]; //Save as is
      tileType = args.splice(0,1)[0]; //Next arg is tile type
      //Step through rows specified and change those rows
      for (var i = rowArray.length - 1; i >= 0; i--) {
        this.setRow(rowArray[i],tileType);
        remainingRows.splice(remainingRows.indexOf(rowArray[i]),1);
      };
    }
    if (args.length > 0){ //If the last arg is not part of a pair...
      tileType = args[0]; //The arg is a tile type
      while (remainingRows.length > 0) //Change remaining rows to that type
        this.setRow(remainingRows.pop(),tileType);
    }
  };

  /**
   * Takes a row number and a tile type, and sets that row to that tile type. This
   * method uses Board.prototype.setTile() to actually set the individual tiles.
   * @param {number} rowNumber The row number, from top to bottom, starting at zero.
   * @param {tileType} tileType The type of tile
   */
  setRow(rowNumber, tileType) {
    if (tileType === Board.Tile.STONE) { //If row is set to be a road...
      if (this.roadRowNumbers.indexOf(rowNumber) === -1) {
        this.roadRowNumbers.push(rowNumber); //Remember this row is a road
      } else {
        return; //This row is already a road. Do nothing.
      }
    } else { //This row is going to be non-road. Un-remember this row is a road
      var rowArrayIndex = this.roadRowNumbers.indexOf(rowNumber);
      if (rowArrayIndex !== -1) { //This row is going from road to something else
        this.roadRowNumbers.splice(rowArrayIndex,1);
      }
    }
    //Set tiles in this row
    for (var col = Board.COLUMN_COUNT-1; col >= 0; col--) {
      this.setTile(col,rowNumber,tileType);
    }
  };

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
      case game.State.PLAY:
      case game.State.TITLE:
        this.tileTypes[colNumber][rowNumber] = tileType;
        break;
      default: //If the state isn't specified above, animate this change
        if (this.tileTypes[colNumber][rowNumber] != tileType)
          this.addTileChangeToPending(colNumber,rowNumber,tileType);
    }
  };

  /**
   * Adds this tile change to the upcoming tile change animation.
   * @param {number} colNumber The column number, from left to right, starting at
   *     zero
   * @param {number} rowNumber The row number, from top to bottom, starting at zero.
   * @param {tileType} tileType The type of tile
   */
  addTileChangeToPending(colNumber, rowNumber, tileType) {
    this.pendingTileChanges.changes.push({
      location: { //The location on the game board
        column: colNumber,
        row: rowNumber
      },
      tileType: tileType, //The type of tile
      time: Math.random() //A randomly generated time (processed in update())
    });
    this.pendingTileChanges.status = Board.AnimationState.CONTAINS_NEW_CHANGES;
  };

  /**
   * If the animation state is .CONTAINS_NEW_CHANGES, it completes the processing
   * of the data contained in this.prndingTileChanges and initiates the animation.
   * If the animation state is .ANIMATE, it animates the changes whose time has
   * come. Otherwise, this method does nothing.
   * @param {number} dt The time elapsed since the last update
   * @param {number} now The system time at the moment of invocation
   */
  update(dt,now) {
    const { game } = this;
    var changes; //Array of upcoming tile changes
    switch (this.pendingTileChanges.status) {
      case Board.AnimationState.NOTHING_TO_ANIMATE: break;
      case Board.AnimationState.CONTAINS_NEW_CHANGES:
        changes = this.pendingTileChanges.changes;
        changes.sort(function(a,b){ //Sort by random times in ascening order
          return a.time-b.time; //So animation goes from fast to slow
        });
        //Use the randomly generated values as delta-time, and replace those
        //with corresponding system time
        var previousValue = 0;
        var totalTime = changes[changes.length-1].time;
        changes.forEach(function(change){
          previousValue = change.time += previousValue;
        });
        totalTime += previousValue;
        //Scale the time to fit the time alotted for the animation
        changes.forEach(function(change){
          change.time *= game.timeRemaining * 9 / totalTime / 10;
          change.time += now;
        });
        this.pendingTileChanges.status = Board.AnimationState.ANIMATE;
      case Board.AnimationState.ANIMATE:
        changes = this.pendingTileChanges.changes;
        var change, location;
        //Animate changes that are to be complete at this time
        while (changes.length > 0 && now >= changes[0].time) {
          change = changes.splice(0,1)[0];
          location = change.location;
          this.tileTypes[location.column][location.row] = change.tileType;
        }
        if (changes.length === 0) //No tile changes left, finish animation
          this.pendingTileChanges.status =
            Board.AnimationState.NOTHING_TO_ANIMATE;
    }
  };

  /**
   * Randomly generates a Y coordinate corresponding with a tile on an existing
   * road. Used when an enemy is generated to ensure its location is random but
   * placed correctly on a road.
   * @return {number} A vertical pixel coordinate corresponding with a road.
   */
  randomRoadYCoordinate() {
    var roadRowIndex = Math.floor(Math.random()*this.roadRowNumbers.length);
    var rowIndex = this.roadRowNumbers[roadRowIndex];
    return this.pixelCoordinatesForBoardCoordinates(0,rowIndex).y;
  };

  /**
   * @return {Object.<string, number>} An object that contains randomly generated
   *     row and column numbers.
   */
  randomRoadBoardLocation() {
    return {
      column: Math.floor(Math.random()*Board.COLUMN_COUNT),
      row: this.roadRowNumbers[
        Math.floor(Math.random()*this.roadRowNumbers.length)]
    };
  };

  /**
   * @param {number|Array.<number>} var_args Either a row number or an array of
   *     row numbers
   * @return {Object.<string, number>} An object that contains randomly generated
   *     row and column numbers based on the desired rows specified.
   */
  randomBoardLocationInRows(var_args) {
    var args = Array.prototype.slice.call(arguments);
    var rowNumber
    if (args.length === 0) //No rows provided, use all possible rows
      rowNumber = Math.floor(Math.random()*Board.ROWS_COUNT);
    else if (args[0].constructor === Array) //Rows in an array
      rowNumber = args[0][Math.floor(Math.random()*args.length)];
    else //Rows are specified in individual arguments
      rowNumber = args[Math.floor(Math.random()*args.length)];

    return {
      column: Math.floor(Math.random()*Board.COLUMN_COUNT),
      row: rowNumber
    };
  };

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
  playerCanMoveHere(x,y) {
    const { game, mapAccessories } = this;
    //If mapAccessories says player can move here, and the player isn't trying
    //to move off the game board...
    if (mapAccessories.playerCanMoveHere(x,y) && x < Board.COLUMN_COUNT &&
      x >= 0 && y < Board.ROWS_COUNT && y >= 0) {
      //If the player is hitting the top row and isn't drowning, level is won!
      if (y === 0 && this.tileTypes[x][y] !== Board.Tile.WATER)
        game.setState(game.State.WIN_LEVEL);
      return true; //Move is legal
    }
    return false; //Move is illegal
  };

  /**
   * Renders the game board.
   */
  render() {
    var coordinates, image;
    for (var row = 0; row < Board.ROWS_COUNT; row++) {
      for (var col = 0; col < Board.COLUMN_COUNT; col++) {
        coordinates = this.tileCoordinates[col][row];
        image = Resources.get(Board.IMAGE_URL_ARRAY[this.tileTypes[col][row]]);
        ctx.drawImage(image, coordinates.x, coordinates.y);
      };
    };
  };
}

/** @const */ Board.ROWS_COUNT = 6;
/** @const */ Board.COLUMN_COUNT = 5;
/** @const */ Board.ROW_HEIGHT_PIXELS = 83;
/** @const */ Board.COL_WIDTH_PIXELS = 101;

/**
 * Array of image URLs whose indices correspond with the Tile enum above.
 * @const {Array.<string>}
 */
Board.IMAGE_URL_ARRAY = [
  'images/water-block.png',
  'images/stone-block.png',
  'images/grass-block.png',
];
/**
 * Enum for possible tile types
 * @enum {number}
 */
Board.Tile = { WATER: 0, STONE: 1, GRASS: 2 };
/**
 * Enum for possible states of pre-level animation.
 * @enum {number}
 */
Board.AnimationState = {
  CONTAINS_NEW_CHANGES: 0, // Queues new animation sequence
  ANIMATE: 1, // Animation in progess
  NOTHING_TO_ANIMATE: 2, // Animation complete
};

export default Board;
