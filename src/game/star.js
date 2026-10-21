import { cleanSeed } from './state.js';
import { makeRng } from './util.js';

/** One full turn of the main star. The first half is up. The second half is down. */
export const MAIN_STAR_PERIOD = 480;

const STAR_OPEN = ['Vel', 'Sol', 'Ari', 'Mir', 'Hel', 'Lun', 'Pra', 'Sar', 'Nim', 'Tor', 'Kal', 'Esh', 'Bri', 'Quo', 'Yun', 'Dax'];
const STAR_MID = ['ar', 'ion', 'eth', 'os', 'un', 'ek', 'an', 'or', 'en', 'il', 'ur', 'as'];
const STAR_END = ['a', 'is', 'on', 'e', 'us', 'ix', 'or', ''];

/** The session sun. The same seed always gets the same name. Clusters share it. */
function starWord(rng) {
  const open = STAR_OPEN[Math.floor(rng() * STAR_OPEN.length)];
  const mid = STAR_MID[Math.floor(rng() * STAR_MID.length)];
  const end = STAR_END[Math.floor(rng() * STAR_END.length)];
  return open + mid + end;
}

/** Two words, so two seeds almost never share a sun. */
export function mainStarName(seed) {
  const rng = makeRng('star-name|' + cleanSeed(seed));
  return starWord(rng) + ' ' + starWord(rng);
}

/** 0 is dawn. 0.25 is high. 0.5 is dusk. 0.75 is the bottom of the night. */
export function mainStarPhase(seed, seconds) {
  const rng = makeRng('star-phase|' + cleanSeed(seed));
  const offset = rng();
  const t = (Number(seconds) || 0) / MAIN_STAR_PERIOD;
  let phase = (t + offset) % 1;
  if (phase < 0) phase += 1;
  return phase;
}

/** Up is the half of the turn when a lair would be open. Nothing leaves the lair yet. */
export function mainStarUp(seed, seconds) {
  return mainStarPhase(seed, seconds) < 0.5;
}

/** Position on a small arc. x and y are percentages of that arc. */
export function mainStarView(seed, seconds) {
  const phase = mainStarPhase(seed, seconds);
  const angle = phase * Math.PI * 2;
  const up = phase < 0.5;
  const name = mainStarName(seed);
  return {
    name,
    phase,
    up,
    x: 50 - 50 * Math.cos(angle),
    y: 50 - 46 * Math.sin(angle),
    label: name + (up ? ' · up' : ' · down'),
  };
}
