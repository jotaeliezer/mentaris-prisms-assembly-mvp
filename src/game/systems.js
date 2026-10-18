import { clamp, len, makeRng, wrapAngle } from './util.js';
import { nextProblem, problemSpec } from './questions.js';
import {
  APPROACH,
  LAYER_MAX,
  LAYER_MIN,
  MISSIONS,
  SHIP_RADIUS,
  WORLD,
  cleanSeed,
  clusterName,
  randomInteriorPoint,
  spawnAsteroid,
} from './state.js';

const EXTRACT_SHRINK = 0.83;
/** Extra shrink once a rock is fully depleted so it reads as a tiny husk. */
const EXTRACT_DEPLETE_SHRINK = 0.55;
const EXTRACT_TOAST = 'Extraction Initiation';
const EXTRACT_TOAST_DUR = 1.2;

export function digitFromEvent(event) {
  if (/^Digit[0-9]$/.test(event.code)) return event.code.slice(5);
  if (/^Numpad[0-9]$/.test(event.code)) return event.code.slice(6);
  return null;
}

export function activeAsteroid(state) {
  return state.asteroids.find((rock) => rock.alive && rock.id === state.targetId) || null;
}

export function asteroidAt(state, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const rock of state.asteroids) {
    if (!rock.alive) continue;
    const dist = Math.hypot(rock.x - x, rock.y - y);
    const reach = Math.max(rock.radius + 18, rock.size * 0.46);
    if (dist < reach && dist < bestDist) {
      best = rock;
      bestDist = dist;
    }
  }
  return best;
}

/** Normalize extract fields for rocks restored from layer banks. */
function ensureRockExtractFields(rock) {
  if (rock.extractCount == null) rock.extractCount = 0;
  if (rock.depleted == null) rock.depleted = false;
  if (rock.baseRadius == null) rock.baseRadius = rock.radius;
  return rock;
}

function extractRock(state) {
  if (!state.extractRockId) return null;
  const rock = state.asteroids.find((item) => item.alive && item.id === state.extractRockId);
  return rock ? ensureRockExtractFields(rock) : null;
}

function tickExtractToast(state, dt) {
  if (state.extractToastTime <= 0) return;
  state.extractToastTime -= dt;
  if (state.extractToastTime <= 0) {
    state.extractToastTime = 0;
    state.extractToast = '';
  }
}

/**
 * Enter extract mode for a near, non-depleted rock.
 * React/UI (T5) calls this via the bridge with the rock id from extractAvailable.
 */
export function openExtract(state, rockId, audio) {
  if (state.mode !== 'fly') return;
  const id = Number(rockId);
  if (!id || state.extractAvailable !== id) return;
  const rock = state.asteroids.find((item) => item.alive && item.id === id);
  if (!rock) return;
  ensureRockExtractFields(rock);
  if (rock.depleted) return;
  state.mode = 'extract';
  state.extractRockId = id;
  state.targetId = id;
  state.buffer = '';
  state.hint = '';
  if (audio) {
    if (typeof audio.extractStart === 'function') audio.extractStart();
    else if (typeof audio.lock === 'function') audio.lock();
  }
}

/** Leave extract mode without consuming an extract slot. */
export function cancelExtract(state) {
  if (state.mode !== 'extract') return;
  state.mode = 'fly';
  state.extractRockId = 0;
  state.buffer = '';
  state.hint = '';
}

function clearExtractSession(state) {
  state.extractAvailable = null;
  state.extractRockId = 0;
  state.extractToast = '';
  state.extractToastTime = 0;
  if (state.mode === 'extract') state.mode = 'fly';
}

function layerRng(state) {
  const missionId = state.mission ? state.mission.id : 'roam';
  return makeRng(state.seed + '|c' + state.cluster + '|l' + state.layer + '|' + missionId);
}

export function populateField(state) {
  const mission = state.mission;
  if (mission && mission.operation) {
    spawnAsteroid(state, mission.operation, 'easy', 'near');
    spawnAsteroid(state, mission.operation, 'easy', 'near');
    spawnAsteroid(state, mission.operation, 'easy', 'near');
    spawnAsteroid(state, mission.operation, 'hard', 'near');
    spawnAsteroid(state, mission.operation, 'hard', 'near');
    for (let i = 0; i < 6; i++) {
      spawnAsteroid(state, mission.operation, i % 2 ? 'hard' : 'easy', 'mid');
    }
    for (let i = 0; i < 10; i++) {
      spawnAsteroid(state, mission.operation, i % 3 === 0 ? 'hard' : 'easy', 'roam');
    }
  } else {
    spawnAsteroid(state, 'add', 'easy', 'near');
    spawnAsteroid(state, 'sub', 'easy', 'near');
    spawnAsteroid(state, 'add', 'hard', 'near');
    for (let i = 0; i < 18; i++) {
      spawnAsteroid(state, i % 2 ? 'sub' : 'add', i % 3 === 0 ? 'hard' : 'easy', 'roam');
    }
  }
}

