import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createState } from '../src/game/state.js';
import {
  ITEMS,
  addItem,
  countItem,
  hullHas,
  recipeById,
  recipeOpen,
} from '../src/game/items.js';
import {
  PIECE_SPAN,
  damagePiece,
  ghostPose,
  isConstructionId,
  placePiece,
} from '../src/game/construct.js';
import { buildProgressSnapshot } from '../src/save/snapshot.js';
import {
  applyFlyClick,
  craftItem,
  resumeAssembly,
  selectHotbar,
  useSelectedHotbar,
} from '../src/game/systems.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function near(a, b, eps = 1e-6) {
  return Math.abs(a - b) <= eps;
}

function flyState() {
  const state = createState();
  state.mode = 'fly';
  state.asteroids = [];
  state.ship.aim = 0;
  state.ship.vx = 0;
  state.ship.vy = 0;
  state.layer = 3;
  return state;
}

function sameCosts(actual, expected) {
  if (!actual || actual.length !== expected.length) return false;
  return expected.every((cost, index) => actual[index].id === cost.id && actual[index].n === cost.n);
}

function countIn(list, id) {
  let total = 0;
  for (const stack of list) if (stack && stack.id === id) total += stack.count;
  return total;
}

function costs(pairs) {
  return pairs.map(([id, n]) => ({ id, n }));
}

const STRENGTH = {
  wall: 6,
  panel: 8,
  corner: 8,
  bunker: 14,
  telescope: 8,
  satellite: 8,
  dock: 20,
  gunship: 16,
  drill: 18,
  extension: 12,
  vault: 16,
  beacon: 8,
};

const CONSTRUCTION_IDS = Object.keys(STRENGTH);

const TEN = {
  corner: costs([
    ['pale', 4],
    ['slate', 2],
    ['wall', 1],
    ['panel', 1],
  ]),
  bunker: costs([
    ['pale', 8],
    ['slate', 4],
    ['wall', 2],
    ['panel', 1],
  ]),
  telescope: costs([
    ['pale', 6],
    ['slate', 2],
    ['wall', 1],
    ['panel', 1],
  ]),
  satellite: costs([
    ['pale', 6],
    ['slate', 4],
    ['wall', 1],
    ['panel', 1],
  ]),
  dock: costs([
    ['pale', 40],
    ['slate', 24],
    ['amber', 16],
    ['glass', 8],
    ['iron', 4],
    ['wall', 2],
    ['panel', 2],
  ]),
  gunship: costs([
    ['pale', 30],
    ['amber', 20],
    ['virid', 10],
    ['iron', 6],
    ['filament', 4],
    ['gland', 1],
    ['wall', 2],
    ['panel', 1],
  ]),
  drill: costs([
    ['pale', 36],
    ['slate', 18],
    ['amber', 12],
    ['virid', 8],
    ['glint', 4],
    ['iron', 6],
    ['core', 1],
    ['wall', 2],
    ['panel', 2],
  ]),
  extension: costs([
    ['pale', 28],
    ['slate', 16],
    ['amber', 12],
    ['virid', 6],
    ['glass', 4],
    ['resin', 4],
    ['wall', 2],
    ['panel', 1],
  ]),
  vault: costs([
    ['pale', 24],
    ['amber', 16],
    ['virid', 8],
    ['glint', 4],
    ['iron', 8],
    ['wall', 2],
    ['panel', 2],
  ]),
  beacon: costs([
    ['pale', 20],
    ['slate', 10],
    ['amber', 6],
    ['glass', 4],
    ['wall', 1],
    ['panel', 1],
  ]),
};

const BENCH = ['wall', 'panel', 'corner', 'bunker', 'telescope', 'satellite', 'dock', 'gunship', 'drill', 'extension', 'vault', 'beacon'];
const HALF = PIECE_SPAN / 2;
const PANEL_SHORT = 50;

