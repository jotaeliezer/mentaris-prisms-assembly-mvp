/** Flights kept in this browser. No account is required. */

const KEY = 'mentaris-local-flights';
export const LOCAL_FLIGHT_LIMIT = 5;

function memory() {
  return globalThis.localStorage;
}

function readRows(storage) {
  try {
    const raw = storage.getItem(KEY);
    const rows = raw ? JSON.parse(raw) : [];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function writeRows(storage, rows) {
  storage.setItem(KEY, JSON.stringify(rows));
}

export function listLocalFlights(storage = memory()) {
  if (!storage) return [];
  return readRows(storage);
}

export function loadLocalFlight(id, storage = memory()) {
  return listLocalFlights(storage).find((row) => row && row.id === id) || null;
}

/** Update the same id when the flight was already saved. A new id drops the oldest past the limit. */
export function saveLocalFlight(progress, meta = {}, storage = memory()) {
  if (!storage) return { ok: false, error: 'This browser cannot store a flight.' };
  if (!progress || typeof progress !== 'object') return { ok: false, error: 'Nothing to save.' };
  try {
    const rows = readRows(storage);
    const id =
      (meta.id && String(meta.id)) ||
      (progress.localFlightId && String(progress.localFlightId)) ||
      'local-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1000).toString(36);
    const stored = {
      ...progress,
      localFlightId: id,
    };
    const row = {
      id,
      name: meta.name || 'Saved flight',
      seed: stored.seed || '',
      missionId: stored.missionId || 'add',
      layer: Number(stored.layer) || 0,
      solved: Number(stored.solved) || 0,
      savedAt: meta.savedAt || new Date().toISOString(),
      progress: stored,
    };
    const next = [row, ...rows.filter((item) => item && item.id !== id)].slice(0, LOCAL_FLIGHT_LIMIT);
    writeRows(storage, next);
    return { ok: true, id, row };
  } catch {
    return { ok: false, error: 'This browser blocked the save.' };
  }
}

export function deleteLocalFlight(id, storage = memory()) {
  if (!storage) return { ok: false };
  try {
    const next = readRows(storage).filter((row) => row && row.id !== id);
    writeRows(storage, next);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
