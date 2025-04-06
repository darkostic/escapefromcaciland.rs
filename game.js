const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameStarted = false;
let skipWelcomeScreen = false;

// Virtual world size
const VIRTUAL_WIDTH = 800;
const VIRTUAL_HEIGHT = 600;

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 1200;

const playerWidth = 52;
const playerHeight = 81;
const npcWidth = 32;
const npcHeight = 81;
const treeWidth = 52;
const treeHeight = 52;
const tentWidth = 52;
const tentHeight = 52;
const nestWidth = 92;
const nestHeight = 92;

let scale = 1;
let offsetX = 0;
let offsetY = 0;
let npcSpawnTimer = 0;
let score = 0;
let gameOver = false;

const ambientSound = new Audio('assets/ambient.mp3');
ambientSound.loop = true;
ambientSound.volume = 0.2;

const camera = {
  x: 0,
  y: 0,
  zoom: 1.5 // 🔍 zoom level: 2x zoom (each game unit = 2 screen pixels)
};
camera.zoom = window.innerWidth < 768 ? 1.2 : 1.6;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
function resizeWelcomeScreen() {
  const welcome = document.getElementById('welcomeScreen');
  if (welcome) {
    welcome.style.height = `${window.innerHeight}px`;
  }
}

window.addEventListener('resize', () => {
  resizeCanvas();
  resizeWelcomeScreen();
});

window.addEventListener("orientationchange", () => {
  resizeCanvas();
  resizeWelcomeScreen();
});
resizeCanvas();
resizeWelcomeScreen();

function startGame() {
  if (!gameStarted) {
    const welcome = document.getElementById('welcomeScreen');
    if (welcome && !skipWelcomeScreen) {
      welcome.style.display = 'none';
    }

    ambientSound.play().catch(() => {
      console.warn("Ambient sound blocked by browser.");
    });

    gameStarted = true;
  }
}

function resetGame() {
  // Clear props and NPCs
  props.length = 0;
  npcs.length = 0;
  thrownEggs.length = 0;

  score = 0;
  gameOver = false;

  // Regenerate world layout
  generateWorld(); // ⬅️ assumes you're using a function to fill props & npcs
  placePlayer();

  ambientSound.currentTime = 0;
  ambientSound.play();

  // Resume game loop
  gameStarted = true;
}

// Bind to first interaction
document.addEventListener('click', startGame);
document.addEventListener('keydown', startGame);
document.addEventListener('touchstart', startGame);

// Sprite loading
const spritePaths = {
  player: {
    down: 'assets/player-front.png',
    left: 'assets/player-left.png',
    right: 'assets/player-right.png',
    up: 'assets/player-front.png',
  },
  props: {
    trees: [
      'assets/tree_1.png',
      'assets/tree_2.png',
      'assets/tree_3.png'
    ],
    tents: [
      'assets/tent_1.png',
      'assets/tent_2.png',
      'assets/tent_3.png'
    ],
    nest: 'assets/nest.png' // Your egg stand from earlier
  },
  npc: {
    down: 'assets/caci-front.png',
    left: 'assets/caci-left.png',
    right: 'assets/caci-right.png',
    up: 'assets/caci-front.png',
  }  
};

function loadSprites(paths) {
  const result = {};
  for (const key in paths) {
    const val = paths[key];
    if (Array.isArray(val)) {
      result[key] = val.map(src => {
        const img = new Image();
        img.src = src;
        return img;
      });
    } else if (typeof val === 'string') {
      const img = new Image();
      img.src = val;
      result[key] = img;
    } else {
      result[key] = loadSprites(val);
    }
  }
  return result;
}

const sprites = loadSprites(spritePaths);

// Player
let player = {
  x: 0,
  y: 0,
  speed: 2,
  width: playerWidth,
  height: playerHeight,
  direction: 'down',
  sprite: null,
  eggCount: 0,
  maxEggs: 5
};

