import { loadFoundationSprites } from "./assets.js";
import { createAudio } from "./audio.js";
import { createInput } from "./input.js";
import { nextProblem, problemSpec } from "./questions.js";
import { drawFrame, resizeCanvas } from "./render.js";
import { clamp, len, makeRng, rand, wrapAngle } from "./util.js";

const WORLD = { w: 7200, h: 5200 };
const SHIP_RADIUS = 28;
const APPROACH = 340;

const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");
const titleEl = document.getElementById("title");
const pauseEl = document.getElementById("pause");
const hudEl = document.getElementById("hud");
const loadNote = document.getElementById("load-note");
const speedValue = document.getElementById("speed-value");
const solvedValue = document.getElementById("solved-value");
const questionReadout = document.getElementById("question-readout");
const bufferValue = document.getElementById("buffer-value");
const bufferEl = document.getElementById("buffer");
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

document.getElementById("launch").addEventListener("click", () => launch());
document.getElementById("resume").addEventListener("click", () => setPaused(false));
muteBtn.addEventListener("click", () => {
  const muted = audio.toggle();
  muteBtn.textContent = muted ? "Sound off" : "Sound on";
});

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (event.code === "Enter" && state.mode === "title") launch();
  if (event.code === "KeyP" && state.mode === "fly") setPaused(true);
  if (event.code === "KeyP" && state.mode === "paused") setPaused(false);
  if (event.code === "KeyM") {
    const muted = audio.toggle();
    muteBtn.textContent = muted ? "Sound off" : "Sound on";
  }
  if (state.mode !== "fly") return;
  if (event.code === "Backspace") {
    state.buffer = state.buffer.slice(0, -1);
    event.preventDefault();
    return;
  }
  if (event.code === "Escape") {
    state.buffer = "";
    state.targetId = 0;
    return;
  }
  const digit = digitFromEvent(event);
  if (digit != null) {
    event.preventDefault();
    typeChar(digit);
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
  const rng = makeRng("phase4-belt");
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
  const state = {
    mode: "title",
    world: WORLD,
    rng,
    nextId: 1,
    stars,
    nebula: [
      { x: 1600, y: 1400, r: 640, color: "rgba(92, 70, 160, 0.2)" },
      { x: 5200, y: 3600, r: 780, color: "rgba(30, 110, 140, 0.16)" },
      { x: 3800, y: 900, r: 520, color: "rgba(140, 70, 90, 0.12)" },
    ],
    asteroids: [],
    missiles: [],
    particles: [],
    buffer: "",
    solved: 0,
    wrong: 0,
    targetId: 0,
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
    clock: 0,
  };
  spawnAsteroid(state, "add", "easy", "near");
  spawnAsteroid(state, "sub", "easy", "near");
  spawnAsteroid(state, "add", "hard", "near");
  spawnAsteroid(state, "sub", "hard", "near");
  for (let i = 0; i < 22; i++) {
    spawnAsteroid(state, i % 2 ? "sub" : "add", i % 3 === 0 ? "hard" : "easy", "roam");
  }
  return state;
}

