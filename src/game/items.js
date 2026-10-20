/** Stacks, count-based recipes, and hotbar/cargo moves. No crafting grid. */

export const STACK_MAX = 64;
/** Four across and ten down, so the hold is as tall as the hotbar. */
export const CARGO_COLS = 4;
export const CARGO_ROWS = 10;
export const CARGO_SIZE = CARGO_COLS * CARGO_ROWS;

export const ITEMS = {
  pale: { id: 'pale', name: 'Pale ore', mark: 'Pa', color: '#9be7ff', tint: 0x9be7ff, kind: 'mineral', about: 'The common cyan crystal from a pale rock. It is the coal of the belt. Use it for Prism glass, the layer jumper, and most early recipes.' },
  slate: { id: 'slate', name: 'Slate ore', mark: 'Sl', color: '#8ea4b8', tint: 0x8ea4b8, kind: 'mineral', about: 'A blue-grey crystal from a slate rock. It is the copper of the belt. It is not in the hand recipes yet.' },
  amber: { id: 'amber', name: 'Amber ore', mark: 'Am', color: '#ffb15a', tint: 0xffb15a, kind: 'mineral', about: 'A warm crystal from an amber rock. It is the iron of the belt. Use it when a recipe asks for heat: Belt iron, Amber resin, and the layer map.' },
  virid: { id: 'virid', name: 'Virid ore', mark: 'Vi', color: '#7dff9a', tint: 0x7dff9a, kind: 'mineral', about: 'A green crystal from a virid rock. It is the gold of the belt. It is uncommon, and it is not in the hand recipes yet.' },
  glint: { id: 'glint', name: 'Glint ore', mark: 'Gn', color: '#ffe27a', tint: 0xffe27a, kind: 'mineral', about: 'A bright crystal from a glint rock. It is the diamond of the belt. Glint rocks are rare, and a hard question drops at most two.' },
  glass: { id: 'glass', name: 'Prism glass', mark: 'Gl', color: '#d7fff4', tint: 0xd7fff4, kind: 'alloy', about: 'Pale ore melted into a clear plate. It is a crafting material, not a tool. Use it for hints, the compass, and the layer map.' },
  iron: { id: 'iron', name: 'Belt iron', mark: 'Fe', color: '#c5ced6', tint: 0xc5ced6, kind: 'alloy', about: 'A grey metal bar made from pale and amber ore. It is the structural alloy. Use it for missiles, hull plates, and the drive coil.' },
  resin: { id: 'resin', name: 'Amber resin', mark: 'Re', color: '#ffcf70', tint: 0xffcf70, kind: 'alloy', about: 'Sticky amber refined from amber ore. It binds other parts. Use it for Void filament and the tractor pulse.' },
  filament: { id: 'filament', name: 'Void filament', mark: 'Vf', color: '#c9b6ff', tint: 0xc9b6ff, kind: 'alloy', about: 'A violet thread of resin and glass. It is a rare part. Use it to fabricate Phase blink.' },
  'arc-missile': { id: 'arc-missile', name: 'Arc missile', mark: 'Ar', color: '#7ee7ff', tint: 0x7ee7ff, kind: 'weapon', use: 'missile', about: 'A homing shot you fire with a left click while it is selected. It is a weapon, not a mining tool. Useful when you want to break a rock without solving it.' },
  'pulse-lance': { id: 'pulse-lance', name: 'Pulse lance', mark: 'Pu', color: '#8dffb0', tint: 0x8dffb0, kind: 'weapon', use: 'missile', about: 'A green lance that fires like the arc missile. Select it and left click. Useful as a second weapon once you have amber as well as iron.' },
  flare: { id: 'flare', name: 'Survey flare', mark: 'Sf', color: '#fff1a8', tint: 0xfff1a8, kind: 'weapon', use: 'flare', about: 'A survey count of the rocks still on this layer. Use it from the hotbar. Useful when you want to know if the belt around you is spent before you jump.' },
  drive: { id: 'drive', name: 'Drive coil', mark: 'Dr', color: '#7ad7ff', tint: 0x7ad7ff, kind: 'ship', use: 'drive', about: 'A coil that raises the ship’s top speed. Use it from the hotbar. Each coil is one tier, up to three. Useful when the belt feels slow.' },
  hull: { id: 'hull', name: 'Hull plate', mark: 'Hu', color: '#b7d4ff', tint: 0xb7d4ff, kind: 'ship', use: 'hull', about: 'A plate that raises maximum hull and repairs a little. Use it from the hotbar, up to three times. Useful after a few rock bumps.' },
  hint: { id: 'hint', name: 'Math hint', mark: 'Hi', color: '#ffe08a', tint: 0xffe08a, kind: 'ship', use: 'hint', about: 'A hint for the rock you are nearest. Use it from the hotbar. It tells you if a one-digit answer is odd or even, or the first digit of a longer one. Useful when you are stuck on an extract.' },
  map: { id: 'map', name: 'Layer map', mark: 'Mp', color: '#9ad7ff', tint: 0x9ad7ff, kind: 'hud', use: 'map', about: 'The small map in the bottom right of the flight view. Fabricating it turns that map on for this layer. Useful when you need to see rocks and the gate without flying blind.' },
  compass: { id: 'compass', name: 'Layer compass', mark: 'Lc', color: '#d2fff8', tint: 0xd2fff8, kind: 'hud', about: 'A hull instrument. Once it is worn, the flight view draws this layer as a line, with a dot for where the ship sits between the two ends, and the layer number beside that line. It is not used up from the hotbar. Useful after several jumps, when you need to know if you are far to the left or the right.' },
  ping: { id: 'ping', name: 'Ore ping', mark: 'Op', color: '#ffd7a1', tint: 0xffd7a1, kind: 'hud', use: 'ping', about: 'Reports how far the nearest dropped mineral is. Use it from the hotbar. Useful when an extract dropped ore and you flew past it.' },
  gate: { id: 'gate', name: 'Gate marker', mark: 'Gm', color: '#d2b4ff', tint: 0xd2b4ff, kind: 'hud', use: 'gate', about: 'Reports how far the wormhole or return gate is. Use it from the hotbar. Useful when the quota is met and you are looking for the jump.' },
  repair: { id: 'repair', name: 'Repair patch', mark: 'Rp', color: '#8dffb0', tint: 0x8dffb0, kind: 'ability', use: 'repair', about: 'Restores 40 hull, up to the maximum. Use it from the hotbar. Useful just after a bump, before the hull reaches zero.' },
  blink: { id: 'blink', name: 'Phase blink', mark: 'Bl', color: '#e7d6ff', tint: 0xe7d6ff, kind: 'ability', use: 'blink', about: 'Slides the ship forward a short hop along its aim. Use it from the hotbar. Useful for slipping past a rock that is blocking the gate.' },
  tractor: { id: 'tractor', name: 'Tractor pulse', mark: 'Tr', color: '#ffb15a', tint: 0xffb15a, kind: 'ability', use: 'tractor', about: 'Pulls nearby drops toward the ship. Use it from the hotbar. Useful when ore is sitting on the far side of a rock you do not want to scrape.' },
  quiet: { id: 'quiet', name: 'Quiet running', mark: 'Qr', color: '#9bb0c0', tint: 0x9bb0c0, kind: 'ability', use: 'quiet', about: 'For a few seconds, bumping a rock does not damage the hull. Use it from the hotbar. Useful when you must squeeze between rocks to reach a drop.' },
  /** Placeholder cost. The real jumper ingredients are still open. */
  jumper: { id: 'jumper', name: 'Layer jumper', mark: 'Jp', color: '#7ee7ff', tint: 0x7ee7ff, kind: 'ship', about: 'A carried part that unlocks Q and E layer travel. It is not used up by a jump. If a hull breach drops it, layer travel locks until you pick it up. The 4 Pale ore cost is a stand-in.' },
  bench: { id: 'bench', name: 'Fabrication bench', mark: 'Fb', color: '#d7e4ff', tint: 0xd7e4ff, kind: 'station', about: 'The crafting table of the belt. Carry it in the hotbar or cargo and the bay opens the harder recipes. Drop it on a hull breach and those recipes close until you pick it up.' },
};

