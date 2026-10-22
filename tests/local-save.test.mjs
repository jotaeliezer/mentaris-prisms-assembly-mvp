import { createState } from '../src/game/state.js';
import { captureProgress, resumeAssembly, startMission } from '../src/game/systems.js';
import { deleteLocalFlight, listLocalFlights, loadLocalFlight, saveLocalFlight } from '../src/save/local.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function memory() {
  const bag = new Map();
  return {
    getItem: (key) => (bag.has(key) ? bag.get(key) : null),
    setItem: (key, value) => bag.set(key, String(value)),
    removeItem: (key) => bag.delete(key),
  };
}

const store = memory();
const state = createState();
startMission(state, 'add', 'belt-save', null);
state.ship.x = 5100;
state.clock = 42;
state.solved = 3;
const progress = captureProgress(state);
const first = saveLocalFlight(progress, { id: '', name: 'Daxek' }, store);
assert(first.ok && first.id, 'a flight saves without an account');
assert(listLocalFlights(store).length === 1, 'the browser lists that flight');
const loaded = loadLocalFlight(first.id, store);
assert(loaded && loaded.progress.clock === 42, 'the saved clock comes back');
assert(loaded.progress.localFlightId === first.id, 'the save keeps its id');

const again = saveLocalFlight({ ...loaded.progress, solved: 9 }, { id: first.id, name: 'Daxek' }, store);
assert(again.id === first.id, 'saving again updates the same flight');
assert(listLocalFlights(store).length === 1, 'an update does not add a second row');
assert(listLocalFlights(store)[0].solved === 9, 'the updated score is the one on the list');

for (let i = 0; i < 6; i += 1) {
  saveLocalFlight({ ...progress, seed: 'extra-' + i, localFlightId: '' }, { name: 'Extra ' + i }, store);
}
assert(listLocalFlights(store).length === 5, 'only five flights stay on this browser');

const next = createState();
assert(resumeAssembly(next, loaded.progress, null, ''), 'a local flight can launch');
assert(next.localFlightId === first.id, 'the launch keeps the local id');
assert(next.clock === 42, 'the launch keeps the star where it was');
assert(!next.assemblyId, 'a local launch does not require an account');

assert(deleteLocalFlight(first.id, store).ok, 'a local flight can be deleted');
assert(!loadLocalFlight(first.id, store), 'a deleted flight is gone');

console.log('local save ok');
