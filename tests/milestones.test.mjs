import { createState } from '../src/game/state.js';
import { addItem } from '../src/game/items.js';
import { placePiece } from '../src/game/construct.js';
import { grantMilestone, reviewMilestones } from '../src/game/milestones.js';
import { mainStarUp } from '../src/game/star.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const state = createState();
state.mode = 'fly';
assert(grantMilestone(state, 'fast'), 'the first time grants the milestone');
assert(state.milestones.fast === true, 'it is recorded');
assert(state.notices.some((note) => note.kind === 'milestone' && note.text.startsWith('Past the line')), 'the toast names it');
assert(!grantMilestone(state, 'fast'), 'the same feat does not toast again');
assert(state.notices.filter((note) => note.kind === 'milestone').length === 1, 'one toast is enough');

state.ship.vx = 0;
state.ship.vy = 0;
state.starWasUp = false;
let rose = state.clock;
for (let i = 0; i < 500 && !(state.starWasUp === false && mainStarUp(state.seed, rose)); i += 1) rose += 1;
state.clock = rose;
if (mainStarUp(state.seed, rose)) {
  reviewMilestones(state);
  assert(state.milestones['star-rise'], 'flying at dawn is a milestone');
}

state.ship.vx = 640;
state.ship.vy = 0;
reviewMilestones(state);
assert(state.milestones.fast, 'passing 500 keeps the speed milestone');

addItem(state, 'pale', 1);
addItem(state, 'slate', 1);
addItem(state, 'amber', 1);
addItem(state, 'virid', 1);
addItem(state, 'glint', 1);
reviewMilestones(state);
assert(state.milestones['full-ore'], 'carrying every ore is a milestone');

const built = createState();
built.mode = 'fly';
assert(placePiece(built, 'wall', 0, 0), 'a wall can be placed');
assert(built.milestones.wall, 'the first wall is a milestone');
assert(!placePiece(built, 'wall', 500, 0) || built.notices.filter((note) => note.text.startsWith('First wall')).length === 1, 'a second wall does not toast again');

console.log('milestones ok');