/** Each recipe is a result plus how many of each material it takes. station: 'bench' waits until that item is carried. */
export const RECIPES = [
  { id: 'glass', category: 'basics', result: 'glass', count: 1, costs: [{ id: 'pale', n: 2 }] },
  { id: 'bench', category: 'basics', result: 'bench', count: 1, costs: [{ id: 'pale', n: 4 }] },
  { id: 'arc-missile', category: 'weapons', result: 'arc-missile', station: 'bench', count: 1, costs: [{ id: 'iron', n: 2 }, { id: 'pale', n: 1 }] },
  { id: 'pulse-lance', category: 'weapons', result: 'pulse-lance', station: 'bench', count: 1, costs: [{ id: 'iron', n: 1 }, { id: 'amber', n: 1 }] },
  { id: 'flare', category: 'weapons', result: 'flare', station: 'bench', count: 1, costs: [{ id: 'pale', n: 1 }, { id: 'glass', n: 1 }] },
  { id: 'drive', category: 'ship', result: 'drive', station: 'bench', count: 1, costs: [{ id: 'iron', n: 3 }, { id: 'pale', n: 1 }] },
  { id: 'hull', category: 'ship', result: 'hull', station: 'bench', count: 1, costs: [{ id: 'iron', n: 2 }, { id: 'pale', n: 2 }] },
  { id: 'hint', category: 'ship', result: 'hint', station: 'bench', count: 1, costs: [{ id: 'glass', n: 1 }] },
  { id: 'jumper', category: 'ship', result: 'jumper', station: 'bench', count: 1, costs: [{ id: 'pale', n: 4 }] },
  { id: 'iron', category: 'alloys', result: 'iron', station: 'bench', count: 1, costs: [{ id: 'pale', n: 2 }, { id: 'amber', n: 1 }] },
  { id: 'resin', category: 'alloys', result: 'resin', station: 'bench', count: 1, costs: [{ id: 'amber', n: 2 }] },
  { id: 'filament', category: 'alloys', result: 'filament', station: 'bench', count: 1, costs: [{ id: 'resin', n: 1 }, { id: 'glass', n: 1 }] },
  { id: 'map', category: 'hud', result: 'map', station: 'bench', count: 1, costs: [{ id: 'glass', n: 2 }, { id: 'amber', n: 1 }] },
  { id: 'compass', category: 'hud', result: 'compass', station: 'bench', count: 1, costs: [{ id: 'glass', n: 1 }, { id: 'pale', n: 1 }] },
  { id: 'ping', category: 'hud', result: 'ping', station: 'bench', count: 1, costs: [{ id: 'pale', n: 1 }, { id: 'amber', n: 1 }] },
  { id: 'gate', category: 'hud', result: 'gate', station: 'bench', count: 1, costs: [{ id: 'iron', n: 1 }, { id: 'pale', n: 1 }] },
  { id: 'repair', category: 'abilities', result: 'repair', station: 'bench', count: 1, costs: [{ id: 'iron', n: 1 }, { id: 'pale', n: 2 }] },
  { id: 'blink', category: 'abilities', result: 'blink', station: 'bench', count: 1, costs: [{ id: 'filament', n: 1 }] },
  { id: 'tractor', category: 'abilities', result: 'tractor', station: 'bench', count: 1, costs: [{ id: 'resin', n: 1 }, { id: 'pale', n: 1 }] },
  { id: 'quiet', category: 'abilities', result: 'quiet', station: 'bench', count: 1, costs: [{ id: 'amber', n: 1 }, { id: 'pale', n: 2 }] },
];

