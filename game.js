const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Virtual world size
const VIRTUAL_WIDTH = 800;
const VIRTUAL_HEIGHT = 600;

// Scaling factor
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let npcSpawnTimer = 0;
let score = 0;
let gameOver = false;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const scaleX = canvas.width / VIRTUAL_WIDTH;
  const scaleY = canvas.height / VIRTUAL_HEIGHT;
  scale = Math.min(scaleX, scaleY);

  offsetX = (canvas.width - VIRTUAL_WIDTH * scale) / 2;
  offsetY = (canvas.height - VIRTUAL_HEIGHT * scale) / 2;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

window.addEventListener("orientationchange", () => {
  resizeCanvas();
});

// Sprite loading
const spritePaths = {
  player: {
    down: 'assets/sprite_0_0.png',
    left: 'assets/sprite_0_1.png',
    right: 'assets/sprite_0_2.png',
    up: 'assets/sprite_0_3.png',
  },
  props: {
    tree: 'assets/sprite_3_0.png',
    tent: 'assets/sprite_3_2.png',
    nest: 'assets/sprite_2_1.png',
  },
  npc: {
    down: 'assets/sprite_1_0.png',
    left: 'assets/sprite_1_1.png',
    right: 'assets/sprite_1_2.png',
    up: 'assets/sprite_1_3.png',
  }  
};

function loadSprites(paths) {
  const result = {};
  for (const key in paths) {
    if (typeof paths[key] === 'string') {
      const img = new Image();
      img.src = paths[key];
      result[key] = img;
    } else {
      result[key] = loadSprites(paths[key]);
    }
  }
  return result;
}

const sprites = loadSprites(spritePaths);

// Player
let player = {
  x: 400,
  y: 300,
  speed: 2,
  width: 32,
  height: 32,
  direction: 'down',
  sprite: null,
  hasEgg: false
};

// Props
const props = [
  { type: 'tree', x: 100, y: 100, width: 32, height: 32 },
  { type: 'tree', x: 180, y: 220, width: 32, height: 32 },
  { type: 'tree', x: 350, y: 80, width: 32, height: 32 },
  { type: 'tree', x: 620, y: 300, width: 32, height: 32 },
  { type: 'tree', x: 720, y: 150, width: 32, height: 32 },
  { type: 'tree', x: 250, y: 420, width: 32, height: 32 },
  { type: 'tree', x: 500, y: 500, width: 32, height: 32 },
  { type: 'tent', x: 500, y: 150, width: 48, height: 48, id: 'tent1' },
  { type: 'tent', x: 100, y: 400, width: 48, height: 48, id: 'tent2' },
  { type: 'tent', x: 650, y: 450, width: 48, height: 48, id: 'tent3' },
  { type: 'tent', x: 320, y: 300, width: 48, height: 48, id: 'tent4' },
  { type: 'nest', x: 200, y: 150, width: 32, height: 32 },
  { type: 'nest', x: 600, y: 350, width: 32, height: 32 }
];