export function placeWormhole(state) {
  const mission = state.mission;
  if (!mission || !mission.operation) {
    state.wormhole = null;
    return;
  }
  const angle = state.rng() * Math.PI * 2;
  const dist = 1600 + state.rng() * 900;
  state.wormhole = {
    x: clamp(state.home.x + Math.cos(angle) * dist, 500, WORLD.w - 500),
    y: clamp(state.home.y + Math.sin(angle) * dist, 500, WORLD.h - 500),
    locked: true,
  };
}

function oreOnHand(state) {
  return state.cargo + state.bank;
}

function travelCost(state) {
  if (!state.wormhole || !state.home) return 2;
  const dist = Math.hypot(state.wormhole.x - state.home.x, state.wormhole.y - state.home.y);
  return 2 + Math.round(dist / 800);
}

function spendOre(state, cost) {
  let left = cost;
  const fromCargo = Math.min(state.cargo, left);
  state.cargo -= fromCargo;
  left -= fromCargo;
  state.bank -= left;
}

function clearOfGate(x, y, hole, inner, outer) {
  if (!hole) return [x, y];
  const dx = x - hole.x;
  const dy = y - hole.y;
  const dist = Math.hypot(dx, dy) || 1;
  if (dist >= inner) return [x, y];
  return [
    clamp(hole.x + (dx / dist) * outer, 80, WORLD.w - 80),
    clamp(hole.y + (dy / dist) * outer, 80, WORLD.h - 80),
  ];
}

function rememberCluster(state) {
  state.layerBanks[state.layer] = { asteroids: state.asteroids, drops: state.drops };
  let shipX = state.ship.x;
  let shipY = state.ship.y;
  [shipX, shipY] = clearOfGate(shipX, shipY, state.wormhole, 220, 280);
  [shipX, shipY] = clearOfGate(shipX, shipY, state.returnHole, 200, 260);
  state.clusterCache[state.cluster] = {
    layerBanks: state.layerBanks,
    layer: state.layer,
    wormhole: state.wormhole,
    returnHole: state.returnHole,
    solved: state.solved,
    home: { x: state.home.x, y: state.home.y },
    shipX,
    shipY,
    aim: state.ship.aim,
  };
}

function beginShift(state, dir, after, fields, audio) {
  state.transition = Object.assign({ t: 0, dur: 0.95, dir, after, fired: false }, fields || {});
  state.mode = 'transition';
  if (audio) audio.launch();
}

function placeShipAtSpawn(state) {
  const point = randomInteriorPoint(state.rng);
  state.ship.x = point.x;
  state.ship.y = point.y;
  state.ship.vx = 0;
  state.ship.vy = 0;
  state.camera.x = point.x;
  state.camera.y = point.y;
}

export function changeLayer(state, dir, audio) {
  const next = state.layer + dir;
  if (next < LAYER_MIN || next > LAYER_MAX || state.transition) return;
  const prevAsteroids = state.asteroids.slice();
  const prevDrops = state.drops.slice();
  state.layerBanks[state.layer] = { asteroids: state.asteroids, drops: state.drops };
  beginShift(
    state,
    dir,
    () => {
      state.layer = next;
      state.missiles = [];
      state.particles = [];
      state.targetId = 0;
      state.buffer = '';
      state.hint = '';
      const saved = state.layerBanks[next];
      if (saved) {
        state.asteroids = saved.asteroids;
        state.drops = saved.drops;
      } else {
        state.rng = layerRng(state);
        state.asteroids = [];
        state.drops = [];
        populateField(state);
        state.layerBanks[next] = { asteroids: state.asteroids, drops: state.drops };
      }
      state.status = dir > 0 ? 'Rose to layer ' + next + '.' : 'Dropped to layer ' + next + '.';
      state.statusTime = 2.4;
    },
    { kind: 'layer', prevAsteroids, prevDrops },
    audio
  );
}

