import {
  LAYER_COUNT,
  LAYER_MAX,
  LAYER_MIN,
  SHIP_SPAWN_PAD,
  WORLD,
  createState,
} from '../src/game/state.js';
import { addItem } from '../src/game/items.js';
import { buildHudFields, changeLayer, startMission, updateFly, updateTransition } from '../src/game/systems.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function finishShift(state) {
  updateTransition(state, 1);
  assert(!state.transition, 'transition should finish');
  assert(state.mode === 'fly', 'flight should resume');
}

function stubInput() {
  return {
    mouse: { x: 0, y: 0, worldX: 0, worldY: 0, touch: false, held: false },
    thrust: () => false,
    brake: () => false,
    strafe: () => 0,
    takeClicks: () => [],
  };
}

function insideBelt(x, y) {
  return (
    x >= SHIP_SPAWN_PAD &&
    y >= SHIP_SPAWN_PAD &&
    x <= WORLD.w - SHIP_SPAWN_PAD &&
    y <= WORLD.h - SHIP_SPAWN_PAD
  );
}

function snapshotField(state) {
  return {
    x: state.ship.x,
    y: state.ship.y,
    homeX: state.home.x,
    homeY: state.home.y,
    rocks: state.asteroids.map((rock) => [rock.x, rock.y, rock.question.prompt]),
  };
}

assert(LAYER_MIN === -250 && LAYER_MAX === 250, 'layer ends');
assert(LAYER_COUNT === 501, 'inclusive count includes layer 0');

const title = createState();
assert(title.layer === 0, 'title starts on layer 0');
assert(insideBelt(title.ship.x, title.ship.y), 'title ship stays inside the edge inset');
assert(
  title.home.x === title.ship.x && title.home.y === title.ship.y,
  'title home follows the ship',
);
assert(
  title.camera.x === title.ship.x && title.camera.y === title.ship.y,
  'title camera follows the ship',
);
const titleNear = title.asteroids.filter(
  (rock) => Math.hypot(rock.x - title.ship.x, rock.y - title.ship.y) < 300,
);
assert(titleNear.length >= 3, 'title rocks still gather near the ship');

const first = createState();
startMission(first, 'add', 'belt-7', null);
const second = createState();
startMission(second, 'add', 'belt-7', null);
const other = createState();
startMission(other, 'add', 'prism-seed', null);

assert(first.layer === 0, 'mission starts on layer 0');
assert(buildHudFields(first).mission.includes('L0'), 'hud shows layer 0, not a 1-based index');
assert(!buildHudFields(first).mission.includes('L1/50'), 'old layer label is gone');
assert(insideBelt(first.ship.x, first.ship.y), 'mission ship stays inside the edge inset');
assert(first.home.x === first.ship.x && first.home.y === first.ship.y, 'home follows the ship');
assert(
  JSON.stringify(snapshotField(first)) === JSON.stringify(snapshotField(second)),
  'the same seed rebuilds the same ship and rocks',
);
assert(
  first.ship.x !== other.ship.x || first.ship.y !== other.ship.y,
  'a different seed picks a different ship spot',
);

let nearMissions = 0;
for (let n = 0; n < 40; n++) {
  const state = createState();
  startMission(state, n % 2 ? 'sub' : 'add', 'seed-' + n, null);
  assert(insideBelt(state.ship.x, state.ship.y), 'seeded ship inset ' + n);
  const near = state.asteroids.filter(
    (rock) => Math.hypot(rock.x - state.ship.x, rock.y - state.ship.y) < 320,
  ).length;
  if (near >= 3) nearMissions += 1;
  if (state.wormhole) {
    assert(
      state.wormhole.x >= 500 &&
        state.wormhole.y >= 500 &&
        state.wormhole.x <= WORLD.w - 500 &&
        state.wormhole.y <= WORLD.h - 500,
      'wormhole keeps its own edge inset',
    );
  }
}
assert(nearMissions === 40, 'starting rocks stay near the ship on every seed, got ' + nearMissions);

const travel = createState();
startMission(travel, 'add', 'layer-walk', null);
addItem(travel, 'jumper', 1);
const origin = { x: travel.ship.x, y: travel.ship.y };
changeLayer(travel, -1, null);
finishShift(travel);
assert(travel.layer === -1, 'Q reaches layer -1');
assert(buildHudFields(travel).mission.includes('L-1'), 'hud shows L-1');
assert(travel.status === 'Dropped to layer -1.', 'status uses the signed layer');
assert(travel.ship.x === origin.x && travel.ship.y === origin.y, 'a layer shift keeps the ship');
const layerMinusOneRocks = travel.asteroids.map((rock) => rock.id);
assert(
  layerMinusOneRocks.length > 0 &&
    travel.asteroids.some((rock) => Math.hypot(rock.x - travel.ship.x, rock.y - travel.ship.y) < 320),
  'a fresh layer still scatters rocks near the ship',
);

