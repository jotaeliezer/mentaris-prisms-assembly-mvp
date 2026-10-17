export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function len(x, y) {
  return Math.hypot(x, y);
}

export function wrapAngle(a) {
  const t = Math.PI * 2;
  a = ((a % t) + t) % t;
  if (a > Math.PI) a -= t;
  return a;
}

export function makeRng(seed) {
  let h = 2166136261;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rand(rng, a, b) {
  return rng() * (b - a) + a;
}

export function randi(rng, a, b) {
  return Math.floor(rand(rng, a, b + 1));
}
