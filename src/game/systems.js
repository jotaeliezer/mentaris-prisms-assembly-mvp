import { clamp, len, makeRng, wrapAngle } from './util.js';
import { nextProblem, problemSpec } from './questions.js';
import {
  APPROACH,
  ASTEROID_TYPES,
  LAYER_MAX,
  LAYER_MIN,
  MISSIONS,
  SHIP_RADIUS,
  WORLD,
  cleanSeed,
  clusterName,
  ensureBelt,
  randomInteriorPoint,
  mineralYield,
  spawnAsteroid,
} from './state.js';
import { buildProgressSnapshot, decodeBanks, decodeClusters } from '../save/snapshot.js';
import { mainStarView } from './star.js';
import { damageAlien, ensureLair, nearestAlien, tickAliens } from './aliens.js';
import { grantMilestone, reviewMilestones } from './milestones.js';
import {
  dieClaimKey,
  eventOnLayer,
  mineClaimKey,
  oreIdForRock,
  rememberEvent,
  shouldApplyEvent,
  takeClaim,
} from '../multiplayer/events.js';
import {
  CARGO_COLS,
  CARGO_ROWS,
  CARGO_SIZE,
  BOW_ID,
  BOW_LEVEL_COST,
  HULL_FITS,
  ITEMS,
  addItem,
  RECIPES,
  bowLevel,
  canAfford,
  costLabel,
  countItem,
  emptyStacks,
  ensureHull,
  ensureInventory,
  hullHas,
  itemById,
  raiseBowPlating,
  slotIcon,
  iconFilter,
  moveCargoToHotbar,
  moveHotbarToCargo,
  recipeById,
  recipeOpen,
  payCraftCosts,
  removeItems,
  returnHeld,
  takeAllStacks,
} from './items.js';
import { backfillStation, placePiece, tickStructures, visiblePieces } from './construct.js';

const EXTRACT_SHRINK = 0.83;
/** World pixels of size lost per second while a rock eases toward its target. */
const SHRINK_RATE = 42;
/** Seconds after the explosion before the first crystal leaves. */
const ORE_POP_LEAD = 0.28;
/** Seconds between crystals. */
const ORE_POP_GAP = 0.36;

function queueShrink(rock, factor) {
  const sizeBase = rock.sizeTarget != null ? rock.sizeTarget : rock.size;
  const radiusBase = rock.radiusTarget != null ? rock.radiusTarget : rock.radius;
  rock.sizeTarget = sizeBase * factor;
  rock.radiusTarget = radiusBase * factor;
}

function oreLanding(state, rock, index, count) {
  const ownRim = Math.max(36, rockTouchDistance(rock) - 24);
  const close = ownRim + 22;
  const away = Math.atan2(rock.y - state.ship.y, rock.x - state.ship.x);
  const base = away + (index - (count - 1) / 2) * 0.4;
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const turn = Math.ceil(attempt / 2) * 0.38 * (attempt % 2 === 0 ? 1 : -1);
    const dist = close + (attempt > 10 ? 16 : 0);
    const angle = base + turn;
    const x = clamp(rock.x + Math.cos(angle) * dist, 80, WORLD.w - 80);
    const y = clamp(rock.y + Math.sin(angle) * dist, 80, WORLD.h - 80);
    const blocked = state.asteroids.some((other) => {
      if (!other.alive || other.id === rock.id) return false;
      return Math.hypot(other.x - x, other.y - y) < rockTouchDistance(other) + 36;
    });
    if (!blocked) return { x, y };
  }
  return {
    x: clamp(rock.x + Math.cos(base) * close, 80, WORLD.w - 80),
    y: clamp(rock.y + Math.sin(base) * close, 80, WORLD.h - 80),
  };
}

function queueExtractPops(state, rock, mineral, count) {
  if (!state.oreBursts) state.oreBursts = [];
  const pieces = [];
  for (let i = 0; i < count; i += 1) {
    const land = oreLanding(state, rock, i, count);
    pieces.push({
      itemId: mineral,
      fromX: rock.x,
      fromY: rock.y,
      toX: land.x,
      toY: land.y,
      shared: !!state.shareWorld,
      step: rock.extractCount + ':' + i,
      rockKey: rock.key,
      rockId: rock.id,
    });
  }
  state.oreBursts.push({ rockId: rock.id, pieces, next: 0 });
  state.orePopping = true;
  state.orePopClock = ORE_POP_LEAD;
}

function releasePop(state, piece, audio) {
  const id = piece.shared ? oreIdForRock(piece.rockKey, piece.step) : state.nextId++;
  if (state.drops.some((drop) => drop.id === id)) return;
  state.drops.push({
    id,
    x: piece.fromX,
    y: piece.fromY,
    fromX: piece.fromX,
    fromY: piece.fromY,
    toX: piece.toX,
    toY: piece.toY,
    itemId: piece.itemId,
    count: 1,
    life: 48,
    maxLife: 48,
    shared: !!piece.shared,
    popping: true,
    popT: 0,
    popDur: 0.42,
    popScale: 0.15,
    burstRockId: piece.rockId,
  });
  if (audio && typeof audio.pop === 'function') audio.pop();
}

function tickOrePops(state, dt, audio) {
  if (!state.oreBursts) state.oreBursts = [];
  let waiting = false;
  const ready = [];
  for (const burst of state.oreBursts) {
    const rock = state.asteroids.find((item) => item.id === burst.rockId);
    const shrinking =
      rock && rock.sizeTarget != null && Math.abs(rock.size - rock.sizeTarget) > 0.8;
    if (shrinking) waiting = true;
    else if (burst.next < burst.pieces.length) ready.push(burst);
  }
  if (ready.length) {
    state.orePopClock = (state.orePopClock || 0) - dt;
    if (state.orePopClock <= 0) {
      const burst = ready[0];
      releasePop(state, burst.pieces[burst.next], audio);
      burst.next += 1;
      state.orePopClock = ORE_POP_GAP;
    }
  }
  let flying = false;
  for (const drop of state.drops) {
    if (!drop.popping) continue;
    flying = true;
    if (!Number.isFinite(drop.popT)) drop.popT = 0;
    const dur = Number.isFinite(drop.popDur) && drop.popDur > 0 ? drop.popDur : 0.42;
    drop.popT += dt / dur;
    const u = Math.min(1, drop.popT);
    const ease = 1 - (1 - u) * (1 - u) * (1 - u);
    drop.x = drop.fromX + (drop.toX - drop.fromX) * ease;
    drop.y = drop.fromY + (drop.toY - drop.fromY) * ease;
    drop.popScale = u < 1 ? 0.15 + ease * 1.2 : 1;
    if (u >= 1) {
      drop.popping = false;
      drop.x = drop.toX;
      drop.y = drop.toY;
      drop.popScale = 1;
      if (drop.shared) {
        queueWorld(state, {
          k: 'ore',
          op: 'spawn',
          ore: drop.id,
          x: round1(drop.x),
          y: round1(drop.y),
          item: drop.itemId,
          n: 1,
        });
      }
    }
  }
  state.oreBursts = state.oreBursts.filter((burst) => burst.next < burst.pieces.length);
  state.orePopping = waiting || state.oreBursts.length > 0 || flying;
  if (state.orePopping) {
    state.ship.vx = 0;
    state.ship.vy = 0;
  }
}

function tickShrink(state, dt) {
  const step = SHRINK_RATE * dt;
  for (const rock of state.asteroids) {
    if (rock.sizeTarget == null || rock.radiusTarget == null) continue;
    const ds = rock.sizeTarget - rock.size;
    if (Math.abs(ds) <= step) {
      rock.size = rock.sizeTarget;
      rock.radius = rock.radiusTarget;
      continue;
    }
    const frac = step / Math.abs(ds);
    rock.size += Math.sign(ds) * step;
    rock.radius += (rock.radiusTarget - rock.radius) * frac;
  }
}

function punchCamera(state) {
  state.shakeTime = 0.2;
  state.shakeMag = 68;
}

function tickFx(state, dt) {
  if (state.shakeTime > 0) state.shakeTime = Math.max(0, state.shakeTime - dt);
  if (state.notices && state.notices.length) {
    for (const note of state.notices) note.time -= dt;
    state.notices = state.notices.filter((note) => note.time > 0);
  }
  if (state.fxGreen > 0) {
    state.fxGreen = Math.max(0, state.fxGreen - dt);
    if (state.fxGreen === 0) finishGreen(state);
  }
  if (state.fxFlash > 0) state.fxFlash = Math.max(0, state.fxFlash - dt);
  if (state.quiet > 0) state.quiet = Math.max(0, state.quiet - dt);
}

/** Green answer box ended: drop the kept answer, and close a finished rock that is still open. */
function finishGreen(state) {
  state.correctAnswer = '';
  state.closingRockName = '';
  state.asteroids = state.asteroids.filter((rock) => rock.alive && !rock.exploded);
  if (!state.pendingExtractClose) return;
  leaveExtract(state);
}

function leaveExtract(state) {
  state.pendingExtractClose = false;
  state.extractAvailable = null;
  state.extractRockId = 0;
  state.buffer = '';
  state.hint = '';
  if (state.mode === 'extract') state.mode = 'fly';
}

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
  const rock = state.asteroids.find(
    (item) => item.id === state.extractRockId && (item.alive || item.exploded)
  );
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
  state.correctAnswer = '';
  state.pendingExtractClose = false;
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
  state.beltCells = new Set();
  const mission = state.mission;
  const operation = mission && mission.operation ? mission.operation : null;
  if (operation) {
    for (let i = 0; i < 6; i++) {
      spawnAsteroid(state, operation, i % 3 === 2 ? 'hard' : 'easy', 'near');
    }
  } else {
    spawnAsteroid(state, 'add', 'easy', 'near');
    spawnAsteroid(state, 'sub', 'easy', 'near');
    spawnAsteroid(state, 'add', 'hard', 'near');
    spawnAsteroid(state, 'sub', 'hard', 'near');
    spawnAsteroid(state, 'add', 'easy', 'near');
  }
  ensureBelt(state, operation);
  ensureScenery(state);
}

const PLANET_RADIUS = { small: 520, great: 1100, vast: 2200 };

/** One planet and a few stars on this layer. The planet stays put. A base can sit on its rim. */
export function ensureScenery(state) {
  if (!state.planets) state.planets = [];
  if (!state.sunBodies) state.sunBodies = [];
  const cluster = state.cluster || 1;
  const havePlanet = state.planets.some((planet) => planet.layer === state.layer && planet.cluster === cluster);
  if (!havePlanet) {
    const rng = makeRng((state.seed || 'belt') + '|planet|' + cluster + '|' + state.layer);
    const kind = state.layer !== 0 && state.layer % 23 === 0 ? 'vast' : state.layer !== 0 && state.layer % 7 === 0 ? 'great' : 'small';
    const r = PLANET_RADIUS[kind];
    let x = clamp(state.ship.x + 3200, r + 400, WORLD.w - r - 400);
    let y = clamp(state.ship.y, r + 400, WORLD.h - r - 400);
    for (let i = 0; i < 14; i += 1) {
      const angle = rng() * Math.PI * 2;
      const dist = 2600 + r * 0.4 + rng() * 1600;
      const px = clamp(state.ship.x + Math.cos(angle) * dist, r + 400, WORLD.w - r - 400);
      const py = clamp(state.ship.y + Math.sin(angle) * dist, r + 400, WORLD.h - r - 400);
      const blocked = state.planets.some((planet) => Math.hypot(planet.x - px, planet.y - py) < planet.r + r + 900);
      if (!blocked) {
        x = px;
        y = py;
        break;
      }
    }
    state.planets.push({
      layer: state.layer,
      cluster,
      x,
      y,
      r,
      kind,
      key: 'planet-' + kind + '.png',
    });
  }
  state.planet = state.planets.find((planet) => planet.layer === state.layer && planet.cluster === cluster) || null;
  if (!state.sunBodies.some((star) => star.layer === state.layer && star.cluster === cluster)) {
    const rng = makeRng((state.seed || 'belt') + '|star|' + cluster + '|' + state.layer);
    const count = rng() < 0.4 ? 0 : rng() < 0.8 ? 1 : 2;
    const order = ['pale', 'pale', 'cinder', 'glint'];
    for (let i = 0; i < count; i += 1) {
      const kind = order[Math.min(order.length - 1, Math.floor(rng() * order.length))];
      const angle = rng() * Math.PI * 2;
      const dist = 1400 + rng() * 2400;
      state.sunBodies.push({
        layer: state.layer,
        cluster,
        x: clamp(state.ship.x + Math.cos(angle) * dist, 500, WORLD.w - 500),
        y: clamp(state.ship.y + Math.sin(angle) * dist, 500, WORLD.h - 500),
        r: 78,
        kind,
        key: 'star-' + kind + '.png',
      });
    }
  }
  if (!state.spaceObjects) state.spaceObjects = [];
  if (!state.spaceObjects.some((object) => object.layer === state.layer && object.cluster === cluster)) {
    const rng = makeRng((state.seed || 'belt') + '|space|' + cluster + '|' + state.layer);
    const place = (kind, key, r, extra) => {
      const angle = rng() * Math.PI * 2;
      const dist = 1800 + rng() * 2200;
      state.spaceObjects.push({
        id: kind + ':' + cluster + ':' + state.layer + ':' + state.spaceObjects.length,
        layer: state.layer,
        cluster,
        kind,
        key,
        r,
        x: clamp(state.ship.x + Math.cos(angle) * dist, 600, WORLD.w - 600),
        y: clamp(state.ship.y + Math.sin(angle) * dist, 600, WORLD.h - 600),
        taken: false,
        lootLeft: kind === 'debris' ? 3 : kind === 'comet' ? 2 : 1,
        vx: kind === 'comet' ? Math.cos(angle) * 40 : 0,
        vy: kind === 'comet' ? Math.sin(angle) * 40 : 0,
        ...extra,
      });
    };
    place('debris', 'debris-field.png', 420);
    if (rng() < 0.7) place('ion', 'ion-stream.png', 180);
    if (rng() < 0.45) place('prism', 'prism-ring.png', 90);
    if (rng() < 0.35) place('stronghold', 'stronghold.png', 160);
    if (rng() < 0.4) place('comet', 'comet.png', 70);
  }
  ensureLair(state);
}

