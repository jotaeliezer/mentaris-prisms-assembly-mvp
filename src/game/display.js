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
export function syncStars(gfx, stars, camera, w, h, fade = 1) {
  gfx.clear();
  if (!stars || !camera || fade <= 0.01) return;
  for (const star of stars) {
    const sx = mod(star.x - camera.x * star.parallax, w + 40) - 20;
    const sy = mod(star.y - camera.y * star.parallax, h + 40) - 20;
    gfx.fillStyle(parseColor(star.color), star.a * fade);
    gfx.fillRect(sx, sy, star.size, star.size);
  }
}

/** Hull art whose rear exhaust is a pair, not a single center plume. */
const TWIN_THRUSTERS = new Set([
  'Azure Lancer.png',
  'BU2X.png',
  'Crimson MK-7.png',
  'Cyan Vector 7.png',
  'D.A.T. Sawze.png',
  'Mantas - Arc 5 (1).png',
  'Mantas - Arc 5.png',
  'Ruby Strike.png',
  'Scarlet Classic.png',
  'VER-DE-9.png',
  'Veloz Mas.png',
  'White Flame 8.png',
]);

function plume(gfx, x, y, wag, length, burn, flick, spread) {
  gfx.fillStyle(0x7ee7ff, 0.22 * burn);
  gfx.fillTriangle(x - 16 * spread, y, x + wag, y + 2 + length * 1.15, x + 16 * spread, y);
  gfx.fillStyle(0x5fd8ff, 0.55 * flick);
  gfx.fillTriangle(x - 9 * spread, y + 2, x + wag * 0.6, y + 2 + length, x + 9 * spread, y + 2);
  gfx.fillStyle(0xbff6ff, 0.9);
  gfx.fillTriangle(x - 4.5 * spread, y, x + wag * 0.3, y + length * 0.72, x + 4.5 * spread, y);
  gfx.fillStyle(0xfff8e4, 0.95);
  gfx.fillTriangle(x - 2 * spread, y - 2, x, y - 2 + length * 0.38, x + 2 * spread, y - 2);
}

/**
 * Thruster flame in ship-local space — matches legacy js/render.js drawFlame.
 * Sets gfx position/rotation/scale to the ship; call near ship draw.
 * Local +Y is the tail. Twin-exhaust hulls get a flame on each nozzle.
 */
export function syncFlame(gfx, ship, shipScale = 1, time = 0) {
  gfx.clear();
  const burn = ship && ship.thrust ? ship.thrust : 0;
  if (!ship || burn < 0.04) {
    gfx.setVisible(false);
    return;
  }
  const posed = recoilOffset(ship);
  gfx.setVisible(true);
  gfx.setPosition(posed.x, posed.y);
  gfx.setRotation(ship.aim + Math.PI / 2);
  gfx.setScale(shipScale);

  const flick = 0.86 + Math.sin(time * 46) * 0.08 + Math.sin(time * 17) * 0.05;
  const twin = TWIN_THRUSTERS.has(ship.sprite);
  if (twin) {
    const length = (16 + burn * 40) * flick;
    for (const side of [-1, 1]) {
      const wag = Math.sin(time * 28 + side) * 2.2 * burn;
      plume(gfx, side * 16, 22, wag, length, burn, flick, 0.62);
    }
    return;
  }
  const wag = Math.sin(time * 28) * 3.5 * burn;
  const length = (22 + burn * 54) * flick;
  plume(gfx, 0, 16, wag, length, burn, flick, 1);
}

/**
 * Two small flames on the wing leading edges, pointing forward, while reversing.
 * Local +Y is the tail, so these shoot toward -Y.
 */