/** A recipe with no station is hand work. The rest need that item in the hotbar or cargo. */
export function recipeOpen(state, recipe) {
  if (!recipe || !recipe.station) return true;
  return hullHas(state, recipe.station);
}

export const HULL_FITS = [
  { accept: 'jumper', label: 'Layer jumper' },
  { accept: 'bench', label: 'Fabrication bench' },
  { accept: 'compass', label: 'Layer compass' },
];

export function ensureHull(state) {
  if (!Array.isArray(state.hullSlots) || state.hullSlots.length !== HULL_FITS.length) {
    const next = HULL_FITS.map(() => null);
    if (Array.isArray(state.hullSlots)) {
      state.hullSlots.forEach((stack, index) => {
        if (index < next.length) next[index] = stack;
      });
    }
    state.hullSlots = next;
  }
}

export function hullHas(state, id) {
  ensureHull(state);
  return state.hullSlots.some((stack) => stack && stack.id === id);
}

/** Install a jumper or bench into its hull slot. Returns false if that slot is taken or the item does not fit. */
export function equipHull(state, id) {
  ensureHull(state);
  const index = HULL_FITS.findIndex((slot) => slot.accept === id);
  if (index < 0 || state.hullSlots[index]) return false;
  state.hullSlots[index] = { id, count: 1 };
  return true;
}

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
  ensureHull(state);
  for (const fit of HULL_FITS) {
    const index = HULL_FITS.findIndex((slot) => slot.accept === fit.accept);
    if (state.hullSlots[index]) continue;
    for (const list of [state.hotbar, state.cargoSlots]) {
      if (!list) continue;
      const found = list.findIndex((stack) => stack && stack.id === fit.accept);
      if (found < 0) continue;
      state.hullSlots[index] = { id: fit.accept, count: 1 };
      list[found].count -= 1;
      if (list[found].count <= 0) list[found] = null;
      break;
    }
  }
}

