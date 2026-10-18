const INITIAL_HUD = {
  mission: 'Prisms of Assembly',
  rocks: '0',
  hull: '100',
  cargo: '0',
  bank: '0',
  speed: '0',
  question: 'Fly closer to an asteroid',
  buffer: '',
  bufferBad: false,
  hint: 'Hard rocks drop more ore. Bank it before a hull breach. F opens fabrication.',
};

const INITIAL_SNAPSHOT = {
  mode: 'title',
  seed: 'belt-7',
  missionId: '',
  muted: false,
  clearTitle: 'Mission clear',
  clearCopy:
    'The quota is met. A jump needs ore. Without it, this arrival clears the mission.',
  fabCopy:
    'Ore in the cargo hold is lost if the hull fails. Banking it keeps it. Nothing here is saved to an account.',
  fabBankLabel: 'Move carried ore into the bay. Banked ore stays if the hull fails.',
  fabDriveLabel: 'Spend 4 banked ore. Raises top speed.',
  fabHullLabel: 'Spend 4 banked ore. Raises hull points.',
  fabHintLabel: 'Spend 2 banked ore. A nudge for the rock you have targeted.',
  fabMapLabel: 'Spend 3 banked ore. One-shot unlock for the sector minimap.',
  fabBankDisabled: false,
  fabDriveDisabled: false,
  fabHullDisabled: false,
  fabHintDisabled: false,
  fabMapDisabled: false,
  mapUnlocked: false,
  mapCost: 3,
  extractAvailable: null,
  extractMode: false,
  extractQuestion: '',
  extractToast: '',
  extractRockId: null,
  hud: { ...INITIAL_HUD },
};

/**
 * Shared Phaser ↔ React bus: command emit/on + snapshot subscribe.
 * PlayScene registers real command handlers; this module only provides the bus.
 */
export function createGameBridge() {
  const commandListeners = new Map();
  const snapshotListeners = new Set();
  const pendingCommands = [];
  let snapshot = cloneSnapshot(INITIAL_SNAPSHOT);

  function emit(command, payload) {
    const set = commandListeners.get(command);
    if (!set || set.size === 0) {
      pendingCommands.push({ command, payload });
      return;
    }
    for (const fn of set) fn(payload);
  }

  function flushPending(command) {
    if (!pendingCommands.length) return;
    const kept = [];
    for (const item of pendingCommands) {
      if (item.command !== command) {
        kept.push(item);
        continue;
      }
      const set = commandListeners.get(command);
      if (set) for (const fn of set) fn(item.payload);
    }
    pendingCommands.length = 0;
    pendingCommands.push(...kept);
  }

  function on(command, fn) {
    let set = commandListeners.get(command);
    if (!set) {
      set = new Set();
      commandListeners.set(command, set);
    }
    set.add(fn);
    flushPending(command);
    return () => set.delete(fn);
  }

  function setSnapshot(next) {
    snapshot = {
      ...snapshot,
      ...next,
      hud: next.hud ? { ...snapshot.hud, ...next.hud } : snapshot.hud,
    };
    for (const fn of snapshotListeners) fn(snapshot);
  }

  function subscribe(listener) {
    snapshotListeners.add(listener);
    listener(snapshot);
    return () => snapshotListeners.delete(listener);
  }

  function getSnapshot() {
    return snapshot;
  }

  return { emit, on, setSnapshot, subscribe, getSnapshot };
}

function cloneSnapshot(source) {
  return {
    ...source,
    hud: { ...source.hud },
  };
}

export const bridge = createGameBridge();
