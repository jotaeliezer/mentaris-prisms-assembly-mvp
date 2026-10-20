import { cleanSeed } from '../src/game/state.js';
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  generateSessionCode,
  isValidSessionCode,
  normalizeSessionCode,
  seedFromSessionCode,
  sessionCodeError,
} from '../src/multiplayer/sessionCode.js';
import {
  SEND_INTERVAL_MS,
  assignPlayerTags,
  createRemoteShip,
  lerpAngle,
  pushRemotePose,
  shouldSendPose,
  stepRemoteShip,
} from '../src/multiplayer/ships.js';
import { readSupabasePublicConfig } from '../src/multiplayer/session.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const ambiguous = new Set(['0', 'O', '1', 'I']);
assert(CODE_LENGTH === 6, 'session codes are 6 characters');
assert(CODE_ALPHABET.length >= 30, 'alphabet is wide enough to share');
for (const ch of CODE_ALPHABET) {
  assert(!ambiguous.has(ch), 'alphabet includes ' + ch);
  assert(ch === ch.toUpperCase(), 'alphabet is uppercase');
}

function lcg(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const zeros = generateSessionCode(() => 0);
assert(zeros === CODE_ALPHABET[0].repeat(CODE_LENGTH), 'zero random picks the first letter');
assert(isValidSessionCode(zeros), 'generated code is valid');

const seen = new Set();
for (let i = 0; i < 40; i += 1) {
  const code = generateSessionCode(lcg(i + 3));
  assert(code.length === CODE_LENGTH, 'length ' + code);
  assert(isValidSessionCode(code), 'valid ' + code);
  assert(!/[01OI]/.test(code), 'no ambiguous characters in ' + code);
  seen.add(code);
}
assert(seen.size > 1, 'different random streams make different codes');

assert(normalizeSessionCode(' ab-c12 ') === 'ABC12', 'normalize strips separators');
assert(normalizeSessionCode('k7npqm') === 'K7NPQM', 'normalize uppercases');
assert(normalizeSessionCode('K7NPQMXYZ') === 'K7NPQM', 'normalize keeps six characters');
assert(isValidSessionCode('K7NPQM'), 'a clean code is valid');
assert(!isValidSessionCode('ABCDE0'), 'zero is rejected');
assert(!isValidSessionCode('ABCDEO'), 'letter O is rejected');
assert(!isValidSessionCode('ABCD'), 'short codes are rejected');
assert(sessionCodeError('K7NPQM') === '', 'valid codes have no error');
assert(sessionCodeError('ABCDE0').includes('0'), 'ambiguous codes explain why');
assert(sessionCodeError('ABCD').includes('6'), 'short codes ask for six characters');

const shared = 'K7NPQM';
assert(seedFromSessionCode(shared) === cleanSeed(shared), 'session code cleans to the world seed');
assert(seedFromSessionCode('k7npqm') === seedFromSessionCode('K7NPQM'), 'either case is the same belt');
assert(seedFromSessionCode(shared) === 'k7npqm', 'seed is the lowercase code');

const tags = assignPlayerTags([
  { id: 'b', joinedAt: 20 },
  { id: 'a', joinedAt: 10 },
  { id: 'c', joinedAt: 20 },
]);
assert(tags.get('a') === 'P1', 'earliest player is P1');
assert(tags.get('b') === 'P2', 'tied join time breaks by id');
assert(tags.get('c') === 'P3', 'later id is P3');

assert(shouldSendPose(0, 40, false) === false, 'poses wait for the send interval');
assert(shouldSendPose(0, SEND_INTERVAL_MS, false) === true, 'poses send at about 12 Hz');
assert(shouldSendPose(0, 1, true) === true, 'a layer change sends immediately');

const ship = createRemoteShip({ id: 'p2', tag: 'P2', x: 0, y: 0, aim: 0, layer: 0, sprite: 'ship' }, 0);
pushRemotePose(ship, { x: 100, y: 0, aim: Math.PI, layer: 2, sprite: 'ship', tag: 'P2' }, 0, 100);
stepRemoteShip(ship, 0);
assert(ship.x === 0, 'blend starts at the current spot');
stepRemoteShip(ship, 50);
assert(Math.abs(ship.x - 50) < 0.001, 'midpoint of the blend is halfway');
assert(ship.layer === 2, 'pose carries the layer');
stepRemoteShip(ship, 100);
assert(ship.x === 100, 'blend arrives at the next pose');
pushRemotePose(ship, { x: 100, y: 0, aim: 0, layer: 2, extracting: true }, 100, 100);
assert(ship.extracting === true, 'pose carries an extract so others can show the drill');
const wrapped = lerpAngle(3, -3, 1);
assert(Math.abs(Math.sin(wrapped) - Math.sin(-3)) < 0.0001, 'aim takes the short wrap');

assert(readSupabasePublicConfig({ VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: 'key' }) === null, 'blank url disables live play');
assert(
  readSupabasePublicConfig({ VITE_SUPABASE_URL: 'http://example.com', VITE_SUPABASE_ANON_KEY: 'key' }) === null,
  'non-local http is ignored',
);
const cfg = readSupabasePublicConfig({
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'public-key',
});
assert(cfg && cfg.url === 'https://example.supabase.co' && cfg.key === 'public-key', 'public config is read from Vite env names');

console.log('session-code tests ok');
