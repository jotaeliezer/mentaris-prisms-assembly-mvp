import Phaser from 'phaser';
import { ASTEROID_FILES, DEFAULT_SHIP, MINERAL_FILE } from '../assetsManifest.js';
import { createAudio } from '../audio.js';
import {
  applyCameraPolish,
  layerTransitionFx,
  rockDisplayScale,
  syncAimArc,
  syncBeacons,
  syncFlame,
  syncReverse,
  syncGates,
  syncMinimap,
  syncParticles,
  syncStars,
  syncTransitionWash,
} from '../display.js';
import { createInput } from '../input.js';
import { multiplayer } from '../../multiplayer/session.js';
import { saveAssembly } from '../../save/cloud.js';
import { saveLocalFlight } from '../../save/local.js';
import { mainStarName } from '../star.js';
import { dropSpriteKey, inventoryClick, inventoryDrag, itemById, itemTint } from '../items.js';
import { ghostPose, visiblePieces } from '../construct.js';
import { readPilotName } from '../pilot.js';
import { createState, WORLD } from '../state.js';
import {
  applyFriendlyFire,
  applySharedRock,
  applyWorldEvent,
  buildSnapshotPatch,
  cancelExtract,
  changeLayer,
  craftItem,
  cycleHotbar,
  digitFromEvent,
  extractBackspace,
  hotbarIndex,
  idle,
  introAlphas,
  missilesHitPlayers,
  HOTBAR_SIZE,
  moveCargoToHotbar,
  moveHotbarToCargo,
  openExtract,
  rockTouchDistance,
  respawnShip,
  raiseBow,
  selectHotbar,
  setCargoOpen,
  setFab,
  setPaused,
  captureProgress,
  resumeAssembly,
  returnToTitle,
  startMission,
  submitExtract,
  typeChar,
  tickIntro,
  updateFly,
  updateTransition,
} from '../systems.js';

const SNAPSHOT_INTERVAL_MS = 80;
const SHIP_BASE = 72;
/** A little under the last hull, still well above the old 1.05 draw. */
const SHIP_DRAW = SHIP_BASE * 1.35;
const RIM_PAD = 18;
const RIM_RADIUS = 16;

function hullDraw(scene, key, height) {
  const frame = scene.textures.exists(key) ? scene.textures.get(key).get() : null;
  const srcW = frame && frame.width ? frame.width : 1;
  const srcH = frame && frame.height ? frame.height : 1;
  return { w: height * (srcW / srcH), h: height };
}

function destroyOutline(entry) {
  if (!entry) return;
  if (Array.isArray(entry)) entry.forEach((sprite) => sprite.destroy());
  else entry.destroy();
}

const PIECE_DRAW = {
  wall: [104, 22],
  panel: [120, 44],
  corner: [36, 36],
  bunker: [72, 72],
  telescope: [18, 78],
  dock: [84, 46],
  gunship: [76, 36],
  drill: [28, 86],
  extension: [34, 96],
  vault: [64, 64],
};

const PIECE_COLOR = {
  wall: 0xf7fafc,
  panel: 0xe4ebf1,
  corner: 0xc8e7ff,
  bunker: 0x6f8ea8,
  telescope: 0xd7f4ff,
  satellite: 0xb7c6ff,
  dock: 0xffc36b,
  gunship: 0xff8b8b,
  drill: 0xffd36a,
  extension: 0x8ef0c2,
  vault: 0xe7c27a,
  beacon: 0x9bffd0,
};

function piecePoly(gfx, x, y, rot, w, h) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const hw = w / 2;
  const hh = h / 2;
  const corners = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ];
  gfx.beginPath();
  corners.forEach(([px, py], index) => {
    const wx = x + px * c - py * s;
    const wy = y + px * s + py * c;
    if (index === 0) gfx.moveTo(wx, wy);
    else gfx.lineTo(wx, wy);
  });
  gfx.closePath();
}

function drawStationPiece(gfx, piece, color, alpha) {
  const size = PIECE_DRAW[piece.id] || [60, 60];
  gfx.fillStyle(0x02040a, 0.35 * alpha);
  gfx.fillEllipse(piece.x, piece.y + 22, size[0] * 0.8, 18);
  if (piece.id === 'satellite' || piece.id === 'beacon') {
    const radius = piece.id === 'beacon' ? 16 : 22;
    gfx.fillStyle(color, alpha);
    gfx.fillCircle(piece.x, piece.y, radius);
    gfx.lineStyle(2, 0xe9fbff, alpha);
    gfx.strokeCircle(piece.x, piece.y, radius);
    return;
  }
  const rot = piece.rot || 0;
  gfx.fillStyle(color, alpha);
  piecePoly(gfx, piece.x, piece.y, rot, size[0], size[1]);
  gfx.fillPath();
  gfx.lineStyle(2, 0xe9fbff, Math.min(1, alpha + 0.15));
  piecePoly(gfx, piece.x, piece.y, rot, size[0], size[1]);
  gfx.strokePath();
}

function itemSprite(scene, itemId) {
  const key = dropSpriteKey(itemId);
  if (key && scene.textures.exists(key)) return { key, tint: false };
  if (scene.textures.exists(MINERAL_FILE)) return { key: MINERAL_FILE, tint: true };
  return null;
}

export default class PlayScene extends Phaser.Scene {
  constructor() {
    super('PlayScene');
  }

  init(data) {
    this.bridge = data.bridge || this.registry.get('bridge');
    this.state = createState();
    this.audio = null;
    this.inputCtl = null;
    this.unsubs = [];
    this.shipSprite = null;
    this.rockSprites = new Map();
    this.outlineSprites = new Map();
    this.leaveRockSprites = new Map();
    this.dropSprites = new Map();
    this.shotSprites = new Map();
    this.starGfx = null;
    this.flameGfx = null;
    this.reverseGfx = null;
    this.missileGfx = null;
    this.particleGfx = null;
    this.aimGfx = null;
    this.gateGfx = null;
    this.beaconGfx = null;
    this.washGfx = null;
    this.minimapGfx = null;
    this.snapshotAcc = 0;
    this.remoteViews = new Map();
    this.ready = false;
  }

