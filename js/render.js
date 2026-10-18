import { clamp, len } from "./util.js";

export function resizeCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.max(1, Math.floor(w * dpr));
  canvas.height = Math.max(1, Math.floor(h * dpr));
  return { dpr, w, h };
}

export function drawFrame(ctx, view, state, sprites) {
  const { dpr, w, h } = view;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#10243a");
  sky.addColorStop(0.45, "#071422");
  sky.addColorStop(1, "#04070d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  drawStars(ctx, state.stars, state.camera, w, h);
  beginWorld(ctx, state, dpr, w, h);
  drawNebula(ctx, state.nebula);
  drawBoundary(ctx, state.world);
  drawLayerAsteroids(ctx, state, sprites);
  if (state.returnHole) drawGate(ctx, state, state.returnHole, "RETURN", false);
  if (state.wormhole) drawGate(ctx, state, state.wormhole, state.wormhole.locked ? "LOCKED" : "WORMHOLE", state.wormhole.locked);
  drawAimArc(ctx, state);
  for (const missile of state.missiles) drawMissile(ctx, missile);
  drawDrops(ctx, state.drops, sprites);
  drawParticles(ctx, state.particles);
  drawShip(ctx, state, sprites);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawVignette(ctx, w, h);
  drawBeacon(ctx, state, w, h, state.wormhole, state.wormhole && state.wormhole.locked ? "rgba(200, 206, 214, 0.85)" : "rgba(188, 140, 255, 0.95)");
  if (state.returnHole) drawBeacon(ctx, state, w, h, state.returnHole, "rgba(126, 231, 255, 0.95)");
  drawTransition(ctx, state, w, h);
  drawMinimap(ctx, state, w, h);
}

function beginWorld(ctx, state, dpr, w, h) {
  const camera = state.camera;
  let scaleX = 1;
  let scaleY = 1;
  let shift = 0;
  if (state.transition) {
    const p = state.transition.t / state.transition.dur;
    const bend = Math.sin(Math.PI * Math.min(1, p));
    const dir = state.transition.dir || 1;
    const layer = state.transition.kind === "layer";
    // Soften world squash during layer zooms so rock scale stays readable.
    scaleX = 1 - bend * (layer ? 0.06 : 0.14);
    scaleY = 1 - bend * (layer ? 0.18 : 0.46);
    shift = bend * (layer ? 36 : 80) * dir;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.translate(w / 2, h / 2 + shift);
  ctx.scale(scaleX, scaleY);
  ctx.translate(-camera.x, -camera.y);
}

const LAYER_SWAP = 0.45;

function layerTransitionFx(state) {
  const tr = state.transition;
  if (!tr || tr.kind !== "layer") return null;
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

function drawLayerAsteroids(ctx, state, sprites) {
  const fx = layerTransitionFx(state);
  if (!fx) {
    for (const rock of state.asteroids) drawAsteroid(ctx, rock, sprites);
    return;
  }
  const leaveRocks = fx.swapped && state.transition.prevAsteroids
    ? state.transition.prevAsteroids
    : state.asteroids;
  if (fx.leave.alpha > 0.01) {
    for (const rock of leaveRocks) drawAsteroid(ctx, rock, sprites, fx.leave);
  }
  if (fx.swapped && fx.enter.alpha > 0.01) {
    for (const rock of state.asteroids) drawAsteroid(ctx, rock, sprites, fx.enter);
  }
}

function drawStars(ctx, stars, camera, w, h) {
  for (const star of stars) {
    const sx = mod(star.x - camera.x * star.parallax, w + 40) - 20;
    const sy = mod(star.y - camera.y * star.parallax, h + 40) - 20;
    ctx.globalAlpha = star.a;
    ctx.fillStyle = star.color;
    ctx.fillRect(sx, sy, star.size, star.size);
  }
  ctx.globalAlpha = 1;
}

function drawNebula(ctx, blobs) {
  for (const blob of blobs) {
    const g = ctx.createRadialGradient(blob.x, blob.y, 10, blob.x, blob.y, blob.r);
    g.addColorStop(0, blob.color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(blob.x, blob.y, blob.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBoundary(ctx, world) {
  ctx.save();
  ctx.strokeStyle = "rgba(126, 231, 255, 0.28)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 14]);
  ctx.strokeRect(8, 8, world.w - 16, world.h - 16);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(126, 231, 255, 0.55)";
  const corners = [
    [28, 28],
    [world.w - 28, 28],
    [28, world.h - 28],
    [world.w - 28, world.h - 28],
  ];
  for (const [x, y] of corners) {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawAsteroid(ctx, rock, sprites, fx) {
  const img = sprites.asteroids[rock.sprite];
  if (!img || rock.alive === false) return;
  const width = rock.size;
  const height = width * (img.height / img.width);
  const scale = fx && fx.scale != null ? fx.scale : 1;
  const alpha = fx && fx.alpha != null ? fx.alpha : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(rock.x, rock.y);
  ctx.scale(scale, scale);
  if (rock.active || rock.near) {
    const hard = rock.difficulty === "hard";
    ctx.strokeStyle = hard ? "rgba(255, 177, 90, 0.9)" : "rgba(141, 255, 176, 0.88)";
    ctx.lineWidth = rock.active ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, rock.radius + (rock.active ? 18 : 12), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.rotate(rock.rot);
  ctx.drawImage(img, -width / 2, -height / 2, width, height);
  ctx.restore();
  if (alpha < 0.2) return;
  if ((rock.near || rock.active) && rock.question) drawDifficulty(ctx, rock);
  if (rock.active && rock.question) drawQuestionPlate(ctx, rock);
}

function drawDifficulty(ctx, rock) {
  const hard = rock.difficulty === "hard";
  const stars = hard ? "★★★" : "★";
  ctx.save();
  ctx.font = "700 18px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = hard ? "#ffb15a" : "#8dffb0";
  ctx.fillText(stars, rock.x, rock.y - rock.radius - (rock.active ? 62 : 28));
  ctx.restore();
}

function drawQuestionPlate(ctx, rock) {
  const label = rock.question.prompt;
  ctx.save();
  ctx.translate(rock.x, rock.y - rock.radius - 36);
  ctx.font = "700 22px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const width = ctx.measureText(label).width + 28;
  ctx.fillStyle = "rgba(5, 14, 24, 0.9)";
  ctx.strokeStyle = rock.question.operation === "sub" ? "rgba(255, 177, 90, 0.8)" : "rgba(126, 231, 255, 0.85)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, -width / 2, -18, width, 36, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#e7f6ff";
  ctx.fillText(label, 0, 1);
  ctx.restore();
}

function drawAimArc(ctx, state) {
  const rock = state.asteroids.find((item) => item.alive && item.id === state.targetId);
  if (!rock) return;
  const ship = state.ship;
  const x0 = ship.x;
  const y0 = ship.y;
  const x1 = rock.x;
  const y1 = rock.y;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = -dy / dist;
  const ny = dx / dist;
  const facing = nx * Math.cos(ship.aim) + ny * Math.sin(ship.aim);
  const side = facing >= 0 ? 1 : -1;
  const cx = (x0 + x1) / 2 + nx * dist * 0.28 * side;
  const cy = (y0 + y1) / 2 + ny * dist * 0.28 * side;
  ctx.save();
  ctx.strokeStyle = "rgba(126, 231, 255, 0.45)";
  ctx.setLineDash([5, 8]);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1);
  ctx.stroke();
  ctx.restore();
}

function drawMissile(ctx, missile) {
  ctx.save();
  ctx.translate(missile.x, missile.y);
  ctx.rotate(Math.atan2(missile.vy, missile.vx));
  ctx.fillStyle = "#f4fbff";
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-8, 5);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-8, -5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(126, 231, 255, 0.45)";
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(-22, 0);
  ctx.stroke();
  ctx.restore();
}

function drawDrops(ctx, drops, sprites) {
  if (!drops) return;
  const img = sprites && sprites.mineral;
  for (const drop of drops) {
    const fade = Math.max(0, drop.life / drop.maxLife);
    const blink = drop.life < 4 ? 0.45 + 0.55 * Math.abs(Math.sin(drop.life * 8)) : 1;
    ctx.save();
    ctx.globalAlpha = fade * blink;
    ctx.translate(drop.x, drop.y);
    if (img) {
      const size = 28 + Math.min(drop.amount, 8) * 3;
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = "#ffd27a";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffe7b0";
    ctx.font = "700 13px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(drop.amount), 0, -22);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawParticles(ctx, particles) {
  for (const bit of particles) {
    ctx.globalAlpha = Math.max(0, bit.life);
    ctx.fillStyle = bit.color;
    ctx.fillRect(bit.x, bit.y, bit.size, bit.size);
  }
  ctx.globalAlpha = 1;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawShip(ctx, state, sprites) {
  const ship = state.ship;
  const img = sprites.ships[ship.sprite];
  const layerFx = layerTransitionFx(state);
  const shipScale = layerFx ? layerFx.shipScale : 1;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.scale(shipScale, shipScale);
  ctx.rotate(ship.aim + Math.PI / 2);
  if (ship.thrusting) drawFlame(ctx, ship);
  if (img) {
    const width = 92;
    const height = width * (img.height / img.width);
    ctx.drawImage(img, -width / 2, -height / 2, width, height);
  } else {
    ctx.fillStyle = "#9be7ff";
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(16, 22);
    ctx.lineTo(0, 12);
    ctx.lineTo(-16, 22);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const hpRatio = ship.maxHp ? ship.hp / ship.maxHp : 1;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.scale(shipScale, shipScale);
  ctx.strokeStyle = state.hurt > 0 ? "rgba(255, 120, 96, 0.95)" : "rgba(141, 255, 176, 0.7)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 40, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpRatio);
  ctx.stroke();
  ctx.restore();

  const speed = len(ship.vx, ship.vy);
  if (speed > 8) {
    ctx.strokeStyle = "rgba(223, 247, 255, 0.25)";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, 54 * shipScale, ship.aim - 0.5, ship.aim + 0.5);
    ctx.stroke();
  }
}

function drawFlame(ctx, ship) {
  const flicker = 0.75 + Math.random() * 0.4;
  const length = 26 + ship.thrust * 18;
  const grad = ctx.createLinearGradient(0, 18, 0, 18 + length);
  grad.addColorStop(0, "rgba(255, 244, 214, 0.95)");
  grad.addColorStop(0.45, "rgba(126, 231, 255, 0.8)");
  grad.addColorStop(1, "rgba(126, 231, 255, 0)");
  ctx.fillStyle = grad;
  ctx.globalAlpha = flicker;
  ctx.beginPath();
  ctx.moveTo(-7, 20);
  ctx.lineTo(0, 20 + length);
  ctx.lineTo(7, 20);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawGate(ctx, state, hole, label, locked) {
  ctx.save();
  ctx.translate(hole.x, hole.y);
  ctx.rotate(state.clock * (locked ? 0.35 : 1.1));
  ctx.strokeStyle = locked ? "rgba(168, 176, 186, 0.75)" : label === "RETURN" ? "rgba(126, 231, 255, 0.95)" : "rgba(188, 140, 255, 0.95)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 28 + i * 16, 12 + i * 7, i * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.translate(hole.x, hole.y - 78);
  ctx.font = "700 14px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = locked ? "#c5ced6" : label === "RETURN" ? "#d7f6ff" : "#e6d4ff";
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

function drawBeacon(ctx, state, w, h, hole, color) {
  if (!hole || state.mode === "title") return;
  const dx = hole.x - state.camera.x;
  const dy = hole.y - state.camera.y;
  const dist = Math.hypot(dx, dy);
  if (dist < Math.min(w, h) * 0.42) return;
  const ang = Math.atan2(dy, dx);
  const cx = clamp(w / 2 + Math.cos(ang) * (w * 0.42), 36, w - 36);
  const cy = clamp(h / 2 + Math.sin(ang) * (h * 0.36), 80, h - 80);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-8, 7);
  ctx.lineTo(-8, -7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTransition(ctx, state, w, h) {
  if (!state.transition) return;
  const p = Math.min(1, state.transition.t / state.transition.dur);
  const band = Math.sin(Math.PI * p);
  const dir = state.transition.dir || 1;
  ctx.save();
  ctx.fillStyle = dir > 0
    ? "rgba(126, 231, 255, " + (0.28 * band) + ")"
    : "rgba(255, 177, 90, " + (0.28 * band) + ")";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(244, 251, 255, " + (0.35 * band) + ")";
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const y = ((i / 9 + p * dir) % 1 + 1) % 1 * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y - dir * 36);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMinimap(ctx, state, w, h) {
  const mw = 176;
  const mh = 120;
  const x = w - mw - 16;
  const y = h - mh - 58;
  ctx.fillStyle = "rgba(5, 14, 24, 0.78)";
  ctx.strokeStyle = "rgba(126, 231, 255, 0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(x, y, mw, mh);
  ctx.fill();
  ctx.stroke();
  for (const rock of state.asteroids) {
    if (!rock.alive) continue;
    const px = x + (rock.x / state.world.w) * mw;
    const py = y + (rock.y / state.world.h) * mh;
    ctx.fillStyle = rock.difficulty === "hard" ? "#ffb15a" : "#8dffb0";
    ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
  }
  if (state.wormhole) {
    const hx = x + (state.wormhole.x / state.world.w) * mw;
    const hy = y + (state.wormhole.y / state.world.h) * mh;
    ctx.fillStyle = state.wormhole.locked ? "#c5ced6" : "#d2b4ff";
    ctx.beginPath();
    ctx.arc(hx, hy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.returnHole) {
    const rx = x + (state.returnHole.x / state.world.w) * mw;
    const ry = y + (state.returnHole.y / state.world.h) * mh;
    ctx.fillStyle = "#7ee7ff";
    ctx.fillRect(rx - 2, ry - 2, 4, 4);
  }
  const sx = x + (state.ship.x / state.world.w) * mw;
  const sy = y + (state.ship.y / state.world.h) * mh;
  ctx.fillStyle = "#f4fbff";
  ctx.beginPath();
  ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

function mod(n, m) {
  return ((n % m) + m) % m;
}