const bare = flyState();
const wallRecipe = recipeById('wall');
const panelRecipe = recipeById('panel');
assert(wallRecipe && panelRecipe, 'wall and panel are recipes');
assert(
  sameCosts(wallRecipe.costs, costs([['pale', 4], ['slate', 2]])),
  'a wall costs 4 pale and 2 slate'
);
assert(
  sameCosts(panelRecipe.costs, costs([['pale', 2], ['slate', 4]])),
  'a panel costs 2 pale and 4 slate'
);
assert(wallRecipe.station === 'bench' && panelRecipe.station === 'bench', 'wall and panel use the bench');
assert(!hullHas(bare, 'bench'), 'a fresh ship is not carrying a bench');
assert(!recipeOpen(bare, wallRecipe) && !recipeOpen(bare, panelRecipe), 'wall and panel stay closed without a bench');
assert(!craftItem(bare, 'wall', null), 'a wall cannot be crafted before the bench is in the hull');
assert(addItem(bare, 'bench', 1) === 0, 'the bench fits the hull');
assert(hullHas(bare, 'bench'), 'the bench is carried in the hull');
assert(recipeOpen(bare, wallRecipe) && recipeOpen(bare, panelRecipe), 'the bench opens wall and panel');

for (const id of Object.keys(TEN)) {
  const recipe = recipeById(id);
  assert(recipe, id + ' is a recipe');
  assert(sameCosts(recipe.costs, TEN[id]), id + ' costs match the tail plus wall and panel counts');
}
for (const id of BENCH) {
  const recipe = recipeById(id);
  assert(recipe && recipe.station === 'bench', id + ' waits on the bench');
  assert(!recipeOpen(flyState(), recipe), id + ' stays closed without a bench');
}

const spend = flyState();
assert(addItem(spend, 'bench', 1) === 0, 'bench for the construction craft');
spend.hotbar[0] = { id: 'pale', count: 2 };
spend.cargoSlots[0] = { id: 'pale', count: 4 };
spend.hotbar[1] = { id: 'slate', count: 2 };
spend.cargoSlots[1] = { id: 'slate', count: 2 };
assert(craftItem(spend, 'wall', null), 'the wall crafts once the bench is carried');
assert(countIn(spend.hotbar, 'pale') === 0, 'construction spends the hotbar pale before cargo');
assert(countIn(spend.cargoSlots, 'pale') === 2, 'cargo pale is what remains after the hotbar');
assert(countIn(spend.hotbar, 'slate') === 0, 'construction spends the hotbar slate before cargo');
assert(countIn(spend.cargoSlots, 'slate') === 2, 'cargo slate stays when the hotbar covered the cost');
assert(countItem(spend, 'wall') === 1, 'the crafted wall is in the hold');

const glass = flyState();
glass.cargoSlots[0] = { id: 'pale', count: 3 };
assert(craftItem(glass, 'glass', null), 'prism glass still crafts by hand');
assert(countIn(glass.cargoSlots, 'pale') === 1, 'one pale ore remains in the cargo');
assert(!glass.hotbar.some((stack) => stack && stack.id === 'pale'), 'the remainder stays off the hotbar');
assert(countItem(glass, 'glass') === 1, 'the glass is in the cargo');

const stacked = flyState();
assert(addItem(stacked, 'bench', 1) === 0, 'bench so walls can stack');
assert(addItem(stacked, 'pale', 8) === 0 && addItem(stacked, 'slate', 4) === 0, 'ore for two walls');
assert(craftItem(stacked, 'wall', null) && craftItem(stacked, 'wall', null), 'two walls craft');
const wallStacks = stacked.hotbar.filter((stack) => stack && stack.id === 'wall');
const cargoWalls = stacked.cargoSlots.filter((stack) => stack && stack.id === 'wall');
assert(wallStacks.length === 1 && wallStacks[0].count === 2, 'crafted walls stack through addItem');
assert(cargoWalls.length === 0 && countItem(stacked, 'wall') === 2, 'both walls share one hotbar stack');

for (const id of CONSTRUCTION_IDS) {
  const item = ITEMS[id];
  assert(item && item.kind === 'construction', id + ' is a construction item');
  assert(!item.use, id + ' has no use');
  assert(isConstructionId(id), id + ' is a construction id');
}
assert(!isConstructionId('pale') && !isConstructionId('glass'), 'ores and alloys are not construction ids');

