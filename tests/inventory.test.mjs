import { existsSync } from 'node:fs';
import { createState, mineralYield, rollAsteroidType } from '../src/game/state.js';
import { makeRng } from '../src/game/util.js';
import {
  BASE_AMMO,
  CARGO_COLS,
  CARGO_ROWS,
  CARGO_SIZE,
  HULL_FITS,
  ITEMS,
  RECIPES,
  addItem,
  countItem,
  ensureInventory,
  inventoryClick,
  inventoryDrag,
  moveCargoToHotbar,
  shiftOne,
  slotIcon,
} from '../src/game/items.js';
import {
  breachHull,
  buildFabFields,
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
  raiseBow,
  respawnShip,
  rockHitDamage,
  selectHotbar,
  setCargoOpen,
  startMission,
  typeChar,
  useSelectedHotbar,
} from '../src/game/systems.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const fresh = createState();
assert(fresh.hotbar.length === 10, 'hotbar has ten stacks');
assert(fresh.cargoSlots.length === CARGO_SIZE, 'cargo has a grid of slots');
assert(CARGO_COLS === 4 && CARGO_ROWS === 10, 'cargo is 4 across and 10 tall');
assert(fresh.hotbar.every((stack) => stack == null), 'hotbar starts empty');

const ids = ['flare', 'repair', 'blink', 'tractor', 'quiet', 'cloak', 'dash', 'shock', 'shield', 'teleport'];
for (const id of ids) assert(addItem(fresh, id, 1) === 0, 'weapons and abilities fit the hotbar');
assert(fresh.hotbar.every((stack) => stack && stack.count === 1), 'hotbar is full');
assert(addItem(fresh, 'wall', 1) === 0, 'the next piece fits');
assert(fresh.cargoSlots.some((stack) => stack && stack.id === 'wall'), 'overflow goes to cargo');
assert(buildHotbar(fresh).slots.every((slot) => slot.available), 'hotbar shows every stack');
const ore = createState();
ore.hotbar[0] = { id: 'pale', count: 4 };
ensureInventory(ore);
assert(ore.hotbar.some((stack) => stack && stack.id === 'pale' && stack.count === 4), 'minerals stay on the hotbar');
assert(!ore.notices.some((note) => note.text === 'Pale ore moved to the cargo.'), 'ore does not leave the hotbar immediately');

selectHotbar(fresh, 0);
cycleHotbar(fresh, 1);
assert(fresh.hotbarSlot === 1, 'wheel down moves to the next slot');
cycleHotbar(fresh, -1);
assert(fresh.hotbarSlot === 0, 'wheel up moves back');
cycleHotbar(fresh, -1);
assert(fresh.hotbarSlot === 9, 'wheel wraps to the last slot');

const cargoIndex = fresh.cargoSlots.findIndex((stack) => stack && stack.id === 'wall');
selectHotbar(fresh, 0);
const displaced = fresh.hotbar[0].id;
assert(moveCargoToHotbar(fresh, cargoIndex, 0), 'cargo stack moves onto a hotbar slot');
assert(fresh.hotbar[0].id === 'wall', 'selected hotbar slot receives the cargo stack');
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
const paleSlot = carry.cargoSlots.findIndex((stack) => stack && stack.id === 'pale');
assert(paleSlot >= 0 && !carry.hotbar.some((stack) => stack && stack.id === 'pale'), 'pale ore starts in the cargo');
assert(inventoryClick(carry, 'cargo', paleSlot), 'click picks a cargo stack up');
assert(carry.cargoSlots[paleSlot] == null && carry.held && carry.held.count === 3, 'the stack leaves the cargo');
assert(!inventoryClick(carry, 'hotbar', 2), 'a mineral cannot be placed on the hotbar');
assert(carry.held && carry.held.count === 3, 'the mineral stays in hand');
assert(inventoryClick(carry, 'cargo', paleSlot), 'click places it back in cargo');
assert(carry.cargoSlots[paleSlot].id === 'pale' && carry.held == null, 'cargo keeps the mineral');
carry.mode = 'fly';
setCargoOpen(carry, true);
inventoryClick(carry, 'cargo', paleSlot);
setCargoOpen(carry, false);
assert(carry.held == null && carry.cargoSlots.some((stack) => stack && stack.id === 'pale'), 'closing cargo puts the mineral back in cargo');
assert(!carry.hotbar.some((stack) => stack && stack.id === 'pale'), 'closing cargo does not put ore on the hotbar');

