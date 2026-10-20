/** Broadcast cadence. Twelve poses a second stays inside a 10–15 Hz window. */
export const SEND_INTERVAL_MS = 1000 / 12;

/** Blend window slightly longer than one send, so motion stays continuous. */
export const POSE_BLEND_MS = 100;

export function shouldSendPose(lastSentAt, now, urgent) {
  if (urgent) return true;
  return now - lastSentAt >= SEND_INTERVAL_MS;
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
