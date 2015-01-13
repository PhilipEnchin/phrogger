/* Game state */
var Game = function() {
	this.timeRemaining = 0; //Time remaining for showing titles for levels, etc.
	this.state; //Keep track of the state of the game, constants below
	this.lives; //Lives remaining
	this.level; //Level number (starts at 1)
};
/* Game state contants */
Game.prototype.PRE_GAME = 0;//For showing title screen
Game.prototype.PRE_GAME_INSTRUCTIONS = 1; //For showing the instructions before the game starts
Game.prototype.PRE_LEVEL = 2; //For showing the level, before play begins
Game.prototype.PLAY = 3; //Player can play!
Game.prototype.PAUSE_MENU = 4; //Menu when paused
Game.prototype.GAME_OVER = 5; //For when the game is finished, before going back to PRE_GAME
Game.prototype.DIED = 6; //When player has just died...
Game.prototype.WIN_LEVEL = 7; //Player has beat level!
Game.prototype.REINCARNATE = 8; //Player is back at start of level after death
/* Initializer */
Game.prototype.init = function() {
	map.init();
	enemyHandler.init();
	player.init();

	this.setState(this.PRE_GAME);
};
Game.prototype.setState = function(state) {
	this.state = state;
	hud.setState(state);
	map.setState(state);
	enemyHandler.setState(state);
	player.setState(state);
	mapAccessories.setState(state)

	switch (state) {
		case this.PRE_GAME:
			this.lives = 2;
			break;
		case this.PRE_LEVEL:
			this.timeRemaining = 2.0;
			break;
		case this.WIN_LEVEL:
			this.timeRemaining = 2.0;
			map.setRows(0,map.WATER);
			this.setLevel(this.level+1);
			break;
		case this.DIED:
			this.timeRemaining = 3.0;
			break;
		case this.GAME_OVER:
			this.timeRemaining = 3.0;
			break;
	}
};
Game.prototype.handleInput = function(keyString) {
	switch (keyString) {
		case 'up':
		case 'down':
		case 'left':
		case 'right':
			player.handleInput(keyString);
			break;
		case 'pause':
			if (this.state === this.PLAY)
				this.setState(this.PAUSE_MENU);
			else if (this.state === this.PAUSE_MENU)
				this.setState(this.PLAY);
			break;
		case 'space':
			if (this.state === this.PRE_GAME)
				this.setState(this.PRE_GAME_INSTRUCTIONS);
			else if (this.state === this.PRE_GAME_INSTRUCTIONS) {
				this.setLevel(1);
				this.setState(this.PRE_LEVEL);
			}
	}
};
Game.prototype.setLevel = function(newLevel) {
	this.level = newLevel;

	switch (newLevel) {
		case 1:
			map.setRows(
				0,map.WATER,
				2,map.STONE,
				map.GRASS);
			mapAccessories.leftMostRockPosition = 0;
			mapAccessories.leftMostKeyPosition = 0;
			enemyHandler.setSpeeds(250,300);
			enemyHandler.setSpawnIntervalAndVariance(0.75,0.8);
			break;
		case 2:
			map.setRows(
				1,map.STONE,
				2,map.GRASS
			);
			mapAccessories.leftMostRockPosition = 3;
			mapAccessories.leftMostKeyPosition = 2;
			break;
		case 3:
			map.setRows(3,map.STONE);
			enemyHandler.setSpawnIntervalAndVariance(0.4,0.6);
			enemyHandler.setSpeeds(225,325);
			break;
		case 4:
			map.setRows(4,map.STONE);
			mapAccessories.leftMostRockPosition = 3;
			enemyHandler.setSpawnIntervalAndVariance(0.25,0.4);
			break;
		case 5:
			map.setRows(
				2,map.STONE,
				3,map.GRASS);
			break;
		case 6:
			map.setRows(
				1,map.GRASS,
				3,map.STONE
			);
			mapAccessories.leftMostRockPosition = 0;
			break;
		case 7:
			map.setRows(
				1,map.STONE,
				4,map.GRASS
			);
			mapAccessories.leftMostKeyPosition = 3;
			break;
		case 8:
			map.setRows(4,map.STONE);
			break;
	}
};
Game.prototype.died = function() {
	if(--this.lives >= 0)
		this.setState(this.PRE_LEVEL);
	else
		this.setState(this.GAME_OVER);
};
Game.prototype.decrementTimer = function(dt){
	if ((this.timeRemaining -= dt) <= 0) {
		switch (this.state) {
			case this.PRE_LEVEL: this.setState(this.PLAY); break;
			case this.GAME_OVER: this.setState(this.PRE_GAME); break;
			case this.WIN_LEVEL: this.setState(this.PRE_LEVEL); break;
			case this.DIED:	this.died(); break;
			case this.GAME_OVER: this.setState(this.PRE_GAME); break;
		}
	}
};
Game.prototype.update = function(dt,now) {
	enemyHandler.update(dt,now);
	player.update(dt,now);
	map.update(dt,now);

	this.decrementTimer(dt);
};
Game.prototype.render = function() {
	ctx.clearRect(0,0,canvas.width,canvas.height);
	map.render();
	mapAccessories.render();
	player.render();
	enemyHandler.render();
	hud.render();
};
var Map = function() {
	this.tileTypes = []; //2D array of tile-types
	this.tileCoordinates = []; //2D array of tile coordinates, for speedy access!
	this.roadRowNumbers = []; //Array of row indices where road is found
	this.pendingTileChanges = { //Object that stores tiles that will be changed via animation
		status: null, //Status (constants defined below)
		changes: [] //Objects containing change information
	};
}
Map.prototype.ROWS = 6;
Map.prototype.COLS = 5;
Map.prototype.ROW_HEIGHT = 83;
Map.prototype.COL_WIDTH = 101;
Map.prototype.WATER = 0; // \
Map.prototype.STONE = 1; // |--Corresponds with image array indices
Map.prototype.GRASS = 2; // /
Map.prototype.IMAGE_ARRAY = ['images/water-block.png','images/stone-block.png','images/grass-block.png'];
Map.prototype.PENDING_CONTAINS_NEW_CHANGES = 0;
Map.prototype.PENDING_READY = 1;
Map.prototype.PENDING_EMPTY = 2;
/* Initialize top row to water, the rest to grass */
Map.prototype.init = function() {
	var row, col;
	var rowTypes = [];
	for (row = 0; row < this.ROWS; row++) {
		if (row === 0)
			rowTypes.push(this.WATER);
		else
			rowTypes.push(this.GRASS);
	}
	for (col = 0; col < this.COLS; col++) { //Initialize tileTypes and tileCoordinates grids
		this.tileCoordinates.push([]);
		this.tileTypes.push([]);
		var colPixel = col * this.COL_WIDTH;
		for (row = 0; row < this.ROWS; row++) {
			var coordinates = {
				x: col * this.COL_WIDTH,
				y: row * this.ROW_HEIGHT
			};
			this.tileCoordinates[col].push(coordinates);
			this.tileTypes[col].push(rowTypes[row]);
		}
	}
	this.pendingTileChanges.status = this.PENDING_EMPTY;
};
Map.prototype.setState = function(state) {
	switch (state) {
		case game.PRE_GAME:
			this.setRows(
				0,map.WATER,
				[1,2,3,4],map.STONE,
				map.GRASS
			);
			break;
	}
};
Map.prototype.pixelCoordinatesForBoardCoordinates = function(colNumber, rowNumber) {
	var newCoordinates = {};
	var coordinates = this.tileCoordinates[colNumber][rowNumber];
	for (var key in coordinates) {
		if (coordinates.hasOwnProperty(key))
			newCoordinates[key] = coordinates[key];
	}
	return newCoordinates;
};
/*Takes an arbitrary number of arguments. Each pair is either:
	- a row number and tile type, or
	- an array of row numbers and a tile type
  If there is an odd number of arguments, the final one is a tile type,
  and all remaining rows are set to that type.*/
