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
/** @const */ Game.prototype.HIGH_SCORE_COOKIE_KEY = 'highScore';
// /** @const */ Game.prototype.STATE_TITLE = 0;
// /** @const */ Game.prototype.STATE_INSTRUCTIONS = 1;
// /** @const */ Game.prototype.STATE_LEVEL_TITLE = 2;
// /** @const */ Game.prototype.STATE_PLAY = 3;
// /** @const */ Game.prototype.STATE_PAUSED = 4;
// /** @const */ Game.prototype.STATE_GAME_OVER = 5;
// /** @const */ Game.prototype.STATE_DIED = 6;
// /** @const */ Game.prototype.STATE_WIN_LEVEL = 7;
// /** @const */ Game.prototype.STATE_REINCARNATE = 8;
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
        this.highScore = parseInt(cookieString.substring(cookieString.indexOf('=',highScoreKeyIndex) + 1));
    } else {
        this.highScore = 0;
    }

    this.setState(this.State.TITLE);
};
/**
 * Used to set the state of the game. Also passes on the state change to any
 * object that needs it.
 * @param {number} A game state constant.
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
            map.setRows(0,map.WATER_TILE);
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
 * @param {string} String specifying the input from keyboard.
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
 *  @param {number} The new level
 */
Game.prototype.setLevel = function(newLevel) {
    if (--this.distanceToHighScore < 0)
        document.cookie = this.HIGH_SCORE_COOKIE_KEY + '=' + (++this.highScore) + '; expires=' + this.highScoreCookieExpiry;

    this.level = newLevel;

    switch (newLevel) {
        case 1:
            map.setRows(
                0,map.WATER_TILE,
                2,map.STONE_TILE,
                map.GRASS_TILE);
            mapAccessories.leftMostRockPosition = 0;
            mapAccessories.leftMostKeyPosition = 3;
            enemyHandler.setSpeeds(250,300);
            enemyHandler.setSpawnIntervalAndVariance(0.75,0.8);
            break;
        case 2:
            map.setRows(
                1,map.STONE_TILE,
                2,map.GRASS_TILE
            );
            mapAccessories.leftMostRockPosition = 3;
            mapAccessories.leftMostKeyPosition = 2;
            break;
        case 3:
            map.setRows(3,map.STONE_TILE);
            enemyHandler.setSpawnIntervalAndVariance(0.4,0.6);
            enemyHandler.setSpeeds(225,325);
            break;
        case 4:
            map.setRows(4,map.STONE_TILE);
            mapAccessories.leftMostRockPosition = 3;
            enemyHandler.setSpawnIntervalAndVariance(0.25,0.4);
            break;
        case 5:
            map.setRows(
                2,map.STONE_TILE,
                3,map.GRASS_TILE);
            break;
        case 6:
            map.setRows(
                1,map.GRASS_TILE,
                3,map.STONE_TILE
            );
            mapAccessories.leftMostRockPosition = 0;
            break;
        case 7:
            map.setRows(
                1,map.STONE_TILE,
                4,map.GRASS_TILE
            );
            mapAccessories.leftMostKeyPosition = 3;
            break;
        case 8:
            map.setRows(4,map.STONE_TILE);
            break;
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
    this.tileTypes = []; //2D array of tile-types
    this.tileCoordinates = []; //2D array of tile coordinates, for speedy access!
    this.roadRowNumbers = []; //Array of row indices where road is found
    this.pendingTileChanges = { //Object that stores tiles that will be changed via animation
        status: null, //Status (constants defined below)
        changes: [] //Objects containing change information
    };
};
/** @const */ Map.prototype.ROWS_COUNT = 6;
/** @const */ Map.prototype.COLUMN_COUNT = 5;
/** @const */ Map.prototype.ROW_HEIGHT_PIXELS = 83;
/** @const */ Map.prototype.COL_WIDTH_PIXELS = 101;
/** @const */ Map.prototype.WATER_TILE = 0; // \
/** @const */ Map.prototype.STONE_TILE = 1; // |--Corresponds with image array indices
/** @const */ Map.prototype.GRASS_TILE = 2; // /
/** @const */ Map.prototype.IMAGE_URL_ARRAY = ['images/water-block.png','images/stone-block.png','images/grass-block.png'];
/** @const */ Map.prototype.PENDING_CONTAINS_NEW_CHANGES = 0;
/** @const */ Map.prototype.PENDING_READY = 1;
/** @const */ Map.prototype.PENDING_EMPTY = 2;
/* Initialize top row to water, the rest to grass */
Map.prototype.init = function() {
    var row, col;
    var rowTypes = [];
    for (row = 0; row < this.ROWS_COUNT; row++) {
        if (row === 0)
            rowTypes.push(this.WATER_TILE);
        else
            rowTypes.push(this.GRASS_TILE);
    }
    for (col = 0; col < this.COLUMN_COUNT; col++) { //Initialize tileTypes and tileCoordinates grids
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
    this.pendingTileChanges.status = this.PENDING_EMPTY;
};
Map.prototype.setState = function(state) {
    switch (state) {
        case game.State.TITLE:
            this.setRows(
                0,map.WATER_TILE,
                [1,2,3,4],map.STONE_TILE,
                map.GRASS_TILE
            );
            break;
    }
};
Map.prototype.pixelCoordinatesForBoardCoordinates = function(colNumber, rowNumber) {
    var newCoordinates = {};
    var coordinates = this.tileCoordinates[colNumber][rowNumber];
    for (var key in coordinates) {
        if (coordinates.hasOwnProperty(key))
            newCoordinates[key] = coordinates[key];
    }
    return newCoordinates;
};
/*Takes an arbitrary number of arguments. Each pair is either:
    - a row number and tile type, or
    - an array of row numbers and a tile type
  If there is an odd number of arguments, the final one is a tile type,
  and all remaining rows are set to that type.*/
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
Map.prototype.setRow = function(rowNumber, tileType) {
    if (tileType === this.STONE_TILE) {
        if (this.roadRowNumbers.indexOf(rowNumber) === -1) {
            this.roadRowNumbers.push(rowNumber);
        } else {
            return; //Road is already set up in this row
        }
    } else {
        var rowArrayIndex = this.roadRowNumbers.indexOf(rowNumber);
        if (rowArrayIndex !== -1) { //This row is going from road to something else
            /*enemyHandler.deleteEnemiesInRow(*/this.roadRowNumbers.splice(rowArrayIndex,1);/*[0]);*/
        }
    }
    for (var col = this.COLUMN_COUNT-1; col >= 0; col--) {
        this.setTile(col,rowNumber,tileType);
    }
};
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
Map.prototype.addTileChangeToPending = function(colNumber, rowNumber, tileType) {
    this.pendingTileChanges.changes.push({
        location: {
            column: colNumber,
            row: rowNumber
        },
        tileType: tileType,
        time: Math.random()
    });
    this.pendingTileChanges.status = this.PENDING_CONTAINS_NEW_CHANGES;
};
Map.prototype.update = function(dt,now) {
    var changes;
    switch (this.pendingTileChanges.status) {
        case this.PENDING_EMPTY: break;
        case this.PENDING_CONTAINS_NEW_CHANGES:
            changes = this.pendingTileChanges.changes;
            changes.sort(function(a,b){
                return a.time-b.time;
            });
            //Use the randomly generated values as delta-time, and replace those with total time
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
            this.pendingTileChanges.status = this.PENDING_READY;
        case this.PENDING_READY:
            changes = this.pendingTileChanges.changes;
            var change, location;
            while (changes.length > 0 && now >= changes[0].time) {
                change = changes.splice(0,1)[0];
                location = change.location;
                this.tileTypes[location.column][location.row] = change.tileType;
            }
            if (changes.length === 0)
                this.pendingTileChanges.status = this.PENDING_EMPTY;
    }
};
Map.prototype.randomRoadYCoordinate = function() {
    return this.pixelCoordinatesForBoardCoordinates(0,this.roadRowNumbers[Math.floor(Math.random()*this.roadRowNumbers.length)]).y;
};
Map.prototype.randomRoadBoardLocation = function() {
    return {
        column: Math.floor(Math.random()*map.COLUMN_COUNT),
        row: this.roadRowNumbers[Math.floor(Math.random()*this.roadRowNumbers.length)]
    };
};
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
Map.prototype.playerCanMoveHere = function(x,y) {
    if (mapAccessories.playerCanMoveHere(x,y) && x < this.COLUMN_COUNT && x >= 0 && y < this.ROWS_COUNT && y >= 0){
        if (y === 0 && this.tileTypes[x][y] !== this.WATER_TILE)
            game.setState(game.State.WIN_LEVEL);
        return true;
    }
    return false;
};
Map.prototype.render = function() {
    var coordinates;
    for (var row = 0; row < this.ROWS_COUNT; row++) {
        for (var col = 0; col < this.COLUMN_COUNT; col++) {
            coordinates = this.tileCoordinates[col][row];
            ctx.drawImage(Resources.get(this.IMAGE_URL_ARRAY[this.tileTypes[col][row]]), coordinates.x, coordinates.y);
        };
    };
};

var MapAccessories = function() {
    this.accessories = [];
    this.rockAccessory;
    this.keyAccessory;
    this.heartAccessory;
    this.hidden = true;
    this.leftMostRockPosition = 0;
    this.leftMostKeyPosition = 0;
};
MapAccessories.prototype.KEY = 0;
MapAccessories.prototype.ROCK = 1;
MapAccessories.prototype.HEART = 2;
MapAccessories.prototype.IMAGE_URL_ARRAY = ['images/Key.png','images/Rock.png','images/Heart.png'];
MapAccessories.prototype.ROCK_PIXEL_ADJUST = -25;
MapAccessories.prototype.KEY_PIXEL_ADJUST = -15;
MapAccessories.prototype.PROBABILITY_OF_EXTRA_LIFE = 1/20;
MapAccessories.prototype.placeAccessories = function() {
    if (this.accessories.indexOf(this.rockAccessory) !== -1 && this.accessories.indexOf(this.keyAccessory) !== -1)
        return;
    //Rock
    this.accessories = [];
    var rockLocation = map.randomBoardLocationInRows(0);
    while (rockLocation.column < this.leftMostRockPosition)
        rockLocation = map.randomBoardLocationInRows(0);
    map.setTile(rockLocation.column,rockLocation.row,map.STONE_TILE);
    this.rockAccessory = this.packageAccessory(this.ROCK,rockLocation);
    this.rockAccessory.coordinates.y += this.ROCK_PIXEL_ADJUST;
    //Key
    var keyLocation = map.randomRoadBoardLocation();
    while (keyLocation.column < this.leftMostKeyPosition)
        keyLocation = map.randomRoadBoardLocation();
    this.keyAccessory = this.packageAccessory(this.KEY,keyLocation);
    this.keyAccessory.coordinates.y += this.KEY_PIXEL_ADJUST;
    this.accessories.splice(0,0,this.rockAccessory,this.keyAccessory);
    //Heart
    if (Math.random() <= this.PROBABILITY_OF_EXTRA_LIFE) {
        var heartLocation = map.randomRoadBoardLocation();
        while (heartLocation.column === keyLocation.column && heartLocation.row === keyLocation.row)
            heartLocation = map.randomRoadBoardLocation();
        this.heartAccessory = this.packageAccessory(this.HEART,heartLocation);
        this.accessories.push(this.heartAccessory);
    }
};
MapAccessories.prototype.packageAccessory = function(type,location) {
    return {
        accessoryType: type,
        location: location,
        coordinates: map.pixelCoordinatesForBoardCoordinates(location.column,location.row)
    };
};
MapAccessories.prototype.playerCanMoveHere = function(x,y) {
    //Rock
    if (this.accessories.indexOf(this.rockAccessory) !== -1 && this.rockAccessory.location.column === x && this.rockAccessory.location.row === y)
        return false;
    //Heart
    else if (this.heartAccessory && this.heartAccessory.location.column === x && this.heartAccessory.location.row === y) {
        this.accessories.splice(this.accessories.indexOf(this.heartAccessory),1);
        heartAccessory = null;
        game.extraLife();
    }
    //Key
    else if (this.keyAccessory.location.column === x && this.keyAccessory.location.row === y){
        this.accessories.splice(this.accessories.indexOf(this.rockAccessory),1);
        this.accessories.splice(this.accessories.indexOf(this.keyAccessory),1);
    }
    return true;
};
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
MapAccessories.prototype.render = function(URL_) {
    if (!this.hidden)
        this.accessories.forEach(function(accessoryObject){
            ctx.drawImage(Resources.get(this.IMAGE_URL_ARRAY[accessoryObject.accessoryType]),accessoryObject.coordinates.x,accessoryObject.coordinates.y);
        },this);
};
/* Heads up display - lives remaining, level number...*/
var HeadsUp = function() {
    this.levelText; //Bottom left corner
    this.livesText; //Bottom right corner
    this.bigText; //Front and center, for introducing levels, etc.
    this.bigTextSize; //The size of the "big" text for game title, level titles, etc.
    this.instructionText; //Instructions
};
HeadsUp.prototype.GAME_TITLE = 'PHROGGER';
HeadsUp.prototype.GAME_INSTRUCTIONS = [
    'Use arrow keys to get across the road',
    'Don\'t forget to grab the key!',
    'Press P to pause',
    '',
    'When you\'re ready, hit the spacebar'
];
HeadsUp.prototype.levelPrefix = 'LEVEL: ';
HeadsUp.prototype.livesPrefix = 'LIVES: ';
HeadsUp.prototype.TITLE_TEXT_SIZE = 80;
HeadsUp.prototype.PAUSED_TEXT_SIZE = 36;
HeadsUp.prototype.PRE_LEVEL_TEXT_SIZE = 48;
HeadsUp.prototype.LEVEL_TEXT_SIZE = 16;
HeadsUp.prototype.LIVES_TEXT_SIZE = 16;
HeadsUp.prototype.INSTRUCTION_TEXT_SIZE = 20;
HeadsUp.prototype.INSTRUCTION_LINE_HEIGHT = 24;
HeadsUp.prototype.LEVEL_X = 0;
HeadsUp.prototype.LEVEL_Y = (Map.prototype.ROWS_COUNT + 1) * Map.prototype.ROW_HEIGHT_PIXELS + 25;
HeadsUp.prototype.LIVES_X = Map.prototype.COLUMN_COUNT * Map.prototype.COL_WIDTH_PIXELS;
HeadsUp.prototype.LIVES_Y = (Map.prototype.ROWS_COUNT + 1) * Map.prototype.ROW_HEIGHT_PIXELS + 25;
HeadsUp.prototype.TYPEFACE = 'Impact';
HeadsUp.prototype.init = function() {
    //These all need to be set here so we can use canvas.width/height
    this.BIG_TEXT_X = canvas.width/2;
    this.BIG_TEXT_Y = canvas.height/2 - 20;
    this.INSTRUCTIONS_X = canvas.width/2;
    this.INSTRUCTIONS_Y = canvas.height/2 + 20;
};
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
                (game.highScore > 0) ? 'High score: Level ' + game.highScore : ''
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
            this.bigText = winTextArray[Math.floor(Math.random()*winTextArray.length)];
            break;
        case game.State.DIED   :
            var dieTextArray = ['You died','You expired','You perished','Kicked the bucket','Croaked','Bought it','Bought the farm','Checked out early'];
            this.bigText = dieTextArray[Math.floor(Math.random()*dieTextArray.length)];
            break;
        case game.State.GAME_OVER:
            this.bigText = 'Game over';
            if (game.distanceToHighScore < 0 && -game.distanceToHighScore !== game.highScore)
                this.instructionText = ['You beat your high score!','','New high score:','Level ' + game.highScore];
            else if (game.distanceToHighScore < 0)
                this.instructionText = ['You set your first high score!','','High Score: Level ' + game.highScore];
            else if (game.distanceToHighScore === 0 && game.highScore > 0)
                this.instructionText = ['You tied your high score!','','Give it another try!'];
            else
                this.instructionText = ['So sad'];
            this.instructionText.splice(100,0,'','Press spacebar to continue');
            break;
    }
};
HeadsUp.prototype.extraLife = function() {
    this.livesText = this.livesPrefix + game.lives;
};
HeadsUp.prototype.render = function() {
    if (this.bigText){
        this.renderText(this.bigText,this.BIG_TEXT_X,this.BIG_TEXT_Y,this.TITLE_TEXT_SIZE,this.TYPEFACE,'center');
    }
    if (this.instructionText){
        if(this.instructionText.constructor == Array){
            for (var i = this.instructionText.length - 1; i >= 0; i--) {
                this.renderText(this.instructionText[i],this.INSTRUCTIONS_X,this.INSTRUCTION_LINE_HEIGHT*i + this.INSTRUCTIONS_Y,this.INSTRUCTION_TEXT_SIZE,this.TYPEFACE,'center');
            }
        } else {
            this.renderText(this.instructionText,this.INSTRUCTIONS_X,this.INSTRUCTIONS_Y,this.INSTRUCTION_TEXT_SIZE,this.TYPEFACE,'center');
        }
    }
    if (this.levelText){
        this.renderText(this.levelText,this.LEVEL_X,this.LEVEL_Y,this.LEVEL_TEXT_SIZE,this.TYPEFACE,'left');
    }
    if (this.livesText){
        this.renderText(this.livesText,this.LIVES_X,this.LIVES_Y,this.LIVES_TEXT_SIZE,this.TYPEFACE,'right');
    }
};
/* Helper method to display text with an outline */
HeadsUp.prototype.renderText = function(text,x,y,textSize,typeface,alignment) {
    ctx.font = textSize + 'pt ' + typeface;
    ctx.textAlign = alignment;
    ctx.fillText(text,x,y,canvas.width);
    ctx.strokeText(text,x,y,canvas.width);
};