function isOverlapping(rect, buffer = 0) {
  return props.some(p => {
    const expanded = {
      x: p.x - buffer / 2,
      y: p.y - buffer / 2,
      width: p.width + buffer,
      height: p.height + buffer
    };
    return isColliding(rect, expanded);
  });
}

function placeProp(type, width, height, extra = {}) {
  const maxTries = 200;
  let tries = 0;

  while (tries++ < maxTries) {
    const x = Math.floor(Math.random() * (WORLD_WIDTH - width));
    const y = Math.floor(Math.random() * (WORLD_HEIGHT - height));
    const rect = { x, y, width, height };

    if (!isOverlapping(rect, 16)) {
      const prop = { type, x, y, width, height, ...extra };
      props.push(prop);
      return prop;
    }
  }

  console.warn(`Couldn't place ${type} after ${maxTries} tries`);
  return null;
}

function placePlayer() {
  const px = WORLD_WIDTH / 2 - 26;
  const py = WORLD_HEIGHT / 2 - 40;
  const rect = { x: px, y: py, width: playerWidth, height: playerHeight };

  // Try center first, else try nearby
  if (!isOverlapping(rect, 16)) {
    player.x = px;
    player.y = py;
    return;
  }

  // Search in 100 random spots
  let tries = 0;
  while (tries++ < 100) {
    const x = Math.floor(Math.random() * (WORLD_WIDTH - playerWidth));
    const y = Math.floor(Math.random() * (WORLD_HEIGHT - playerHeight));
    const test = { x, y, width: playerWidth, height: playerHeight };
    if (!isOverlapping(test, 16)) {
      player.x = x;
      player.y = y;
      return;
    }
  }

  console.warn("Could not find safe player spawn.");
  player.x = px;
  player.y = py;
}

function generateWorld() {
  // 🌳 Trees (30)
for (let i = 0; i < 30; i++) {
  placeProp('tree', treeWidth, treeHeight, {
    variant: Math.floor(Math.random() * sprites.props.trees.length)
  });
}

// 🏕️ Tents (20)
for (let i = 0; i < 20; i++) {
  placeProp('tent', tentWidth, tentHeight, {
    id: `tent${i + 1}`,
    variant: Math.floor(Math.random() * sprites.props.tents.length)
  });
}

// 🥚 Nests (5) — 92x92
for (let i = 0; i < 5; i++) {
  placeProp('nest', nestWidth, nestHeight);
}

placePlayer();

npcs = props
  .filter(p => p.type === 'tent')
  .map(p => ({
    x: p.x,
    y: p.y,
    width: npcWidth,
    height: npcHeight,
    direction: 'down',
    sprite: sprites.npc.down,
    homeX: p.x,
    homeY: p.y,
    homeId: p.id,
    cooldown: 0,
    hasLeftTent: false,
    stepsFromTent: 0,
    walkStepsLeft: 0,
    hit: false,
    hitTimer: 0,
    angry: false,
    angryTimer: 0
  }));
}

const props = [];
let npcs = [];

generateWorld();

let thrownEggs = []; // Array of flying eggs

// Input
const keys = {};
document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

const touchKeys = { up: false, down: false, left: false, right: false };
document.querySelectorAll('[data-dir]').forEach(btn => {
  const dir = btn.getAttribute('data-dir');
  btn.addEventListener('touchstart', e => {
    e.preventDefault();
    touchKeys[dir] = true;
  });
  btn.addEventListener('touchend', e => {
    e.preventDefault();
    touchKeys[dir] = false;
  });
});

function spawnNPC() {
  // Pick a random tent
  const tentProps = props.filter(p => p.type === 'tent');

  if (tentProps.length === 0) return;

  const tent = tentProps[Math.floor(Math.random() * tentProps.length)];

  // Don't spawn if too many NPCs are already near that tent
  const tooClose = npcs.some(npc =>
    Math.abs(npc.x - tent.x) < 60 && Math.abs(npc.y - tent.y) < 80
  );

  if (tooClose) return;

  // Create new NPC
  const newNPC = {
    x: tent.x,
    y: tent.y,
    width: npcWidth,
    height: npcHeight,
    direction: 'down',
    sprite: sprites.npc.down,
    homeX: tent.x,
    homeY: tent.y,
    homeId: tent.id,
    cooldown: 0,
    hasLeftTent: false,
    stepsFromTent: 0,
    walkStepsLeft: 0,
    hit: false,
    hitTimer: 0,
    angry: false,
    angryTimer: 0,
  };

  npcs.push(newNPC);
}

