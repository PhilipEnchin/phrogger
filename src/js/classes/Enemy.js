import Resources from '../resources';

/**
 * The Enemy object represents an individual enemy (a bug).
 */
var Enemy = function() {
  /** @type {number} */ this.x;
  /** @type {number} */ this.y;
  /** @type {boolean} */ this.hidden;
  /**
   * Speed, in pixels per second
   * @type {number}
   */
  this.speed;
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

export default Enemy;
