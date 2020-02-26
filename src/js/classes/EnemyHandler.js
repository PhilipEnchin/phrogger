import Enemy from './Enemy';
import {
  GAME_STATE, COL_WIDTH_PIXELS, COLUMN_COUNT, ENEMY_PIXEL_ADJUST,
} from '../constants';

const [PLAYER_EDGE_ADJUST_RIGHT, PLAYER_EDGE_ADJUST_LEFT] = [29, 30];
const [ENEMY_EDGE_ADJUST_RIGHT, ENEMY_EDGE_ADJUST_LEFT] = [5, 36];
const SPAWN_X = -COL_WIDTH_PIXELS;

// Puts the Enemy object inside another object with entry and exit times.
const packageEnemyWithEntryAndExitTimes = enemy => {
  const entryTimes = [];
  const exitTimes = [];
  const secondsPerColumn = COL_WIDTH_PIXELS / enemy.speed; // Seconds to traverse a column

  // Adjust entry and exit times based on visual edges of sprites
  const secondsPerEntry = (ENEMY_EDGE_ADJUST_RIGHT + PLAYER_EDGE_ADJUST_LEFT) / enemy.speed;
  const secondsPerExit = (ENEMY_EDGE_ADJUST_LEFT + PLAYER_EDGE_ADJUST_RIGHT) / enemy.speed;

  const now = Date.now() / 1000;
  for (let col = 0; col <= COLUMN_COUNT + 1; col++) {
    entryTimes.push(col * secondsPerColumn + secondsPerEntry + now);
    exitTimes.push((col + 2) * secondsPerColumn - secondsPerExit + now);
  }

  return { enemy, entryTimes, exitTimes };
};

/* A system for dealing with the evil bugs! Takes care of initializing the bugs,
   making sure they're retired at the right time, caching collision times, and
   recycling the Enemy objects for reuse. */
class EnemyHandler {
  constructor(ctx) {
    this.activeEnemies = [];
    this.retiredEnemies = [];
    this.spawnInterval = null;
    this.spawnVariance = null;
    this.timeUntilSpawn = 0;
    this.moveable = true; // Whether enemies should be moving abuot
    this.hidden = false;
    this.activeEnemiesByRow = {};
    this.potentialCollisionLocation = { column: null, rowIndex: null }; // Player location
    this.timePaused = 0; // Running total of time paused to adjust collisions after unpausing

    this.ctx = ctx;
  }

  init(game, board, player) {
    this.board = board;
    this.game = game;
    this.player = player;
  }

  // Do stuff when the game state changes
  setState(state) {
    const {
      TITLE, INSTRUCTIONS, LEVEL_TITLE, PLAY, PAUSED, GAME_OVER, DIED, WIN_LEVEL, REINCARNATE,
    } = GAME_STATE;
    switch (state) {
      case TITLE:
        this.setSpeeds(200, 500);
        this.setSpawnIntervalAndVariance(0.3, 0.5);
      case INSTRUCTIONS:
      case LEVEL_TITLE:
      case REINCARNATE:
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

  setSpawnIntervalAndVariance(spawnInterval, spawnVariance) {
    // If the next spawn is so far away that it doesn't fit the new parameters, generate it again.
    if ((this.spawnInterval = spawnInterval) * ((this.spawnVariance = spawnVariance) + 1)
      < this.timeUntilSpawn) {
      this.newTimeUntilSpawn();
    }
  }

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
          const rowIndex = board.pixelCoordinatesForBoardCoordinates(0, i).y + ENEMY_PIXEL_ADJUST;
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
    newEnemy.enemy.init(SPAWN_X, yCoordinate, this.lowerSpeedLimit,
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

    const rowIndex = board.pixelCoordinatesForBoardCoordinates(x, y).y + ENEMY_PIXEL_ADJUST;

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
