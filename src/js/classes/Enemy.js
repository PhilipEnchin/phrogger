import Resources from '../resources';

/**
 * The Enemy object represents an individual enemy (a bug).
 */
const [SPRITE, PIXEL_ADJUST] = ['images/enemy-bug.png', -20];

class Enemy {
  constructor() {
    /** @type {number} */ this.x;
    /** @type {number} */ this.y;
    /** @type {boolean} */ this.hidden;
    /**
     * Speed, in pixels per second
     * @type {number}
     */
    this.speed;
  };


  /**
   * Initializes an enemym randomly generating its speed based on the provided
   * speed limits.
   * @param {number} x Initial x coordinate.
   * @param {number} y Initial y coordinate.
   * @param {number} lowerSpeedLimit
   * @param {number} upperSpeedLimit
   */
  init(x, y, lowerSpeedLimit, upperSpeedLimit) {
    this.speed = Math.random()*(upperSpeedLimit-lowerSpeedLimit) + lowerSpeedLimit;
    this.x = x;
    this.y = y + PIXEL_ADJUST;
    this.hidden = false;
  };

  /**
   * Update the enemy's position.
   * @param {number} dt Time elapsed since last update
   * @param {number} now System time at invocation
   */
  update(dt,now) {
    this.x += this.speed * dt;
  };

  /** Render the enemy to the screen. */
  render() {
    if (!this.hidden)
      ctx.drawImage(Resources.get(SPRITE), this.x, this.y);
  };
}

[Enemy.EDGE_ADJUST_RIGHT, Enemy.EDGE_ADJUST_LEFT] = [5, 36];

export default Enemy;
