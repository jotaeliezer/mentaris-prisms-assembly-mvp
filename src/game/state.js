import { nextProblem, problemSpec } from './questions.js';
import { clamp, makeRng, rand } from './util.js';
import { DEFAULT_SHIP } from './assetsManifest.js';
import { CARGO_SIZE, emptyStacks } from './items.js';

export const WORLD = { w: 72000, h: 52000 };
export const SHIP_RADIUS = 28;
export const APPROACH = 340;
/** Inclusive stack. Layer 0 sits in the middle; Q/E stop at the ends. */
export const LAYER_MIN = -250;
export const LAYER_MAX = 250;
export const LAYER_COUNT = LAYER_MAX - LAYER_MIN + 1;
/** Same edge inset as a rock scattered in the open belt. */
export const SHIP_SPAWN_PAD = 180;

/** Seeded point inside the belt, clear of the world edge by SHIP_SPAWN_PAD. */
export function randomInteriorPoint(rng) {
  const pad = SHIP_SPAWN_PAD;
  return {
    x: pad + rng() * (WORLD.w - pad * 2),
    y: pad + rng() * (WORLD.h - pad * 2),
  };
}

export const MISSIONS = {
  add: { id: 'add', name: 'Addition Drift', operation: 'add', quota: 5, next: 'sub' },
  sub: { id: 'sub', name: 'Subtraction Rift', operation: 'sub', quota: 5, next: 'add' },
  roam: { id: 'roam', name: 'Open belt', operation: null, quota: 0, next: 'add' },
};

/** Spacing of the belt grid. Cells fill in around the ship as it flies. */
export const FIELD_STEP = 720;
/** How far from the ship the belt keeps rocks ready to extract. */
export const BELT_RADIUS = 3000;

/** Five rock pictures, rarest last. Weights are out of 100, in the coal-to-diamond sense. */
export const ASTEROID_TYPES = [
  { sprite: 0, mineral: 'pale', name: 'Pale rock', weight: 48 },
  { sprite: 1, mineral: 'slate', name: 'Slate rock', weight: 26 },
  { sprite: 2, mineral: 'amber', name: 'Amber rock', weight: 14 },
  { sprite: 3, mineral: 'virid', name: 'Virid rock', weight: 8 },
  { sprite: 4, mineral: 'glint', name: 'Glint rock', weight: 4 },
];

export function rollAsteroidType(rng) {
  const total = ASTEROID_TYPES.reduce((sum, type) => sum + type.weight, 0);
  let roll = rng() * total;
  for (const type of ASTEROID_TYPES) {
    roll -= type.weight;
    if (roll <= 0) return type;
  }
  return ASTEROID_TYPES[0];
}

/** How many crystals a rock drops. Size sets the band. A hard question adds one, except glint stays tiny. */
export function mineralYield(type, size, difficulty) {
  const band = size >= 170 ? 3 : size >= 145 ? 2 : 1;
  const hard = difficulty === 'hard' ? 1 : 0;
  if (!type || type.mineral === 'glint') return 1 + hard;
  if (type.mineral === 'virid') return Math.min(3, band + hard);
  return Math.min(4, band + hard);
}

export function placeAsteroidAt(state, operation, difficulty, x, y, options) {
  const rng = options && options.rng ? options.rng : state.rng;
  const type = rollAsteroidType(rng);
  const question = nextProblem(problemSpec(operation, difficulty || 'easy'), rng);
  const size = 120 + rng() * 70;
  const radius = size * 0.34;
  const key =
    options && options.key
      ? options.key
      : 'n:' + (state.layer || 0) + ':' + Math.round(x) + ':' + Math.round(y);
  state.asteroids.push({
    id: state.nextId++,
    x,
    y,
    sprite: type.sprite,
    mineral: type.mineral,
    size,
    radius,
    baseRadius: radius,
    extractCount: 0,
    depleted: false,
    rot: rng() * Math.PI * 2,
    spin: (rng() - 0.5) * 0.28,
    drift: rng() * Math.PI * 2,
    alive: true,
    active: false,
    near: false,
    question,
    operation,
    difficulty: question.difficulty,
    outline: false,
    key,
  });
  const pending = state.remoteMines && state.remoteMines.get(key);
  if (pending) {
    const rock = state.asteroids[state.asteroids.length - 1];
    rock.extractCount = pending.n || 0;
    if (Number.isFinite(pending.size)) {
      rock.size = pending.size;
      rock.sizeTarget = pending.size;
      rock.radius = Math.max(8, pending.size * 0.34);
      rock.radiusTarget = rock.radius;
    }
    if (pending.depleted) rock.depleted = true;
    if (pending.alive === false) rock.alive = false;
    if (pending.question) rock.question = pending.question;
  }
}