function arriveInCluster(state, cluster, returning) {
  state.cluster = cluster;
  state.ship.vx = 0;
  state.ship.vy = 0;
  state.missiles = [];
  state.particles = [];
  state.targetId = 0;
  state.buffer = '';
  state.hint = '';
  const saved = state.clusterCache[cluster];
  if (saved) {
    state.layerBanks = saved.layerBanks;
    state.layer = saved.layer;
    state.wormhole = saved.wormhole;
    state.returnHole = saved.returnHole;
    state.solved = saved.solved;
    state.home = saved.home;
    state.ship.x = saved.shipX;
    state.ship.y = saved.shipY;
    state.ship.aim = saved.aim;
    const slot = state.layerBanks[state.layer];
    state.asteroids = slot ? slot.asteroids : [];
    state.drops = slot ? slot.drops : [];
  } else {
    state.layer = 0;
    state.layerBanks = {};
    state.solved = 0;
    state.ship.aim = -Math.PI / 2;
    state.rng = layerRng(state);
    placeShipAtSpawn(state);
    state.home = { x: state.ship.x, y: state.ship.y };
    state.returnHole =
      cluster > 1
        ? {
            x: clamp(state.ship.x - 420, 220, WORLD.w - 220),
            y: clamp(state.ship.y + 80, 220, WORLD.h - 220),
            locked: false,
          }
        : null;
    state.asteroids = [];
    state.drops = [];
    populateField(state);
    placeWormhole(state);
    state.layerBanks[0] = { asteroids: state.asteroids, drops: state.drops };
  }
  state.camera.x = state.ship.x;
  state.camera.y = state.ship.y;
  state.status = returning
    ? 'Back in ' + clusterName(cluster) + '.'
    : 'Arrived in ' + clusterName(cluster) + '. The return wormhole is free.';
  state.statusTime = 4;
}

function jumpCluster(state, audio) {
  if (!state.wormhole || state.transition) return;
  const cost = travelCost(state);
  if (oreOnHand(state) < cost) return;
  rememberCluster(state);
  spendOre(state, cost);
  const dest = state.cluster + 1;
  beginShift(state, 1, () => arriveInCluster(state, dest, false), null, audio);
}

function returnCluster(state, audio) {
  if (state.cluster <= 1 || state.transition) return;
  rememberCluster(state);
  const dest = state.cluster - 1;
  beginShift(state, -1, () => arriveInCluster(state, dest, true), null, audio);
}

export function startMission(state, id, seed, audio) {
  const mission = MISSIONS[id] || MISSIONS.roam;
  if (audio) {
    audio.unlock();
    audio.launch();
  }
  state.mission = { ...mission, cleared: false };
  state.solved = 0;
  state.buffer = '';
  state.wrong = 0;
  state.targetId = 0;
  clearExtractSession(state);
  state.missiles = [];
  state.particles = [];
  state.drops = [];
  state.asteroids = [];
  state.hint = '';
  state.ship.hp = state.ship.maxHp;
  state.ship.aim = -Math.PI / 2;
  state.seed = cleanSeed(seed);
  state.cluster = 1;
  state.layer = 0;
  state.layerBanks = {};
  state.clusterCache = {};
  state.returnHole = null;
  state.transition = null;
  state.rng = layerRng(state);
  placeShipAtSpawn(state);
  state.home = { x: state.ship.x, y: state.ship.y };
  populateField(state);
  placeWormhole(state);
  state.layerBanks[0] = { asteroids: state.asteroids, drops: state.drops };
  state.mode = 'fly';
}

export function setPaused(state, paused) {
  if (paused) {
    if (state.mode !== 'fly') return;
    state.mode = 'paused';
  } else {
    if (state.mode !== 'paused') return;
    state.mode = 'fly';
  }
}

export function setFab(state, open) {
  if (open) {
    if (state.mode !== 'fly') return;
    state.mode = 'fab';
  } else {
    if (state.mode !== 'fab') return;
    state.mode = 'fly';
  }
}

export function bankCargo(state, audio) {
  if (state.cargo <= 0) return;
  state.bank += state.cargo;
  state.cargo = 0;
  if (audio) audio.pickup();
}

export function fabricateDrive(state, audio) {
  if (state.driveTier >= 3 || state.bank < 4) return;
  state.bank -= 4;
  state.driveTier += 1;
  state.ship.maxSpeed = 430 + state.driveTier * 50;
  if (audio) audio.correct();
}

export function fabricateHull(state, audio) {
  if (state.hullTier >= 3 || state.bank < 4) return;
  state.bank -= 4;
  state.hullTier += 1;
  state.ship.maxHp = 100 + state.hullTier * 30;
  state.ship.hp = Math.min(state.ship.maxHp, state.ship.hp + 30);
  if (audio) audio.correct();
}

export function fabricateHint(state, audio) {
  const rock = activeAsteroid(state);
  if (!rock || state.bank < 2) return;
  state.bank -= 2;
  const text = rock.question.answerText;
  const value = Number(text);
  state.hint =
    text.length <= 1
      ? 'Hint: the answer is ' + (value % 2 ? 'odd' : 'even') + '.'
      : 'Hint: the answer starts with ' + text[0] + '.';
  if (audio) audio.lock();
}

export function fabricateMap(state, audio) {
  if (state.mapUnlocked || state.bank < 3) return;
  state.bank -= 3;
  state.mapUnlocked = true;
  if (audio) audio.correct();
}

