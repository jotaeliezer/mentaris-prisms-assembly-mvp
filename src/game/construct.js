/** Placement, snap, and strength. Recipes live in items.js. This module does not spend inventory. */

export const PIECE_SPAN = 110;

const SNAP_DIST = 28;
const PANEL_SHORT = 22;

const STRENGTH = {
  wall: 6,
  panel: 8,
  corner: 8,
  bunker: 14,
  telescope: 8,
  satellite: 8,
  dock: 20,
  gunship: 16,
  drill: 18,
  extension: 12,
  vault: 16,
  beacon: 8,
};

const ONCE = new Set(['satellite', 'dock', 'gunship', 'drill', 'extension', 'vault', 'beacon']);

export function isConstructionId(id) {
  return Object.prototype.hasOwnProperty.call(STRENGTH, id);
}

function snap4(angle) {
  const step = Math.PI / 2;
  return Math.round(angle / step) * step;
}

function freeRot(state) {
  const aim = state && state.ship && Number.isFinite(state.ship.aim) ? state.ship.aim : 0;
  return snap4(aim);
}

function worldPoint(x, y, rot, lx, ly) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return { x: x + lx * c - ly * s, y: y + lx * s + ly * c };
}

/** Tips in world space. Panel short edges sit at ±22, not at half a span. */
function endsAt(id, x, y, rot) {
  const h = PIECE_SPAN / 2;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  if (id === 'panel') {
    return [
      worldPoint(x, y, rot, h, 0),
      worldPoint(x, y, rot, -h, 0),
      worldPoint(x, y, rot, 0, PANEL_SHORT),
      worldPoint(x, y, rot, 0, -PANEL_SHORT),
    ];
  }
  if (id === 'corner') {
    return [
      { x: x - c * h, y: y - s * h },
      { x: x - s * h, y: y + c * h },
    ];
  }
  return [
    { x: x - c * h, y: y - s * h },
    { x: x + c * h, y: y + s * h },
  ];
}

function pieceEnds(piece) {
  return endsAt(piece.id, piece.x, piece.y, piece.rot || 0);
}

function stationPieces(state) {
  const station = state && state.station;
  if (!station || !Array.isArray(station.pieces)) return [];
  return station.pieces;
}

function endTaken(end, pieces, owner) {
  for (const other of pieces) {
    if (other === owner) continue;
    for (const tip of pieceEnds(other)) {
      if (Math.hypot(tip.x - end.x, tip.y - end.y) < SNAP_DIST) return true;
    }
  }
  return false;
}

function canJoin(placingId, existingId) {
  if (placingId === 'wall' || placingId === 'panel') {
    return existingId === 'wall' || existingId === 'panel';
  }
  return true;
}

function openTips(pieces) {
  const open = [];
  for (const piece of pieces) {
    for (const tip of pieceEnds(piece)) {
      if (!endTaken(tip, pieces, piece)) open.push({ piece, tip });
    }
  }
  return open;
}

function resolvePose(state, itemId, x, y, rot) {
  const pieces = stationPieces(state);
  const mine = endsAt(itemId, x, y, rot);
  let best = null;
  for (const open of openTips(pieces)) {
    if (!canJoin(itemId, open.piece.id)) continue;
    for (const tip of mine) {
      const dist = Math.hypot(tip.x - open.tip.x, tip.y - open.tip.y);
      if (dist < SNAP_DIST && (!best || dist < best.dist)) {
        best = { dist, tip, open };
      }
    }
  }
  if (!best) return { x, y, rot };
  return {
    x: x + (best.open.tip.x - best.tip.x),
    y: y + (best.open.tip.y - best.tip.y),
    rot,
  };
}

function joinedPieces(state, itemId, x, y, rot) {
  const pieces = stationPieces(state);
  const mine = endsAt(itemId, x, y, rot);
  const found = [];
  const seen = new Set();
  for (const open of openTips(pieces)) {
    if (!canJoin(itemId, open.piece.id)) continue;
    if (seen.has(open.piece.uid)) continue;
    for (const tip of mine) {
      if (Math.hypot(tip.x - open.tip.x, tip.y - open.tip.y) < SNAP_DIST) {
        seen.add(open.piece.uid);
        found.push(open.piece);
        break;
      }
    }
  }
  return found;
}

function onceTaken(state, itemId) {
  if (!ONCE.has(itemId)) return false;
  return stationPieces(state).some((piece) => piece.id === itemId);
}

export function ghostPose(state, itemId, x, y) {
  const rot = freeRot(state);
  if (!isConstructionId(itemId)) return { ok: false, x, y, rot, reason: 'unknown' };
  const station = state && state.station;
  if (station && state.layer !== station.layer) {
    return { ok: false, x, y, rot, reason: 'layer' };
  }
  const pose = resolvePose(state, itemId, x, y, rot);
  if (onceTaken(state, itemId)) {
    return { ok: false, x: pose.x, y: pose.y, rot: pose.rot, reason: 'once' };
  }
  const surface = surfacePose(state, pose.x, pose.y);
  if (surface) {
    return { ok: true, x: surface.x, y: surface.y, rot: surface.rot, ground: true, reason: '' };
  }
  return { ok: true, x: pose.x, y: pose.y, rot: pose.rot, ground: false, reason: '' };
}