  create() {
    // Scene is ready; BootScene already preloaded SFX into the cache.
    this.audio = createAudio(this);

    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    this.cameras.main.setBackgroundColor('#05060a');
    this.cameras.main.centerOn(this.state.ship.x, this.state.ship.y);

    const canvas = this.game.canvas;
    this.inputCtl = createInput(canvas, {
      canCaptureKeys: () => this.state.mode === 'fly',
    });

    this.starGfx = this.add.graphics().setDepth(0).setScrollFactor(0);

    this.shipSprite = this.add.image(this.state.ship.x, this.state.ship.y, DEFAULT_SHIP);
    this.shipSprite.setDisplaySize(hullDraw(this, DEFAULT_SHIP, SHIP_DRAW).w, hullDraw(this, DEFAULT_SHIP, SHIP_DRAW).h);
    this.shipSprite.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.shipSprite.setDepth(10);

    this.flameGfx = this.add.graphics().setDepth(9);
    this.reverseGfx = this.add.graphics().setDepth(11);
    this.gateGfx = this.add.graphics().setDepth(4);
    this.aimGfx = this.add.graphics().setDepth(7);
    this.stationGfx = this.add.graphics().setDepth(12);
    this.pilotArrowGfx = this.add.graphics().setDepth(30).setScrollFactor(0);
    this.bodySprites = new Map();
    this.plateSprites = new Map();
    this.missileGfx = this.add.graphics().setDepth(8);
    this.particleGfx = this.add.graphics().setDepth(9);

    // Screen-space overlays on a separate UI camera (no world squash/zoom)
    this.beaconGfx = this.add.graphics().setDepth(100).setScrollFactor(0);
    this.washGfx = this.add.graphics().setDepth(110).setScrollFactor(0);
    this.minimapGfx = this.add.graphics().setDepth(120).setScrollFactor(0);
    this.uiCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.uiCam.setScroll(0, 0);
    this.uiCam.setZoom(1);
    this.cameras.main.ignore([this.beaconGfx, this.washGfx, this.minimapGfx]);
    this.uiCam.ignore(
      this.children.list.filter(
        (child) => child !== this.beaconGfx && child !== this.washGfx && child !== this.minimapGfx
      )
    );
    this.scale.on('resize', this.onResize, this);

    this.wireBridge();
    this.wireDigits();
    this.wireLayerKeys();
    this.onPageHide = () => {
      if (!this.state || this.state.mode === 'title') return;
      this.writeLocalFlight();
      const id = this.state.assemblyId;
      if (!id) return;
      saveAssembly(id, captureProgress(this.state));
    };
    window.addEventListener('pagehide', this.onPageHide);

    this.spawnPresenceSprites();

    this.events.once('shutdown', this.shutdown, this);
    this.events.once('destroy', this.shutdown, this);

    this.ready = true;
    this.publishSnapshot(true);
  }

  writeLocalFlight() {
    if (!this.state || this.state.mode === 'title') return { ok: false, error: 'Nothing to save.' };
    const progress = captureProgress(this.state);
    const saved = saveLocalFlight(progress, {
      id: this.state.localFlightId || '',
      name: mainStarName(this.state.seed),
    });
    if (saved.ok) this.state.localFlightId = saved.id;
    return saved;
  }

  /** A shield and a spare round, left in the belt as scenery. */
  spawnPresenceSprites() {
    const cx = this.state.ship.x;
    const cy = this.state.ship.y;
    const specs = [
      { key: 'powerup_shield.png', x: cx - 640, y: cy + 520, size: 40 },
      { key: 'bullet_single.png', x: cx + 420, y: cy + 680, size: 24 },
    ];
    for (const { key, x, y, size } of specs) {
      if (!this.textures.exists(key)) continue;
      const sprite = this.add.image(x, y, key).setDisplaySize(size, size).setDepth(6);
      this.refreshUiIgnore(sprite);
    }
  }

  onResize(gameSize) {
    if (this.uiCam) {
      this.uiCam.setSize(gameSize.width, gameSize.height);
    }
  }

  /** Keep UI camera ignoring newly spawned world sprites. */
  refreshUiIgnore(gameObject) {
    if (this.uiCam && gameObject) this.uiCam.ignore(gameObject);
  }

