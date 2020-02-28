export const WIDTH = 505;
export const HEIGHT = 606;

export const GAME_STATE = {
  TITLE: 0, // Title screen
  INSTRUCTIONS: 1, // Instructions displayed after title screen
  LEVEL_TITLE: 2, // Level title screen (as in, LEVEL 1. FIGHT!)
  PLAY: 3,
  PAUSED: 4,
  GAME_OVER: 5,
  DIED: 6, // Player just died (next state will be REINCARNATE or GAME_OVER)
  WIN_LEVEL: 7, // Player has just passed level
  REINCARNATE: 8, // Like LEVEL_TITLE, but with small differences
};

export const TILE = { WATER: 0, STONE: 1, GRASS: 2 };
export const ROWS_COUNT = 6;
export const COLUMN_COUNT = 5;
export const ROW_HEIGHT_PIXELS = 83;
export const COL_WIDTH_PIXELS = 101;

export const TYPEFACE = 'Seymour One';

export const IMAGE = {
  STONE: 'images/stone-block.png',
  WATER: 'images/water-block.png',
  GRASS: 'images/grass-block.png',
  BUG: 'images/enemy-bug.png',
  BOY: 'images/char-boy.png',
  ROCK: 'images/Rock.png',
  KEY: 'images/Key.png',
  HEART: 'images/Heart.png',
};

export const ENEMY_PIXEL_ADJUST = -20;

export const STARTING_LIVES = 2;
export const REINCARNATE_DURATION = 2;
export const WIN_LEVEL_DURATION = 2;
export const DIE_DURATION = 2;

export const ACTION = {
  DOWN: 1,
  LEFT: 2,
  PAUSE: 3,
  RIGHT: 4,
  SPACE: 5,
  UP: 6,
};

export const KEY = {
  32: ACTION.SPACE,
  37: ACTION.LEFT,
  38: ACTION.UP,
  39: ACTION.RIGHT,
  40: ACTION.DOWN,
  80: ACTION.PAUSE,
};
