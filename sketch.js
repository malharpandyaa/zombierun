let port;
let zombie;
let obstacles = [];
let score = 0;
let level = 1; // Add a new variable to keep track of the level
let gameState = 2; // 0: playing, 1: game over, 2: start screen

// Tone.js
const synth = new Tone.Synth().toDestination();
synth.volume.value = -25;
const melody = [
  "B4", "B4", "D#5", "B4", "D#5", "B4", "D#5", "B4",
  "E5", "E5", "G#5", "E5", "G#5", "E5", "G#5", "E5"
];

// Initialize variables for music looping
let noteIndex = 0;
let loopInterval;

// Function to start the background music loop
function startBackgroundMusic() {
    loopInterval = setInterval(playNote, 300); // Play a note every 300 milliseconds
}

// Function to play the next note in the sequence
function playNote() {
    const note = melody[noteIndex % melody.length];
    synth.triggerAttackRelease(note, "8n");
    noteIndex++;
}

function setup() {
  createCanvas(1200, 600); // Increased canvas size
  zombie = new Zombie();
  obstacles.push(new Obstacle());

  port = createSerial();
  connectButton = createButton("Connect");
  connectButton.mousePressed(connect);

  startBackgroundMusic(); // Start the background music
}

function draw() {
  handleJoystick();
  
  // Create a gradient background
  setGradient(0, 0, width, height, color(0, 0, 0), color(102, 0, 0));

  if (gameState === 2) {
    // Start screen state
    fill(255, 0, 0);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("ZOMBIE RUN", width / 2, height / 2 - 20);
    textSize(16);
    text("Press 'S' to start", width / 2, height / 2 + 60);
  } else if (gameState === 0) {
    // Update and show zombie
    zombie.update();
    zombie.show();

    // Update and show obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].update();
      obstacles[i].show();

      // Check for collision
      if (obstacles[i].hits(zombie)) {
        gameState = 1; // Game over
        gameOver(); // Stop background music on game over
      }

      // Remove off-screen obstacles and increase score
      if (obstacles[i].isOffScreen()) {
        obstacles.splice(i, 1);
        score++;
        if (score % 5 === 0) { // Check if score is a multiple of 5
          level++; // Increase level
        }
      }
    }

    // Add new obstacles
    if (random() < 0.015) { // Increased the chance for an obstacle to appear
      obstacles.push(new Obstacle());
    }

    // Display score
    fill(255, 0, 0);
    textSize(24);
    text("Score: " + score, 70, 50); // Adjusted the position of the score

    // Display level
    text("Level: " + level, 70, 80); // Display the current level
  } else if (gameState === 1) {
    // Game over state
    fill(255, 0, 0);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("GAME OVER", width / 2, height / 2 - 20);
    textSize(16);
    text("Press 'R' to restart", width / 2, height / 2 + 60);
    text("Score: " + score, width / 2, height / 2 + 100); // Display the final score
    text("Level: " + level, width / 2, height / 2 + 130); // Display the final level
  }
}


class Zombie {
  constructor() {
    this.width = 30;
    this.height = 40;
    this.x = 50;
    this.y = height - this.height;
    this.velocity = 0;
    this.gravity = 0.6;
    this.lift = -20; // Increased lift for higher jump
    this.isJumping = false;
    this.jumpCount = 0;
    this.maxJumps = 2; // Maximum number of jumps
    this.jumpSound = new Tone.Synth().toDestination();
    this.jumpSound.volume.value = -10;

    // Zombie-like appearance
    this.color = color(100, 150, 100); // Dull green color
    this.decomposition = []; // Array to hold decomposition points
    this.decompositionCount = 10; // Number of decomposition points
    for (let i = 0; i < this.decompositionCount; i++) {
      // Randomly generate decomposition points within the zombie's body
      this.decomposition.push({
        x: random(0, this.width),
        y: random(0, this.height)
      });
    }
  }
  
  show() {
    fill(this.color); // Set color to dull green
    // Create a custom shape for the zombie
    ellipse(this.x + this.width / 2, this.y, this.width, this.width); // Head (top circle)
    rect(this.x, this.y + this.width / 2, this.width, this.height / 2); // Body (bottom rectangle)

    // Add decomposition spots
    fill(30); // Darker color for decomposition spots
    this.decomposition.forEach(point => {
      ellipse(this.x + point.x, this.y + point.y, 4, 4); // Draw decomposition spots
    });
  }
  