export function typeChar(state, ch, audio) {
  // Digits only apply during extract; fly mode no longer answers via missiles.
  if (state.mode !== 'extract') return;
  const rock = extractRock(state);
  if (!rock || rock.depleted) return;
  state.buffer += ch;
  const answer = rock.question.answerText;
  if (state.buffer === answer) {
    acceptAnswer(state, rock, audio);
    state.buffer = '';
    return;
  }
  if (!answer.startsWith(state.buffer) || state.buffer.length > answer.length) {
    state.buffer = '';
    state.wrong = 0.35;
    if (audio) audio.wrong();
  }
}

/** Numpad Enter / extractSubmit — accept if buffer matches, else clear as wrong. */
export function submitExtract(state, audio) {
  if (state.mode !== 'extract') return;
  const rock = extractRock(state);
  if (!rock || rock.depleted) return;
  if (!state.buffer) return;
  const answer = rock.question.answerText;
  if (state.buffer === answer) {
    acceptAnswer(state, rock, audio);
    state.buffer = '';
    return;
  }
  state.buffer = '';
  state.wrong = 0.35;
  if (audio) audio.wrong();
}

/** Backspace while in extract (React numpad ⌫). */
export function extractBackspace(state) {
  if (state.mode !== 'extract') return;
  state.buffer = state.buffer.slice(0, -1);
}

/** Unused for rocks (extract is primary). Kept for possible future non-rock targets. */
function launchMissile(state, rock, audio) {
  const ship = state.ship;
  const x = ship.x + Math.cos(ship.aim) * 40;
  const y = ship.y + Math.sin(ship.aim) * 40;
  const dx = rock.x - x;
  const dy = rock.y - y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = -dy / dist;
  const ny = dx / dist;
  const facing = nx * Math.cos(ship.aim) + ny * Math.sin(ship.aim);
  state.missiles.push({
    x,
    y,
    vx: Math.cos(ship.aim) * 80,
    vy: Math.sin(ship.aim) * 80,
    bend: facing >= 0 ? 1 : -1,
    targetId: rock.id,
    life: 6,
    age: 0,
  });
  if (audio) audio.shot();
}

/** Correct extract answer: shrink, ore, quota progress — no missile / destroy. */
function acceptAnswer(state, rock, audio) {
  if (state.mode !== 'extract') return;
  if (!rock || !rock.alive) return;
  ensureRockExtractFields(rock);
  if (rock.depleted) return;

  if (audio) audio.correct();
  state.extractToast = EXTRACT_TOAST;
  state.extractToastTime = EXTRACT_TOAST_DUR;
  state.solved += 1;

  rock.radius *= EXTRACT_SHRINK;
  rock.size *= EXTRACT_SHRINK;
  rock.extractCount += 1;

  state.drops.push({
    id: state.nextId++,
    x: rock.x,
    y: rock.y,
    amount: rock.difficulty === 'hard' ? 3 : 1,
    life: 16,
    maxLife: 16,
  });

  for (let i = 0; i < 16; i++) {
    const angle = state.rng() * Math.PI * 2;
    const speed = 40 + state.rng() * 160;
    state.particles.push({
      x: rock.x,
      y: rock.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.55 + state.rng() * 0.4,
      size: 3 + state.rng() * 3.5,
      color: i % 2 === 0 ? '#ffb15a' : '#d7f6ff',
    });
  }

  if (rock.extractCount >= 3) {
    rock.depleted = true;
    rock.radius *= EXTRACT_DEPLETE_SHRINK;
    rock.size *= EXTRACT_DEPLETE_SHRINK;
    cancelExtract(state);
    state.extractAvailable = null;
  } else {
    const operation =
      rock.operation ||
      (state.mission && state.mission.operation
        ? state.mission.operation
        : state.rng() < 0.5
          ? 'add'
          : 'sub');
    rock.question = nextProblem(problemSpec(operation, rock.difficulty || 'easy'), state.rng);
    rock.difficulty = rock.question.difficulty;
    state.hint = '';
  }
}

function destroyAsteroid(state, rock, audio) {
  if (!rock.alive) return;
  // Missile impact path only — answer path no longer routes here for rocks.
  rock.alive = false;
  for (let i = 0; i < 18; i++) {
    const angle = state.rng() * Math.PI * 2;
    const speed = 40 + state.rng() * 180;
    state.particles.push({
      x: rock.x,
      y: rock.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.55 + state.rng() * 0.3,
      size: 2 + state.rng() * 3,
      color: i % 3 === 0 ? '#ffb15a' : '#d7f6ff',
    });
  }
  state.drops.push({
    id: state.nextId++,
    x: rock.x,
    y: rock.y,
    amount: rock.difficulty === 'hard' ? 3 : 1,
    life: 16,
    maxLife: 16,
  });
  state.asteroids = state.asteroids.filter((item) => item.alive);
  const operation =
    state.mission && state.mission.operation
      ? state.mission.operation
      : state.rng() < 0.5
        ? 'add'
        : 'sub';
  const difficulty =
    state.mission && state.mission.operation
      ? state.rng() < 0.7
        ? 'easy'
        : 'hard'
      : state.rng() < 0.65
        ? 'easy'
        : 'hard';
  spawnAsteroid(state, operation, difficulty, 'far');
}

