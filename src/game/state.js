import { nextProblem, problemSpec } from './questions.js';
import { clamp, makeRng, rand } from './util.js';
import { DEFAULT_SHIP } from './assetsManifest.js';

export const WORLD = { w: 72000, h: 52000 };
export const SHIP_RADIUS = 28;
export const APPROACH = 340;
export const LAYER_COUNT = 50;

export const MISSIONS = {
  add: { id: 'add', name: 'Addition Drift', operation: 'add', quota: 5, next: 'sub' },
  sub: { id: 'sub', name: 'Subtraction Rift', operation: 'sub', quota: 5, next: 'add' },
  roam: { id: 'roam', name: 'Open belt', operation: null, quota: 0, next: 'add' },
};

export function spawnAsteroid(state, operation, difficulty, place) {
  const question = nextProblem(problemSpec(operation, difficulty || 'easy'), state.rng);
  let x = state.ship.x;
  let y = state.ship.y;
  const minShip = place === 'far' ? 1100 : 420;
  for (let guard = 0; guard < 40; guard++) {
    if (place === 'near' || place === 'mid') {
      const angle = state.rng() * Math.PI * 2;
      const dist = place === 'near' ? 160 + state.rng() * 90 : 520 + state.rng() * 480;
      x = clamp(state.ship.x + Math.cos(angle) * dist, 160, WORLD.w - 160);
      y = clamp(state.ship.y + Math.sin(angle) * dist, 160, WORLD.h - 160);
    } else {
      x = 180 + state.rng() * (WORLD.w - 360);
      y = 180 + state.rng() * (WORLD.h - 360);
    }
    const shipDist = Math.hypot(x - state.ship.x, y - state.ship.y);
    const clearOfShip =
      place === 'near'
        ? shipDist > 150 && shipDist < 270
        : place === 'mid'
          ? shipDist > 500 && shipDist < 1100
          : shipDist > minShip;
    const gap = place === 'near' ? 130 : 260;
    const clearOfRocks = state.asteroids.every((rock) => Math.hypot(x - rock.x, y - rock.y) > gap);
    if (clearOfShip && clearOfRocks) break;
  }
  const size = 120 + state.rng() * 70;
  const radius = size * 0.34;
  state.asteroids.push({
    id: state.nextId++,
    x,
    y,
    sprite: Math.floor(state.rng() * 5),
    size,
    radius,
    baseRadius: radius,
    extractCount: 0,
    depleted: false,
    rot: state.rng() * Math.PI * 2,
    spin: (state.rng() - 0.5) * 0.28,
    drift: state.rng() * Math.PI * 2,
    alive: true,
    active: false,
    near: false,
    question,
    operation,
    difficulty: question.difficulty,
  });
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
    missiles: [],
    particles: [],
    buffer: '',
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
      x: WORLD.w / 2,
      y: WORLD.h / 2,
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
    camera: { x: WORLD.w / 2, y: WORLD.h / 2 },
    mission: null,
    wormhole: null,
    seed: 'belt-7',
    cluster: 1,
    layer: 0,
    layerBanks: Array(LAYER_COUNT).fill(null),
    clusterCache: {},
    returnHole: null,
    home: { x: WORLD.w / 2, y: WORLD.h / 2 },
    transition: null,
    /** T7 wires fab unlock; minimap stays hidden until true. */
    mapUnlocked: false,
    cargo: 0,
    bank: 0,
    drops: [],
    bumpCooldown: 0,
    hurt: 0,
    driveTier: 0,
    hullTier: 0,
    hint: '',
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
  for (let i = 0; i < 22; i++) {
    spawnAsteroid(state, i % 2 ? 'sub' : 'add', i % 3 === 0 ? 'hard' : 'easy', 'roam');
  }
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