export function countItem(state, id) {
  ensureInventory(state);
  let total = 0;
  for (const stack of state.hotbar) if (stack && stack.id === id) total += stack.count;
  for (const stack of state.cargoSlots) if (stack && stack.id === id) total += stack.count;
  if (state.hullSlots) {
    for (const stack of state.hullSlots) if (stack && stack.id === id) total += stack.count;
  }
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
  ensureHull(state);
  if (!ITEMS[id] || count <= 0) return count;
  let left = count;
  if (HULL_FITS.some((slot) => slot.accept === id) && equipHull(state, id)) left -= 1;
  if (left <= 0) return 0;
  left = addInto(state.hotbar, id, left);
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
  ensureHull(state);
  if (area === 'hotbar') return state.hotbar;
  if (area === 'cargo') return state.cargoSlots;
  if (area === 'hull') return state.hullSlots;
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
  if (area === 'hull' && held) {
    const fit = HULL_FITS[index];
    if (!fit || held.id !== fit.accept) return false;
    if (held.count > 1) return false;
  }
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

/**
 * Drag a stack from one slot onto another. Same merge and swap rules as a click.
 * Dropping on the same slot puts it back.
 */
export function inventoryDrag(state, fromArea, fromIndex, toArea, toIndex) {
  if (state.held) returnHeld(state);
  if (fromArea === toArea && fromIndex === toIndex) return false;
  if (!inventoryClick(state, fromArea, fromIndex)) return false;
  inventoryClick(state, toArea, toIndex);
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
  ensureHull(state);
  const stacks = [];
  for (const list of [state.hotbar, state.cargoSlots, state.hullSlots]) {
    for (let i = 0; i < list.length; i++) {
      if (!list[i]) continue;
      stacks.push(list[i]);
      list[i] = null;
    }
  }
  return stacks;
}
