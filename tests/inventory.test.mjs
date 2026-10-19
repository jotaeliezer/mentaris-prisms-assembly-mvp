import { createState } from '../src/game/state.js';
import {
  CARGO_COLS,
  CARGO_ROWS,
  CARGO_SIZE,
  RECIPES,
  addItem,
  countItem,
  inventoryClick,
  moveCargoToHotbar,
} from '../src/game/items.js';
import {
  breachHull,
  buildHotbar,
  buildSnapshotPatch,
  changeLayer,
  craftItem,
  cycleHotbar,
  hasJumper,
  idle,
  openExtract,
  populateField,
  respawnShip,
  selectHotbar,
  setCargoOpen,
  startMission,
  typeChar,
} from '../src/game/systems.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const fresh = createState();
assert(fresh.hotbar.length === 10, 'hotbar has ten stacks');
assert(fresh.cargoSlots.length === CARGO_SIZE, 'cargo has a grid of slots');
assert(CARGO_COLS === 4 && CARGO_ROWS === 10, 'cargo is 4 across and 10 tall');
assert(fresh.hotbar.every((stack) => stack == null), 'hotbar starts empty');

const ids = ['pale', 'amber', 'glass', 'iron', 'resin', 'filament', 'flare', 'drive', 'hull', 'hint'];
for (const id of ids) assert(addItem(fresh, id, 1) === 0, 'first ten kinds fit the hotbar');
assert(fresh.hotbar.every((stack) => stack && stack.count === 1), 'hotbar is full');
assert(addItem(fresh, 'compass', 1) === 0, 'the next item fits');
assert(fresh.cargoSlots.some((stack) => stack && stack.id === 'compass'), 'overflow goes to cargo');
assert(buildHotbar(fresh).slots.every((slot) => slot.available), 'hotbar shows every stack');

selectHotbar(fresh, 0);
cycleHotbar(fresh, 1);
assert(fresh.hotbarSlot === 1, 'wheel down moves to the next slot');
cycleHotbar(fresh, -1);
assert(fresh.hotbarSlot === 0, 'wheel up moves back');
cycleHotbar(fresh, -1);
assert(fresh.hotbarSlot === 9, 'wheel wraps to the last slot');

const cargoIndex = fresh.cargoSlots.findIndex((stack) => stack && stack.id === 'compass');
selectHotbar(fresh, 0);
const displaced = fresh.hotbar[0].id;
assert(moveCargoToHotbar(fresh, cargoIndex, 0), 'cargo stack moves onto a hotbar slot');
assert(fresh.hotbar[0].id === 'compass', 'selected hotbar slot receives the cargo stack');
assert(fresh.cargoSlots[cargoIndex].id === displaced, 'a different item swaps back into cargo');

const carry = createState();
addItem(carry, 'pale', 3);
assert(inventoryClick(carry, 'hotbar', 0), 'click picks a hotbar stack up');
assert(carry.hotbar[0] == null && carry.held && carry.held.count === 3, 'the stack leaves the hotbar');
assert(inventoryClick(carry, 'cargo', 7), 'click places it in cargo');
assert(carry.cargoSlots[7].id === 'pale' && carry.held == null, 'cargo received the hotbar stack');
assert(inventoryClick(carry, 'cargo', 7), 'click picks it back up');
assert(inventoryClick(carry, 'hotbar', 2), 'click places it on another hotbar slot');
assert(carry.hotbar[2].id === 'pale' && carry.hotbar[2].count === 3, 'cargo stack returns to the hotbar');
carry.mode = 'fly';
setCargoOpen(carry, true);
inventoryClick(carry, 'hotbar', 2);
setCargoOpen(carry, false);
assert(carry.held == null && carry.hotbar[2] && carry.hotbar[2].id === 'pale', 'closing cargo puts the stack back');

const craft = createState();
assert(addItem(craft, 'pale', 2) === 0, 'two pale ore');
assert(craftItem(craft, 'glass', null), 'prism glass crafts from a count');
assert(countItem(craft, 'pale') === 0, 'recipe spends the pale ore');
assert(countItem(craft, 'glass') === 1, 'result lands in the hotbar');
const glass = RECIPES.find((recipe) => recipe.id === 'glass');
assert(glass && Array.isArray(glass.costs) && glass.costs[0].n === 2, 'recipe is a count');
assert(!('pattern' in glass) && !('grid' in glass), 'recipe has no crafting grid');