function spillFind(state, itemId, x, y) {
  state.drops.push({
    id: state.nextId++,
    x,
    y,
    itemId,
    count: 1,
    life: 90,
    maxLife: 90,
  });
}

function tickSpaceObjects(state, dt) {
  const ship = state.ship;
  if (!ship || !state.spaceObjects) return;
  for (const object of state.spaceObjects) {
    if (object.layer !== state.layer) continue;
    if (object.kind === 'comet') {
      object.x += (object.vx || 0) * dt;
      object.y += (object.vy || 0) * dt;
    }
    const dist = Math.hypot(ship.x - object.x, ship.y - object.y);
    if (object.kind === 'debris' && dist < object.r) {
      if (state.quiet > 0) grantMilestone(state, 'quiet-debris');
      object.touch = (object.touch || 0) + dt;
      if (object.touch > 1.6 && object.lootLeft > 0) {
        object.touch = 0;
        object.lootLeft -= 1;
        spillFind(state, 'salvage', ship.x + 30, ship.y);
        if (state.bumpCooldown <= 0 && !(state.quiet > 0)) {
          state.bumpCooldown = 0.7;
          ship.hp = Math.max(0, ship.hp - 3);
        }
      }
    }
    if (object.kind === 'ion' && dist < object.r && !object.taken) {
      object.taken = true;
      ship.vx += 40;
      spillFind(state, 'ion', ship.x, ship.y + 24);
    }
    if (object.kind === 'prism' && dist < object.r && !object.taken) {
      object.taken = true;
      spillFind(state, 'prism', object.x, object.y);
    }
    if (object.kind === 'comet' && dist < 160 && object.lootLeft > 0) {
      object.lootLeft -= 1;
      spillFind(state, 'comet', object.x, object.y);
    }
    if (object.kind === 'stronghold' && dist < object.r && !object.taken) {
      object.taken = true;
      const parts = ['gland', 'shard', 'lamp', 'chart', 'core'];
      spillFind(state, parts[Math.floor(state.rng() * parts.length)], object.x, object.y);
      grantMilestone(state, 'stronghold');
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
  const stacked = countItem(state, 'pale') + countItem(state, 'amber') * 2;
  return stacked + (Number(state.cargo) || 0) + (Number(state.bank) || 0);
}

function travelCost(state) {
  if (!state.wormhole || !state.home) return 2;
  const dist = Math.hypot(state.wormhole.x - state.home.x, state.wormhole.y - state.home.y);
  return 2 + Math.round(dist / 800);
}

function spendOre(state, cost) {
  let left = cost;
  const fromCargo = Math.min(Number(state.cargo) || 0, left);
  state.cargo = (Number(state.cargo) || 0) - fromCargo;
  left -= fromCargo;
  if (left > 0) {
    const usePale = Math.min(countItem(state, 'pale'), left);
    if (usePale) removeItems(state, 'pale', usePale);
    left -= usePale;
  }
  if (left > 0) {
    const useAmber = Math.min(countItem(state, 'amber'), Math.ceil(left / 2));
    if (useAmber) removeItems(state, 'amber', useAmber);
    left -= useAmber * 2;
  }
  if (left > 0) state.bank = (Number(state.bank) || 0) - left;
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

function saveLayerBank(state) {
  state.layerBanks[state.layer] = {
    asteroids: state.asteroids,
    drops: state.drops,
    beltCells: state.beltCells,
    goneRocks: state.goneRocks,
    remoteMines: state.remoteMines,
  };
}

function restoreLayerBank(state) {
  const slot = state.layerBanks[state.layer];
  state.asteroids = slot ? slot.asteroids : [];
  state.drops = slot ? slot.drops : [];
  state.beltCells = slot && slot.beltCells ? slot.beltCells : new Set();
  state.goneRocks = slot && slot.goneRocks ? slot.goneRocks : new Set();
  state.remoteMines = slot && slot.remoteMines ? slot.remoteMines : new Map();
}

function resetShareMaps(state) {
  state.goneRocks = new Set();
  state.remoteMines = new Map();
  state.rockClaims = new Map();
  state.oreClaims = new Map();
  state.oreGranted = new Map();
  state.mineCredit = new Set();
  state.rockUndo = new Map();
  state.localReplacements = new Map();
  state.pendingSpawns = new Map();
  state.worldEvents = [];
  state.ghostMissiles = [];
  state.seenEvents = new Set();
  state.spawnSeq = 0;
}

function rememberCluster(state) {
  saveLayerBank(state);
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
  const layer = fields && fields.kind === 'layer';
  state.transition = Object.assign({ t: 0, dur: layer ? 0.38 : 0.95, dir, after, fired: false }, fields || {});
  state.mode = 'transition';
  if (audio) {
    if (layer && typeof audio.dash === 'function') audio.dash();
    else audio.launch();
  }
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

export function hasJumper(state) {
  return hullHas(state, 'jumper');
}

export function changeLayer(state, dir, audio) {
  const next = state.layer + dir;
  if (next < LAYER_MIN || next > LAYER_MAX || state.transition) return;
  const mega = !!state.megaJump;
  state.megaJump = false;
  if (!mega && !hasJumper(state)) {
    state.status = 'Layer travel is locked. Wear a layer jumper in the hull panel.';
    state.statusTime = 3.4;
    if (audio && typeof audio.wrong === 'function') audio.wrong();
    return;
  }
  const prevAsteroids = state.asteroids.slice();
  const prevDrops = state.drops.slice();
  saveLayerBank(state);
  beginShift(
    state,
    dir,
    () => {
      state.layer = next;
      state.missiles = [];
      state.ghostMissiles = [];
      state.particles = [];
      state.targetId = 0;
      state.buffer = '';
      state.hint = '';
      const saved = state.layerBanks[next];
      if (saved) {
        state.asteroids = saved.asteroids;
        state.drops = saved.drops;
        state.beltCells = saved.beltCells || new Set();
        state.goneRocks = saved.goneRocks || new Set();
        state.remoteMines = saved.remoteMines || new Map();
      } else {
        state.rng = layerRng(state);
        state.asteroids = [];
        state.drops = [];
        state.goneRocks = new Set();
        state.remoteMines = new Map();
        populateField(state);
        saveLayerBank(state);
      }
      state.status = dir > 0 ? 'Rose to layer ' + next + '.' : 'Dropped to layer ' + next + '.';
      state.statusTime = 2.4;
      if (Math.abs(next) >= 3) grantMilestone(state, 'layer-far');
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
  state.ghostMissiles = [];
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
    restoreLayerBank(state);
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
    state.goneRocks = new Set();
    state.remoteMines = new Map();
    populateField(state);
    placeWormhole(state);
    saveLayerBank(state);
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

export function captureProgress(state) {
  saveLayerBank(state);
  return buildProgressSnapshot(state);
}

export function returnToTitle(state) {
  state.mode = 'title';
  state.transition = null;
  state.assemblyId = null;
  state.held = null;
}

export function resumeAssembly(state, progress, audio, assemblyId) {
  if (!progress || progress.version !== 1) return false;
  const mission = MISSIONS[progress.missionId] || MISSIONS.add;
  if (audio) {
    audio.unlock();
    audio.launch();
  }
  state.assemblyId = assemblyId || null;
  state.mission = { ...mission, cleared: false };
  state.seed = cleanSeed(progress.seed || state.seed);
  state.cluster = Number(progress.cluster) || 1;
  state.layer = Number.isFinite(Number(progress.layer)) ? Number(progress.layer) : 0;
  state.solved = Number(progress.solved) || 0;
  state.bank = Number(progress.bank) || 0;
  state.cargo = Number(progress.cargo) || 0;
  state.mapUnlocked = !!progress.mapUnlocked;
  state.driveTier = Number(progress.driveTier) || 0;
  state.hullTier = Number(progress.hullTier) || 0;
  state.hotbarSlot = Number(progress.hotbarSlot) || 0;
  state.knownCrafts = progress.knownCrafts && typeof progress.knownCrafts === 'object' ? progress.knownCrafts : {};
  state.taught = progress.taught && typeof progress.taught === 'object' ? progress.taught : {};
  state.hotbar = Array.isArray(progress.hotbar) ? progress.hotbar : emptyStacks(10);
  state.cargoSlots = Array.isArray(progress.cargoSlots) ? progress.cargoSlots : emptyStacks(CARGO_SIZE);
  state.hullSlots = Array.isArray(progress.hullSlots) ? progress.hullSlots : null;
  ensureInventory(state);
  const ship = progress.ship || {};
  state.ship.x = Number(ship.x) || state.ship.x;
  state.ship.y = Number(ship.y) || state.ship.y;
  state.ship.vx = Number(ship.vx) || 0;
  state.ship.vy = Number(ship.vy) || 0;
  state.ship.aim = Number.isFinite(Number(ship.aim)) ? Number(ship.aim) : -Math.PI / 2;
  state.ship.hp = Number(ship.hp) || 100;
  state.ship.maxHp = 100 + state.hullTier * 30;
  state.ship.maxSpeed = 430 + state.driveTier * 50;
  if (typeof ship.sprite === 'string' && ship.sprite) state.ship.sprite = ship.sprite;
  state.ship.hp = Math.min(state.ship.maxHp, state.ship.hp);
  if (Number.isFinite(Number(progress.clock))) state.clock = Number(progress.clock);
  state.localFlightId = typeof progress.localFlightId === 'string' ? progress.localFlightId : '';
  state.milestones = progress.milestones && typeof progress.milestones === 'object' ? { ...progress.milestones } : {};
  state.aliens = Array.isArray(progress.aliens) ? progress.aliens.map((alien) => ({ ...alien })) : [];
  state.alienShots = [];
  state.alienNext = Number(progress.alienNext) || 0;
  state.lairSeenDown = progress.lairSeenDown === true || (Number(progress.clock) || 0) > 20;
  state.starWasUp = progress.starWasUp === true ? true : progress.starWasUp === false ? false : undefined;
  state.station = progress.station && Array.isArray(progress.station.pieces) ? progress.station : null;
  state.planets = Array.isArray(progress.planets) ? progress.planets : [];
  state.sunBodies = Array.isArray(progress.sunBodies) ? progress.sunBodies : [];
  state.spaceObjects = Array.isArray(progress.spaceObjects) ? progress.spaceObjects : [];
  backfillStation(state.station);
  if (Number.isFinite(progress.nextId)) state.nextId = progress.nextId;
  const restoredPieces = state.station && state.station.pieces;
  if (Array.isArray(restoredPieces)) {
    for (const piece of restoredPieces) {
      if (!piece || !Number.isFinite(piece.uid)) continue;
      const above = piece.uid + 1;
      if (!Number.isFinite(state.nextId) || above > state.nextId) state.nextId = above;
    }
  }
  state.home = progress.home || { x: state.ship.x, y: state.ship.y };
  state.wormhole = progress.wormhole || null;
  state.returnHole = progress.returnHole || null;
  state.layerBanks = decodeBanks(progress.layerBanks);
  state.clusterCache = decodeClusters(progress.clusterCache);
  state.rng = layerRng(state);
  state.buffer = '';
  state.wrong = 0;
  state.held = null;
  state.hint = '';
  state.targetId = 0;
  state.missiles = [];
  state.particles = [];
  state.fxGreen = 0;
  state.correctAnswer = '';
  state.pendingExtractClose = false;
  state.notices = [];
  state.sharedGathers = [];
  state.sharedRocks = [];
  state.intro = null;
  state.idleFly = 0;
  state.transition = null;
  clearExtractSession(state);
  resetShareMaps(state);
  restoreLayerBank(state);
  if (!state.asteroids.length) {
    populateField(state);
    if (!state.wormhole && mission.operation) placeWormhole(state);
    saveLayerBank(state);
  }
  state.camera.x = state.ship.x;
  state.camera.y = state.ship.y;
  state.mode = 'fly';
  return true;
}

export function startMission(state, id, seed, audio, assemblyId) {
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
  state.ghostMissiles = [];
  state.particles = [];
  state.drops = [];
  state.asteroids = [];
  resetShareMaps(state);
  state.hint = '';
  state.hotbar = emptyStacks(HOTBAR_SIZE);
  state.cargoSlots = emptyStacks(CARGO_SIZE);
  state.held = null;
  state.fxGreen = 0;
  state.correctAnswer = '';
  state.pendingExtractClose = false;
  state.knownCrafts = {};
  state.notices = [];
  state.sharedGathers = [];
  state.sharedRocks = [];
  state.intro = { t: 0 };
  state.taught = {};
  state.tutorialStep = 0;
  state.tutorialTime = 0;
  state.idleFly = 0;
  state.fxFlash = 0;
  state.shakeTime = 0;
  state.quiet = 0;
  state.ship.hp = state.ship.maxHp;
  state.ship.aim = -Math.PI / 2;
  state.clock = 0;
  state.seed = cleanSeed(seed);
  state.assemblyId = assemblyId || null;
  state.localFlightId = '';
  state.milestones = {};
  state.aliens = [];
  state.alienShots = [];
  state.alienNext = 0;
  state.lairSeenDown = false;
  state.starWasUp = undefined;
  state.planets = [];
  state.sunBodies = [];
  state.spaceObjects = [];
  state.planet = null;
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
  saveLayerBank(state);
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
  playPickup(audio);
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
  if (!rock || rock.depleted || rock.pendingExtract) return;
  state.buffer += ch;
  const answer = rock.question.answerText;
  if (state.buffer === answer) {
    state.correctAnswer = state.buffer;
    acceptAnswer(state, rock, audio);
    state.buffer = '';
    return;
  }
  if (!answer.startsWith(state.buffer) || state.buffer.length > answer.length) {
    state.buffer = '';
    state.wrong = 0.35;
    punchCamera(state);
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
    state.correctAnswer = state.buffer;
    acceptAnswer(state, rock, audio);
    state.buffer = '';
    return;
  }
  state.buffer = '';
  state.wrong = 0.35;
  punchCamera(state);
  if (audio) audio.wrong();
}

/** Backspace while in extract (React numpad ⌫). */
export function extractBackspace(state) {
  if (state.mode !== 'extract') return;
  state.buffer = state.buffer.slice(0, -1);
}

function queueWorld(state, event) {
  if (!state.shareWorld || !event) return;
  if (!state.worldEvents) state.worldEvents = [];
  if (event.t == null) event.t = Date.now();
  state.worldEvents.push(event);
}

function packQuestion(question) {
  if (!question) return null;
  return {
    p: question.prompt || '',
    a: question.answerText != null ? String(question.answerText) : String(question.answer ?? ''),
    d: question.difficulty || '',
    o: question.operation || '',
  };
}

function unpackQuestion(packed) {
  if (!packed || !packed.p) return null;
  const answerText = packed.a != null ? String(packed.a) : '';
  return {
    prompt: packed.p,
    answerText,
    answer: Number(answerText),
    difficulty: packed.d || 'easy',
    operation: packed.o || 'add',
  };
}

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

function packSpawn(rock) {
  return {
    k: 'spawn',
    key: rock.key,
    x: round1(rock.x),
    y: round1(rock.y),
    sp: rock.sprite,
    min: rock.mineral,
    sz: round1(rock.size),
    rot: round1(rock.rot),
    spin: round1(rock.spin),
    drift: round1(rock.drift),
    op: rock.operation,
    diff: rock.difficulty,
    q: packQuestion(rock.question),
  };
}

function dropSharedOre(state, rock, x, y, count, step, announce) {
  const id = oreIdForRock(rock.key, step);
  if (state.oreClaims && state.oreClaims.has(id)) return id;
  if (!state.drops.some((drop) => drop.id === id)) {
    state.drops.push({
      id,
      x,
      y,
      itemId: rock.mineral || 'pale',
      count,
      life: 48,
      maxLife: 48,
      shared: true,
    });
  }
  if (announce !== false) {
    queueWorld(state, {
      k: 'ore',
      op: 'spawn',
      ore: id,
      x: round1(x),
      y: round1(y),
      item: rock.mineral || 'pale',
      n: count,
    });
  }
  return id;
}

function copyRock(rock) {
  return {
    key: rock.key,
    size: rock.size,
    sizeTarget: rock.sizeTarget,
    radius: rock.radius,
    radiusTarget: rock.radiusTarget,
    extractCount: rock.extractCount,
    depleted: rock.depleted,
    alive: rock.alive,
    question: rock.question,
  };
}

/** Unused for rocks (extract is primary). Kept for the crafted arc missile. */
function launchMissile(state, rock, audio, heavy, face, soundKey) {
  const ship = state.ship;
  const x = ship.x + Math.cos(ship.aim) * 40;
  const y = ship.y + Math.sin(ship.aim) * 40;
  const dx = rock.x - x;
  const dy = rock.y - y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = -dy / dist;
  const ny = dx / dist;
  const facing = nx * Math.cos(ship.aim) + ny * Math.sin(ship.aim);
  const bend = facing >= 0 ? 1 : -1;
  state.missiles.push({
    id: state.nextId++,
    x,
    y,
    vx: Math.cos(ship.aim) * 80,
    vy: Math.sin(ship.aim) * 80,
    bend,
    straight: !!face,
    single: !!face,
    face: face || '',
    targetId: rock.id,
    targetKey: rock.key,
    tx: rock.x,
    ty: rock.y,
    life: 6,
    age: 0,
    heavy: !!heavy,
    power: heavy ? 2 : 1,
  });
  queueWorld(state, {
    k: 'shot',
    x: round1(x),
    y: round1(y),
    aim: Math.round(ship.aim * 1000) / 1000,
    key: rock.key,
    tx: round1(rock.x),
    ty: round1(rock.y),
    bend,
    heavy: heavy ? 1 : 0,
    single: face ? 1 : 0,
    face: face || '',
  });
  if (audio && soundKey && typeof audio.playShot === 'function') audio.playShot(soundKey);
  else if (audio) audio.shot();
  kickRecoil(state);
}

function rockYieldSize(rock) {
  if (rock.baseRadius) return rock.baseRadius / 0.34;
  return rock.size;
}

function kickRecoil(state, amount) {
  if (state.ship) state.ship.recoil = amount || 1;
}

function decayRecoil(state, dt) {
  const ship = state.ship;
  if (ship && ship.recoil > 0) ship.recoil = Math.max(0, ship.recoil - dt * 9);
  if (state.cloak > 0) state.cloak = Math.max(0, state.cloak - dt);
}

function playImpact(audio) {
  if (audio && typeof audio.impact === 'function') audio.impact();
  else if (audio && typeof audio.hit === 'function') audio.hit();
}

/** Arith Belt impact debris: a short pale burst at the hit. */
function impactDebris(state, x, y) {
  for (let i = 0; i < 12; i += 1) {
    const angle = state.rng() * Math.PI * 2;
    const speed = 112 + state.rng() * 208;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.18 + state.rng() * 0.14,
      size: 1.2 + state.rng() * 1.2,
      a: 0.55 + state.rng() * 0.4,
      color: '#e8ecff',
    });
  }
  if (state.particles.length > 180) state.particles.splice(0, state.particles.length - 180);
}

/** Same particle list the belt already uses, packed so the hit reads as an explosion. */
function burstExplosion(state, x, y) {
  for (let i = 0; i < 26; i += 1) {
    const angle = state.rng() * Math.PI * 2;
    const speed = 90 + state.rng() * 260;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + state.rng() * 0.45,
      size: 4 + state.rng() * 7,
      color: i % 3 === 0 ? '#fff4d2' : i % 3 === 1 ? '#ffb15a' : '#7ee7ff',
    });
  }
}

/** Drop the rock from the belt the way a destroy does, without spawning ore. */
function forgetAsteroid(state, rock) {
  if (!rock) return;
  rock.alive = false;
  rock.depleted = true;
  rock.exploded = true;
  if (!state.goneRocks) state.goneRocks = new Set();
  if (rock.key) state.goneRocks.add(rock.key);
  state.asteroids = state.asteroids.filter((item) => item !== rock && item.alive);
}

function playPickup(audio) {
  if (audio && typeof audio.pickup === 'function') audio.pickup();
}

/** One straight bullet from the ship to the rock. The shrink waits until it arrives. */
function launchExtractShot(state, rock, audio) {
  const ship = state.ship;
  const aim = ship.aim || 0;
  const x = ship.x + Math.cos(aim) * 36;
  const y = ship.y + Math.sin(aim) * 36;
  state.missiles.push({
    id: state.nextId++,
    x,
    y,
    vx: Math.cos(aim) * 80,
    vy: Math.sin(aim) * 80,
    bend: 0,
    straight: true,
    single: true,
    extract: true,
    targetId: rock.id,
    targetKey: rock.key,
    tx: rock.x,
    ty: rock.y,
    life: 4,
    age: 0,
    heavy: false,
    power: 1,
  });
  queueWorld(state, {
    k: 'shot',
    x: round1(x),
    y: round1(y),
    aim: Math.round(aim * 1000) / 1000,
    key: rock.key,
    tx: round1(rock.x),
    ty: round1(rock.y),
    bend: 0,
    heavy: 0,
    single: 1,
  });
  if (audio && typeof audio.shot === 'function') audio.shot();
  kickRecoil(state);
}

/** Correct extract: two shrinks, then the third answer destroys the rock and spills its ore. */
function acceptAnswer(state, rock, audio) {
  if (state.mode !== 'extract') return;
  if (!rock || !rock.alive || rock.pendingExtract) return;
  ensureRockExtractFields(rock);
  if (rock.depleted) return;

  const step = rock.extractCount + 1;
  const claimKey = mineClaimKey(rock.key, step);
  let claim = 'local';
  if (state.shareWorld) {
    if (!state.rockClaims) state.rockClaims = new Map();
    claim = takeClaim(state.rockClaims, claimKey, { id: state.playerId || 'local', t: Date.now() });
    if (claim === 'lose' || claim === 'keep') {
      state.status = 'Another pilot already mined this rock.';
      state.statusTime = 2.6;
      return;
    }
  }

  if (audio) audio.correct();
  state.fxGreen = 1.15;
  state.solved += 1;
  if (claim === 'new') {
    if (!state.mineCredit) state.mineCredit = new Set();
    state.mineCredit.add(claimKey);
  }

  const before = copyRock(rock);
  rock.pendingExtract = { before, claimKey, claim };
  launchExtractShot(state, rock, audio);
}

/** The extract bullet has reached the rock. Shrink, or destroy on the third hit, then show the next question. */
function applyExtractImpact(state, rock, audio) {
  if (!rock || !rock.pendingExtract) return;
  impactDebris(state, rock.x, rock.y);
  playImpact(audio);
  const pending = rock.pendingExtract;
  rock.pendingExtract = null;
  const before = pending.before;
  const claimKey = pending.claimKey;
  const claim = pending.claim;
  rock.extractCount += 1;

  if (rock.extractCount >= 3) {
    const mineral = rock.mineral || 'pale';
    const count = Math.max(1, mineralYield({ mineral }, rockYieldSize(rock), rock.difficulty));
    burstExplosion(state, rock.x, rock.y);
    if (audio && typeof audio.explode === 'function') audio.explode();
    queueExtractPops(state, rock, mineral, count);
    state.closingRockName = rockTypeName(rock);
    state.pendingExtractClose = true;
    state.extractAvailable = null;
    state.targetId = 0;
    if (state.shareWorld) {
      if (!state.rockUndo) state.rockUndo = new Map();
      state.rockUndo.set(claimKey, {
        before,
        rock,
        oreId: oreIdForRock(rock.key, rock.extractCount + ':0'),
      });
      queueWorld(state, {
        k: 'rock',
        op: 'die',
        key: rock.key,
        t: Date.now(),
      });
    }
    forgetAsteroid(state, rock);
    leaveExtract(state);
  } else {
    queueShrink(rock, EXTRACT_SHRINK);
    const operation =
      rock.operation ||
      (state.mission && state.mission.operation
        ? state.mission.operation
        : state.rng() < 0.5
          ? 'add'
          : 'sub');
    const previous = rock.question && rock.question.prompt;
    const spec = problemSpec(operation, rock.difficulty || 'easy');
    let next = nextProblem(spec, state.rng);
    for (let attempt = 0; attempt < 12 && previous && next.prompt === previous; attempt += 1) {
      next = nextProblem(spec, state.rng);
    }
    rock.question = next;
    rock.difficulty = rock.question.difficulty;
    state.hint = '';
    if (state.shareWorld) {
      if (!state.rockUndo) state.rockUndo = new Map();
      state.rockUndo.set(claimKey, { before, rock, oreId: '' });
      queueWorld(state, {
        k: 'rock',
        op: 'mine',
        key: rock.key,
        n: rock.extractCount,
        size: round1(rock.sizeTarget != null ? rock.sizeTarget : rock.size),
        depleted: false,
        q: packQuestion(rock.question),
      });
    }
  }
}

function destroyAsteroid(state, rock, audio, owner) {
  if (!rock || !rock.alive) return;
  const claimId = owner && owner.id ? owner.id : state.playerId || 'local';
  const claimT = owner && owner.t != null ? owner.t : Date.now();
  let claim = 'local';
  if (state.shareWorld) {
    if (!state.rockClaims) state.rockClaims = new Map();
    claim = takeClaim(state.rockClaims, dieClaimKey(rock.key), { id: claimId, t: claimT });
    if (claim === 'lose' || claim === 'keep') return;
  }
  const selfKill = !owner || String(claimId) === String(state.playerId || 'local');
  // Missile impact path only — answer path no longer routes here for rocks.
  rock.alive = false;
  if (!state.goneRocks) state.goneRocks = new Set();
  state.goneRocks.add(rock.key);
  if (selfKill) {
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
    impactDebris(state, rock.x, rock.y);
    playImpact(audio);
  }
  const mined = rock.mineral || 'pale';
  const count = mineralYield({ mineral: mined }, rock.size, rock.difficulty);
  if (state.shareWorld) {
    dropSharedOre(state, rock, rock.x, rock.y, count, 'die', selfKill);
    if (selfKill) queueWorld(state, { k: 'rock', op: 'die', key: rock.key, t: claimT });
  } else {
    state.drops.push({
      id: state.nextId++,
      x: rock.x,
      y: rock.y,
      itemId: mined,
      count,
      life: 48,
      maxLife: 48,
    });
  }
  state.asteroids = state.asteroids.filter((item) => item.alive);
  if (!selfKill) return;
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
  state.spawnSeq = (state.spawnSeq || 0) + 1;
  const spawnedKey = state.shareWorld
    ? 's:' + String(state.playerId || 'local') + ':' + state.spawnSeq
    : '';
  spawnAsteroid(state, operation, difficulty, 'far', spawnedKey ? { key: spawnedKey } : undefined);
  const spawned = state.asteroids[state.asteroids.length - 1];
  if (state.shareWorld && spawned) {
    if (!state.localReplacements) state.localReplacements = new Map();
    state.localReplacements.set(rock.key, spawned.key);
    queueWorld(state, Object.assign(packSpawn(spawned), { from: rock.key }));
  }
}

function nearestLiveAsteroid(state, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const rock of state.asteroids) {
    if (!rock.alive || rock.depleted) continue;
    const dist = Math.hypot(rock.x - state.ship.x, rock.y - state.ship.y);
    if (dist < bestDist) {
      best = rock;
      bestDist = dist;
    }
  }
  return best;
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
  const zoom = state.viewZoom || 1;
  return {
    x: state.camera.x + (x - view.w / 2) / zoom,
    y: state.camera.y + (y - view.h / 2) / zoom,
  };
}

/** Outer painted rim, in source pixels, for asteroid sprites 0–4. */
const ROCK_RIM = [147, 168, 190, 114, 132];

/** Center distance at which the ship hull meets this rock's painted outline. */
export function rockTouchDistance(rock) {
  const scale = (rock.size / 180) * 0.9;
  const rim = ROCK_RIM[(rock.sprite || 0) % ROCK_RIM.length] * scale;
  return rim + 24;
}

function easeCamera(state, dt) {
  let focusX = state.ship.x;
  let focusY = state.ship.y;
  let zoom = 1;
  if (state.mode === 'extract') {
    const rock = extractRock(state);
    if (rock) {
      focusX = state.ship.x;
      focusY = state.ship.y;
      zoom = 1.72;
    }
  }
  const k = 1 - Math.exp(-3.2 * dt);
  state.camera.x += (focusX - state.camera.x) * k;
  state.camera.y += (focusY - state.camera.y) * k;
  const zk = 1 - Math.exp(-5 * dt);
  state.viewZoom = (state.viewZoom || 1) + (zoom - (state.viewZoom || 1)) * zk;
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

function spillStack(state, stack, x, y) {
  const drop = {
    id: state.nextId++,
    x,
    y,
    itemId: stack.id,
    count: stack.count,
    life: 90,
    maxLife: 90,
  };
  if (stack.id === BOW_ID) drop.level = bowLevel(stack);
  state.drops.push(drop);
}

/** A rock hit. Bow plating, worn, takes a little off the base 14. One level, one step. */
export function rockHitDamage(state) {
  const base = 14;
  if (!hullHas(state, BOW_ID)) return base;
  const worn = state.hullSlots.find((stack) => stack && stack.id === BOW_ID);
  return Math.max(1, base - bowLevel(worn) * 2);
}

/** Hull hits zero. Items stay in the world at the wreck until the player respawns and picks them up. */
export function breachHull(state, audio, reason) {
  if (state.mode === 'dead') return;
  const ship = state.ship;
  ensureInventory(state);
  if ((Number(state.cargo) || 0) > 0) {
    spillStack(state, { id: 'pale', count: state.cargo }, ship.x, ship.y);
    state.cargo = 0;
  }
  if (state.held) {
    spillStack(state, state.held, ship.x + 18, ship.y);
    state.held = null;
  }
  const stacks = takeAllStacks(state);
  stacks.forEach((stack, index) => {
    const angle = (index / Math.max(stacks.length, 1)) * Math.PI * 2;
    const dist = 42 + (index % 4) * 16;
    spillStack(state, stack, ship.x + Math.cos(angle) * dist, ship.y + Math.sin(angle) * dist);
  });
  state.wreckX = ship.x;
  state.wreckY = ship.y;
  ship.hp = 0;
  ship.vx = 0;
  ship.vy = 0;
  ship.thrusting = false;
  state.mode = 'dead';
  state.deathReason = reason || 'The hull reached zero.';
  state.deathReveal = 1.35;
  clearExtractSession(state);
  state.mode = 'dead';
  for (let i = 0; i < 28; i++) {
    const angle = state.rng() * Math.PI * 2;
    const speed = 80 + state.rng() * 220;
    state.particles.push({
      x: ship.x,
      y: ship.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.7 + state.rng() * 0.4,
      size: 3 + state.rng() * 4,
      color: i % 2 === 0 ? '#ffb15a' : '#f4fbff',
    });
  }
  punchCamera(state);
  state.fxFlash = 0.28;
  state.status = 'Hull breached.';
  state.statusTime = 4.5;
  if (audio && typeof audio.explode === 'function') audio.explode();
  else if (audio && typeof audio.hit === 'function') audio.hit();
  if (audio && typeof audio.syncMotionLoops === 'function') {
    audio.syncMotionLoops(false, false);
  }
}

/** Same world, same layer. The wreck's drops are still there. */
export function respawnShip(state, audio) {
  if (state.mode !== 'dead') return;
  const ship = state.ship;
  ship.hp = ship.maxHp;
  ship.vx = 0;
  ship.vy = 0;
  const originX = state.wreckX || ship.x;
  const originY = state.wreckY || ship.y;
  let placed = false;
  let best = null;
  let bestGap = -1;
  for (const radius of [720, 980, 1280]) {
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const x = clamp(originX + Math.cos(angle) * radius, 80, WORLD.w - 80);
      const y = clamp(originY + Math.sin(angle) * radius, 80, WORLD.h - 80);
      let gap = Infinity;
      for (const rock of state.asteroids) {
        if (!rock.alive) continue;
        const room = Math.hypot(rock.x - x, rock.y - y) - rockTouchDistance(rock);
        if (room < gap) gap = room;
      }
      if (gap > bestGap) {
        bestGap = gap;
        best = { x, y };
      }
      if (gap > 120) {
        ship.x = x;
        ship.y = y;
        placed = true;
        break;
      }
    }
    if (placed) break;
  }
  if (!placed && best) {
    ship.x = best.x;
    ship.y = best.y;
  }
  state.camera.x = ship.x;
  state.camera.y = ship.y;
  state.mode = 'fly';
  state.bumpCooldown = 1.2;
  state.status = 'Respawned. Fly back to the wreck and pick up what you dropped.';
  state.statusTime = 4.5;
  if (audio && typeof audio.launch === 'function') audio.launch();
}

export function commitLayerPick(state, audio) {
  if (!state.layerArm) return false;
  const raw = String(state.layerBuffer || '').trim();
  state.layerArm = false;
  state.layerBuffer = '';
  const next = Number(raw);
  if (!raw || raw === '-' || !Number.isInteger(next) || next < LAYER_MIN || next > LAYER_MAX) {
    noteStatus(state, 'That layer is outside -250 to 250.');
    return false;
  }
  if (next === state.layer) {
    noteStatus(state, 'You are already on layer ' + next + '.');
    return false;
  }
  state.megaJump = true;
  changeLayer(state, next - state.layer, audio);
  return true;
}

function separateFromRocks(state, audio) {
  const ship = state.ship;
  for (const rock of state.asteroids) {
    if (!rock.alive) continue;
    const dx = ship.x - rock.x;
    const dy = ship.y - rock.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const min = rockTouchDistance(rock);
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
        state.bumpCooldown = 1.1;
        state.hurt = 0.4;
        if (state.shield > 0) {
          state.shield -= 1;
          noteStatus(state, 'Shield took the hit.');
        } else if (!(state.quiet > 0)) {
          ship.hp = Math.max(0, ship.hp - rockHitDamage(state));
          punchCamera(state);
          state.fxFlash = 0.22;
          if (audio) {
            if (typeof audio.damaged === 'function') audio.damaged();
            else audio.hit();
          }
          if (ship.hp <= 0) breachHull(state, audio, 'The hull broke on an asteroid.');
        }
      }
    }
  }
}

