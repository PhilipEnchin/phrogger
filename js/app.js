/**
 * @fileoverview Aside from the main loop (which is in engine.js), this file
 * contains everything needed to run "Phrogger". All the game-related classes are
 * here. They're declared, and their constructors are called.
 */

/**
 * The Game class saves data related to the state of the game, such as the level,
 * the current high score, how many lives are remaining, etc. It's used as a hub
 * of sorts for the game as a whole. For example, all keyboard input is routed
 * through Game, and Game.init() calls init() methods on other classes.
 * @constructor
 */
var Game = function() {
    /**
     * Time remaining for showing titles for levels, etc. The timer is active as
     * long as this.timeRemaining > 0.
     * @type {number}
     */
    this.timeRemaining = 0;
    /**
     * The state of the game, constants below.
     * @type {number}
     */
    this.state;
    /**
     * Lives remaining. (When there's 0, the player can still play, à la video
     * game norm.)
     * @type {number}
     */
    this.lives;
    /**
     * Current level. Starts at 1.
     * @type {number}
     */
    this.level;
    /**
     * High score. Pulled from cookie, if it exists, otherwise it starts at 0.
     * This will always be the higher of the last level passed and the current
     * high score. The cookie is also updated alongside this variable.
     * @type {number}
     */
    this.highScore;
    /**
     * This is always the high score minus the last level passed. As a result,
     * it's positive before the high score is beaten, zero when it's tied, and
     * negative when the player has set a new high score. This is used when the
     * game is over in order to present the appropriate message regarding the
     * player's high score.
     * @type {number}
     */
    this.distanceToHighScore;
    /**
     * The expiry date for the cookie.
     * @type {number}
     */
    this.highScoreCookieExpiry;
};
/** 
  * The key string used in the cookie that holds the high score
  * @const 
  */ 
Game.prototype.HIGH_SCORE_COOKIE_KEY = 'highScore';
/**
 * Enum for possible game states.
 * @enum {number}
 */
Game.prototype.State = {
    TITLE: 0, //Title screen
    INSTRUCTIONS: 1, //Instructions displayed after title screen
    LEVEL_TITLE: 2, //Level title screen (as in, LEVEL 1. FIGHT!)
    PLAY: 3,
    PAUSED: 4,
    GAME_OVER: 5,
    DIED: 6, //Player just died
    WIN_LEVEL: 7, //Player has just passed level
    REINCARNATE: 8 //Like LEVEL_TITLE, but with small differences
};
/**
 * Initializes the objects that need initializing, and initiates the game.
 */
Game.prototype.init = function() {
    map.init();
    enemyHandler.init();
    player.init();
    hud.init();

    var expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 15);
    this.highScoreCookieExpiry = expiry.toUTCString();

    var cookieString = document.cookie;
    var highScoreKeyIndex = cookieString.indexOf(this.HIGH_SCORE_COOKIE_KEY);
    if (highScoreKeyIndex >= 0) {
        var highScoreValueIndex = cookieString.indexOf('=',highScoreKeyIndex)+1;
        this.highScore = parseInt(cookieString.substring(highScoreValueIndex));
    } else {
        this.highScore = 0;
    }

    this.setState(this.State.TITLE);
};
/**
 * Used to set the state of the game. Also passes on the state change to any
 * object that needs it.
 * @param {number} state A game state constant.
 */
Game.prototype.setState = function(state) {
    this.state = state;
    hud.setState(state);
    map.setState(state);
    enemyHandler.setState(state);
    player.setState(state);
    mapAccessories.setState(state)

    switch (state) {
        case this.State.TITLE:
            this.lives = 2;
            this.distanceToHighScore = this.highScore + 1;
            break;
        case this.State.LEVEL_TITLE:
        case this.State.REINCARNATE:
            this.timeRemaining = 2.0;
            break;
        case this.State.WIN_LEVEL:
            this.timeRemaining = 2.0;
            map.setRows(0,map.Tile.WATER);
            this.setLevel(this.level+1);
            break;
        case this.State.DIED:
            this.timeRemaining = 3.0;
            break;
    }
};
/**
 * Handles the input passed on from the listener added to document. Sends the
 * input to the appropriate object, and takes care of other state or level changes.
 * @param {string} keyString String specifying the input from keyboard.
 */
Game.prototype.handleInput = function(keyString) {
    switch (keyString) {
        case 'up':
        case 'down':
        case 'left':
        case 'right':
            player.handleInput(keyString);
            break;
        case 'pause':
            if (this.state === this.State.PLAY)
                this.setState(this.State.PAUSED);
            else if (this.state === this.State.PAUSED)
                this.setState(this.State.PLAY);
            break;
        case 'space':
            if (this.state === this.State.TITLE)
                this.setState(this.State.INSTRUCTIONS);
            else if (this.state === this.State.INSTRUCTIONS) {
                this.setLevel(1);
                this.setState(this.State.LEVEL_TITLE);
            }
            else if (this.state === this.State.GAME_OVER)
                this.setState(this.State.TITLE);
    }
};
/**
 * Sets any parameters to do with changing levels. Also updates the high score
 * (and accompanying cookie) if needed.
 *  @param {number} newLevel The new level
 */
Game.prototype.setLevel = function(newLevel) {
    if (--this.distanceToHighScore < 0)
        document.cookie = this.HIGH_SCORE_COOKIE_KEY + '=' + (++this.highScore) +
            '; expires=' + this.highScoreCookieExpiry;

    this.level = newLevel;

    switch (newLevel) {
        case 1:
            map.setRows(
                0,map.Tile.WATER,
                2,map.Tile.STONE,
                map.Tile.GRASS);
            mapAccessories.leftMostRockPosition = 0;
            mapAccessories.leftMostKeyPosition = 3;
            enemyHandler.setSpeeds(250,300);
            enemyHandler.setSpawnIntervalAndVariance(0.75,0.8);
            break;
        case 2:
            map.setRows(
                1,map.Tile.STONE,
                2,map.Tile.GRASS
            );
            mapAccessories.leftMostRockPosition = 3;
            mapAccessories.leftMostKeyPosition = 2;
            break;
        case 3:
            map.setRows(3,map.Tile.STONE);
            enemyHandler.setSpawnIntervalAndVariance(0.4,0.6);
            enemyHandler.setSpeeds(225,325);
            break;
        case 4:
            map.setRows(4,map.Tile.STONE);
            mapAccessories.leftMostRockPosition = 3;
            enemyHandler.setSpawnIntervalAndVariance(0.25,0.4);
            break;
        case 5:
            map.setRows(
                2,map.Tile.STONE,
                3,map.Tile.GRASS);
            break;
        case 6:
            map.setRows(
                1,map.Tile.GRASS,
                3,map.Tile.STONE
            );
            mapAccessories.leftMostRockPosition = 0;
            enemyHandler.setSpawnIntervalAndVariance(0.4,0.4);
            break;
        case 7:
            map.setRows(
                1,map.Tile.STONE,
                4,map.Tile.GRASS
            );
            mapAccessories.leftMostKeyPosition = 3;
            break;
        case 8:
            map.setRows(4,map.Tile.STONE);
            break;
        default:
            enemyHandler.setSpawnIntervalAndVariance(
            enemyHandler.spawnInterval * 0.98, enemyHandler.spawnVariance * 0.99);
            enemyHandler.setSpeeds(enemyHandler.lowerSpeedLimit * 1.04,
                enemyHandler.upperSpeedLimit * 1.06);
    }
};
/**
 * Decreases the number of lives and initiates the next state, depending on the
 * number of lives remaining.
 */
