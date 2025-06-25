const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const shootSound = new Audio('shoot.mp3');       // bullet fired sound
const hitSound = new Audio('hit.mp3');           // sound when hit (player or enemy)
const enemyShootSound = new Audio('enemyShoot.mp3'); // enemy shooting sound
let paused = false;
const toggleMusic = document.getElementById('toggleMusic');
const toggleSFX = document.getElementById('toggleSFX');
const introPanel = document.getElementById('introPanel');
const closeIntroBtn = document.getElementById('closeIntroBtn');
const introAudio = document.getElementById('introAudio');

let introShown = false;

function showIntro() {
  paused = true;
  introPanel.style.display = 'flex';
  
  // Play intro audio, if allowed by browser (some require user interaction)
  introAudio.currentTime = 0;
  introAudio.play().catch(() => {
    // Audio play might be blocked until user interacts - no worries
  });
}

function closeIntro() {
  paused = false;
  introPanel.style.display = 'none';
  
  // Stop the intro audio
  introAudio.pause();
  introAudio.currentTime = 0;
  
  introShown = true;
  
  startGame();  // start game after intro closes
}

closeIntroBtn.addEventListener('click', closeIntro);

// Optional: Allow skipping intro from settings panel (if you add a button)
const skipIntroBtn = document.getElementById('closeIntroFromSettings');
if (skipIntroBtn) {
  skipIntroBtn.addEventListener('click', () => {
    if (!introShown) closeIntro();
  });
}

// Show intro on page load
window.onload = () => {
  showIntro();
};



// Player setup
const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  width: 150,
  height: 150,
  angle: 0, // in radians
  velocityX: 0,
  velocityY: 0,
  rotationSpeed: 0.03
};

// Load images
const playerImage = new Image();
playerImage.src = 'player_ship.png';

const enemyImage = new Image();
enemyImage.src = 'enemy_ship.png';

// Game state
const MAX_HEALTH = 3;
let health = MAX_HEALTH;
let score = 0;
let gameStarted = false;
let gameOver = false;

let keys = {};
let bullets = [];
let enemyBullets = [];
let enemies = [];

// Controls
document.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;

  if (e.key === 'Enter' && !gameStarted && !gameOver) {
    startGame();
  }

  // Pause toggle
  if (e.key.toLowerCase() === 'p' && gameStarted && !gameOver) {
    paused = !paused;
    if (paused) {
      bgMusic.pause();
    } else {
      if (toggleMusic.checked) bgMusic.play();
    }
  }

  // Shoot bullet
  if (gameStarted && !gameOver && e.key === ' ') {
    bullets.push({
      x: player.x + player.width / 2 + Math.cos(player.angle) * player.width / 2,
      y: player.y + player.height / 2 + Math.sin(player.angle) * player.height / 2,
      angle: player.angle,
      speed: 7,
      width: 8,
      height: 4
    });

    playSFX(shootSound);
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

function startGame() {
  health = MAX_HEALTH;
  score = 0;
  bullets = [];
  enemyBullets = [];
  enemies = [];
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.velocityX = 0;
  player.velocityY = 0;
  player.angle = 0;
  gameStarted = true;
  gameOver = false;
}

const bgMusic = new Audio('background.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.3; // adjust volume
if (toggleMusic && toggleMusic.checked) {
  bgMusic.play();
}

// Movement and physics
function movePlayer() {
  if (keys['a']) player.angle -= player.rotationSpeed;
  if (keys['d']) player.angle += player.rotationSpeed;

  if (keys['w']) {
    player.velocityX += Math.cos(player.angle) * 0.3;
    player.velocityY += Math.sin(player.angle) * 0.3;
  }
  if (keys['s']) {
    player.velocityX -= Math.cos(player.angle) * 0.25;
    player.velocityY -= Math.sin(player.angle) * 0.25;
  }

  player.x += player.velocityX;
  player.y += player.velocityY;

  player.velocityX *= 0.99;
  player.velocityY *= 0.99;

  // Boundaries
  if (player.x < 0) player.x = 0;
  if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
  if (player.y < 0) player.y = 0;
  if (player.y > canvas.height - player.height) player.y = canvas.height - player.height;
}

// Draw player rotated
function drawPlayer() {
  ctx.save();
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
  ctx.rotate(player.angle);
  ctx.drawImage(playerImage, -player.width / 2, -player.height / 2, player.width, player.height);
  ctx.restore();
}

// Update bullets
function updateBullets() {
  bullets.forEach(b => {
    b.x += Math.cos(b.angle) * b.speed;
    b.y += Math.sin(b.angle) * b.speed;
  });

  bullets = bullets.filter(b => b.x >= 0 && b.x <= canvas.width && b.y >= 0 && b.y <= canvas.height);
}

// Draw bullets rotated
function drawBullets() {
  ctx.fillStyle = 'yellow';
  bullets.forEach(b => {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.fillRect(-b.width / 2, -b.height / 2, b.width, b.height);
    ctx.restore();
  });
}

// Enemy spawn + update
function spawnEnemy() {
  if (!gameStarted || gameOver) return;

  const behaviorType = chooseEnemyBehavior();
  const enemy = {
    x: canvas.width + 50,
    y: Math.random() * (canvas.height - 100),
    width: 150,
    height: 150,
    speed: 1 + Math.random() * 1.5,
    type: behaviorType,
    direction: Math.random() > 0.5 ? 1 : -1, // for zig-zag or wobble
    shootCooldown: 0 // for shooter type
  };

  enemies.push(enemy);
}

function chooseEnemyBehavior() {
  const rand = Math.random() * 100;
  if (rand < 15) return 'crazy';
  else if (rand < 30) return 'shooter';
  else if (rand < 70) return 'chaser';
  else return 'normal';
}

function updateEnemies() {
  enemies.forEach((e) => {
    switch (e.type) {
      case 'normal':
        e.x -= e.speed;
        break;

      case 'crazy':
        e.x -= e.speed;
        e.y += Math.sin(Date.now() / 200 + e.x) * 2; // wobble movement
        break;

      case 'shooter':
        e.x -= e.speed;
        if (e.shootCooldown <= 0) {
          shootEnemyBullet(e);
          e.shootCooldown = 100; // cooldown frames
        } else {
          e.shootCooldown--;
        }
        break;

      case 'chaser':
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
          e.x += (dx / dist) * e.speed * 0.5;
          e.y += (dy / dist) * e.speed * 0.5;
        }
        break;
    }
  });

  enemies = enemies.filter(e => e.x + e.width > 0 && e.y + e.height > 0 && e.y < canvas.height);
}

function shootEnemyBullet(enemy) {
  enemyBullets.push({
    x: enemy.x,
    y: enemy.y + enemy.height / 2,
    width: 6,
    height: 4,
    speed: 4
  });

  playSFX(enemyShootSound);
}

function updateEnemyBullets() {
  enemyBullets.forEach(b => b.x -= b.speed);
  enemyBullets = enemyBullets.filter(b => b.x + b.width > 0);

  // check if hit player
  enemyBullets.forEach((b, i) => {
    if (
      b.x < player.x + player.width &&
      b.x + b.width > player.x &&
      b.y < player.y + player.height &&
      b.y + b.height > player.y
    ) {
      enemyBullets.splice(i, 1);
      takeDamage();
    }
  });
}

function drawEnemyBullets() {
  ctx.fillStyle = 'orange';
  enemyBullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));
}

