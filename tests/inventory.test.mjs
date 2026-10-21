import { existsSync } from 'node:fs';
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
  slotIcon,
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
assert(!shrink.orePopping, 'one answer does not release ore');
assert(!shrink.drops.length, 'one correct extract does not put ore in space');
assert(rock.extractCount === 1, 'the first answer counts');
assert(rock.alive, 'the rock is still there after one answer');
assert(rock.question.prompt !== '3 + 4', 'the next question is a different prompt');
const greenSnap = buildSnapshotPatch(shrink, false);
assert(
  greenSnap.fxGreen && greenSnap.correctAnswer === '7',
  'the green box snapshot still carries the answer'
);
idle(shrink, 0.4, null);
assert(rock.size < before, 'the rock keeps shrinking');
assert(rock.size > rock.sizeTarget, 'the shrink is still in progress');
assert(!shrink.drops.length, 'shrinking still does not drop ore');

shrink.buffer = '';
rock.question = { ...rock.question, answerText: '12', prompt: '8 + 4' };
shrink.mode = 'extract';
shrink.extractRockId = rock.id;
typeChar(shrink, '9', null);
assert(shrink.shakeTime > 0, 'a wrong answer shakes the camera');

const sfx = {
  pops: 0,
  explosions: 0,
  pickups: 0,
  correct() {},
  wrong() {},
  pop() {
    sfx.pops += 1;
  },
  explode() {
    sfx.explosions += 1;
  },
  pickup() {
    sfx.pickups += 1;
  },
};

function answerExtract(state, target, audio) {
  state.mode = 'extract';
  state.extractRockId = target.id;
  state.extractAvailable = target.id;
  const answer = String(target.question.answerText);
  for (const ch of answer) typeChar(state, ch, audio);
}

answerExtract(shrink, rock, sfx);
assert(rock.extractCount === 2, 'the second answer counts');
assert(rock.alive && !rock.depleted, 'two answers do not finish the rock');
assert(!shrink.drops.length, 'the second answer does not release ore');
assert(!shrink.orePopping, 'the second answer does not pop ore');
assert(rock.question.prompt !== '8 + 4', 'the third question is a different prompt');

const mineral = rock.mineral || 'pale';
const rockId = rock.id;
const expectN = mineralYield({ mineral }, rock.baseRadius / 0.34, rock.difficulty);
answerExtract(shrink, rock, sfx);
assert(!shrink.asteroids.some((item) => item.id === rockId), 'the third answer removes the rock');
assert(rock.alive === false && rock.depleted, 'the finished rock is dead');
assert(!shrink.drops.length, 'ore is not in space until the pops begin');
assert(shrink.particles.length > 0, 'the finish plays an explosion burst');
assert(sfx.explosions === 1, 'the finish plays the explosion cue');
assert(shrink.orePopping, 'the ship stays locked while the ore is coming out');
for (let step = 0; step < 160 && (shrink.orePopping || shrink.drops.length < expectN); step += 1) {
  idle(shrink, 0.1, sfx);
}
assert(shrink.drops.length === expectN, 'the explosion releases mineralYield crystals');
assert(
  shrink.drops.every((drop) => drop.count === 1 && !drop.popping),
  'each crystal is its own settled drop'
);
assert(sfx.pops === expectN, 'each crystal plays the pop');
for (const drop of shrink.drops) {
  assert(
    Math.hypot(drop.x - shrink.ship.x, drop.y - shrink.ship.y) > 90,
    'minerals sit away from the ship'
  );
}
assert(countItem(shrink, mineral) === 0, 'minerals are not in the hotbar until flown over');
assert(!shrink.orePopping, 'flight can resume once every mineral has popped');

const landed = shrink.drops[0];
shrink.mode = 'fly';
shrink.ship.x = landed.x;
shrink.ship.y = landed.y;
idle(shrink, 0.05, sfx);
assert(countItem(shrink, mineral) === 1, 'flying over a settled mineral adds one to the hotbar');
assert(sfx.pickups === 1, 'flying over a settled mineral plays pickup');

const spent = createState();
const host = spent.asteroids.find((item) => item.alive);
spent.mode = 'fly';
spent.extractAvailable = host.id;
host.extractCount = 2;
host.question = { ...host.question, answerText: '4', prompt: '2 + 2' };
openExtract(spent, host.id, null);
typeChar(spent, '4', null);
assert(host.depleted, 'the third answer spends the rock');
assert(!spent.asteroids.some((item) => item.id === host.id), 'the spent rock is gone');
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
assert(wreck.deathReveal > 1, 'the overlay waits for the explosion');
assert(wreck.deathReason === 'The hull reached zero.', 'a breach states why the ship was lost');
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

