import Resources from '../resources';
import { IMAGE, ENEMY_PIXEL_ADJUST } from '../constants';

class Enemy {
  constructor(ctx) {
    this.x = null;
    this.y = null;
    this.hidden = null;
    this.speed = null; // pixels/sec
    this.ctx = ctx;
  }

  init(x, y, lowerSpeedLimit, upperSpeedLimit) {
    this.speed = Math.random() * (upperSpeedLimit - lowerSpeedLimit) + lowerSpeedLimit;
    this.x = x;
    this.y = y + ENEMY_PIXEL_ADJUST;
    this.hidden = false;
  }

  update(dt) {
    this.x += this.speed * dt;
  }

  render() {
    if (!this.hidden) { this.ctx.drawImage(Resources.get(IMAGE.BUG), this.x, this.y); }
  }
}

export default Enemy;
