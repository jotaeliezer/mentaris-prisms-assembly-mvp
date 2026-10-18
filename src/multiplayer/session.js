import {
  assignPlayerTags,
  createRemoteShip,
  pushRemotePose,
  shouldSendPose,
  stepRemoteShip,
} from './ships.js';
import {
  generateSessionCode,
  isValidSessionCode,
  normalizeSessionCode,
  seedFromSessionCode,
} from './sessionCode.js';

export const UNAVAILABLE_MESSAGE =
  'Live sessions need a Supabase URL and public anon key. Single-player still works.';

const OFFLINE_MESSAGE = 'Could not open the live session. You can still play alone.';
const TOPIC_PREFIX = 'mentaris:';
const JUMP_DISTANCE = 500;

export function readSupabasePublicConfig(env) {
  const source = env ?? import.meta.env ?? {};
  const url = String(source.VITE_SUPABASE_URL || '').trim();
  const key = String(source.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!url || !key || !isUsableSupabaseUrl(url)) return null;
  return { url, key };
}

function isUsableSupabaseUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return true;
    const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    return parsed.protocol === 'http:' && local;
  } catch {
    return false;
  }
}

function randomUnit() {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] / 4294967296;
  }
  return Math.random();
}

function createPlayerId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'p-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function emptySnapshot(available) {
  return {
    available,
    status: available ? 'idle' : 'unavailable',
    message: available ? '' : UNAVAILABLE_MESSAGE,
    code: '',
    seed: '',
    role: '',
    playerCount: 0,
    selfTag: '',
    hostMission: '',
    connected: false,
  };
}

