// Enemies our player must avoid
var Enemy = function() {
	this.sprite = 'images/enemy-bug.png'; //The image used for enemies
	this.x = 0; //| X and Y     |
	this.y = 0; //| coordinates |
	this.speed = 5; //Speed, in pixels per second
};

// Update the enemy's position
Enemy.prototype.update = function(dt) {
	this.x += this.speed * dt;
};

// Draw the enemy on the screen
Enemy.prototype.render = function() {
	ctx.drawImage(Resources.get(this.sprite), this.x, this.y);
};

// The player
var Player = function() {
	this.sprite = 'images/char-boy.png';
	this.x = 0;
	this.y = 395;
};
// Update the player's position
Player.prototype.update = function() {
	
};
// Draw the player on the screen
Player.prototype.render = function() {
	ctx.drawImage(Resources.get(this.sprite), this.x, this.y);
};
// Handle keyboard input for the movement of the player
Player.prototype.handleInput = function(keyString) {
	if (keyString === 'left') {
		this.x -= 101;
	} else if (keyString === 'right') {
		this.x += 101;
	} else if (keyString === 'up') {
		this.y -= 83;
	} else if (keyString === 'down') {
		this.y += 83;
	}
};

var allEnemies = []; //Array of active enemies
var retiredEnemies = []; //Array of enemies not in use, recycled for later
var player = new Player(); //Our hero!


// This listens for key presses and sends the keys to your
// Player.handleInput() method. You don't need to modify this.
document.addEventListener('keydown', function(e) {
	var keyCode = e.keyCode;
	var allowedKeys = {
		37: 'left',
		38: 'up',
		39: 'right',
		40: 'down'
	};
	// console.log(e.keyCode + ": " + allowedKeys[e.keyCode]);
	switch (keyCode) {
		case 37:	// |	37-40:
		case 38:	// |	Arrow keys
		case 39:	// V	Handled by player
		case 40:	player.handleInput(allowedKeys[keyCode]);
					break;
	}
	
});