changeLayer(travel, 1, null);
finishShift(travel);
assert(travel.layer === 0, 'E returns to layer 0');
assert(travel.status === 'Rose to layer 0.', 'status names layer 0');
const returnedIds = travel.asteroids.map((rock) => rock.id);
assert(returnedIds.length > 0 && returnedIds.join() !== layerMinusOneRocks.join(), 'layer 0 keeps its own rocks');

changeLayer(travel, -1, null);
finishShift(travel);
assert(
  travel.asteroids.map((rock) => rock.id).join() === layerMinusOneRocks.join(),
  'revisiting a layer restores its rocks',
);

while (travel.layer > LAYER_MIN) {
  changeLayer(travel, -1, null);
  finishShift(travel);
}
assert(travel.layer === LAYER_MIN, 'walk reaches the bottom');
assert(buildHudFields(travel).mission.includes('L-250'), 'hud shows L-250');
const atBottom = travel.layer;
changeLayer(travel, -1, null);
assert(travel.layer === atBottom && !travel.transition, 'Q stops at layer -250');

while (travel.layer < LAYER_MAX) {
  changeLayer(travel, 1, null);
  finishShift(travel);
}
assert(travel.layer === LAYER_MAX, 'walk reaches the top');
assert(buildHudFields(travel).mission.includes('L250'), 'hud shows L250');
changeLayer(travel, 1, null);
assert(travel.layer === LAYER_MAX && !travel.transition, 'E stops at layer 250');

const jump = createState();
startMission(jump, 'add', 'worm-seed', null);
jump.solved = jump.mission.quota;
jump.cargo = 40;
for (const rock of jump.asteroids) {
  rock.x = 200;
  rock.y = 200;
}
jump.ship.x = jump.wormhole.x;
jump.ship.y = jump.wormhole.y;
jump.ship.vx = 0;
jump.ship.vy = 0;
updateFly(jump, 0.016, { input: stubInput(), audio: null, view: { w: 1280, h: 720 } });
assert(jump.mode === 'transition', 'wormhole starts the jump');
const leftAt = { x: jump.clusterCache[1].shipX, y: jump.clusterCache[1].shipY };
finishShift(jump);
assert(jump.cluster === 2, 'wormhole arrives in the next cluster');
assert(jump.layer === 0, 'a new cluster starts on layer 0');
assert(insideBelt(jump.ship.x, jump.ship.y), 'arrival stays inside the edge inset');
assert(jump.home.x === jump.ship.x && jump.home.y === jump.ship.y, 'arrival home follows the ship');
assert(
  jump.asteroids.some((rock) => Math.hypot(rock.x - jump.ship.x, rock.y - jump.ship.y) < 320),
  'arrival rocks follow the ship',
);
assert(jump.returnHole, 'arrival opens a return wormhole');
const arrived = { x: jump.ship.x, y: jump.ship.y };
const again = createState();
startMission(again, 'add', 'worm-seed', null);
again.solved = again.mission.quota;
again.cargo = 40;
for (const rock of again.asteroids) {
  rock.x = 200;
  rock.y = 200;
}
again.ship.x = again.wormhole.x;
again.ship.y = again.wormhole.y;
again.ship.vx = 0;
again.ship.vy = 0;
updateFly(again, 0.016, { input: stubInput(), audio: null, view: { w: 1280, h: 720 } });
finishShift(again);
assert(again.ship.x === arrived.x && again.ship.y === arrived.y, 'wormhole arrival is seeded');

jump.ship.x = jump.returnHole.x;
jump.ship.y = jump.returnHole.y;
jump.ship.vx = 0;
jump.ship.vy = 0;
for (const rock of jump.asteroids) {
  rock.x = 200;
  rock.y = 200;
}
updateFly(jump, 0.016, { input: stubInput(), audio: null, view: { w: 1280, h: 720 } });
assert(jump.mode === 'transition', 'return wormhole starts the jump back');
finishShift(jump);
assert(jump.cluster === 1, 'return arrives in the previous cluster');
assert(
  Math.hypot(jump.ship.x - leftAt.x, jump.ship.y - leftAt.y) < 1,
  'returning restores the ship instead of rolling a new spot',
);

console.log('layers and spawn ok');
console.log(
  'sample belt-7 ship',
  Math.round(first.ship.x),
  Math.round(first.ship.y),
  'hud',
  buildHudFields(first).mission,
);