/** Walls and panels are solid. The ship is pushed out and cannot sit on top of them. */
function separateFromStructure(state) {
  const ship = state.ship;
  if (!ship) return;
  const radius = SHIP_RADIUS;
  for (const piece of visiblePieces(state)) {
    if (piece.id !== 'wall' && piece.id !== 'panel') continue;
    const halfW = piece.id === 'panel' ? 60 : 52;
    const halfH = piece.id === 'panel' ? 22 : 11;
    const rot = piece.rot || 0;
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const dx = ship.x - piece.x;
    const dy = ship.y - piece.y;
    let lx = dx * c + dy * s;
    let ly = -dx * s + dy * c;
    const inside = Math.abs(lx) <= halfW && Math.abs(ly) <= halfH;
    let nx = 0;
    let ny = 0;
    let push = 0;
    if (inside) {
      const outX = halfW - Math.abs(lx) + radius;
      const outY = halfH - Math.abs(ly) + radius;
      if (outX < outY) {
        nx = lx < 0 ? -1 : 1;
        push = outX;
      } else {
        ny = ly < 0 ? -1 : 1;
        push = outY;
      }
    } else {
      const cx = clamp(lx, -halfW, halfW);
      const cy = clamp(ly, -halfH, halfH);
      const ox = lx - cx;
      const oy = ly - cy;
      const dist = Math.hypot(ox, oy);
      if (dist >= radius || dist < 0.001) continue;
      nx = ox / dist;
      ny = oy / dist;
      push = radius - dist;
    }
    lx += nx * push;
    ly += ny * push;
    ship.x = piece.x + lx * c - ly * s;
    ship.y = piece.y + lx * s + ly * c;
    const wx = nx * c - ny * s;
    const wy = nx * s + ny * c;
    const vn = ship.vx * wx + ship.vy * wy;
    if (vn < 0) {
      ship.vx -= vn * wx;
      ship.vy -= vn * wy;
    }
  }
}