const craft = createState();
assert(addItem(craft, 'pale', 2) === 0, 'two pale ore');
assert(craftItem(craft, 'glass', null), 'prism glass crafts from a count');
assert(countItem(craft, 'pale') === 0, 'recipe spends the pale ore');
assert(countItem(craft, 'glass') === 1, 'result lands in the cargo');
assert(craft.cargoSlots.some((stack) => stack && stack.id === 'glass'), 'glass is stored in the cargo');

const expend = createState();
addItem(expend, 'pale', 10);
assert(craftItem(expend, 'glass', null, 99), 'expend crafts as many as the ore allows');
assert(countItem(expend, 'glass') === 5, 'ten pale ore makes five prism glass');
assert(countItem(expend, 'pale') === 0, 'expend spends the pale ore');
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
assert(!(rock.sizeTarget < before), 'the rock waits to shrink until the bullet arrives');
assert((shrink.missiles || []).some((missile) => missile.single && missile.extract), 'a correct answer fires the single bullet');
assert(rock.question.prompt === '3 + 4', 'the next question waits for the bullet');
assert(shrink.fxGreen > 0, 'a correct answer flashes green');
assert(shrink.correctAnswer === '7', 'the correct answer stays visible in the green box');
assert(shrink.buffer === '', 'the live buffer clears so the next problem can be typed');
assert(shrink.mode === 'extract', 'extract stays open while the answer is green');
assert(!shrink.orePopping, 'one answer does not release ore');
assert(!shrink.drops.length, 'one correct extract does not put ore in space');
assert(rock.extractCount === 0, 'the answer does not count until the bullet lands');
landExtractShot(shrink, null);
assert(rock.sizeTarget < before, 'the rock has a smaller target after the bullet lands');
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

function landExtractShot(state, audio) {
  for (let i = 0; i < 80 && (state.missiles || []).some((missile) => missile.extract); i += 1) {
    idle(state, 0.05, audio);
  }
}

function answerExtract(state, target, audio) {
  state.mode = 'extract';
  state.extractRockId = target.id;
  state.extractAvailable = target.id;
  const answer = String(target.question.answerText);
  for (const ch of answer) typeChar(state, ch, audio);
  landExtractShot(state, audio);
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
landExtractShot(spent, null);
assert(host.depleted, 'the third answer spends the rock');
assert(!spent.asteroids.some((item) => item.id === host.id), 'the spent rock is gone');
assert(spent.mode === 'fly', 'the numpad closes when the rock is destroyed');
assert(spent.correctAnswer === '4', 'the last answer is kept while the box is green');
idle(spent, 1.2, null);
assert(spent.fxGreen === 0, 'the green box ends');
assert(spent.correctAnswer === '', 'the kept answer clears when the box is no longer green');
assert(spent.mode === 'fly', 'flight stays open after the rock is gone');

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
assert(
  Math.hypot(wreck.ship.x - wreck.home.x, wreck.ship.y - wreck.home.y) < 2,
  'respawn returns to where the flight began'
);

const locked = createState();
startMission(locked, 'roam', 'no-jumper', null);
const lockedLayer = locked.layer;
assert(!hasJumper(locked), 'a new flight has no jumper');
changeLayer(locked, 1, null);
assert(locked.layer === lockedLayer && !locked.transition, 'Q and E do nothing without a jumper');
assert(
  locked.status.includes('hull panel') && !locked.status.includes(' R'),
  'the lock points at the hull panel'
);
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
assert(gather.hotbar.some((stack) => stack && stack.id === 'pale' && stack.count === 2), 'flying onto a mineral puts it on the hotbar');
assert(
  !gather.notices.some((note) => note.text === 'Pale ore moved to the cargo.'),
  'pickup does not move the ore yet'
);
gather.clock += 600;
idle(gather, 0.05, null);
assert(gather.cargoSlots.some((stack) => stack && stack.id === 'pale' && stack.count === 2), 'the ore moves to the cargo after ten minutes');
assert(!gather.hotbar.some((stack) => stack && stack.id === 'pale'), 'the hotbar lets the ore go');
assert(
  gather.notices.some((note) => note.text === 'Pale ore moved to the cargo.'),
  'the move toasts that the ore went to the cargo'
);

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
  gather.notices.some(
    (note) =>
      note.text.includes('Press F') &&
      (note.icons || []).some((icon) => icon.name === 'Prism glass')
  ),
  'a new recipe toasts its icon and points at F'
);

