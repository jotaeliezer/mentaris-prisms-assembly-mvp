import Phaser from 'phaser';
import { ASTEROID_FILES, DEFAULT_SHIP, MINERAL_FILE } from '../assetsManifest.js';
import { createAudio } from '../audio.js';
import {
  applyCameraPolish,
  layerTransitionFx,
  rockDisplayScale,
  snapSpriteToScreenPixel,
  syncAimArc,
  syncBeacons,
  syncFlame,
  syncGates,
  syncMinimap,
  syncParticles,
  syncStars,
  syncTransitionWash,
} from '../display.js';
import { createInput } from '../input.js';
import { multiplayer } from '../../multiplayer/session.js';
import { saveAssembly } from '../../save/cloud.js';
import { dropSpriteKey, inventoryClick, inventoryDrag, itemTint } from '../items.js';
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
/** Player hull draw size. 5% above SHIP_BASE; asteroids and remote ships are unchanged. */
const SHIP_DRAW = SHIP_BASE * 1.05;
const RIM_PAD = 18;
const RIM_RADIUS = 16;

function destroyOutline(entry) {
  if (!entry) return;
  if (Array.isArray(entry)) entry.forEach((sprite) => sprite.destroy());
  else entry.destroy();
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
    this.starGfx = null;
    this.flameGfx = null;
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
    this.shipSprite.setDisplaySize(SHIP_DRAW, SHIP_DRAW);
    this.shipSprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.shipSprite.setDepth(10);

    this.flameGfx = this.add.graphics().setDepth(9);
    this.gateGfx = this.add.graphics().setDepth(4);
    this.aimGfx = this.add.graphics().setDepth(7);
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
      const id = this.state && this.state.assemblyId;
      if (!id || !this.state || this.state.mode === 'title') return;
      saveAssembly(id, captureProgress(this.state));
    };
    window.addEventListener('pagehide', this.onPageHide);

    this.spawnPresenceSprites();

    this.events.once('shutdown', this.shutdown, this);
    this.events.once('destroy', this.shutdown, this);

    this.ready = true;
    this.publishSnapshot(true);
  }

  /** Decorative props only. Aliens stay out until a spawn clock exists. */
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
        sprite.setDisplaySize(SHIP_BASE, SHIP_BASE);
        sprite.setDepth(9);
        const label = this.add.text(remote.x, remote.y - 48, remote.tag || '', {
          fontFamily: '"Segoe UI", "Avenir Next", "Helvetica Neue", sans-serif',
          fontSize: '13px',
          color: '#e8ecff',
          backgroundColor: '#0b1220',
          padding: { left: 5, right: 5, top: 2, bottom: 2 },
        });
        label.setOrigin(0.5, 1);
        label.setDepth(12);
        this.refreshUiIgnore(sprite);
        this.refreshUiIgnore(label);
        const drill = this.add.graphics().setDepth(11);
        this.refreshUiIgnore(drill);
        const hull = this.add.graphics().setDepth(12);
        this.refreshUiIgnore(hull);
        view = { sprite, label, drill, hull };
        this.remoteViews.set(remote.id, view);
      } else if (view.sprite.texture.key !== key) {
        view.sprite.setTexture(key);
      }
      view.sprite.setPosition(remote.x, remote.y);
      view.sprite.setRotation(remote.aim + Math.PI / 2);
      view.sprite.setDisplaySize(SHIP_BASE, SHIP_BASE);
      view.sprite.setVisible(visible);
      const tag = remote.pilot || remote.tag || '';
      if (view.label.text !== tag) view.label.setText(tag);
      view.label.setPosition(remote.x, remote.y - 56);
      view.label.setVisible(visible && tag.length > 0);
      this.syncRemoteHull(view.hull, remote, visible);
      this.syncRemoteDrill(view.drill, remote, visible);
    }
    for (const [id, view] of this.remoteViews) {
      if (seen.has(id)) continue;
      view.sprite.destroy();
      view.label.destroy();
      if (view.drill) view.drill.destroy();
      if (view.hull) view.hull.destroy();
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
        this.shipSprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      this.shipSprite.setPosition(ship.x, ship.y);
      this.shipSprite.setRotation(ship.aim + Math.PI / 2);
      this.shipSprite.setDisplaySize(SHIP_DRAW * shipScale, SHIP_DRAW * shipScale);
      this.shipSprite.setAlpha(intro.ship);
      this.shipSprite.setVisible(
        intro.ship > 0.02 && this.state.mode !== 'title' && this.state.mode !== 'dead'
      );
    }
    if (this.flameGfx) this.flameGfx.setAlpha(intro.ship);

    if (this.flameGfx) syncFlame(this.flameGfx, ship, shipScale * (SHIP_DRAW / SHIP_BASE), this.state.clock);

    applyCameraPolish(this.cameras.main, this.state);
    if (this.shipSprite) snapSpriteToScreenPixel(this.shipSprite, this.cameras.main);
    if (this.flameGfx && this.shipSprite) {
      this.flameGfx.x = this.shipSprite.x;
      this.flameGfx.y = this.shipSprite.y;
    }
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

    if (this.missileGfx) {
      this.missileGfx.clear();
      const paintShot = (missile) => {
        this.missileGfx.fillStyle(missile.heavy ? 0xffb7de : 0xb9f3ff, 0.95);
        this.missileGfx.fillCircle(missile.x, missile.y, missile.heavy ? 7 : 4);
      };
      for (const m of this.state.missiles) paintShot(m);
      for (const m of this.state.ghostMissiles || []) paintShot(m);
    }

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
