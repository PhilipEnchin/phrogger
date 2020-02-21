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

import Board from './classes/Board';
import Enemy from './classes/Enemy';
import HeadsUp from './classes/HeadsUp';
import Player from './classes/Player';
import Resources from './resources';

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
  DIED: 6, //Player just died (next state will be REINCARNATE or GAME_OVER)
  WIN_LEVEL: 7, //Player has just passed level
  REINCARNATE: 8 //Like LEVEL_TITLE, but with small differences
};

/**
 * Initializes the objects that need initializing, and initiates the game.
 */
Game.prototype.init = function() {
  const {
    ROWS_COUNT, COLUMN_COUNT, ROW_HEIGHT_PIXELS, COL_WIDTH_PIXELS,
  } = Board;
  board.init(this, mapAccessories);
  enemyHandler.init();
  player.init(this, board, enemyHandler);
  hud.init(this, ROWS_COUNT, ROW_HEIGHT_PIXELS, COLUMN_COUNT, COL_WIDTH_PIXELS);

  //Initialize high score cookie expiry (15 years off, rather permanent)
  var expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 15);
  this.highScoreCookieExpiry = expiry.toUTCString();

  //Read cookie and store current high score
  var cookieString = document.cookie;
  var highScoreKeyIndex = cookieString.indexOf(this.HIGH_SCORE_COOKIE_KEY);
  if (highScoreKeyIndex >= 0) {//High score exists already
    var highScoreValueIndex = cookieString.indexOf('=',highScoreKeyIndex)+1;
    this.highScore = parseInt(cookieString.substring(highScoreValueIndex));
  } else { //High score doesn't yet exist, initialize at zero
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
  board.setState(state);
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
      board.setRows(0,board.Tile.WATER);
      this.setLevel(this.level+1);
      break;
    case this.State.DIED:
      this.timeRemaining = 1.0;
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
  //Update high score related variables (and the high score cookie) as needed
  if (--this.distanceToHighScore < 0)
    document.cookie = this.HIGH_SCORE_COOKIE_KEY + '=' + (++this.highScore) +
      '; expires=' + this.highScoreCookieExpiry;

  this.level = newLevel;

  //Set game parameters per level
  switch (newLevel) {
    case 1:
      board.setRows(
        0,board.Tile.WATER,
        2,board.Tile.STONE,
        board.Tile.GRASS);
      mapAccessories.leftMostRockPosition = 0;
      mapAccessories.leftMostKeyPosition = 3;
      enemyHandler.setSpeeds(250,300);
      enemyHandler.setSpawnIntervalAndVariance(0.75,0.8);
      break;
    case 2:
      board.setRows(
        1,board.Tile.STONE,
        2,board.Tile.GRASS
      );
      mapAccessories.leftMostRockPosition = 3;
      mapAccessories.leftMostKeyPosition = 2;
      break;
    case 3:
      board.setRows(3,board.Tile.STONE);
      enemyHandler.setSpawnIntervalAndVariance(0.4,0.6);
      enemyHandler.setSpeeds(225,325);
      break;
    case 4:
      board.setRows(4,board.Tile.STONE);
      mapAccessories.leftMostRockPosition = 3;
      enemyHandler.setSpawnIntervalAndVariance(0.35,0.4);
      break;
    case 5:
      board.setRows(
        2,board.Tile.STONE,
        3,board.Tile.GRASS);
      break;
    case 6:
      board.setRows(
        1,board.Tile.GRASS,
        3,board.Tile.STONE
      );
      mapAccessories.leftMostRockPosition = 0;
      enemyHandler.setSpawnIntervalAndVariance(0.4,0.4);
      break;
    case 7:
      board.setRows(
        1,board.Tile.STONE,
        4,board.Tile.GRASS
      );
      mapAccessories.leftMostRockPosition = 2
      mapAccessories.leftMostKeyPosition = 3;
      break;
    case 8:
      board.setRows(4,board.Tile.STONE);
      break;
    default: //Level 9 and onward, make the game just a little faster
      enemyHandler.setSpawnIntervalAndVariance(
      enemyHandler.spawnInterval * 0.98, enemyHandler.spawnVariance * 0.99);
      enemyHandler.setSpeeds(
        enemyHandler.lowerSpeedLimit * 1.04,
        enemyHandler.upperSpeedLimit * 1.06
      );
      //Move leftmost key and rock positions left (more difficult)
      if (newLevel === 12) mapAccessories.leftMostKeyPosition = 2;
      else if (newLevel === 15) mapAccessories.leftMostKeyPosition = 1;
      else if (newLevel === 18) mapAccessories.leftMostRockPosition = 1;
  }
};

