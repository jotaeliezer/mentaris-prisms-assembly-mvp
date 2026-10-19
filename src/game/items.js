/** Stacks, count-based recipes, and hotbar/cargo moves. No crafting grid. */

export const STACK_MAX = 64;
/** Four across and ten down, so the hold is as tall as the hotbar. */
export const CARGO_COLS = 4;
export const CARGO_ROWS = 10;
export const CARGO_SIZE = CARGO_COLS * CARGO_ROWS;

export const ITEMS = {
  pale: { id: 'pale', name: 'Pale ore', mark: 'Pa', color: '#9be7ff', tint: 0x9be7ff, kind: 'mineral' },
  amber: { id: 'amber', name: 'Amber ore', mark: 'Am', color: '#ffb15a', tint: 0xffb15a, kind: 'mineral' },
  glass: { id: 'glass', name: 'Prism glass', mark: 'Gl', color: '#d7fff4', tint: 0xd7fff4, kind: 'alloy' },
  iron: { id: 'iron', name: 'Belt iron', mark: 'Fe', color: '#c5ced6', tint: 0xc5ced6, kind: 'alloy' },
  resin: { id: 'resin', name: 'Amber resin', mark: 'Re', color: '#ffcf70', tint: 0xffcf70, kind: 'alloy' },
  filament: { id: 'filament', name: 'Void filament', mark: 'Vf', color: '#c9b6ff', tint: 0xc9b6ff, kind: 'alloy' },
  'arc-missile': { id: 'arc-missile', name: 'Arc missile', mark: 'Ar', color: '#7ee7ff', tint: 0x7ee7ff, kind: 'weapon', use: 'missile' },
  'pulse-lance': { id: 'pulse-lance', name: 'Pulse lance', mark: 'Pu', color: '#8dffb0', tint: 0x8dffb0, kind: 'weapon', use: 'missile' },
  flare: { id: 'flare', name: 'Survey flare', mark: 'Sf', color: '#fff1a8', tint: 0xfff1a8, kind: 'weapon', use: 'flare' },
  drive: { id: 'drive', name: 'Drive coil', mark: 'Dr', color: '#7ad7ff', tint: 0x7ad7ff, kind: 'ship', use: 'drive' },
  hull: { id: 'hull', name: 'Hull plate', mark: 'Hu', color: '#b7d4ff', tint: 0xb7d4ff, kind: 'ship', use: 'hull' },
  hint: { id: 'hint', name: 'Math hint', mark: 'Hi', color: '#ffe08a', tint: 0xffe08a, kind: 'ship', use: 'hint' },
  map: { id: 'map', name: 'Sector map', mark: 'Mp', color: '#9ad7ff', tint: 0x9ad7ff, kind: 'ship', use: 'map' },
  compass: { id: 'compass', name: 'Layer compass', mark: 'Lc', color: '#d2fff8', tint: 0xd2fff8, kind: 'hud', use: 'compass' },
  ping: { id: 'ping', name: 'Ore ping', mark: 'Op', color: '#ffd7a1', tint: 0xffd7a1, kind: 'hud', use: 'ping' },
  gate: { id: 'gate', name: 'Gate marker', mark: 'Gm', color: '#d2b4ff', tint: 0xd2b4ff, kind: 'hud', use: 'gate' },
  repair: { id: 'repair', name: 'Repair patch', mark: 'Rp', color: '#8dffb0', tint: 0x8dffb0, kind: 'ability', use: 'repair' },
  blink: { id: 'blink', name: 'Phase blink', mark: 'Bl', color: '#e7d6ff', tint: 0xe7d6ff, kind: 'ability', use: 'blink' },
  tractor: { id: 'tractor', name: 'Tractor pulse', mark: 'Tr', color: '#ffb15a', tint: 0xffb15a, kind: 'ability', use: 'tractor' },
  quiet: { id: 'quiet', name: 'Quiet running', mark: 'Qr', color: '#9bb0c0', tint: 0x9bb0c0, kind: 'ability', use: 'quiet' },
  /** Placeholder cost. The real jumper ingredients are still open. */
  jumper: { id: 'jumper', name: 'Layer jumper', mark: 'Jp', color: '#7ee7ff', tint: 0x7ee7ff, kind: 'ship' },
};

