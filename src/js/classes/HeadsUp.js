import {
  WIDTH, HEIGHT, GAME_STATE, TYPEFACE,
  ROWS_COUNT, COLUMN_COUNT, ROW_HEIGHT_PIXELS, COL_WIDTH_PIXELS,
} from '../constants';

const GAME_TITLE = 'PHROGGER';
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

const LEVEL_X = 0;
const LEVEL_Y = (ROWS_COUNT + 1) * ROW_HEIGHT_PIXELS + 25;
const LIVES_X = COLUMN_COUNT * COL_WIDTH_PIXELS;
const LIVES_Y = (ROWS_COUNT + 1) * ROW_HEIGHT_PIXELS + 25;
const [BIG_TEXT_X, BIG_TEXT_Y] = [WIDTH / 2, HEIGHT / 2 - 20];
const [INSTRUCTIONS_X, INSTRUCTIONS_Y] = [WIDTH / 2, HEIGHT / 2 + 20];

const renderText = (ctx, text, x, y, textSize, typeface, alignment) => {
  ctx.font = `${textSize}pt ${typeface}, sans-serif`;
  ctx.textAlign = alignment;
  ctx.fillText(text, x, y, WIDTH);
  ctx.strokeText(text, x, y, WIDTH);
};

class HeadsUp {
  constructor(ctx) {
    this.levelText = null;
    this.livesText = null;
    this.bigText = null;
    this.bigTextSize = null;
    this.instructionText = null;

    this.ctx = ctx;
  }

  init(game) {
    this.game = game;
  }

  /**
   * Sets HUD text based on game state.
   * @param {number} state The new game state.
   */
  setState(state) {
    const { game } = this;
    const {
      TITLE, INSTRUCTIONS, LEVEL_TITLE, PLAY, PAUSED, GAME_OVER, DIED, WIN_LEVEL, REINCARNATE,
    } = GAME_STATE;
    switch (state) {
      case TITLE:
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
      case INSTRUCTIONS:
        this.bigText = '';
        this.instructionText = GAME_INSTRUCTIONS;
        break;
      case LEVEL_TITLE:
      case REINCARNATE:
        this.bigText = levelPrefix + game.level;
        this.instructionText = livesPrefix + game.lives;
        this.bigTextSize = PRE_LEVEL_TEXT_SIZE;
        this.levelText = '';
        this.livesText = '';
        break;
      case PLAY:
        this.levelText = levelPrefix + game.level;
        this.livesText = livesPrefix + game.lives;
        this.bigText = '';
        this.instructionText = '';
        break;
      case PAUSED:
        this.bigText = 'PAUSED';
        this.bigTextSize = PAUSED_TEXT_SIZE;
        break;
      case WIN_LEVEL:
        this.bigText = WIN_TEXTS[Math.floor(Math.random() * WIN_TEXTS.length)];
        break;
      case DIED:
        this.bigText = DIE_TEXTS[Math.floor(Math.random() * DIE_TEXTS.length)];
        break;
      case GAME_OVER:
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
      renderText(this.ctx, this.bigText, BIG_TEXT_X, BIG_TEXT_Y, TITLE_TEXT_SIZE, TYPEFACE, 'center');
    }
    if (this.instructionText) {
      if (Array.isArray(this.instructionText)) {
        for (let i = this.instructionText.length - 1; i >= 0; i--) {
          renderText(
            this.ctx,
            this.instructionText[i],
            INSTRUCTIONS_X, INSTRUCTION_LINE_HEIGHT * i + INSTRUCTIONS_Y,
            INSTRUCTION_TEXT_SIZE, TYPEFACE, 'center',
          );
        }
      } else {
        renderText(this.ctx, this.instructionText, INSTRUCTIONS_X, INSTRUCTIONS_Y, INSTRUCTION_TEXT_SIZE, TYPEFACE, 'center');
      }
    }
    if (this.levelText) {
      renderText(this.ctx, this.levelText, LEVEL_X, LEVEL_Y, LEVEL_TEXT_SIZE, TYPEFACE, 'left');
    }
    if (this.livesText) {
      renderText(this.ctx, this.livesText, LIVES_X, LIVES_Y, LIVES_TEXT_SIZE, TYPEFACE, 'right');
    }
  }
}

export default HeadsUp;