/**
 * Decreases the number of lives and initiates the next state, depending on the
 * number of lives remaining.
 */
Game.prototype.died = function() {
  if(--this.lives >= 0) //At least one more life available
    this.setState(this.State.REINCARNATE);
  else //No more lives, game over.
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
 * Decrements the timer and takes the appropriate action if the timer runs out.
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
  board.update(dt,now);

  if (this.timeRemaining > 0) //If timer is active...
    this.decrementTimer(dt);
};

/**
 * Begins the rendering sequence by clearing the screen, then calling render()
 * methods in other objects.
 */
Game.prototype.render = function() {
  ctx.clearRect(0,0,canvas.width,canvas.height); //Clear background
  board.render(); //Render map
  mapAccessories.render(); //Render map accessores (rock, key, heart)
  player.render(); //Render player
  enemyHandler.render(); //Render all enemies
  hud.render(); //Render all text
};







/**
 * The MapAccessories class deals with objects that can be placed on the map at
 * the beginning of a level. The possible objects are a rock, a key, and a heart.
 * @constructor
 */
var MapAccessories = function() {
  /**
   * An array of all active accessories
   * @type {Array.<Object<string, number | Object.<string, Object.<string, number>>>>}
   */
  this.accessories = [];
  /** @type {Object.<string, number | Object<string, Object<string, number>>>} */
  this.rockAccessory;
  /** @type {Object.<string, number | Object<string, Object<string, number>>>} */
  this.keyAccessory;
  /** @type {Object.<string, number | Object<string, Object<string, number>>>} */
  this.heartAccessory;
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
  //If rock and key are already placed, don't place them again!
  if (this.accessories.indexOf(this.rockAccessory) !== -1 &&
    this.accessories.indexOf(this.keyAccessory) !== -1)
    return;
  //Rock...
  this.accessories = [];
  var rockLocation = board.randomBoardLocationInRows(0);
  while (rockLocation.column < this.leftMostRockPosition)
    rockLocation = board.randomBoardLocationInRows(0);
  board.setTile(rockLocation.column,rockLocation.row,board.Tile.STONE);
  this.rockAccessory = this.packageAccessory(this.Type.ROCK,rockLocation);
  this.rockAccessory.coordinates.y += this.ROCK_PIXEL_ADJUST;
  //Key...
  var keyLocation = board.randomRoadBoardLocation();
  while (keyLocation.column < this.leftMostKeyPosition)
    keyLocation = board.randomRoadBoardLocation();
  this.keyAccessory = this.packageAccessory(this.Type.KEY,keyLocation);
  this.keyAccessory.coordinates.y += this.KEY_PIXEL_ADJUST;

  //Add rock and key to accessories array
  this.accessories.splice(0,0,this.rockAccessory,this.keyAccessory);

  //Heart...
  if (Math.random() <= this.PROBABILITY_OF_EXTRA_LIFE) {
    var heartLocation = board.randomRoadBoardLocation();
    while (heartLocation.column === keyLocation.column &&
      heartLocation.row === keyLocation.row)
      heartLocation = board.randomRoadBoardLocation();
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
    accessoryType: type, //Accessory type
    location: location, //Board location
    coordinates: //Pixel coordinates
      board.pixelCoordinatesForBoardCoordinates(location.column,location.row)
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
  //Player can't occupy the same space as the rock
  if (this.accessories.indexOf(this.rockAccessory) !== -1 &&
    this.rockAccessory.location.column === x &&
    this.rockAccessory.location.row === y)
    return false; //Move is illegal
  //Player can collect heart for an extra life, then it disappears
  else if (this.heartAccessory && this.heartAccessory.location.column === x &&
    this.heartAccessory.location.row === y) {
    this.accessories.splice(this.accessories.indexOf(this.heartAccessory),1);
    this.heartAccessory = null;
    game.extraLife();
  }
  //Player can collect key to make rock go away, then it disappears
  else if (this.accessories.indexOf(this.keyAccessory) >= 0 && this.keyAccessory.location.column === x &&
    this.keyAccessory.location.row === y) {
    this.accessories.splice(this.accessories.indexOf(this.rockAccessory),1);
    this.accessories.splice(this.accessories.indexOf(this.keyAccessory),1);
  }
  return true; //Move is legal
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
  this.spawnX = board.pixelCoordinatesForBoardCoordinates(0,0).x -
    Board.COL_WIDTH_PIXELS;
  this.retireX = board.pixelCoordinatesForBoardCoordinates(Board.COLUMN_COUNT-1,0).x +
    Board.COL_WIDTH_PIXELS;
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
  //If the next spawn is so far away that it doesn't fit into the new
  //parameters, generate it again.
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
      //Add paused time to retire time
      this.activeEnemies.forEach(function(enemyObject){
        enemyObject.retireTime += this.timePaused;
      }, this);
      //Add paused time to tile entries and exits (for collisions)
      board.roadRowNumbers.forEach(function(i){
        var rowIndex = board.pixelCoordinatesForBoardCoordinates(0,i).y +
          Enemy.PIXEL_ADJUST;
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
      //Add paused time to current upcoming collision
      player.addPauseTimeToCollision(this.timePaused);
      this.timePaused = 0; //Reset paused time to zero

    }
    var retiredEnemy;
    /* This loop will result in some enemies that aren't retired immediately
       as they move offscreen, in the case of an enemy that was generated
       later, but reached the right side of the screen first, but doing it
       this way avoids the overhead of sorting the enemies in by retire time
       every time a new enemy is generated*/
    while (this.activeEnemies.length > 0 &&
      now >= this.activeEnemies[0].retireTime) {
      retiredEnemy = this.activeEnemies.splice(0,1)[0];
      this.retiredEnemies.push(retiredEnemy);
      this.activeEnemiesByRow[retiredEnemy.enemy.y].splice(0,1);
    }

    //Update remaining active enemies
    for (var i = this.activeEnemies.length - 1; i >= 0; i--) {
      this.activeEnemies[i].enemy.update(dt);
    }

    //Spawn a new enemy if the time until spawn has reached zero.
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
  var yCoordinate = board.randomRoadYCoordinate();
  newEnemy.enemy.init(this.spawnX, yCoordinate, this.lowerSpeedLimit,
    this.upperSpeedLimit); //Initialize (or reinitialize) enemy
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
  //Quick check to make sure we haven't attempted this spawn too many times
  if((attemptIndex = attemptIndex || 0) < this.MAX_SPAWN_ATTEMPTS) {
    var enemyObjectWithRetireTime = this.getNewEnemy();
    var nakedEnemy = enemyObjectWithRetireTime.enemy; //Unpackaged Enemy
    var enemyObjectWithEntryAndExitTimes =
      this.packageEnemyWithEntryAndExitTimes(nakedEnemy);
    var entryTimes = enemyObjectWithEntryAndExitTimes.entryTimes;
    var rowIndex = nakedEnemy.y; //For activeEnemiesByRow...
    var retireTime = entryTimes[Board.COLUMN_COUNT+1];
    var rowOfEnemies = this.activeEnemiesByRow[rowIndex];

    //Creates the row if this is the first enemy in that row.
    if (rowOfEnemies === undefined) {
      rowOfEnemies = [];
      this.activeEnemiesByRow[rowIndex] = rowOfEnemies;
    }

    //If this is not the only active enemy in this row, we need to make sure
    //it won't overlap another enemy.
    if (rowOfEnemies.length > 0){
      //Entry times for leftmost enemy in row
      var leftMostEnemyEntryTimes =
        rowOfEnemies[rowOfEnemies.length-1].entryTimes;
      //The moment when the leftmost enemy will be completely offscreen
      var leftMostEnemyInRowExitCompletion =
        leftMostEnemyEntryTimes[Board.COLUMN_COUNT+1];
      //The moment when the new enemy will begin to exit the screen
      var newEnemyExitBegin = entryTimes[Board.COLUMN_COUNT];
      //If the new enemy begins to exit before the existing any is gone,
      //then we have potential for overlap. Retire that enemy and attempt
      //another spawn.
      if (newEnemyExitBegin < leftMostEnemyInRowExitCompletion) {
        this.retiredEnemies.push(enemyObjectWithRetireTime);
        this.spawnNewEnemy(attemptIndex+1);
        return;
      }
      //The moment the leftmost enemy begins exiting the first column
      var leftMostEnemyInRowSecondColumnEntry = leftMostEnemyEntryTimes[1];
      //The moment when the new enemy begins entering the first column
      var newEnemyFirstColumnEntry = entryTimes[0];
      //If the new enemy begins to enter the screen before the leftmost
      //enemy is out of that space, we have potential for overlap. Retire
      //that enemy and attempt another spawn.
      if (newEnemyFirstColumnEntry < leftMostEnemyInRowSecondColumnEntry) {
        this.retiredEnemies.push(enemyObjectWithRetireTime);
        this.spawnNewEnemy(attemptIndex+1);
        return;
      }
    }

    //If the player, in its current location, could be run over by this new
    //enemy, call newEnemyInRow() on player to let it know.
    if (this.potentialCollisionLocation.rowIndex === rowIndex)
      player.newEnemyInRow(entryTimes[this.potentialCollisionLocation.column]);


    //Push new enemy onto the appropriate row. Order here is guaranteed already.
    this.activeEnemiesByRow[rowIndex].push(enemyObjectWithEntryAndExitTimes);

    //Update retire time in packaged enemy, then push onto activeEnemies
    enemyObjectWithRetireTime.retireTime = retireTime;
    this.activeEnemies.push(enemyObjectWithRetireTime);
  }

  this.newTimeUntilSpawn(); //Generate next spawn time
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
  //Seconds required to traverse a single column
  var secondsPerColumn = Board.COL_WIDTH_PIXELS / enemy.speed;
  //Seconds by which to adjust entry times based on visual edges of sprites
  var secondsPerEntryEdgeAdjustWidth =
    (Enemy.EDGE_ADJUST_RIGHT + Player.EDGE_ADJUST_LEFT) / enemy.speed;
  //Same, buf for exit times
  var secondsPerExitEdgeAdjustWidth =
    (Enemy.EDGE_ADJUST_LEFT + Player.EDGE_ADJUST_RIGHT) / enemy.speed;

  var now = Date.now() / 1000;
  for (var col = Board.COLUMN_COUNT + 1; col >= 0; col--) {
    entryTimes.splice(0, 0,
      col * secondsPerColumn + secondsPerEntryEdgeAdjustWidth + now);
    exitTimes.splice(0, 0,
      (col+2) * secondsPerColumn - secondsPerExitEdgeAdjustWidth + now);
  };

  return {
    enemy: enemy, //Enemy object
    entryTimes: entryTimes, //Array of entry times by column
    exitTimes: exitTimes //Array of exit times by column
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
  if(x === undefined) { //Clear collision location. No upcoming collion.
    this.potentialCollisionLocation.column = null;
    this.potentialCollisionLocation.rowIndex = null;
    return null;
  }

  var rowIndex = board.pixelCoordinatesForBoardCoordinates(x,y).y +
    Enemy.PIXEL_ADJUST;

  this.potentialCollisionLocation.column = x;
  this.potentialCollisionLocation.rowIndex = rowIndex;

  var rowOfEnemies = this.activeEnemiesByRow[rowIndex];
  if (rowOfEnemies === undefined) //No row? No collisions.
    return;

  var enemyObject; //Packaged with entry and exit times
  var columnEntry;
  var columnExit;
  var now = Date.now() / 1000;

  for (var i = 0; i < rowOfEnemies.length; i++) {
    enemyObject = rowOfEnemies[i];
    columnEntry = enemyObject.entryTimes[x];
    columnExit = enemyObject.exitTimes[x];
    if (columnEntry > now){ //Enemy not yet at this column.
      return columnEntry; //Return this time as the next collision
    } else if (columnExit > now) { //Enemy is still in this column
      player.die();
      return;
    }
  }
  return; //No possible collision in this row with current active enemies
};

/** Renders all active enemies */
EnemyHandler.prototype.render = function() {
  if (!this.hidden) {
    this.activeEnemies.forEach(function(enemyObject){
      enemyObject.enemy.render();
    });
  }
};





//Declare all game objects here! They'll be initialized in engine.js
var board = new Board();
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

export default game;
