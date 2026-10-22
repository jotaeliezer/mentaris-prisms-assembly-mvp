/** One alien on the current layer while the main star is up. */

import { clamp, makeRng } from './util.js';
import { WORLD } from './state.js';
import { mainStarUp } from './star.js';
import { grantMilestone } from './milestones.js';

export const ALIEN_RESPAWN = 18;
const ALIEN_HURT = 14;

export const ALIEN_TYPES = {
  scout: { file: 'alien_ET.png', weight: 24, speed: 160, drop: 'gland', gap: 280 },
  spider: { file: 'alien_spider.png', weight: 18, speed: 300, drop: 'fiber' },
  dartwing: { file: 'alien_galaga.png', weight: 16, speed: 240, dive: 500, drop: 'shard' },
  eye: { file: 'alien_eye.png', weight: 12, speed: 200, drop: 'lamp', gap: 420 },
  pincer: { file: 'alien_robot.png', weight: 10, speed: 260, drop: 'servo', gap: 320 },
  golem: { file: 'alien_golem.png', weight: 8, speed: 120, charge: 340, drop: 'spike' },
  saucer: { file: 'alien_saucer.png', weight: 7, speed: 140, drop: 'chart' },
  brain: { file: 'alien_brain.png', weight: 5, speed: 80, drop: 'core' },
};

function here(object, state) {
  return object && object.layer === state.layer && object.cluster === (state.cluster || 1);
}

function aliveRock(state, mineral) {
  return (state.asteroids || []).some((rock) => rock && rock.alive && rock.mineral === mineral);
}

function hasKind(state, kind) {
  return (state.spaceObjects || []).some((object) => here(object, state) && object.kind === kind);
}

function hasStar(state, kind) {
  return (state.sunBodies || []).some((star) => here(star, state) && star.kind === kind);
}

/** Ordinary weights, plus a lean when that alien's source is on this layer. */
export function alienWeights(state) {
  const weights = {};
  for (const id of Object.keys(ALIEN_TYPES)) weights[id] = ALIEN_TYPES[id].weight;
  if (hasStar(state, 'pale')) weights.scout += 30;
  if (aliveRock(state, 'pale')) weights.spider += 40;
  if (Math.abs(Number(state.layer) || 0) >= 2) weights.dartwing += 40;
  if (hasStar(state, 'glint')) weights.eye += 30;
  if (hasKind(state, 'ion')) weights.pincer += 40;
  if (aliveRock(state, 'virid')) weights.golem += 40;
  if (hasKind(state, 'stronghold')) weights.saucer += 40;
  if (hasKind(state, 'lair')) weights.brain += 50;
  return weights;
}

export function rollAlienType(state) {
  const weights = alienWeights(state);
  let total = 0;
  for (const id of Object.keys(weights)) total += weights[id];
  let pick = (state.rng ? state.rng() : Math.random()) * total;
  for (const id of Object.keys(weights)) {
    pick -= weights[id];
    if (pick <= 0) return id;
  }
  return 'scout';
}

function hurtShip(state, amount, alien) {
  if (!state.ship || state.mode !== 'fly') return;
  if (state.bumpCooldown > 0) return;
  state.bumpCooldown = 0.7;
  state.ship.hp = Math.max(0, state.ship.hp - amount);
  state.fxFlash = 0.12;
  state.hurt = 0.2;
  if (alien && alien.type === 'golem' && state.ship.hp > 0) grantMilestone(state, 'golem-lived');
  if (state.ship.hp <= 0) state.pendingBreach = 'An alien broke the hull.';
}

export function damageAlien(state, alien, power) {
  if (!alien || alien.gone || alien.leaving) return false;
  alien.hp -= power || 1;
  if (alien.hp > 0) return false;
  breakAlien(state, alien);
  return true;
}

function breakAlien(state, alien) {
  if (!alien || alien.gone) return;
  alien.gone = true;
  alien.leaving = false;
  const spec = ALIEN_TYPES[alien.type] || ALIEN_TYPES.scout;
  if (!state.drops) state.drops = [];
  state.drops.push({
    id: state.nextId++,
    x: alien.x,
    y: alien.y,
    itemId: spec.drop,
    count: 1,
    life: 90,
    maxLife: 90,
  });
  state.alienNext = (Number(state.clock) || 0) + ALIEN_RESPAWN;
  grantMilestone(state, 'alien-break');
}