Map.prototype.setRows = function() {
	var args = Array.prototype.slice.call(arguments);
	var remainingRows = []; //Rows not set yet, in the event of 
	var rowArray, tileType;
	for (var i = this.ROWS - 1; i >= 0; i--) {
		remainingRows.splice(0,0,i);
	};
	while(args.length > 1){
		if (args[0].constructor === Number)
			rowArray = [args.splice(0,1)[0]];
		else
			rowArray = args.splice(0,1)[0];
		tileType = args.splice(0,1)[0];
		for (var i = rowArray.length - 1; i >= 0; i--) {
			this.setRow(rowArray[i],tileType);
			remainingRows.splice(remainingRows.indexOf(rowArray[i]),1);
		};
	}
	if (args.length > 0){
		tileType = args[0];
		while (remainingRows.length > 0) 
			this.setRow(remainingRows.pop(),tileType);
	}
};
Map.prototype.setRow = function(rowNumber, tileType) {
	if (tileType === this.STONE) {
		if (this.roadRowNumbers.indexOf(rowNumber) === -1) {
			this.roadRowNumbers.push(rowNumber);
		} else {
			return; //Road is already set up in this row
		}
	} else {
		var rowArrayIndex = this.roadRowNumbers.indexOf(rowNumber);
		if (rowArrayIndex !== -1) { //This row is going from road to something else
			/*enemyHandler.deleteEnemiesInRow(*/this.roadRowNumbers.splice(rowArrayIndex,1);/*[0]);*/
		}
	}
	for (var col = this.COLS-1; col >= 0; col--) {
		this.setTile(col,rowNumber,tileType);
	}
};
Map.prototype.setTile = function(colNumber, rowNumber, tileType) {
	switch (game.state) {
		case game.PLAY:
		case game.PRE_GAME:
			this.tileTypes[colNumber][rowNumber] = tileType;
			break;
		default:
			if (this.tileTypes[colNumber][rowNumber] != tileType)
				this.addTileChangeToPending(colNumber,rowNumber,tileType);
	}
};
Map.prototype.addTileChangeToPending = function(colNumber, rowNumber, tileType) {
	this.pendingTileChanges.changes.push({
		location: {
			column: colNumber,
			row: rowNumber
		},
		tileType: tileType,
		time: Math.random()
	});
	this.pendingTileChanges.status = this.PENDING_CONTAINS_NEW_CHANGES;
};
Map.prototype.update = function(dt,now) {
	var changes;
	switch (this.pendingTileChanges.status) {
		case this.PENDING_EMPTY: break;
		case this.PENDING_CONTAINS_NEW_CHANGES:
			changes = this.pendingTileChanges.changes;
			changes.sort(function(a,b){
				return a.time-b.time;
			});
			//Use the randomly generated values as delta-time, and replace those with total time
			var previousValue = 0;
			var totalTime = changes[changes.length-1].time;
			changes.forEach(function(change){
				previousValue = change.time += previousValue;
			});
			totalTime += previousValue;
			//Scale the time to fit the time remaining
			changes.forEach(function(change){
				change.time *= game.timeRemaining * 9 / totalTime / 10;
				change.time += now;
			});
			this.pendingTileChanges.status = this.PENDING_READY;
		case this.PENDING_READY:
			changes = this.pendingTileChanges.changes;
			var change, location;
			while (changes.length > 0 && now >= changes[0].time) {
				change = changes.splice(0,1)[0];
				location = change.location;
				this.tileTypes[location.column][location.row] = change.tileType;
			}
			if (changes.length === 0)
				this.pendingTileChanges.status = this.PENDING_EMPTY;
	}
};
Map.prototype.randomRoadYCoordinate = function() {
	return this.pixelCoordinatesForBoardCoordinates(0,this.roadRowNumbers[Math.floor(Math.random()*this.roadRowNumbers.length)]).y;
};
/*
Map.prototype.randomRoadCoordinates = function() {
	var coordinates = this.pixelCoordinatesForBoardCoordinates(Math.floor(Math.random()*this.COLS),0);
	coordinates.y = this.randomRoadYCoordinate();
	return coordinates;
};
Map.prototype.randomCoordinatesInRows = function() {
	var args = Array.prototype.slice.call(arguments);
	var rowNumber;
	if (args.length === 0)
		rowNumber = Math.floor(Math.random*this.ROWS);
	else if (args[0].constructor === Array)
		rowNumber = args[0][Math.floor(Math.random()*args.length)];
	else
		rowNumber = args[Math.floor(Math.random()*args.length)];
	return this.pixelCoordinatesForBoardCoordinates(Math.floor(Math.random()*this.COLS),rowNumber);
};
*/
Map.prototype.randomRoadBoardLocation = function() {
	return {
		column: Math.floor(Math.random()*map.COLS),
		row: this.roadRowNumbers[Math.floor(Math.random()*this.roadRowNumbers.length)]
	};
};
Map.prototype.randomBoardLocationInRows = function() {
	var args = Array.prototype.slice.call(arguments);
	var rowNumber
	if (args.length === 0)
		rowNumber = Math.floor(Math.random()*this.ROWS);
	else if (args[0].constructor === Array)
		rowNumber = args[0][Math.floor(Math.random()*args.length)];
	else
		rowNumber = args[Math.floor(Math.random()*args.length)];
	return {
		column: Math.floor(Math.random()*this.COLS),
		row: rowNumber
	};
};
Map.prototype.playerCanMoveHere = function(x,y) {
	if (mapAccessories.playerCanMoveHere(x,y) && x < this.COLS && x >= 0 && y < this.ROWS && y >= 0){
		if (y === 0 && this.tileTypes[x][y] !== this.WATER)
			game.setState(game.WIN_LEVEL);
		return true;
	}
	return false;
};
Map.prototype.render = function() {
	var coordinates;
	for (var row = 0; row < this.ROWS; row++) {
		for (var col = 0; col < this.COLS; col++) {
			//ctx.drawImage(Resources.get(rowImages[row]), col * this.COL_WIDTH, row * this.ROW_HEIGHT);
			coordinates = this.tileCoordinates[col][row];
			ctx.drawImage(Resources.get(this.IMAGE_ARRAY[this.tileTypes[col][row]]), coordinates.x, coordinates.y);
		};
	};
};

