import { len } from "./util.js";

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
  beginWorld(ctx, state.camera, dpr, w, h);
  drawNebula(ctx, state.nebula);
  drawBoundary(ctx, state.world);
  for (const rock of state.asteroids) drawAsteroid(ctx, rock, sprites);
  drawAimArc(ctx, state);
  for (const missile of state.missiles) drawMissile(ctx, missile);
  drawParticles(ctx, state.particles);
  drawShip(ctx, state, sprites);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawVignette(ctx, w, h);
}

function beginWorld(ctx, camera, dpr, w, h) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.translate(w / 2 - camera.x, h / 2 - camera.y);
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

function drawAsteroid(ctx, rock, sprites) {
  const img = sprites.asteroids[rock.sprite];
  if (!img || rock.alive === false) return;
  const width = rock.size;
  const height = width * (img.height / img.width);
  ctx.save();
  ctx.translate(rock.x, rock.y);
  if (rock.active || rock.near) {
    ctx.strokeStyle = rock.active ? "rgba(126, 231, 255, 0.95)" : "rgba(126, 231, 255, 0.35)";
    ctx.lineWidth = rock.active ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, rock.radius + (rock.active ? 18 : 12), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.rotate(rock.rot);
  ctx.drawImage(img, -width / 2, -height / 2, width, height);
  ctx.restore();
  if (rock.active && rock.question) drawQuestionPlate(ctx, rock);
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
  ctx.save();
  ctx.translate(ship.x, ship.y);
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

  const speed = len(ship.vx, ship.vy);
  if (speed > 8) {
    ctx.strokeStyle = "rgba(223, 247, 255, 0.25)";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, 54, ship.aim - 0.5, ship.aim + 0.5);
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

function mod(n, m) {
  return ((n % m) + m) % m;
}
