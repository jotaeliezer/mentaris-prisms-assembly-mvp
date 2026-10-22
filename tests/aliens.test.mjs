import { createState } from '../src/game/state.js';
import { addItem } from '../src/game/items.js';
import { selectHotbar, startMission, useSelectedHotbar } from '../src/game/systems.js';
import { MAIN_STAR_PERIOD, mainStarUp } from '../src/game/star.js';
import {
  ALIEN_TYPES,
  alienWeights,
  damageAlien,
  spawnAlien,
  tickAliens,
} from '../src/game/aliens.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function clockWhere(seed, wantUp) {
  for (let t = 0; t < MAIN_STAR_PERIOD; t += 1) {
    if (mainStarUp(seed, t) === wantUp) return t;
  }
  return 0;
}

const state = createState();
startMission(state, 'add', 'belt-7', null);
assert(
  state.spaceObjects.some((object) => object.kind === 'lair' && object.layer === 0 && object.cluster === 1),
  'the arrival layer has a lair'
);
state.intro = null;
state.mode = 'fly';
const down = clockWhere(state.seed, false);
state.clock = down;
state.aliens = [];
tickAliens(state, 0.2);
assert(state.aliens.length === 0, 'a down sun keeps the lair shut');

const up = clockWhere(state.seed, true);
state.clock = up;
tickAliens(state, 0.05);
assert(state.aliens.length === 1, 'an up sun lets one alien out');
assert(state.aliens[0].hp === 3, 'three hits break an alien');
const kind = state.aliens[0].type;
tickAliens(state, 0.05);
assert(state.aliens.length === 1, 'the layer keeps a single alien');

state.clock = down;
tickAliens(state, 0.05);
assert(state.aliens[0].leaving, 'a down sun sends the alien away');
assert(!state.drops.some((drop) => drop.itemId === ALIEN_TYPES[kind].drop), 'leaving does not drop a part');

const hunter = spawnAlien(state, 'golem', state.ship.x + 400, state.ship.y);
assert(damageAlien(state, hunter, 2) === false && hunter.hp === 1, 'a core cannon hit counts as two');
assert(damageAlien(state, hunter, 1) === true && hunter.gone, 'the third point breaks it');
assert(
  state.drops.some((drop) => drop.itemId === 'spike'),
  'a broken golem drops a spike crystal'
);

const pale = createState();
pale.layer = 0;
pale.asteroids = [{ alive: true, mineral: 'pale' }];
pale.spaceObjects = [];
pale.sunBodies = [];
assert(alienWeights(pale).spider > ALIEN_TYPES.spider.weight, 'pale rocks lean the roll toward spiders');

const cannon = createState();
startMission(cannon, 'add', 'alien-shot', null);
cannon.intro = null;
cannon.mode = 'fly';
for (const rock of cannon.asteroids) {
  rock.x = cannon.ship.x + 9000;
  rock.y = cannon.ship.y + 9000;
}
const target = spawnAlien(cannon, 'scout', cannon.ship.x + 500, cannon.ship.y);
addItem(cannon, 'core-cannon', 1);
const slot = cannon.hotbar.findIndex((stack) => stack && stack.id === 'core-cannon');
selectHotbar(cannon, slot);
assert(useSelectedHotbar(cannon, null), 'the cannon fires at the alien');
assert(cannon.missiles[0] && cannon.missiles[0].power === 2 && cannon.missiles[0].alienId === target.id, 'the heavy shot aims at that alien');

console.log('aliens ok');
