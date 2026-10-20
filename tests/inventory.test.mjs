import { createState, mineralYield, rollAsteroidType } from '../src/game/state.js';
import { makeRng } from '../src/game/util.js';
import {
  CARGO_COLS,
  CARGO_ROWS,
  CARGO_SIZE,
  RECIPES,
  addItem,
  countItem,
  inventoryClick,
  inventoryDrag,
  moveCargoToHotbar,
} from '../src/game/items.js';
import {
  breachHull,
  buildHotbar,
  buildHudFields,
  buildSnapshotPatch,
  changeLayer,
  craftItem,
  cycleHotbar,
  hasJumper,
  idle,
  openExtract,
  rockTouchDistance,
  updateFly,
  updatePhysics,
  populateField,
  applySharedRock,
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
assert(addItem(fresh, 'ping', 1) === 0, 'the next item fits');
assert(fresh.cargoSlots.some((stack) => stack && stack.id === 'ping'), 'overflow goes to cargo');
assert(buildHotbar(fresh).slots.every((slot) => slot.available), 'hotbar shows every stack');

selectHotbar(fresh, 0);
cycleHotbar(fresh, 1);
assert(fresh.hotbarSlot === 1, 'wheel down moves to the next slot');
cycleHotbar(fresh, -1);
assert(fresh.hotbarSlot === 0, 'wheel up moves back');
cycleHotbar(fresh, -1);
assert(fresh.hotbarSlot === 9, 'wheel wraps to the last slot');

const cargoIndex = fresh.cargoSlots.findIndex((stack) => stack && stack.id === 'ping');
selectHotbar(fresh, 0);
const displaced = fresh.hotbar[0].id;
assert(moveCargoToHotbar(fresh, cargoIndex, 0), 'cargo stack moves onto a hotbar slot');
assert(fresh.hotbar[0].id === 'ping', 'selected hotbar slot receives the cargo stack');
assert(fresh.cargoSlots[cargoIndex].id === displaced, 'a different item swaps back into cargo');

const worn = createState();
assert(addItem(worn, 'compass', 1) === 0, 'the compass fits');
assert(worn.hullSlots.some((stack) => stack && stack.id === 'compass'), 'the compass wears in the hull');
assert(!worn.hotbar.some((stack) => stack && stack.id === 'compass'), 'the compass does not sit in the hotbar');
worn.layer = -3;
worn.ship.x = worn.world.w * 0.1;
const compassHud = buildHudFields(worn);
assert(compassHud.compass && compassHud.compass.layer === -3, 'a worn compass reports the layer');
assert(compassHud.compass.along > 0.09 && compassHud.compass.along < 0.11, 'the dot sits along the layer length');
assert(buildHudFields(createState()).compass == null, 'the compass stays hidden until it is worn');

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
const spilled = shrink.drops[shrink.drops.length - 1];
assert(spilled, 'a correct answer leaves a mineral in space');
assert(
  Math.hypot(spilled.x - shrink.ship.x, spilled.y - shrink.ship.y) > 90,
  'the mineral stays by the asteroid until the ship flies to it'
);
assert(countItem(shrink, 'pale') === 0, 'the mineral is not in the hotbar yet');
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
assert(!craftItem(locked, 'jumper', null), 'the jumper stays closed until a bench is carried');
assert(addItem(locked, 'bench', 1) === 0, 'the fabrication bench is the crafting table');
assert(craftItem(locked, 'jumper', null), 'the jumper is manufactured once the bench is carried');
assert(hasJumper(locked), 'the jumper is carried');
changeLayer(locked, 1, null);
assert(locked.transition && locked.transition.kind === 'layer', 'a carried jumper unlocks the shift');

const emptyField = createState();
emptyField.asteroids = [];
emptyField.ship.x = 4000;
emptyField.ship.y = 4000;
populateField(emptyField);
assert(emptyField.asteroids.length >= 40, 'an open belt is populated more densely');

const gather = createState();
gather.mode = 'fly';
gather.drops.push({
  id: 99,
  x: gather.ship.x + 20,
  y: gather.ship.y,
  itemId: 'pale',
  count: 2,
  life: 20,
  maxLife: 20,
});
idle(gather, 0.05, null);
assert(countItem(gather, 'pale') === 2, 'flying onto a mineral puts it in the hotbar');
assert(
  gather.notices.some((note) => note.text.includes('Prism glass') && note.text.includes('Press F')),
  'a new recipe toasts and points at F'
);

const drag = createState();
addItem(drag, 'amber', 3);
assert(inventoryDrag(drag, 'hotbar', 0, 'cargo', 0), 'a drag moves a stack into cargo');
assert(drag.cargoSlots[0] && drag.cargoSlots[0].id === 'amber', 'cargo received the dragged stack');
assert(inventoryDrag(drag, 'cargo', 0, 'hotbar', 3), 'a drag moves a stack back to the hotbar');
assert(drag.hotbar[3] && drag.hotbar[3].id === 'amber', 'the hotbar received the dragged stack');

const reverse = createState();
reverse.mode = 'fly';
reverse.ship.aim = 0;
reverse.ship.vx = 0;
reverse.ship.vy = 0;
const brakeInput = {
  thrust: () => false,
  brake: () => true,
  strafe: () => 0,
  mouse: { touch: false, held: false },
};
for (let step = 0; step < 50; step++) updatePhysics(reverse, 0.05, brakeInput);
const backward = -(
  reverse.ship.vx * Math.cos(reverse.ship.aim) + reverse.ship.vy * Math.sin(reverse.ship.aim)
);
assert(backward > 60, 'reverse is a bit faster, got ' + Math.round(backward));

const bump = createState();
startMission(bump, 'roam', 'bump-seed', null);
const struck = bump.asteroids.find((item) => item.alive);
const touch = rockTouchDistance(struck);
bump.ship.x = struck.x + touch - 8;
bump.ship.y = struck.y;
bump.ship.vx = 0;
bump.ship.vy = 0;
bump.bumpCooldown = 0;
const beforeHp = bump.ship.hp;
updateFly(bump, 0.05, {
  input: {
    mouse: { x: 0, y: 0, worldX: bump.ship.x, worldY: bump.ship.y, touch: false, held: false },
    thrust: () => false,
    brake: () => false,
    strafe: () => 0,
    takeClicks: () => [],
  },
  audio: null,
  view: { w: 1280, h: 720 },
});
assert(bump.ship.hp < beforeHp, 'the hull is hit when the ship touches the rock');

const miss = createState();
startMission(miss, 'roam', 'miss-bump', null);
const aside = miss.asteroids.find((item) => item.alive);
for (const rock of miss.asteroids) {
  if (rock !== aside) rock.alive = false;
}
const outside = rockTouchDistance(aside) + 36;
miss.ship.x = aside.x + outside;
miss.ship.y = aside.y;
miss.ship.vx = 0;
miss.ship.vy = 0;
miss.bumpCooldown = 0;
const safeHp = miss.ship.hp;
updateFly(miss, 0.05, {
  input: {
    mouse: { x: 0, y: 0, worldX: miss.ship.x, worldY: miss.ship.y, touch: false, held: false },
    thrust: () => false,
    brake: () => false,
    strafe: () => 0,
    takeClicks: () => [],
  },
  audio: null,
  view: { w: 1280, h: 720 },
});
assert(miss.ship.hp === safeHp, 'a gap outside the painted rock does not count as a hit');

const shared = createState();
const marked = shared.asteroids.find((item) => item.alive);
const beforeSize = marked.size;
applySharedRock(shared, { key: marked.key, size: beforeSize * 0.83, alive: true, depleted: false, extractCount: 1 });
assert(marked.sizeTarget < beforeSize, 'another pilot shrinking a rock sets the same shrink here');

const oreRng = makeRng('ore-ladder');
const tallies = { pale: 0, slate: 0, amber: 0, virid: 0, glint: 0 };
for (let n = 0; n < 800; n++) tallies[rollAsteroidType(oreRng).mineral] += 1;
assert(tallies.pale > tallies.slate && tallies.slate > tallies.amber, 'common rocks outnumber richer rocks');
assert(tallies.amber > tallies.virid && tallies.virid > tallies.glint, 'glint is the rare rock');
assert(mineralYield({ mineral: 'pale' }, 180, 'hard') === 4, 'a large hard pale rock drops four');
assert(mineralYield({ mineral: 'pale' }, 120, 'easy') === 1, 'a small easy pale rock drops one');
assert(mineralYield({ mineral: 'glint' }, 180, 'easy') === 1, 'glint stays one unless the question is hard');
assert(mineralYield({ mineral: 'glint' }, 180, 'hard') === 2, 'a hard glint rock drops two');

console.log('inventory tests ok');
