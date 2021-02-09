import Game from './classes/Game';
import Resources from './resources';
import Time from './classes/Time';
import '../style.css';
import {
  WIDTH, HEIGHT, TYPEFACE, IMAGE,
} from './constants';

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
let lastTime;

canvas.width = WIDTH;
canvas.height = HEIGHT;
document.body.appendChild(canvas);

const game = new Game(ctx);

/* Game loop */
const main = () => {
  const now = Time.now() / 1000;
  const dt = (now - lastTime);

  game.update(dt, now);
  game.render();

  lastTime = now;

  window.requestAnimationFrame(main);
};

/* Sets up lastTime (needed in loop) and initiates the loop. Also sets the
  * fill and strokeStyles for all rendered text in the game (white with black
  * outline), then initializes the game.
  */
const init = () => {
  lastTime = Time.now() / 1000;

  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;

  game.init(); // Initializes the game, as well as the associated objects (player, map, etc.)

  main();
};

Resources.load(...Object.values(IMAGE));
Resources.loadFonts(TYPEFACE);
Resources.onReady(init);