const drag = createState();
addItem(drag, 'repair', 3);
const repairSlot = drag.hotbar.findIndex((stack) => stack && stack.id === 'repair');
assert(inventoryDrag(drag, 'hotbar', repairSlot, 'cargo', 0), 'a drag moves a stack into cargo');
assert(drag.cargoSlots[0] && drag.cargoSlots[0].id === 'repair', 'cargo received the dragged stack');
assert(inventoryDrag(drag, 'cargo', 0, 'hotbar', 3), 'a drag moves a stack back to the hotbar');
assert(drag.hotbar[3] && drag.hotbar[3].id === 'repair', 'the hotbar received the dragged stack');
addItem(drag, 'amber', 2);
const amberSlot = drag.cargoSlots.findIndex((stack) => stack && stack.id === 'amber');
assert(!inventoryDrag(drag, 'cargo', amberSlot, 'hotbar', 4), 'ore cannot be dragged onto the hotbar');

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
  landExtractShot(finished, null);
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

const crystalIcon = '/assets/asteroids/mineral.png';
const slotPictures = [
  ['pale', crystalIcon, 'Pa'],
  ['slate', crystalIcon, 'Sl'],
  ['amber', crystalIcon, 'Am'],
  ['virid', crystalIcon, 'Vi'],
  ['glint', crystalIcon, 'Gn'],
  ['arc-missile', '/images/bullets/bullet_missile.png', 'Ar'],
  ['pulse-lance', '/images/bullets/bullet_laser.png', 'Pu'],
  ['flare', '/images/bullets/bullet_fire1.png', 'Sf'],
  ['glass', '/images/items/glass.png', 'Gl'],
  ['repair', '/images/items/repair.png', 'Rp'],
];
slotPictures.forEach(([id, icon, mark]) => {
  assert(slotIcon(id) === icon, id + ' picture');
  if (icon) assert(existsSync('public' + icon), id + ' picture file is already in the game');
  assert(mark, id + ' still has a two-letter mark');
});
const iconState = createState();
iconState.cargoSlots[0] = { id: 'pale', count: 2 };
iconState.cargoSlots[1] = { id: 'amber', count: 3 };
iconState.cargoSlots[2] = { id: 'flare', count: 1 };
iconState.cargoSlots[3] = { id: 'iron', count: 1 };
iconState.cargoSlots[4] = { id: 'blink', count: 1 };
iconState.hotbar[0] = { id: 'repair', count: 1 };
const iconSnap = buildSnapshotPatch(iconState, false);
assert(iconSnap.hud.hotbar.slots[0].icon === '/images/items/repair.png', 'a repair stays on the hotbar');
assert(!iconSnap.hud.hotbar.slots.some((slot) => slot.mark === 'Pa'), 'pale ore is not kept on the hotbar');
assert(
  iconSnap.cargoHold.slots[0].icon === crystalIcon && iconSnap.cargoHold.slots[0].iconFilter === 'none',
  'cargo pale ore uses the crystal picture'
);
assert(
  iconSnap.cargoHold.slots[1].icon === crystalIcon && iconSnap.cargoHold.slots[1].iconFilter.includes('hue-rotate'),
  'collected ore keeps a tint so pale and amber do not look the same'
);
assert(
  iconSnap.cargoHold.slots[2].icon === '/images/bullets/bullet_fire1.png',
  'cargo weapon uses the bullet picture'
);
assert(
  iconSnap.cargoHold.slots[3].icon === '/images/items/iron.png' && iconSnap.cargoHold.slots[3].mark === 'Fe',
  'alloy cargo uses its picture'
);
assert(
  iconSnap.cargoHold.slots[4].icon === '/images/items/blink.png' && iconSnap.cargoHold.slots[4].mark === 'Bl',
  'ability cargo uses its picture'
);
const heldOre = createState();
assert(addItem(heldOre, 'pale', 2) === 0, 'pale ore for the held stack');
const heldOreSlot = heldOre.cargoSlots.findIndex((stack) => stack && stack.id === 'pale');
assert(inventoryClick(heldOre, 'cargo', heldOreSlot), 'pick up the pale ore');
assert(
  buildSnapshotPatch(heldOre, false).held.icon === crystalIcon,
  'a held ore stack keeps its picture'
);
assert(
  HULL_FITS.map((slot) => slot.accept).join(',') === 'jumper,bench,compass,bow,plating,ward,housing',
  'the hull panel wears the instruments and the four armor slots'
);
const bowRecipe = RECIPES.find((recipe) => recipe.id === 'bow');
assert(
  bowRecipe && bowRecipe.station === 'bench' && bowRecipe.standIn && bowRecipe.costs[0].id === 'pale' && bowRecipe.costs[0].n === 3,
  'bow plating is a short stand-in count behind the bench'
);

