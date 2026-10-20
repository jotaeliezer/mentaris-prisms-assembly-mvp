import { DEFAULT_SHIP, SHIP_FILES } from '../src/game/assetsManifest.js';
import { createState } from '../src/game/state.js';
import { applyWorldEvent, startMission } from '../src/game/systems.js';
import {
  earlierClaim,
  eventOnLayer,
  oreIdForRock,
  rememberEvent,
  shouldApplyEvent,
  takeClaim,
} from '../src/multiplayer/events.js';
import {
  EXCLUDED_SHIPS,
  SHIP_OFFER_COUNT,
  offerShips,
  previewShipOffer,
  resolveSessionShips,
  shipPool,
} from '../src/multiplayer/ships.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const pool = shipPool(SHIP_FILES);
assert(pool.includes(DEFAULT_SHIP), 'default ship stays in the pool');
assert(DEFAULT_SHIP === 'Verdant Spire.png', 'default ship is the Verdant Spire');
assert(!pool.includes(EXCLUDED_SHIPS[0]), 'duplicate Mantas file is not a ship');
assert(pool.length === SHIP_FILES.length - 1, 'one duplicate is removed');

const hostOnly = resolveSessionShips(
  [{ id: 'host', joinedAt: 5, role: 'host', ship: 'AM2 Scout.png' }],
  { ships: SHIP_FILES, defaultShip: DEFAULT_SHIP }
);
assert(hostOnly.assignments.get('host') === DEFAULT_SHIP, 'host is seated in the Verdant Spire');
assert(hostOnly.pending.length === 0 && hostOnly.full.length === 0, 'a host does not pick');
assert(!hostOnly.free.includes(DEFAULT_SHIP), 'the host ship is already in use');

const race = resolveSessionShips(
  [
    { id: 'host', joinedAt: 1, role: 'host', ship: '' },
    { id: 'b', joinedAt: 30, role: 'join', ship: 'Ruby Strike.png' },
    { id: 'a', joinedAt: 10, role: 'join', ship: 'Ruby Strike.png' },
  ],
  { ships: SHIP_FILES, defaultShip: DEFAULT_SHIP }
);
assert(race.assignments.get('a') === 'Ruby Strike.png', 'earlier joiner keeps the shared pick');
assert(!race.assignments.has('b'), 'later joiner loses the race');
assert(race.pending.includes('b'), 'loser waits for a fresh offer');
assert(!race.free.includes('Ruby Strike.png'), 'the kept ship is no longer offered');

const tied = resolveSessionShips(
  [
    { id: 'host', joinedAt: 1, role: 'host', ship: '' },
    { id: 'm', joinedAt: 8, role: 'join', ship: 'BU2X.png' },
    { id: 'c', joinedAt: 8, role: 'join', ship: 'BU2X.png' },
  ],
  { ships: SHIP_FILES, defaultShip: DEFAULT_SHIP }
);
assert(tied.assignments.get('c') === 'BU2X.png', 'equal join time goes to the lower id');
assert(tied.pending.includes('m'), 'the higher id picks again');

const waiting = resolveSessionShips(
  [
    { id: 'host', joinedAt: 1, role: 'host', ship: '' },
    { id: 'joiner', joinedAt: 2, role: 'join', ship: '' },
  ],
  { ships: SHIP_FILES, defaultShip: DEFAULT_SHIP }
);
assert(waiting.pending.includes('joiner'), 'a joiner with no pick is not auto-assigned');
assert(waiting.free.length === pool.length - 1, 'every ship except the host ship is free');

const claimed = pool.filter((name) => name !== DEFAULT_SHIP);
const crowded = [
  { id: 'host', joinedAt: 1, role: 'host', ship: '' },
  ...claimed.map((ship, index) => ({
    id: 'p' + index,
    joinedAt: index + 2,
    role: 'join',
    ship,
  })),
  { id: 'late', joinedAt: 500, role: 'join', ship: '' },
];
const full = resolveSessionShips(crowded, { ships: SHIP_FILES, defaultShip: DEFAULT_SHIP });
assert(full.free.length === 0, 'a full table has no free ship');
assert(full.full.includes('late'), 'the extra pilot is told the session is full');
assert(!full.assignments.has('late'), 'a full session does not hand out a duplicate');