export function spawnAsteroid(state, operation, difficulty, place, options) {
  let x = state.ship.x;
  let y = state.ship.y;
  const minShip = place === 'far' ? 1100 : 420;
  for (let guard = 0; guard < 40; guard++) {
    if (place === 'near' || place === 'mid') {
      const angle = state.rng() * Math.PI * 2;
      const dist = place === 'near' ? 250 + state.rng() * 40 : 520 + state.rng() * 480;
      x = clamp(state.ship.x + Math.cos(angle) * dist, 160, WORLD.w - 160);
      y = clamp(state.ship.y + Math.sin(angle) * dist, 160, WORLD.h - 160);
    } else {
      const point = randomInteriorPoint(state.rng);
      x = point.x;
      y = point.y;
    }
    const shipDist = Math.hypot(x - state.ship.x, y - state.ship.y);
    const clearOfShip =
      place === 'near'
        ? shipDist > 230 && shipDist < 310
        : place === 'mid'
          ? shipDist > 500 && shipDist < 1100
          : shipDist > minShip;
    const gap = place === 'near' ? 130 : 260;
    const clearOfRocks = state.asteroids.every((rock) => Math.hypot(x - rock.x, y - rock.y) > gap);
    if (clearOfShip && clearOfRocks) break;
  }
  placeAsteroidAt(state, operation, difficulty, x, y, options);
}

/**
 * Fill belt cells around the ship. Already-filled cells stay put, so flying
 * across the layer keeps adding rocks instead of only clustering at spawn.
 * The spawn pocket is left to the near placements.
 */
/** Stable id for a belt cell. The same seed, cluster, and layer always rebuild it. */
export function beltRockKey(state, gx, gy) {
  const cluster = state && state.cluster ? state.cluster : 1;
  const layer = state && state.layer ? state.layer : 0;
  return 'b:' + cluster + ':' + layer + ':' + gx + ',' + gy;
}

function beltCellSeed(state, gx, gy) {
  const missionId = state.mission ? state.mission.id : 'roam';
  return (
    (state.seed || 'belt') +
    '|c' +
    (state.cluster || 1) +
    '|l' +
    (state.layer || 0) +
    '|' +
    missionId +
    '|' +
    gx +
    ',' +
    gy
  );
}

export function ensureBelt(state, operation) {
  if (!state.beltCells) state.beltCells = new Set();
  const step = FIELD_STEP;
  const margin = 480;
  const reach = BELT_RADIUS;
  const sx = state.ship.x;
  const sy = state.ship.y;
  const x0 = Math.max(margin, Math.floor((sx - reach) / step) * step);
  const y0 = Math.max(margin, Math.floor((sy - reach) / step) * step);
  const x1 = Math.min(WORLD.w - margin, Math.ceil((sx + reach) / step) * step);
  const y1 = Math.min(WORLD.h - margin, Math.ceil((sy + reach) / step) * step);
  for (let gx = x0; gx <= x1; gx += step) {
    for (let gy = y0; gy <= y1; gy += step) {
      if (Math.hypot(gx - sx, gy - sy) > reach) continue;
      const key = gx + ',' + gy;
      if (state.beltCells.has(key)) continue;
      state.beltCells.add(key);
      if (Math.hypot(gx - sx, gy - sy) < 400) continue;
      const rockKey = beltRockKey(state, gx, gy);
      if (state.goneRocks && state.goneRocks.has(rockKey)) continue;
      const rng = makeRng(beltCellSeed(state, gx, gy));
      const x = clamp(gx + (rng() - 0.5) * step * 0.5, 200, WORLD.w - 200);
      const y = clamp(gy + (rng() - 0.5) * step * 0.5, 200, WORLD.h - 200);
      const op = operation || (rng() < 0.5 ? 'add' : 'sub');
      const difficulty = rng() < 0.28 ? 'hard' : 'easy';
      placeAsteroidAt(state, op, difficulty, x, y, { rng, key: rockKey });
    }
  }
}