const click = flyState();
click.layer = 6;
click.hotbar[0] = { id: 'wall', count: 4 };
click.hotbar[1] = { id: 'repair', count: 9 };
click.cargoSlots[0] = { id: 'wall', count: 3 };
selectHotbar(click, 0);
assert(useSelectedHotbar(click, null) === false, 'a wall has no weapon use, so the click is not taken by that path');
assert(click.hotbar[0].count === 4 && click.missiles.length === 0, 'the unused wall is still in the slot');
assert(applyFlyClick(click, 1000, 1000, null) === true, 'empty space accepts the wall');
assert(click.station && click.station.layer === 6, 'the first place anchors the station on the current layer');
assert(click.station.pieces.length === 1 && click.station.pieces[0].id === 'wall', 'one wall is placed');
assert(click.hotbar[0].count === 3, 'only the selected hotbar stack loses one');
assert(click.hotbar[1].count === 9, 'another hotbar stack is left alone');
assert(click.cargoSlots[0].count === 3, 'cargo walls are not spent by a place');

const dig = flyState();
dig.ship.x = 1000;
dig.ship.y = 1000;
dig.hotbar[0] = { id: 'wall', count: 2 };
selectHotbar(dig, 0);
dig.asteroids = [
  {
    id: 50,
    x: 1100,
    y: 1000,
    alive: true,
    depleted: false,
    radius: 30,
    size: 100,
    key: 'extract-rock',
  },
];
assert(applyFlyClick(dig, 1100, 1000, null) === true, 'a rock in reach consumes the click');
assert(dig.mode === 'extract' && dig.extractRockId === 50, 'a live rock inside approach opens extract');
assert(dig.hotbar[0].count === 2, 'extract does not spend the wall');
assert(!dig.station, 'extract does not add a station piece');

const edge = flyState();
edge.ship.x = 1000;
edge.ship.y = 1000;
edge.asteroids = [
  {
    id: 51,
    x: 1100,
    y: 1000,
    alive: true,
    depleted: false,
    radius: 30,
    size: 100,
    sprite: 0,
  },
];
assert(applyFlyClick(edge, 1170, 1000, null) === true, 'a click near the painted border opens extract');
assert(edge.mode === 'extract' && edge.extractRockId === 51, 'the border click shows the question');

const gun = flyState();
gun.ship.x = 0;
gun.ship.y = 0;
gun.hotbar[0] = { id: 'arc-missile', count: 3 };
selectHotbar(gun, 0);
gun.asteroids = [
  {
    id: 77,
    x: 400,
    y: 0,
    alive: true,
    depleted: false,
    radius: 30,
    size: 100,
    key: 'arc-rock',
  },
];
assert(applyFlyClick(gun, 0, 900, null) === false, 'a weapon click is not a construction place');
assert(!gun.station, 'a weapon click does not add a station piece');
assert(gun.hotbar[0].count === 3 && gun.missiles.length === 0, 'applyFlyClick does not fire or spend the missile');
assert(useSelectedHotbar(gun, null) === true, 'an arc missile fires at a rock in weapon range');
assert(gun.missiles.length === 1 && gun.missiles[0].targetId === 77, 'the missile uses the existing shot path');
assert(gun.hotbar[0].count === 2, 'the fired missile leaves the hotbar');
assert(!gun.station, 'firing does not place a station piece');

const linked = flyState();
assert(placePiece(linked, 'wall', 0, 0), 'the first wall places');
assert(placePiece(linked, 'wall', PIECE_SPAN, 10), 'a second wall whose tips are 10 apart places');
const [left, right] = linked.station.pieces;
assert(left.connections.includes(right.uid) && right.connections.includes(left.uid), 'tips within 28 join both ways');
assert(near(right.x, PIECE_SPAN) && near(right.y, 0), 'the second wall snaps onto the open tip');

const loose = flyState();
loose.ship.aim = 0.9;
const step = Math.PI / 2;
const snappedRot = Math.round(loose.ship.aim / step) * step;
assert(placePiece(loose, 'wall', 0, 0), 'a lone wall still places');
assert(placePiece(loose, 'wall', 500, 0), 'a wall farther than 28 still places');
const far = loose.station.pieces[1];
assert(far.connections.length === 0 && loose.station.pieces[0].connections.length === 0, 'a miss places with empty connections');
assert(far.x === 500 && far.y === 0, 'a miss stays on the cursor');
assert(far.rot === snappedRot && loose.station.pieces[0].rot === snappedRot, 'rotation is snap4 of the ship aim');

const fuel = flyState();
assert(placePiece(fuel, 'dock', 0, 0), 'the dock places');
assert(placePiece(fuel, 'wall', PIECE_SPAN, 5), 'a wall can still sit beside a dock');
const dock = fuel.station.pieces[0];
const dockWall = fuel.station.pieces[1];
assert(dock.connections.length === 0 && dockWall.connections.length === 0, 'a wall does not join a dock');
assert(dockWall.x === PIECE_SPAN && dockWall.y === 5, 'the wall stays where it was put');