function spawnAsteroid(state, operation, difficulty, place) {
  const question = nextProblem(problemSpec(operation, difficulty || "easy"), state.rng);
  let x = state.ship.x;
  let y = state.ship.y;
  const minShip = place === "far" ? 1100 : 420;
  for (let guard = 0; guard < 40; guard++) {
    if (place === "near" || place === "mid") {
      const angle = state.rng() * Math.PI * 2;
      const dist = place === "near" ? 160 + state.rng() * 90 : 520 + state.rng() * 480;
      x = clamp(state.ship.x + Math.cos(angle) * dist, 160, WORLD.w - 160);
      y = clamp(state.ship.y + Math.sin(angle) * dist, 160, WORLD.h - 160);
    } else {
      x = 180 + state.rng() * (WORLD.w - 360);
      y = 180 + state.rng() * (WORLD.h - 360);
    }
    const shipDist = Math.hypot(x - state.ship.x, y - state.ship.y);
    const clearOfShip = place === "near"
      ? shipDist > 150 && shipDist < 270
      : place === "mid"
        ? shipDist > 500 && shipDist < 1100
        : shipDist > minShip;
    const gap = place === "near" ? 130 : 260;
    const clearOfRocks = state.asteroids.every((rock) => Math.hypot(x - rock.x, y - rock.y) > gap);
    if (clearOfShip && clearOfRocks) break;
  }
  const size = 120 + state.rng() * 70;
  state.asteroids.push({
    id: state.nextId++,
    x,
    y,
    sprite: Math.floor(state.rng() * 5),
    size,
    radius: size * 0.34,
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

function digitFromEvent(event) {
  if (/^Digit[0-9]$/.test(event.code)) return event.code.slice(5);
  if (/^Numpad[0-9]$/.test(event.code)) return event.code.slice(6);
  return null;
}

function typeChar(ch) {
  const rock = activeAsteroid();
  if (!rock) return;
  state.buffer += ch;
  const answer = rock.question.answerText;
  if (state.buffer === answer) {
    acceptAnswer(rock);
    state.buffer = "";
    return;
  }
  if (!answer.startsWith(state.buffer) || state.buffer.length > answer.length) {
    state.buffer = "";
    state.wrong = 0.35;
    audio.wrong();
  }
}

function activeAsteroid() {
  return state.asteroids.find((rock) => rock.alive && rock.id === state.targetId) || null;
}

function asteroidAt(x, y) {
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

function launchMissile(rock) {
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
  audio.shot();
}

function launch() {
  if (!sprites) return;
  audio.unlock();
  audio.launch();
  state.solved = 0;
  state.buffer = "";
  state.wrong = 0;
  state.targetId = 0;
  state.missiles = [];
  state.particles = [];
  state.asteroids = [];
  state.ship.x = WORLD.w / 2;
  state.ship.y = WORLD.h / 2;
  state.ship.vx = 0;
  state.ship.vy = 0;
  state.ship.aim = -Math.PI / 2;
  state.camera.x = state.ship.x;
  state.camera.y = state.ship.y;
  spawnAsteroid(state, "add", "easy", "near");
  spawnAsteroid(state, "sub", "easy", "near");
  spawnAsteroid(state, "add", "hard", "near");
  spawnAsteroid(state, "sub", "hard", "near");
  for (let i = 0; i < 22; i++) {
    spawnAsteroid(state, i % 2 ? "sub" : "add", i % 3 === 0 ? "hard" : "easy", "roam");
  }
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
  solvedValue.textContent = String(state.solved);
  const active = activeAsteroid();
  const near = state.asteroids.some((rock) => rock.near);
  if (active) {
    const stars = active.difficulty === "hard" ? "★★★  " : "★  ";
    questionReadout.textContent = stars + active.question.prompt;
  } else if (near) {
    questionReadout.textContent = "One star is easier. Three stars are harder. Click to see the question.";
  } else {
    questionReadout.textContent = "Roam the belt. Nothing is timed.";
  }
  const hover = screenToWorld(input.mouse.x, input.mouse.y);
  canvas.style.cursor = asteroidAt(hover.x, hover.y) ? "pointer" : "crosshair";
  bufferValue.textContent = state.buffer;
  bufferEl.classList.toggle("bad", state.wrong > 0);
  requestAnimationFrame(frame);
}

function idle(dt) {
  state.clock += dt;
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

  for (const rock of state.asteroids) {
    rock.rot += rock.spin * dt;
    rock.x += Math.cos(rock.drift) * 12 * dt;
    rock.y += Math.sin(rock.drift) * 12 * dt;
    if (rock.x < 100 || rock.x > WORLD.w - 100) rock.drift = Math.PI - rock.drift;
    if (rock.y < 100 || rock.y > WORLD.h - 100) rock.drift = -rock.drift;
    rock.active = false;
    rock.near = false;
  }
  const nearest = nearestAsteroid(APPROACH);
  if (nearest) nearest.near = true;
  const target = activeAsteroid();
  if (!target) {
    state.targetId = 0;
    state.buffer = "";
  } else {
    target.active = true;
  }
  handleClicks();
  for (const rock of state.asteroids) {
    if (rock.dying == null) continue;
    rock.dying -= dt;
    if (rock.dying <= 0) destroyAsteroid(rock);
  }
  updateMissiles(dt);
  updateParticles(dt);
  if (state.wrong > 0) state.wrong -= dt;
  state.clock += dt;
  easeCamera(dt);
}

function nearestAsteroid(maxDist) {
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

function handleClicks() {
  if (state.mode !== "fly") {
    input.takeClicks();
    return;
  }
  for (const click of input.takeClicks()) {
    const world = screenToWorld(click.x, click.y);
    const hit = asteroidAt(world.x, world.y);
    if (!hit) continue;
    if (hit.id !== state.targetId) state.buffer = "";
    state.targetId = hit.id;
    audio.lock();
  }
}

function updateMissiles(dt) {
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
      color: "#b9f3ff",
    });
    if (missile.age > 2.2) {
      missile.x = rock.x;
      missile.y = rock.y;
    }
    if (dist < rock.radius + 28 || missile.age > 2.2) {
      missile.life = 0;
      destroyAsteroid(rock);
    }
  }
  state.missiles = state.missiles.filter((missile) => missile.life > 0);
}

function acceptAnswer(rock) {
  if (!rock || !rock.alive || rock.dying != null) return;
  rock.dying = 0.7;
  if (state.targetId === rock.id) state.targetId = 0;
  state.solved += 1;
  audio.correct();
  launchMissile(rock);
}

function destroyAsteroid(rock) {
  if (!rock.alive) return;
  if (rock.dying == null) acceptAnswer(rock);
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
      color: i % 3 === 0 ? "#ffb15a" : "#d7f6ff",
    });
  }
  state.asteroids = state.asteroids.filter((item) => item.alive);
  const operation = state.rng() < 0.5 ? "add" : "sub";
  const difficulty = state.rng() < 0.65 ? "easy" : "hard";
  spawnAsteroid(state, operation, difficulty, "far");
}

function updateParticles(dt) {
  for (const bit of state.particles) {
    bit.x += bit.vx * dt;
    bit.y += bit.vy * dt;
    bit.life -= dt;
  }
  state.particles = state.particles.filter((bit) => bit.life > 0);
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