var MapAccessories = function() {
	this.accessories = [];
	this.rockAccessory;
	this.keyAccessory;
	this.hidden = true;
	this.leftMostRockPosition = 0;
	this.leftMostKeyPosition = 0;
}
MapAccessories.prototype.KEY = 0;
MapAccessories.prototype.ROCK = 1;
MapAccessories.prototype.IMAGE_ARRAY = ['images/Key.png','images/Rock.png'];
MapAccessories.prototype.ROCK_PIXEL_ADJUST = -25;
MapAccessories.prototype.KEY_PIXEL_ADJUST = -15;
MapAccessories.prototype.placeKeyAndRock = function() {
	if (this.accessories.indexOf(this.rockAccessory) !== -1 && this.accessories.indexOf(this.keyAccessory) !== -1 )
		return;
	var rockLocation = map.randomBoardLocationInRows(0);
	while (rockLocation.column < this.leftMostRockPosition)
		rockLocation = map.randomBoardLocationInRows(0);
	map.setTile(rockLocation.column,rockLocation.row,map.STONE);
	this.rockAccessory = {
		accessoryType: this.ROCK,
		location: rockLocation,
		coordinates: map.pixelCoordinatesForBoardCoordinates(rockLocation.column,rockLocation.row)
	};
	this.rockAccessory.coordinates.y += this.ROCK_PIXEL_ADJUST;
	var keyLocation = map.randomRoadBoardLocation();
	while (keyLocation.column < this.leftMostKeyPosition)
		keyLocation = map.randomRoadBoardLocation();
	this.keyAccessory = {
		accessoryType: this.KEY,
		location: keyLocation,
		coordinates: map.pixelCoordinatesForBoardCoordinates(keyLocation.column,keyLocation.row)
	};
	this.keyAccessory.coordinates.y += this.KEY_PIXEL_ADJUST;
	this.accessories.splice(0,0,this.rockAccessory,this.keyAccessory);
};
MapAccessories.prototype.playerCanMoveHere = function(x,y) {
	if (this.rockAccessory && this.rockAccessory.location.column === x && this.rockAccessory.location.row === y)
		return false;
	else if (this.keyAccessory.location.column === x && this.keyAccessory.location.row === y){
		this.accessories.splice(this.accessories.indexOf(this.rockAccessory),1);
		this.accessories.splice(this.accessories.indexOf(this.keyAccessory),1);
		this.rockAccessory = null;
	}
	return true;
};
MapAccessories.prototype.setState = function(state) {
	switch(state) {
		case game.PRE_LEVEL:
			this.hidden = true;
			this.placeKeyAndRock();
			break;
		case game.PLAY:
		case game.DIED:
			this.hidden = false;
			break;
		case game.GAME_OVER:
			this.hidden = true;
			this.rockAccessory = null;
			this.keyAccessory = null;
			this.accessories = [];
		default:
			this.hidden = true;
	}
};
MapAccessories.prototype.render = function() {
	if (!this.hidden)
		this.accessories.forEach(function(accessoryObject){
			ctx.drawImage(Resources.get(this.IMAGE_ARRAY[accessoryObject.accessoryType]),accessoryObject.coordinates.x,accessoryObject.coordinates.y);
		},this);
};
/* Heads up display strings */
var gameTitle = 'PHROGGER';
var gameInstructions = ['Use arrow keys to get across the road','Don\'t forget to grab the key!','Press P to pause','','When you\'re ready, hit the spacebar'];
var levelPrefix = 'LEVEL: ';
var livesPrefix = 'LIVES: ';
var TITLE_TEXT_SIZE = 80;
var PAUSED_TEXT_SIZE = 36;
var WIN_LEVEL_TEXT_SIZE = 28;
var PRE_LEVEL_TEXT_SIZE = 48;
var LEVEL_TEXT_SIZE = 16;
var LIVES_TEXT_SIZE = 16;
var INSTRUCTION_TEXT_SIZE = 20;
var INSTRUCTION_LINE_HEIGHT = 24;
/* Heads up display - lives remaining, level number...*/
var HeadsUp = function() {
	this.levelText; //Bottom left corner
	this.livesText; //Bottom right corner
	this.bigText; //Front and center, for introducing levels, etc.
	this.bigTextSize; //The size of the "big" text for game title, level titles, etc.
	this.instructionText; //Instructions
};
HeadsUp.prototype.setState = function(state) {
	switch (state) {
		case game.PRE_GAME:
			this.levelText = '';
			this.livesText = '';
			this.bigText = gameTitle;
			this.bigTextSize = TITLE_TEXT_SIZE;
			this.instructionText = 'Press spacebar to begin';
			break;
		case game.PRE_GAME_INSTRUCTIONS:
			this.bigText = '';
			this.instructionText = gameInstructions;
			break;
		case game.PRE_LEVEL:
			this.bigText = levelPrefix + game.level;
			this.instructionText = livesPrefix + game.lives;
			this.bigTextSize = PRE_LEVEL_TEXT_SIZE;
			this.levelText = '';
			this.livesText = '';
			break;
		case game.PLAY:
			this.levelText = levelPrefix + game.level;
			this.livesText = livesPrefix + game.lives;
			this.bigText = '';
			this.instructionText = '';
			break;
		case game.PAUSE_MENU:
			this.bigText = 'PAUSED';
			this.bigTextSize = PAUSED_TEXT_SIZE;
			break;
		case game.WIN_LEVEL:
			var winTextArray = ['Nicely done!','You rock!','Ka-Blamo'];
			this.bigText = winTextArray[Math.floor(Math.random()*winTextArray.length)];
			break;
		case game.DIED:
			var dieTextArray = ['You died','You expired','You perished','Kicked the bucket','Croaked','Bought it','Bought the farm','Checked out early'];
			this.bigText = dieTextArray[Math.floor(Math.random()*dieTextArray.length)];
			break;
		case game.GAME_OVER:
			this.bigText = 'Game over';
			this.instructionText = 'So sad';
			break;
	}
};
/* Helper function to display text with an outline */

