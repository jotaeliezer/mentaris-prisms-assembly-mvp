/** Broadcast cadence. Twelve poses a second stays inside a 10–15 Hz window. */
export const SEND_INTERVAL_MS = 1000 / 12;

export const SESSION_FULL_MESSAGE =
  'This session is full. Every ship is already taken, so there is no room for another pilot.';

/** Same picture as "Mantas - Arc 5.png". It is not a separate ship. */
export const EXCLUDED_SHIPS = ['Mantas - Arc 5 (1).png'];

export const SHIP_OFFER_COUNT = 3;

export function shipPool(files) {
  const skip = new Set(EXCLUDED_SHIPS);
  return (files || []).filter((name) => typeof name === 'string' && name && !skip.has(name));
}

function byJoinThenId(a, b) {
  const at = Number(a && a.joinedAt) || 0;
  const bt = Number(b && b.joinedAt) || 0;
  if (at !== bt) return at - bt;
  return String(a && a.id).localeCompare(String(b && b.id));
}

/**
 * The host keeps the default ship. Everyone else keeps a ship only after they
 * pick one that is still free. Two pilots who pick the same ship are ordered
 * by join time, then by id; the later one stays unassigned so the game can
 * offer them a new trio. Pilots with nothing left to fly are in `full`.
 */
export function resolveSessionShips(peers, options = {}) {
  const catalog = shipPool(options.ships);
  const defaultShip = options.defaultShip || '';
  const sorted = [...(peers || [])].filter((peer) => peer && peer.id != null).sort(byJoinThenId);
  const hosts = sorted.filter((peer) => peer.role === 'host');
  const host = (hosts.length ? hosts : sorted)[0] || null;
  const used = new Set();
  const assignments = new Map();
  if (host && defaultShip && catalog.includes(defaultShip)) {
    assignments.set(String(host.id), defaultShip);
    used.add(defaultShip);
  }
  for (const peer of sorted) {
    const id = String(peer.id);
    if (assignments.has(id)) continue;
    const requested = typeof peer.ship === 'string' ? peer.ship : '';
    if (!requested || !catalog.includes(requested) || used.has(requested)) continue;
    used.add(requested);
    assignments.set(id, requested);
  }
  const free = catalog.filter((name) => !used.has(name));
  const full = [];
  const pending = [];
  for (const peer of sorted) {
    const id = String(peer.id);
    if (assignments.has(id)) continue;
    if (free.length === 0) full.push(id);
    else pending.push(id);
  }
  return {
    assignments,
    full,
    pending,
    free,
    hostId: host ? String(host.id) : '',
  };
}

/** Stable trio for the joiner preview (`?ship-preview=1`), host ship left out. */
export function previewShipOffer(files, defaultShip) {
  const free = shipPool(files).filter((name) => name !== defaultShip);
  let state = 11;
  return offerShips(free, () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  }, SHIP_OFFER_COUNT);
}

/** Up to three free ships, in random order. Fewer when the pool is smaller. */
export function offerShips(free, rng = Math.random, count = SHIP_OFFER_COUNT) {
  const pool = shipPool(free);
  const copy = pool.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const sample = Number(rng());
    const unit = Number.isFinite(sample) ? Math.min(0.999999, Math.max(0, sample)) : 0;
    const j = Math.floor(unit * (i + 1));
    const swap = copy[i];
    copy[i] = copy[j];
    copy[j] = swap;
  }
  const n = Math.max(0, count | 0);
  return copy.slice(0, Math.min(n, copy.length));
}

/** Blend window slightly longer than one send, so motion stays continuous. */
export const POSE_BLEND_MS = 100;

export function shouldSendPose(lastSentAt, now, urgent) {
  if (urgent) return true;
  return now - lastSentAt >= SEND_INTERVAL_MS;
}

function finiteHp(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, number);
}

export function lerpAngle(from, to, t) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * t;
}

export function assignPlayerTags(peers) {
  const sorted = [...peers].sort((a, b) => {
    const at = Number(a.joinedAt) || 0;
    const bt = Number(b.joinedAt) || 0;
    if (at !== bt) return at - bt;
    return String(a.id).localeCompare(String(b.id));
  });
  const tags = new Map();
  sorted.forEach((peer, index) => {
    tags.set(peer.id, 'P' + (index + 1));
  });
  return tags;
}

export function createRemoteShip(pose, now) {
  const x = pose.x;
  const y = pose.y;
  const aim = pose.aim;
  return {
    id: pose.id,
    tag: pose.tag || '',
    layer: pose.layer | 0,
    sprite: pose.sprite || '',
    thrusting: !!pose.thrusting,
    extracting: !!pose.extracting,
    pilot: pose.pilot || '',
    hp: finiteHp(pose.hp, 100),
    maxHp: finiteHp(pose.maxHp, 100) || 100,
    hasPose: true,
    x,
    y,
    aim,
    fromX: x,
    fromY: y,
    fromAim: aim,
    toX: x,
    toY: y,
    toAim: aim,
    t0: now,
    t1: now,
  };
}

export function pushRemotePose(ship, pose, now, blendMs = POSE_BLEND_MS) {
  ship.fromX = ship.x;
  ship.fromY = ship.y;
  ship.fromAim = ship.aim;
  ship.toX = pose.x;
  ship.toY = pose.y;
  ship.toAim = pose.aim;
  ship.t0 = now;
  ship.t1 = now + blendMs;
  ship.layer = pose.layer | 0;
  if (pose.sprite) ship.sprite = pose.sprite;
  ship.thrusting = !!pose.thrusting;
  ship.extracting = !!pose.extracting;
  if (pose.hp != null) ship.hp = finiteHp(pose.hp, ship.hp);
  if (pose.maxHp != null) ship.maxHp = finiteHp(pose.maxHp, ship.maxHp) || ship.maxHp || 100;
  if (pose.pilot) ship.pilot = pose.pilot;
  if (pose.tag) ship.tag = pose.tag;
  ship.hasPose = true;
  return ship;
}

export function stepRemoteShip(ship, now) {
  const span = ship.t1 - ship.t0;
  if (!(span > 0)) {
    ship.x = ship.toX;
    ship.y = ship.toY;
    ship.aim = ship.toAim;
    return ship;
  }
  const u = Math.min(1, Math.max(0, (now - ship.t0) / span));
  const t = u * u * (3 - 2 * u);
  ship.x = ship.fromX + (ship.toX - ship.fromX) * t;
  ship.y = ship.fromY + (ship.toY - ship.fromY) * t;
  ship.aim = lerpAngle(ship.fromAim, ship.toAim, t);
  return ship;
}