const plate = createState();
plate.mode = 'fly';
assert(rockHitDamage(plate) === 14, 'a bare hull still loses 14 to a rock');
assert(addItem(plate, 'pale', 3) === 0, 'pale ore for bow plating');
assert(!craftItem(plate, 'bow', null), 'bow plating stays closed until a bench is carried');
assert(addItem(plate, 'bench', 1) === 0, 'the bench wears');
assert(craftItem(plate, 'bow', null), 'bow plating is manufactured');
assert(countItem(plate, 'pale') === 0, 'the recipe spends the pale ore');
const wornBow = plate.hullSlots.find((stack) => stack && stack.id === 'bow');
assert(wornBow && wornBow.level === 1, 'bow plating wears at level 1');
assert(rockHitDamage(plate) === 12, 'level 1 takes a little off a rock hit');
const bowView = buildSnapshotPatch(plate, false);
assert(bowView.mode === 'fly' && bowView.hullRack.visible, 'the hull panel is up during flight');
assert(bowView.hullOpen == null, 'flight does not use a hull mode');
const bowSlotView = bowView.hullRack.slots.find((slot) => slot.accept === 'bow');
assert(bowSlotView && bowSlotView.levelLabel === 'Lv 1' && bowSlotView.canLevel, 'the slot shows level 1');
assert(
  bowView.recipes.some((recipe) => recipe.id === 'bow' && recipe.costText.includes('stand-in')),
  'the recipe card labels the stand-in cost'
);

