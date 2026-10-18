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
assert(fresh.slots.length === HOTBAR_SIZE, 'six slots');
assert(
  fresh.slots
    .filter((slot) => slot.available)
    .map((slot) => slot.id)
    .join(',') === 'drive,hull',
  'a new ship carries drive and hull'
);
assert(fresh.slots.find((slot) => slot.id === 'hint').available === false, 'no hint yet');
assert(fresh.slots.find((slot) => slot.id === 'map').available === false, 'map locked');
assert(fresh.slots.find((slot) => slot.id === 'repair').available === false, 'no repair charge');
assert(fresh.slots.find((slot) => slot.id === 'repair').icon === '', 'empty repair slot');
assert(fresh.slots.find((slot) => slot.id === 'spare').available === false, 'placeholder slot');
assert(fresh.selected === 0 && fresh.slots[0].selected, 'slot 1 starts selected');
assert(fresh.label === 'Drive', 'caption names the drive');

selectHotbar(state, 3);
assert(state.hotbarSlot === 3, 'select slot 4');
assert(buildHotbar(state).label === 'Empty', 'empty slot caption');
selectHotbar(state, 9);
selectHotbar(state, -1);
selectHotbar(state, 1.5);
assert(state.hotbarSlot === 3, 'out of range ignored');
selectHotbar(state, '1');
assert(state.hotbarSlot === 1, 'numeric string selects hull');

state.hint = 'Hint: the answer starts with 1.';
state.mapUnlocked = true;
state.driveTier = 2;
state.hullTier = 1;
const owned = buildHotbar(state);
assert(owned.slots.find((slot) => slot.id === 'hint').available, 'held hint fills a slot');
assert(owned.slots.find((slot) => slot.id === 'map').available, 'unlocked map fills a slot');
assert(owned.slots.find((slot) => slot.id === 'drive').badge === '2', 'drive tier badge');
assert(owned.slots.find((slot) => slot.id === 'hull').badge === '1', 'hull tier badge');
assert(owned.slots.find((slot) => slot.id === 'repair').available === false, 'repair stays empty');

const rock = state.asteroids.find((item) => item.alive);
state.mode = 'extract';
state.extractRockId = rock.id;
state.buffer = '';
state.hotbarSlot = 1;
typeChar(state, '4', null);
assert(state.hotbarSlot === 1, 'typing an answer does not move the hotbar');

console.log('hotbar tests ok');