const quad = flyState();
assert(placePiece(quad, 'panel', 0, 0), 'the panel places');
quad.ship.aim = Math.PI / 2;
const sidePose = ghostPose(quad, 'wall', 0, PANEL_SHORT + HALF);
assert(sidePose.ok, 'a wall ghost can meet the panel side');
assert(near(sidePose.x, 0, 1e-4) && near(sidePose.y, PANEL_SHORT + HALF, 1e-4), 'the side ghost stays on the short edge');
assert(placePiece(quad, 'wall', 0, PANEL_SHORT + HALF), 'the wall places on the panel side');
const quadPanel = quad.station.pieces[0];
const quadWall = quad.station.pieces[1];
assert(
  quadPanel.connections.includes(quadWall.uid) && quadWall.connections.includes(quadPanel.uid),
  'a panel snaps on a side edge'
);

const dish = flyState();
assert(placePiece(dish, 'bunker', 0, 0), 'the bunker places');
const dishPose = ghostPose(dish, 'satellite', PIECE_SPAN, 0);
assert(dishPose.ok && near(dishPose.x, PIECE_SPAN) && near(dishPose.y, 0), 'a satellite ghost meets the bunker tip');
assert(placePiece(dish, 'satellite', PIECE_SPAN, 0), 'the satellite places on the bunker');
const bunker = dish.station.pieces[0];
const satellite = dish.station.pieces[1];
assert(
  bunker.connections.includes(satellite.uid) && satellite.connections.includes(bunker.uid),
  'a satellite snaps tip to tip with a bunker'
);

const lamp = flyState();
assert(placePiece(lamp, 'corner', 0, 0), 'the corner places');
const lampPose = ghostPose(lamp, 'beacon', -PIECE_SPAN, 0);
assert(lampPose.ok && near(lampPose.x, -PIECE_SPAN) && near(lampPose.y, 0), 'a beacon ghost meets the corner tip');
assert(placePiece(lamp, 'beacon', -PIECE_SPAN, 0), 'the beacon places on the corner');
lamp.ship.aim = Math.PI / 2;
assert(placePiece(lamp, 'telescope', 0, PIECE_SPAN), 'a telescope meets the corner’s other end');
const corner = lamp.station.pieces[0];
const beacon = lamp.station.pieces[1];
const scope = lamp.station.pieces[2];
assert(corner.connections.includes(beacon.uid) && beacon.connections.includes(corner.uid), 'a beacon snaps tip to tip with a corner');
assert(corner.connections.includes(scope.uid) && scope.connections.includes(corner.uid), 'the corner’s perpendicular end also joins');
assert(!beacon.connections.includes(scope.uid), 'the beacon and telescope do not join each other');

const home = flyState();
home.layer = 3;
home.hotbar[0] = { id: 'satellite', count: 2 };
home.hotbar[1] = { id: 'wall', count: 2 };
selectHotbar(home, 0);
assert(applyFlyClick(home, 0, 0, null) === true, 'the first satellite places');
assert(home.station.layer === 3 && home.station.pieces.length === 1, 'the anchor layer is the layer of the first place');
assert(home.hotbar[0].count === 1, 'the satellite stack loses one');
assert(placePiece(home, 'satellite', 400, 0) === false, 'a second satellite fails');
assert(applyFlyClick(home, 400, 0, null) === true, 'the refused satellite still consumes the construction click');
assert(home.hotbar[0].count === 1 && home.station.pieces.length === 1, 'a second satellite spends nothing');
selectHotbar(home, 1);
home.layer = 8;
const kept = home.station.pieces.map((piece) => piece.uid).join();
assert(placePiece(home, 'wall', 500, 0) === false, 'a later place on another layer fails');
assert(home.hotbar[1].count === 2, 'the failed place leaves the stack count');
assert(home.station.pieces.map((piece) => piece.uid).join() === kept && home.station.layer === 3, 'the piece list and anchor stay put');
applyFlyClick(home, 800, 0, null);
assert(home.hotbar[1].count === 2 && home.station.pieces.length === 1, 'a click on the wrong layer does not decrement');
home.layer = 3;
assert(applyFlyClick(home, 400, 400, null) === true, 'a second wall on the home layer places');
assert(home.hotbar[1].count === 1 && home.station.pieces.length === 2, 'the home-layer wall is spent and kept');
assert(home.station.pieces.some((piece) => piece.id === 'wall'), 'the second piece is the wall');

