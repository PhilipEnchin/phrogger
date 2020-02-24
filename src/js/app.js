/**
 * @fileoverview Aside from the main loop (which is in engine.js), this file
 * contains everything needed to run "Phrogger". All the game-related classes are
 * here. They're declared, and their constructors are called.
 */

/**
 * The Game class saves data related to the state of the game, such as the level,
 * the current high score, how many lives are remaining, etc. It's used as a hub
 * of sorts for the game as a whole. For example, all keyboard input is routed
 * through Game, and Game.init() calls init() methods on other classes.
 * @constructor
 */

import Board from './classes/Board';
import EnemyHandler from './classes/EnemyHandler';
import HeadsUp from './classes/HeadsUp';
import MapAccessories from './classes/MapAccessories';
import Player from './classes/Player';
import Game from './classes/Game';





















//Declare all game objects here! They'll be initialized in engine.js
var game = new Game();

// Listens for key presses. Sends recognized keys to Game.handleInput()
document.addEventListener('keydown', function(e) {
  var allowedKeys = {
    32: 'space', //spacebar
    37: 'left', //left arrow
    38: 'up', //up arrow
    39: 'right', //right arrow
    40: 'down', //down arrow
    80: 'pause', //P key
  };
  var keyString = allowedKeys[e.keyCode];
  if (keyString !== undefined)
    game.handleInput(keyString);
});

export default game;