export function syncReverse(gfx, ship, shipScale = 1, time = 0) {
  gfx.clear();
  const burn = ship && ship.reverse ? ship.reverse : 0;
  if (!ship || burn < 0.04) {
    gfx.setVisible(false);
    return;
  }
  const posed = recoilOffset(ship);
  gfx.setVisible(true);
  gfx.setPosition(posed.x, posed.y);
  gfx.setRotation(ship.aim + Math.PI / 2);
  gfx.setScale(shipScale);
  const flick = 0.84 + Math.sin(time * 40) * 0.1;
  const length = (7 + burn * 16) * flick;
  for (const side of [-1, 1]) {
    const wag = Math.sin(time * 34 + side) * 1.4 * burn;
    const x = side * 18;
    const y = -12;
    const tip = y - length;
    gfx.fillStyle(0xff9a3c, 0.28 * burn);
    gfx.fillTriangle(x - 4.5, y, x + wag, tip - 2, x + 4.5, y);
    gfx.fillStyle(0xffd27a, 0.7 * flick);
    gfx.fillTriangle(x - 2.4, y + 1, x + wag * 0.4, tip, x + 2.4, y + 1);
    gfx.fillStyle(0xfff6df, 0.95);
    gfx.fillTriangle(x - 1.1, y + 1, x, y - length * 0.45, x + 1.1, y + 1);
  }
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
  const zoom = state.viewZoom || 1;
  cam.zoomX = scaleX * zoom;
  cam.zoomY = scaleY * zoom;
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

/**
 * Pin a world sprite to a whole screen pixel after the camera scroll is final.
 * Phaser draws at (world - scroll) * zoom, so a fractional phase makes scaled art crawl.
 * Rewrites only this sprite's draw position; gameplay coordinates stay unchanged.
 */
export function snapSpriteToScreenPixel(sprite, cam) {
  if (!sprite || !cam) return;
  const zoomX = cam.zoomX || 1;
  const zoomY = cam.zoomY || 1;
  const phaseX = (sprite.x - cam.scrollX) * zoomX;
  const phaseY = (sprite.y - cam.scrollY) * zoomY;
  sprite.x = Math.round(phaseX) / zoomX + cam.scrollX;
  sprite.y = Math.round(phaseY) / zoomY + cam.scrollY;
}

/** Backward kick, in pixels, matching Arith Belt: recoil 1 shifts about 8px and falls off at 9 per second. */
export function recoilOffset(ship) {
  const kick = Math.max(0, ship && ship.recoil ? ship.recoil : 0) * 8.05;
  if (!ship || kick < 0.05) return { x: ship ? ship.x : 0, y: ship ? ship.y : 0 };
  return {
    x: ship.x - Math.cos(ship.aim) * kick,
    y: ship.y - Math.sin(ship.aim) * kick,
  };
}
export function syncParticles(gfx, particles) {
  gfx.clear();
  for (const bit of particles) {
    if (bit.life <= 0) continue;
    const color =
      typeof bit.color === 'number'
        ? bit.color
        : parseInt(String(bit.color).replace('#', ''), 16) || 0xd7f6ff;
    if (bit.a != null) {
      gfx.fillStyle(color, Math.max(0, Math.min(1, bit.a)));
      gfx.fillCircle(bit.x, bit.y, Math.max(0.8, bit.size));
    } else {
      gfx.fillStyle(color, Math.max(0, Math.min(1, bit.life)));
      gfx.fillRect(bit.x, bit.y, bit.size, bit.size);
    }
  }
}

/** Circles are no longer drawn. The targeted rock is outlined on its sprite. */
export function syncAimArc(gfx) {
  gfx.clear();
}

export function syncGates(gfx, state, pictures) {
  gfx.clear();
  const shown = pictures || {};
  if (state.returnHole && !shown.back) drawGate(gfx, state, state.returnHole, false, true);
  if (state.wormhole && !shown.cluster) drawGate(gfx, state, state.wormhole, !!state.wormhole.locked, false);
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
  const cue = state.relayCue;
  if (cue && state.clock < cue.until) drawBeacon(gfx, state, w, h, cue, 0xffe27a);
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
/**
 * The closed hotbar is a quarter ring pinned to the bottom-right corner. Its
 * slots reach 358px in from the right edge (closedCenter 194 + closedRadius 172
 * + half a slot at its selected scale), and that reach does not change with the
 * viewport. The map sits clear of it, and high enough to clear the hint line
 * that runs along the bottom middle.
 */
const HOTBAR_REACH = 358;
const MAP_GAP = 24;
/** The bottom strip the hull panel keeps, plus the hint line riding above it. */
const HINT_BAND = 200;

export function syncMinimap(gfx, state, w, h) {
  gfx.clear();
  if (!state.mapUnlocked) return;
  const mw = 176;
  const mh = 120;
  const beside = w - mw - HOTBAR_REACH - MAP_GAP;
  // A phone has no room along the bottom for the ring, the hint and the map at
  // once, so there the map goes to the top left, under the hull readout.
  const roomBeside = beside >= 16;
  const x = roomBeside ? beside : 16;
  const y = roomBeside ? Math.max(16, h - mh - HINT_BAND) : 56;
  gfx.fillStyle(0x050e18, 0.78);
  gfx.fillRect(x, y, mw, mh);
  gfx.lineStyle(1, 0x7ee7ff, 0.4);
  gfx.strokeRect(x, y, mw, mh);
  for (const rock of state.asteroids) {
    if (!rock.alive) continue;
    const px = x + (rock.x / state.world.w) * mw;
    const py = y + (rock.y / state.world.h) * mh;
    const rank = Number.isFinite(rock.rank) ? rock.rank : rock.difficulty === 'hard' ? 3 : 1;
    gfx.fillStyle(rank >= 3 ? 0xffb15a : 0x8dffb0, 1);
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
