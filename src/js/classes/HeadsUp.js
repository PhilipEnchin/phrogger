import Game from './Game';

/**
 * Object representing the heads-up display - lives remaining, level number,
 * etc. Renders all in-game text to the screen.
 * @constructor
 */

const [TYPEFACE, GAME_TITLE] = ['Impact', 'PHROGGER'];
const GAME_INSTRUCTIONS = [
  'Use arrow keys to get across the road',
  'Don\'t forget to grab the key!',
  'Press P to pause',
  '',
  'When you\'re ready, hit the spacebar',
];
const [levelPrefix, livesPrefix] = ['LEVEL: ', 'LIVES: '];
const [
  TITLE_TEXT_SIZE, PAUSED_TEXT_SIZE, PRE_LEVEL_TEXT_SIZE, LEVEL_TEXT_SIZE,
  LIVES_TEXT_SIZE, INSTRUCTION_TEXT_SIZE, INSTRUCTION_LINE_HEIGHT,
] = [80, 36, 48, 16, 16, 20, 24];

const WIN_TEXTS = ['Nicely done!', 'You rock!', 'Ka-Blamo'];
const DIE_TEXTS = [
  'You died', 'You expired', 'You perished', 'Kicked the bucket', 'Croaked',
  'Bought it', 'Bought the farm', 'Checked out early',
];

/**
 * Helper method to display text with an outline.
 * @param {string} text The text to be rendered.
 * @param {number} x The x pixel coordinate.
 * @param {number} y The y pixel coordinate.
 * @param {number} textSize The size of the text to be rendered.
 * @param {string} typeface The typeface to be used.
 * @param {string} alignment Left, right or center alignment.
 */
const renderText = (ctx, text, x, y, textSize, typeface, alignment) => {
  ctx.font = `${textSize}pt ${typeface}`;
  ctx.textAlign = alignment;
  ctx.fillText(text, x, y, canvas.width);
  ctx.strokeText(text, x, y, canvas.width);
};

class HeadsUp {
  constructor(ctx) {
    /** @type {string} */ this.levelText = null;
    /** @type {string} */ this.livesText = null;
    /** @type {string} */ this.bigText = null;
    /** @type {string} */ this.bigTextSize = null;
    /** @type {string} */ this.instructionText = null;

    this.ctx = ctx;
  }

  /**
   * Sets constants that can't be set until after engine.js is loaded.
   */
  init(game, rowCount, rowHeight, colCount, colWidth) {
    /**
     * X position of HUD "big" text.
     * @const
     */
    this.BIG_TEXT_X = canvas.width / 2;
    /**
     * Y position of HUD "big" text.
     * @const
     */
    this.BIG_TEXT_Y = canvas.height / 2 - 20;
    /**
     * X position of HUD instructions text.
     * @const
     */
    this.INSTRUCTIONS_X = canvas.width / 2;
    /**
     * Y position of HUD instructions text.
     * @const
     */
    this.INSTRUCTIONS_Y = canvas.height / 2 + 20;

    this.game = game;
    this.LEVEL_X = 0;
    this.LEVEL_Y = (rowCount + 1) * rowHeight + 25;
    this.LIVES_X = colCount * colWidth;
    this.LIVES_Y = (rowCount + 1) * rowHeight + 25;
  }

  /**
   * Sets HUD text based on game state.
   * @param {number} state The new game state.
   */
  setState(state) {
    const { game } = this;
    switch (state) {
      case Game.State.TITLE:
        this.levelText = '';
        this.livesText = '';
        this.bigText = GAME_TITLE;
        this.bigTextSize = TITLE_TEXT_SIZE;
        this.instructionText = [
          'Press spacebar to begin',
          '',
          (game.highScore > 0) ? `High score: Level ${game.highScore}` : '',
        ];
        break;
      case Game.State.INSTRUCTIONS:
        this.bigText = '';
        this.instructionText = GAME_INSTRUCTIONS;
        break;
      case Game.State.LEVEL_TITLE:
      case Game.State.REINCARNATE:
        this.bigText = levelPrefix + game.level;
        this.instructionText = livesPrefix + game.lives;
        this.bigTextSize = PRE_LEVEL_TEXT_SIZE;
        this.levelText = '';
        this.livesText = '';
        break;
      case Game.State.PLAY:
        this.levelText = levelPrefix + game.level;
        this.livesText = livesPrefix + game.lives;
        this.bigText = '';
        this.instructionText = '';
        break;
      case Game.State.PAUSED:
        this.bigText = 'PAUSED';
        this.bigTextSize = PAUSED_TEXT_SIZE;
        break;
      case Game.State.WIN_LEVEL:
        this.bigText = WIN_TEXTS[Math.floor(Math.random() * WIN_TEXTS.length)];
        break;
      case Game.State.DIED:
        this.bigText = DIE_TEXTS[Math.floor(Math.random() * DIE_TEXTS.length)];
        break;
      case Game.State.GAME_OVER:
        this.bigText = 'Game over';
        if (game.distanceToHighScore < 0 && -game.distanceToHighScore !== game.highScore) {
          this.instructionText = [
            'You beat your high score!',
            '',
            'New high score:',
            `Level ${game.highScore}`];
        } else if (game.distanceToHighScore < 0) {
          this.instructionText = [
            'You set your first high score!',
            '',
            `High Score: Level ${game.highScore}`];
        } else if (game.distanceToHighScore === 0 && game.highScore > 0) {
          this.instructionText = [
            'You tied your high score!',
            '',
            'Give it another try!'];
        } else {
          this.instructionText = ['So sad'];
        }
        this.instructionText.push('', 'Press spacebar to continue');
        break;
      default: throw new Error(`Unrecognized game state: ${state}`);
    }
  }

  /**
   * Updates the lives text on screen when an extra life is achieved.
   */
  extraLife() {
    this.livesText = livesPrefix + this.game.lives;
  }

  /**
   * Renders all non-empty text strings to the screen
   */
  render() {
    if (this.bigText) {
      renderText(this.ctx, this.bigText, this.BIG_TEXT_X, this.BIG_TEXT_Y, TITLE_TEXT_SIZE, TYPEFACE, 'center');
    }
    if (this.instructionText) {
      if (Array.isArray(this.instructionText)) {
        for (let i = this.instructionText.length - 1; i >= 0; i--) {
          renderText(
            this.ctx,
            this.instructionText[i],
            this.INSTRUCTIONS_X, INSTRUCTION_LINE_HEIGHT * i + this.INSTRUCTIONS_Y,
            INSTRUCTION_TEXT_SIZE, TYPEFACE, 'center',
          );
        }
      } else {
        renderText(this.ctx, this.instructionText, this.INSTRUCTIONS_X, this.INSTRUCTIONS_Y, INSTRUCTION_TEXT_SIZE, TYPEFACE, 'center');
      }
    }
    if (this.levelText) {
      renderText(this.ctx, this.levelText, this.LEVEL_X, this.LEVEL_Y, LEVEL_TEXT_SIZE, TYPEFACE, 'left');
    }
    if (this.livesText) {
      renderText(this.ctx, this.livesText, this.LIVES_X, this.LIVES_Y, LIVES_TEXT_SIZE, TYPEFACE, 'right');
    }
  }
}

export default HeadsUp;
