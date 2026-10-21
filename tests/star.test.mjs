import { createState } from '../src/game/state.js';
import { buildHudFields, startMission } from '../src/game/systems.js';
import { MAIN_STAR_PERIOD, mainStarName, mainStarPhase, mainStarUp, mainStarView } from '../src/game/star.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const belt = mainStarName('belt-7');
const other = mainStarName('belt-8');
assert(belt === mainStarName('Belt-7'), 'the same seed always names the same star');
assert(belt !== other, 'a different seed names a different star');
assert(/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(belt), 'the star name reads as two words');

const names = new Set();
for (let i = 0; i < 80; i += 1) names.add(mainStarName('game-' + i));
assert(names.size === 80, 'eighty seeds get eighty star names');

const phase = mainStarPhase('belt-7', 0);
assert(phase >= 0 && phase < 1, 'the phase stays on one turn');
const wrapped = mainStarPhase('belt-7', MAIN_STAR_PERIOD);
const gap = Math.abs(phase - wrapped);
assert(Math.min(gap, 1 - gap) < 1e-9, 'one full turn returns to the same place');
assert(mainStarUp('belt-7', 0) === phase < 0.5, 'up is the open half of the turn');
assert(mainStarUp('belt-7', 0) !== mainStarUp('belt-7', MAIN_STAR_PERIOD / 2), 'half a turn flips the lair');

const view = mainStarView('belt-7', 12);
assert(view.name === belt, 'the arc uses the seeded name');
assert(view.label.startsWith(belt), 'the label shows the name');
assert(view.x >= 0 && view.x <= 100, 'the dot stays on the arc');
assert(view.y >= 0 && view.y <= 100, 'the dot stays above or below the line');

const flight = createState();
startMission(flight, 'add', 'belt-7', null);
flight.clock = 12;
flight.cluster = 3;
const hud = buildHudFields(flight);
assert(hud.mainStar.name === belt, 'every cluster shares the star name');
assert(hud.mainStar.label === view.label, 'the flight view shows the same arc');

const restarted = createState();
restarted.clock = 40;
startMission(restarted, 'add', 'belt-8', null);
assert(restarted.clock === 0, 'a new flight starts the star from the seed');
assert(buildHudFields(restarted).mainStar.name === other, 'the new seed renames the star');

console.log('star tests ok', belt);