Game.prototype.died = function() {
    if(--this.lives >= 0)
        this.setState(this.State.REINCARNATE);
    else
        this.setState(this.State.GAME_OVER);
};
/**
 * Adds a life and calls HeadsUp.extraLife() in order to update the HUD
 */
Game.prototype.extraLife = function() {
    this.lives++;
    hud.extraLife();
};
/**
 * Decrements the timer and takes the appropriate action if the timer has run out.
 */
Game.prototype.decrementTimer = function(dt){
    if ((this.timeRemaining -= dt) <= 0) {
        switch (this.state) {
            case this.State.LEVEL_TITLE:
            case this.State.REINCARNATE: this.setState(this.State.PLAY); break;
            case this.State.WIN_LEVEL: this.setState(this.State.LEVEL_TITLE); break;
            case this.State.DIED   : this.died(); break;
        }
    }
};
/**
 * Forwards the update command to other objects, and decrements timer if the
 * timer is active.
 * @param {number} dt The time elapsed since the last update
 * @param {number} now The system time at the moment of invocation
 */
Game.prototype.update = function(dt,now) {
    enemyHandler.update(dt,now);
    player.update(dt,now);
    map.update(dt,now);

    if (this.timeRemaining > 0)
        this.decrementTimer(dt);
};
/**
 * Begins the rendering sequence by clearing the screen, then calling render()
 * methods in other objects.
 */
Game.prototype.render = function() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    map.render();
    mapAccessories.render();
    player.render();
    enemyHandler.render();
    hud.render();
};
/**
 * The Map class deals with anything relating to the game board. It has methods
 * for returning coordinates to any tile on the board, rendering the board, as
 * well as returning randomly generated coordinates. It stores and deals with
 * data for which tiles are which types, which rows are roads, as well as the
 * animation used for transitioning from one map to another.
 * @constructor
 */