export function placePiece(state, itemId, x, y) {
  const ghost = ghostPose(state, itemId, x, y);
  if (!ghost.ok) return false;
  const partners = joinedPieces(state, itemId, ghost.x, ghost.y, ghost.rot);
  if (!state.station) {
    state.station = { layer: state.layer, x: ghost.x, y: ghost.y, pieces: [] };
  }
  if (!Array.isArray(state.station.pieces)) state.station.pieces = [];
  for (const piece of state.station.pieces) {
    if (!piece || !Number.isFinite(piece.uid)) continue;
    if (!Number.isFinite(state.nextId) || piece.uid >= state.nextId) state.nextId = piece.uid + 1;
  }
  const uid = state.nextId++;
  const piece = {
    uid,
    id: itemId,
    x: ghost.x,
    y: ghost.y,
    rot: ghost.rot,
    layer: state.station.layer,
    strength: STRENGTH[itemId],
    connections: partners.map((other) => other.uid),
    ground: !!ghost.ground,
  };
  for (const other of partners) {
    if (!Array.isArray(other.connections)) other.connections = [];
    if (!other.connections.includes(uid)) other.connections.push(uid);
  }
  state.station.pieces.push(piece);
  return true;
}

export function damagePiece(state, uid, amount) {
  const station = state && state.station;
  if (!station || !Array.isArray(station.pieces)) return;
  const piece = station.pieces.find((item) => item.uid === uid);
  if (!piece) return;
  piece.strength -= amount;
  if (!(piece.strength <= 0)) return;
  station.pieces = station.pieces.filter((item) => item.uid !== uid);
  for (const other of station.pieces) {
    if (!Array.isArray(other.connections)) continue;
    other.connections = other.connections.filter((link) => link !== uid);
  }
}

export function visiblePieces(state) {
  if (!state || !state.station || !state.station.pieces) return [];
  return state.station.pieces.filter((piece) => piece.layer === state.layer);
}

function surfacePose(state, x, y) {
  const planet = state && state.planet;
  if (!planet || planet.layer !== state.layer) return null;
  const dx = x - planet.x;
  const dy = y - planet.y;
  const dist = Math.hypot(dx, dy) || 1;
  if (Math.abs(dist - planet.r) > 110) return null;
  const nx = dx / dist;
  const ny = dy / dist;
  return {
    x: planet.x + nx * (planet.r + 36),
    y: planet.y + ny * (planet.r + 36),
    rot: Math.atan2(ny, nx) + Math.PI / 2,
  };
}

function structureGroups(pieces) {
  const byId = new Map(pieces.map((piece) => [piece.uid, piece]));
  const seen = new Set();
  const groups = [];
  for (const piece of pieces) {
    if (seen.has(piece.uid)) continue;
    const group = [];
    const stack = [piece];
    seen.add(piece.uid);
    while (stack.length) {
      const current = stack.pop();
      group.push(current);
      for (const link of current.connections || []) {
        if (seen.has(link) || !byId.has(link)) continue;
        seen.add(link);
        stack.push(byId.get(link));
      }
    }
    groups.push(group);
  }
  return groups;
}

/** Walls and panels drift and turn a little slower than rocks. A joined set turns as one body. */
export function tickStructures(state, dt) {
  const pieces = state && state.station && state.station.pieces;
  if (!pieces || !pieces.length) return;
  if (!state.structureBodies) state.structureBodies = new Map();
  const live = new Set();
  for (const group of structureGroups(pieces.filter((piece) => piece.layer === state.layer))) {
    const ids = group.map((piece) => piece.uid).sort((a, b) => a - b);
    const key = ids.join(',');
    live.add(key);
    let body = state.structureBodies.get(key);
    if (!body) {
      const cx = group.reduce((sum, piece) => sum + piece.x, 0) / group.length;
      const cy = group.reduce((sum, piece) => sum + piece.y, 0) / group.length;
      const solo = group.length === 1;
      const anchored = group.some((piece) => piece.ground);
      body = {
        cx,
        cy,
        angle: 0,
        spin: anchored ? 0 : (solo ? 0.09 : 0.04) * (ids[0] % 2 === 0 ? 1 : -1),
        drift: ((ids[0] % 9) / 9) * Math.PI * 2,
        speed: anchored ? 0 : solo ? 6 : 3.2,
        locals: group.map((piece) => ({
          uid: piece.uid,
          lx: piece.x - cx,
          ly: piece.y - cy,
          rot: piece.rot || 0,
        })),
      };
      state.structureBodies.set(key, body);
    }
    body.angle += body.spin * dt;
    body.cx += Math.cos(body.drift) * body.speed * dt;
    body.cy += Math.sin(body.drift) * body.speed * dt;
    const c = Math.cos(body.angle);
    const s = Math.sin(body.angle);
    for (const local of body.locals) {
      const piece = group.find((item) => item.uid === local.uid);
      if (!piece) continue;
      piece.x = body.cx + local.lx * c - local.ly * s;
      piece.y = body.cy + local.lx * s + local.ly * c;
      piece.rot = local.rot + body.angle;
    }
  }
  for (const key of state.structureBodies.keys()) {
    if (!live.has(key)) state.structureBodies.delete(key);
  }
}

/** Fill strength and connections on pieces loaded from an older save. */
export function backfillStation(station) {
  if (!station || !Array.isArray(station.pieces)) return;
  for (const piece of station.pieces) {
    if (!piece || typeof piece !== 'object') continue;
    if (!Number.isFinite(piece.strength) && isConstructionId(piece.id)) {
      piece.strength = STRENGTH[piece.id];
    }
    if (!Array.isArray(piece.connections)) piece.connections = [];
  }
}