  wireBridge() {
    const bridge = this.bridge;
    if (!bridge) return;

    this.unsubs.push(
      bridge.on('setShip', (name) => {
        if (typeof name !== 'string' || !name) return;
        if (this.textures.exists(name)) this.state.ship.sprite = name;
        this.publishSnapshot(true);
      }),
      bridge.on('startMission', (payload) => {
        const missionId =
          typeof payload === 'string'
            ? payload
            : payload && payload.missionId
              ? payload.missionId
              : 'add';
        const requested =
          payload && typeof payload === 'object' && payload.seed != null
            ? payload.seed
            : this.state.seed;
        this.clearFlightInput();
        const assemblyId = payload && typeof payload === 'object' ? payload.assemblyId : '';
        const progress = payload && typeof payload === 'object' ? payload.progress : null;
        if (progress) resumeAssembly(this.state, progress, this.audio, assemblyId);
        else startMission(this.state, missionId, this.sharedSeed(requested), this.audio, assemblyId);
        this.resyncSprites();
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('setPaused', (paused) => {
        setPaused(this.state, !!paused);
        this.clearFlightInput();
        this.publishSnapshot(true);
      }),
      bridge.on('saveAndLeave', async () => {
        const saved = this.writeLocalFlight();
        if (!saved.ok) {
          this.state.status = saved.error || 'Could not save on this browser.';
          this.state.statusTime = 3.4;
          this.publishSnapshot(true);
          return;
        }
        const id = this.state.assemblyId;
        if (id) {
          const result = await saveAssembly(id, captureProgress(this.state));
          if (!result.ok) {
            this.state.status = result.error || 'Could not save.';
            this.state.statusTime = 3.4;
            this.publishSnapshot(true);
            return;
          }
        }
        this.clearFlightInput();
        returnToTitle(this.state);
        this.publishSnapshot(true);
      }),
      bridge.on('leaveFlight', () => {
        this.clearFlightInput();
        returnToTitle(this.state);
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('setFab', (open) => {
        setFab(this.state, !!open);
        this.clearFlightInput();
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('nextMission', () => {
        const next = this.state.mission && this.state.mission.next;
        this.clearFlightInput();
        startMission(this.state, next || 'add', this.sharedSeed(this.state.seed), this.audio);
        this.resyncSprites();
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('replayMission', () => {
        const id = this.state.mission ? this.state.mission.id : 'add';
        this.clearFlightInput();
        startMission(this.state, id, this.sharedSeed(this.state.seed), this.audio);
        this.resyncSprites();
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('toggleMute', () => {
        this.audio.toggle();
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('uiBeep', () => {
        if (this.audio && typeof this.audio.menuBeep === 'function') this.audio.menuBeep();
      })
    );

    this.unsubs.push(
      bridge.on('craft', (recipeId) => {
        craftItem(this.state, recipeId, this.audio);
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('setCargo', (open) => {
        setCargoOpen(this.state, !!open);
        this.clearFlightInput();
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('raiseBow', () => {
        raiseBow(this.state, this.audio);
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('cargoToHotbar', (payload) => {
        const cargoIndex = payload && payload.cargoIndex != null ? payload.cargoIndex : payload;
        moveCargoToHotbar(this.state, Number(cargoIndex), hotbarIndex(this.state));
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('hotbarToCargo', (payload) => {
        const index =
          payload && typeof payload === 'object' && payload.index != null ? payload.index : payload;
        moveHotbarToCargo(this.state, Number(index));
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('inventoryClick', (payload) => {
        const area = payload && payload.area;
        const index = payload && payload.index != null ? Number(payload.index) : NaN;
        inventoryClick(this.state, area, index);
        if (area === 'hotbar') selectHotbar(this.state, index);
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('inventoryDrag', (payload) => {
        if (!payload) return;
        inventoryDrag(
          this.state,
          payload.fromArea,
          Number(payload.fromIndex),
          payload.toArea,
          Number(payload.toIndex)
        );
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('respawn', () => {
        respawnShip(this.state, this.audio);
        this.clearFlightInput();
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('selectHotbar', (payload) => {
        const index =
          payload && typeof payload === 'object' && payload.index != null
            ? payload.index
            : payload;
        selectHotbar(this.state, index);
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('openExtract', (payload) => {
        const rockId =
          typeof payload === 'number'
            ? payload
            : payload && payload.rockId != null
              ? payload.rockId
              : this.state.extractAvailable;
        this.clearFlightInput();
        openExtract(this.state, rockId, this.audio);
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('cancelExtract', () => {
        cancelExtract(this.state);
        this.clearFlightInput();
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('extractDigit', (payload) => {
        if (this.state.mode !== 'extract') return;
        const raw =
          typeof payload === 'string' || typeof payload === 'number'
            ? payload
            : payload && payload.digit != null
              ? payload.digit
              : null;
        if (raw == null) return;
        const token = String(raw);
        if (token === 'backspace' || token === 'Backspace') {
          extractBackspace(this.state);
          this.publishSnapshot(true);
          return;
        }
        if (!/^[0-9]$/.test(token)) return;
        typeChar(this.state, token, this.audio);
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('extractSubmit', () => {
        submitExtract(this.state, this.audio);
        this.publishSnapshot(true);
      })
    );
  }

  clearFlightInput() {
    if (!this.inputCtl) return;
    this.inputCtl.clearKeys();
    this.inputCtl.takeClicks();
  }

  /** Star rank of the rock under the cursor, in screen space. */
  syncRockTip() {
    const mouse = this.inputCtl && this.inputCtl.mouse;
    if (!mouse || !mouse.inside) {
      this.state.rockTip = null;
      return;
    }
    this.syncPointerWorld();
    const x = mouse.worldX;
    const y = mouse.worldY;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      this.state.rockTip = null;
      return;
    }
    let best = null;
    let bestDist = Infinity;
    for (const rock of this.state.asteroids) {
      if (!rock.alive || rock.depleted) continue;
      const sprite = this.rockSprites && this.rockSprites.get(rock.id);
      const radius = sprite
        ? Math.max(sprite.displayWidth, sprite.displayHeight) * 0.46
        : Math.max(8, rockTouchDistance(rock) - 24);
      const dist = Math.hypot(rock.x - x, rock.y - y);
      if (dist <= radius && dist < bestDist) {
        best = rock;
        bestDist = dist;
      }
    }
    if (!best) {
      this.state.rockTip = null;
      return;
    }
    const canvas = this.game && this.game.canvas;
    const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
    this.state.rockTip = {
      stars: best.difficulty === 'hard' ? '★★★' : '★',
      x: rect.left + mouse.x,
      y: rect.top + mouse.y,
    };
  }

  /** Project canvas-local pointer through the main camera (handles scroll/zoom/squash). */
  syncPointerWorld() {
    if (!this.inputCtl) return;
    const cam = this.cameras.main;
    this.inputCtl.prepareWorldPoints((sx, sy) => cam.getWorldPoint(sx, sy));
  }

  wireDigits() {
    this.onDigitKey = (event) => {
      if (event.repeat) return;
      const mode = this.state.mode;
      if (mode !== 'fly' && mode !== 'extract' && mode !== 'cargo') return;
      const el = document.activeElement;
      const tag = el && el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (el && el.isContentEditable)) return;

      if (event.code === 'Escape') {
        if (mode === 'extract') {
          cancelExtract(this.state);
          this.clearFlightInput();
          event.preventDefault();
          this.publishSnapshot(true);
          return;
        }
        this.state.buffer = '';
        this.state.targetId = 0;
        this.publishSnapshot(true);
        return;
      }

      if (mode === 'extract') {
        if (event.code === 'Backspace') {
          this.state.buffer = this.state.buffer.slice(0, -1);
          event.preventDefault();
          this.publishSnapshot(true);
          return;
        }
        const digit = digitFromEvent(event);
        if (digit != null) {
          event.preventDefault();
          typeChar(this.state, digit, this.audio);
          this.publishSnapshot(true);
        }
        return;
      }

      if (mode === 'cargo') {
        const heldDigit = digitFromEvent(event);
        if (heldDigit != null) {
          const slot = heldDigit === '0' ? HOTBAR_SIZE - 1 : Number(heldDigit) - 1;
          if (slot >= 0 && slot < HOTBAR_SIZE) {
            selectHotbar(this.state, slot);
            event.preventDefault();
            this.publishSnapshot(true);
          }
        }
        return;
      }

      if (event.code === 'Backspace') {
        this.state.buffer = this.state.buffer.slice(0, -1);
        event.preventDefault();
        this.publishSnapshot(true);
        return;
      }
      if (event.code === 'KeyQ') {
        changeLayer(this.state, -1, this.audio);
        this.publishSnapshot(true);
        return;
      }
      if (event.code === 'KeyE') {
        changeLayer(this.state, 1, this.audio);
        this.publishSnapshot(true);
        return;
      }
      // Digits 1–9 and 0 select a hotbar slot only while flying.
      // Extract mode returns above and still types the math answer.
      const digit = digitFromEvent(event);
      if (digit != null) {
        const slot = digit === '0' ? HOTBAR_SIZE - 1 : Number(digit) - 1;
        if (slot >= 0 && slot < HOTBAR_SIZE) {
          selectHotbar(this.state, slot);
          event.preventDefault();
          this.publishSnapshot(true);
        }
      }
    };
    window.addEventListener('keydown', this.onDigitKey);
  }

  wireLayerKeys() {
    /* Q/E handled in wireDigits alongside digit input */
  }

  viewSize() {
    return { w: this.scale.width, h: this.scale.height };
  }

  sharedSeed(fallback) {
    const live = multiplayer.getSnapshot();
    if (live.connected && live.seed) return live.seed;
    return fallback;
  }

  syncShareFlag() {
    const snap = multiplayer.getSnapshot();
    this.state.playerId = multiplayer.playerId;
    this.state.shareWorld = !!(snap.connected && snap.ship && !snap.needsShip && !snap.sessionFull);
    if (snap.ship && this.state.ship.sprite !== snap.ship) this.state.ship.sprite = snap.ship;
    return snap;
  }

  applyIncomingWorld() {
    for (const event of multiplayer.takeWorldNotes()) {
      applyWorldEvent(this.state, event, multiplayer.playerId);
    }
    for (const note of multiplayer.takeRockNotes()) applySharedRock(this.state, note);
    for (const amount of multiplayer.takeFireNotes()) applyFriendlyFire(this.state, amount, this.audio);
  }

  publishMultiplayerPose() {
    const ship = this.state.ship;
    const snap = this.syncShareFlag();
    multiplayer.noteFlight({
      missionId: this.state.mission ? this.state.mission.id : '',
      layer: this.state.layer,
      seed: this.state.seed || '',
    });
    if (!snap.connected || this.state.mode === 'title' || !this.state.shareWorld) {
      if (this.state.sharedRocks) this.state.sharedRocks.length = 0;
      if (this.state.sharedGathers) this.state.sharedGathers.length = 0;
      if (this.state.worldEvents) this.state.worldEvents.length = 0;
      return;
    }
    multiplayer.publishPose({
      x: ship.x,
      y: ship.y,
      aim: ship.aim,
      layer: this.state.layer,
      sprite: snap.ship || ship.sprite,
      thrusting: !!ship.thrusting,
      thrust: ship.thrust || 0,
      extracting: this.state.mode === 'extract',
      hp: ship.hp,
      maxHp: ship.maxHp,
      pilot: readPilotName(),
    });
    const queued = this.state.worldEvents;
    if (queued && queued.length) {
      const burst = queued.splice(0, 24);
      for (const event of burst) multiplayer.publishWorld(event);
    }
    for (const id of missilesHitPlayers(this.state, multiplayer.remoteShips())) {
      multiplayer.publishFire(id, 14);
    }
    const gathers = this.state.sharedGathers;
    if (gathers && gathers.length) {
      for (const gather of gathers) multiplayer.publishGather(gather);
      gathers.length = 0;
    }
  }

  syncRemoteShips() {
    const showAny = this.state.mode !== 'title';
    const layer = this.state.layer;
    const seen = new Set();
    for (const remote of multiplayer.remoteShips()) {
      seen.add(remote.id);
      let view = this.remoteViews.get(remote.id);
      const visible = showAny && remote.hasPose && remote.layer === layer;
      const key = remote.sprite && this.textures.exists(remote.sprite) ? remote.sprite : DEFAULT_SHIP;
      if (!view) {
        const sprite = this.add.image(remote.x, remote.y, key);
        const draw = hullDraw(this, key, SHIP_BASE);
        sprite.setDisplaySize(draw.w, draw.h);
        sprite.setDepth(9);
        const label = this.add.text(remote.x, remote.y - 64, '', {
          fontFamily: '"Oxanium", "Segoe UI", sans-serif',
          fontSize: '16px',
          color: '#f4fbff',
          backgroundColor: '#0b1220cc',
          padding: { left: 6, right: 6, top: 3, bottom: 3 },
        });
        label.setOrigin(0.5, 1);
        label.setDepth(40);
        this.refreshUiIgnore(sprite);
        this.refreshUiIgnore(label);
        const drill = this.add.graphics().setDepth(11);
        this.refreshUiIgnore(drill);
        const hull = this.add.graphics().setDepth(12);
        this.refreshUiIgnore(hull);
        const flame = this.add.graphics().setDepth(8);
        this.refreshUiIgnore(flame);
        view = { sprite, label, drill, hull, flame };
        this.remoteViews.set(remote.id, view);
      } else if (view.sprite.texture.key !== key) {
        view.sprite.setTexture(key);
      }
      view.sprite.setPosition(remote.x, remote.y);
      view.sprite.setRotation(remote.aim + Math.PI / 2);
      const draw = hullDraw(this, key, SHIP_BASE);
      view.sprite.setDisplaySize(draw.w, draw.h);
      view.sprite.setVisible(visible);
      const name = remote.pilot || 'Pilot';
      const tag = remote.tag && remote.tag !== name ? name + ' · ' + remote.tag : name;
      if (view.label.text !== tag) view.label.setText(tag);
      view.label.setPosition(remote.x, remote.y - 64);
      view.label.setVisible(visible);
      if (!view.flame) {
        view.flame = this.add.graphics().setDepth(8);
        this.refreshUiIgnore(view.flame);
      }
      if (view.flame) {
        syncFlame(
          view.flame,
          { x: remote.x, y: remote.y, aim: remote.aim, thrust: visible ? remote.thrust || 0 : 0 },
          1,
          this.state.clock || 0
        );
        view.flame.setVisible(visible && (remote.thrust || 0) >= 0.04);
      }
      this.syncRemoteHull(view.hull, remote, visible);
      this.syncRemoteDrill(view.drill, remote, visible);
    }
    for (const [id, view] of this.remoteViews) {
      if (seen.has(id)) continue;
      view.sprite.destroy();
      view.label.destroy();
      if (view.drill) view.drill.destroy();
      if (view.hull) view.hull.destroy();
      if (view.flame) view.flame.destroy();
      this.remoteViews.delete(id);
    }
    this.syncRemoteGathers(showAny, layer);
  }

  /** Small hull bar sitting just under the remote pilot's tag. */
  syncRemoteHull(gfx, remote, visible) {
    if (!gfx) return;
    gfx.clear();
    const maxHp = remote.maxHp > 0 ? remote.maxHp : 100;
    const hp = Math.max(0, Math.min(maxHp, remote.hp != null ? remote.hp : maxHp));
    if (!visible) {
      gfx.setVisible(false);
      return;
    }
    gfx.setVisible(true);
    const width = 40;
    const height = 4;
    const x = remote.x - width / 2;
    const y = remote.y - 48;
    const frac = maxHp > 0 ? hp / maxHp : 0;
    gfx.fillStyle(0x102033, 0.92);
    gfx.fillRect(x, y, width, height);
    gfx.fillStyle(frac > 0.35 ? 0x7dff9a : 0xff6b6b, 1);
    gfx.fillRect(x, y, Math.max(0, width * frac), height);
  }

  /** Spinning bit just ahead of another player's ship while they extract. */
  syncRemoteDrill(gfx, remote, visible) {
    gfx.clear();
    if (!visible || !remote.extracting) {
      gfx.setVisible(false);
      return;
    }
    gfx.setVisible(true);
    const reach = 46;
    const tipX = remote.x + Math.cos(remote.aim) * reach;
    const tipY = remote.y + Math.sin(remote.aim) * reach;
    gfx.lineStyle(3, 0x7ee7ff, 0.85);
    gfx.lineBetween(remote.x, remote.y, tipX, tipY);
    const spin = this.state.clock * 14;
    gfx.fillStyle(0xd7f6ff, 0.95);
    for (let i = 0; i < 3; i++) {
      const a = spin + (i * Math.PI * 2) / 3;
      gfx.fillCircle(tipX + Math.cos(a) * 8, tipY + Math.sin(a) * 8, 3);
    }
    gfx.fillStyle(0xfff4d6, 1);
    gfx.fillCircle(tipX, tipY, 4);
  }

  syncRemoteGathers(showAny, layer) {
    if (!this.gatherSprites) this.gatherSprites = new Map();
    const seen = new Set();
    for (const gather of multiplayer.remoteGathers()) {
      seen.add(gather.key);
      const remote = [...multiplayer.remoteShips()].find((ship) => ship.id === gather.shipId);
      const visible = showAny && gather.layer === layer && remote && remote.layer === layer;
      let sprite = this.gatherSprites.get(gather.key);
      if (!sprite) {
        const face = itemSprite(this, gather.itemId);
        sprite = face
          ? this.add.image(gather.x, gather.y, face.key).setDisplaySize(22, 22)
          : this.add.circle(gather.x, gather.y, 8, 0x7ad7ff, 0.95);
        sprite.setDepth(11);
        if (face && face.tint && typeof sprite.setTint === 'function') sprite.setTint(itemTint(gather.itemId));
        this.refreshUiIgnore(sprite);
        this.gatherSprites.set(gather.key, sprite);
      }
      const u = Math.min(1, Math.max(0, (performance.now() - gather.t0) / gather.dur));
      const shipX = remote ? remote.x : gather.x;
      const shipY = remote ? remote.y : gather.y;
      sprite.setPosition(gather.x + (shipX - gather.x) * u, gather.y + (shipY - gather.y) * u);
      sprite.setAlpha(1 - u * 0.35);
      sprite.setVisible(visible);
    }
    for (const [key, sprite] of this.gatherSprites) {
      if (seen.has(key)) continue;
      sprite.destroy();
      this.gatherSprites.delete(key);
    }
  }

  flightInput() {
    const live = introAlphas(this.state).live && !this.state.orePopping;
    if (live) return this.inputCtl;
    return {
      mouse: this.inputCtl ? this.inputCtl.mouse : { x: 0, y: 0, worldX: 0, worldY: 0, touch: false, held: false },
      thrust: () => false,
      brake: () => false,
      strafe: () => 0,
      takeClicks: () => [],
    };
  }

  update(_time, delta) {
    if (!this.ready) return;
    const dt = Math.min(0.033, delta / 1000);
    tickIntro(this.state, dt);
    const mode = this.state.mode;
    const controls = introAlphas(this.state).live;

    if (this.inputCtl && controls && (mode === 'fly' || mode === 'cargo')) {
      const wheel = this.inputCtl.takeWheel();
      if (wheel) {
        cycleHotbar(this.state, wheel);
        this.publishSnapshot(true);
      }
    } else if (this.inputCtl) {
      this.inputCtl.takeWheel();
    }

    this.syncShareFlag();
    this.applyIncomingWorld();

    if (mode === 'fly') {
      this.syncPointerWorld();
      updateFly(this.state, dt, {
        input: this.flightInput(),
        audio: this.audio,
        view: this.viewSize(),
      });
    } else if (mode === 'transition') {
      this.clearFlightInput();
      updateTransition(this.state, dt);
    } else {
      // title / pause / fab / extract / clear — drop thrust keys so seed focus never leaves WASD stuck
      this.clearFlightInput();
      idle(this.state, dt, this.audio);
    }

    if (mode !== 'title') this.syncRockTip();
    this.publishMultiplayerPose();
    multiplayer.step();
    this.syncDisplay();
    this.syncRemoteShips();
    this.snapshotAcc += delta;
    if (this.snapshotAcc >= SNAPSHOT_INTERVAL_MS) {
      this.snapshotAcc = 0;
      this.publishSnapshot(false);
    }
  }

  syncSingleShots() {
    if (!this.shotSprites) this.shotSprites = new Map();
    const shots = []
      .concat(this.state.missiles || [], this.state.ghostMissiles || [])
      .filter((missile) => missile.single);
    const seen = new Set();
    shots.forEach((missile, index) => {
      const key = missile.id != null ? missile.id : missile.shotId || 'shot-' + index;
      seen.add(key);
      let sprite = this.shotSprites.get(key);
      if (sprite && !sprite.scene) {
        this.shotSprites.delete(key);
        sprite = null;
      }
      if (!sprite) {
        const face = missile.face && this.textures.exists(missile.face) ? missile.face : 'bullet_single.png';
        const texture = this.textures.exists(face) ? face : null;
        sprite = texture
          ? this.add.image(missile.x, missile.y, texture)
          : this.add.circle(missile.x, missile.y, 4, 0xb9f3ff, 1);
        sprite.setDepth(11);
        if (sprite.setDisplaySize) sprite.setDisplaySize(18, 18);
        this.refreshUiIgnore(sprite);
        this.shotSprites.set(key, sprite);
      }
      sprite.setPosition(missile.x, missile.y);
      if (sprite.setRotation) sprite.setRotation(Math.atan2(missile.vy, missile.vx));
    });
    for (const [key, sprite] of this.shotSprites) {
      if (seen.has(key)) continue;
      sprite.destroy();
      this.shotSprites.delete(key);
    }
  }

  syncPlates() {
    if (!this.plateSprites) this.plateSprites = new Map();
    const plates = visiblePieces(this.state).filter((piece) => piece.id === 'wall' || piece.id === 'panel');
    const seen = new Set();
    for (const piece of plates) {
      seen.add(piece.uid);
      const keyName = piece.id === 'panel' ? 'panel-plate.svg' : 'wall-plate.svg';
      let sprite = this.plateSprites.get(piece.uid);
      if (!sprite || !sprite.scene) {
        if (sprite) sprite.destroy();
        const texture = this.textures.exists(keyName) ? keyName : null;
        sprite = texture
          ? this.add.image(piece.x, piece.y, texture)
          : this.add.rectangle(piece.x, piece.y, piece.id === 'panel' ? 120 : 104, piece.id === 'panel' ? 44 : 22, 0xf4f7fb);
        sprite.setDepth(12);
        this.refreshUiIgnore(sprite);
        this.plateSprites.set(piece.uid, sprite);
      }
      const size = piece.id === 'panel' ? [120, 44] : [104, 22];
      sprite.setPosition(piece.x, piece.y);
      sprite.setRotation(piece.rot || 0);
      if (sprite.setDisplaySize) sprite.setDisplaySize(size[0], size[1]);
    }
    for (const [uid, sprite] of this.plateSprites) {
      if (seen.has(uid)) continue;
      sprite.destroy();
      this.plateSprites.delete(uid);
    }
  }

  syncBodies() {
    if (!this.bodySprites) this.bodySprites = new Map();
    const bodies = []
      .concat(this.state.planets || [], this.state.sunBodies || [], this.state.spaceObjects || [])
      .filter((body) => body.layer === this.state.layer);
    const seen = new Set();
    for (const body of bodies) {
      const id = (body.kind || 'body') + ':' + body.layer + ':' + Math.round(body.x) + ':' + Math.round(body.y);
      seen.add(id);
      let sprite = this.bodySprites.get(id);
      if (!sprite || !sprite.scene) {
        if (sprite) sprite.destroy();
        const texture = body.key && this.textures.exists(body.key) ? body.key : null;
        const diameter = (body.r || 80) * 2;
        sprite = texture
          ? this.add.image(body.x, body.y, texture)
          : this.add.circle(
              body.x,
              body.y,
              body.r || 80,
              body.kind === 'lair' ? 0x241433 : body.key && String(body.key).startsWith('star') ? 0xfff1c2 : 0xc5d0dc,
              1
            );
        sprite.setDepth(body.key && String(body.key).startsWith('star') ? 3 : 2);
        if (sprite.setDisplaySize) sprite.setDisplaySize(diameter, diameter);
        this.refreshUiIgnore(sprite);
        this.bodySprites.set(id, sprite);
      }
      sprite.setPosition(body.x, body.y);
    }
    for (const [id, sprite] of this.bodySprites) {
      if (seen.has(id)) continue;
      sprite.destroy();
      this.bodySprites.delete(id);
    }
  }

  syncAliens() {
    if (!this.alienSprites) this.alienSprites = new Map();
    const aliens = (this.state.aliens || []).filter((alien) => alien && !alien.gone && alien.layer === this.state.layer);
    const seen = new Set();
    for (const alien of aliens) {
      seen.add(alien.id);
      let sprite = this.alienSprites.get(alien.id);
      const key = alien.file && this.textures.exists(alien.file) ? alien.file : null;
      if (!sprite || !sprite.scene) {
        if (sprite) sprite.destroy();
        sprite = key
          ? this.add.image(alien.x, alien.y, key)
          : this.add.circle(alien.x, alien.y, 28, 0x7dff9a, 1);
        sprite.setDepth(7);
        if (sprite.setDisplaySize) sprite.setDisplaySize(84, 84);
        this.refreshUiIgnore(sprite);
        this.alienSprites.set(alien.id, sprite);
      }
      sprite.setPosition(alien.x, alien.y);
      if (sprite.setRotation) sprite.setRotation(alien.aim || 0);
    }
    for (const [id, sprite] of this.alienSprites) {
      if (seen.has(id)) continue;
      sprite.destroy();
      this.alienSprites.delete(id);
    }
    if (!this.alienShotGfx) {
      this.alienShotGfx = this.add.graphics().setDepth(8);
      this.refreshUiIgnore(this.alienShotGfx);
    }
    const gfx = this.alienShotGfx;
    gfx.clear();
    for (const shot of this.state.alienShots || []) {
      if (shot.layer !== this.state.layer) continue;
      gfx.fillStyle(shot.color || 0x7dff9a, 1);
      if (shot.kind === 'ring') {
        gfx.lineStyle(3, shot.color || 0xff7ab8, 0.9);
        gfx.strokeCircle(shot.x, shot.y, shot.r || 20);
      } else {
        gfx.fillCircle(shot.x, shot.y, shot.r || 6);
      }
    }
  }

  syncPilotArrows() {
    const gfx = this.pilotArrowGfx;
    if (!gfx) return;
    gfx.clear();
    if (this.state.mode === 'title') return;
    const cam = this.cameras.main;
    const zoom = cam.zoom || 1;
    const left = cam.scrollX;
    const top = cam.scrollY;
    const viewW = cam.width;
    const viewH = cam.height;
    const right = left + viewW / zoom;
    const bottom = top + viewH / zoom;
    const ship = this.state.ship;
    for (const remote of multiplayer.remoteShips()) {
      if (!remote.hasPose || remote.layer !== this.state.layer) continue;
      const onScreen =
        remote.x > left + 48 &&
        remote.x < right - 48 &&
        remote.y > top + 48 &&
        remote.y < bottom - 48;
      if (onScreen) continue;
      const sx = (remote.x - left) * zoom;
      const sy = (remote.y - top) * zoom;
      const cx = viewW / 2;
      const cy = viewH / 2;
      const ang = Math.atan2(sy - cy, sx - cx);
      const inset = 64;
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      let t = 1e9;
      if (dx > 0) t = Math.min(t, (viewW - inset - cx) / dx);
      if (dx < 0) t = Math.min(t, (inset - cx) / dx);
      if (dy > 0) t = Math.min(t, (viewH - inset - cy) / dy);
      if (dy < 0) t = Math.min(t, (inset - cy) / dy);
      const x = cx + dx * t;
      const y = cy + dy * t;
      const dist = Math.hypot(remote.x - ship.x, remote.y - ship.y);
      const size = 34 - Math.min(1, dist / 5200) * 18;
      gfx.fillStyle(0x7ee7ff, 0.95);
      gfx.lineStyle(2, 0xe9fbff, 0.9);
      gfx.beginPath();
      gfx.moveTo(x + Math.cos(ang) * size, y + Math.sin(ang) * size);
      gfx.lineTo(x + Math.cos(ang + 2.4) * size * 0.72, y + Math.sin(ang + 2.4) * size * 0.72);
      gfx.lineTo(x + Math.cos(ang - 2.4) * size * 0.72, y + Math.sin(ang - 2.4) * size * 0.72);
      gfx.closePath();
      gfx.fillPath();
      gfx.strokePath();
    }
  }

  syncStation() {
    const gfx = this.stationGfx;
    if (!gfx) return;
    gfx.clear();
    for (const piece of visiblePieces(this.state)) {
      if (piece.id === 'wall' || piece.id === 'panel') continue;
      drawStationPiece(gfx, piece, PIECE_COLOR[piece.id] || 0x9ad7ff, 0.92);
    }
    this.syncPlates();
    this.syncBodies();
    this.syncAliens();
    this.syncPilotArrows();
    const mouse = this.inputCtl && this.inputCtl.mouse;
    if (!mouse || !Number.isFinite(mouse.worldX) || !Number.isFinite(mouse.worldY)) return;
    const hotbar = this.state.hotbar;
    const stack = hotbar && hotbar[hotbarIndex(this.state)];
    if (!stack) return;
    const item = itemById(stack.id);
    if (!item || item.kind !== 'construction') return;
    const ghost = ghostPose(this.state, stack.id, mouse.worldX, mouse.worldY);
    drawStationPiece(
      gfx,
      { id: stack.id, x: ghost.x, y: ghost.y, rot: ghost.rot },
      ghost.ok ? PIECE_COLOR[stack.id] || 0x9ad7ff : 0xff5a6a,
      0.4
    );
  }

  publishSnapshot(force) {
    if (!this.bridge) return;
    if (!force && this.state.mode === 'title') {
      /* still publish quiet title idle hud occasionally */
    }
    const patch = buildSnapshotPatch(this.state, this.audio.muted);
    patch.extractAnchor = this.extractAnchor();
    this.bridge.setSnapshot(patch);
  }

  /** Screen position of the rock being extracted, so the numpad can sit clear of it. */
  extractAnchor() {
    if (this.state.mode !== 'extract' || !this.state.extractRockId) return null;
    const rock = this.state.asteroids.find((item) => item.alive && item.id === this.state.extractRockId);
    if (!rock) return null;
    const cam = this.cameras.main;
    if (!cam || !cam.worldView) return null;
    const zoomX = cam.zoomX || cam.zoom || 1;
    const zoomY = cam.zoomY || cam.zoom || 1;
    const sprite = this.rockSprites.get(rock.id);
    const base = sprite
      ? Math.max(sprite.displayWidth, sprite.displayHeight) * 0.5
      : rock.size * 0.45;
    return {
      x: (rock.x - cam.worldView.x) * zoomX,
      y: (rock.y - cam.worldView.y) * zoomY,
      r: base * Math.max(zoomX, zoomY),
      vw: this.scale.width,
      vh: this.scale.height,
    };
  }

  resyncSprites() {
    for (const sprite of this.rockSprites.values()) sprite.destroy();
    this.rockSprites.clear();
    for (const entry of this.outlineSprites.values()) destroyOutline(entry);
    this.outlineSprites.clear();
    for (const sprite of this.leaveRockSprites.values()) sprite.destroy();
    this.leaveRockSprites.clear();
    for (const sprite of this.dropSprites.values()) sprite.destroy();
    this.dropSprites.clear();
  }

  ensureRockSprite(map, rock, depth) {
    let sprite = map.get(rock.id);
    const tex = ASTEROID_FILES[rock.sprite % ASTEROID_FILES.length];
    if (!sprite) {
      sprite = this.add.image(rock.x, rock.y, tex);
      sprite.setDepth(depth);
      this.refreshUiIgnore(sprite);
      map.set(rock.id, sprite);
    } else if (sprite.texture.key !== tex && this.textures.exists(tex)) {
      sprite.setTexture(tex);
    }
    return sprite;
  }

  pruneRockSprites(map, keepIds) {
    for (const [id, sprite] of map) {
      if (!keepIds.has(id)) {
        sprite.destroy();
        map.delete(id);
      }
    }
  }

  pruneOutlines() {
    const live = new Set([...this.rockSprites.keys(), ...this.leaveRockSprites.keys()]);
    for (const [id, entry] of this.outlineSprites) {
      if (live.has(id)) continue;
      destroyOutline(entry);
      this.outlineSprites.delete(id);
    }
  }

  rockInView(rock) {
    const view = this.cameras.main.worldView;
    const pad = 1000;
    return (
      rock.x >= view.x - pad &&
      rock.x <= view.x + view.width + pad &&
      rock.y >= view.y - pad &&
      rock.y <= view.y + view.height + pad
    );
  }

  /**
   * Bright sky-blue rim of the asteroid's alpha shape. A tint on the dark
   * sprite stays dark, so the rim is its own texture drawn over the rock.
   */
  ensureRimTexture(key) {
    const rimKey = key + '::rim';
    if (this.textures.exists(rimKey)) return rimKey;
    const texture = this.textures.get(key);
    const src = texture && texture.getSourceImage ? texture.getSourceImage() : null;
    if (!src || !src.width || !src.height) return null;
    const pad = RIM_PAD;
    const radius = RIM_RADIUS;
    const canvas = document.createElement('canvas');
    canvas.width = src.width + pad * 2;
    canvas.height = src.height + pad * 2;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(src, pad, pad);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;
    const width = canvas.width;
    const height = canvas.height;
    const count = width * height;
    const solid = new Uint8Array(count);
    for (let i = 0; i < count; i++) solid[i] = data[i * 4 + 3] > 32 ? 1 : 0;
    const dist = new Uint16Array(count);
    dist.fill(65535);
    for (let i = 0; i < count; i++) if (solid[i]) dist[i] = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        let d = dist[i];
        if (x > 0) d = Math.min(d, dist[i - 1] + 3);
        if (y > 0) d = Math.min(d, dist[i - width] + 3);
        if (x > 0 && y > 0) d = Math.min(d, dist[i - width - 1] + 4);
        if (x + 1 < width && y > 0) d = Math.min(d, dist[i - width + 1] + 4);
        dist[i] = d;
      }
    }
    for (let y = height - 1; y >= 0; y--) {
      for (let x = width - 1; x >= 0; x--) {
        const i = y * width + x;
        let d = dist[i];
        if (x + 1 < width) d = Math.min(d, dist[i + 1] + 3);
        if (y + 1 < height) d = Math.min(d, dist[i + width] + 3);
        if (x + 1 < width && y + 1 < height) d = Math.min(d, dist[i + width + 1] + 4);
        if (x > 0 && y + 1 < height) d = Math.min(d, dist[i + width - 1] + 4);
        dist[i] = d;
      }
    }
    const limit = radius * 3;
    const out = ctx.createImageData(width, height);
    const pixels = out.data;
    for (let i = 0; i < count; i++) {
      if (solid[i] || dist[i] === 0 || dist[i] > limit) continue;
      const px = dist[i] / 3;
      const fade = px < 10 ? 1 : Math.max(0, 1 - (px - 10) / (radius - 10));
      pixels[i * 4] = 126;
      pixels[i * 4 + 1] = 231;
      pixels[i * 4 + 2] = 255;
      pixels[i * 4 + 3] = Math.round(255 * fade);
    }
    ctx.putImageData(out, 0, 0);
    this.textures.addCanvas(rimKey, canvas);
    return rimKey;
  }

  /**
   * Sky-blue trace around the rock's real shape. Shown for the extract
   * target and for the nearest rock within targeting range.
   */
  syncRockOutline(sprite, rock) {
    const show = !!(rock && rock.alive && (rock.outline || rock.active || rock.near) && sprite.visible);
    let rim = this.outlineSprites.get(rock.id);
    if (!show) {
      if (rim) {
        destroyOutline(rim);
        this.outlineSprites.delete(rock.id);
      }
      return;
    }
    const rimKey = this.ensureRimTexture(sprite.texture.key);
    if (!rimKey) return;
    if (!rim || Array.isArray(rim)) {
      if (rim) destroyOutline(rim);
      rim = this.add.image(sprite.x, sprite.y, rimKey);
      rim.setDepth(6);
      rim.setOrigin(0.5, 0.5);
      this.refreshUiIgnore(rim);
      this.outlineSprites.set(rock.id, rim);
    } else if (rim.texture.key !== rimKey && this.textures.exists(rimKey)) {
      rim.setTexture(rimKey);
    }
    rim.setPosition(sprite.x, sprite.y);
    rim.setRotation(sprite.rotation);
    rim.setScale(sprite.scaleX, sprite.scaleY);
    rim.setAlpha(sprite.alpha);
    rim.clearTint();
    rim.setVisible(true);
  }

  applyRockEnvelope(sprite, rock, envelope) {
    const envScale = envelope && envelope.scale != null ? envelope.scale : 1;
    const envAlpha = envelope && envelope.alpha != null ? envelope.alpha : 1;
    const introRock = introAlphas(this.state).rock;
    const baseAlpha = (rock.active ? 1 : rock.near ? 0.95 : 0.85) * introRock;
    sprite.setPosition(rock.x, rock.y);
    sprite.setRotation(rock.rot);
    sprite.setScale(rockDisplayScale(rock, envScale));
    sprite.setAlpha(baseAlpha * envAlpha);
    sprite.setTint(rock.active || rock.near ? 0xffffff : 0xd0d8e8);
    sprite.setVisible(true);
    this.syncRockOutline(sprite, rock);
  }

  syncLayerRocks(fx) {
    if (!fx) {
      for (const sprite of this.leaveRockSprites.values()) sprite.destroy();
      this.leaveRockSprites.clear();
      const seen = new Set();
      for (const rock of this.state.asteroids) {
        if (!rock.alive || !this.rockInView(rock)) continue;
        seen.add(rock.id);
        this.applyRockEnvelope(this.ensureRockSprite(this.rockSprites, rock, 5), rock, null);
      }
      this.pruneRockSprites(this.rockSprites, seen);
      this.pruneOutlines();
      return;
    }

    const leaveRocks =
      fx.swapped && this.state.transition.prevAsteroids
        ? this.state.transition.prevAsteroids
        : this.state.asteroids;

    const leaveSeen = new Set();
    if (fx.leave.alpha > 0.01) {
      for (const rock of leaveRocks) {
        if (rock.alive === false || !this.rockInView(rock)) continue;
        leaveSeen.add(rock.id);
        // After swap, leave rocks live in leaveRockSprites so enter can reuse rockSprites.
        const map = fx.swapped ? this.leaveRockSprites : this.rockSprites;
        this.applyRockEnvelope(this.ensureRockSprite(map, rock, 5), rock, fx.leave);
      }
    }
    if (fx.swapped) {
      this.pruneRockSprites(this.leaveRockSprites, leaveSeen);
    } else {
      this.pruneRockSprites(this.rockSprites, leaveSeen);
      for (const sprite of this.leaveRockSprites.values()) sprite.destroy();
      this.leaveRockSprites.clear();
    }

    const enterSeen = new Set();
    if (fx.swapped && fx.enter.alpha > 0.01) {
      for (const rock of this.state.asteroids) {
        if (!rock.alive || !this.rockInView(rock)) continue;
        enterSeen.add(rock.id);
        this.applyRockEnvelope(this.ensureRockSprite(this.rockSprites, rock, 5), rock, fx.enter);
      }
    }
    if (fx.swapped) {
      this.pruneRockSprites(this.rockSprites, enterSeen);
    }
    this.pruneOutlines();
  }

  syncDisplay() {
    const fx = layerTransitionFx(this.state);
    const ship = this.state.ship;
    const shipScale = fx ? fx.shipScale : 1;
    const { w, h } = this.viewSize();

    const intro = introAlphas(this.state);
    if (this.starGfx) syncStars(this.starGfx, this.state.stars, this.state.camera, w, h, intro.star);

    if (this.shipSprite) {
      const key = this.textures.exists(ship.sprite) ? ship.sprite : DEFAULT_SHIP;
      if (this.shipSprite.texture.key !== key) {
        this.shipSprite.setTexture(key);
        this.shipSprite.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
      this.shipSprite.setPosition(ship.x, ship.y);
      this.shipSprite.setRotation(ship.aim + Math.PI / 2);
      const draw = hullDraw(this, key, SHIP_DRAW * shipScale);
      this.shipSprite.setDisplaySize(draw.w, draw.h);
      this.shipSprite.setAlpha(intro.ship);
      this.shipSprite.setVisible(
        intro.ship > 0.02 && this.state.mode !== 'title' && this.state.mode !== 'dead'
      );
    }
    if (this.flameGfx) this.flameGfx.setAlpha(intro.ship);
    if (this.reverseGfx) this.reverseGfx.setAlpha(intro.ship);

    const flameScale = shipScale * (SHIP_DRAW / SHIP_BASE);
    if (this.flameGfx) syncFlame(this.flameGfx, ship, flameScale, this.state.clock);
    if (this.reverseGfx) syncReverse(this.reverseGfx, ship, flameScale, this.state.clock);

    applyCameraPolish(this.cameras.main, this.state);
    this.syncLayerRocks(fx);

    const seenDrops = new Set();
    for (const drop of this.state.drops) {
      if (drop.id == null || Number.isNaN(drop.id)) continue;
      const key = drop.id;
      seenDrops.add(key);
      let sprite = this.dropSprites.get(key);
      if (sprite && !sprite.scene) {
        this.dropSprites.delete(key);
        sprite = null;
      }
      if (!sprite) {
        const face = itemSprite(this, drop.itemId);
        sprite = face
          ? this.add.image(drop.x, drop.y, face.key).setDisplaySize(28, 28)
          : this.add.circle(drop.x, drop.y, 10, 0x7ad7ff, 0.9);
        sprite.setDepth(6);
        if (face && !face.tint && typeof sprite.clearTint === 'function') sprite.clearTint();
        this.refreshUiIgnore(sprite);
        this.dropSprites.set(key, sprite);
      } else {
        sprite.setPosition(drop.x, drop.y);
      }
      const raw = drop.popping ? Number(drop.popScale) : 1;
      const scale = Number.isFinite(raw) && raw > 0 ? raw : 1;
      const draw = Math.max(8, 28 * scale);
      if (sprite.frame && typeof sprite.setDisplaySize === 'function') sprite.setDisplaySize(draw, draw);
      const face = itemSprite(this, drop.itemId);
      if (typeof sprite.setTint === 'function') {
        if (face && face.tint) sprite.setTint(itemTint(drop.itemId || 'pale'));
        else if (typeof sprite.clearTint === 'function') sprite.clearTint();
      }
    }
    for (const [key, sprite] of this.dropSprites) {
      if (!seenDrops.has(key)) {
        sprite.destroy();
        this.dropSprites.delete(key);
      }
    }

    if (this.gateGfx) syncGates(this.gateGfx, this.state);
    if (this.aimGfx) syncAimArc(this.aimGfx, this.state);
    this.syncStation();

    if (this.missileGfx) {
      this.missileGfx.clear();
      const paintShot = (missile) => {
        if (missile.single) return;
        this.missileGfx.fillStyle(missile.heavy ? 0xffb7de : 0xb9f3ff, 0.95);
        this.missileGfx.fillCircle(missile.x, missile.y, missile.heavy ? 7 : 4);
      };
      for (const m of this.state.missiles) paintShot(m);
      for (const m of this.state.ghostMissiles || []) paintShot(m);
    }
    this.syncSingleShots();

    if (this.particleGfx) syncParticles(this.particleGfx, this.state.particles);

    if (this.beaconGfx) syncBeacons(this.beaconGfx, this.state, w, h);
    if (this.washGfx) syncTransitionWash(this.washGfx, this.state, w, h);
    if (this.minimapGfx) syncMinimap(this.minimapGfx, this.state, w, h);
  }

  shutdown() {
    if (this._didShutdown) return;
    this._didShutdown = true;
    this.scale.off('resize', this.onResize, this);
    if (this.onDigitKey) window.removeEventListener('keydown', this.onDigitKey);
    if (this.onPageHide) window.removeEventListener('pagehide', this.onPageHide);
    for (const off of this.unsubs) off();
    this.unsubs = [];
    if (this.inputCtl) {
      this.inputCtl.destroy();
      this.inputCtl = null;
    }
    for (const view of this.remoteViews.values()) {
      view.sprite.destroy();
      view.label.destroy();
      if (view.drill) view.drill.destroy();
      if (view.hull) view.hull.destroy();
    }
    this.remoteViews.clear();
  }
}