  update() {
    this.velocity += this.gravity;
    this.y += this.velocity;
    
    // Check if zombie is out of canvas
    if (this.y > height - this.height) {
      this.y = height - this.height;
      this.velocity = 0;
      this.jumpCount = 0;
      this.isJumping = false;
    } else if (this.y < 0) {
      this.y = 0;
      this.velocity = 0;
    }
  }
  
  jump() {
    if (!this.isJumping) {
      this.velocity += this.lift;
      this.isJumping = true;
      this.jumpSound.triggerAttackRelease("C4", "8n"); // Play a sound when the zombie jumps
    } else if (this.isJumping && this.jumpCount < this.maxJumps) {
      this.velocity += this.lift;
      this.jumpCount++;
      this.jumpSound.triggerAttackRelease("C4", "8n"); // Play a sound when the zombie jumps
    }
  }
}

class Obstacle {
  constructor() {
    this.type = random() < 0.5 ? 'needle' : 'other'; // Randomly choose the type of obstacle
    this.width = this.type === 'needle' ? 25 : random(30, 50); // Needles are thin
    this.height = this.type === 'needle' ? 70 : this.width; // Needles are tall
    this.x = width;
    this.y = height - this.height;
    this.speed = 4;
    this.hitSound = new Tone.Synth().toDestination();
    this.hitSound.volume.value = -10;
    this.amplitude = random(20, 50); // Amplitude of the sinusoidal motion
    this.frequency = random(0.01, 0.05); // Frequency of the sinusoidal motion
    this.offset = random(0, 2 * PI); // Phase offset of the sinusoidal motion
  }

  show() {
    fill(255, 0, 0);
    if (this.type === 'needle') {
      triangle(this.x, this.y, this.x + this.width / 2, this.y - this.height, this.x + this.width, this.y); // Draw a triangle for the needle
    } else {
      rect(this.x, this.y, this.width, this.height); // Draw a rectangle for other obstacles
    }
  }

  update() {
    // Increase speed every 5 points
    this.speed = 8 + Math.floor(score / 5);
    this.x -= this.speed;
    this.y = height - this.height + this.amplitude * sin(this.frequency * frameCount + this.offset); // Update y position based on sinusoidal motion
  }

  hits(zombie) {
    let hit = (zombie.x < this.x + this.width &&
               zombie.x + zombie.width > this.x &&
               zombie.y < this.y + this.height * 0.2 && // Reduce the effective height of the obstacle
               zombie.y + zombie.height > this.y);
    if (hit) {
      this.hitSound.triggerAttackRelease("A4", "8n"); // Play a sound when the zombie hits an obstacle
    }
    return hit;
  }

  isOffScreen() {
    return this.x < -this.width;
  }
}


function handleJoystick() {
  let str = port.readUntil("\n");
  if (str !== null) {
    let values = str.split(",");
    if (values.length > 2) {
      let sw = Number(values[2]);
      if (sw === 1 && !zombie.isJumping) {
        zombie.jump();
      }
    }
  }
}

function connect() {
  if (!port.opened()) {
    port.open('Arduino', 9600);
  } else {
    port.close();
  }
}

function keyPressed() {
  if (gameState === 2 && key.toUpperCase() === 'S') {
    gameState = 0; // Set game state to playing
    zombie = new Zombie(); // Reset the zombie
    obstacles = [new Obstacle()]; // Reset the obstacles
    score = 0; // Reset the score
    level = 1; // Reset the level
    startBackgroundMusic(); // Restart background music
  } else if (gameState === 1 && key.toUpperCase() === 'R') {
    gameState = 0; // Set game state back to playing
    zombie = new Zombie(); // Reset the zombie
    obstacles = [new Obstacle()]; // Reset the obstacles
    score = 0; // Reset the score
    level = 1; // Reset the level
    startBackgroundMusic(); // Restart background music
  }
}

function gameOver() {
  clearInterval(loopInterval); // Stop background music on game over
}

function setGradient(x, y, w, h, c1, c2) {
  noFill();
  for (let i = y; i <= y+h; i++) {
    let inter = map(i, y, y+h, 0, 1);
    let c = lerpColor(c1, c2, inter);
    stroke(c);
    line(x, i, x+w, i);
  }
}