const platedRock = plate.asteroids.find((item) => item.alive);
const platedTouch = rockTouchDistance(platedRock);
plate.ship.x = platedRock.x + platedTouch - 8;
plate.ship.y = platedRock.y;
plate.ship.vx = 0;
plate.ship.vy = 0;
plate.bumpCooldown = 0;
const platedHp = plate.ship.hp;
updateFly(plate, 0.05, {
  input: {
    mouse: { x: 0, y: 0, worldX: plate.ship.x, worldY: plate.ship.y, touch: false, held: false },
    thrust: () => false,
    brake: () => false,
    strafe: () => 0,
    takeClicks: () => [],
  },
  audio: null,
  view: { w: 1280, h: 720 },
});
assert(platedHp - plate.ship.hp === 12, 'the ship loses 12 hull when level 1 plating is worn');

addItem(plate, 'pale', 3);
assert(raiseBow(plate, null), 'the first raise spends pale ore');
assert(plate.hullSlots.find((stack) => stack && stack.id === 'bow').level === 2, 'the piece is level 2');
assert(rockHitDamage(plate) === 10, 'level 2 takes more off the rock hit');
assert(!plate.hotbar.some((stack) => stack && stack.id === 'pale'), 'ore does not sit on the hotbar');
assert(!plate.cargoSlots.some((stack) => stack && stack.id === 'pale'), 'the raise spends the cargo');
addItem(plate, 'pale', 3);
assert(raiseBow(plate, null), 'the second raise reaches the cap');
assert(plate.hullSlots.find((stack) => stack && stack.id === 'bow').level === 3, 'level 3 is the cap');
assert(rockHitDamage(plate) === 8, 'level 3 is the smallest rock hit');
assert(!raiseBow(plate, null), 'level 3 does not raise again');
const capped = buildSnapshotPatch(plate, false).hullRack.slots.find((slot) => slot.accept === 'bow');
assert(capped.levelLabel === 'Lv 3' && !capped.canLevel, 'the level button goes away at level 3');

const bowIndex = plate.hullSlots.findIndex((stack) => stack && stack.id === 'bow');
addItem(plate, 'pale', 3);
assert(craftItem(plate, 'bow', null), 'a second plate can be made while one is worn');
const spare = plate.cargoSlots.findIndex((stack) => stack && stack.id === 'bow');
assert(spare >= 0 && plate.cargoSlots[spare].level === 1, 'the second plate sits in the cargo at level 1');
assert(inventoryDrag(plate, 'cargo', spare, 'hull', bowIndex), 'a cargo plate drags onto the bow slot');
assert(plate.hullSlots[bowIndex].level === 1, 'the dragged plate is the one now worn');
assert(plate.held && plate.held.level === 3, 'the plate that was worn stays in hand with its level');
assert(inventoryClick(plate, 'cargo', spare), 'the held plate goes back to the cargo');
assert(plate.cargoSlots[spare].level === 3 && !plate.held, 'the cargo keeps that level');
assert(inventoryDrag(plate, 'cargo', spare, 'hull', bowIndex), 'the leveled plate drags back onto the slot');
assert(plate.hullSlots[bowIndex].level === 3, 'wearing it again restores the level');
assert(plate.held && plate.held.level === 1, 'the other plate is in hand');
const park = plate.cargoSlots.findIndex((stack) => !stack);
assert(inventoryClick(plate, 'cargo', park), 'the held plate goes into cargo');
assert(plate.cargoSlots[park] && plate.cargoSlots[park].level === 1 && !plate.held, 'cargo keeps the plate level');
plate.cargoSlots[park] = null;
assert(inventoryDrag(plate, 'hull', bowIndex, 'cargo', park), 'the plate drags off the hull into cargo');
assert(plate.cargoSlots[park].level === 3, 'the level stays on the stack in the cargo');
assert(rockHitDamage(plate) === 14, 'an unworn plate does not soften a rock');
ensureInventory(plate);
assert(plate.hullSlots[bowIndex].level === 3, 'the empty bow slot wears the plate again');
assert(rockHitDamage(plate) === 8, 'the restored plate softens the next rock');