function fireBolt(state, alien, speed, spread, color) {
  if (!state.alienShots) state.alienShots = [];
  const aim = (alien.aim || 0) + spread;
  state.alienShots.push({
    id: state.nextId++,
    layer: alien.layer,
    kind: 'bolt',
    x: alien.x + Math.cos(aim) * 30,
    y: alien.y + Math.sin(aim) * 30,
    vx: Math.cos(aim) * speed,
    vy: Math.sin(aim) * speed,
    life: 3.4,
    r: 6,
    dmg: ALIEN_HURT,
    color: color || 0x7dff9a,
  });
}

function fireRing(state, alien) {
  if (!state.alienShots) state.alienShots = [];
  state.alienShots.push({
    id: state.nextId++,
    layer: alien.layer,
    kind: 'ring',
    x: alien.x,
    y: alien.y,
    r: 24,
    grow: 110,
    life: 2.4,
    hit: false,
    dmg: ALIEN_HURT,
    color: 0xff7ab8,
  });
}

function fireBomb(state, alien, ship) {
  if (!state.alienShots) state.alienShots = [];
  const dx = ship.x - alien.x;
  const dy = ship.y - alien.y;
  const dist = Math.hypot(dx, dy) || 1;
  state.alienShots.push({
    id: state.nextId++,
    layer: alien.layer,
    kind: 'bomb',
    x: alien.x,
    y: alien.y,
    vx: (dx / dist) * 70,
    vy: (dy / dist) * 70,
    fuse: 2.4,
    life: 3,
    r: 8,
    dmg: ALIEN_HURT,
    color: 0xffb15a,
  });
}

function steer(alien, x, y, speed, dt) {
  const dx = x - alien.x;
  const dy = y - alien.y;
  const dist = Math.hypot(dx, dy) || 1;
  alien.aim = Math.atan2(dy, dx);
  const step = Math.min(dist, speed * dt);
  alien.x += (dx / dist) * step;
  alien.y += (dy / dist) * step;
  return dist;
}

function holdGap(alien, ship, gap, speed, dt) {
  const dx = ship.x - alien.x;
  const dy = ship.y - alien.y;
  const dist = Math.hypot(dx, dy) || 1;
  alien.aim = Math.atan2(dy, dx);
  const want = dist - gap;
  const step = Math.max(-speed * dt, Math.min(speed * dt, want));
  alien.x += (dx / dist) * step;
  alien.y += (dy / dist) * step;
}

function touchShip(alien, ship, reach) {
  return Math.hypot(alien.x - ship.x, alien.y - ship.y) < reach;
}

function leaveAlien(alien, ship, dt) {
  const dx = alien.x - ship.x;
  const dy = alien.y - ship.y;
  const dist = Math.hypot(dx, dy) || 1;
  alien.x += (dx / dist) * 240 * dt;
  alien.y += (dy / dist) * 240 * dt;
  alien.leaveT = (alien.leaveT || 0) + dt;
  if (alien.leaveT > 2.6 || dist > 1700) alien.gone = true;
}