var Map = function() {
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
/** @const */ Map.prototype.ROWS_COUNT = 6;
/** @const */ Map.prototype.COLUMN_COUNT = 5;
/** @const */ Map.prototype.ROW_HEIGHT_PIXELS = 83;
/** @const */ Map.prototype.COL_WIDTH_PIXELS = 101;
/**
 * Enum for possible tile types
 * @enum {number}
 */
Map.prototype.Tile = { WATER: 0, STONE: 1, GRASS: 2 };
/**
 * Array of image URLs whose indices correspond with the Tile enum above.
 * @const {Array.<string>}
 */
Map.prototype.IMAGE_URL_ARRAY = [
    'images/water-block.png',
    'images/stone-block.png',
    'images/grass-block.png'
];
/**
 * Enum for possible states of pre-level animation.
 * @enum {number}
 */
Map.prototype.AnimationState = {
    CONTAINS_NEW_CHANGES: 0,
    ANIMATE: 1,
    NOTHING_TO_ANIMATE: 2
};
/**
 * Initializes game board, and caches coordinates of each tile.
 */
Map.prototype.init = function() {
    var row, col;
    var rowTypes = [];
    for (row = 0; row < this.ROWS_COUNT; row++) {
        if (row === 0)
            rowTypes.push(this.Tile.WATER);
        else
            rowTypes.push(this.Tile.GRASS);
    }
    //Initialize tileTypes and tileCoordinates grids
    for (col = 0; col < this.COLUMN_COUNT; col++) { 
        this.tileCoordinates.push([]);
        this.tileTypes.push([]);
        var colPixel = col * this.COL_WIDTH_PIXELS;
        for (row = 0; row < this.ROWS_COUNT; row++) {
            var coordinates = {
                x: col * this.COL_WIDTH_PIXELS,
                y: row * this.ROW_HEIGHT_PIXELS
            };
            this.tileCoordinates[col].push(coordinates);
            this.tileTypes[col].push(rowTypes[row]);
        }
    }
    this.pendingTileChanges.status = this.AnimationState.NOTHING_TO_ANIMATE;
};
/**
 * Sets up map accordinly when game state is set.
 * @param {number} state The new game state.
 */
Map.prototype.setState = function(state) {
    switch (state) {
        case game.State.TITLE:
            this.setRows(
                0,this.Tile.WATER,
                [1,2,3,4],this.Tile.STONE,
                map.Tile.GRASS
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
Map.prototype.pixelCoordinatesForBoardCoordinates = function(colNumber, rowNumber) {
    var newCoordinates = {};
    var coordinates = this.tileCoordinates[colNumber][rowNumber];
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
 * changed. This method uses Map.prototype.setRow() to actually set the rows.
 * @param {...*} var_args See above description.
 */
Map.prototype.setRows = function(var_args) {
    var args = Array.prototype.slice.call(arguments);
    var remainingRows = []; //Rows not set yet, in the event of 
    var rowArray, tileType;
    for (var i = this.ROWS_COUNT - 1; i >= 0; i--) {
        remainingRows.splice(0,0,i);
    };
    while(args.length > 1){
        if (args[0].constructor === Number)
            rowArray = [args.splice(0,1)[0]];
        else
            rowArray = args.splice(0,1)[0];
        tileType = args.splice(0,1)[0];
        for (var i = rowArray.length - 1; i >= 0; i--) {
            this.setRow(rowArray[i],tileType);
            remainingRows.splice(remainingRows.indexOf(rowArray[i]),1);
        };
    }
    if (args.length > 0){
        tileType = args[0];
        while (remainingRows.length > 0) 
            this.setRow(remainingRows.pop(),tileType);
    }
};
/**
 * Takes a row number and a tile type, and sets that row to that tile type. This
 * method uses Map.prototype.setTile() to actually set the individual tiles.
 * @param {number} rowNumber The row number, from top to bottom, starting at zero.
 * @param {tileType} tileType The type of tile
 */
Map.prototype.setRow = function(rowNumber, tileType) {
    if (tileType === this.Tile.STONE) {
        if (this.roadRowNumbers.indexOf(rowNumber) === -1) {
            this.roadRowNumbers.push(rowNumber);
        } else {
            return; //Road is already set up in this row
        }
    } else {
        var rowArrayIndex = this.roadRowNumbers.indexOf(rowNumber);
        if (rowArrayIndex !== -1) { //This row is going from road to something else
            this.roadRowNumbers.splice(rowArrayIndex,1);
        }
    }
    for (var col = this.COLUMN_COUNT-1; col >= 0; col--) {
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
Map.prototype.setTile = function(colNumber, rowNumber, tileType) {
    switch (game.state) {
        case game.State.PLAY:
        case game.State.TITLE:
            this.tileTypes[colNumber][rowNumber] = tileType;
            break;
        default:
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
Map.prototype.addTileChangeToPending = function(colNumber, rowNumber, tileType) {
    this.pendingTileChanges.changes.push({
        location: {
            column: colNumber,
            row: rowNumber
        },
        tileType: tileType,
        time: Math.random()
    });
    this.pendingTileChanges.status = this.AnimationState.CONTAINS_NEW_CHANGES;
};
/**
 * If the animation state is .CONTAINS_NEW_CHANGES, it completes the processing
 * of the data contained in this.prndingTileChanges and initiates the animation.
 * If the animation state is .ANIMATE, it animates the changes whose time has
 * come. Otherwise, this method does nothing.
 * @param {number} dt The time elapsed since the last update
 * @param {number} now The system time at the moment of invocation
 */
Map.prototype.update = function(dt,now) {
    var changes;
    switch (this.pendingTileChanges.status) {
        case this.AnimationState.NOTHING_TO_ANIMATE: break;
        case this.AnimationState.CONTAINS_NEW_CHANGES:
            changes = this.pendingTileChanges.changes;
            changes.sort(function(a,b){
                return a.time-b.time;
            });
            //Use the randomly generated values as delta-time, and replace those
            //with corresponding system time
            var previousValue = 0;
            var totalTime = changes[changes.length-1].time;
            changes.forEach(function(change){
                previousValue = change.time += previousValue;
            });
            totalTime += previousValue;
            //Scale the time to fit the time remaining
            changes.forEach(function(change){
                change.time *= game.timeRemaining * 9 / totalTime / 10;
                change.time += now;
            });
            this.pendingTileChanges.status = this.AnimationState.ANIMATE;
        case this.AnimationState.ANIMATE:
            changes = this.pendingTileChanges.changes;
            var change, location;
            while (changes.length > 0 && now >= changes[0].time) {
                change = changes.splice(0,1)[0];
                location = change.location;
                this.tileTypes[location.column][location.row] = change.tileType;
            }
            if (changes.length === 0)
                this.pendingTileChanges.status = this.AnimationState.NOTHING_TO_ANIMATE;
    }
};
/**
 * Randomly generates a Y coordinate corresponding with a tile on an existing
 * road. Used when an enemy is generated to ensure its location is random but
 * placed correctly on a road.
 * @return {number} A vertical pixel coordinate corresponding with a road.
 */
Map.prototype.randomRoadYCoordinate = function() {
    var roadRowIndex = Math.floor(Math.random()*this.roadRowNumbers.length);
    var rowIndex = this.roadRowNumbers[roadRowIndex];
    return this.pixelCoordinatesForBoardCoordinates(0,rowIndex).y;
};
/**
 * @return {Object.<string, number>} An object that contains randomly generated
 *     row and column numbers.
 */
Map.prototype.randomRoadBoardLocation = function() {
    return {
        column: Math.floor(Math.random()*map.COLUMN_COUNT),
        row: this.roadRowNumbers[Math.floor(Math.random()*this.roadRowNumbers.length)]
    };
};
/**
 * @param {number|Array.<number>} var_args Either a row number or an array of
 *     row numbers
 * @return {Object.<string, number>} An object that contains randomly generated
 *     row and column numbers based on the desired rows specified.
 */
Map.prototype.randomBoardLocationInRows = function(var_args) {
    var args = Array.prototype.slice.call(arguments);
    var rowNumber
    if (args.length === 0)
        rowNumber = Math.floor(Math.random()*this.ROWS_COUNT);
    else if (args[0].constructor === Array)
        rowNumber = args[0][Math.floor(Math.random()*args.length)];
    else
        rowNumber = args[Math.floor(Math.random()*args.length)];
    return {
        column: Math.floor(Math.random()*this.COLUMN_COUNT),
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
Map.prototype.playerCanMoveHere = function(x,y) {
    if (mapAccessories.playerCanMoveHere(x,y) && x < this.COLUMN_COUNT &&
        x >= 0 && y < this.ROWS_COUNT && y >= 0) {
        if (y === 0 && this.tileTypes[x][y] !== this.Tile.WATER)
            game.setState(game.State.WIN_LEVEL);
        return true;
    }
    return false;
};
/**
 * Renders the game board.
 */
Map.prototype.render = function() {
    var coordinates, image;
    for (var row = 0; row < this.ROWS_COUNT; row++) {
        for (var col = 0; col < this.COLUMN_COUNT; col++) {
            coordinates = this.tileCoordinates[col][row];
            image = Resources.get(this.IMAGE_URL_ARRAY[this.tileTypes[col][row]]);
            ctx.drawImage(image, coordinates.x, coordinates.y);
        };
    };
};

/**
 * The MapAccessories class deals with objects that can be placed on the map at
 * the beginning of a level. The possible objects are a rock, a key, and a heart.
 * @constructor
 */
var MapAccessories = function() {
    this.accessories = [];
    this.rockAccessory;
    this.keyAccessory;
    this.heartAccessory;
    this.hidden = true;
    this.leftMostRockPosition = 0;
    this.leftMostKeyPosition = 0;
};
/**
 * Enum for possible accessory types.
 * @enum {number}
 */
MapAccessories.prototype.Type = { KEY: 0, ROCK: 1, HEART: 2 };
/**
 * Array of image URLs that correspond with the possible accessory types.
 * @const {Array.<string>}
 */
MapAccessories.prototype.IMAGE_URL_ARRAY = [
    'images/Key.png',
    'images/Rock.png',
    'images/Heart.png'
];
/** @const */ MapAccessories.prototype.ROCK_PIXEL_ADJUST = -25;
/** @const */ MapAccessories.prototype.KEY_PIXEL_ADJUST = -15;
/** @const */ MapAccessories.prototype.PROBABILITY_OF_EXTRA_LIFE = 1/20;
/**
 * Places accessories on game board before a level begins.
 */
MapAccessories.prototype.placeAccessories = function() {
    if (this.accessories.indexOf(this.rockAccessory) !== -1 &&
        this.accessories.indexOf(this.keyAccessory) !== -1)
        return;
    //Rock
    this.accessories = [];
    var rockLocation = map.randomBoardLocationInRows(0);
    while (rockLocation.column < this.leftMostRockPosition)
        rockLocation = map.randomBoardLocationInRows(0);
    map.setTile(rockLocation.column,rockLocation.row,map.Tile.STONE);
    this.rockAccessory = this.packageAccessory(this.Type.ROCK,rockLocation);
    this.rockAccessory.coordinates.y += this.ROCK_PIXEL_ADJUST;
    //Key
    var keyLocation = map.randomRoadBoardLocation();
    while (keyLocation.column < this.leftMostKeyPosition)
        keyLocation = map.randomRoadBoardLocation();
    this.keyAccessory = this.packageAccessory(this.Type.KEY,keyLocation);
    this.keyAccessory.coordinates.y += this.KEY_PIXEL_ADJUST;
    this.accessories.splice(0,0,this.rockAccessory,this.keyAccessory);
    //Heart
    if (Math.random() <= this.PROBABILITY_OF_EXTRA_LIFE) {
        var heartLocation = map.randomRoadBoardLocation();
        while (heartLocation.column === keyLocation.column &&
            heartLocation.row === keyLocation.row)
            heartLocation = map.randomRoadBoardLocation();
        this.heartAccessory = this.packageAccessory(this.Type.HEART,heartLocation);
        this.accessories.push(this.heartAccessory);
    }
};
/**
 * Packages the accessory and its location (both board- and pixel-coordinates)
 * into an object.
 * @param {number} type Accessory type.
 * @param {Object.<string, number>} Row-column coordinates.
 * @return {Object.<string, number | Object.<string, number>>} An object that
 *     contains the type of accessory, its row-column coordinates, and its pixel
 *     coordinates.
 */
MapAccessories.prototype.packageAccessory = function(type,location) {
    return {
        accessoryType: type,
        location: location,
        coordinates: map.pixelCoordinatesForBoardCoordinates(location.column,location.row)
    };
};
/**
 * Returns whether the move is legal, taking into account map accessories, and
 * takes the appropriate action in the case of an accessory whose collection has
 * a consequence.
 * @param {number} x Column number.
 * @param {number} y Row number.
 * @return {boolean} Whether the move is legal, looking only at map accessories.
 */
MapAccessories.prototype.playerCanMoveHere = function(x,y) {
    //Rock
    if (this.accessories.indexOf(this.rockAccessory) !== -1 &&
        this.rockAccessory.location.column === x &&
        this.rockAccessory.location.row === y)
        return false;
    //Heart
    else if (this.heartAccessory && this.heartAccessory.location.column === x &&
        this.heartAccessory.location.row === y) {
        this.accessories.splice(this.accessories.indexOf(this.heartAccessory),1);
        this.heartAccessory = null;
        game.extraLife();
    }
    //Key
    else if (this.keyAccessory.location.column === x &&
        this.keyAccessory.location.row === y) {
        this.accessories.splice(this.accessories.indexOf(this.rockAccessory),1);
        this.accessories.splice(this.accessories.indexOf(this.keyAccessory),1);
    }
    return true;
};
/**
 * Changes settings in the MapAccessories object as a result of a change in game
 * state
 * @param {number} state The new game state.
 */
MapAccessories.prototype.setState = function(state) {
    switch(state) {
        case game.State.LEVEL_TITLE:
            this.hidden = true;
            this.placeAccessories();
            break;
        case game.State.REINCARNATE:
            this.hidden = true;
            this.accessories.splice(0,0,this.rockAccessory,this.keyAccessory);
            break;
        case game.State.PLAY:
            this.hidden = false;
            break;
        case game.State.DIED   :
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
};
/**
 * Renders all active map accessories.
 */
MapAccessories.prototype.render = function() {
    if (!this.hidden) {
        var image, coordinates;
        this.accessories.forEach(function(accessoryObject){
            image = Resources.get(this.IMAGE_URL_ARRAY[accessoryObject.accessoryType]);
            coordinates = accessoryObject.coordinates;
            ctx.drawImage(image,coordinates.x,coordinates.y);
        },this);
    }
};
/**
 * Object representing the heads-up display - lives remaining, level number,
 * etc. Renders all in-game text to the screen.
 * @constructor
 */
var HeadsUp = function() {
    /** @type {string} */ this.levelText;
    /** @type {string} */ this.livesText;
    /** @type {string} */ this.bigText;
    /** @type {string} */ this.bigTextSize;
    /** @type {string} */ this.instructionText;
};
/** @const */ HeadsUp.prototype.GAME_TITLE = 'PHROGGER';
/** @const */ HeadsUp.prototype.GAME_INSTRUCTIONS = [
    'Use arrow keys to get across the road',
    'Don\'t forget to grab the key!',
    'Press P to pause',
    '',
    'When you\'re ready, hit the spacebar'
];
/** @const */ HeadsUp.prototype.levelPrefix = 'LEVEL: ';
/** @const */ HeadsUp.prototype.livesPrefix = 'LIVES: ';
/** @const */ HeadsUp.prototype.TITLE_TEXT_SIZE = 80;
/** @const */ HeadsUp.prototype.PAUSED_TEXT_SIZE = 36;
/** @const */ HeadsUp.prototype.PRE_LEVEL_TEXT_SIZE = 48;
/** @const */ HeadsUp.prototype.LEVEL_TEXT_SIZE = 16;
/** @const */ HeadsUp.prototype.LIVES_TEXT_SIZE = 16;
/** @const */ HeadsUp.prototype.INSTRUCTION_TEXT_SIZE = 20;
/** @const */ HeadsUp.prototype.INSTRUCTION_LINE_HEIGHT = 24;
/**
 * X position of HUD level text.
 * @const
 */
HeadsUp.prototype.LEVEL_X = 0;
/**
 * Y position of HUD level text.
 * @const
 */
HeadsUp.prototype.LEVEL_Y = (Map.prototype.ROWS_COUNT + 1) * 
    Map.prototype.ROW_HEIGHT_PIXELS + 25;
/**
 * X position of HUD lives text.
 * @const
 */
HeadsUp.prototype.LIVES_X = Map.prototype.COLUMN_COUNT *
    Map.prototype.COL_WIDTH_PIXELS;
/**
 * Y position of HUD lives text.
 * @const
 */
HeadsUp.prototype.LIVES_Y = (Map.prototype.ROWS_COUNT + 1) *
    Map.prototype.ROW_HEIGHT_PIXELS + 25;
HeadsUp.prototype.TYPEFACE = 'Impact';
/**
 * Sets constants that can't be set until after engine.js is loaded.
 */
HeadsUp.prototype.init = function() {
    /**
     * X position of HUD "big" text.
     * @const
     */
    this.BIG_TEXT_X = canvas.width/2;
    /**
     * Y position of HUD "big" text.
     * @const
     */
    this.BIG_TEXT_Y = canvas.height/2 - 20;
    /**
     * X position of HUD instructions text.
     * @const
     */
    this.INSTRUCTIONS_X = canvas.width/2;
    /**
     * Y position of HUD instructions text.
     * @const
     */
    this.INSTRUCTIONS_Y = canvas.height/2 + 20;
};
/**
 * Sets HUD text based on game state.
 * @param {number} state The new game state.
 */
HeadsUp.prototype.setState = function(state) {
    switch (state) {
        case game.State.TITLE:
            this.levelText = '';
            this.livesText = '';
            this.bigText = this.GAME_TITLE;
            this.bigTextSize = this.TITLE_TEXT_SIZE;
            this.instructionText = [
                'Press spacebar to begin',
                '',
                (game.highScore > 0) ? 'High score: Level '+game.highScore : ''
            ];
            break;
        case game.State.INSTRUCTIONS:
            this.bigText = '';
            this.instructionText = this.GAME_INSTRUCTIONS;
            break;
        case game.State.LEVEL_TITLE:
        case game.State.REINCARNATE:
            this.bigText = this.levelPrefix + game.level;
            this.instructionText = this.livesPrefix + game.lives;
            this.bigTextSize = this.PRE_LEVEL_TEXT_SIZE;
            this.levelText = '';
            this.livesText = '';
            break;
        case game.State.PLAY:
            this.levelText = this.levelPrefix + game.level;
            this.livesText = this.livesPrefix + game.lives;
            this.bigText = '';
            this.instructionText = '';
            break;
        case game.State.PAUSED:
            this.bigText = 'PAUSED';
            this.bigTextSize = this.PAUSED_TEXT_SIZE;
            break;
        case game.State.WIN_LEVEL:
            var winTextArray = ['Nicely done!','You rock!','Ka-Blamo'];
            this.bigText = winTextArray[Math.floor(Math.random() * 
                winTextArray.length)];
            break;
        case game.State.DIED   :
            var dieTextArray = ['You died','You expired','You perished',
                'Kicked the bucket','Croaked','Bought it','Bought the farm',
                'Checked out early'];
            this.bigText = dieTextArray[Math.floor(Math.random()*dieTextArray.length)];
            break;
        case game.State.GAME_OVER:
            this.bigText = 'Game over';
            if (game.distanceToHighScore < 0 &&
                -game.distanceToHighScore !== game.highScore)
                this.instructionText = [
                    'You beat your high score!',
                    '',
                    'New high score:',
                    'Level ' + game.highScore];
            else if (game.distanceToHighScore < 0)
                this.instructionText = [
                'You set your first high score!',
                '',
                'High Score: Level ' + game.highScore];
            else if (game.distanceToHighScore === 0 && game.highScore > 0)
                this.instructionText = [
                    'You tied your high score!',
                    '',
                    'Give it another try!'];
            else
                this.instructionText = ['So sad'];
            this.instructionText.splice(1000,0,'','Press spacebar to continue');
            break;
    }
};
/**
 * Updates the lives text on screen when an extra life is achieved.
 */
HeadsUp.prototype.extraLife = function() {
    this.livesText = this.livesPrefix + game.lives;
};
/**
 * Renders all non-empty text strings to the screen
 */
HeadsUp.prototype.render = function() {
    if (this.bigText){
        this.renderText(this.bigText,this.BIG_TEXT_X,this.BIG_TEXT_Y,
            this.TITLE_TEXT_SIZE,this.TYPEFACE,'center');
    }
    if (this.instructionText){
        if(this.instructionText.constructor == Array){
            for (var i = this.instructionText.length - 1; i >= 0; i--) {
                this.renderText(this.instructionText[i],this.INSTRUCTIONS_X,
                    this.INSTRUCTION_LINE_HEIGHT*i + this.INSTRUCTIONS_Y,
                    this.INSTRUCTION_TEXT_SIZE,this.TYPEFACE,'center');
            }
        } else {
            this.renderText(this.instructionText,this.INSTRUCTIONS_X,
                this.INSTRUCTIONS_Y,this.INSTRUCTION_TEXT_SIZE,this.TYPEFACE,
                'center');
        }
    }
    if (this.levelText){
        this.renderText(this.levelText,this.LEVEL_X,this.LEVEL_Y,
            this.LEVEL_TEXT_SIZE,this.TYPEFACE,'left');
    }
    if (this.livesText){
        this.renderText(this.livesText,this.LIVES_X,this.LIVES_Y,
            this.LIVES_TEXT_SIZE,this.TYPEFACE,'right');
    }
};
/**
 * Helper method to display text with an outline.
 * @param {string} text The text to be rendered.
 * @param {number} x The x pixel coordinate.
 * @param {number} y The y pixel coordinate.
 * @param {number} textSize The size of the text to be rendered.
 * @param {string} typeface The typeface to be used.
 * @param {string} alignment Left, right or center alignment.
 */
HeadsUp.prototype.renderText = function(text,x,y,textSize,typeface,alignment) {
    ctx.font = textSize + 'pt ' + typeface;
    ctx.textAlign = alignment;
    ctx.fillText(text,x,y,canvas.width);
    ctx.strokeText(text,x,y,canvas.width);
};


/**
 * The Enemy object represents an individual enemy (a bug).
 */
var Enemy = function() {
    /** @type {number} */ this.x;
    /** @type {number} */ this.y;
    /**
     * Speed, in pixels per second
     * @type {number}
     */
    this.speed;
    /** @type {boolean} */ this.hidden;
};
/** @const */ Enemy.prototype.SPRITE = 'images/enemy-bug.png';
/** @const */ Enemy.prototype.PIXEL_ADJUST = -20;
/** @const */ Enemy.prototype.EDGE_ADJUST_RIGHT = 5;
/** @const */ Enemy.prototype.EDGE_ADJUST_LEFT = 36;
/**
 * Initializes an enemym randomly generating its speed based on the provided
 * speed limits.
 * @param {number} x Initial x coordinate.
 * @param {number} y Initial y coordinate.
 * @param {number} lowerSpeedLimit
 * @param {number} upperSpeedLimit
 */
Enemy.prototype.init = function(x, y, lowerSpeedLimit, upperSpeedLimit) {
    this.speed = Math.random()*(upperSpeedLimit-lowerSpeedLimit) + lowerSpeedLimit;
    this.x = x;
    this.y = y + this.PIXEL_ADJUST;
    this.hidden = false;
};
/**
 * Update the enemy's position.
 * @param {number} dt Time elapsed since last update
 * @param {number} now System time at invocation
 */
Enemy.prototype.update = function(dt,now) {
    this.x += this.speed * dt;
};

/** Render the enemy to the screen. */
Enemy.prototype.render = function() {
    if (!this.hidden)
        ctx.drawImage(Resources.get(this.SPRITE), this.x, this.y);
};

/**
 * A system for dealing with the evil bugs! Takes care of initializing the bugs,
 * making sure they're retired at the right time, caching collision times, and
 * recycling the Enemy objects for reuse.
 */
var EnemyHandler = function(){
    /**
     * An array to hold objects that contain an Enemy object that's currently
     * being updated and rendered, and a retire time.
     * @type {Array.<Object.<string, Enemy | number>>}
     */
    this.activeEnemies = [];
    /**
     * An array to hold objects that contain an Enemy object that's being held
     * for later reuse, and its former retire time.
     * @type {Array.<Object.<string, Enemy | number>>}
     */
    this.retiredEnemies = [];
    /**
     * Average time between enemy spawns.
     * @type {number}
     */
    this.spawnInterval;
    /**
     * Amount by which this.timeUntilSpawn will vary when regenerated, in terms
     * of a fraction of this.spawnInterval. (So a variance of 1.0 will result in
     * this.timeUntilSpawn values of zero to 2*this.spawnInterval.)
     * @type {number}
     */
    this.spawnVariance;
    /** @type {number} */ this.timeUntilSpawn = 0;
    /**
     * Whether or not enemies should update
     * @type {boolean}
     */
    this.moveable = true;
    /** @type {boolean} */ this.hidden = false;
    /**
     * An object full of enemies organized by row, and packaged with collision
     * times.
     * @type {Object.<number, Array.<Object.<string, Enemy | Array<number>>>>}
     */
    this.activeEnemiesByRow = {};
    /**
     * Last reported location of the played. Used when a new collision time is
     * required.
     * @type {Object.<string, number>}
     */
    this.potentialCollisionLocation = {
        column: null,
        rowIndex: null
    };
    /**
     * Used to keep a running total of how much time the game is paused, then,
     * when unpaused, used to adjust collision-related and retirement times.
     * @type {number}
     */
    this.timePaused = 0;
    /**
     * X coordinate where an enemy is spawned (just off left of screen)
     * @type {number}
     */
    this.spawnX;
    /**
     * X coordinate where an enemy is retired (just off right of screen)
     * @type {number}
     */
    this.retireX;
};
/** Initializes spawnX and retireX, which require the map to be initialized */
EnemyHandler.prototype.init = function() {
    this.spawnX = map.pixelCoordinatesForBoardCoordinates(0,0).x -
        map.COL_WIDTH_PIXELS;
    this.retireX = map.pixelCoordinatesForBoardCoordinates(map.COLUMN_COUNT-1,0).x +
        map.COL_WIDTH_PIXELS;
};
/**
 * Maximum number of attempts at spawning an enemy until giving up. Remember, an
 * enemy will not spawn when it will overlap with another enemy on screen. If,
 * after this many attempts at randomly generating an enemy, we still don't have
 * an enemy that meets this requirement, spawning is abandoned.
 * @const
 */
EnemyHandler.prototype.MAX_SPAWN_ATTEMPTS = 10;
/**
 * Sets properties and calls methods based on the new game state.
 * @param {number} state The new game state
 */
EnemyHandler.prototype.setState = function(state) {
    switch (state) {
        case game.State.TITLE:
            this.moveable = true;
            this.hidden = false;
            this.setSpeeds(200,500);
            this.setSpawnIntervalAndVariance(0.3,0.5);
            break;
        case game.State.INSTRUCTIONS:
            this.moveable = true;
            this.hidden = false;
            break;
        case game.State.LEVEL_TITLE:
        case game.State.REINCARNATE:
            this.moveable = true;
            this.hidden = false;
            break;
        case game.State.PLAY:
            this.moveable = true;
            this.hidden = false;
            break;
        case game.State.PAUSED:
            this.moveable = false;
            this.hidden = true;
            break;
        case game.State.DIED   :
            this.moveable = false;
            this.hidden = false;
            break;
    }
};
/**
 * @param {number} spawnInterval New spawn interval.
 * @param {number} spawnVariance New spawn variance.
 */
EnemyHandler.prototype.setSpawnIntervalAndVariance = function(spawnInterval,
    spawnVariance) {
    if (this.timeUntilSpawn > (this.spawnInterval = spawnInterval) *
        ((this.spawnVariance = spawnVariance) + 1))
        this.newTimeUntilSpawn();
};
/**
 * @param {number} lowerSpeedLimit New lower bound for enemy speed
 * @param {number} upperSpeedLimit New upper bound for enemy speed
 */
EnemyHandler.prototype.setSpeeds = function(lowerSpeedLimit,upperSpeedLimit) {
    this.lowerSpeedLimit = lowerSpeedLimit;
    this.upperSpeedLimit = upperSpeedLimit;
};
/**
 * Updates all Enemy objects, retires them if required, adds new ones if needed,
 * updates this.timePaused if the game is paused, or adds this.timePaused to all
 * variables that depend on proper time keeping.
 * @param {number} dt Time elapsed since last update
 * @param {number} now System time at invocation
 */
EnemyHandler.prototype.update = function(dt,now) {
    if (this.moveable) {
        //If the game has been paused, add that time onto the active enemies
        if (this.timePaused > 0) {
            this.activeEnemies.forEach(function(enemyObject){
                enemyObject.retireTime += this.timePaused;
            }, this);
            map.roadRowNumbers.forEach(function(i){
                var rowIndex = map.pixelCoordinatesForBoardCoordinates(0,i).y +
                    Enemy.prototype.PIXEL_ADJUST;
                if (this.activeEnemiesByRow[rowIndex] !== undefined) {
                    this.activeEnemiesByRow[rowIndex].forEach(function(enemyObject){
                        for (var i = enemyObject.entryTimes.length - 1; i >= 0; i--) {
                            enemyObject.entryTimes[i] += this.timePaused;
                        }
                        for (var i = enemyObject.exitTimes.length - 1; i >= 0; i--) {
                            enemyObject.exitTimes[i] += this.timePaused;
                        }
                    }, this);
                }
            }, this);
            player.addPauseTimeToCollision(this.timePaused);
            this.timePaused = 0;

        }
        var retiredEnemy;
        while (this.activeEnemies.length > 0 &&
            now >= this.activeEnemies[0].retireTime) {
            //This will result in some enemies that are not retired immediately 
            //when they leave the visible area, but it avoids the overhead of 
            //constantly sorting the enemy objects within this.activeEnemies
            retiredEnemy = this.activeEnemies.splice(0,1)[0];
            this.retiredEnemies.push(retiredEnemy);
            this.activeEnemiesByRow[retiredEnemy.enemy.y].splice(0,1);
        }
        for (var i = this.activeEnemies.length - 1; i >= 0; i--) {
            this.activeEnemies[i].enemy.update(dt,now);
        }
        if ( (this.timeUntilSpawn -= dt) <= 0 ) {
            this.spawnNewEnemy();
        }
    } else {
        this.timePaused += dt;
    }
};
/**
 * If a retired enemy is available, returns that enemy. Otherwise, creates a new
 * enemy and returns that. Either way, the enemy returned is packaged in an
 * object along with its retireTime.
 * @return {Object.<string, Enemy | number>}
 */
EnemyHandler.prototype.getNewEnemy = function() {
    var newEnemy;
    if (!(newEnemy = this.retiredEnemies.pop()))
        newEnemy = {
            enemy: new Enemy(),
            retireTime: null
        };
    var yCoordinate = map.randomRoadYCoordinate();
    newEnemy.enemy.init(this.spawnX, yCoordinate, this.lowerSpeedLimit,
        this.upperSpeedLimit);
    return newEnemy;
};
/**
 * Takes a limited number of attempts at spawning a new enemy. This method uses
 * this.getNewEnemy() to either create a new enemy, or recycle an old one. If
 * successful, the new enemy is stored in this.activeEnemies and
 * this.activeEnemiesByRow. If not, it's put into this.retiredEnemies. This
 * method also tells the player when it will get hit, so as to avoid any taxing
 * collision detection algorithms.
 * @param {number} attemptIndex An attempt counter. This is used to make sure
 *     the spawnNewEnemy() method is not called too many times recursively.
 *     Note: This argument is not required! Yay!
 */
EnemyHandler.prototype.spawnNewEnemy = function(attemptIndex) {
    if((attemptIndex = attemptIndex || 0) < this.MAX_SPAWN_ATTEMPTS) {
        var enemyObjectWithRetireTime = this.getNewEnemy();
        var nakedEnemy = enemyObjectWithRetireTime.enemy;
        var enemyObjectWithEntryAndExitTimes =
            this.packageEnemyWithEntryAndExitTimes(nakedEnemy);
        var entryTimes = enemyObjectWithEntryAndExitTimes.entryTimes;
        var rowIndex = nakedEnemy.y;
        var retireTime = entryTimes[map.COLUMN_COUNT+1];
        var rowOfEnemies = this.activeEnemiesByRow[rowIndex];
        if (rowOfEnemies === undefined) {
            rowOfEnemies = [];
            this.activeEnemiesByRow[rowIndex] = rowOfEnemies;
        }
    
        if (rowOfEnemies.length > 0){
            var leftMostEnemyEntryTimes =
                rowOfEnemies[rowOfEnemies.length-1].entryTimes;
            var leftMostEnemyInRowExitCompletion =
                leftMostEnemyEntryTimes[map.COLUMN_COUNT+1];
            var newEnemyExitBegin = entryTimes[map.COLUMN_COUNT];
            if (newEnemyExitBegin < leftMostEnemyInRowExitCompletion) {
                this.retiredEnemies.push(enemyObjectWithRetireTime);
                this.spawnNewEnemy(attemptIndex+1);
                return;
            }
            var leftMostEnemyInRowSecondColumnEntry = leftMostEnemyEntryTimes[1];
            var newEnemyFirstColumnEntry = entryTimes[0];
            if (newEnemyFirstColumnEntry < leftMostEnemyInRowSecondColumnEntry) {
                this.retiredEnemies.push(enemyObjectWithRetireTime);
                this.spawnNewEnemy(attemptIndex+1);
                return;
            }
        }
        if (this.potentialCollisionLocation.rowIndex === rowIndex)
            player.newEnemyInRow(entryTimes[this.potentialCollisionLocation.column]);
    
    
        //Push new enemy onto the appropriate row. Order here is guaranteed already.
        this.activeEnemiesByRow[rowIndex].push(enemyObjectWithEntryAndExitTimes);
    
        enemyObjectWithRetireTime.retireTime = retireTime;
        this.activeEnemies.push(enemyObjectWithRetireTime);
    }
    this.newTimeUntilSpawn();
};
/** Randomly generates a new timeUntilSpawn */
EnemyHandler.prototype.newTimeUntilSpawn = function() {
    this.timeUntilSpawn = this.spawnInterval * (this.spawnVariance *
        (2 * Math.random() - 1) + 1);
};
/**
 * Puts the Enemy object inside another object with entry and exit times.
 * @param {Enemy} enemy The enemy object
 * @return {Object.<string, Enemy | Array.<number>>}
 */
EnemyHandler.prototype.packageEnemyWithEntryAndExitTimes = function(enemy) {
    var entryTimes = [];
    var exitTimes = [];
    var secondsPerColumn = map.COL_WIDTH_PIXELS / enemy.speed;
    var secondsPerEntryEdgeAdjustWidth =
        (enemy.EDGE_ADJUST_RIGHT + player.EDGE_ADJUST_LEFT) / enemy.speed;
    var secondsPerExitEdgeAdjustWidth =
        (enemy.EDGE_ADJUST_LEFT + player.EDGE_ADJUST_RIGHT) / enemy.speed; 
    var now = Date.now() / 1000;
    for (var col = map.COLUMN_COUNT + 1; col >= 0; col--) {
        entryTimes.splice(0, 0,
            col * secondsPerColumn + secondsPerEntryEdgeAdjustWidth + now);
        exitTimes.splice(0, 0, 
            (col+2) * secondsPerColumn - secondsPerExitEdgeAdjustWidth + now);
    };
    return {
        enemy: enemy,
        entryTimes: entryTimes,
        exitTimes: exitTimes
    };
};
/**
 * Detects either an immediate or future collision. If there is an immediate
 * collision, player.die() is called.
 * @param {number} x Column number.
 * @param {number} y Row number.
 * @return {number | undefined} The upcoming collision time, or if there isn't
 *     one, undefined.
 */
EnemyHandler.prototype.collisionTimeForCoordinates = function(x,y) {
    if(x === undefined) {
        this.potentialCollisionLocation.column = null;
        this.potentialCollisionLocation.rowIndex = null;
        return null;
    }
    var rowIndex = map.pixelCoordinatesForBoardCoordinates(x,y).y + 
        Enemy.prototype.PIXEL_ADJUST;

    this.potentialCollisionLocation.column = x;
    this.potentialCollisionLocation.rowIndex = rowIndex;

    var rowOfEnemies = this.activeEnemiesByRow[rowIndex];
    if (rowOfEnemies === undefined)
        return;
    
    var enemyObject;
    var columnEntry; 
    var columnExit;
    var now = Date.now() / 1000;

    for (var i = 0; i < rowOfEnemies.length; i++) {
        enemyObject = rowOfEnemies[i];
        columnEntry = enemyObject.entryTimes[x];
        columnExit = enemyObject.exitTimes[x];
        if (columnEntry > now){
            return columnEntry;
        } else if (columnExit > now) {
            player.die();
            return;
        }
    }
    return;
};
/** Renders all active enemies */
EnemyHandler.prototype.render = function() {
    if (!this.hidden) {
        this.activeEnemies.forEach(function(enemyObject){
            enemyObject.enemy.render();
        });
    }
};

/**
 * The Player object represents the player on the screen and handles input that
 * controls the player's movement.
 * @constructor
 */
var Player = function() {
    /** @type {number} */ this.row = 4;
    /** @type {number} */ this.column = 1;
    /** @type {number} */ this.hidden = false;
    /** @type {number} */ this.moveable = false;
    /** @type {number} */ this.collisionDetectionOn = false;
    /**
     * Time of upcoming collision.
     * @type {number}
     */
    this.collisionTime;
    
};
/** @const */ Player.prototype.SPRITE = 'images/char-boy.png';
/** @const */ Player.prototype.PIXEL_ADJUST = -15;
/** @const */ Player.prototype.EDGE_ADJUST_RIGHT = 29;
/** @const */ Player.prototype.EDGE_ADJUST_LEFT = 30;
/** Initializes player object */
Player.prototype.init = function() {
    this.setPosition(this.column, this.row);
};
/**
 * Sets properties and calls methods on player when new game state is set.
 * @param {number} state New game state.
 */
Player.prototype.setState = function(state) {
    switch (state) {
        case game.State.TITLE:
            this.hidden = false;
            this.moveable = false;
            this.setPosition((map.COLUMN_COUNT-1)/2,map.ROWS_COUNT-1);
            this.collisionDetectionOn = false;
            break;
        case game.State.INSTRUCTIONS:
        case game.State.LEVEL_TITLE:
        case game.State.REINCARNATE:
            this.hidden = false;
            this.moveable = false;
            this.setPosition((map.COLUMN_COUNT-1)/2,map.ROWS_COUNT-1);
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
        case game.State.DIED   :
            this.collisionDetectionOn = false;
            this.hidden = false;
            this.moveable = false;
        case game.State.WIN_LEVEL:
            this.collisionDetectionOn = false;
            this.moveable = false;
            this.hidden = false;
    }
};
/**
 * Detects a collision, if collision detection is on.
 * @param {number} dt Time elapsed since last update.
 * @param {number} now System time an invocation.
 */
Player.prototype.update = function(dt,now) {
    if (this.collisionDetectionOn && this.collisionTime &&
        now > this.collisionTime) {
        this.die();
    }
};
/** Render the player */
Player.prototype.render = function() {
    if (!this.hidden)
        ctx.drawImage(Resources.get(this.SPRITE), this.x, this.y);
};
/**
 * Sets the player's position, and updates this.collisionTime.
 * @param {number} x Column number.
 * @param {number} y Row number.
 */
Player.prototype.setPosition = function(x,y) {
    if (x !== undefined)
        this.column = Math.min(Math.max(x,0),map.COLUMN_COUNT-1);
    if (y !== undefined)
        this.row = Math.min(Math.max(y,0),map.ROWS_COUNT-1);
    var coordinates =
        map.pixelCoordinatesForBoardCoordinates(this.column, this.row);
    this.x = coordinates.x;
    this.y = coordinates.y + this.PIXEL_ADJUST;

    switch (map.tileTypes[this.column][this.row]) {
        case map.Tile.STONE:
            this.collisionTime = 
                enemyHandler.collisionTimeForCoordinates(this.column,this.row);
            break;
        case map.Tile.WATER:
            this.die();
        case map.Tile.GRASS:
            this.collisionTime = enemyHandler.collisionTimeForCoordinates();
            break;
    }
};
/**
 * Is called when a new enemy is generated in the row occupied by the player.
 * Used to set a collision time if there isn't already an upcoming collision.
 * @param {number} collisionTime Time of the new collision.
 */
Player.prototype.newEnemyInRow = function(collisionTime) {
    if (!this.collisionTime)
        this.collisionTime = collisionTime;
};
/**
 * Is called when the game is unpaused. Adds timePaused to the collision time.
 * @param {number} timePaused The number of seconds for which the game was paused.
 */
Player.prototype.addPauseTimeToCollision = function(timePaused) {
    if (this.collisionTime)
        this.collisionTime += timePaused;
};
/**
 * Kills the player by setting the game state to .DIED.
 */
Player.prototype.die = function() {
    game.setState(game.State.DIED);
};
/**
 * Handles keyboard input for the movement of the player.
 * @param {string} keyString String representing the direction of movement.
 */
Player.prototype.handleInput = function(keyString) {
    if (this.moveable) {
        switch (keyString) {
            case 'left':
            case 'right':
            case 'up':
            case 'down':    this.move(keyString);   break;
        }
    }
};
/**
 * Moves player in the direction specified by directionString
 * @param {string} directionString String specifying the direction of movement.
 */
Player.prototype.move = function(directionString) {
    var x = this.column, y = this.row;
    switch(directionString) {
        case 'left': x--; break;
        case 'right': x++; break;
        case 'up': y--; break;
        case 'down': y++; break;
    }
    if(map.playerCanMoveHere(x,y))
        this.setPosition(x,y);
};

var map = new Map();
var mapAccessories = new MapAccessories();
var enemyHandler = new EnemyHandler();
var hud = new HeadsUp();
var player = new Player();
var game = new Game();

// Listens for key presses. Sends recognized keys to Game.handleInput()
document.addEventListener('keydown', function(e) {
    var allowedKeys = {
        32: 'space', //spacebar
        37: 'left', //left arrow
        38: 'up', //up arrow
        39: 'right', //right arrow
        40: 'down', //down arrow
        80: 'pause', //P key
    };
    var keyString = allowedKeys[e.keyCode];
    if (keyString !== undefined)
        game.handleInput(keyString);
});