function nearestAsteroid(state, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const rock of state.asteroids) {
    if (!rock.alive) continue;
    const dist = Math.hypot(rock.x - state.ship.x, rock.y - state.ship.y);
    if (dist < bestDist) {
      best = rock;
      bestDist = dist;
    }
  }
  return best;
}

function screenToWorld(state, view, x, y) {
  return {
    x: x - view.w / 2 + state.camera.x,
    y: y - view.h / 2 + state.camera.y,
  };
}

function easeCamera(state, dt) {
  const k = 1 - Math.exp(-3.2 * dt);
  state.camera.x += (state.ship.x - state.camera.x) * k;
  state.camera.y += (state.ship.y - state.camera.y) * k;
}

function containShip(state) {
  const ship = state.ship;
  const pad = 36;
  if (ship.x < pad) {
    ship.x = pad;
    ship.vx = Math.abs(ship.vx) * 0.4;
  } else if (ship.x > WORLD.w - pad) {
    ship.x = WORLD.w - pad;
    ship.vx = -Math.abs(ship.vx) * 0.4;
  }
  if (ship.y < pad) {
    ship.y = pad;
    ship.vy = Math.abs(ship.vy) * 0.4;
  } else if (ship.y > WORLD.h - pad) {
    ship.y = WORLD.h - pad;
    ship.vy = -Math.abs(ship.vy) * 0.4;
  }
}

function breachHull(state, audio) {
  const ship = state.ship;
  if (state.cargo > 0) {
    state.drops.push({
      id: state.nextId++,
      x: ship.x,
      y: ship.y,
      amount: state.cargo,
      life: 18,
      maxLife: 18,
    });
    state.cargo = 0;
  }
  ship.hp = ship.maxHp;
  ship.vx = 0;
  ship.vy = 0;
  let placed = false;
  for (let guard = 0; guard < 24; guard++) {
    const x = 400 + state.rng() * (WORLD.w - 800);
    const y = 400 + state.rng() * (WORLD.h - 800);
    const clear = state.asteroids.every((rock) => Math.hypot(rock.x - x, rock.y - y) > 280);
    if (clear) {
      ship.x = x;
      ship.y = y;
      placed = true;
      break;
    }
  }
  if (!placed) {
    ship.x = WORLD.w / 2;
    ship.y = WORLD.h / 2;
  }
  state.camera.x = ship.x;
  state.camera.y = ship.y;
  state.status = 'Hull breached. Carried ore was dropped on the spot.';
  state.statusTime = 4.5;
  if (audio) {
    if (typeof audio.hit === 'function') audio.hit();
    if (audio.playKey) {
      /* explosion via hit fallbacks */
    }
  }
  if (audio && typeof audio.syncMotionLoops === 'function') {
    audio.syncMotionLoops(false, false);
  }
}

function separateFromRocks(state, audio) {
  const ship = state.ship;
  for (const rock of state.asteroids) {
    const dx = ship.x - rock.x;
    const dy = ship.y - rock.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const min = SHIP_RADIUS + rock.radius;
    if (dist < min) {
      const nx = dx / dist;
      const ny = dy / dist;
      ship.x = rock.x + nx * min;
      ship.y = rock.y + ny * min;
      const vn = ship.vx * nx + ship.vy * ny;
      if (vn < 0) {
        ship.vx -= vn * nx * 1.2;
        ship.vy -= vn * ny * 1.2;
      }
      if (state.bumpCooldown <= 0 && state.mode === 'fly') {
        ship.hp = Math.max(0, ship.hp - 14);
        state.bumpCooldown = 1.1;
        state.hurt = 0.4;
        if (audio) {
          if (typeof audio.damaged === 'function') audio.damaged();
          else audio.hit();
        }
        if (ship.hp <= 0) breachHull(state, audio);
      }
    }
  }
}

function clickWorld(state, view, click) {
  if (click.worldX != null && click.worldY != null) {
    return { x: click.worldX, y: click.worldY };
  }
  return screenToWorld(state, view, click.x, click.y);
}

function handleClicks(state, input, view, audio) {
  if (state.mode !== 'fly') {
    input.takeClicks();
    return;
  }
  for (const click of input.takeClicks()) {
    const world = clickWorld(state, view, click);
    const hit = asteroidAt(state, world.x, world.y);
    if (!hit) continue;
    if (hit.id !== state.targetId) {
      state.buffer = '';
      state.hint = '';
    }
    state.targetId = hit.id;
    if (audio) audio.lock();
  }
}