/** The planet disc and a star core stop the ship. A star is only a light bump. */
function separateFromBodies(state, audio) {
  const ship = state.ship;
  if (!ship) return;
  const planet = state.planet;
  if (planet && planet.layer === state.layer) {
    const dx = ship.x - planet.x;
    const dy = ship.y - planet.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const min = planet.r + SHIP_RADIUS;
    if (dist < min) {
      const nx = dx / dist;
      const ny = dy / dist;
      ship.x = planet.x + nx * min;
      ship.y = planet.y + ny * min;
      const vn = ship.vx * nx + ship.vy * ny;
      if (vn < 0) {
        ship.vx -= vn * nx;
        ship.vy -= vn * ny;
      }
    }
  }
  for (const star of state.sunBodies || []) {
    if (star.layer !== state.layer) continue;
    const dx = ship.x - star.x;
    const dy = ship.y - star.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const min = star.r + SHIP_RADIUS;
    if (dist >= min) continue;
    const nx = dx / dist;
    const ny = dy / dist;
    ship.x = star.x + nx * min;
    ship.y = star.y + ny * min;
    ship.vx += nx * 80;
    ship.vy += ny * 80;
    if (state.bumpCooldown <= 0 && state.mode === 'fly' && !(state.quiet > 0)) {
      state.bumpCooldown = 0.8;
      ship.hp = Math.max(0, ship.hp - 4);
      state.fxFlash = 0.12;
      if (audio && typeof audio.hit === 'function') audio.hit();
      if (ship.hp <= 0) breachHull(state, audio, 'The hull broke on a star.');
    }
  }
  shedStarDust(state);
}

