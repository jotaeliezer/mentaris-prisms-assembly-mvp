/** Earlier timestamp wins. Equal times go to the lower id. */
export function earlierClaim(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const at = Number(a.t);
  const bt = Number(b.t);
  const aTime = Number.isFinite(at) ? at : Number.POSITIVE_INFINITY;
  const bTime = Number.isFinite(bt) ? bt : Number.POSITIVE_INFINITY;
  if (aTime !== bTime) return aTime < bTime ? a : b;
  const aid = String(a.id ?? '');
  const bid = String(b.id ?? '');
  return aid <= bid ? a : b;
}

/**
 * One winner per shared id (a rock step, a kill, or an ore drop).
 * Returns 'new' the first time this claimant takes it,
 * 'keep' when the same claimant repeats,
 * 'lose' when an earlier claim already won,
 * 'steal' when this claimant is earlier than the one stored.
 */
export function takeClaim(claims, key, claimant) {
  if (!claims || key == null || key === '' || !claimant || claimant.id == null) return 'lose';
  const id = String(claimant.id);
  const next = { id, t: Number(claimant.t) || 0 };
  const existing = claims.get(key);
  if (!existing) {
    claims.set(key, next);
    return 'new';
  }
  if (String(existing.id) === id) return 'keep';
  const winner = earlierClaim(existing, next);
  if (String(winner.id) === String(existing.id)) return 'lose';
  claims.set(key, next);
  return 'steal';
}

/** True the first time this event id is seen. Repeats are dropped. */
export function rememberEvent(seen, eventId, limit = 480) {
  if (!seen || eventId == null || eventId === '') return false;
  const id = String(eventId);
  if (seen.has(id)) return false;
  seen.add(id);
  if (seen.size > limit) {
    const drop = seen.size - limit;
    let removed = 0;
    for (const old of seen) {
      seen.delete(old);
      removed += 1;
      if (removed >= drop) break;
    }
  }
  return true;
}

export function eventOnLayer(eventLayer, localLayer) {
  const eventN = Number(eventLayer);
  const localN = Number(localLayer);
  if (!Number.isFinite(eventN) || !Number.isFinite(localN)) return false;
  return (eventN | 0) === (localN | 0);
}

/** Layer gate plus event-id dedupe. Missing ids still pass the layer check once. */
export function shouldApplyEvent(event, localLayer, seen) {
  if (!event || event.k == null) return false;
  if (!eventOnLayer(event.layer, localLayer)) return false;
  if (event.eid == null || event.eid === '') return true;
  return rememberEvent(seen, event.eid);
}

export function oreIdForRock(rockKey, step) {
  return 'o:' + rockKey + ':' + step;
}

export function mineClaimKey(rockKey, step) {
  return 'm:' + rockKey + '#' + step;
}

export function dieClaimKey(rockKey) {
  return 'd:' + rockKey;
}
