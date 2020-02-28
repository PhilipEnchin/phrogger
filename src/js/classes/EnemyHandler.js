import Enemy from './Enemy';
import {
  GAME_STATE, COL_WIDTH_PIXELS, COLUMN_COUNT, ENEMY_PIXEL_ADJUST,
} from '../constants';

const [PLAYER_EDGE_ADJUST_RIGHT, PLAYER_EDGE_ADJUST_LEFT] = [29, 30];
const [ENEMY_EDGE_ADJUST_RIGHT, ENEMY_EDGE_ADJUST_LEFT] = [5, 36];
const SPAWN_X = -COL_WIDTH_PIXELS;

// An enemy will not spawn if it will overlap with another enemy. This limits spawn attempts.
const MAX_SPAWN_ATTEMPTS = 10;


// Puts the Enemy object inside another object with entry and exit times.
const addEntryAndExitTimes = enemyObject => {
  const { speed } = enemyObject.enemy;
  const entryTimes = [];
  const exitTimes = [];
  const secondsPerColumn = COL_WIDTH_PIXELS / speed; // Seconds to traverse a column

  // Adjust entry and exit times based on visual edges of sprites
  const secondsPerEntry = (ENEMY_EDGE_ADJUST_RIGHT + PLAYER_EDGE_ADJUST_LEFT) / speed;
  const secondsPerExit = (ENEMY_EDGE_ADJUST_LEFT + PLAYER_EDGE_ADJUST_RIGHT) / speed;

  const now = Date.now() / 1000;
  for (let col = 0; col <= COLUMN_COUNT + 1; col++) {
    entryTimes.push(col * secondsPerColumn + secondsPerEntry + now);
    exitTimes.push((col + 2) * secondsPerColumn - secondsPerExit + now);
  }

  enemyObject.entryTimes = entryTimes;
  enemyObject.exitTimes = exitTimes;
  enemyObject.retireTime = entryTimes[COLUMN_COUNT + 1];

  return enemyObject;
};

/* A system for dealing with the evil bugs! Takes care of initializing the bugs, making sure they're
   retired at the right time, caching collision times, and recycling the Enemy objects for reuse. */
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

  // Updates all Enemies, retires/creates if required, deals with pause time
  update(dt, now) {
    if (this.moveable) {
      // If the game has been paused, add that time onto the active enemies
      if (this.timePaused > 0) {
        // Add paused time to retire time
        this.activeEnemies.forEach(enemyObject => enemyObject.retireTime += this.timePaused);
        // Add paused time to tile entries and exits (for collisions)
        Object.values(this.activeEnemiesByRow)
          .forEach(activeEnemies => activeEnemies
            .forEach(enemy => {
              enemy.entryTimes = enemy.entryTimes.map(t => t + this.timePaused);
              enemy.exitTimes = enemy.exitTimes.map(t => t + this.timePaused);
            }));
        // Add paused time to current upcoming collision
        this.player.addPauseTimeToCollision(this.timePaused);
        this.timePaused = 0; // Reset paused time to zero
      }
      // Retire enemies if the first activeEnemy is of retirement age
      while (this.activeEnemies.length > 0 && now >= this.activeEnemies[0].retireTime) {
        const retiredEnemy = this.activeEnemies.shift();
        this.retiredEnemies.push(retiredEnemy);
        this.activeEnemiesByRow[retiredEnemy.enemy.y].shift();
      }

      // Update remaining active enemies
      this.activeEnemies.forEach(({ enemy }) => enemy.update(dt));

      // Spawn a new enemy if the time until spawn has reached zero.
      if ((this.timeUntilSpawn -= dt) <= 0) this.spawnNewEnemy();
    } else {
      this.timePaused += dt;
    }
  }

  getNewEnemy() {
    const newEnemy = this.retiredEnemies.pop() || { enemy: new Enemy(this.ctx) };
    const yCoordinate = this.board.randomRoadYCoordinate();
    newEnemy.enemy.init(SPAWN_X, yCoordinate, this.lowerSpeedLimit, this.upperSpeedLimit);
    return newEnemy;
  }

  // Spawns a new enemy, or at least tries. No overlapping enemies allowed.
  spawnNewEnemy(attemptIndex = 0) {
    const { player } = this;
    // Quick check to make sure we haven't attempted this spawn too many times
    if (attemptIndex < MAX_SPAWN_ATTEMPTS) {
      const enemyObject = addEntryAndExitTimes(this.getNewEnemy());
      const { entryTimes, enemy } = enemyObject;
      const { y } = enemy;
      const rowOfEnemies = this.activeEnemiesByRow[y] || (this.activeEnemiesByRow[y] = []);

      // Make sure new enemy won't overlap with an existing enemy in the same row
      if (rowOfEnemies.length > 0) {
        const leftMostEnemyEntries = rowOfEnemies[rowOfEnemies.length - 1].entryTimes;
        const leftMostEnemyExitEnd = leftMostEnemyEntries[COLUMN_COUNT + 1];
        const newEnemyExitBegin = entryTimes[COLUMN_COUNT];
        const leftMostEnemyCol2Begin = leftMostEnemyEntries[1];
        const newEnemyCol1End = entryTimes[0];

        // If there may be overlap, retire new enemy and try spawning again
        if (newEnemyExitBegin < leftMostEnemyExitEnd || newEnemyCol1End < leftMostEnemyCol2Begin) {
          this.retiredEnemies.push(enemyObject);
          this.spawnNewEnemy(attemptIndex + 1);
          return;
        }
      }

      // New enemy is in same row as player
      if (this.potentialCollisionLocation.rowIndex === y) {
        player.newEnemyInRow(entryTimes[this.potentialCollisionLocation.column]);
      }

      rowOfEnemies.push(enemyObject);
      this.activeEnemies.push(enemyObject);
    }

    this.newTimeUntilSpawn(); // Generate next spawn time
  }

  // Randomly generates a new timeUntilSpawn
  newTimeUntilSpawn() {
    this.timeUntilSpawn = this.spawnInterval * (this.spawnVariance * (2 * Math.random() - 1) + 1);
  }

  // Detects immediate or future collision
  collisionTimeForCoordinates(x, y) {
    const { board, player, potentialCollisionLocation } = this;
    if (x === undefined) { // Clear collision location. No upcoming collion.
      return potentialCollisionLocation.column = potentialCollisionLocation.rowIndex = null;
    }

    const rowIndex = board.pixelCoordinatesForBoardCoordinates(x, y).y + ENEMY_PIXEL_ADJUST;
    const rowOfEnemies = this.activeEnemiesByRow[rowIndex];
    if (!rowOfEnemies) return null; // No row? No collisions.

    potentialCollisionLocation.column = x;
    potentialCollisionLocation.rowIndex = rowIndex;

    let columnEntry = null;
    const now = Date.now() / 1000;

    rowOfEnemies.some(({ entryTimes, exitTimes }) => {
      if (entryTimes[x] > now) { // Enemy's entry into this column is in the future
        columnEntry = entryTimes[x]; // Next collision time
        return true;
      }
      if (exitTimes[x] > now) { // Enemy is in column (entry has occured and exit is in the future)
        player.die();
        return true;
      }
      return false;
    });
    return columnEntry;
  }

  // Renders all active enemies
  render() {
    if (!this.hidden) {
      this.activeEnemies.forEach(enemyObject => enemyObject.enemy.render());
    }
  }
}

export default EnemyHandler;