// Draw enemies
function drawEnemies() {
  enemies.forEach(e => {
    ctx.drawImage(enemyImage, e.x, e.y, e.width, e.height);
  });
}

// Collision detection
function checkCollisions() {
  enemies.forEach((enemy, ei) => {
    bullets.forEach((bullet, bi) => {
      if (
        bullet.x < enemy.x + enemy.width &&
        bullet.x + bullet.width > enemy.x &&
        bullet.y < enemy.y + enemy.height &&
        bullet.y + bullet.height > enemy.y
      ) {
        enemies.splice(ei, 1);
        bullets.splice(bi, 1);
        score++;
        playSFX(hitSound);
      }
    });

    if (
      player.x < enemy.x + enemy.width &&
      player.x + player.width > enemy.x &&
      player.y < enemy.y + enemy.height &&
      player.y + player.height > enemy.y
    ) {
      enemies.splice(ei, 1);
      takeDamage();
    }
  });
}

// Health and hearts
function takeDamage() {
  if (health > 0) {
    health--;
    playSFX(hitSound);
    if (health <= 0) {
      gameOver = true;
      gameStarted = false;
    }
  }
}

function drawHearts() {
  ctx.font = '30px Arial';
  ctx.textBaseline = 'top';
  for (let i = 0; i < MAX_HEALTH; i++) {
    ctx.fillStyle = i < health ? 'red' : 'gray';
    ctx.fillText(i < health ? '♥' : '♡', 10 + i * 35, 10);
  }
}

// Score
function drawScore() {
  ctx.font = '24px Arial';
  ctx.fillStyle = 'white';
  ctx.fillText(`Score: ${score}`, canvas.width - 150, 15);
}

// UI Screens
function drawStartScreen() {
  ctx.fillStyle = 'white';
  ctx.font = '40px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('SPACE SHOOTER', canvas.width / 2, canvas.height / 3);
  ctx.font = '24px Arial';
  ctx.fillText('Use W A S D to move', canvas.width / 2, canvas.height / 2);
  ctx.fillText('Spacebar to shoot', canvas.width / 2, canvas.height / 2 + 30);
  ctx.fillText('Press ENTER to start', canvas.width / 2, canvas.height / 2 + 80);
}

function drawGameOverScreen() {
  ctx.fillStyle = 'white';
  ctx.font = '40px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 3);
  ctx.font = '28px Arial';
  ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2);
  ctx.font = '20px Arial';
  ctx.fillText('Press ENTER to restart', canvas.width / 2, canvas.height / 2 + 50);
}

// Game loop
function gameLoop() {
  if (paused) {
    ctx.fillStyle = 'white';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    requestAnimationFrame(gameLoop);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!gameStarted && !gameOver) {
    drawStartScreen();
  } else if (gameOver) {
    drawGameOverScreen();
  } else {
    movePlayer();
    updateBullets();
    updateEnemies();
    updateEnemyBullets();
    checkCollisions();

    drawPlayer();
    drawBullets();
    drawEnemies();
    drawEnemyBullets();
    drawHearts();
    drawScore();
  }

  requestAnimationFrame(gameLoop);
}

// Start spawning enemies regularly
setInterval(spawnEnemy, 1500);

// Start the loop
gameLoop();

const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');

const closeSettings = document.getElementById('closeSettings');

// Open settings panel
settingsBtn.addEventListener('click', () => {
  settingsPanel.style.display = 'block';
  paused = true;
  bgMusic.pause();
});

// Close settings panel
closeSettings.addEventListener('click', () => {
  settingsPanel.style.display = 'none';
  paused = false;
  if (toggleMusic.checked && gameStarted && !gameOver) {
    bgMusic.play();
  }
});

// Toggle background music
toggleMusic.addEventListener('change', () => {
  if (toggleMusic.checked) {
    if (!paused && gameStarted && !gameOver) bgMusic.play();
  } else {
    bgMusic.pause();
  }
});

// Handle sound effects toggle (shooting & hits)
function playSFX(sound) {
  if (toggleSFX.checked) {
    sound.currentTime = 0;
    sound.play();
  }
}