// Collision helper
function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// Update
function updatePlayer() {
  if (gameOver) return;

  const nextPos = { x: player.x, y: player.y };
  let moved = false;

  if (keys['ArrowUp'] || touchKeys.up) {
    nextPos.y -= player.speed;
    player.direction = 'up';
    moved = true;
  } else if (keys['ArrowDown'] || touchKeys.down) {
    nextPos.y += player.speed;
    player.direction = 'down';
    moved = true;
  } else if (keys['ArrowLeft'] || touchKeys.left) {
    nextPos.x -= player.speed;
    player.direction = 'left';
    moved = true;
  } else if (keys['ArrowRight'] || touchKeys.right) {
    nextPos.x += player.speed;
    player.direction = 'right';
    moved = true;
  }

  const nextRect = {
    x: nextPos.x,
    y: nextPos.y,
    width: player.width,
    height: player.height
  };

  // Only block collision with solid props (trees and tents)
  const collides = props.some(p =>
    (p.type === 'tree' || p.type === 'tent') &&
    isColliding(nextRect, p)
  );

  // Move only if not colliding and within world bounds
  if (!collides) {
    if (
      nextRect.x >= 0 &&
      nextRect.x + player.width <= WORLD_WIDTH
    ) {
      player.x = nextRect.x;
    }
    if (
      nextRect.y >= 0 &&
      nextRect.y + player.height <= WORLD_HEIGHT
    ) {
      player.y = nextRect.y;
    }
  }

  player.sprite = sprites.player[player.direction];
  npcs.forEach(npc => {
    npc.sprite = sprites.npc[npc.direction];
  });
  
  if (!player.eggCount > 0) {
    const playerRect = {
      x: player.x,
      y: player.y,
      width: player.width,
      height: player.height
    };

    for (const p of props) {
      if (p.type === 'nest' && isColliding(playerRect, p)) {
        player.eggCount = player.maxEggs;
        break;
      }
    }
  }
}

