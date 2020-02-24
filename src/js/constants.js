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
export const COL_WIDTH_PIXELS = 101;
