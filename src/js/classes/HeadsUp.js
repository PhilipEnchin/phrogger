/**
 * Object representing the heads-up display - lives remaining, level number,
 * etc. Renders all in-game text to the screen.
 * @constructor
 */
var HeadsUp = function() {
  /** @type {string} */ this.levelText;
  /** @type {string} */ this.livesText;
  /** @type {string} */ this.bigText;
  /** @type {string} */ this.bigTextSize;
  /** @type {string} */ this.instructionText;
};

/** @const */ HeadsUp.prototype.TYPEFACE = 'Impact';
/** @const */ HeadsUp.prototype.GAME_TITLE = 'PHROGGER';
/** @const */ HeadsUp.prototype.GAME_INSTRUCTIONS = [
  'Use arrow keys to get across the road',
  'Don\'t forget to grab the key!',
  'Press P to pause',
  '',
  'When you\'re ready, hit the spacebar'
];
/** @const */ HeadsUp.prototype.levelPrefix = 'LEVEL: ';
/** @const */ HeadsUp.prototype.livesPrefix = 'LIVES: ';
/** @const */ HeadsUp.prototype.TITLE_TEXT_SIZE = 80;
/** @const */ HeadsUp.prototype.PAUSED_TEXT_SIZE = 36;
/** @const */ HeadsUp.prototype.PRE_LEVEL_TEXT_SIZE = 48;
/** @const */ HeadsUp.prototype.LEVEL_TEXT_SIZE = 16;
/** @const */ HeadsUp.prototype.LIVES_TEXT_SIZE = 16;
/** @const */ HeadsUp.prototype.INSTRUCTION_TEXT_SIZE = 20;
/** @const */ HeadsUp.prototype.INSTRUCTION_LINE_HEIGHT = 24;
/**
 * X position of HUD level text.
 * @const
 */
HeadsUp.prototype.LEVEL_X = 0;
/**
 * Y position of HUD level text.
 * @const
 */
HeadsUp.prototype.LEVEL_Y = (Map.prototype.ROWS_COUNT + 1) *
  Map.prototype.ROW_HEIGHT_PIXELS + 25;
/**
 * X position of HUD lives text.
 * @const
 */
HeadsUp.prototype.LIVES_X = Map.prototype.COLUMN_COUNT *
  Map.prototype.COL_WIDTH_PIXELS;
/**
 * Y position of HUD lives text.
 * @const
 */
HeadsUp.prototype.LIVES_Y = (Map.prototype.ROWS_COUNT + 1) *
  Map.prototype.ROW_HEIGHT_PIXELS + 25;

/**
 * Sets constants that can't be set until after engine.js is loaded.
 */
HeadsUp.prototype.init = function(game) {
  /**
   * X position of HUD "big" text.
   * @const
   */
  this.BIG_TEXT_X = canvas.width/2;
  /**
   * Y position of HUD "big" text.
   * @const
   */
  this.BIG_TEXT_Y = canvas.height/2 - 20;
  /**
   * X position of HUD instructions text.
   * @const
   */
  this.INSTRUCTIONS_X = canvas.width/2;
  /**
   * Y position of HUD instructions text.
   * @const
   */
  this.INSTRUCTIONS_Y = canvas.height/2 + 20;

  this.game = game;
};

/**
 * Sets HUD text based on game state.
 * @param {number} state The new game state.
 */
