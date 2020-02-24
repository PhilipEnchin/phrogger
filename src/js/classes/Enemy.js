import Resources from '../resources';

/**
 * The Enemy object represents an individual enemy (a bug).
 */
const SPRITE = 'images/enemy-bug.png';

class Enemy {
  constructor(ctx) {
    /** @type {number} */ this.x = null;
    /** @type {number} */ this.y = null;
    /** @type {boolean} */ this.hidden = null;
    /**
     * Speed, in pixels per second
     * @type {number}
     */
    this.speed = null;

    this.ctx = ctx;
  }


  /**
   * Initializes an enemym randomly generating its speed based on the provided
   * speed limits.
   * @param {number} x Initial x coordinate.
   * @param {number} y Initial y coordinate.
   * @param {number} lowerSpeedLimit
   * @param {number} upperSpeedLimit
   */
  init(x, y, lowerSpeedLimit, upperSpeedLimit) {
    this.speed = Math.random() * (upperSpeedLimit - lowerSpeedLimit) + lowerSpeedLimit;
    this.x = x;
    this.y = y + Enemy.PIXEL_ADJUST;
    this.hidden = false;
  }

  /**
   * Update the enemy's position.
   * @param {number} dt Time elapsed since last update
   * @param {number} now System time at invocation
   */
  update(dt) {
    this.x += this.speed * dt;
  }

  /** Render the enemy to the screen. */
  render() {
    if (!this.hidden) { this.ctx.drawImage(Resources.get(SPRITE), this.x, this.y); }
  }
}

[Enemy.EDGE_ADJUST_RIGHT, Enemy.EDGE_ADJUST_LEFT, Enemy.PIXEL_ADJUST] = [5, 36, -20];

export default Enemy;