const barePickup = createState();
barePickup.mode = 'fly';
barePickup.drops.push({
  id: 42,
  x: barePickup.ship.x,
  y: barePickup.ship.y,
  itemId: 'slate',
  count: 1,
  life: 30,
  maxLife: 30,
});
idle(barePickup, 0.05, { correct() {}, pop() {}, explode() {} });
assert(countItem(barePickup, 'slate') === 1, 'a settled mineral is collected even if pickup is missing');
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

const finished = createState();
const oreRock = finished.asteroids.find((item) => item.alive);
const finishedMineral = oreRock.mineral || 'pale';
finished.mode = 'fly';
finished.extractAvailable = oreRock.id;
openExtract(finished, oreRock.id, null);
for (let n = 0; n < 3; n += 1) {
  oreRock.question = { ...oreRock.question, answerText: '4', prompt: '1 + ' + n };
  typeChar(finished, '4', null);
}
const finishedYield = mineralYield(
  { mineral: finishedMineral },
  oreRock.baseRadius / 0.34,
  oreRock.difficulty
);
assert(oreRock.exploded && !oreRock.alive, 'the third answer destroys the rock');
assert(!finished.asteroids.some((item) => item.id === oreRock.id), 'the destroyed rock leaves the belt');
assert(!finished.drops.length, 'ore waits until the explosion starts the pop');
for (let step = 0; step < 160 && finished.orePopping; step += 1) idle(finished, 0.1, null);
assert(
  finished.drops.length === finishedYield,
  'a finished rock releases mineralYield crystals'
);
assert(finished.drops.every((drop) => !drop.popping), 'the crystals finish popping');
assert(!finished.orePopping, 'flight resumes after the crystals land');

const slotPictures = [
  ['pale', '/assets/asteroids/asteroid1.png', 'Pa'],
  ['slate', '/assets/asteroids/asteroid2.png', 'Sl'],
  ['amber', '/assets/asteroids/asteroid3.png', 'Am'],
  ['virid', '/assets/asteroids/asteroid4.png', 'Vi'],
  ['glint', '/assets/asteroids/asteroid6.png', 'Gn'],
  ['arc-missile', '/images/bullets/bullet_missile.png', 'Ar'],
  ['pulse-lance', '/images/bullets/bullet_laser.png', 'Pu'],
  ['flare', '/images/bullets/bullet_fire1.png', 'Sf'],
  ['glass', '', 'Gl'],
  ['repair', '', 'Rp'],
];
const iconState = createState();
slotPictures.forEach(([id, icon, mark], index) => {
  assert(slotIcon(id) === icon, id + ' picture');
  if (icon) assert(existsSync('public' + icon), id + ' picture file is already in the game');
  iconState.hotbar[index] = { id, count: 2 };
  assert(mark, id + ' still has a two-letter mark');
});
iconState.cargoSlots[0] = { id: 'amber', count: 3 };
iconState.cargoSlots[1] = { id: 'flare', count: 1 };
iconState.cargoSlots[2] = { id: 'iron', count: 1 };
iconState.cargoSlots[3] = { id: 'blink', count: 1 };
const iconSnap = buildSnapshotPatch(iconState, false);
slotPictures.forEach(([id, icon, mark], index) => {
  const slot = iconSnap.hud.hotbar.slots[index];
  assert(slot.icon === icon, id + ' shows in the hotbar slot');
  assert(slot.mark === mark, id + ' keeps its mark text');
});
assert(
  iconSnap.cargoHold.slots[0].icon === '/assets/asteroids/asteroid3.png',
  'cargo ore uses the asteroid picture'
);
assert(
  iconSnap.cargoHold.slots[1].icon === '/images/bullets/bullet_fire1.png',
  'cargo weapon uses the bullet picture'
);
assert(
  iconSnap.cargoHold.slots[2].icon === '' && iconSnap.cargoHold.slots[2].mark === 'Fe',
  'alloy cargo stays a letter'
);
assert(
  iconSnap.cargoHold.slots[3].icon === '' && iconSnap.cargoHold.slots[3].mark === 'Bl',
  'ability cargo stays a letter'
);
const heldOre = createState();
assert(addItem(heldOre, 'pale', 2) === 0, 'pale ore for the held stack');
assert(inventoryClick(heldOre, 'hotbar', 0), 'pick up the pale ore');
assert(
  buildSnapshotPatch(heldOre, false).held.icon === '/assets/asteroids/asteroid1.png',
  'a held ore stack keeps its picture'
);

console.log('inventory tests ok');
