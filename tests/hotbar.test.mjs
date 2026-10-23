import { createState } from '../src/game/state.js';
import {
  HOTBAR_SIZE,
  buildHotbar,
  selectHotbar,
  typeChar,
} from '../src/game/systems.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const state = createState();
const fresh = buildHotbar(state);
assert(fresh.slots.length === HOTBAR_SIZE, 'ten slots');
assert(HOTBAR_SIZE === 10, 'four slots beyond the original six');
assert(
  fresh.slots.every((slot) => slot.available === false && slot.icon === '' && slot.badge === ''),
  'nothing is equipped yet'
);
assert(
  fresh.slots.map((slot) => slot.key).join(',') === '1,2,3,4,5,6,7,8,9,10',
  'keys run 1 through 10'
);
assert(fresh.selected === 0 && fresh.slots[0].selected, 'slot 1 starts selected');
assert(fresh.label === 'Empty', 'no item name is shown');

selectHotbar(state, 3);
assert(state.hotbarSlot === 3, 'select slot 4');
assert(buildHotbar(state).label === 'Empty', 'empty slot caption');
selectHotbar(state, 10);
selectHotbar(state, -1);
selectHotbar(state, 1.5);
assert(state.hotbarSlot === 3, 'out of range ignored');
selectHotbar(state, '9');
assert(state.hotbarSlot === 9, '0-key index selects the last slot');
selectHotbar(state, '1');
assert(state.hotbarSlot === 1, 'numeric string selects the second slot');

state.hint = 'Hint: the answer starts with 1.';
state.mapUnlocked = true;
state.driveTier = 2;
state.hullTier = 1;
const owned = buildHotbar(state);
assert(owned.slots.every((slot) => slot.available === false), 'upgrades stay off the bar');
assert(owned.slots.every((slot) => slot.icon === ''), 'no drive or hull icon');

const rock = state.asteroids.find((item) => item.alive);
state.mode = 'extract';
state.extractRockId = rock.id;
state.buffer = '';
state.hotbarSlot = 1;
typeChar(state, '4', null);
assert(state.hotbarSlot === 1, 'typing an answer does not move the hotbar');

console.log('hotbar tests ok');