HeadsUp.prototype.BIG_TEXT_X = 505/2;
HeadsUp.prototype.BIG_TEXT_Y = 606/2 - 20;
HeadsUp.prototype.INSTRUCTIONS_X = 505/2;
HeadsUp.prototype.INSTRUCTIONS_Y = 606/2 + 20;
HeadsUp.prototype.LEVEL_X = 0;
HeadsUp.prototype.LEVEL_Y = (Map.prototype.ROWS + 1) * Map.prototype.ROW_HEIGHT + 25;
HeadsUp.prototype.LIVES_X = Map.prototype.COLS * Map.prototype.COL_WIDTH;
HeadsUp.prototype.LIVES_Y = (Map.prototype.ROWS + 1) * Map.prototype.ROW_HEIGHT + 25;
HeadsUp.prototype.TYPEFACE = 'Impact';
HeadsUp.prototype.render = function() {
	if (this.bigText){
		this.renderText(this.bigText,this.BIG_TEXT_X,this.BIG_TEXT_Y,TITLE_TEXT_SIZE,this.TYPEFACE,'center');
	}
	if (this.instructionText){
		if(this.instructionText.constructor == Array){
			for (var i = this.instructionText.length - 1; i >= 0; i--) {
				this.renderText(this.instructionText[i],this.INSTRUCTIONS_X,INSTRUCTION_LINE_HEIGHT*i + this.INSTRUCTIONS_Y,INSTRUCTION_TEXT_SIZE,this.TYPEFACE,'center');
			}
		} else {
			this.renderText(this.instructionText,this.INSTRUCTIONS_X,this.INSTRUCTIONS_Y,INSTRUCTION_TEXT_SIZE,this.TYPEFACE,'center');
		}
	}
	if (this.levelText){
		this.renderText(this.levelText,this.LEVEL_X,this.LEVEL_Y,LEVEL_TEXT_SIZE,this.TYPEFACE,'left');
	}
	if (this.livesText){
		this.renderText(this.livesText,this.LIVES_X,this.LIVES_Y,LIVES_TEXT_SIZE,this.TYPEFACE,'right');
	}
};
HeadsUp.prototype.renderText = function(text,x,y,textSize,typeface,alignment) {
	ctx.font = textSize + 'pt ' + typeface;
	ctx.textAlign = alignment;
	ctx.fillText(text,x,y,canvas.width);
	ctx.strokeText(text,x,y,canvas.width);
};