const npcs = [
  { x: 500, y: 150, width: 32, height: 32, direction: 'down', sprite: null, homeX: 500, homeY: 150, homeId: 'tent1', cooldown: 0, hasLeftTent: false, stepsFromTent: 0, walkStepsLeft: 0, hit: false, hitTimer: 0 },
  { x: 100, y: 400, width: 32, height: 32, direction: 'down', sprite: null, homeX: 100, homeY: 400, homeId: 'tent2', cooldown: 0, hasLeftTent: false, stepsFromTent: 0, walkStepsLeft: 0, hit: false, hitTimer: 0 },
  { x: 650, y: 450, width: 32, height: 32, direction: 'down', sprite: null, homeX: 650, homeY: 450, homeId: 'tent3', cooldown: 0, hasLeftTent: false, stepsFromTent: 0, walkStepsLeft: 0, hit: false, hitTimer: 0 },
  { x: 320, y: 300, width: 32, height: 32, direction: 'down', sprite: null, homeX: 320, homeY: 300, homeId: 'tent4', cooldown: 0, hasLeftTent: false, stepsFromTent: 0, walkStepsLeft: 0, hit: false, hitTimer: 0 },
];

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
    Math.abs(npc.x - tent.x) < 40 && Math.abs(npc.y - tent.y) < 40
  );

  if (tooClose) return;

  // Create new NPC
  const newNPC = {
    x: tent.x,
    y: tent.y,
    width: 32,
    height: 32,
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

  const collides = props.some(p =>
    p.type !== 'nest' && isColliding(nextRect, p)
  );  

  if (!collides) {
    if (nextRect.x >= 0 && nextRect.x + player.width <= VIRTUAL_WIDTH) {
      player.x = nextRect.x;
    }
    if (nextRect.y >= 0 && nextRect.y + player.height <= VIRTUAL_HEIGHT) {
      player.y = nextRect.y;
    }
  }

  player.sprite = sprites.player[player.direction];
  npcs.forEach(npc => {
    npc.sprite = sprites.npc[npc.direction];
  });

  if (player.hasEgg) {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(offsetX + player.x * scale + 8, offsetY + player.y * scale - 5, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  
  if (!player.hasEgg) {
    const playerRect = {
      x: player.x,
      y: player.y,
      width: player.width,
      height: player.height
    };
  
    for (const p of props) {
      if (p.type === 'nest') {
        if (isColliding(playerRect, p)) {
          player.hasEgg = true;
          break;
        }
      }
    }
  }  
}

function updateNPCs() {
  if (gameOver) return;

  for (let i = npcs.length - 1; i >= 0; i--) {
    const npc = npcs[i];

    // Remove dead NPCs
    if (npc.hit) {
      npc.hitTimer--;
      if (npc.hitTimer <= 0) {
        npcs.splice(i, 1);
      }
      continue; // skip movement while hit
    }

    // Randomly become angry
    if (!npc.angry && Math.random() < 0.0015) {
      npc.angry = true;
      npc.angryTimer = Math.floor(Math.random() * 600) + 300;
    }

    // Calm down after timer
    if (npc.angry) {
      npc.angryTimer--;
      if (npc.angryTimer <= 0) {
        npc.angry = false;
      }
    }

    let speed = 1;

    // Determine direction
    if (npc.angry) {
      const dx = player.x - npc.x;
      const dy = player.y - npc.y;
      speed = 2;

      if (Math.abs(dx) > Math.abs(dy)) {
        npc.direction = dx > 0 ? 'right' : 'left';
      } else {
        npc.direction = dy > 0 ? 'down' : 'up';
      }
    } else {
      // Random walk logic
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

    const testRect = { x: nextX, y: nextY, width: npc.width, height: npc.height };

    const collides = props.some(p =>
      isColliding(testRect, p) && (p.type !== 'tent' || p.id !== npc.homeId)
    ) || nextX < 0 || nextX + npc.width > VIRTUAL_WIDTH ||
         nextY < 0 || nextY + npc.height > VIRTUAL_HEIGHT;

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

    // Check player collision if angry
    const npcRect = { x: npc.x, y: npc.y, width: npc.width, height: npc.height };
    const playerRect = { x: player.x, y: player.y, width: player.width, height: player.height };

    if (npc.angry && isColliding(npcRect, playerRect)) {
      gameOver = true;
      console.log("💀 Game Over");
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
      egg.x < 0 || egg.x > VIRTUAL_WIDTH ||
      egg.y < 0 || egg.y > VIRTUAL_HEIGHT
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

// Draw
function drawScaledImage(img, x, y, w, h) {
  ctx.drawImage(img, offsetX + x * scale, offsetY + y * scale, w * scale, h * scale);
}

function drawProps() {
  for (const prop of props) {
    const img = sprites.props[prop.type];
    if (img && img.complete) {
      drawScaledImage(img, prop.x, prop.y, prop.width, prop.height);
    } else {
    //   ctx.fillStyle = prop.type === 'tree' ? 'green' : prop.type === 'tent' ? 'blue' : prop.type === 'nest' ? 'orange' : 'gray';
      ctx.fillRect(offsetX + prop.x * scale, offsetY + prop.y * scale, prop.width * scale, prop.height * scale);
    }
  }
}

function drawPlayer() {
  if (player.sprite && player.sprite.complete) {
    drawScaledImage(player.sprite, player.x, player.y, player.width, player.height);
  } else {
    // ctx.fillStyle = 'red';
    ctx.fillRect(offsetX + player.x * scale, offsetY + player.y * scale, player.width * scale, player.height * scale);
  }
}

function drawNPCs() {
  for (const npc of npcs) {
    if (npc.sprite && npc.sprite.complete) {
      drawScaledImage(npc.sprite, npc.x, npc.y, npc.width, npc.height);
    } else {
    //   ctx.fillStyle = 'orange';
      ctx.fillRect(offsetX + npc.x * scale, offsetY + npc.y * scale, npc.width * scale, npc.height * scale);
    }

    // Display reactions
    if (npc.hit && npc.reactionText) {
    //   ctx.fillStyle = 'red';
      ctx.font = '14px sans-serif';
      ctx.fillText(npc.reactionText, offsetX + npc.x * scale, offsetY + npc.y * scale - 5);
    } else if (npc.angry) {
    //   ctx.fillStyle = 'red';
      ctx.font = '14px sans-serif';
      ctx.fillText('😡', offsetX + npc.x * scale, offsetY + npc.y * scale - 5);
    }
  }
}

function drawEggs() {
  for (const egg of thrownEggs) {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(offsetX + egg.x * scale + egg.width * scale / 2, offsetY + egg.y * scale + egg.height * scale / 2, egg.width * scale / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function throwEgg() {
  if (gameOver || !player.hasEgg) return;
  
  if (player.hasEgg) {
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

    player.hasEgg = false;
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

  // Game over message
  if (gameOver) {
    ctx.fillStyle = 'red';
    ctx.font = '32px sans-serif';
    ctx.fillText("💀 You got caught!", canvas.width / 2 - 100, canvas.height / 2);
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();