/** The first pass through a star's halo shakes one mote loose. */
function shedStarDust(state) {
  const ship = state.ship;
  if (!ship || state.mode !== 'fly') return;
  for (const star of state.sunBodies || []) {
    if (!star || star.layer !== state.layer || star.shed) continue;
    const dist = Math.hypot(ship.x - star.x, ship.y - star.y);
    const kind = star.kind === 'cinder' || star.kind === 'glint' ? star.kind : 'pale';
    if (dist <= (star.r || 78) + SHIP_RADIUS) continue;
    if (dist > (star.r || 78) + 160) continue;
    star.shed = true;
    spillFind(state, 'dust-' + kind, star.x, star.y + (star.r || 78) + 24);
    grantMilestone(state, 'star-halo');
  }
}

function clickWorld(state, view, click) {
  if (click.worldX != null && click.worldY != null) {
    return { x: click.worldX, y: click.worldY };
  }
  return screenToWorld(state, view, click.x, click.y);
}

/**
 * One canvas click in flight. Construction places from the selected hotbar slot
 * unless the click is a rock in reach, which still extracts. Returns true when
 * the click is consumed so a miss does not fall through to extractAvailable.
 */
export function applyFlyClick(state, worldX, worldY, audio) {
  const stack = selectedStack(state);
  const item = stack ? itemById(stack.id) : null;
  const construction = !!(item && item.kind === 'construction');
  const hit = asteroidAt(state, worldX, worldY);
  const near =
    hit &&
    !hit.depleted &&
    Math.hypot(hit.x - state.ship.x, hit.y - state.ship.y) <= APPROACH;
  if (near) {
    state.extractAvailable = hit.id;
    openExtract(state, hit.id, audio);
    return true;
  }
  if (!construction) return false;
  if (placePiece(state, stack.id, worldX, worldY)) {
    stack.count -= 1;
    if (stack.count <= 0) state.hotbar[hotbarIndex(state)] = null;
  }
  return true;
}

function handleClicks(state, input, view, audio) {
  if (state.mode !== 'fly') {
    input.takeClicks();
    return;
  }
  const queued = input.takeClicks();
  if (!queued.length) return;
  const first = clickWorld(state, view, queued[0]);
  if (useSelectedHotbar(state, audio, first)) return;
  for (const click of queued) {
    const world = clickWorld(state, view, click);
    if (applyFlyClick(state, world.x, world.y, audio)) return;
  }
}

function stepOneMissile(state, missile, dt, onHit) {
  const hunted =
    missile.alienId && state.aliens
      ? state.aliens.find((alien) => alien.id === missile.alienId && !alien.gone && !alien.leaving)
      : null;
  if (missile.alienId && !hunted) {
    missile.life = 0;
    return;
  }
  const speed = missile.speed || (missile.single ? 1280 : missile.arc ? 620 : 700);
  missile.life -= dt;
  missile.age += dt;
  if (missile.maxRange) {
    missile.flown = (missile.flown || 0) + speed * dt;
    if (missile.flown > missile.maxRange) {
      missile.life = 0;
      return;
    }
  }
  const rock = hunted
    ? null
    : missile.targetKey
      ? state.asteroids.find((item) => item.key === missile.targetKey && item.alive)
      : state.asteroids.find((item) => item.id === missile.targetId && item.alive);
  const tx = hunted ? hunted.x : rock ? rock.x : missile.tx;
  const ty = hunted ? hunted.y : rock ? rock.y : missile.ty;
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) {
    missile.life = 0;
    if (missile.extract && rock == null) {
      const pending = state.asteroids.find((item) => item.pendingExtract && item.key === missile.targetKey);
      if (pending) pending.pendingExtract = null;
    }
    return;
  }
  const dx = tx - missile.x;
  const dy = ty - missile.y;
  const dist = Math.hypot(dx, dy) || 1;
  const desired = Math.atan2(dy, dx);
  const bias = missile.straight ? 0 : missile.age > 0.55 || dist < 120 ? 0 : missile.bend * Math.min(0.9, dist / 480);
  let heading = desired + bias;
  if (missile.arc) {
    let avoid = 0;
    for (const blocker of state.asteroids) {
      if (!blocker.alive || blocker.id === missile.targetId || blocker.key === missile.targetKey) continue;
      const ox = blocker.x - missile.x;
      const oy = blocker.y - missile.y;
      const gap = Math.hypot(ox, oy);
      if (gap > 220 || gap < 8) continue;
      const side = Math.sign(ox * Math.sin(desired) - oy * Math.cos(desired)) || 1;
      avoid += side * ((220 - gap) / 220);
    }
    heading = desired + avoid * 1.6;
  }
  missile.vx = Math.cos(heading) * speed;
  missile.vy = Math.sin(heading) * speed;
  missile.x += missile.vx * dt;
  missile.y += missile.vy * dt;
  if (!missile.extract) {
    const struck = (state.aliens || []).find(
      (alien) =>
        alien &&
        !alien.gone &&
        !alien.leaving &&
        alien.layer === state.layer &&
        Math.hypot(alien.x - missile.x, alien.y - missile.y) < 42
    );
    if (struck) {
      missile.life = 0;
      if (missile.freeze) {
        struck.frozen = 4.5;
        return;
      }
      if (missile.flame) {
        const away = Math.atan2(struck.y - missile.y, struck.x - missile.x);
        struck.x += Math.cos(away) * 70;
        struck.y += Math.sin(away) * 70;
        if (!missile.power) return;
      }
      damageAlien(state, struck, missile.power || 1);
      return;
    }
  }
  if (!missile.single) {
    state.particles.push({
      x: missile.x,
      y: missile.y,
      vx: 0,
      vy: 0,
      life: 0.28,
      size: 3,
      color: missile.heavy ? '#ffb7de' : '#b9f3ff',
    });
  }
  const reach = rock ? rock.radius + 28 : 28;
  if (!missile.arc && missile.age > 2.2) {
    missile.x = tx;
    missile.y = ty;
  }
  if (dist < reach || (!missile.arc && missile.age > 2.2) || missile.age > 8) {
    missile.life = 0;
    if (onHit && rock) onHit(rock);
  }
}

function updateMissiles(state, dt, audio) {
  for (const missile of state.missiles) {
    stepOneMissile(state, missile, dt, (rock) => {
      if (missile.extract) applyExtractImpact(state, rock, audio);
      else destroyAsteroid(state, rock, audio);
    });
  }
  state.missiles = state.missiles.filter((missile) => missile.life > 0);
  if (!state.ghostMissiles) state.ghostMissiles = [];
  for (const missile of state.ghostMissiles) {
    stepOneMissile(state, missile, dt, null);
  }
  state.ghostMissiles = state.ghostMissiles.filter((missile) => missile.life > 0);
}

function noteSharedRock(state, rock) {
  if (!rock || !rock.key) return;
  if (!state.sharedRocks) state.sharedRocks = [];
  state.sharedRocks.push({
    key: rock.key,
    size: rock.sizeTarget != null ? rock.sizeTarget : rock.size,
    depleted: !!rock.depleted,
    alive: rock.alive !== false,
    extractCount: rock.extractCount || 0,
  });
}

/** Apply a rock hit that another player already resolved. */
export function applySharedRock(state, msg) {
  if (!msg || !msg.key) return;
  const rock = state.asteroids.find((item) => item.key === msg.key);
  if (!rock) return;
  ensureRockExtractFields(rock);
  if (msg.alive === false || msg.depleted) {
    rock.alive = false;
    rock.depleted = true;
    if (!state.goneRocks) state.goneRocks = new Set();
    if (rock.key) state.goneRocks.add(rock.key);
    state.asteroids = state.asteroids.filter((item) => item.alive);
    return;
  }
  const nextSize = Number(msg.size);
  if (Number.isFinite(nextSize) && nextSize < rock.size) {
    rock.sizeTarget = nextSize;
    rock.radiusTarget = Math.max(8, nextSize * 0.34);
  }
  rock.extractCount = msg.extractCount || rock.extractCount;
  if (msg.depleted) rock.depleted = true;
}

/** Crafted weapons can strike another pilot. Returns remote ids that were hit. */
export function missilesHitPlayers(state, remotes) {
  const hits = [];
  if (!remotes) return hits;
  for (const missile of state.missiles) {
    for (const remote of remotes) {
      if (!remote || !remote.hasPose || remote.layer !== state.layer) continue;
      if (Math.hypot(missile.x - remote.x, missile.y - remote.y) < 40) {
        hits.push(remote.id);
        missile.life = 0;
        break;
      }
    }
  }
  return hits;
}

function applyMineVisual(rock, event) {
  ensureRockExtractFields(rock);
  const nextSize = Number(event.size);
  if (Number.isFinite(nextSize) && nextSize < rock.size) {
    rock.sizeTarget = nextSize;
    rock.radiusTarget = Math.max(8, nextSize * 0.34);
  }
  if (Number(event.n) > (rock.extractCount || 0)) rock.extractCount = Number(event.n);
  if (event.depleted) {
    rock.depleted = true;
    rock.alive = false;
  }
  const question = unpackQuestion(event.q);
  if (question && !rock.depleted) rock.question = question;
}

function undoMineCredit(state, claimKey) {
  if (!state.mineCredit || !state.mineCredit.has(claimKey)) return;
  state.mineCredit.delete(claimKey);
  if (state.solved > 0) state.solved -= 1;
  state.status = 'Another pilot mined that rock first.';
  state.statusTime = 3;
  const undo = state.rockUndo && state.rockUndo.get(claimKey);
  if (!undo) return;
  state.rockUndo.delete(claimKey);
  let rock = state.asteroids.find((item) => item.key === undo.before.key);
  if (!rock && undo.rock) {
    rock = undo.rock;
    rock.alive = true;
    if (!state.asteroids.includes(rock)) state.asteroids.push(rock);
    if (state.goneRocks && rock.key) state.goneRocks.delete(rock.key);
  }
  if (rock) {
    const winnerAhead = rock.extractCount > undo.before.extractCount;
    if (!winnerAhead) {
      rock.size = undo.before.size;
      rock.sizeTarget = undo.before.sizeTarget;
      rock.radius = undo.before.radius;
      rock.radiusTarget = undo.before.radiusTarget;
      rock.extractCount = undo.before.extractCount;
      rock.depleted = undo.before.depleted;
      rock.alive = undo.before.alive !== false;
      rock.exploded = false;
      rock.question = undo.before.question;
      if (state.oreBursts) {
        state.oreBursts = state.oreBursts.filter((burst) => burst.rockId !== rock.id);
      }
      if (state.drops) {
        state.drops = state.drops.filter(
          (drop) => drop.burstRockId !== rock.id || (state.oreGranted && state.oreGranted.has(drop.id))
        );
      }
    }
  }
}

function applyRockWorld(state, event, selfId) {
  if (!event.key) return;
  const claim =
    event.op === 'die'
      ? { key: dieClaimKey(event.key), id: event.id, t: event.t }
      : { key: mineClaimKey(event.key, event.n), id: event.id, t: event.t };
  if (!state.rockClaims) state.rockClaims = new Map();
  const result = takeClaim(state.rockClaims, claim.key, { id: claim.id, t: claim.t });
  if (result === 'lose' || result === 'keep') return;
  if (result === 'steal' && event.op !== 'die') undoMineCredit(state, claim.key);
  if (event.op === 'die') {
    if (!state.goneRocks) state.goneRocks = new Set();
    state.goneRocks.add(event.key);
    if (result === 'steal') {
      const extra = state.localReplacements && state.localReplacements.get(event.key);
      if (extra) {
        state.asteroids = state.asteroids.filter((item) => item.key !== extra);
        state.localReplacements.delete(event.key);
      }
    }
    state.asteroids = state.asteroids.filter((item) => item.key !== event.key);
    const pending = state.pendingSpawns && state.pendingSpawns.get(event.key);
    if (pending) {
      state.pendingSpawns.delete(event.key);
      if (String(pending.id) === String(event.id)) addSpawnedRock(state, pending);
    }
    return;
  }
  if (!state.remoteMines) state.remoteMines = new Map();
  state.remoteMines.set(event.key, {
    n: Number(event.n) || 0,
    size: Number(event.size),
    depleted: !!event.depleted,
    question: unpackQuestion(event.q),
  });
  const rock = state.asteroids.find((item) => item.key === event.key && item.alive);
  if (rock) applyMineVisual(rock, event);
  if (event.depleted) {
    if (!state.goneRocks) state.goneRocks = new Set();
    if (event.key) state.goneRocks.add(event.key);
    state.asteroids = state.asteroids.filter((item) => item.alive);
  }
}

function applyOreWorld(state, event, selfId) {
  if (!event.ore) return;
  if (event.op === 'spawn') {
    if (state.oreClaims && state.oreClaims.has(event.ore)) return;
    if (state.drops.some((drop) => drop.id === event.ore)) return;
    state.drops.push({
      id: event.ore,
      x: Number(event.x) || 0,
      y: Number(event.y) || 0,
      itemId: event.item || 'pale',
      count: Number(event.n) || 1,
      life: 48,
      maxLife: 48,
      shared: true,
    });
    return;
  }
  if (event.op !== 'take') return;
  if (!state.oreClaims) state.oreClaims = new Map();
  const result = takeClaim(state.oreClaims, event.ore, { id: event.id, t: event.t });
  if (result === 'lose') return;
  if (result === 'steal' || (result === 'new' && String(event.id) !== String(selfId))) {
    if (result === 'steal') revokeGrant(state, event.ore);
    removeDrop(state, event.ore);
    if (result === 'steal') {
      state.status = 'Another pilot reached that ore first.';
      state.statusTime = 3;
    }
  }
}