/** Each recipe is a result plus how many of each material it takes. */
export const RECIPES = [
  { id: 'arc-missile', category: 'weapons', result: 'arc-missile', count: 1, costs: [{ id: 'iron', n: 2 }, { id: 'pale', n: 1 }] },
  { id: 'pulse-lance', category: 'weapons', result: 'pulse-lance', count: 1, costs: [{ id: 'iron', n: 1 }, { id: 'amber', n: 1 }] },
  { id: 'flare', category: 'weapons', result: 'flare', count: 1, costs: [{ id: 'pale', n: 1 }, { id: 'glass', n: 1 }] },
  { id: 'drive', category: 'ship', result: 'drive', count: 1, costs: [{ id: 'iron', n: 3 }, { id: 'pale', n: 1 }] },
  { id: 'hull', category: 'ship', result: 'hull', count: 1, costs: [{ id: 'iron', n: 2 }, { id: 'pale', n: 2 }] },
  { id: 'hint', category: 'ship', result: 'hint', count: 1, costs: [{ id: 'glass', n: 1 }] },
  { id: 'map', category: 'ship', result: 'map', count: 1, costs: [{ id: 'glass', n: 2 }, { id: 'amber', n: 1 }] },
  { id: 'jumper', category: 'ship', result: 'jumper', count: 1, costs: [{ id: 'pale', n: 4 }] },
  { id: 'glass', category: 'alloys', result: 'glass', count: 1, costs: [{ id: 'pale', n: 2 }] },
  { id: 'iron', category: 'alloys', result: 'iron', count: 1, costs: [{ id: 'pale', n: 2 }, { id: 'amber', n: 1 }] },
  { id: 'resin', category: 'alloys', result: 'resin', count: 1, costs: [{ id: 'amber', n: 2 }] },
  { id: 'filament', category: 'alloys', result: 'filament', count: 1, costs: [{ id: 'resin', n: 1 }, { id: 'glass', n: 1 }] },
  { id: 'compass', category: 'hud', result: 'compass', count: 1, costs: [{ id: 'glass', n: 1 }, { id: 'pale', n: 1 }] },
  { id: 'ping', category: 'hud', result: 'ping', count: 1, costs: [{ id: 'pale', n: 1 }, { id: 'amber', n: 1 }] },
  { id: 'gate', category: 'hud', result: 'gate', count: 1, costs: [{ id: 'iron', n: 1 }, { id: 'pale', n: 1 }] },
  { id: 'repair', category: 'abilities', result: 'repair', count: 1, costs: [{ id: 'iron', n: 1 }, { id: 'pale', n: 2 }] },
  { id: 'blink', category: 'abilities', result: 'blink', count: 1, costs: [{ id: 'filament', n: 1 }] },
  { id: 'tractor', category: 'abilities', result: 'tractor', count: 1, costs: [{ id: 'resin', n: 1 }, { id: 'pale', n: 1 }] },
  { id: 'quiet', category: 'abilities', result: 'quiet', count: 1, costs: [{ id: 'amber', n: 1 }, { id: 'pale', n: 2 }] },
];

export function emptyStacks(count) {
  return Array.from({ length: count }, () => null);
}

export function itemById(id) {
  return ITEMS[id] || null;
}

export function itemTint(id) {
  const item = ITEMS[id];
  return item ? item.tint : 0x9be7ff;
}

export function ensureInventory(state) {
  if (!Array.isArray(state.hotbar) || state.hotbar.length !== 10) {
    state.hotbar = emptyStacks(10);
  }
  if (!Array.isArray(state.cargoSlots) || state.cargoSlots.length !== CARGO_SIZE) {
    const next = emptyStacks(CARGO_SIZE);
    if (Array.isArray(state.cargoSlots)) {
      state.cargoSlots.forEach((stack, index) => {
        if (index < next.length) next[index] = stack;
      });
    }
    state.cargoSlots = next;
  }
}

export function countItem(state, id) {
  ensureInventory(state);
  let total = 0;
  for (const stack of state.hotbar) if (stack && stack.id === id) total += stack.count;
  for (const stack of state.cargoSlots) if (stack && stack.id === id) total += stack.count;
  return total;
}

function addInto(list, id, count) {
  let left = count;
  for (const stack of list) {
    if (!stack || stack.id !== id || stack.count >= STACK_MAX) continue;
    const take = Math.min(STACK_MAX - stack.count, left);
    stack.count += take;
    left -= take;
    if (left <= 0) return 0;
  }
  for (let i = 0; i < list.length; i++) {
    if (list[i]) continue;
    const take = Math.min(STACK_MAX, left);
    list[i] = { id, count: take };
    left -= take;
    if (left <= 0) return 0;
  }
  return left;
}

/** Prefer the hotbar. Overflow goes to cargo. Returns how many did not fit. */
export function addItem(state, id, count) {
  ensureInventory(state);
  if (!ITEMS[id] || count <= 0) return count;
  let left = addInto(state.hotbar, id, count);
  if (left > 0) left = addInto(state.cargoSlots, id, left);
  return left;
}

