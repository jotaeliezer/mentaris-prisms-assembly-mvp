import { clamp } from './util.js';

export const LAYER_SWAP = 0.45;

function mod(n, m) {
  return ((n % m) + m) % m;
}

function parseColor(color, fallback = 0xd7f4ff) {
  if (typeof color === 'number') return color;
  return parseInt(String(color).replace('#', ''), 16) || fallback;
}

/**
 * Screen-space starfield with camera parallax — matches legacy js/render.js drawStars.
 * gfx should use scrollFactor(0).
 */
export function syncStars(gfx, stars, camera, w, h) {
  gfx.clear();
  if (!stars || !camera) return;
  for (const star of stars) {
    const sx = mod(star.x - camera.x * star.parallax, w + 40) - 20;
    const sy = mod(star.y - camera.y * star.parallax, h + 40) - 20;
    gfx.fillStyle(parseColor(star.color), star.a);
    gfx.fillRect(sx, sy, star.size, star.size);
  }
}

/**
 * Thruster flame in ship-local space — matches legacy js/render.js drawFlame.
 * Sets gfx position/rotation/scale to the ship; call near ship draw.
 */
export function syncFlame(gfx, ship, shipScale = 1) {
  gfx.clear();
  if (!ship || !ship.thrusting) {
    gfx.setVisible(false);
    return;
  }
  gfx.setVisible(true);
  gfx.setPosition(ship.x, ship.y);
  gfx.setRotation(ship.aim + Math.PI / 2);
  gfx.setScale(shipScale);

  const flicker = 0.75 + Math.random() * 0.4;
  const length = 26 + (ship.thrust || 0) * 18;
  // Approximate canvas linear gradient with nested triangles
  gfx.fillStyle(0x7ee7ff, flicker * 0.8);
  gfx.fillTriangle(-7, 20, 0, 20 + length, 7, 20);
  gfx.fillStyle(0xfff4d6, flicker * 0.95);
  gfx.fillTriangle(-4, 20, 0, 20 + length * 0.55, 4, 20);
}

/** Direction-specific rock/ship envelopes for kind:"layer" only. */
export function layerTransitionFx(state) {
  const tr = state.transition;
  if (!tr || tr.kind !== 'layer') return null;
  const p = Math.min(1, Math.max(0, tr.t / tr.dur));
  const dir = tr.dir || 1;
  const leaveP = Math.min(1, p / LAYER_SWAP);
  const enterP = p <= LAYER_SWAP ? 0 : Math.min(1, (p - LAYER_SWAP) / (1 - LAYER_SWAP));
  const mid = Math.sin(Math.PI * p);
  let leaveScale;
  let enterScale;
  if (dir < 0) {
    leaveScale = 1 + leaveP * (2.4 - 1);
    enterScale = 0.25 + enterP * (1 - 0.25);
  } else {
    leaveScale = 1 + leaveP * (0.35 - 1);
    enterScale = 2.6 + enterP * (1 - 2.6);
  }
  return {
    p,
    dir,
    leave: { scale: leaveScale, alpha: 1 - leaveP },
    enter: { scale: enterScale, alpha: enterP },
    shipScale: dir < 0 ? 1 - 0.28 * mid : 1 + 0.28 * mid,
    swapped: p >= LAYER_SWAP,
  };
}

/** Softened world squash/shift during transitions (layer softer than wormhole). */
export function worldSquash(state) {
  if (!state.transition) return { scaleX: 1, scaleY: 1, shift: 0 };
  const p = state.transition.t / state.transition.dur;
  const bend = Math.sin(Math.PI * Math.min(1, p));
  const dir = state.transition.dir || 1;
  const layer = state.transition.kind === 'layer';
  return {
    scaleX: 1 - bend * (layer ? 0.06 : 0.14),
    scaleY: 1 - bend * (layer ? 0.18 : 0.46),
    shift: bend * (layer ? 36 : 80) * dir,
  };
}

export function rockDisplayScale(rock, envelopeScale = 1) {
  return (rock.size / 180) * 0.9 * envelopeScale;
}

/**
 * Apply camera follow + softened squash/shift. Uses zoomX/zoomY so layer zooms stay readable.
 */
export function applyCameraPolish(cam, state) {
  const { scaleX, scaleY, shift } = worldSquash(state);
  cam.zoomX = scaleX;
  cam.zoomY = scaleY;
  cam.centerOn(state.camera.x, state.camera.y - shift);
  if (state.shakeTime > 0) {
    const amp = state.shakeMag || 64;
    const step = Math.floor(state.clock * 52);
    const flip = step % 2 === 0 ? 1 : -1;
    const flipY = (step + 1) % 2 === 0 ? 1 : -1;
    cam.scrollX += flip * amp;
    cam.scrollY += flipY * amp * 0.7;
  }
}

/** Small fading dots/sparks — matches legacy js/render.js drawParticles. */
export function syncParticles(gfx, particles) {
  gfx.clear();
  for (const bit of particles) {
    if (bit.life <= 0) continue;
    const color =
      typeof bit.color === 'number'
        ? bit.color
        : parseInt(String(bit.color).replace('#', ''), 16) || 0xd7f6ff;
    gfx.fillStyle(color, Math.max(0, Math.min(1, bit.life)));
    gfx.fillRect(bit.x, bit.y, bit.size, bit.size);
  }
}