function applySpawnWorld(state, event) {
  if (!event.key || (state.goneRocks && state.goneRocks.has(event.key))) return;
  if (event.from) {
    const claim = state.rockClaims && state.rockClaims.get(dieClaimKey(event.from));
    if (!claim) {
      if (!state.pendingSpawns) state.pendingSpawns = new Map();
      state.pendingSpawns.set(event.from, event);
      return;
    }
    if (String(claim.id) !== String(event.id)) return;
  }
  addSpawnedRock(state, event);
}

function addSpawnedRock(state, event) {
  if (!event || !event.key || (state.goneRocks && state.goneRocks.has(event.key))) return;
  if (state.asteroids.some((rock) => rock.key === event.key)) return;
  const size = Number(event.sz) || 140;
  const question = unpackQuestion(event.q) || {
    prompt: '1 + 1',
    answerText: '2',
    answer: 2,
    difficulty: 'easy',
    operation: 'add',
  };
  state.asteroids.push({
    id: state.nextId++,
    x: Number(event.x) || 0,
    y: Number(event.y) || 0,
    sprite: Number(event.sp) || 0,
    mineral: event.min || 'pale',
    size,
    radius: size * 0.34,
    baseRadius: size * 0.34,
    extractCount: 0,
    depleted: false,
    rot: Number(event.rot) || 0,
    spin: Number(event.spin) || 0,
    drift: Number(event.drift) || 0,
    alive: true,
    active: false,
    near: false,
    question,
    operation: event.op || question.operation,
    difficulty: event.diff || question.difficulty,
    outline: false,
    key: event.key,
  });
}

function applyShotWorld(state, event, selfId) {
  if (String(event.id) === String(selfId)) return;
  if (!state.ghostMissiles) state.ghostMissiles = [];
  const shotId = event.eid || event.id + ':' + event.t;
  if (state.ghostMissiles.some((missile) => missile.shotId === shotId)) return;
  state.ghostMissiles.push({
    shotId,
    x: Number(event.x) || 0,
    y: Number(event.y) || 0,
    vx: Math.cos(Number(event.aim) || 0) * 80,
    vy: Math.sin(Number(event.aim) || 0) * 80,
    bend: event.bend >= 0 ? 1 : -1,
    targetKey: event.key || '',
    tx: Number(event.tx),
    ty: Number(event.ty),
    life: 6,
    age: 0,
    heavy: !!event.heavy,
    single: !!event.single,
    straight: !!event.single,
    face: typeof event.face === 'string' ? event.face : '',
    power: event.heavy ? 2 : 1,
  });
}

/** Apply one shared-world event. Layer mismatches and repeated ids are ignored. */
export function applyWorldEvent(state, event, selfId) {
  if (!state.seenEvents) state.seenEvents = new Set();
  if (!shouldApplyEvent(event, state.layer, state.seenEvents)) return false;
  if (!eventOnLayer(event.layer, state.layer)) return false;
  if (event.k === 'rock') applyRockWorld(state, event, selfId);
  else if (event.k === 'ore') applyOreWorld(state, event, selfId);
  else if (event.k === 'spawn') applySpawnWorld(state, event);
  else if (event.k === 'shot') applyShotWorld(state, event, selfId);
  return true;
}

export function applyFriendlyFire(state, amount, audio) {
  if (!state.ship || state.mode === 'dead' || state.quiet > 0) return;
  state.ship.hp = Math.max(0, state.ship.hp - amount);
  state.shakeTime = 0.2;
  state.shakeMag = 68;
  state.fxFlash = 0.22;
  state.hurt = 0.4;
  state.bumpCooldown = 0.6;
  if (audio) {
    if (typeof audio.damaged === 'function') audio.damaged();
    else if (typeof audio.hit === 'function') audio.hit();
  }
  if (state.ship.hp <= 0) breachHull(state, audio, "Another pilot's shot broke the hull.");
}

export function introAlphas(state) {
  if (!state.intro) return { black: 0, rock: 1, star: 1, ship: 1, live: true };
  const t = state.intro.t;
  const fade = (start, dur) => Math.max(0, Math.min(1, (t - start) / dur));
  return {
    black: t < 2 ? 1 : Math.max(0, 1 - (t - 2) / 0.4),
    rock: fade(2, 0.7),
    star: fade(2.75, 0.65),
    ship: fade(3.4, 0.7),
    live: t >= 4.2,
  };
}

export function tickIntro(state, dt) {
  if (!state.intro) return;
  state.intro.t += dt;
  if (introAlphas(state).live) state.intro = null;
}

function updateParticles(state, dt) {
  const damp = Math.max(0, 1 - dt * 2.8);
  const fade = Math.max(0, 1 - dt * 3.6);
  for (const bit of state.particles) {
    bit.x += bit.vx * dt;
    bit.y += bit.vy * dt;
    bit.life -= dt;
    if (bit.a != null) {
      bit.vx *= damp;
      bit.vy *= damp;
      bit.a *= fade;
    }
  }
  state.particles = state.particles.filter((bit) => bit.life > 0);
}

function grantDrop(state, drop, audio) {
  const itemId = drop.itemId || 'pale';
  const count = drop.count != null ? drop.count : drop.amount || 1;
  const left = addItem(state, itemId, count, drop.level);
  const received = count - Math.max(0, left);
  if (received > 0) {
    announceCrafts(state);
    if (!state.oreGranted) state.oreGranted = new Map();
    state.oreGranted.set(drop.id, { itemId, count: received });
    playPickup(audio);
  }
  return received;
}

function revokeGrant(state, oreId) {
  const granted = state.oreGranted && state.oreGranted.get(oreId);
  if (!granted) return;
  state.oreGranted.delete(oreId);
  const have = countItem(state, granted.itemId);
  const n = Math.min(have, granted.count);
  if (n > 0) removeItems(state, granted.itemId, n);
}

function removeDrop(state, id) {
  state.drops = state.drops.filter((drop) => drop.id !== id);
}

function collectSharedDrop(state, drop, audio) {
  if (!state.oreClaims) state.oreClaims = new Map();
  const result = takeClaim(state.oreClaims, drop.id, { id: state.playerId || 'local', t: Date.now() });
  if (result === 'lose') {
    drop.life = 0;
    return;
  }
  if (result === 'keep' && state.oreGranted && state.oreGranted.has(drop.id)) {
    drop.life = 0;
    return;
  }
  const received = grantDrop(state, drop, audio);
  if (received > 0) {
    queueWorld(state, { k: 'ore', op: 'take', ore: drop.id, x: round1(drop.x), y: round1(drop.y) });
  }
  drop.life = received > 0 || result === 'keep' ? 0 : drop.life;
}

