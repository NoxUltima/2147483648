function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 2;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));
  if (this.size < 4)
  {
    var lasttileclass = Math.pow(2, (this.size * (this.size + 1))/2)
  }
  else
  {
    var lasttileclass = Math.pow(2, (this.size * (this.size + 1))/2 + 1)
  }

  this.setup();
}

// Restart the game
GameManager.prototype.restart = function () {
  this.storageManager.clearGameState();
  this.actuator.continueGame(); // Clear the game won/lost message
  this.setup();
};

// Keep playing after winning (allows going over 2048)
GameManager.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.actuator.continueGame(); // Clear the game won/lost message
};

// Return true if the game is lost, or has won and the user hasn't kept playing
GameManager.prototype.isGameTerminated = function () {
  return this.over || (this.won && !this.keepPlaying);
};

// Set up the game
GameManager.prototype.setup = function () {
  var previousState = this.storageManager.getGameState();

  // Reload the game from a previous game if present
  if (1>2) {
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid.cells); // Reload grid
    this.score       = previousState.score;
    this.over        = previousState.over;
    this.won         = previousState.won;
    this.keepPlaying = previousState.keepPlaying;
  } else {
    this.grid        = new Grid(this.size);
    this.score       = 0;
    this.over        = false;
    this.won         = false;
    this.keepPlaying = false;

    // Add the initial tiles
    this.addStartTiles();
  }

  // Update the actuator
  this.actuate();
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

// Adds a well-tempered tile in a random position
  // Define the following terms:
  var sum = Math.round(Math.random() * 1000); // more like dis.gred.soom()
  var myArray = [2, 3, -2, -3, 4, 6, -4, -6, 5, 10, -5, -10, 0];
  var dynamic = 50 - Math.abs(sum/3);
  var rand = myArray[Math.floor(Math.random() * myArray.length)];

  // Smart generation of numbered and lettered tiles.
  var smart = Math.random() < 0.9 ? 
  String.fromCharCode(65 + Math.abs(Math.floor(Math.random() * sum/10))) : 
  String.fromCharCode(65 + Math.abs(Math.floor(Math.random() * sum/10)));

  // Goes with the normal tile spawns. 2048 + Threes! 'Cause why not!
  var dumb = Math.random() < 0.5 ? (Math.random() < 0.5 ? 
  (Math.random() < 0.9 ? rand*Math.pow(2,0) : rand*Math.pow(2,1)) : 
  (Math.random() < 0.9 ? -rand*Math.pow(2,0) : -rand*Math.pow(2,1))) :
  (Math.random() < 0.5 ? (Math.random() < 0.9 ? rand*Math.pow(2,0) : rand*Math.pow(2,1)) : 
  (Math.random() < 0.9 ? -rand*Math.pow(2,0) : -rand*Math.pow(2,1)));

  // This function spawns zero tiles that merge with one another.
  var zero = (Math.abs(sum) < 40) ? 
  (Math.floor(Math.random()*2)*2 -0) : 
  - sum / Math.abs(sum);

  // Spawns smart numbered tiles on the grid.
  if (this.grid.cellsAvailable()) {
    var self = this;
    var bvalue = sum;
    var bcell = this.grid.randomAvailableCell();

    for (var i = 0; i < 8; i++) {
      var cell = this.grid.randomAvailableCell();

      function check(x, y, dx, dy) {
        if (x < 0 || y < 0 || x >= self.grid.size || y >= self.grid.size) return;

        if (
          !!self.grid.cells[cell.x + x]
          &&
          !!self.grid.cells[cell.x + x][cell.y + y]
        ) {
          var tocheck = self.grid.cells[cell.x + x][cell.y + y];
          if (Math.random() < 0.8 && tocheck.value < bvalue) {
            bcell = cell;
            bvalue = tocheck.value;
          }
        } else check(x + dx, y + dy, dx, dy);
      }

      check(-1, 0, -1, 0);
      check(1, 0, 1, 0);
      check(0, -1, 0, -1);
      check(0, 1, 0, 1);

      if (bvalue == sum) {bvalue = Math.random() < 1/3 ? 2 : Math.random() < .5 ? 3 : 5;}
    }

    var tile = new Tile(cell, Math.random() < 0.5 ? (Math.random() < 0.5 ? bvalue : -bvalue) : 
    (Math.random() < dynamic ? smart : (Math.random < 0.5 ? dumb : rand)));
    // Half of the time the smart spawner kicks in, otherwise, a letter or number spawn kicks in.
    this.score += sum; // Adds sum of all elements of the grid to the score. Deducts if negative.
    this.grid.insertTile(tile); // Inserts tile in grid.
  }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.storageManager.getBestScore() < this.score) {
    this.storageManager.setBestScore(this.score);
  }

  // Clear the state when the game is over (game over only, not win)
  if (this.over) {
    this.storageManager.clearGameState();
  } else {
    this.storageManager.setGameState(this.serialize());
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.storageManager.getBestScore(),
    terminated: this.isGameTerminated()
  });

};

// Represent the current game as an object
GameManager.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlaying
  };
};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// Calculates whether two items are close enough to be merged
GameManager.prototype.closeEnough = function (x, y) {
	var maxAllowanceRatio = .5;
	
	var difference = x - y;
	var maxAllowance = Math.max(Math.abs(x), Math.abs(y)) * maxAllowanceRatio;
	if (maxAllowance < 1.1) {
		maxAllowance = 1.1;
	}
	
	var winForCheaters = (x + y) === 0;
	
	return winForCheaters || Math.abs(difference) < maxAllowance;
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2: down, 3: left
  var self = this;

  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);

        if (next && next.value === tile.value && !next.mergedFrom) {
          var newVal = (typeof tile.value === 'number') ? tile.value * 2 : String.fromCharCode(tile.value.charCodeAt(0) + 1);
          var merged = new Tile(positions.next, newVal);
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          // Update the score
          if (typeof merged.value === "number") {
            self.score += Math.floor(Math.random() * 2048) + merged.value * merged.value;
          } else {
            self.score += Math.floor(Math.random() * 2048) + Math.pow(2,(merged.value.charCodeAt(0)-62)) * Math.pow(2,(merged.value.charCodeAt(0)-62));
          }

          // The mighty K tile
          if (merged.value === 0.5) self.won = true;
        } else if (next && next.value === -tile.value && !next.mergedFrom) { // merge inverses
          var n = Math.log(Math.abs(next.value))/Math.LN2;
          var s = String.fromCharCode(64+n);
          var merged = new Tile(positions.next, s);
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          self.score += Math.pow(2,(merged.value.charCodeAt(0)-62));

          // TODO wincheck?
          if (merged.value === " ") self.won = true;
        } else {
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });
  
  if (moved) {
    this.addRandomTile();

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }

    this.actuate();
  }
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // Up
    1: { x: 1,  y: 0 },  // Right
    2: { x: 0,  y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.grid.cellContent({ x: x, y: y });

      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };

          var other  = self.grid.cellContent(cell);

          if (other && other.value === tile.value) {
            return true; // These two tiles can be merged
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};