function updateMissiles(state, dt, audio) {
  const speed = 700;
  for (const missile of state.missiles) {
    missile.life -= dt;
    missile.age += dt;
    const rock = state.asteroids.find((item) => item.id === missile.targetId && item.alive);
    if (!rock) {
      missile.life = 0;
      continue;
    }
    const dx = rock.x - missile.x;
    const dy = rock.y - missile.y;
    const dist = Math.hypot(dx, dy) || 1;
    const desired = Math.atan2(dy, dx);
    const bias = missile.age > 0.45 || dist < 140 ? 0 : missile.bend * Math.min(0.9, dist / 480);
    const heading = desired + bias;
    missile.vx = Math.cos(heading) * speed;
    missile.vy = Math.sin(heading) * speed;
    missile.x += missile.vx * dt;
    missile.y += missile.vy * dt;
    state.particles.push({
      x: missile.x,
      y: missile.y,
      vx: 0,
      vy: 0,
      life: 0.28,
      size: 3,
      color: '#b9f3ff',
    });
    if (missile.age > 2.2) {
      missile.x = rock.x;
      missile.y = rock.y;
    }
    if (dist < rock.radius + 28 || missile.age > 2.2) {
      missile.life = 0;
      destroyAsteroid(state, rock, audio);
    }
  }
  state.missiles = state.missiles.filter((missile) => missile.life > 0);
}

function updateParticles(state, dt) {
  for (const bit of state.particles) {
    bit.x += bit.vx * dt;
    bit.y += bit.vy * dt;
    bit.life -= dt;
  }
  state.particles = state.particles.filter((bit) => bit.life > 0);
}

function updateDrops(state, dt, audio) {
  const ship = state.ship;
  for (const drop of state.drops) {
    drop.life -= dt;
    if (drop.life <= 0) continue;
    if (Math.hypot(drop.x - ship.x, drop.y - ship.y) < 56) {
      state.cargo += drop.amount;
      drop.life = 0;
      if (audio) audio.pickup();
    }
  }
  state.drops = state.drops.filter((drop) => drop.life > 0);
}

function updateReturnHole(state, audio) {
  const hole = state.returnHole;
  if (!hole || state.mode !== 'fly' || state.transition) return;
  const dist = Math.hypot(state.ship.x - hole.x, state.ship.y - hole.y);
  if (dist < 140) returnCluster(state, audio);
}

function updateWormhole(state, audio) {
  const hole = state.wormhole;
  const mission = state.mission;
  if (!hole || !mission || !mission.quota) return;
  hole.locked = state.solved < mission.quota;
  if (hole.locked || mission.cleared || state.mode !== 'fly' || state.transition) return;
  const dist = Math.hypot(state.ship.x - hole.x, state.ship.y - hole.y);
  if (dist < 150) {
    const cost = travelCost(state);
    if (oreOnHand(state) >= cost) {
      jumpCluster(state, audio);
      return;
    }
    mission.cleared = true;
    state.mode = 'clear';
    state.ship.vx = 0;
    state.ship.vy = 0;
    state.clearTitle = mission.name + ' is clear';
    state.clearCopy =
      'The quota is met. A jump to the next cluster costs ' +
      cost +
      ' ore and you have ' +
      oreOnHand(state) +
      '. Fly the mission again and bring ore to the gate, or pick another mission.';
    if (audio) audio.correct();
  }
}

/** Physics: thrust, reverse (0.35*accel + 0.4 reverseCap), drag, movement. */
export function updatePhysics(state, dt, input) {
  const ship = state.ship;
  let thrust = 0;
  if (input.thrust() || (input.mouse.touch && input.mouse.held)) thrust = 1;
  const brake = input.brake();
  const strafe = input.strafe();
  ship.thrusting = thrust > 0 && !brake;
  ship.thrust = thrust;

  const accel = 520;
  const reverseAccel = accel * 0.35;
  if (thrust && !brake) {
    ship.vx += Math.cos(ship.aim) * accel * dt;
    ship.vy += Math.sin(ship.aim) * accel * dt;
  } else if (brake && !thrust) {
    ship.vx -= Math.cos(ship.aim) * reverseAccel * dt;
    ship.vy -= Math.sin(ship.aim) * reverseAccel * dt;
  }
  if (strafe) {
    ship.vx += Math.cos(ship.aim + Math.PI / 2) * strafe * 360 * dt;
    ship.vy += Math.sin(ship.aim + Math.PI / 2) * strafe * 360 * dt;
  }
  const drag = brake ? 3.4 : 0.85;
  ship.vx -= ship.vx * drag * dt;
  ship.vy -= ship.vy * drag * dt;
  const maxSpeed = ship.maxSpeed || 430;
  const reverseCap = maxSpeed * 0.4;
  if (brake && !thrust) {
    const fx = Math.cos(ship.aim);
    const fy = Math.sin(ship.aim);
    const along = ship.vx * fx + ship.vy * fy;
    if (along < -reverseCap) {
      const excess = -along - reverseCap;
      ship.vx += fx * excess;
      ship.vy += fy * excess;
    }
  }
  const speed = len(ship.vx, ship.vy);
  if (speed > maxSpeed) {
    ship.vx = (ship.vx / speed) * maxSpeed;
    ship.vy = (ship.vy / speed) * maxSpeed;
  }

  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  containShip(state);
}

