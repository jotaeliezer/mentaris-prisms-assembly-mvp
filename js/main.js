import { loadFoundationSprites } from "./assets.js";
import { createAudio } from "./audio.js";
import { createInput } from "./input.js";
import { drawFrame, resizeCanvas } from "./render.js";
import { clamp, len, makeRng, rand, wrapAngle } from "./util.js";

const WORLD = { w: 2400, h: 1600 };
const SHIP_RADIUS = 28;

const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");
const titleEl = document.getElementById("title");
const pauseEl = document.getElementById("pause");
const hudEl = document.getElementById("hud");
const loadNote = document.getElementById("load-note");
const speedValue = document.getElementById("speed-value");
const muteBtn = document.getElementById("mute");

const input = createInput(canvas);
const audio = createAudio();
let view = resizeCanvas(canvas);
let sprites = null;
let last = performance.now();

const state = createState();

window.addEventListener("resize", () => {
  view = resizeCanvas(canvas);
});

document.getElementById("launch").addEventListener("click", launch);
document.getElementById("resume").addEventListener("click", () => setPaused(false));
muteBtn.addEventListener("click", () => {
  const muted = audio.toggle();
  muteBtn.textContent = muted ? "Sound off" : "Sound on";
});

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (event.code === "Enter" && state.mode === "title") launch();
  if (event.code === "KeyP" && state.mode !== "title") setPaused(state.mode !== "paused");
  if (event.code === "KeyM") {
    const muted = audio.toggle();
    muteBtn.textContent = muted ? "Sound off" : "Sound on";
  }
});

loadFoundationSprites()
  .then((loaded) => {
    sprites = loaded;
    state.ship.sprite = loaded.shipName;
    loadNote.hidden = true;
    requestAnimationFrame(frame);
  })
  .catch((error) => {
    loadNote.textContent = error.message;
  });

function createState() {
  const rng = makeRng("phase1-sector");
  const stars = [];
  for (let i = 0; i < 140; i++) {
    const layer = i % 3;
    stars.push({
      x: rand(rng, 0, 1600),
      y: rand(rng, 0, 900),
      parallax: layer === 0 ? 0.15 : layer === 1 ? 0.4 : 0.72,
      size: layer === 2 ? 2 : 1,
      a: layer === 0 ? 0.35 : layer === 1 ? 0.7 : 0.95,
      color: i % 11 === 0 ? "#ffd7a1" : "#d7f4ff",
    });
  }
  const asteroids = [
    { x: 780, y: 560, sprite: 0, size: 150, rot: 0.2, spin: 0.15 },
    { x: 1680, y: 520, sprite: 1, size: 170, rot: 1.1, spin: -0.1 },
    { x: 700, y: 1080, sprite: 2, size: 190, rot: 0.4, spin: 0.08 },
    { x: 1760, y: 1100, sprite: 3, size: 140, rot: 2.1, spin: 0.18 },
    { x: 1240, y: 980, sprite: 4, size: 120, rot: 0.8, spin: -0.14 },
  ].map((rock) => ({ ...rock, radius: rock.size * 0.34 }));

  return {
    mode: "title",
    world: WORLD,
    stars,
    nebula: [
      { x: 700, y: 500, r: 340, color: "rgba(92, 70, 160, 0.22)" },
      { x: 1680, y: 980, r: 420, color: "rgba(30, 110, 140, 0.18)" },
    ],
    asteroids,
    ship: {
      x: WORLD.w / 2,
      y: WORLD.h / 2,
      vx: 0,
      vy: 0,
      aim: -Math.PI / 2,
      sprite: "AM3 Scout.png",
      thrusting: false,
      thrust: 0,
    },
    camera: { x: WORLD.w / 2, y: WORLD.h / 2 },
  };
}

function launch() {
  if (!sprites || state.mode === "fly") return;
  audio.unlock();
  audio.launch();
  state.mode = "fly";
  titleEl.hidden = true;
  pauseEl.hidden = true;
  hudEl.hidden = false;
}

function setPaused(paused) {
  if (paused) {
    state.mode = "paused";
    pauseEl.hidden = false;
  } else {
    state.mode = "fly";
    pauseEl.hidden = true;
  }
}

function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (state.mode === "fly") update(dt);
  else idle(dt);
  drawFrame(ctx, view, state, sprites);
  const speed = Math.round(len(state.ship.vx, state.ship.vy));
  speedValue.textContent = String(speed);
  requestAnimationFrame(frame);
}

function idle(dt) {
  state.ship.aim += dt * 0.15;
  for (const rock of state.asteroids) rock.rot += rock.spin * dt;
  easeCamera(dt);
}

function update(dt) {
  const ship = state.ship;
  const mouseWorld = screenToWorld(input.mouse.x, input.mouse.y);
  const desired = Math.atan2(mouseWorld.y - ship.y, mouseWorld.x - ship.x);
  ship.aim += clamp(wrapAngle(desired - ship.aim), -6.5 * dt, 6.5 * dt);

  let thrust = 0;
  if (input.thrust() || (input.mouse.touch && input.mouse.held)) thrust = 1;
  const brake = input.brake();
  const strafe = input.strafe();
  ship.thrusting = thrust > 0 && !brake;
  ship.thrust = thrust;

  const accel = 520;
  if (thrust && !brake) {
    ship.vx += Math.cos(ship.aim) * accel * dt;
    ship.vy += Math.sin(ship.aim) * accel * dt;
  }
  if (strafe) {
    ship.vx += Math.cos(ship.aim + Math.PI / 2) * strafe * 360 * dt;
    ship.vy += Math.sin(ship.aim + Math.PI / 2) * strafe * 360 * dt;
  }
  const drag = brake ? 3.4 : 0.85;
  ship.vx -= ship.vx * drag * dt;
  ship.vy -= ship.vy * drag * dt;
  const speed = len(ship.vx, ship.vy);
  const maxSpeed = 430;
  if (speed > maxSpeed) {
    ship.vx = (ship.vx / speed) * maxSpeed;
    ship.vy = (ship.vy / speed) * maxSpeed;
  }

  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  containShip();
  separateFromRocks();

  for (const rock of state.asteroids) rock.rot += rock.spin * dt;
  easeCamera(dt);
  input.takeClicks();
}

function containShip() {
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

function separateFromRocks() {
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
    }
  }
}

function easeCamera(dt) {
  const k = 1 - Math.exp(-3.2 * dt);
  state.camera.x += (state.ship.x - state.camera.x) * k;
  state.camera.y += (state.ship.y - state.camera.y) * k;
}

function screenToWorld(x, y) {
  return {
    x: x - view.w / 2 + state.camera.x,
    y: y - view.h / 2 + state.camera.y,
  };
}