breachHull(plate, null);
const spilled = plate.drops.find((drop) => drop.itemId === 'bow');
assert(spilled && spilled.level === 3, 'a breach drops the plate with its level');
respawnShip(plate, null);
plate.ship.x = spilled.x;
plate.ship.y = spilled.y;
idle(plate, 0.05, null);
assert(
  plate.hullSlots.some((stack) => stack && stack.id === 'bow' && stack.level === 3),
  'picking the plate up wears it at the same level'
);

const alienIcons = [
  ['gland', '/images/items/spark-gland.png', 'Sg'],
  ['fiber', '/images/items/grip-fiber.png', 'Gf'],
  ['shard', '/images/items/hull-shard.png', 'Hs'],
  ['lamp', '/images/items/cold-lamp.png', 'Cl'],
  ['servo', '/images/items/servo-joint.png', 'Sv'],
  ['spike', '/images/items/spike-crystal.png', 'Sp'],
  ['chart', '/images/items/alien-chart.png', 'Ac'],
  ['core', '/images/items/alien-core.png', 'Co'],
  ['core-cannon', '/images/items/core-cannon.png', 'Cn'],
];
alienIcons.forEach(([id, icon, mark]) => {
  assert(slotIcon(id) === icon, id + ' picture');
  assert(existsSync('public' + icon), id + ' picture file is in the game');
  assert(ITEMS[id] && ITEMS[id].mark === mark, id + ' keeps its mark');
});
const storedCore = createState();
assert(addItem(storedCore, 'core', 2) === 0, 'an alien core can be stored');
assert(countItem(storedCore, 'core') === 2, 'the core stacks in the hold');
assert(
  buildSnapshotPatch(storedCore, false).cargoHold.slots.some((slot) => slot.icon === '/images/items/alien-core.png'),
  'a stored core shows its picture in the cargo'
);

const cannon = createState();
startMission(cannon, 'add', 'core-cannon', null);
assert(addItem(cannon, 'bench', 1) === 0, 'the bench wears for the cannon');
assert(addItem(cannon, 'iron', 2) === 0, 'iron for the cannon');
assert(addItem(cannon, 'glass', 1) === 0, 'glass for the cannon');
assert(
  !buildFabFields(cannon).recipes.some((recipe) => recipe.id === 'core-cannon'),
  'the core cannon stays hidden without a core'
);
assert(!craftItem(cannon, 'core-cannon', null), 'the cannon cannot be made without a core');
assert(addItem(cannon, 'core', 1) === 0, 'a core reveals the recipe');
assert(
  buildFabFields(cannon).recipes.some((recipe) => recipe.id === 'core-cannon'),
  'a carried core shows the core cannon'
);
assert(craftItem(cannon, 'core-cannon', null), 'the core cannon is manufactured');
assert(countItem(cannon, 'core') === 0, 'the recipe spends the alien core');
assert(countItem(cannon, 'iron') === 0 && countItem(cannon, 'glass') === 0, 'the recipe spends the bench materials');
assert(countItem(cannon, 'core-cannon') === 1, 'the cannon is in the hold');
const cannonSlot = cannon.hotbar.findIndex((stack) => stack && stack.id === 'core-cannon');
selectHotbar(cannon, cannonSlot);
const cannonRock = cannon.asteroids.find((rock) => rock.alive);
cannon.ship.x = 4000;
cannon.ship.y = 4000;
cannon.ship.vx = 0;
cannon.ship.vy = 0;
cannon.ship.aim = 0;
cannonRock.x = 4900;
cannonRock.y = 4000;
for (const other of cannon.asteroids) {
  if (other === cannonRock) continue;
  other.x = -4000;
  other.y = -4000;
}
assert(useSelectedHotbar(cannon, null), 'the cannon fires at a rock 900 away');
assert(
  cannon.missiles.length === 1 && cannon.missiles[0].heavy && cannon.missiles[0].power === 2,
  'the cannon is the heavy shot'
);
assert(cannon.missiles[0].targetId === cannonRock.id, 'the heavy shot aims at that rock');