export function updateFly(state, dt, ctx) {
  const { input, audio, view } = ctx;
  const ship = state.ship;
  // Prefer Phaser camera world points (set by PlayScene.syncPointerWorld); fall back to CSS math.
  const mouse = input.mouse;
  const mouseWorld =
    mouse.worldX != null && mouse.worldY != null
      ? { x: mouse.worldX, y: mouse.worldY }
      : screenToWorld(state, view, mouse.x, mouse.y);
  const desired = Math.atan2(mouseWorld.y - ship.y, mouseWorld.x - ship.x);
  ship.aim += clamp(wrapAngle(desired - ship.aim), -6.5 * dt, 6.5 * dt);

  updatePhysics(state, dt, input);
  if (audio && typeof audio.syncMotionLoops === 'function') {
    audio.syncMotionLoops(!!ship.thrusting, state.mode === 'fly');
  }
  separateFromRocks(state, audio);

  for (const rock of state.asteroids) {
    rock.rot += rock.spin * dt;
    rock.x += Math.cos(rock.drift) * 12 * dt;
    rock.y += Math.sin(rock.drift) * 12 * dt;
    if (rock.x < 100 || rock.x > WORLD.w - 100) rock.drift = Math.PI - rock.drift;
    if (rock.y < 100 || rock.y > WORLD.h - 100) rock.drift = -rock.drift;
    rock.active = false;
    rock.near = false;
  }
  const nearest = nearestAsteroid(state, APPROACH);
  if (nearest) {
    ensureRockExtractFields(nearest);
    nearest.near = true;
    state.extractAvailable = nearest.depleted ? null : nearest.id;
  } else {
    state.extractAvailable = null;
  }
  const target = activeAsteroid(state);
  if (!target) {
    state.targetId = 0;
  } else {
    target.active = true;
  }
  handleClicks(state, input, view, audio);
  for (const rock of state.asteroids) {
    if (rock.dying == null) continue;
    rock.dying -= dt;
    if (rock.dying <= 0) destroyAsteroid(state, rock, audio);
  }
  updateMissiles(state, dt, audio);
  updateParticles(state, dt);
  updateDrops(state, dt, audio);
  updateReturnHole(state, audio);
  updateWormhole(state, audio);
  if (state.bumpCooldown > 0) state.bumpCooldown -= dt;
  if (state.hurt > 0) state.hurt -= dt;
  if (state.statusTime > 0) state.statusTime -= dt;
  if (state.wrong > 0) state.wrong -= dt;
  tickExtractToast(state, dt);
  state.clock += dt;
  easeCamera(state, dt);
}

export function updateTransition(state, dt) {
  const shift = state.transition;
  if (!shift) return;
  shift.t += dt;
  state.clock += dt;
  if (!shift.fired && shift.t >= shift.dur * 0.45) {
    shift.fired = true;
    shift.after();
  }
  if (shift.t >= shift.dur) {
    state.transition = null;
    if (state.mode === 'transition') state.mode = 'fly';
  }
}

export function idle(state, dt, audio) {
  state.clock += dt;
  state.ship.aim += dt * 0.15;
  for (const rock of state.asteroids) rock.rot += rock.spin * dt;
  updateParticles(state, dt);
  updateDrops(state, dt, audio);
  tickExtractToast(state, dt);
  if (state.wrong > 0) state.wrong -= dt;
  easeCamera(state, dt);
  if (audio && typeof audio.syncMotionLoops === 'function') {
    audio.syncMotionLoops(false, false);
  }
}

function extractQuestionReadout(state) {
  if (state.mode !== 'extract') return '';
  const rock = extractRock(state);
  if (!rock || !rock.question) return '';
  const stars = rock.difficulty === 'hard' ? '★★★  ' : '★  ';
  return stars + rock.question.prompt;
}