const built = flyState();
built.layer = 4;
built.ship.aim = 0;
CONSTRUCTION_IDS.forEach((id, index) => {
  assert(placePiece(built, id, index * 400, 2000), id + ' places');
});
assert(built.station.layer === 4, 'the catalog place anchors on layer 4');
assert(built.station.pieces.length === CONSTRUCTION_IDS.length, 'each construction id places once');
for (const piece of built.station.pieces) {
  for (const key of ['uid', 'id', 'x', 'y', 'rot', 'layer', 'strength', 'connections']) {
    assert(Object.prototype.hasOwnProperty.call(piece, key), piece.id + ' stores ' + key);
  }
  assert(Number.isFinite(piece.uid), piece.id + ' has a uid');
  assert(Number.isFinite(piece.x) && Number.isFinite(piece.y) && Number.isFinite(piece.rot), piece.id + ' has a pose');
  assert(piece.layer === 4, piece.id + ' keeps the anchor layer');
  assert(Array.isArray(piece.connections), piece.id + ' stores connections');
  assert(piece.strength === STRENGTH[piece.id], piece.id + ' strength matches the table');
}
const extension = built.station.pieces.find((piece) => piece.id === 'extension');
assert(extension && !Object.prototype.hasOwnProperty.call(extension, 'showLayer'), 'the extension has no showLayer');

const saved = buildProgressSnapshot(built);
assert(saved.nextId === built.nextId, 'the snapshot stores nextId');
const savedWall = saved.station.pieces.find((piece) => piece.id === 'wall');
const savedPanel = saved.station.pieces.find((piece) => piece.id === 'panel');
delete savedWall.strength;
savedPanel.strength = 3;
delete saved.nextId;
const resumed = createState();
assert(resumeAssembly(resumed, saved, null, 'asm'), 'the station resumes with the assembly');
const restoredUids = new Set(resumed.station.pieces.map((piece) => piece.uid));
const resumedWall = resumed.station.pieces.find((piece) => piece.id === 'wall');
const resumedPanel = resumed.station.pieces.find((piece) => piece.id === 'panel');
assert(resumedWall.strength === STRENGTH.wall, 'a saved piece with no strength resumes at the table value');
assert(resumedPanel.strength === 3, 'a saved piece that already has strength keeps it');
assert(resumed.station.layer === 4 && resumed.station.pieces.length === CONSTRUCTION_IDS.length, 'resume keeps the station');
resumed.layer = resumed.station.layer;
assert(placePiece(resumed, 'wall', 8000, 8000), 'a wall places on the resumed station layer');
const added = resumed.station.pieces.find((piece) => !restoredUids.has(piece.uid));
assert(added && !restoredUids.has(added.uid), 'the new wall uid is not a restored uid');

const hurt = flyState();
assert(placePiece(hurt, 'wall', 0, 0) && placePiece(hurt, 'wall', PIECE_SPAN, 0), 'two joined walls can take damage');
const [hit, other] = hurt.station.pieces;
assert(other.connections.includes(hit.uid), 'the neighbor lists the wall before the hit');
damagePiece(hurt, hit.uid, 2);
assert(hit.strength === 4, 'damage reduces strength');
damagePiece(hurt, hit.uid, 4);
assert(!hurt.station.pieces.some((piece) => piece.uid === hit.uid), 'strength 0 removes the piece');
assert(!other.connections.includes(hit.uid), 'other pieces drop the removed uid');

function filesUnder(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(path));
    else out.push(path);
  }
  return out;
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appSource = readFileSync(join(root, 'src', 'ui', 'App.jsx'), 'utf8');
assert(!appSource.includes('KeyB'), 'App.jsx has no KeyB build binding');
assert(!appSource.includes('toggleBuild') && !appSource.includes('placeBuild'), 'App.jsx has no toggleBuild or placeBuild');
for (const path of filesUnder(join(root, 'src', 'game'))) {
  const source = readFileSync(path, 'utf8');
  assert(!source.includes('KeyB'), path + ' has no KeyB build binding');
  assert(!source.includes('toggleBuild') && !source.includes('placeBuild'), path + ' has no toggleBuild or placeBuild');
}

console.log('construct tests ok');