// Enemies our player must avoid
var Enemy = function() {
	this.sprite = 'images/enemy-bug.png'; //The image used for enemies
	this.x; //| X and Y     |
	this.y; //| coordinates |
	this.speed; //Speed, in pixels per second
	this.hidden;
}
Enemy.prototype.PIXEL_ADJUST = -20; //Adjustment in bug's vertical location so it looks like it's on the road
Enemy.prototype.EDGE_ADJUST_RIGHT = 5; //Adjustment in bug's right (leading) side for collision detection
Enemy.prototype.EDGE_ADJUST_LEFT = 36; //Adjustment in bug's left (trailing) side for collision detection
Enemy.prototype.init = function(x, y, lowerSpeedLimit, upperSpeedLimit) {
	this.speed = Math.random() * (upperSpeedLimit - lowerSpeedLimit) + lowerSpeedLimit;
	this.x = x;
	this.y = y + this.PIXEL_ADJUST;
	this.hidden = false;
};
// Update the enemy's position
Enemy.prototype.update = function(dt,now) {
	this.x += this.speed * dt;
};

// Draw the enemy on the screen
Enemy.prototype.render = function() {
	if (!this.hidden)
		ctx.drawImage(Resources.get(this.sprite), this.x, this.y);
};

/* A system for dealing with the evil bugs! */
var EnemyHandler = function(){
	this.activeEnemies = [];	//Array to hold current enemies
	this.retiredEnemies = [];	//Array to hold enemies that made it across, to be recycled
	this.spawnInterval = 1.5; //Average time between enemy spawns
	this.spawnVariance = 0.25; //Variance in time between spawns - fraction of this.spawnInterval
	this.timeUntilSpawn = 1.5; //Time until next spawn (regenerated every spawn)
	this.moveable = true; //Are enemies moving (not when paused, for instance)
	this.hidden = false; //Are enemies visible (not when paused, for instance)
	this.activeEnemiesByRow = {}; // Keys are the Y coordinates for road rows. Values are [{enemy:,entryTimes:[timesPerCol],exitTimes:[timesPerCol]},[etc.]]
	this.potentialCollisionLocation = { //Last reported location of player, used when new a new collision time is required
		column: null,
		rowIndex: null
	};
	this.timePaused = 0; //Used to keep a running total of how much time the game is paused, to adjust retirement, entry and collision times.
};
EnemyHandler.prototype.init = function() {
	this.spawnX = map.pixelCoordinatesForBoardCoordinates(0,0).x - map.COL_WIDTH;
	this.retireX = map.pixelCoordinatesForBoardCoordinates(map.COLS-1,0).x + map.COL_WIDTH;
};
EnemyHandler.prototype.maxSpawnAttempts = 10;
EnemyHandler.prototype.setState = function(state) {
	switch (state) {
		case game.PRE_GAME:
			this.moveable = true;
			this.hidden = false;
			this.setSpeeds(200,500);
			this.setSpawnIntervalAndVariance(0.3,0.5);
			break;
		case game.PRE_GAME_INSTRUCTIONS:
			this.moveable = true;
			this.hidden = false;
			break;
		case game.PRE_LEVEL:
			this.moveable = true;
			this.hidden = false;
			break;
		case game.PLAY:
			this.moveable = true;
			this.hidden = false;
			break;
		case game.PAUSE_MENU:
			this.moveable = false;
			this.hidden = true;
			break;
		case game.DIED:
			this.moveable = false;
			this.hidden = false;
			break;
	}
};
EnemyHandler.prototype.setSpawnIntervalAndVariance = function(spawnInterval,spawnVariance) {
	if (this.timeUntilSpawn > (this.spawnInterval = spawnInterval) * ((this.spawnVariance = spawnVariance) + 1))
		this.newTimeUntilSpawn();
};
EnemyHandler.prototype.setSpeeds = function(lowerSpeedLimit,upperSpeedLimit,changeActiveEnemies) {
	this.lowerSpeedLimit = lowerSpeedLimit;
	this.upperSpeedLimit = upperSpeedLimit;
	if(changeActiveEnemies) {
		this.activeEnemies.forEach(function(enemyObject){
			if (enemyObject.enemy.speed < lowerSpeedLimit || enemyObject.enemy.speed > upperSpeedLimit)
				enemyObject.enemy.speed = Math.random() * upperSpeedLimit + lowerSpeedLimit;
		});
	}
};
EnemyHandler.prototype.update = function(dt,now) {
	if (this.moveable) {
		if (this.timePaused > 0) { //If the game has been paused, add that time onto the active enemies
			this.activeEnemies.forEach(function(enemyObject){
				enemyObject.retireTime += this.timePaused;
			}, this);
			map.roadRowNumbers.forEach(function(i){
				var rowIndex = map.pixelCoordinatesForBoardCoordinates(0,i).y + Enemy.prototype.PIXEL_ADJUST;
				if (this.activeEnemiesByRow[rowIndex] !== undefined) {
					this.activeEnemiesByRow[rowIndex].forEach(function(enemyObject){
						for (var i = enemyObject.entryTimes.length - 1; i >= 0; i--) {
							enemyObject.entryTimes[i] += this.timePaused;
						}
						for (var i = enemyObject.exitTimes.length - 1; i >= 0; i--) {
							enemyObject.exitTimes[i] += this.timePaused;
						}
					}, this);
				}
			}, this);
			player.addPauseTimeToCollision(this.timePaused);
			this.timePaused = 0;

		}
		var retiredEnemy;
		while (this.activeEnemies.length > 0 && now >= this.activeEnemies[0].retireTime) {
			//This will result in some enemies that are not retired immediately when they leave the visible area,
			//but it avoids the overhead of sorting the enemy objects within this.activeEnemies
			retiredEnemy = this.activeEnemies.splice(0,1)[0];
			this.retiredEnemies.push(retiredEnemy);
			this.activeEnemiesByRow[retiredEnemy.enemy.y].splice(0,1);
		}
		for (var i = this.activeEnemies.length - 1; i >= 0; i--) {
			this.activeEnemies[i].enemy.update(dt,now);
		}
		if ( (this.timeUntilSpawn -= dt) <= 0 ) { //Spawn a new enemy if the time is right
			this.spawnNewEnemy();
		}
	} else {
		this.timePaused += dt;
	}
};
/*EnemyHandler.prototype.deleteEnemiesInRow = function(rowNumber) {
	var rowIndex = map.pixelCoordinatesForBoardCoordinates(0,rowNumber).y + Enemy.prototype.PIXEL_ADJUST;
	var rowOfEnemies = this.activeEnemiesByRow[rowIndex];
	if (rowOfEnemies !== undefined)
		rowOfEnemies.forEach(function(enemyObject){
			//Technically this just hides the enemy, but the collisions won't be checked since they aren't on road anymore
			enemyObject.enemy.hidden = true;
		});
};*/
EnemyHandler.prototype.getNewEnemy = function() {
	var newEnemy;
	if (!(newEnemy = this.retiredEnemies.pop()))
		newEnemy = {
			enemy: new Enemy(),
			retireTime: null
		};
	var yCoordinate = map.randomRoadYCoordinate();
	newEnemy.enemy.init(this.spawnX, yCoordinate, this.lowerSpeedLimit, this.upperSpeedLimit);
	return newEnemy;
};
EnemyHandler.prototype.spawnNewEnemy = function(attemptIndex) {
	if((attemptIndex = attemptIndex || 0) < this.maxSpawnAttempts) {
		var enemyObjectWithRetireTime = this.getNewEnemy();
		var nakedEnemy = enemyObjectWithRetireTime.enemy;
		var enemyObjectWithEntryAndExitTimes = this.packageEnemyWithEntryAndExitTimes(nakedEnemy);
		var entryTimes = enemyObjectWithEntryAndExitTimes.entryTimes;
		var rowIndex = nakedEnemy.y;
		var retireTime = entryTimes[map.COLS+1];
		var rowOfEnemies = this.activeEnemiesByRow[rowIndex];
		if (rowOfEnemies === undefined) {
			rowOfEnemies = [];
			this.activeEnemiesByRow[rowIndex] = rowOfEnemies;
		}
	
		if (rowOfEnemies.length > 0){
			var leftMostEnemyEntryTimes = rowOfEnemies[rowOfEnemies.length-1].entryTimes;
			var leftMostEnemyInRowExitCompletion = leftMostEnemyEntryTimes[map.COLS+1];
			var newEnemyExitBegin = entryTimes[map.COLS];
			if (newEnemyExitBegin < leftMostEnemyInRowExitCompletion) {
				this.spawnNewEnemy(attemptIndex+1);
				return;
			}
			var leftMostEnemyInRowSecondColumnEntry = leftMostEnemyEntryTimes[1];
			var newEnemyFirstColumnEntry = entryTimes[0];
			if (newEnemyFirstColumnEntry < leftMostEnemyInRowSecondColumnEntry) {
				this.spawnNewEnemy(attemptIndex+1);
				return;
			}
		}
		if (this.potentialCollisionLocation.rowIndex === rowIndex)
			player.newEnemyInRow(entryTimes[this.potentialCollisionLocation.column]);
	
	
		//Push new enemy onto the appropriate row. Order here is guaranteed already.
		this.activeEnemiesByRow[rowIndex].push(enemyObjectWithEntryAndExitTimes);
	
		enemyObjectWithRetireTime.retireTime = retireTime;
		this.activeEnemies.push(enemyObjectWithRetireTime);
	}
	this.newTimeUntilSpawn();
};
EnemyHandler.prototype.newTimeUntilSpawn = function() {
	this.timeUntilSpawn = this.spawnInterval * (this.spawnVariance * (2 * Math.random() - 1) + 1);
};
EnemyHandler.prototype.packageEnemyWithEntryAndExitTimes = function(enemy) {
	var entryTimes = [];
	var exitTimes = [];
	var secondsPerColumn = map.COL_WIDTH / enemy.speed;
	var secondsPerEntryEdgeAdjustWidth = (enemy.EDGE_ADJUST_RIGHT + player.EDGE_ADJUST_LEFT) / enemy.speed;
	var secondsPerExitEdgeAdjustWidth = (enemy.EDGE_ADJUST_LEFT + player.EDGE_ADJUST_RIGHT) / enemy.speed; 
	var now = Date.now() / 1000;
	for (var col = map.COLS + 1; col >= 0; col--) {
		entryTimes.splice(0, 0, col * secondsPerColumn + secondsPerEntryEdgeAdjustWidth + now);
		exitTimes.splice(0, 0, (col+2) * secondsPerColumn - secondsPerExitEdgeAdjustWidth + now);
	};
	return {
		enemy: enemy,
		entryTimes: entryTimes,
		exitTimes: exitTimes
	};
};
EnemyHandler.prototype.collisionTimeForCoordinates = function(x,y) {
	if(x === undefined) {
		this.potentialCollisionLocation.column = null;
		this.potentialCollisionLocation.rowIndex = null;
		return null;
	}
	var rowIndex = map.pixelCoordinatesForBoardCoordinates(x,y).y + Enemy.prototype.PIXEL_ADJUST;

	this.potentialCollisionLocation.column = x;
	this.potentialCollisionLocation.rowIndex = rowIndex;

	var rowOfEnemies = this.activeEnemiesByRow[rowIndex];
	if (rowOfEnemies === undefined)
		return;
	
	var enemyObject;
	var columnEntry; 
	var columnExit;
	var now = Date.now() / 1000;

	for (var i = 0; i < rowOfEnemies.length; i++) {
		enemyObject = rowOfEnemies[i];
		columnEntry = enemyObject.entryTimes[x];
		columnExit = enemyObject.exitTimes[x];
		if (columnEntry > now){
			return columnEntry;
		} else if (columnExit > now) {
			player.die();
			return;
		}
	}
	return;
};
EnemyHandler.prototype.render = function() {
	if (!this.hidden) {
		this.activeEnemies.forEach(function(enemyObject){
			enemyObject.enemy.render();
		});
	}
};

