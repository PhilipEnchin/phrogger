import Enemy from './Enemy';
import Player from './Player';
import { GAME_STATE, COL_WIDTH_PIXELS, COLUMN_COUNT } from '../constants';

/**
 * Puts the Enemy object inside another object with entry and exit times.
 * @param {Enemy} enemy The enemy object
 * @return {Object.<string, Enemy | Array.<number>>}
 */
const packageEnemyWithEntryAndExitTimes = enemy => {
  const entryTimes = [];
  const exitTimes = [];
  // Seconds required to traverse a single column
  const secondsPerColumn = COL_WIDTH_PIXELS / enemy.speed;
  // Seconds by which to adjust entry times based on visual edges of sprites
  const secondsPerEntryEdgeAdjustWidth = (Enemy.EDGE_ADJUST_RIGHT + Player.EDGE_ADJUST_LEFT)
    / enemy.speed;
  // Same, buf for exit times
  const secondsPerExitEdgeAdjustWidth = (Enemy.EDGE_ADJUST_LEFT + Player.EDGE_ADJUST_RIGHT)
    / enemy.speed;

  const now = Date.now() / 1000;
  for (let col = COLUMN_COUNT + 1; col >= 0; col--) {
    entryTimes.splice(0, 0,
      col * secondsPerColumn + secondsPerEntryEdgeAdjustWidth + now);
    exitTimes.splice(0, 0,
      (col + 2) * secondsPerColumn - secondsPerExitEdgeAdjustWidth + now);
  }

  return { enemy, entryTimes, exitTimes };
};

/**
 * A system for dealing with the evil bugs! Takes care of initializing the bugs,
 * making sure they're retired at the right time, caching collision times, and
 * recycling the Enemy objects for reuse.
 */
class EnemyHandler {
  constructor(ctx) {
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
    this.spawnInterval = null;
    /**
     * Amount by which this.timeUntilSpawn will vary when regenerated, in terms
     * of a fraction of this.spawnInterval. (So a variance of 1.0 will result in
     * this.timeUntilSpawn values of zero to 2*this.spawnInterval.)
     * @type {number}
     */
    this.spawnVariance = null;
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
    this.potentialCollisionLocation = { column: null, rowIndex: null };
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
    this.spawnX = null;
    /**
     * X coordinate where an enemy is retired (just off right of screen)
     * @type {number}
     */
    this.retireX = null;

    this.ctx = ctx;
  }

  /** Initializes spawnX and retireX, which require the map to be initialized */
  init(game, board, player) {
    this.spawnX = board.pixelCoordinatesForBoardCoordinates(0, 0).x - COL_WIDTH_PIXELS;
    this.retireX = board.pixelCoordinatesForBoardCoordinates(COLUMN_COUNT - 1, 0).x
      + COL_WIDTH_PIXELS;

    this.board = board;
    this.game = game;
    this.player = player;
  }

  /**
   * Sets properties and calls methods based on the new game state.
   * @param {number} state The new game state
   */
  setState(state) {
    const {
      TITLE, INSTRUCTIONS, LEVEL_TITLE, PLAY, PAUSED, GAME_OVER, DIED, WIN_LEVEL, REINCARNATE,
    } = GAME_STATE;
    switch (state) {
      case TITLE:
        this.moveable = true;
        this.hidden = false;
        this.setSpeeds(200, 500);
        this.setSpawnIntervalAndVariance(0.3, 0.5);
        break;
      case INSTRUCTIONS:
        this.moveable = true;
        this.hidden = false;
        break;
      case LEVEL_TITLE:
      case REINCARNATE:
        this.moveable = true;
        this.hidden = false;
        break;
      case PLAY:
        this.moveable = true;
        this.hidden = false;
        break;
      case PAUSED:
        this.moveable = false;
        this.hidden = true;
        break;
      case DIED:
        this.moveable = false;
        this.hidden = false;
        break;
      case GAME_OVER:
      case WIN_LEVEL: break;
      default: throw new Error(`Unrecognized game state: ${state}`);
    }
  }

  /**
   * @param {number} spawnInterval New spawn interval.
   * @param {number} spawnVariance New spawn variance.
   */
  setSpawnIntervalAndVariance(spawnInterval, spawnVariance) {
    // If the next spawn is so far away that it doesn't fit into the new
    // parameters, generate it again.
    if (this.timeUntilSpawn
      > (this.spawnInterval = spawnInterval) * ((this.spawnVariance = spawnVariance) + 1)) {
      this.newTimeUntilSpawn();
    }
  }