function tickMind(state, alien, dt) {
  const ship = state.ship;
  alien.t = (alien.t || 0) + dt;
  if (alien.type === 'scout') {
    holdGap(alien, ship, 280, 160, dt);
    if (alien.t > 2) {
      alien.t = 0;
      fireBolt(state, alien, 180, 0, 0x7dff9a);
    }
    return;
  }
  if (alien.type === 'spider') {
    if (alien.pause > 0) {
      alien.pause -= dt;
      return;
    }
    steer(alien, ship.x, ship.y, 300, dt);
    if (touchShip(alien, ship, 40)) {
      hurtShip(state, ALIEN_HURT, alien);
      alien.pause = 1.15;
    }
    return;
  }
  if (alien.type === 'dartwing') {
    if (alien.phase !== 'dive') {
      const orbit = alien.aim + dt * 0.8;
      alien.aim = orbit;
      const gap = 340;
      const tx = ship.x + Math.cos(orbit + Math.PI / 2) * gap;
      const ty = ship.y + Math.sin(orbit + Math.PI / 2) * gap;
      steer(alien, tx, ty, 240, dt);
      if (alien.t > 1.7) {
        alien.phase = 'dive';
        alien.t = 0;
        alien.lockX = ship.x;
        alien.lockY = ship.y;
        fireBolt(state, alien, 320, -0.12, 0xffe27a);
        fireBolt(state, alien, 320, 0.12, 0xffe27a);
      }
      return;
    }
    const dist = steer(alien, alien.lockX, alien.lockY, 500, dt);
    if (touchShip(alien, ship, 36)) hurtShip(state, ALIEN_HURT, alien);
    if (dist < 24 || alien.t > 0.85) {
      alien.phase = 'curve';
      alien.t = 0;
    }
    return;
  }
  if (alien.type === 'eye') {
    holdGap(alien, ship, 420, 200, dt);
    alien.aim += dt * 1.4;
    if (alien.t > 1.6) {
      alien.t = 0;
      const saved = alien.aim;
      alien.aim = Math.atan2(ship.y - alien.y, ship.x - alien.x);
      fireBolt(state, alien, 520, 0, 0xff4d5a);
      alien.aim = saved;
    }
    return;
  }
  if (alien.type === 'pincer') {
    const dx = ship.x - alien.x;
    const dy = ship.y - alien.y;
    const dist = Math.hypot(dx, dy) || 1;
    alien.aim = Math.atan2(dy, dx);
    const gapFix = dist - 320;
    alien.x += (dx / dist) * Math.max(-260 * dt, Math.min(260 * dt, gapFix));
    alien.y += (dy / dist) * Math.max(-260 * dt, Math.min(260 * dt, gapFix));
    const side = alien.strafe || 1;
    alien.x += (-dy / dist) * side * 260 * dt;
    alien.y += (dx / dist) * side * 260 * dt;
    if (alien.t > 1.3) {
      alien.strafe = side > 0 ? -1 : 1;
      alien.t = 0;
      fireBolt(state, alien, 160, 0, 0x7aa2ff);
    }
    return;
  }
  if (alien.type === 'golem') {
    if (alien.phase !== 'charge') {
      steer(alien, ship.x, ship.y, 120, dt);
      if (alien.t > 1.5) {
        alien.phase = 'charge';
        alien.t = 0;
        alien.aim = Math.atan2(ship.y - alien.y, ship.x - alien.x);
      }
      return;
    }
    alien.x += Math.cos(alien.aim) * 340 * dt;
    alien.y += Math.sin(alien.aim) * 340 * dt;
    if (touchShip(alien, ship, 42)) hurtShip(state, ALIEN_HURT, alien);
    if (alien.t > 0.85) {
      alien.phase = 'lumber';
      alien.t = 0;
    }
    return;
  }
  if (alien.type === 'saucer') {
    if (!alien.homeX) {
      alien.homeX = alien.x;
      alien.homeY = alien.y;
    }
    steer(alien, alien.homeX + Math.sin(alien.t * 0.6) * 40, alien.homeY, 140, dt);
    alien.aim = Math.atan2(ship.y - alien.y, ship.x - alien.x);
    if (alien.t > 2.2) {
      alien.t = 0;
      fireBomb(state, alien, ship);
    }
    if (touchShip(alien, ship, 40)) {
      hurtShip(state, ALIEN_HURT * 2, alien);
      breakAlien(state, alien);
    }
    return;
  }
  alien.aim = Math.atan2(ship.y - alien.y, ship.x - alien.x);
  const aimed =
    Math.abs(Math.atan2(Math.sin(ship.aim - alien.aim), Math.cos(ship.aim - alien.aim))) < 0.35 &&
    Math.hypot(ship.x - alien.x, ship.y - alien.y) < 700;
  if (aimed && alien.t > 1.4) {
    const side = alien.aim + Math.PI / 2;
    alien.x += Math.cos(side) * 80;
    alien.y += Math.sin(side) * 80;
    alien.t = 0;
  }
  if (alien.t > 2.6) {
    alien.t = 0;
    fireRing(state, alien);
  }
}

function tickShots(state, dt) {
  const ship = state.ship;
  if (!state.alienShots) state.alienShots = [];
  for (const shot of state.alienShots) {
    if (shot.layer !== state.layer) continue;
    shot.life -= dt;
    if (shot.kind === 'ring') {
      shot.r += shot.grow * dt;
      if (!shot.hit && ship && Math.abs(Math.hypot(ship.x - shot.x, ship.y - shot.y) - shot.r) < 16) {
        shot.hit = true;
        hurtShip(state, shot.dmg, null);
      }
      continue;
    }
    if (shot.kind === 'bomb') {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.fuse -= dt;
      const dist = ship ? Math.hypot(ship.x - shot.x, ship.y - shot.y) : 9999;
      if (dist < 24 || shot.fuse <= 0) {
        shot.life = 0;
        if (dist < 72) hurtShip(state, shot.dmg, null);
      }
      continue;
    }
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    if (ship && Math.hypot(ship.x - shot.x, ship.y - shot.y) < 22) {
      shot.life = 0;
      hurtShip(state, shot.dmg, null);
    }
  }
  state.alienShots = state.alienShots.filter((shot) => shot.life > 0);
}

