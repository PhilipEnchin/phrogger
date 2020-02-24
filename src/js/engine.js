import Game from './classes/Game';
import Resources from './resources';
import '../style.css';

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
let lastTime;

canvas.width = 505;
canvas.height = 606;
document.body.appendChild(canvas);

const game = new Game();

/* Game loop */
const main = () => {
  const now = Date.now() / 1000;
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
  lastTime = Date.now() / 1000;

  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;

  game.init(); // Initializes the game, as well as the associated objects (player, map, etc.)

  main();
};

Resources.load([ // Load image assets using resources.js
  'images/stone-block.png',
  'images/water-block.png',
  'images/grass-block.png',
  'images/enemy-bug.png',
  'images/char-boy.png',
  'images/Rock.png',
  'images/Key.png',
  'images/Heart.png',
]);
Resources.onReady(init);

global.ctx = ctx;
global.canvas = canvas;