export function questionReadout(state) {
  const active = activeAsteroid(state);
  const near = state.asteroids.some((rock) => rock.near);
  const quota = state.mission && state.mission.quota ? state.mission.quota : 0;
  if (state.hint && active) {
    const stars = active.difficulty === 'hard' ? '★★★  ' : '★  ';
    return stars + active.question.prompt + '  ' + state.hint;
  }
  if (active) {
    const stars = active.difficulty === 'hard' ? '★★★  ' : '★  ';
    return stars + active.question.prompt;
  }
  if (state.statusTime > 0) return state.status;
  if (
    state.returnHole &&
    Math.hypot(state.ship.x - state.returnHole.x, state.ship.y - state.returnHole.y) < 280
  ) {
    return 'Return wormhole. Flying in goes back, and this jump is free.';
  }
  if (
    state.wormhole &&
    Math.hypot(state.ship.x - state.wormhole.x, state.ship.y - state.wormhole.y) < 280
  ) {
    return state.wormhole.locked
      ? 'Wormhole locked. ' + state.solved + '/' + quota + ' rocks answered.'
      : 'Wormhole open. The jump costs ' +
          travelCost(state) +
          ' ore. You have ' +
          oreOnHand(state) +
          '.';
  }
  if (near) {
    return 'One star is easier. Three stars are harder. Click to see the question.';
  }
  if (state.wormhole) {
    return state.wormhole.locked
      ? 'Answer ' + quota + ' rocks to unlock the wormhole.'
      : 'The wormhole is unlocked, ' +
          Math.round(
            Math.hypot(state.ship.x - state.wormhole.x, state.ship.y - state.wormhole.y)
          ) +
          ' away. Follow the marker.';
  }
  return 'Roam the belt. Nothing is timed.';
}

export function buildHudFields(state) {
  const quota = state.mission && state.mission.quota ? state.mission.quota : 0;
  const speed = Math.round(len(state.ship.vx, state.ship.vy));
  let mission = state.mission
    ? state.mission.name +
      ' · ' +
      clusterName(state.cluster) +
      ' · L' +
      state.layer +
      (quota ? ' · ' + Math.min(state.solved, quota) + '/' + quota : '')
    : 'Prisms of Assembly';
  if (state.wormhole && quota) {
    const range = Math.round(
      Math.hypot(state.ship.x - state.wormhole.x, state.ship.y - state.wormhole.y)
    );
    mission += state.wormhole.locked ? ' · gate locked' : ' · gate ' + range;
  }
  const maxHp = state.ship.maxHp || 1;
  const hullPct = Math.max(0, Math.min(100, Math.round((state.ship.hp / maxHp) * 100)));
  return {
    mission,
    rocks: quota ? Math.min(state.solved, quota) + '/' + quota : String(state.solved),
    hull: Math.round(state.ship.hp) + '/' + state.ship.maxHp,
    hullPct,
    cargo: String(state.cargo),
    bank: String(state.bank),
    speed: String(speed),
    question: questionReadout(state),
    buffer: state.buffer,
    bufferBad: state.wrong > 0,
    hint: state.hint
      ? state.hint
      : 'Hard rocks drop more ore. Bank it before a hull breach. F opens fabrication.',
  };
}

export function buildFabFields(state) {
  const rock = activeAsteroid(state);
  return {
    fabCopy:
      'Ore in the cargo hold is lost if the hull fails. Banking it keeps it. Nothing here is saved to an account.',
    fabBankLabel: state.cargo
      ? 'Move ' + state.cargo + ' carried ore into the bay.'
      : 'The hold is empty.',
    fabDriveLabel:
      state.driveTier >= 3
        ? 'Drive is at the top tier.'
        : 'Spend 4 banked ore. Tier ' +
          state.driveTier +
          ' of 3. Top speed ' +
          state.ship.maxSpeed +
          '.',
    fabHullLabel:
      state.hullTier >= 3
        ? 'Hull is at the top tier.'
        : 'Spend 4 banked ore. Tier ' + state.hullTier + ' of 3. Hull ' + state.ship.maxHp + '.',
    fabHintLabel: rock
      ? 'Spend 2 banked ore for a nudge on the targeted rock.'
      : 'Target a rock first, then spend 2 banked ore.',
    fabMapLabel: state.mapUnlocked
      ? 'Sector map owned. Minimap stays on for this session.'
      : 'Spend 3 banked ore. One-shot unlock for the sector minimap.',
    fabBankDisabled: state.cargo <= 0,
    fabDriveDisabled: state.driveTier >= 3 || state.bank < 4,
    fabHullDisabled: state.hullTier >= 3 || state.bank < 4,
    fabHintDisabled: !rock || state.bank < 2,
    fabMapDisabled: state.mapUnlocked || state.bank < 3,
    mapUnlocked: !!state.mapUnlocked,
    mapCost: 3,
  };
}

export function buildSnapshotPatch(state, muted) {
  return {
    mode: state.mode,
    muted: !!muted,
    clearTitle: state.clearTitle,
    clearCopy: state.clearCopy,
    extractAvailable: state.extractAvailable || null,
    extractMode: state.mode === 'extract',
    extractQuestion: extractQuestionReadout(state),
    extractToast: state.extractToast || '',
    extractRockId: state.extractRockId || null,
    ...buildFabFields(state),
    hud: buildHudFields(state),
  };
}