function updateNPCs() {
  if (gameOver) return;

  for (let i = npcs.length - 1; i >= 0; i--) {
    const npc = npcs[i];

    // If hit, count down until they disappear
    if (npc.hit) {
      npc.hitTimer--;
      if (npc.hitTimer <= 0) {
        npcs.splice(i, 1);
      }
      continue;
    }

    // Randomly go angry
    if (!npc.angry && Math.random() < 0.0003) {
      npc.angry = true;
      npc.angryTimer = Math.floor(Math.random() * 600) + 300;
    }

    // Calm down
    if (npc.angry) {
      npc.angryTimer--;
      if (npc.angryTimer <= 0) {
        npc.angry = false;
      }
    }

    const speed = player.speed;

    // Direction
    if (npc.angry) {
      const dx = player.x - npc.x;
      const dy = player.y - npc.y;
      npc.direction = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up');
    } else {
      if (npc.walkStepsLeft <= 0) {
        const directions = ['up', 'down', 'left', 'right'];
        npc.direction = directions[Math.floor(Math.random() * directions.length)];
        npc.walkStepsLeft = Math.floor(Math.random() * 30) + 20;
      }
    }

    // Predict movement
    let nextX = npc.x;
    let nextY = npc.y;
    if (npc.direction === 'up') nextY -= speed;
    if (npc.direction === 'down') nextY += speed;
    if (npc.direction === 'left') nextX -= speed;
    if (npc.direction === 'right') nextX += speed;

    const testRect = {
      x: nextX,
      y: nextY,
      width: npc.width,
      height: npc.height
    };

    const collides = props.some(p =>
      (p.type === 'tree' || p.type === 'tent') &&
      (p.id !== npc.homeId) &&
      isColliding(testRect, p)
    ) || nextX < 0 || nextX + npc.width > WORLD_WIDTH ||
         nextY < 0 || nextY + npc.height > WORLD_HEIGHT;

    if (!collides) {
      npc.x = nextX;
      npc.y = nextY;
      npc.sprite = sprites.npc[npc.direction];
      if (!npc.hasLeftTent) {
        npc.stepsFromTent++;
        if (npc.stepsFromTent > 10) {
          npc.hasLeftTent = true;
        }
      } else {
        npc.walkStepsLeft--;
      }
    } else {
      npc.walkStepsLeft = 0;
    }

    // Check player collision = game over
    const npcRect = {
      x: npc.x,
      y: npc.y,
      width: npc.width,
      height: npc.height
    };
    const playerRect = {
      x: player.x,
      y: player.y,
      width: player.width,
      height: player.height
    };

    if (npc.angry && isColliding(npcRect, playerRect)) {
      if (!gameOver) {
        if (!gameOver) {
          gameOver = true;

          ambientSound.pause();
          ambientSound.currentTime = 0;
        
          // Show Game Over screen with score
          const screen = document.getElementById('gameOverScreen');
          const scoreText = document.getElementById('finalScore');
          scoreText.textContent = `Your score: ${score}`;
          screen.style.display = 'block';
          requestAnimationFrame(() => {
            screen.classList.add('show');
          });
        }        
      }
    }

    npc.cooldown = Math.floor(Math.random() * 10) + 5;
  }
}

function updateEggs() {
  for (const egg of thrownEggs) {
    if (!egg.active) continue;

    egg.x += egg.vx;
    egg.y += egg.vy;

    // Out of bounds
    if (
      egg.x < 0 || egg.x > WORLD_WIDTH ||
      egg.y < 0 || egg.y > WORLD_HEIGHT
    ) {
      egg.active = false;
    }

    // Collision with NPCs
    for (const npc of npcs) {
      if (!npc.hit && isColliding(egg, npc)) {
        const reactions = ['😵', '💀', '🤕'];

        egg.active = false;
        npc.hit = true;
        npc.hitTimer = 60;
        npc.angry = false; // calm them if angry
        npc.reactionText = reactions[Math.floor(Math.random() * reactions.length)];
        score++; // 👈 Score increases
        break;
      }
    }
  }

  // Remove inactive eggs
  thrownEggs = thrownEggs.filter(e => e.active);
}

function screenX(worldX) {
  return (worldX - camera.x) * camera.zoom;
}

function screenY(worldY) {
  return (worldY - camera.y) * camera.zoom;
}

// Draw
function drawImageScaled(img, x, y, width, height) {
  ctx.drawImage(img, screenX(x), screenY(y), width * camera.zoom, height * camera.zoom);
}

function drawProps() {
  for (const prop of props) {
    let img = null;

    if (prop.type === 'tree') {
      img = sprites.props.trees[prop.variant || 0];
    } else if (prop.type === 'tent') {
      img = sprites.props.tents[prop.variant || 0];
    } else if (prop.type === 'nest') {
      img = sprites.props.nest;
    }

    if (img && img.complete) {
      drawImageScaled(img, prop.x, prop.y, prop.width, prop.height);
    } else {
      ctx.fillStyle = 'gray';
      ctx.fillRect(screenX(prop.x), screenY(prop.y), prop.width * camera.zoom, prop.height * camera.zoom);
    }
  }
}

function drawPlayer() {
  if (player.sprite && player.sprite.complete) {
    drawImageScaled(player.sprite, player.x, player.y, player.width, player.height);
    
    // Show egg count above player
    if (player.eggCount > 0) {
      ctx.fillStyle = 'white';
      ctx.font = '14px sans-serif';
      ctx.fillText(`🥚 x${player.eggCount}`, screenX(player.x), screenY(player.y) - 10);
    }
  } else {
    ctx.fillStyle = 'red';
    ctx.fillRect(screenX(player.x), screenY(player.y), player.width * camera.zoom, player.height * camera.zoom);
  }
}

