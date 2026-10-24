/** Plain JSON for a saved flight. Sets and Maps become arrays so Postgres can store them. */

function copyJson(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function encodeSet(value) {
  if (value instanceof Set) return [...value];
  if (Array.isArray(value)) return value.slice();
  return [];
}

function encodeMap(value) {
  if (value instanceof Map) return [...value.entries()];
  if (Array.isArray(value)) return value;
  return [];
}

function encodeBank(slot) {
  if (!slot) return null;
  return {
    asteroids: copyJson(slot.asteroids || []),
    drops: copyJson(slot.drops || []),
    beltCells: encodeSet(slot.beltCells),
    goneRocks: encodeSet(slot.goneRocks),
    remoteMines: encodeMap(slot.remoteMines),
  };
}

function encodeBanks(banks) {
  const out = {};
  if (!banks) return out;
  for (const key of Object.keys(banks)) out[key] = encodeBank(banks[key]);
  return out;
}

function encodeClusters(cache) {
  const out = {};
  if (!cache) return out;
  for (const key of Object.keys(cache)) {
    const slot = cache[key];
    if (!slot) continue;
    out[key] = {
      layerBanks: encodeBanks(slot.layerBanks),
      layer: slot.layer,
      wormhole: copyJson(slot.wormhole),
      returnHole: copyJson(slot.returnHole),
      solved: slot.solved,
      home: copyJson(slot.home),
      shipX: slot.shipX,
      shipY: slot.shipY,
      aim: slot.aim,
    };
  }
  return out;
}

export function decodeBank(slot) {
  if (!slot) return null;
  return {
    asteroids: Array.isArray(slot.asteroids) ? slot.asteroids : [],
    drops: Array.isArray(slot.drops) ? slot.drops : [],
    beltCells: new Set(encodeSet(slot.beltCells)),
    goneRocks: new Set(encodeSet(slot.goneRocks)),
    remoteMines: new Map(encodeMap(slot.remoteMines)),
  };
}

export function decodeBanks(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of Object.keys(raw)) out[key] = decodeBank(raw[key]);
  return out;
}

export function decodeClusters(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of Object.keys(raw)) {
    const slot = raw[key];
    if (!slot) continue;
    out[key] = {
      layerBanks: decodeBanks(slot.layerBanks),
      layer: slot.layer,
      wormhole: slot.wormhole || null,
      returnHole: slot.returnHole || null,
      solved: slot.solved,
      home: slot.home,
      shipX: slot.shipX,
      shipY: slot.shipY,
      aim: slot.aim,
    };
  }
  return out;
}

/** Caller saves the live layer into layerBanks first. */
export function buildProgressSnapshot(state) {
  const ship = state.ship || {};
  return {
    version: 1,
    seed: state.seed,
    missionId: state.mission && state.mission.id ? state.mission.id : 'add',
    cluster: state.cluster,
    layer: state.layer,
    solved: state.solved || 0,
    bank: state.bank || 0,
    cargo: state.cargo || 0,
    mapUnlocked: !!state.mapUnlocked,
    driveTier: state.driveTier || 0,
    hullTier: state.hullTier || 0,
    hotbarSlot: state.hotbarSlot || 0,
    knownCrafts: copyJson(state.knownCrafts || {}),
    taught: copyJson(state.taught || {}),
    ship: {
      x: ship.x,
      y: ship.y,
      vx: ship.vx || 0,
      vy: ship.vy || 0,
      aim: ship.aim,
      hp: ship.hp,
      maxHp: ship.maxHp,
      maxSpeed: ship.maxSpeed,
      sprite: ship.sprite,
    },
    home: copyJson(state.home),
    birth: copyJson(state.birth),
    hotbar: copyJson(state.hotbar || []),
    cargoSlots: copyJson(state.cargoSlots || []),
    hullSlots: copyJson(state.hullSlots || []),
    wormhole: copyJson(state.wormhole),
    returnHole: copyJson(state.returnHole),
    layerBanks: encodeBanks(state.layerBanks),
    clusterCache: encodeClusters(state.clusterCache),
    clock: Number(state.clock) || 0,
    mineralHold: copyJson(state.mineralHold || []),
    station: copyJson(state.station),
    planets: copyJson(state.planets || []),
    sunBodies: copyJson(state.sunBodies || []),
    spaceObjects: copyJson(state.spaceObjects || []),
    aliens: copyJson((state.aliens || []).filter((alien) => alien && !alien.gone)),
    alienNext: Number(state.alienNext) || 0,
    lairSeenDown: state.lairSeenDown === true,
    milestones: copyJson(state.milestones || {}),
    localFlightId: state.localFlightId || '',
    starWasUp: typeof state.starWasUp === 'boolean' ? state.starWasUp : null,
    nextId: state.nextId,
  };
}