// Enemies our player must avoid
var Enemy = function() {
    this.sprite = 'images/enemy-bug.png'; //The image used for enemies
    this.x; //| X and Y     |
    this.y; //| coordinates |
    this.speed; //Speed, in pixels per second
    this.hidden;
};
Enemy.prototype.PIXEL_ADJUST = -20; //Adjustment in bug's vertical location so it looks like it's on the road
Enemy.prototype.EDGE_ADJUST_RIGHT = 5; //Adjustment in bug's right (leading) side for collision detection
Enemy.prototype.EDGE_ADJUST_LEFT = 36; //Adjustment in bug's left (trailing) side for collision detection
Enemy.prototype.init = function(x, y, lowerSpeedLimit, upperSpeedLimit) {
    this.speed = Math.random() * (upperSpeedLimit - lowerSpeedLimit) + lowerSpeedLimit;
    this.x = x;
    this.y = y + this.PIXEL_ADJUST;
    this.hidden = false;
};
// Update the enemy's position
Enemy.prototype.update = function(dt,now) {
    this.x += this.speed * dt;
};

// Draw the enemy on the screen
Enemy.prototype.render = function() {
    if (!this.hidden)
        ctx.drawImage(Resources.get(this.sprite), this.x, this.y);
};

/* A system for dealing with the evil bugs! */
var EnemyHandler = function(){
    this.activeEnemies = [];    //Array to hold current enemies
    this.retiredEnemies = [];   //Array to hold enemies that made it across, to be recycled
    this.spawnInterval = 1.5; //Average time between enemy spawns
    this.spawnVariance = 0.25; //Variance in time between spawns - fraction of this.spawnInterval
    this.timeUntilSpawn = 1.5; //Time until next spawn (regenerated every spawn)
    this.moveable = true; //Are enemies moving (not when paused, for instance)
    this.hidden = false; //Are enemies visible (not when paused, for instance)
    this.activeEnemiesByRow = {}; // Keys are the Y coordinates for road rows. Values are [{enemy:,entryTimes:[timesPerCol],exitTimes:[timesPerCol]},[etc.]]
    this.potentialCollisionLocation = { //Last reported location of player, used when new a new collision time is required
        column: null,
        rowIndex: null
    };
    this.timePaused = 0; //Used to keep a running total of how much time the game is paused, to adjust retirement, entry and collision times.
};
EnemyHandler.prototype.init = function() {
    this.spawnX = map.pixelCoordinatesForBoardCoordinates(0,0).x - map.COL_WIDTH_PIXELS;
    this.retireX = map.pixelCoordinatesForBoardCoordinates(map.COLUMN_COUNT-1,0).x + map.COL_WIDTH_PIXELS;
};
EnemyHandler.prototype.maxSpawnAttempts = 10;
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
EnemyHandler.prototype.setSpawnIntervalAndVariance = function(spawnInterval,spawnVariance) {
    if (this.timeUntilSpawn > (this.spawnInterval = spawnInterval) * ((this.spawnVariance = spawnVariance) + 1))
        this.newTimeUntilSpawn();
};
EnemyHandler.prototype.setSpeeds = function(lowerSpeedLimit,upperSpeedLimit,changeActiveEnemies) {
    this.lowerSpeedLimit = lowerSpeedLimit;
    this.upperSpeedLimit = upperSpeedLimit;
    if(changeActiveEnemies) {
        this.activeEnemies.forEach(function(enemyObject){
            if (enemyObject.enemy.speed < lowerSpeedLimit || enemyObject.enemy.speed > upperSpeedLimit)
                enemyObject.enemy.speed = Math.random() * upperSpeedLimit + lowerSpeedLimit;
        });
    }
};
EnemyHandler.prototype.update = function(dt,now) {
    if (this.moveable) {
        if (this.timePaused > 0) { //If the game has been paused, add that time onto the active enemies
            this.activeEnemies.forEach(function(enemyObject){
                enemyObject.retireTime += this.timePaused;
            }, this);
            map.roadRowNumbers.forEach(function(i){
                var rowIndex = map.pixelCoordinatesForBoardCoordinates(0,i).y + Enemy.prototype.PIXEL_ADJUST;
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
        while (this.activeEnemies.length > 0 && now >= this.activeEnemies[0].retireTime) {
            //This will result in some enemies that are not retired immediately when they leave the visible area,
            //but it avoids the overhead of sorting the enemy objects within this.activeEnemies
            retiredEnemy = this.activeEnemies.splice(0,1)[0];
            this.retiredEnemies.push(retiredEnemy);
            this.activeEnemiesByRow[retiredEnemy.enemy.y].splice(0,1);
        }
        for (var i = this.activeEnemies.length - 1; i >= 0; i--) {
            this.activeEnemies[i].enemy.update(dt,now);
        }
        if ( (this.timeUntilSpawn -= dt) <= 0 ) { //Spawn a new enemy if the time is right
            this.spawnNewEnemy();
        }
    } else {
        this.timePaused += dt;
    }
};
EnemyHandler.prototype.getNewEnemy = function() {
    var newEnemy;
    if (!(newEnemy = this.retiredEnemies.pop()))
        newEnemy = {
            enemy: new Enemy(),
            retireTime: null
        };
    var yCoordinate = map.randomRoadYCoordinate();
    newEnemy.enemy.init(this.spawnX, yCoordinate, this.lowerSpeedLimit, this.upperSpeedLimit);
    return newEnemy;
};
EnemyHandler.prototype.spawnNewEnemy = function(attemptIndex) {
    if((attemptIndex = attemptIndex || 0) < this.maxSpawnAttempts) {
        var enemyObjectWithRetireTime = this.getNewEnemy();
        var nakedEnemy = enemyObjectWithRetireTime.enemy;
        var enemyObjectWithEntryAndExitTimes = this.packageEnemyWithEntryAndExitTimes(nakedEnemy);
        var entryTimes = enemyObjectWithEntryAndExitTimes.entryTimes;
        var rowIndex = nakedEnemy.y;
        var retireTime = entryTimes[map.COLUMN_COUNT+1];
        var rowOfEnemies = this.activeEnemiesByRow[rowIndex];
        if (rowOfEnemies === undefined) {
            rowOfEnemies = [];
            this.activeEnemiesByRow[rowIndex] = rowOfEnemies;
        }
    
        if (rowOfEnemies.length > 0){
            var leftMostEnemyEntryTimes = rowOfEnemies[rowOfEnemies.length-1].entryTimes;
            var leftMostEnemyInRowExitCompletion = leftMostEnemyEntryTimes[map.COLUMN_COUNT+1];
            var newEnemyExitBegin = entryTimes[map.COLUMN_COUNT];
            if (newEnemyExitBegin < leftMostEnemyInRowExitCompletion) {
                this.spawnNewEnemy(attemptIndex+1);
                return;
            }
            var leftMostEnemyInRowSecondColumnEntry = leftMostEnemyEntryTimes[1];
            var newEnemyFirstColumnEntry = entryTimes[0];
            if (newEnemyFirstColumnEntry < leftMostEnemyInRowSecondColumnEntry) {
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
EnemyHandler.prototype.newTimeUntilSpawn = function() {
    this.timeUntilSpawn = this.spawnInterval * (this.spawnVariance * (2 * Math.random() - 1) + 1);
};
EnemyHandler.prototype.packageEnemyWithEntryAndExitTimes = function(enemy) {
    var entryTimes = [];
    var exitTimes = [];
    var secondsPerColumn = map.COL_WIDTH_PIXELS / enemy.speed;
    var secondsPerEntryEdgeAdjustWidth = (enemy.EDGE_ADJUST_RIGHT + player.EDGE_ADJUST_LEFT) / enemy.speed;
    var secondsPerExitEdgeAdjustWidth = (enemy.EDGE_ADJUST_LEFT + player.EDGE_ADJUST_RIGHT) / enemy.speed; 
    var now = Date.now() / 1000;
    for (var col = map.COLUMN_COUNT + 1; col >= 0; col--) {
        entryTimes.splice(0, 0, col * secondsPerColumn + secondsPerEntryEdgeAdjustWidth + now);
        exitTimes.splice(0, 0, (col+2) * secondsPerColumn - secondsPerExitEdgeAdjustWidth + now);
    };
    return {
        enemy: enemy,
        entryTimes: entryTimes,
        exitTimes: exitTimes
    };
};
EnemyHandler.prototype.collisionTimeForCoordinates = function(x,y) {
    if(x === undefined) {
        this.potentialCollisionLocation.column = null;
        this.potentialCollisionLocation.rowIndex = null;
        return null;
    }
    var rowIndex = map.pixelCoordinatesForBoardCoordinates(x,y).y + Enemy.prototype.PIXEL_ADJUST;

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
EnemyHandler.prototype.render = function() {
    if (!this.hidden) {
        this.activeEnemies.forEach(function(enemyObject){
            enemyObject.enemy.render();
        });
    }
};

// The player
var Player = function() {
    this.sprite = 'images/char-boy.png';
    this.row = 4;
    this.column = 1;
    this.hidden = false;
    this.moveable = false;
    this.collisionTime; //First possible collision time for current board location
    this.collisionDetectionOn = false;
};
Player.prototype.PIXEL_ADJUST = -15; //Adjustment in player's vertical location so it appears to be on the tile
Player.prototype.EDGE_ADJUST_RIGHT = 29; //Adjustment in player's right side for collision detection
Player.prototype.EDGE_ADJUST_LEFT = 30; //Adjustment in player's left side for collision detection
Player.prototype.init = function() {
    this.setPosition(this.column, this.row);
};
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
// Update the player's position
Player.prototype.update = function(dt,now) {
    if (this.collisionDetectionOn && this.collisionTime && now > this.collisionTime) {
        this.die();
    }
};
// Draw the player on the screen
Player.prototype.render = function() {
    if (!this.hidden)
        ctx.drawImage(Resources.get(this.sprite), this.x, this.y);
};
Player.prototype.setPosition = function(x,y) {
    if (x !== undefined)
        this.column = Math.min(Math.max(x,0),map.COLUMN_COUNT-1);
    if (y !== undefined)
        this.row = Math.min(Math.max(y,0),map.ROWS_COUNT-1);
    var coordinates = map.pixelCoordinatesForBoardCoordinates(this.column, this.row);
    this.x = coordinates.x;
    this.y = coordinates.y + this.PIXEL_ADJUST;

    switch (map.tileTypes[this.column][this.row]) {
        case map.STONE_TILE:
            this.collisionTime = enemyHandler.collisionTimeForCoordinates(this.column,this.row);
            break;
        case map.WATER_TILE:
            this.die();
        case map.GRASS_TILE:
            this.collisionTime = enemyHandler.collisionTimeForCoordinates();
            break;
    }
};
Player.prototype.newEnemyInRow = function(collisionTime) {
    if (!this.collisionTime)
        this.collisionTime = collisionTime;
};
Player.prototype.addPauseTimeToCollision = function(timePaused) {
    if (this.collisionTime)
        this.collisionTime += timePaused;
};
Player.prototype.die = function() {
    game.setState(game.State.DIED);
};
// Handle keyboard input for the movement of the player
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
//Handle player movement
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
var game = new Game(); //Game object - keeps track of game state, deals with settings for levels, etc.
// game.init();

/* Listens for key presses. Sends recognized keys to Game.handleInput() */
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