  /**
   * @param {number} lowerSpeedLimit New lower bound for enemy speed
   * @param {number} upperSpeedLimit New upper bound for enemy speed
   */
  setSpeeds(lowerSpeedLimit, upperSpeedLimit) {
    this.lowerSpeedLimit = lowerSpeedLimit;
    this.upperSpeedLimit = upperSpeedLimit;
  }

  /**
   * Updates all Enemy objects, retires them if required, adds new ones if needed,
   * updates this.timePaused if the game is paused, or adds this.timePaused to all
   * variables that depend on proper time keeping.
   * @param {number} dt Time elapsed since last update
   * @param {number} now System time at invocation
   */
  update(dt, now) {
    const { board, player } = this;
    if (this.moveable) {
      // If the game has been paused, add that time onto the active enemies
      if (this.timePaused > 0) {
        // Add paused time to retire time
        this.activeEnemies.forEach(enemyObject => {
          enemyObject.retireTime += this.timePaused;
        }, this);
        // Add paused time to tile entries and exits (for collisions)
        board.roadRowNumbers.forEach(i => {
          const rowIndex = board.pixelCoordinatesForBoardCoordinates(0, i).y + Enemy.PIXEL_ADJUST;
          if (this.activeEnemiesByRow[rowIndex] !== undefined) {
            this.activeEnemiesByRow[rowIndex].forEach(enemyObject => {
              for (let j = enemyObject.entryTimes.length - 1; j >= 0; j--) {
                enemyObject.entryTimes[j] += this.timePaused;
              }
              for (let j = enemyObject.exitTimes.length - 1; j >= 0; j--) {
                enemyObject.exitTimes[j] += this.timePaused;
              }
            }, this);
          }
        }, this);
        // Add paused time to current upcoming collision
        player.addPauseTimeToCollision(this.timePaused);
        this.timePaused = 0; // Reset paused time to zero
      }
      let retiredEnemy;
      /* This loop will result in some enemies that aren't retired immediately
        as they move offscreen, in the case of an enemy that was generated
        later, but reached the right side of the screen first, but doing it
        this way avoids the overhead of sorting the enemies in by retire time
        every time a new enemy is generated */
      while (this.activeEnemies.length > 0 && now >= this.activeEnemies[0].retireTime) {
        retiredEnemy = this.activeEnemies.shift();
        this.retiredEnemies.push(retiredEnemy);
        this.activeEnemiesByRow[retiredEnemy.enemy.y].shift();
      }

      // Update remaining active enemies
      for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
        this.activeEnemies[i].enemy.update(dt);
      }

      // Spawn a new enemy if the time until spawn has reached zero.
      if ((this.timeUntilSpawn -= dt) <= 0) {
        this.spawnNewEnemy();
      }
    } else {
      this.timePaused += dt;
    }
  }

  /**
   * If a retired enemy is available, returns that enemy. Otherwise, creates a new
   * enemy and returns that. Either way, the enemy returned is packaged in an
   * object along with its retireTime.
   * @return {Object.<string, Enemy | number>}
   */
  getNewEnemy() {
    const { board } = this;
    let newEnemy;
    if (!(newEnemy = this.retiredEnemies.pop())) {
      newEnemy = { enemy: new Enemy(this.ctx), retireTime: null };
    }
    const yCoordinate = board.randomRoadYCoordinate();
    newEnemy.enemy.init(this.spawnX, yCoordinate, this.lowerSpeedLimit,
      this.upperSpeedLimit); // Initialize (or reinitialize) enemy
    return newEnemy;
  }

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
  spawnNewEnemy(attemptIndex = 0) {
    const { player } = this;
    // Quick check to make sure we haven't attempted this spawn too many times
    if (attemptIndex < EnemyHandler.MAX_SPAWN_ATTEMPTS) {
      const enemyObjectWithRetireTime = this.getNewEnemy();
      const nakedEnemy = enemyObjectWithRetireTime.enemy; // Unpackaged Enemy
      const enemyObjectWithEntryAndExitTimes = packageEnemyWithEntryAndExitTimes(nakedEnemy);
      const { entryTimes } = enemyObjectWithEntryAndExitTimes;
      const rowIndex = nakedEnemy.y; // For activeEnemiesByRow...
      const retireTime = entryTimes[COLUMN_COUNT + 1];
      let rowOfEnemies = this.activeEnemiesByRow[rowIndex];

      // Creates the row if this is the first enemy in that row.
      if (rowOfEnemies === undefined) {
        rowOfEnemies = [];
        this.activeEnemiesByRow[rowIndex] = rowOfEnemies;
      }

      // If this is not the only active enemy in this row, we need to make sure
      // it won't overlap another enemy.
      if (rowOfEnemies.length > 0) {
        // Entry times for leftmost enemy in row
        const leftMostEnemyEntryTimes = rowOfEnemies[rowOfEnemies.length - 1].entryTimes;
        // The moment when the leftmost enemy will be completely offscreen
        const leftMostEnemyInRowExitCompletion = leftMostEnemyEntryTimes[COLUMN_COUNT + 1];
        // The moment when the new enemy will begin to exit the screen
        const newEnemyExitBegin = entryTimes[COLUMN_COUNT];
        // If the new enemy begins to exit before the existing any is gone,
        // then we have potential for overlap. Retire that enemy and attempt
        // another spawn.
        if (newEnemyExitBegin < leftMostEnemyInRowExitCompletion) {
          this.retiredEnemies.push(enemyObjectWithRetireTime);
          this.spawnNewEnemy(attemptIndex + 1);
          return;
        }
        // The moment the leftmost enemy begins exiting the first column
        const leftMostEnemyInRowSecondColumnEntry = leftMostEnemyEntryTimes[1];
        // The moment when the new enemy begins entering the first column
        const newEnemyFirstColumnEntry = entryTimes[0];
        // If the new enemy begins to enter the screen before the leftmost
        // enemy is out of that space, we have potential for overlap. Retire
        // that enemy and attempt another spawn.
        if (newEnemyFirstColumnEntry < leftMostEnemyInRowSecondColumnEntry) {
          this.retiredEnemies.push(enemyObjectWithRetireTime);
          this.spawnNewEnemy(attemptIndex + 1);
          return;
        }
      }

      // If the player, in its current location, could be run over by this new
      // enemy, call newEnemyInRow() on player to let it know.
      if (this.potentialCollisionLocation.rowIndex === rowIndex) {
        player.newEnemyInRow(entryTimes[this.potentialCollisionLocation.column]);
      }

      // Push new enemy onto the appropriate row. Order here is guaranteed already.
      this.activeEnemiesByRow[rowIndex].push(enemyObjectWithEntryAndExitTimes);

      // Update retire time in packaged enemy, then push onto activeEnemies
      enemyObjectWithRetireTime.retireTime = retireTime;
      this.activeEnemies.push(enemyObjectWithRetireTime);
    }

    this.newTimeUntilSpawn(); // Generate next spawn time
  }

  /** Randomly generates a new timeUntilSpawn */
  newTimeUntilSpawn() {
    this.timeUntilSpawn = this.spawnInterval * (this.spawnVariance * (2 * Math.random() - 1) + 1);
  }

  /**
   * Detects either an immediate or future collision. If there is an immediate
   * collision, player.die() is called.
   * @param {number} x Column number.
   * @param {number} y Row number.
   * @return {number | undefined} The upcoming collision time, or if there isn't
   *     one, undefined.
   */
  collisionTimeForCoordinates(x, y) {
    const { board, player } = this;
    if (x === undefined) { // Clear collision location. No upcoming collion.
      this.potentialCollisionLocation.column = null;
      this.potentialCollisionLocation.rowIndex = null;
      return null;
    }

    const rowIndex = board.pixelCoordinatesForBoardCoordinates(x, y).y + Enemy.PIXEL_ADJUST;

    this.potentialCollisionLocation.column = x;
    this.potentialCollisionLocation.rowIndex = rowIndex;

    const rowOfEnemies = this.activeEnemiesByRow[rowIndex];
    if (rowOfEnemies === undefined) { return null; } // No row? No collisions.

    let enemyObject; // Packaged with entry and exit times
    let columnEntry;
    let columnExit;
    const now = Date.now() / 1000;

    for (let i = 0; i < rowOfEnemies.length; i++) {
      enemyObject = rowOfEnemies[i];
      columnEntry = enemyObject.entryTimes[x];
      columnExit = enemyObject.exitTimes[x];
      if (columnEntry > now) { // Enemy not yet at this column.
        return columnEntry; // Return this time as the next collision
      }
      if (columnExit > now) { // Enemy is still in this column
        player.die();
        return null;
      }
    }
    return null; // No possible collision in this row with current active enemies
  }

  /** Renders all active enemies */
  render() {
    if (!this.hidden) {
      this.activeEnemies.forEach(enemyObject => {
        enemyObject.enemy.render();
      });
    }
  }
}

/**
 * Maximum number of attempts at spawning an enemy until giving up. Remember, an
 * enemy will not spawn when it will overlap with another enemy on screen. If,
 * after this many attempts at randomly generating an enemy, we still don't have
 * an enemy that meets this requirement, spawning is abandoned.
 * @const
 */
EnemyHandler.MAX_SPAWN_ATTEMPTS = 10;

export default EnemyHandler;