export function createMultiplayerSession(options = {}) {
  const config = options.config === undefined ? readSupabasePublicConfig() : options.config;
  const playerId = options.playerId || createPlayerId();
  const listeners = new Set();
  const remotes = new Map();
  let snapshot = emptySnapshot(!!config);
  let client = null;
  let channel = null;
  let generation = 0;
  let joinedAt = 0;
  let flight = { missionId: '', layer: 0 };
  let lastSentAt = 0;
  let lastSentLayer = null;
  let lastSentX = null;
  let lastSentY = null;

  function notify(patch) {
    snapshot = { ...snapshot, ...patch };
    for (const listener of listeners) listener(snapshot);
  }

  function presencePayload() {
    return {
      id: playerId,
      joinedAt,
      role: snapshot.role === 'host' ? 'host' : 'join',
      missionId: flight.missionId || '',
      layer: flight.layer | 0,
    };
  }

  function syncPresence() {
    if (!channel) return;
    const state = channel.presenceState() || {};
    const peers = [];
    for (const metas of Object.values(state)) {
      const meta = Array.isArray(metas) ? metas[0] : null;
      if (!meta || meta.id == null) continue;
      peers.push({
        id: String(meta.id),
        joinedAt: finite(meta.joinedAt, 0),
        role: meta.role === 'host' ? 'host' : 'join',
        missionId: typeof meta.missionId === 'string' ? meta.missionId : '',
        layer: finite(meta.layer, 0),
      });
    }
    const tags = assignPlayerTags(peers);
    const alive = new Set(peers.map((peer) => peer.id));
    for (const id of remotes.keys()) {
      if (id === playerId || !alive.has(id)) remotes.delete(id);
    }
    for (const peer of peers) {
      if (peer.id === playerId) continue;
      const ship = remotes.get(peer.id);
      if (!ship) continue;
      ship.tag = tags.get(peer.id) || ship.tag;
    }
    const hosts = peers
      .filter((peer) => peer.role === 'host')
      .sort((a, b) => a.joinedAt - b.joinedAt);
    const hostMission = hosts[0] && hosts[0].missionId ? hosts[0].missionId : '';
    notify({
      playerCount: peers.length,
      selfTag: tags.get(playerId) || '',
      hostMission,
    });
  }

  function ingestPose(payload, now = typeof performance !== 'undefined' ? performance.now() : Date.now()) {
    if (!payload || payload.id == null) return;
    const id = String(payload.id);
    if (id === playerId) return;
    const pose = {
      id,
      tag: typeof payload.tag === 'string' ? payload.tag : '',
      x: finite(payload.x, NaN),
      y: finite(payload.y, NaN),
      aim: finite(payload.aim, NaN),
      layer: finite(payload.layer, 0),
      sprite: typeof payload.sprite === 'string' ? payload.sprite : '',
      thrusting: !!payload.thrusting,
    };
    if (!Number.isFinite(pose.x) || !Number.isFinite(pose.y) || !Number.isFinite(pose.aim)) return;
    const existing = remotes.get(id);
    if (!existing) remotes.set(id, createRemoteShip(pose, now));
    else pushRemotePose(existing, pose, now);
  }

  async function ensureClient() {
    if (client) return client;
    const { createClient } = await import('@supabase/supabase-js');
    client = createClient(config.url, config.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    return client;
  }

  function waitUntilSubscribed(ch) {
    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => finish('TIMED_OUT'), 8000);
      function finish(status) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(status);
      }
      ch.subscribe((status) => {
        if (
          status === 'SUBSCRIBED' ||
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          finish(status);
        }
      });
    });
  }

  async function disconnectQuiet() {
    const current = channel;
    channel = null;
    remotes.clear();
    if (!current) return;
    try {
      await current.untrack();
    } catch {
      /* channel already closed */
    }
    if (!client) return;
    try {
      await client.removeChannel(current);
    } catch {
      /* channel already removed */
    }
  }

  async function connect(code, role) {
    const gen = ++generation;
    const seed = seedFromSessionCode(code);
    notify({
      status: 'connecting',
      message: 'Connecting…',
      code,
      seed,
      role,
      connected: false,
      playerCount: 0,
      selfTag: '',
      hostMission: '',
    });
    if (!config) {
      notify({
        status: 'unavailable',
        message: UNAVAILABLE_MESSAGE,
        connected: false,
        code: '',
        seed: '',
        role: '',
      });
      return false;
    }
    await disconnectQuiet();
    if (gen !== generation) return false;
    try {
      const supabase = await ensureClient();
      if (gen !== generation) return false;
      const ch = supabase.channel(TOPIC_PREFIX + code, {
        config: {
          broadcast: { self: false },
          presence: { key: playerId, enabled: true },
        },
      });
      channel = ch;
      let resolveSync = null;
      const waitSync = (ms) =>
        new Promise((resolve) => {
          const timer = setTimeout(() => {
            resolveSync = null;
            resolve();
          }, ms);
          resolveSync = () => {
            clearTimeout(timer);
            resolveSync = null;
            resolve();
          };
        });
      ch.on('broadcast', { event: 'pose' }, ({ payload }) => {
        if (gen !== generation) return;
        ingestPose(payload);
      });
      ch.on('presence', { event: 'sync' }, () => {
        if (gen !== generation) return;
        syncPresence();
        if (resolveSync) resolveSync();
      });
      ch.on('presence', { event: 'join' }, () => {
        if (gen !== generation) return;
        syncPresence();
      });
      ch.on('presence', { event: 'leave' }, () => {
        if (gen !== generation) return;
        syncPresence();
      });
      const status = await waitUntilSubscribed(ch);
      if (gen !== generation) return false;
      if (status !== 'SUBSCRIBED') {
        await disconnectQuiet();
        notify({
          status: 'error',
          message: OFFLINE_MESSAGE,
          connected: false,
          code,
          seed,
          role,
          playerCount: 0,
          selfTag: '',
        });
        return false;
      }
      joinedAt = Date.now();
      lastSentAt = 0;
      lastSentLayer = null;
      lastSentX = null;
      lastSentY = null;
      const synced = waitSync(700);
      await ch.track(presencePayload());
      await synced;
      if (gen !== generation) return false;
      notify({
        status: 'connected',
        message: '',
        connected: true,
        code,
        seed,
        role,
      });
      syncPresence();
      return true;
    } catch {
      if (gen !== generation) return false;
      await disconnectQuiet();
      notify({
        status: 'error',
        message: OFFLINE_MESSAGE,
        connected: false,
        code,
        seed,
        role,
        playerCount: 0,
      });
      return false;
    }
  }

  function host() {
    const code = generateSessionCode(randomUnit);
    const done = connect(code, 'host');
    return { code, done };
  }

  function join(raw) {
    const code = normalizeSessionCode(raw);
    if (!isValidSessionCode(code)) {
      notify({
        status: snapshot.connected ? snapshot.status : 'error',
        message: 'Enter the 6-character session code.',
      });
      return Promise.resolve(false);
    }
    return connect(code, 'join');
  }

  function reconnect() {
    if (!snapshot.code || !isValidSessionCode(snapshot.code)) return Promise.resolve(false);
    const role = snapshot.role === 'host' ? 'host' : 'join';
    return connect(snapshot.code, role);
  }

  async function leave() {
    generation += 1;
    await disconnectQuiet();
    joinedAt = 0;
    lastSentAt = 0;
    lastSentLayer = null;
    notify(emptySnapshot(!!config));
  }

  function noteFlight(next) {
    const missionId = next && next.missionId ? String(next.missionId) : '';
    const layer = next ? finite(next.layer, 0) : 0;
    const changed = flight.missionId !== missionId || flight.layer !== layer;
    flight = { missionId, layer };
    if (!changed || !channel || snapshot.status !== 'connected') return;
    channel.track(presencePayload()).catch(() => {});
  }

  function publishPose(pose, now = Date.now()) {
    if (!channel || snapshot.status !== 'connected' || !pose) return;
    const x = finite(pose.x, NaN);
    const y = finite(pose.y, NaN);
    const aim = finite(pose.aim, NaN);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(aim)) return;
    const layer = finite(pose.layer, 0) | 0;
    const jumped =
      lastSentX == null || Math.hypot(x - lastSentX, y - lastSentY) > JUMP_DISTANCE;
    const urgent = layer !== lastSentLayer || jumped;
    if (!shouldSendPose(lastSentAt, now, urgent)) return;
    lastSentAt = now;
    lastSentLayer = layer;
    lastSentX = x;
    lastSentY = y;
    const payload = {
      id: playerId,
      tag: snapshot.selfTag || '',
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      aim: Math.round(aim * 1000) / 1000,
      layer,
      sprite: typeof pose.sprite === 'string' ? pose.sprite : '',
      thrusting: !!pose.thrusting,
    };
    channel.send({ type: 'broadcast', event: 'pose', payload }).catch(() => {});
  }

  function step(now = typeof performance !== 'undefined' ? performance.now() : Date.now()) {
    for (const ship of remotes.values()) stepRemoteShip(ship, now);
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(snapshot);
    return () => listeners.delete(listener);
  }

  function getSnapshot() {
    return snapshot;
  }

  function remoteShips() {
    return remotes.values();
  }

  return {
    host,
    join,
    reconnect,
    leave,
    noteFlight,
    publishPose,
    step,
    subscribe,
    getSnapshot,
    remoteShips,
    playerId,
  };
}

export const multiplayer = createMultiplayerSession();

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    multiplayer.leave();
  });
}