function updateDrops(state, dt, audio) {
  const ship = state.ship;
  for (const drop of state.drops) {
    if (drop.popping) continue;
    drop.life -= dt;
    if (drop.life <= 0) continue;
    if (state.mode === 'dead') continue;
    if (Math.hypot(drop.x - ship.x, drop.y - ship.y) < 58) {
      if (drop.shared && state.shareWorld) {
        collectSharedDrop(state, drop, audio);
        continue;
      }
      const itemId = drop.itemId || 'pale';
      const count = drop.count != null ? drop.count : drop.amount || 1;
      const left = addItem(state, itemId, count, drop.level);
      if (left < count) {
        announceCrafts(state);
        if (!state.sharedGathers) state.sharedGathers = [];
        state.sharedGathers.push({ x: drop.x, y: drop.y, itemId });
        const picked = itemById(itemId);
        pushNotice(state, (picked ? picked.name : 'Item') + ' added.', 'loot');
        playPickup(audio);
      }
      if (left <= 0) {
        drop.life = 0;
      } else if (left < count) {
        drop.itemId = itemId;
        drop.count = left;
      }
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

const FLIGHT_TUTORIAL = [
  'Hold W to fly. S reverses. A and D strafe. The mouse aims.',
  'Click a rock with the cyan rim to extract it.',
  'Answer the question. Three answers destroy the rock. Fly over the crystals.',
  'Press F to fabricate. Press C to open cargo.',
  'Fabricate a piece, select it on the hotbar, and click to place it.',
];
const TUTORIAL_STEP_SEC = 10;

function tutorialHint(state) {
  if (hullHas(state, 'jumper')) return 'Q and E change layers.';
  const step = Math.max(0, Math.min(FLIGHT_TUTORIAL.length - 1, state.tutorialStep || 0));
  return FLIGHT_TUTORIAL[step];
}

function tickTutorial(state, dt) {
  if (state.tutorialStep == null) state.tutorialStep = 0;
  if (state.tutorialStep >= FLIGHT_TUTORIAL.length - 1) return;
  state.tutorialTime = (state.tutorialTime || 0) + dt;
  if (state.tutorialTime < TUTORIAL_STEP_SEC) return;
  state.tutorialTime = 0;
  state.tutorialStep += 1;
}

function teachOnce(state, key, text) {
  if (!state.taught) state.taught = {};
  if (state.taught[key]) return;
  state.taught[key] = true;
  pushNotice(state, text);
}

function hotbarIsFull(state) {
  ensureInventory(state);
  return state.hotbar.every((stack) => stack && stack.count > 0);
}

function teachFlight(state, dt) {
  if (!state.taught) state.taught = {};
  if (state.intro || state.mode !== 'fly') return;
  tickTutorial(state, dt);
  if (!state.taught.jumper && hullHas(state, 'jumper')) {
    teachOnce(state, 'jumper', 'Layer jumper installed. Q and E change layers.');
  }
  if (!state.taught.hotbarFull && hotbarIsFull(state)) {
    teachOnce(state, 'hotbarFull', 'Cargo is beside the hotbar. Press C.');
  }
}

function pushNotice(state, text, kind) {
  if (!state.notices) state.notices = [];
  state.notices.push({ id: state.nextId++, text, time: 4.4, kind: kind || '' });
  if (state.notices.length > 3) state.notices.splice(0, state.notices.length - 3);
}

/** The first time a count becomes affordable, say so and point at F. */
function announceCrafts(state) {
  if (!state.knownCrafts) state.knownCrafts = {};
  for (const recipe of RECIPES) {
    if (state.knownCrafts[recipe.id]) continue;
    if (!recipeOpen(state, recipe) || !canAfford(state, recipe.costs)) continue;
    state.knownCrafts[recipe.id] = true;
    const item = ITEMS[recipe.result];
    const name = item ? item.name : recipe.result;
    pushNotice(state, name + ' can be fabricated. Press F.');
  }
}

/** Physics: W ramps thrust. Reverse is a bit quicker than the old 0.35 / 0.4 cap. */
export function updatePhysics(state, dt, input) {
  const ship = state.ship;
  let thrust = 0;
  if (input.thrust() || (input.mouse.touch && input.mouse.held)) thrust = 1;
  const brake = input.brake();
  const strafe = input.strafe();
  ship.thrusting = thrust > 0 && !brake;
  ship.braking = !!brake && !thrust;
  if (ship.thrusting) ship.thrust = Math.min(1, (ship.thrust || 0) + dt / 0.34);
  else ship.thrust = Math.max(0, (ship.thrust || 0) - dt / 0.72);
  if (ship.braking) ship.reverse = Math.min(1, (ship.reverse || 0) + dt / 0.28);
  else ship.reverse = Math.max(0, (ship.reverse || 0) - dt / 0.5);

  const accel = 520;
  const reverseAccel = accel * 1.45;
  if (thrust && !brake) {
    const push = 0.42 + 0.58 * ship.thrust;
    ship.vx += Math.cos(ship.aim) * accel * push * dt;
    ship.vy += Math.sin(ship.aim) * accel * push * dt;
  } else if (brake && !thrust) {
    ship.vx -= Math.cos(ship.aim) * reverseAccel * dt;
    ship.vy -= Math.sin(ship.aim) * reverseAccel * dt;
  }
  if (strafe) {
    ship.vx += Math.cos(ship.aim + Math.PI / 2) * strafe * 360 * dt;
    ship.vy += Math.sin(ship.aim + Math.PI / 2) * strafe * 360 * dt;
  }
  const drag = brake ? 1.05 : 0.85;
  ship.vx -= ship.vx * drag * dt;
  ship.vy -= ship.vy * drag * dt;
  const maxSpeed = ship.maxSpeed || 430;
  const reverseCap = maxSpeed * 0.92;
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
  tickStructures(state, dt);
}

export function updateFly(state, dt, ctx) {
  decayRecoil(state, dt);
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
  ensureScenery(state);
  tickSpaceObjects(state, dt);
  tickAliens(state, dt);
  if (state.pendingBreach) {
    const reason = state.pendingBreach;
    state.pendingBreach = '';
    breachHull(state, audio, reason);
  }
  if (audio && typeof audio.syncMotionLoops === 'function') {
    audio.syncMotionLoops(!!ship.thrusting, state.mode === 'fly');
  }
  separateFromRocks(state, audio);
  separateFromStructure(state);
  separateFromBodies(state, audio);
    if (state.mode === 'dead') {
    if (state.deathReveal > 0) state.deathReveal = Math.max(0, state.deathReveal - dt);
    tickShrink(state, dt);
    tickOrePops(state, dt, audio);
    tickFx(state, dt);
    updateParticles(state, dt);
    updateDrops(state, dt, audio);
    state.clock += dt;
    return;
  }

  for (const rock of state.asteroids) {
    rock.rot += rock.spin * dt;
    rock.x += Math.cos(rock.drift) * 12 * dt;
    rock.y += Math.sin(rock.drift) * 12 * dt;
    if (rock.x < 100 || rock.x > WORLD.w - 100) rock.drift = Math.PI - rock.drift;
    if (rock.y < 100 || rock.y > WORLD.h - 100) rock.drift = -rock.drift;
    rock.active = false;
    rock.near = false;
    rock.outline = false;
  }
  ensureBelt(state, state.mission && state.mission.operation ? state.mission.operation : null);
  const marked = nearestLiveAsteroid(state, 1600);
  if (marked) marked.outline = true;
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
    target.outline = true;
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
  tickShrink(state, dt);
  tickOrePops(state, dt, audio);
  tickFx(state, dt);
  teachFlight(state, dt);
  reviewMilestones(state);
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
  decayRecoil(state, dt);
  state.clock += dt;
  if (state.mode === 'dead' && state.deathReveal > 0) {
    state.deathReveal = Math.max(0, state.deathReveal - dt);
  }
  if (state.mode === 'title') state.ship.aim += dt * 0.15;
  for (const rock of state.asteroids) rock.rot += rock.spin * dt;
  tickStructures(state, dt);
  if (state.mode === 'extract') updateMissiles(state, dt, audio);
  updateParticles(state, dt);
  if (state.mode !== 'dead') updateDrops(state, dt, audio);
  tickExtractToast(state, dt);
  tickShrink(state, dt);
  tickOrePops(state, dt, audio);
  tickFx(state, dt);
  if (state.wrong > 0) state.wrong -= dt;
  if (state.statusTime > 0) state.statusTime -= dt;
  easeCamera(state, dt);
  if (audio && typeof audio.syncMotionLoops === 'function') {
    audio.syncMotionLoops(false, false);
  }
}

function rockTypeName(rock) {
  if (!rock) return '';
  const type = ASTEROID_TYPES.find((entry) => entry.mineral === rock.mineral);
  return type ? type.name : '';
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

export const HOTBAR_SIZE = 10;

/** Key cap for a slot. Slots show 1–10. The 0 key still selects slot 10. */
export function hotbarKey(index) {
  return String(index + 1);
}

export function selectHotbar(state, index) {
  const n = typeof index === 'number' ? index : Number(index);
  if (!Number.isInteger(n) || n < 0 || n >= HOTBAR_SIZE) return;
  state.hotbarSlot = n;
}

export function hotbarIndex(state) {
  const n = state && state.hotbarSlot;
  if (!Number.isInteger(n) || n < 0 || n >= HOTBAR_SIZE) return 0;
  return n;
}

function stackView(stack, index, selected, key) {
  const item = stack ? itemById(stack.id) : null;
  return {
    id: (key ? 'hot-' : 'cargo-') + (index + 1),
    index,
    key: key || '',
    name: item ? item.name : '',
    label: item ? item.name : 'Empty',
    available: !!item,
    icon: item ? slotIcon(stack.id) : '',
    iconFilter: item ? iconFilter(stack.id) : 'none',
    color: item ? item.color : '',
    mark: item ? item.mark : '',
    badge: stack && stack.count > 1 ? String(stack.count) : '',
    selected: !!selected,
  };
}

/**
 * Hotbar stacks. Empty until something is extracted or fabricated.
 * A full bar overflows into cargo.
 */
export function buildHotbar(state) {
  ensureInventory(state);
  const selected = hotbarIndex(state);
  const slots = state.hotbar.map((stack, index) =>
    stackView(stack, index, index === selected, hotbarKey(index))
  );
  return {
    selected,
    label: slots[selected] ? slots[selected].label : 'Empty',
    slots,
  };
}

export function buildCargo(state) {
  ensureInventory(state);
  return {
    open: state.mode === 'cargo',
    cols: CARGO_COLS,
    rows: CARGO_ROWS,
    slots: state.cargoSlots.map((stack, index) => stackView(stack, index, false, '')),
  };
}

export function cycleHotbar(state, direction) {
  const dir = direction > 0 ? 1 : -1;
  const n = hotbarIndex(state);
  state.hotbarSlot = (n + dir + HOTBAR_SIZE) % HOTBAR_SIZE;
}

export function setCargoOpen(state, open) {
  if (open) {
    if (state.mode !== 'fly') return;
    state.mode = 'cargo';
    teachOnce(state, 'cargo', 'Drag a stack between the cargo and the hotbar.');
    return;
  }
  if (state.mode !== 'cargo') return;
  returnHeld(state);
  state.mode = 'fly';
}

/** The panel stays up in flight. It is not a mode and it has no key. */
export function hullPanelVisible(mode) {
  return mode === 'fly' || mode === 'cargo' || mode === 'extract' || mode === 'paused' || mode === 'transition';
}

export function buildHull(state) {
  ensureHull(state);
  return {
    visible: hullPanelVisible(state.mode),
    slots: HULL_FITS.map((fit, index) => {
      const stack = state.hullSlots[index];
      const view = stackView(stack, index, false, '');
      const level = fit.accept === BOW_ID && stack ? bowLevel(stack) : 0;
      const canLevel = fit.accept === BOW_ID && !!stack && level < 3;
      return {
        ...view,
        slotLabel: fit.label,
        accept: fit.accept,
        level,
        levelLabel: level ? 'Lv ' + level : '',
        canLevel,
        levelReady: canLevel && canAfford(state, BOW_LEVEL_COST),
        levelAction: canLevel ? 'Raise · 3 Pale stand-in' : '',
      };
    }),
  };
}

export function raiseBow(state, audio) {
  const result = raiseBowPlating(state);
  if (result === 'empty' || result === 'max') return false;
  if (result === 'short') {
    noteStatus(state, 'Bow plating needs 3 Pale ore. That cost is a stand-in.');
    if (audio && typeof audio.wrong === 'function') audio.wrong();
    return false;
  }
  noteStatus(state, 'Bow plating is level ' + result + '. A rock hit does a little less.');
  if (audio && typeof audio.correct === 'function') audio.correct();
  return true;
}

export function craftItem(state, recipeId, audio) {
  const id = typeof recipeId === 'string' ? recipeId : recipeId && recipeId.id;
  const recipe = recipeById(id);
  if (!recipe || !recipeOpen(state, recipe) || !canAfford(state, recipe.costs)) return false;
  payCraftCosts(state, recipe);
  const made = recipe.count || 1;
  const left = addItem(state, recipe.result, made);
  if (left > 0) {
    state.drops.push({
      id: state.nextId++,
      x: state.ship.x + 36,
      y: state.ship.y,
      itemId: recipe.result,
      count: left,
      life: 40,
      maxLife: 40,
    });
  }
  const name = ITEMS[recipe.result] ? ITEMS[recipe.result].name : recipe.result;
  if (left > 0) {
    state.status = name + ' dropped beside the ship. The hold is full.';
    state.statusTime = 3;
  } else {
    pushNotice(state, name + ' added.', 'loot');
  }
  if (recipe.result === 'map') state.mapUnlocked = true;
  if (audio && typeof audio.correct === 'function') audio.correct();
  return true;
}

function selectedStack(state) {
  ensureInventory(state);
  return state.hotbar[hotbarIndex(state)] || null;
}

function noteStatus(state, text) {
  state.status = text;
  state.statusTime = 3.2;
}

const SHOT_STYLE = {
  'ice-shot': { face: 'bullet_ice.png', sound: 'ice_shot', reach: 720, speed: 640, freeze: true, aliensOnly: true },
  'fire-shot': { face: 'bullet_fire1.png', sound: 'flame_shot', reach: 280, flame: true, aliensOnly: true },
  'laser-shot': { face: 'bullet_laser.png', sound: 'gun2', reach: 720, burst: 3, speed: 1180, aliensOnly: true },
  'electric-shot': { face: 'bullet_electric1.png', sound: 'electric_shot', reach: 720 },
  'bola-shot': { face: 'bullet_bola.png', sound: 'gun1', reach: 640 },
  'plasma-shot': { face: 'bullet_orb.png', sound: 'shot_orb', reach: 780 },
  'rail-shot': { face: 'bullet_rail.png', sound: 'shot_railbeam', reach: 1700, speed: 1900, heavy: true, power: 2, recoil: 2.4, aliensOnly: true },
};

function launchBolt(state, angle, extra) {
  const ship = state.ship;
  const speed = extra && extra.speed ? extra.speed : 900;
  const reach = extra && extra.maxRange ? extra.maxRange : 720;
  state.missiles.push({
    id: state.nextId++,
    x: ship.x + Math.cos(angle) * 36,
    y: ship.y + Math.sin(angle) * 36,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    bend: 0,
    straight: true,
    single: true,
    face: (extra && extra.face) || '',
    targetId: -1,
    targetKey: '',
    tx: ship.x + Math.cos(angle) * (reach + 80),
    ty: ship.y + Math.sin(angle) * (reach + 80),
    life: 2.4,
    age: 0,
    heavy: !!(extra && extra.heavy),
    power: extra && extra.power ? extra.power : 1,
    speed,
    maxRange: reach,
    freeze: !!(extra && extra.freeze),
    flame: !!(extra && extra.flame),
  });
}

function fireAtAlien(state, alien, style) {
  const aim = Math.atan2(alien.y - state.ship.y, alien.x - state.ship.x);
  const count = style.burst || 1;
  for (let i = 0; i < count; i += 1) {
    const spread = count === 1 ? 0 : (i - (count - 1) / 2) * 0.07;
    launchBolt(state, aim + spread, style);
  }
  if (style.recoil) kickRecoil(state, style.recoil);
}

function breatheFlame(state) {
  const ship = state.ship;
  const aim = ship.aim || 0;
  let hit = 0;
  for (const alien of state.aliens || []) {
    if (!alien || alien.gone || alien.leaving || alien.layer !== state.layer) continue;
    const dx = alien.x - ship.x;
    const dy = alien.y - ship.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 280 || dist < 8) continue;
    let diff = Math.atan2(dy, dx) - aim;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > 0.5) continue;
    const away = Math.atan2(dy, dx);
    alien.x += Math.cos(away) * 90;
    alien.y += Math.sin(away) * 90;
    damageAlien(state, alien, 1);
    hit += 1;
  }
  for (let i = -2; i <= 2; i += 1) {
    launchBolt(state, aim + i * 0.12, { face: 'bullet_fire1.png', speed: 420, maxRange: 260, flame: true, power: 0 });
  }
  return hit > 0;
}

function acquireShot(state, reach) {
  const rock = nearestAsteroid(state, reach);
  const alien = nearestAlien(state, reach);
  const rockDist = rock ? Math.hypot(rock.x - state.ship.x, rock.y - state.ship.y) : Infinity;
  const alienDist = alien ? Math.hypot(alien.x - state.ship.x, alien.y - state.ship.y) : Infinity;
  if (alien && alienDist <= rockDist) return { alien };
  if (rock) return { rock };
  return null;
}

function launchAt(state, found, audio, heavy, face, soundKey, style) {
  if (found.alien) {
    launchMissile(
      state,
      { id: -1, key: '', x: found.alien.x, y: found.alien.y },
      audio,
      heavy,
      face,
      soundKey
    );
    const missile = state.missiles[state.missiles.length - 1];
    missile.alienId = found.alien.id;
    missile.targetId = -1;
    missile.targetKey = '';
    if (style && style.arc) {
      missile.arc = true;
      missile.straight = false;
    }
    if (style && style.speed) missile.speed = style.speed;
    return;
  }
  launchMissile(state, found.rock, audio, heavy, face, soundKey);
  const missile = state.missiles[state.missiles.length - 1];
  if (style && style.arc) {
    missile.arc = true;
    missile.straight = false;
  }
  if (style && style.speed) missile.speed = style.speed;
}

function applyUse(state, use, audio, world) {
  const ship = state.ship;
  if (use === 'shot') {
    const stack = selectedStack(state);
    const style = stack && SHOT_STYLE[stack.id];
    if (!style) return false;
    if (style.flame) {
      const caught = breatheFlame(state);
      if (!caught) {
        state.missiles = state.missiles.filter((missile) => !missile.flame);
        noteStatus(state, 'No alien in the flame cone.');
        return false;
      }
      if (audio && typeof audio.playShot === 'function') audio.playShot(style.sound);
      kickRecoil(state, 0.7);
      return true;
    }
    if (style.aliensOnly) {
      const alien = nearestAlien(state, style.reach);
      if (!alien) {
        noteStatus(state, 'That shot only reaches aliens.');
        return false;
      }
      fireAtAlien(state, alien, style);
      if (audio && typeof audio.playShot === 'function') audio.playShot(style.sound);
      if (!style.recoil) kickRecoil(state, 1);
      return true;
    }
    const found = acquireShot(state, style.reach);
    if (!found) {
      noteStatus(state, 'Nothing in range for that weapon.');
      return false;
    }
    launchAt(state, found, audio, !!style.heavy, style.face, style.sound, style);
    return true;
  }
  if (use === 'missile' || use === 'core') {
    const heavy = use === 'core';
    const found = acquireShot(state, heavy ? 1400 : 2200);
    if (!found) {
      noteStatus(state, 'Nothing in range for that weapon.');
      return false;
    }
    launchAt(state, found, audio, heavy, heavy ? '' : 'bullet_missile.png', heavy ? 'gun1' : 'shot_missile', { arc: !heavy, speed: heavy ? 900 : 620 });
    if (heavy) grantMilestone(state, 'core-cannon');
    return true;
  }
  if (use === 'flare') {
    const n = state.asteroids.filter((rock) => rock.alive && !rock.depleted).length;
    noteStatus(state, n + ' rocks on this layer.');
    return true;
  }
  if (use === 'drive') {
    if (state.driveTier >= 3) {
      noteStatus(state, 'Drive is already at the top tier.');
      return false;
    }
    state.driveTier += 1;
    ship.maxSpeed = 430 + state.driveTier * 50;
    noteStatus(state, 'Drive coil fitted. Top speed ' + ship.maxSpeed + '.');
    return true;
  }
  if (use === 'hull') {
    if (state.hullTier >= 3) {
      noteStatus(state, 'Hull is already at the top tier.');
      return false;
    }
    state.hullTier += 1;
    ship.maxHp = 100 + state.hullTier * 30;
    ship.hp = Math.min(ship.maxHp, ship.hp + 30);
    noteStatus(state, 'Hull plate fitted. Hull ' + ship.maxHp + '.');
    return true;
  }
  if (use === 'hint') {
    const rock = activeAsteroid(state) || nearestAsteroid(state, APPROACH);
    if (!rock || !rock.question) {
      noteStatus(state, 'Get closer to a rock before using a hint.');
      return false;
    }
    const text = rock.question.answerText;
    const value = Number(text);
    state.hint =
      text.length <= 1
        ? 'Hint: the answer is ' + (value % 2 ? 'odd' : 'even') + '.'
        : 'Hint: the answer starts with ' + text[0] + '.';
    state.targetId = rock.id;
    return true;
  }
  if (use === 'map') {
    if (state.mapUnlocked) {
      noteStatus(state, 'Sector map is already on.');
      return false;
    }
    state.mapUnlocked = true;
    noteStatus(state, 'Sector map unlocked.');
    return true;
  }
  if (use === 'ping') {
    let bestDist = Infinity;
    for (const drop of state.drops) {
      const dist = Math.hypot(drop.x - ship.x, drop.y - ship.y);
      if (dist < bestDist) bestDist = dist;
    }
    noteStatus(
      state,
      bestDist < Infinity ? 'Nearest drop is ' + Math.round(bestDist) + ' away.' : 'No drops on this layer.'
    );
    return true;
  }
  if (use === 'gate') {
    const hole = state.wormhole || state.returnHole;
    if (!hole) {
      noteStatus(state, 'No gate on this layer.');
      return false;
    }
    noteStatus(state, 'Gate is ' + Math.round(Math.hypot(hole.x - ship.x, hole.y - ship.y)) + ' away.');
    return true;
  }
  if (use === 'repair') {
    if (ship.hp >= ship.maxHp) {
      noteStatus(state, 'Hull is already full.');
      return false;
    }
    if (ship.hp < 20) grantMilestone(state, 'low-repair');
    ship.hp = Math.min(ship.maxHp, ship.hp + 40);
    noteStatus(state, 'Repair patch. Hull ' + Math.round(ship.hp) + '/' + ship.maxHp + '.');
    return true;
  }
  if (use === 'blink') {
    ship.x = clamp(ship.x + Math.cos(ship.aim) * 320, 80, WORLD.w - 80);
    ship.y = clamp(ship.y + Math.sin(ship.aim) * 320, 80, WORLD.h - 80);
    noteStatus(state, 'Phase blink.');
    return true;
  }
  if (use === 'tractor') {
    let pulled = 0;
    for (const drop of state.drops) {
      if (Math.hypot(drop.x - ship.x, drop.y - ship.y) > 640) continue;
      drop.x = ship.x;
      drop.y = ship.y;
      pulled += 1;
    }
    if (!pulled) {
      noteStatus(state, 'Nothing nearby to pull.');
      return false;
    }
    noteStatus(state, 'Tractor pulse pulled ' + pulled + (pulled === 1 ? ' drop.' : ' drops.'));
    return true;
  }
  if (use === 'quiet') {
    state.quiet = 5;
    noteStatus(state, 'Quiet running. Bumps will not hurt for a few seconds.');
    return true;
  }
  if (use === 'cloak') {
    state.cloak = 7;
    noteStatus(state, 'Cloaked. Aliens lose you for a few seconds.');
    return true;
  }
  if (use === 'dash') {
    ship.vx += Math.cos(ship.aim) * 540;
    ship.vy += Math.sin(ship.aim) * 540;
    if (audio && typeof audio.dash === 'function') audio.dash();
    noteStatus(state, 'Dash.');
    return true;
  }
  if (use === 'shock') {
    let shoved = 0;
    for (const alien of state.aliens || []) {
      if (!alien || alien.gone || alien.leaving || alien.layer !== state.layer) continue;
      const dx = alien.x - ship.x;
      const dy = alien.y - ship.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 240 || dist < 1) continue;
      alien.x += (dx / dist) * 170;
      alien.y += (dy / dist) * 170;
      damageAlien(state, alien, 1);
      shoved += 1;
    }
    impactDebris(state, ship.x, ship.y);
    if (audio && typeof audio.dash === 'function') audio.dash();
    if (!shoved) noteStatus(state, 'Shockwave. No alien was close.');
    else noteStatus(state, 'Shockwave shoved ' + shoved + (shoved === 1 ? ' alien.' : ' aliens.'));
    return true;
  }
  if (use === 'shield') {
    state.shield = (state.shield || 0) + 1;
    noteStatus(state, 'Shield raised. The next hit is absorbed.');
    return true;
  }
  if (use === 'teleport') {
    if (audio && typeof audio.playShot === 'function') audio.playShot('teleport_disappear');
    ship.x = clamp(ship.x + Math.cos(ship.aim) * 880, 80, WORLD.w - 80);
    ship.y = clamp(ship.y + Math.sin(ship.aim) * 880, 80, WORLD.h - 80);
    ship.vx = 0;
    ship.vy = 0;
    state.camera.x = ship.x;
    state.camera.y = ship.y;
    if (audio && typeof audio.playShot === 'function') audio.playShot('teleport_reappear');
    noteStatus(state, 'Teleported along your aim.');
    return true;
  }
  if (use === 'hyper') {
    if (!world) {
      noteStatus(state, 'Click a point on this layer.');
      return false;
    }
    const dist = Math.hypot(world.x - ship.x, world.y - ship.y);
    if (dist < 120) {
      noteStatus(state, 'Click farther away to hyperdrive.');
      return false;
    }
    ship.x = clamp(world.x, 80, WORLD.w - 80);
    ship.y = clamp(world.y, 80, WORLD.h - 80);
    ship.vx = 0;
    ship.vy = 0;
    state.camera.x = ship.x;
    state.camera.y = ship.y;
    if (audio && typeof audio.dash === 'function') audio.dash();
    noteStatus(state, 'Hyperdrive.');
    return true;
  }
  if (use === 'megajump') {
    state.layerArm = true;
    state.layerBuffer = '';
    noteStatus(state, 'Type a layer from -250 to 250, then Enter. Minus flips the sign.');
    return true;
  }
  return false;
}

/** Left click uses the selected hotbar item when that item has a use. Minerals do not. */
export function useSelectedHotbar(state, audio, world) {
  const stack = selectedStack(state);
  if (!stack) return false;
  const item = itemById(stack.id);
  if (!item || !item.use) return false;
  if (!applyUse(state, item.use, audio, world)) return false;
  stack.count -= 1;
  if (stack.count <= 0) state.hotbar[hotbarIndex(state)] = null;
  if (audio && item.use !== 'shot' && item.use !== 'missile' && item.use !== 'core' && item.use !== 'dash' && item.use !== 'shock' && item.use !== 'teleport' && item.use !== 'hyper') {
    if (typeof audio.correct === 'function') audio.correct();
  }
  return true;
}

export { moveCargoToHotbar, moveHotbarToCargo, addItem, countItem };

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
    cargo: String(
      (state.cargoSlots || []).reduce((total, stack) => total + (stack ? stack.count : 0), 0) +
        (Number(state.cargo) || 0)
    ),
    bank: String(state.bank),
    speed: String(speed),
    question: questionReadout(state),
    buffer: state.buffer,
    bufferBad: state.wrong > 0,
    hint: state.hint
      ? state.hint
      : state.statusTime > 0 && state.status
        ? state.status
        : tutorialHint(state),
    hotbar: buildHotbar(state),
    mainStar: mainStarView(state.seed, state.clock),
    starClock: true,
    compass: hullHas(state, 'compass')
      ? {
          layer: state.layer,
          along: Math.max(0, Math.min(1, state.ship.x / (state.world.w || 1))),
        }
      : null,
  };
}