const shrink = createState();
const rock = shrink.asteroids.find((item) => item.alive);
const before = rock.size;
shrink.mode = 'fly';
shrink.extractAvailable = rock.id;
rock.question = { ...rock.question, answerText: '7', prompt: '3 + 4' };
openExtract(shrink, rock.id, null);
typeChar(shrink, '7', null);
assert(rock.size === before, 'a correct answer does not jump the size');
assert(rock.sizeTarget < before, 'the rock has a smaller target');
assert(shrink.fxGreen > 0, 'a correct answer flashes green');
assert(shrink.correctAnswer === '7', 'the correct answer stays visible in the green box');
assert(shrink.buffer === '', 'the live buffer clears so the next problem can be typed');
assert(shrink.mode === 'extract', 'extract stays open while the answer is green');
const greenSnap = buildSnapshotPatch(shrink, false);
assert(
  greenSnap.fxGreen && greenSnap.correctAnswer === '7',
  'the green box snapshot still carries the answer'
);
idle(shrink, 0.4, null);
assert(rock.size < before, 'the rock keeps shrinking');
assert(rock.size > rock.sizeTarget, 'the shrink is still in progress');

shrink.buffer = '';
rock.question = { ...rock.question, answerText: '12' };
shrink.mode = 'extract';
shrink.extractRockId = rock.id;
typeChar(shrink, '9', null);
assert(shrink.shakeTime > 0, 'a wrong answer shakes the camera');

const spent = createState();
const host = spent.asteroids.find((item) => item.alive);
spent.mode = 'fly';
spent.extractAvailable = host.id;
host.extractCount = 2;
host.question = { ...host.question, answerText: '4', prompt: '2 + 2' };
openExtract(spent, host.id, null);
typeChar(spent, '4', null);
assert(host.depleted, 'the third answer spends the rock');
assert(spent.mode === 'extract', 'the last answer stays on screen');
assert(spent.correctAnswer === '4', 'the last answer is kept while the box is green');
idle(spent, 1.2, null);
assert(spent.fxGreen === 0, 'the green box ends');
assert(spent.correctAnswer === '', 'the kept answer clears when the box is no longer green');
assert(spent.mode === 'fly', 'extract closes after the green answer');

const wreck = createState();
startMission(wreck, 'roam', 'wreck-seed', null);
const layer = wreck.layer;
const rocks = wreck.asteroids.length;
assert(rocks >= 40, 'layers hold more asteroids');
addItem(wreck, 'pale', 4);
addItem(wreck, 'amber', 1);
const wreckX = wreck.ship.x;
const wreckY = wreck.ship.y;
breachHull(wreck, null);
assert(wreck.mode === 'dead', 'losing the hull opens game over');
assert(wreck.ship.hp === 0, 'hull stays at zero until respawn');
assert(wreck.layer === layer && wreck.asteroids.length === rocks, 'the world is not reset');
assert(
  wreck.drops.some((drop) => drop.itemId === 'pale' && drop.count === 4),
  'pale ore is dropped at the wreck'
);
assert(wreck.drops.some((drop) => drop.itemId === 'amber'), 'amber ore is dropped too');
assert(wreck.hotbar.every((stack) => stack == null), 'the hotbar is emptied by the breach');
respawnShip(wreck, null);
assert(wreck.mode === 'fly', 'respawn continues the flight');
assert(wreck.ship.hp === wreck.ship.maxHp, 'respawn restores the hull');
assert(wreck.asteroids.length === rocks && wreck.layer === layer, 'respawn stays on this layer');
assert(wreck.drops.some((drop) => drop.itemId === 'pale'), 'dropped items are still there');
assert(Math.hypot(wreck.ship.x - wreckX, wreck.ship.y - wreckY) > 200, 'respawn steps away from the wreck');

const locked = createState();
startMission(locked, 'roam', 'no-jumper', null);
const lockedLayer = locked.layer;
assert(!hasJumper(locked), 'a new flight has no jumper');
changeLayer(locked, 1, null);
assert(locked.layer === lockedLayer && !locked.transition, 'Q and E do nothing without a jumper');
assert(addItem(locked, 'pale', 4) === 0, 'pale ore for the placeholder jumper');
assert(craftItem(locked, 'jumper', null), 'the jumper is manufactured from a count');
assert(hasJumper(locked), 'the jumper is carried');
changeLayer(locked, 1, null);
assert(locked.transition && locked.transition.kind === 'layer', 'a carried jumper unlocks the shift');

const emptyField = createState();
emptyField.asteroids = [];
emptyField.ship.x = 4000;
emptyField.ship.y = 4000;
populateField(emptyField);
assert(emptyField.asteroids.length >= 40, 'an open belt is populated more densely');

console.log('inventory tests ok');
