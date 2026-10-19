import { createState } from '../src/game/state.js';
import { CARGO_SIZE, RECIPES, addItem, countItem, moveCargoToHotbar } from '../src/game/items.js';
import {
  breachHull,
  buildHotbar,
  craftItem,
  cycleHotbar,
  idle,
  openExtract,
  populateField,
  respawnShip,
  selectHotbar,
  startMission,
  typeChar,
} from '../src/game/systems.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const fresh = createState();
assert(fresh.hotbar.length === 10, 'hotbar has ten stacks');
assert(fresh.cargoSlots.length === CARGO_SIZE, 'cargo has a grid of slots');
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
idle(shrink, 0.4, null);
assert(rock.size < before, 'the rock keeps shrinking');
assert(rock.size > rock.sizeTarget, 'the shrink is still in progress');

shrink.buffer = '';
rock.question = { ...rock.question, answerText: '12' };
shrink.mode = 'extract';
shrink.extractRockId = rock.id;
typeChar(shrink, '9', null);
assert(shrink.shakeTime > 0, 'a wrong answer shakes the camera');

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

const emptyField = createState();
emptyField.asteroids = [];
emptyField.ship.x = 4000;
emptyField.ship.y = 4000;
populateField(emptyField);
assert(emptyField.asteroids.length >= 40, 'an open belt is populated more densely');

console.log('inventory tests ok');