const arc = createState();
startMission(arc, 'add', 'arc-far', null);
assert(addItem(arc, 'arc-missile', 1) === 0, 'an arc missile for the range check');
selectHotbar(arc, arc.hotbar.findIndex((stack) => stack && stack.id === 'arc-missile'));
const arcRock = arc.asteroids.find((rock) => rock.alive);
arc.ship.x = 4000;
arc.ship.y = 4000;
arcRock.x = 4900;
arcRock.y = 4000;
for (const other of arc.asteroids) {
  if (other === arcRock) continue;
  other.x = -4000;
  other.y = -4000;
}
assert(useSelectedHotbar(arc, null), 'an arc missile reaches a rock 900 away');
assert(arc.missiles.length === 1 && arc.missiles[0].arc, 'the arc missile curves toward that rock');
assert(arc.missiles[0].face === 'bullet_missile.png', 'the arc missile flies as its own bullet');
const arcGun = arc.hotbar.find((stack) => stack && stack.id === 'arc-missile');
assert(countItem(arc, 'arc-missile') === 1, 'the launcher stays on the hotbar');
assert(arcGun.rounds === BASE_AMMO - 1, 'a shot in range spends one round, not the weapon');
arc.ship.x = 4000;
arc.ship.y = 4000;
arcRock.x = 7000;
arcRock.y = 4000;
assert(!useSelectedHotbar(arc, null), 'an arc missile cannot reach a rock 3000 away');
assert(arcGun.rounds === BASE_AMMO - 1, 'a shot out of range spends nothing');

// The Pulse lance shares the arc flight but keeps its own green bolt and magazine.
const lance = createState();
startMission(lance, 'add', 'lance-far', null);
assert(addItem(lance, 'pulse-lance', 1) === 0, 'a pulse lance for the bullet check');
const lanceGun = lance.hotbar.find((stack) => stack && stack.id === 'pulse-lance');
assert(lanceGun.rounds === BASE_AMMO, 'the lance arrives with a full magazine');
selectHotbar(lance, lance.hotbar.findIndex((stack) => stack && stack.id === 'pulse-lance'));
const lanceRock = lance.asteroids.find((rock) => rock.alive);
lance.ship.x = 4000;
lance.ship.y = 4000;
lanceRock.x = 4900;
lanceRock.y = 4000;
for (const other of lance.asteroids) {
  if (other === lanceRock) continue;
  other.x = -4000;
  other.y = -4000;
}
assert(useSelectedHotbar(lance, null), 'the pulse lance fires at a rock 900 away');
assert(lance.missiles[0].face === 'bullet_laser.png', 'the lance flies as a lance, not a missile');
assert(lanceGun.rounds === BASE_AMMO - 1, 'the lance spends one of its own rounds');

const pour = createState();
startMission(pour, 'roam', 'pour-ore', null);
assert(addItem(pour, 'repair', 6) === 0, 'repairs for the cargo wheel');
const pourSlot = pour.hotbar.findIndex((stack) => stack && stack.id === 'repair');
assert(pourSlot >= 0, 'repairs start on the hotbar');
assert(shiftOne(pour, pourSlot, -1), 'the first charge enters cargo');
const pourLanded = pour.cargoSlots.findIndex((slot) => slot && slot.id === 'repair');
assert(pourLanded >= 0 && pour.cargoSlots[pourLanded].count === 1, 'one charge lands in a cargo slot');
for (let n = 0; n < 4; n += 1) assert(shiftOne(pour, pourSlot, -1), 'the next charge follows the first');
assert(pour.cargoSlots[pourLanded].count === 5, 'later charges stay in the first cargo slot');
assert(
  pour.cargoSlots.filter((slot) => slot && slot.id === 'repair').length === 1,
  'the same item does not scatter across cargo'
);

console.log('inventory tests ok');