export function buildFabFields(state) {
  const recipes = RECIPES_FOR_FAB(state);
  return {
    fabCopy: countItem(state, 'bench')
      ? 'The Fabrication Tool is in your hold, so the rest of the bay is open. Each entry is still a count of materials.'
      : 'Immediate Fabrication is Prism glass and the Fabrication Tool. Carry the tool to open the rest of the index.',
    recipes,
    fabBankLabel: '',
    fabDriveLabel: '',
    fabHullLabel: '',
    fabHintLabel: '',
    fabMapLabel: '',
    fabBankDisabled: true,
    fabDriveDisabled: true,
    fabHullDisabled: true,
    fabHintDisabled: true,
    fabMapDisabled: true,
    mapUnlocked: !!state.mapUnlocked,
    mapCost: 3,
  };
}

function RECIPES_FOR_FAB(state) {
  return RECIPES.filter((recipe) => recipeOpen(state, recipe) && (!recipe.reveal || countItem(state, recipe.reveal) >= 1)).map((recipe) => ({
    id: recipe.id,
    category: recipe.category,
    name: ITEMS[recipe.result] ? ITEMS[recipe.result].name : recipe.result,
    icon: slotIcon(recipe.result),
    iconFilter: iconFilter(recipe.result),
    about: ITEMS[recipe.result] && ITEMS[recipe.result].about ? ITEMS[recipe.result].about : '',
    costText: costLabel(recipe.costs) + (recipe.standIn ? ' (stand-in)' : ''),
    ready: canAfford(state, recipe.costs),
    costs: recipe.costs.map((cost) => ({
      id: cost.id,
      n: cost.n,
      name: ITEMS[cost.id] ? ITEMS[cost.id].name : cost.id,
      have: countItem(state, cost.id),
      icon: slotIcon(cost.id),
      iconFilter: iconFilter(cost.id),
    })),
  }));
}

function heldView(state) {
  if (!state.held) return null;
  const item = itemById(state.held.id);
  return {
    name: item ? item.name : state.held.name,
    count: state.held.count,
    color: item ? item.color : '#9be7ff',
    mark: item ? item.mark : '',
    icon: item ? slotIcon(state.held.id) : '',
    iconFilter: item ? iconFilter(state.held.id) : 'none',
  };
}

export function buildSnapshotPatch(state, muted) {
  return {
    mode: state.mode,
    deathReason: state.deathReason || '',
    deathReveal: state.deathReveal || 0,
    seed: state.seed,
    missionId: state.mission ? state.mission.id : '',
    muted: !!muted,
    clearTitle: state.clearTitle,
    assemblyId: state.assemblyId || '',
    clearCopy: state.clearCopy,
    extractAvailable: state.extractAvailable || null,
    extractMode: state.mode === 'extract',
    extractQuestion: extractQuestionReadout(state),
    extractRockName:
      state.mode === 'extract'
        ? rockTypeName(extractRock(state)) || state.closingRockName || ''
        : '',
    rockTip: state.rockTip || null,
    extractToast: state.extractToast || '',
    extractRockId: state.extractRockId || null,
    fxGreen: state.fxGreen > 0,
    correctAnswer: state.fxGreen > 0 ? state.correctAnswer || '' : '',
    fxFlash: state.fxFlash > 0,
    cargoOpen: state.mode === 'cargo',
    cargoHold: buildCargo(state),
    hullRack: buildHull(state),
    held: heldView(state),
    notices: (state.notices || []).map((note) => ({ id: note.id, text: note.text, kind: note.kind || '' })),
    intro: introAlphas(state),
    ...buildFabFields(state),
    hud: buildHudFields(state),
  };
}