function lcg(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const trio = offerShips(waiting.free, lcg(4), SHIP_OFFER_COUNT);
assert(trio.length === 3, 'a joiner is offered three ships');
assert(new Set(trio).size === 3, 'the three ships are different');
assert(!trio.includes(DEFAULT_SHIP), 'the offer leaves out the host ship');
assert(!trio.includes(EXCLUDED_SHIPS[0]), 'the offer leaves out the duplicate file');
const again = offerShips(waiting.free, lcg(4), SHIP_OFFER_COUNT);
assert(again.join('|') === trio.join('|'), 'the same random stream repeats the offer');

const short = offerShips(['AM2 Scout.png', 'Azure Lancer.png'], lcg(1), 3);
assert(short.length === 2 && short.includes('AM2 Scout.png'), 'fewer than three free ships are all shown');
assert(offerShips([], lcg(1), 3).length === 0, 'no free ship means an empty offer');

const lost = waiting.free.filter((name) => name !== trio[0]);
const fresh = offerShips(lost, lcg(9), 3);
assert(fresh.length === 3 && !fresh.includes(trio[0]), 'a fresh offer skips the ship the joiner lost');

const preview = previewShipOffer(SHIP_FILES, DEFAULT_SHIP);
assert(preview.length === 3 && !preview.includes(DEFAULT_SHIP), 'preview trio excludes the host ship');

assert(earlierClaim({ id: 'late', t: 50 }, { id: 'early', t: 10 }).id === 'early', 'earlier time wins');
assert(earlierClaim({ id: 'm', t: 8 }, { id: 'c', t: 8 }).id === 'c', 'equal time uses the lower id');

const claims = new Map();
assert(takeClaim(claims, 'ore-1', { id: 'b', t: 20 }) === 'new', 'first ore claim sticks');
assert(takeClaim(claims, 'ore-1', { id: 'a', t: 20 }) === 'steal', 'lower id steals a tie');
assert(claims.get('ore-1').id === 'a', 'the tie stores the lower id');
assert(takeClaim(claims, 'ore-1', { id: 'a', t: 20 }) === 'keep', 'the winner can repeat');
assert(takeClaim(claims, 'ore-1', { id: 'z', t: 30 }) === 'lose', 'a later pilot does not take the ore');

const seen = new Set();
const oreEvent = { k: 'ore', op: 'take', eid: 'a:1', layer: 0, id: 'a', t: 10, ore: 'o:1' };
assert(shouldApplyEvent(oreEvent, 0, seen), 'first event is applied');
assert(!shouldApplyEvent(oreEvent, 0, seen), 'the same event id is dropped');
assert(!shouldApplyEvent({ k: 'rock', op: 'die', eid: 'z:9', layer: 4 }, 0, new Set()), 'other layers are ignored');
assert(!eventOnLayer('nope', 0), 'a missing layer does not match layer 0');
assert(rememberEvent(seen, 'a:1') === false, 'rememberEvent agrees with the gate');
assert(oreIdForRock('b:1:0:0,0', 'die') === 'o:b:1:0:0,0:die', 'ore ids come from the rock');

const alpha = createState();
const beta = createState();
startMission(alpha, 'add', 'sync-seed', null);
startMission(beta, 'add', 'sync-seed', null);
alpha.shareWorld = true;
alpha.playerId = 'alpha';
const keysA = alpha.asteroids.map((rock) => rock.key).sort().join('|');
const keysB = beta.asteroids.map((rock) => rock.key).sort().join('|');
assert(keysA.length > 10 && keysA === keysB, 'the shared seed builds the same rocks');

const rock = alpha.asteroids.find((item) => item.alive);
const die = { k: 'rock', op: 'die', key: rock.key, id: 'beta', t: 5, layer: 0, eid: 'beta:1' };
assert(applyWorldEvent(alpha, die, 'alpha'), 'a kill event applies');
assert(!alpha.asteroids.some((item) => item.key === rock.key), 'one kill removes the rock');
assert(!applyWorldEvent(alpha, die, 'alpha'), 'the same kill is not applied twice');

const spawn = {
  k: 'ore',
  op: 'spawn',
  ore: 'o:shared',
  x: 12,
  y: 18,
  item: 'pale',
  n: 2,
  layer: 0,
  eid: 'beta:2',
  id: 'beta',
  t: 6,
};
assert(applyWorldEvent(alpha, spawn, 'alpha'), 'ore spawn applies');
assert(applyWorldEvent(alpha, { ...spawn, eid: 'beta:3' }, 'alpha') === true, 'a second spawn id is seen');
assert(alpha.drops.filter((drop) => drop.id === 'o:shared').length === 1, 'the same ore is not duplicated');

applyWorldEvent(alpha, { k: 'ore', op: 'take', ore: 'o:shared', id: 'late', t: 40, layer: 0, eid: 'late:1' }, 'alpha');
assert(!alpha.drops.some((drop) => drop.id === 'o:shared'), 'the first take removes the ore');
applyWorldEvent(alpha, { k: 'ore', op: 'take', ore: 'o:shared', id: 'early', t: 4, layer: 0, eid: 'early:1' }, 'alpha');
assert(alpha.oreClaims.get('o:shared').id === 'early', 'an earlier take wins when it arrives late');

const before = alpha.asteroids.length;
assert(
  !applyWorldEvent(
    alpha,
    { k: 'rock', op: 'die', key: rock.key, id: 'z', t: 1, layer: 2, eid: 'z:1' },
    'alpha'
  ),
  'a kill on another layer is ignored'
);
assert(alpha.asteroids.length === before, 'an ignored layer does not change this belt');

console.log('multiplayer sync ok');