export function removeItems(state, id, count) {
  ensureInventory(state);
  if (count <= 0) return true;
  if (countItem(state, id) < count) return false;
  let left = count;
  for (const list of [state.cargoSlots, state.hotbar]) {
    for (let i = 0; i < list.length && left > 0; i++) {
      const stack = list[i];
      if (!stack || stack.id !== id) continue;
      const take = Math.min(stack.count, left);
      stack.count -= take;
      left -= take;
      if (stack.count <= 0) list[i] = null;
    }
  }
  return true;
}

export function canAfford(state, costs) {
  return costs.every((cost) => countItem(state, cost.id) >= cost.n);
}

export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id) || null;
}

export function costLabel(costs) {
  return costs.map((cost) => cost.n + ' ' + (ITEMS[cost.id] ? ITEMS[cost.id].name : cost.id)).join(' + ');
}

/**
 * Move a cargo stack onto a hotbar slot.
 * Same item merges. A different item swaps.
 */
export function moveCargoToHotbar(state, cargoIndex, hotbarIndex) {
  ensureInventory(state);
  if (!Number.isInteger(cargoIndex) || cargoIndex < 0 || cargoIndex >= state.cargoSlots.length) return false;
  if (!Number.isInteger(hotbarIndex) || hotbarIndex < 0 || hotbarIndex >= state.hotbar.length) return false;
  const from = state.cargoSlots[cargoIndex];
  if (!from) return false;
  const to = state.hotbar[hotbarIndex];
  if (!to) {
    state.hotbar[hotbarIndex] = from;
    state.cargoSlots[cargoIndex] = null;
    return true;
  }
  if (to.id === from.id) {
    const take = Math.min(STACK_MAX - to.count, from.count);
    if (take <= 0) return false;
    to.count += take;
    from.count -= take;
    if (from.count <= 0) state.cargoSlots[cargoIndex] = null;
    return true;
  }
  state.hotbar[hotbarIndex] = from;
  state.cargoSlots[cargoIndex] = to;
  return true;
}

/** Move a hotbar stack into cargo, merging when the material matches. */
export function moveHotbarToCargo(state, hotbarIndex) {
  ensureInventory(state);
  if (!Number.isInteger(hotbarIndex) || hotbarIndex < 0 || hotbarIndex >= state.hotbar.length) return false;
  const from = state.hotbar[hotbarIndex];
  if (!from) return false;
  const left = addInto(state.cargoSlots, from.id, from.count);
  if (left === from.count) return false;
  if (left <= 0) state.hotbar[hotbarIndex] = null;
  else from.count = left;
  return true;
}

function slotList(state, area) {
  ensureInventory(state);
  if (area === 'hotbar') return state.hotbar;
  if (area === 'cargo') return state.cargoSlots;
  return null;
}

/**
 * Pick up, place, merge, or swap between the hotbar and the cargo.
 * The carried stack sits on state.held until it is put down.
 */
export function inventoryClick(state, area, index) {
  const list = slotList(state, area);
  if (!list || !Number.isInteger(index) || index < 0 || index >= list.length) return false;
  const slot = list[index];
  const held = state.held || null;
  if (!held) {
    if (!slot) return false;
    state.held = { id: slot.id, count: slot.count, area, index };
    list[index] = null;
    return true;
  }
  if (!slot) {
    list[index] = { id: held.id, count: held.count };
    state.held = null;
    return true;
  }
  if (slot.id === held.id) {
    const take = Math.min(STACK_MAX - slot.count, held.count);
    if (take <= 0) return false;
    slot.count += take;
    held.count -= take;
    if (held.count <= 0) state.held = null;
    return true;
  }
  list[index] = { id: held.id, count: held.count };
  state.held = { id: slot.id, count: slot.count, area, index };
  return true;
}

/** Put a carried stack back when cargo closes, preferring its original slot. */
export function returnHeld(state) {
  if (!state.held) return;
  const held = state.held;
  state.held = null;
  const list = slotList(state, held.area);
  if (list && list[held.index] == null) {
    list[held.index] = { id: held.id, count: held.count };
    return;
  }
  const left = addItem(state, held.id, held.count);
  if (left > 0 && state.ship) {
    state.drops.push({
      id: state.nextId++,
      x: state.ship.x,
      y: state.ship.y,
      itemId: held.id,
      count: left,
      life: 40,
      maxLife: 40,
    });
  }
}

export function takeAllStacks(state) {
  ensureInventory(state);
  const stacks = [];
  for (const list of [state.hotbar, state.cargoSlots]) {
    for (let i = 0; i < list.length; i++) {
      if (!list[i]) continue;
      stacks.push(list[i]);
      list[i] = null;
    }
  }
  return stacks;
}