function drawNPCs() {
  for (const npc of npcs) {
    if (npc.sprite && npc.sprite.complete) {
      drawImageScaled(npc.sprite, npc.x, npc.y, npc.width, npc.height);
    } else {
      ctx.fillStyle = 'orange';
      ctx.fillRect(screenX(npc.x), screenY(npc.y), npc.width * camera.zoom, npc.height * camera.zoom);
    }

    if (npc.angry || npc.hit) {
      ctx.fillStyle = npc.hit ? 'red' : 'orange';
      ctx.font = '14px sans-serif';
      const reaction = npc.hit ? (npc.reactionText || '😵') : '😡';
      ctx.fillText(reaction, screenX(npc.x), screenY(npc.y) - 5);
    }
  }
}

function drawEggs() {
  for (const egg of thrownEggs) {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(
      screenX(egg.x + egg.width / 2),
      screenY(egg.y + egg.height / 2),
      (egg.width / 2) * camera.zoom,
      0, Math.PI * 2
    );
    ctx.fill();
  }
}

function throwEgg() {
  if (gameOver || player.eggCount <= 0) return;
  
  if (player.eggCount > 0) {
    const eggSpeed = 5;
    const eggSize = 16;

    let vx = 0, vy = 0;
    if (player.direction === 'up') vy = -eggSpeed;
    else if (player.direction === 'down') vy = eggSpeed;
    else if (player.direction === 'left') vx = -eggSpeed;
    else if (player.direction === 'right') vx = eggSpeed;

    thrownEggs.push({
      x: player.x + player.width / 2 - eggSize / 2,
      y: player.y + player.height / 2 - eggSize / 2,
      width: eggSize,
      height: eggSize,
      vx,
      vy,
      active: true
    });

    player.eggCount--;
  }
}

// Keyboard input
document.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    throwEgg();
  }
});

// Mobile button
document.getElementById('throwBtn').addEventListener('click', throwEgg);

function isLandscape() {
  return window.innerWidth > window.innerHeight;
}

// Loop
function gameLoop() {
  if (!gameStarted) {
    requestAnimationFrame(gameLoop);
    return;
  }

  // Center camera on player
  camera.x = player.x + player.width / 2 - (canvas.width / 2) / camera.zoom;
  camera.y = player.y + player.height / 2 - (canvas.height / 2) / camera.zoom;

  // Clamp camera to world bounds
  camera.x = Math.max(0, Math.min(camera.x, WORLD_WIDTH - canvas.width / camera.zoom));
  camera.y = Math.max(0, Math.min(camera.y, WORLD_HEIGHT - canvas.height / camera.zoom));

  if (!isLandscape() || gameOver) {
    requestAnimationFrame(gameLoop);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawProps();
  updatePlayer();
  updateNPCs();
  updateEggs();
  drawEggs();
  drawNPCs();
  drawPlayer();

  // Spawn new NPCs randomly
  npcSpawnTimer--;

  if (npcSpawnTimer <= 0) {
    spawnNPC();
    npcSpawnTimer = Math.floor(Math.random() * 300) + 300; // spawn every 5–10 seconds
  }

  // Draw score
  ctx.fillStyle = 'black';
  ctx.font = '16px sans-serif';
  ctx.fillText(`Score: ${score}`, 10, 20);

  if (gameOver) {
    ctx.fillStyle = 'red';
    ctx.font = '32px sans-serif';
    ctx.fillText("💀 You got caught!", canvas.width / 2 - 100, canvas.height / 2);
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();

document.getElementById('retryBtn').addEventListener('click', () => {
  // Hide game over screen
  document.getElementById('gameOverScreen').style.display = 'none';

  // Set flag to skip welcome screen
  skipWelcomeScreen = true;

  // Reset game state and restart
  resetGame(); // ⬅️ We'll write this next
});