// The player
var Player = function() {
	this.sprite = 'images/char-boy.png';
	this.row = 4;
	this.column = 1;
	this.hidden = false;
	this.moveable = false;
	this.collisionTime; //First possible collision time for current board location
	this.collisionDetectionOn = false;
};
Player.prototype.PIXEL_ADJUST = -15; //Adjustment in player's vertical location so it appears to be on the tile
Player.prototype.EDGE_ADJUST_RIGHT = 29; //Adjustment in player's right side for collision detection
Player.prototype.EDGE_ADJUST_LEFT = 30; //Adjustment in player's left side for collision detection
Player.prototype.init = function() {
	this.setPosition(this.column, this.row);
};
Player.prototype.setState = function(state) {
	switch (state) {
		case game.PRE_GAME:
			this.hidden = false;
			this.moveable = false;
			this.setPosition((map.COLS-1)/2,map.ROWS-1);
			this.collisionDetectionOn = false;
			break;
		case game.PRE_GAME_INSTRUCTIONS:
		case game.PRE_LEVEL:
			this.hidden = false;
			this.moveable = false;
			this.setPosition((map.COLS-1)/2,map.ROWS-1);
			break;
		case game.PLAY:
			this.collisionDetectionOn = true;
			this.hidden = false;
			this.moveable = true;
			break;
		case game.PAUSE_MENU:
			this.collisionDetectionOn = false;
			this.hidden = true;
			this.moveable = false;
			break;
		case game.DIED:
			this.collisionDetectionOn = false;
			this.hidden = false;
			this.moveable = false;
		case game.WIN_LEVEL:
			this.collisionDetectionOn = false;
			this.moveable = false;
			this.hidden = false;
	}
};
// Update the player's position
Player.prototype.update = function(dt,now) {
	if (this.collisionDetectionOn && this.collisionTime && now > this.collisionTime) {
		this.die();
	}
};
// Draw the player on the screen
Player.prototype.render = function() {
	if (!this.hidden)
		ctx.drawImage(Resources.get(this.sprite), this.x, this.y);
};
Player.prototype.setPosition = function(x,y) {
	if (x !== undefined)
		this.column = Math.min(Math.max(x,0),map.COLS-1);
	if (y !== undefined)
		this.row = Math.min(Math.max(y,0),map.ROWS-1);
	var coordinates = map.pixelCoordinatesForBoardCoordinates(this.column, this.row);
	this.x = coordinates.x;
	this.y = coordinates.y + this.PIXEL_ADJUST;

	switch (map.tileTypes[this.column][this.row]) {
		case map.STONE:
			this.collisionTime = enemyHandler.collisionTimeForCoordinates(this.column,this.row);
			break;
		case map.WATER:
			this.die();
		case map.GRASS:
			this.collisionTime = enemyHandler.collisionTimeForCoordinates();
			break;
	}
};
Player.prototype.newEnemyInRow = function(collisionTime) {
	if (!this.collisionTime)
		this.collisionTime = collisionTime;
};
Player.prototype.addPauseTimeToCollision = function(timePaused) {
	if (this.collisionTime)
		this.collisionTime += timePaused;
};
Player.prototype.die = function() {
	game.setState(game.DIED);
};
// Handle keyboard input for the movement of the player
Player.prototype.handleInput = function(keyString) {
	if (this.moveable) {
		switch (keyString) {
			case 'left':
			case 'right':
			case 'up':
			case 'down':	this.move(keyString);	break;
		}
	}
};
//Handle player movement
Player.prototype.move = function(directionString) {
	var x = this.column, y = this.row;
	switch(directionString) {
		case 'left': x--; break;
		case 'right': x++; break;
		case 'up': y--; break;
		case 'down': y++; break;
	}
	if(map.playerCanMoveHere(x,y))
		this.setPosition(x,y);
};

var map = new Map();
var mapAccessories = new MapAccessories();
var enemyHandler = new EnemyHandler();
var hud = new HeadsUp();
var player = new Player();
var game = new Game(); //Game object - keeps track of game state, deals with settings for levels, etc.
game.init(); //Initializes the game, as well as the associated objects (player, map, etc.)


// This listens for key presses and sends the keys to your
// Player.handleInput() method. You don't need to modify this.
document.addEventListener('keydown', function(e) {
	var allowedKeys = {
		32: 'space',
		37: 'left',
		38: 'up',
		39: 'right',
		40: 'down',
		80: 'pause',
	};
	var keyString = allowedKeys[e.keyCode];
	if (keyString !== undefined)
		game.handleInput(keyString);
});