export function syncAimArc(gfx, state) {
  gfx.clear();
  for (const rock of state.asteroids) {
    if (!rock.alive || !(rock.active || rock.near)) continue;
    const hard = rock.difficulty === 'hard';
    gfx.lineStyle(rock.active ? 2.5 : 1.5, hard ? 0xffb15a : 0x8dffb0, rock.active ? 0.9 : 0.75);
    gfx.strokeCircle(rock.x, rock.y, rock.radius + (rock.active ? 18 : 12));
  }
}

export function syncGates(gfx, state) {
  gfx.clear();
  if (state.returnHole) drawGate(gfx, state, state.returnHole, false, true);
  if (state.wormhole) drawGate(gfx, state, state.wormhole, !!state.wormhole.locked, false);
}

function drawGate(gfx, state, hole, locked, isReturn) {
  const color = locked ? 0xa8b0ba : isReturn ? 0x7ee7ff : 0xbc8cff;
  const alpha = locked ? 0.75 : 0.95;
  const spin = state.clock * (locked ? 0.35 : 1.1);
  for (let i = 0; i < 3; i++) {
    const rx = 28 + i * 16;
    const ry = 12 + i * 7;
    gfx.lineStyle(3, color, alpha);
    // Approximate ellipse via rotated oval points
    const rot = spin + i * 0.6;
    gfx.beginPath();
    const steps = 28;
    for (let s = 0; s <= steps; s++) {
      const a = (s / steps) * Math.PI * 2;
      const lx = Math.cos(a) * rx;
      const ly = Math.sin(a) * ry;
      const px = hole.x + lx * Math.cos(rot) - ly * Math.sin(rot);
      const py = hole.y + lx * Math.sin(rot) + ly * Math.cos(rot);
      if (s === 0) gfx.moveTo(px, py);
      else gfx.lineTo(px, py);
    }
    gfx.strokePath();
  }
}

/** Screen-space edge beacons toward off-screen gates. gfx must be scrollFactor 0. */
export function syncBeacons(gfx, state, w, h) {
  gfx.clear();
  if (state.mode === 'title') return;
  drawBeacon(gfx, state, w, h, state.wormhole, state.wormhole && state.wormhole.locked ? 0xc8ced6 : 0xbc8cff);
  if (state.returnHole) drawBeacon(gfx, state, w, h, state.returnHole, 0x7ee7ff);
}

function drawBeacon(gfx, state, w, h, hole, color) {
  if (!hole) return;
  const dx = hole.x - state.camera.x;
  const dy = hole.y - state.camera.y;
  const dist = Math.hypot(dx, dy);
  if (dist < Math.min(w, h) * 0.42) return;
  const ang = Math.atan2(dy, dx);
  const cx = clamp(w / 2 + Math.cos(ang) * (w * 0.42), 36, w - 36);
  const cy = clamp(h / 2 + Math.sin(ang) * (h * 0.36), 80, h - 80);
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  const tipX = cx + cos * 14;
  const tipY = cy + sin * 14;
  const bx = cx - cos * 8;
  const by = cy - sin * 8;
  const px = -sin * 7;
  const py = cos * 7;
  gfx.fillStyle(color, 0.92);
  gfx.fillTriangle(tipX, tipY, bx + px, by + py, bx - px, by - py);
}

/** Soft color wash for wormhole and layer shifts. Scan-line streaks are not drawn. */
export function syncTransitionWash(gfx, state, w, h) {
  gfx.clear();
  if (!state.transition) return;
  const p = Math.min(1, state.transition.t / state.transition.dur);
  const band = Math.sin(Math.PI * p);
  const dir = state.transition.dir || 1;
  const color = dir > 0 ? 0x7ee7ff : 0xffb15a;
  gfx.fillStyle(color, 0.28 * band);
  gfx.fillRect(0, 0, w, h);
}

/**
 * Minimap in screen space. Hidden until state.mapUnlocked is true.
 * T7 wires fab unlock; default false gates product intent early.
 */
export function syncMinimap(gfx, state, w, h) {
  gfx.clear();
  if (!state.mapUnlocked) return;
  const mw = 176;
  const mh = 120;
  const x = w - mw - 16;
  const y = h - mh - 58;
  gfx.fillStyle(0x050e18, 0.78);
  gfx.fillRect(x, y, mw, mh);
  gfx.lineStyle(1, 0x7ee7ff, 0.4);
  gfx.strokeRect(x, y, mw, mh);
  for (const rock of state.asteroids) {
    if (!rock.alive) continue;
    const px = x + (rock.x / state.world.w) * mw;
    const py = y + (rock.y / state.world.h) * mh;
    gfx.fillStyle(rock.difficulty === 'hard' ? 0xffb15a : 0x8dffb0, 1);
    gfx.fillRect(px - 1.5, py - 1.5, 3, 3);
  }
  if (state.wormhole) {
    const hx = x + (state.wormhole.x / state.world.w) * mw;
    const hy = y + (state.wormhole.y / state.world.h) * mh;
    gfx.fillStyle(state.wormhole.locked ? 0xc5ced6 : 0xd2b4ff, 1);
    gfx.fillCircle(hx, hy, 4);
  }
  if (state.returnHole) {
    const rx = x + (state.returnHole.x / state.world.w) * mw;
    const ry = y + (state.returnHole.y / state.world.h) * mh;
    gfx.fillStyle(0x7ee7ff, 1);
    gfx.fillRect(rx - 2, ry - 2, 4, 4);
  }
  const sx = x + (state.ship.x / state.world.w) * mw;
  const sy = y + (state.ship.y / state.world.h) * mh;
  gfx.fillStyle(0xf4fbff, 1);
  gfx.fillCircle(sx, sy, 3.5);
}