HeadsUp.prototype.setState = function(state) {
  const { game } = this;
  switch (state) {
    case game.State.TITLE:
      this.levelText = '';
      this.livesText = '';
      this.bigText = this.GAME_TITLE;
      this.bigTextSize = this.TITLE_TEXT_SIZE;
      this.instructionText = [
        'Press spacebar to begin',
        '',
        (game.highScore > 0) ? 'High score: Level '+game.highScore : ''
      ];
      break;
    case game.State.INSTRUCTIONS:
      this.bigText = '';
      this.instructionText = this.GAME_INSTRUCTIONS;
      break;
    case game.State.LEVEL_TITLE:
    case game.State.REINCARNATE:
      this.bigText = this.levelPrefix + game.level;
      this.instructionText = this.livesPrefix + game.lives;
      this.bigTextSize = this.PRE_LEVEL_TEXT_SIZE;
      this.levelText = '';
      this.livesText = '';
      break;
    case game.State.PLAY:
      this.levelText = this.levelPrefix + game.level;
      this.livesText = this.livesPrefix + game.lives;
      this.bigText = '';
      this.instructionText = '';
      break;
    case game.State.PAUSED:
      this.bigText = 'PAUSED';
      this.bigTextSize = this.PAUSED_TEXT_SIZE;
      break;
    case game.State.WIN_LEVEL:
      var winTextArray = ['Nicely done!','You rock!','Ka-Blamo'];
      this.bigText = winTextArray[Math.floor(Math.random() *
        winTextArray.length)];
      break;
    case game.State.DIED   :
      var dieTextArray = ['You died','You expired','You perished',
        'Kicked the bucket','Croaked','Bought it','Bought the farm',
        'Checked out early'];
      this.bigText = dieTextArray[Math.floor(Math.random()*dieTextArray.length)];
      break;
    case game.State.GAME_OVER:
      this.bigText = 'Game over';
      if (game.distanceToHighScore < 0 &&
        -game.distanceToHighScore !== game.highScore)
        this.instructionText = [
          'You beat your high score!',
          '',
          'New high score:',
          'Level ' + game.highScore];
      else if (game.distanceToHighScore < 0)
        this.instructionText = [
        'You set your first high score!',
        '',
        'High Score: Level ' + game.highScore];
      else if (game.distanceToHighScore === 0 && game.highScore > 0)
        this.instructionText = [
          'You tied your high score!',
          '',
          'Give it another try!'];
      else
        this.instructionText = ['So sad'];
      this.instructionText.splice(1000,0,'','Press spacebar to continue');
      break;
    default: throw new Error(`Unrecognized game state: ${state}`);
  }
};

/**
 * Updates the lives text on screen when an extra life is achieved.
 */
HeadsUp.prototype.extraLife = function() {
  this.livesText = this.livesPrefix + game.lives;
};

/**
 * Renders all non-empty text strings to the screen
 */
HeadsUp.prototype.render = function() {
  if (this.bigText){
    this.renderText(this.bigText,this.BIG_TEXT_X,this.BIG_TEXT_Y,
      this.TITLE_TEXT_SIZE,this.TYPEFACE,'center');
  }
  if (this.instructionText){
    if(this.instructionText.constructor == Array){
      for (var i = this.instructionText.length - 1; i >= 0; i--) {
        this.renderText(this.instructionText[i],this.INSTRUCTIONS_X,
          this.INSTRUCTION_LINE_HEIGHT*i + this.INSTRUCTIONS_Y,
          this.INSTRUCTION_TEXT_SIZE,this.TYPEFACE,'center');
      }
    } else {
      this.renderText(this.instructionText,this.INSTRUCTIONS_X,
        this.INSTRUCTIONS_Y,this.INSTRUCTION_TEXT_SIZE,this.TYPEFACE,
        'center');
    }
  }
  if (this.levelText){
    this.renderText(this.levelText,this.LEVEL_X,this.LEVEL_Y,
      this.LEVEL_TEXT_SIZE,this.TYPEFACE,'left');
  }
  if (this.livesText){
    this.renderText(this.livesText,this.LIVES_X,this.LIVES_Y,
      this.LIVES_TEXT_SIZE,this.TYPEFACE,'right');
  }
};

/**
 * Helper method to display text with an outline.
 * @param {string} text The text to be rendered.
 * @param {number} x The x pixel coordinate.
 * @param {number} y The y pixel coordinate.
 * @param {number} textSize The size of the text to be rendered.
 * @param {string} typeface The typeface to be used.
 * @param {string} alignment Left, right or center alignment.
 */
HeadsUp.prototype.renderText = function(text,x,y,textSize,typeface,alignment) {
  ctx.font = textSize + 'pt ' + typeface;
  ctx.textAlign = alignment;
  ctx.fillText(text,x,y,canvas.width);
  ctx.strokeText(text,x,y,canvas.width);
};

export default HeadsUp;
