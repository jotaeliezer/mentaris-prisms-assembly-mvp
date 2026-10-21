import { createState } from '../src/game/state.js';
import { addItem, countItem } from '../src/game/items.js';
import { captureProgress, resumeAssembly, startMission } from '../src/game/systems.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const state = createState();
startMission(state, 'add', 'belt-save', null, 'asm-1');
addItem(state, 'pale', 3);
state.ship.x = 4200;
state.ship.y = 2600;
state.solved = 4;
state.layer = 2;
state.clock = 88.5;
state.layerBanks = {};
const saved = captureProgress(state);

assert(saved.version === 1, 'snapshot has a version');
assert(saved.clock === 88.5, 'snapshot keeps the main star clock');
assert(saved.solved === 4, 'snapshot keeps the solved count');
assert(Array.isArray(saved.layerBanks[2].beltCells), 'belt cells are stored as a list');
assert(!(saved.layerBanks[2].beltCells instanceof Set), 'the stored belt is plain json');

const next = createState();
assert(resumeAssembly(next, saved, null, 'asm-1'), 'resume accepts the snapshot');
assert(next.assemblyId === 'asm-1', 'resume keeps the assembly');
assert(next.mode === 'fly', 'resume is in flight');
assert(next.intro == null, 'a continued flight does not replay the intro');
assert(next.layer === 2, 'resume keeps the layer');
assert(next.clock === 88.5, 'resume keeps the main star where it was');
assert(next.solved === 4, 'resume keeps the score');
assert(Math.round(next.ship.x) === 4200, 'resume keeps the ship');
assert(countItem(next, 'pale') === 3, 'resume keeps the ore');
assert(next.beltCells instanceof Set, 'the belt is a set again');
assert(next.asteroids.length === saved.layerBanks[2].asteroids.length, 'the rocks come back');

console.log('save snapshot ok');