export function createState() {
  const rng = makeRng('phase4-belt');
  const stars = [];
  for (let i = 0; i < 140; i++) {
    const layer = i % 3;
    stars.push({
      x: rand(rng, 0, 1600),
      y: rand(rng, 0, 900),
      parallax: layer === 0 ? 0.15 : layer === 1 ? 0.4 : 0.72,
      size: layer === 2 ? 2 : 1,
      a: layer === 0 ? 0.35 : layer === 1 ? 0.7 : 0.95,
      color: i % 11 === 0 ? '#ffd7a1' : '#d7f4ff',
    });
  }
  const spawn = randomInteriorPoint(rng);
  const state = {
    mode: 'title',
    world: WORLD,
    rng,
    nextId: 1,
    stars,
    nebula: [
      { x: 1600, y: 1400, r: 640, color: 'rgba(92, 70, 160, 0.2)' },
      { x: 5200, y: 3600, r: 780, color: 'rgba(30, 110, 140, 0.16)' },
      { x: 3800, y: 900, r: 520, color: 'rgba(140, 70, 90, 0.12)' },
    ],
    asteroids: [],
    beltCells: new Set(),
    goneRocks: new Set(),
    remoteMines: new Map(),
    rockClaims: new Map(),
    oreClaims: new Map(),
    oreGranted: new Map(),
    mineCredit: new Set(),
    rockUndo: new Map(),
    localReplacements: new Map(),
    pendingSpawns: new Map(),
    worldEvents: [],
    ghostMissiles: [],
    seenEvents: new Set(),
    shareWorld: false,
    playerId: '',
    spawnSeq: 0,
    missiles: [],
    particles: [],
    buffer: '',
    /** Last accepted extract answer, kept while the answer box is green. */
    correctAnswer: '',
    pendingExtractClose: false,
    /** Recipe ids already announced, so a craft toast shows once. */
    knownCrafts: {},
    notices: [],
    sharedGathers: [],
    sharedRocks: [],
    solved: 0,
    wrong: 0,
    targetId: 0,
    /** Rock id within APPROACH that can open extract, or null. */
    extractAvailable: null,
    /** Rock id while mode === 'extract'. */
    extractRockId: 0,
    extractToast: '',
    extractToastTime: 0,
    ship: {
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      aim: -Math.PI / 2,
      sprite: DEFAULT_SHIP,
      thrusting: false,
      thrust: 0,
      hp: 100,
      maxHp: 100,
      maxSpeed: 430,
    },
    camera: { x: spawn.x, y: spawn.y },
    viewZoom: 1,
    mission: null,
    wormhole: null,
    seed: 'belt-7',
    cluster: 1,
    layer: 0,
    layerBanks: {},
    clusterCache: {},
    returnHole: null,
    home: { x: spawn.x, y: spawn.y },
    transition: null,
    /** T7 wires fab unlock; minimap stays hidden until true. */
    mapUnlocked: false,
    cargo: 0,
    bank: 0,
    /** Ten hotbar stacks, then a cargo hold. Null slots are empty. */
    hotbar: emptyStacks(10),
    cargoSlots: emptyStacks(CARGO_SIZE),
    drops: [],
    fxGreen: 0,
    fxFlash: 0,
    shakeTime: 0,
    shakeMag: 0,
    quiet: 0,
    wreckX: spawn.x,
    wreckY: spawn.y,
    bumpCooldown: 0,
    hurt: 0,
    driveTier: 0,
    hullTier: 0,
    hint: '',
    /** 0-based index into the ten-slot tool hotbar. Slots start empty. */
    hotbarSlot: 0,
    status: '',
    statusTime: 0,
    clock: 0,
    clearTitle: 'Mission clear',
    clearCopy:
      'The quota is met. A jump needs ore. Without it, this arrival clears the mission.',
  };
  spawnAsteroid(state, 'add', 'easy', 'near');
  spawnAsteroid(state, 'sub', 'easy', 'near');
  spawnAsteroid(state, 'add', 'hard', 'near');
  spawnAsteroid(state, 'sub', 'hard', 'near');
  ensureBelt(state);
  return state;
}

export function cleanSeed(raw) {
  const cleaned = String(raw || 'belt-7')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 24);
  return cleaned || 'belt-7';
}

export function clusterName(n) {
  return ['', 'Assembly Belt', 'Prism Drift', 'Outer Prism'][n] || 'Cluster ' + n;
}
