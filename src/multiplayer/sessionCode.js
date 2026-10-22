import { cleanSeed } from '../game/state.js';

/** Uppercase letters and digits, without 0/O/1/I. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

const AMBIGUOUS = /[01OI]/;

export function generateSessionCode(random = Math.random) {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    const sample = Number(random());
    const unit = Number.isFinite(sample) ? Math.min(0.999999, Math.max(0, sample)) : 0;
    const index = Math.floor(unit * CODE_ALPHABET.length);
    code += CODE_ALPHABET[index];
  }
  return code;
}

export function normalizeSessionCode(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH);
}

export function isValidSessionCode(code) {
  if (typeof code !== 'string' || code.length !== CODE_LENGTH) return false;
  for (const ch of code) {
    if (!CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}

export function sessionCodeError(code) {
  if (isValidSessionCode(code)) return '';
  if (AMBIGUOUS.test(code)) {
    return 'That code uses 0, O, 1, or I, which session codes leave out. Check the host code.';
  }
  return 'Enter the 6-character session code.';
}

/** The shared world seed. Same letters as the code, passed through the game's seed cleaner. */
export function seedFromSessionCode(code) {
  return cleanSeed(normalizeSessionCode(code));
}

/** A new solo flight. A different roll each time a new game starts. */
export function freshFlightSeed(random = Math.random) {
  return cleanSeed(generateSessionCode(random));
}