function lairOnLayer(state) {
  return (state.spaceObjects || []).find((object) => object.kind === 'lair' && here(object, state)) || null;
}

function spawnPoint(state, type) {
  const ship = state.ship;
  const lair = lairOnLayer(state);
  const rng = state.rng || Math.random;
  const angle = rng() * Math.PI * 2;
  if (lair && (type === 'brain' || Math.hypot(lair.x - ship.x, lair.y - ship.y) < 900)) {
    return {
      x: clamp(lair.x + Math.cos(angle) * (lair.r + 90), 200, WORLD.w - 200),
      y: clamp(lair.y + Math.sin(angle) * (lair.r + 90), 200, WORLD.h - 200),
    };
  }
  return {
    x: clamp(ship.x + Math.cos(angle) * 420, 200, WORLD.w - 200),
    y: clamp(ship.y + Math.sin(angle) * 420, 200, WORLD.h - 200),
  };
}

export function spawnAlien(state, type, x, y) {
  const spec = ALIEN_TYPES[type] || ALIEN_TYPES.scout;
  if (!state.aliens) state.aliens = [];
  const alien = {
    id: state.nextId++,
    type: spec === ALIEN_TYPES[type] ? type : 'scout',
    file: spec.file,
    layer: state.layer,
    cluster: state.cluster || 1,
    x,
    y,
    hp: 3,
    aim: 0,
    t: 0,
    phase: 'idle',
    pause: 0,
    leaving: false,
    gone: false,
  };
  state.aliens.push(alien);
  return alien;
}

export function nearestAlien(state, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const alien of state.aliens || []) {
    if (!alien || alien.gone || alien.leaving || alien.layer !== state.layer) continue;
    const dist = Math.hypot(alien.x - state.ship.x, alien.y - state.ship.y);
    if (dist < bestDist) {
      best = alien;
      bestDist = dist;
    }
  }
  return best;
}

/** Open the lair while the star is up. Shut it, and the alien leaves without a drop. */
export function tickAliens(state, dt) {
  if (!state.ship || state.mode !== 'fly' || state.intro) return;
  if (!state.aliens) state.aliens = [];
  const up = mainStarUp(state.seed, state.clock);
  const cluster = state.cluster || 1;
  const mine = state.aliens.filter((alien) => alien && !alien.gone && alien.layer === state.layer && alien.cluster === cluster);
  if (!up) {
    state.lairSeenDown = true;
    for (const alien of mine) alien.leaving = true;
  } else if (!state.lairSeenDown) {
    // A fresh flight stays empty until the sun has been down once.
  } else if (!mine.length && (Number(state.alienNext) || 0) <= (Number(state.clock) || 0)) {
    const type = rollAlienType(state);
    const spot = spawnPoint(state, type);
    spawnAlien(state, type, spot.x, spot.y);
  }
  for (const alien of state.aliens) {
    if (alien.gone || alien.layer !== state.layer) continue;
    if (alien.leaving || !up) leaveAlien(alien, state.ship, dt);
    else tickMind(state, alien, dt);
  }
  state.aliens = state.aliens.filter((alien) => alien && !alien.gone);
  tickShots(state, dt);
}

/** One mouth per cluster, on the arrival layer, so the clock the pilot sees can let something out. */
export function ensureLair(state) {
  if (!state.spaceObjects) state.spaceObjects = [];
  const cluster = state.cluster || 1;
  if (state.spaceObjects.some((object) => object && object.kind === 'lair' && object.cluster === cluster)) return;
  if (state.layer !== 0) return;
  const rng = makeRng((state.seed || 'belt') + '|lair|' + cluster);
  const angle = rng() * Math.PI * 2;
  const dist = 1500 + rng() * 400;
  state.spaceObjects.push({
    id: 'lair:' + cluster,
    layer: 0,
    cluster,
    kind: 'lair',
    key: '',
    r: 220,
    x: clamp(state.ship.x + Math.cos(angle) * dist, 800, WORLD.w - 800),
    y: clamp(state.ship.y + Math.sin(angle) * dist, 800, WORLD.h - 800),
    taken: false,
    lootLeft: 0,
    vx: 0,
    vy: 0,
  });
}
