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
  syncGates,
  syncMinimap,
  syncParticles,
  syncStars,
  syncTransitionWash,
} from '../display.js';
import { createInput } from '../input.js';
import { createState, WORLD } from '../state.js';
import {
  bankCargo,
  buildSnapshotPatch,
  cancelExtract,
  changeLayer,
  digitFromEvent,
  extractBackspace,
  fabricateDrive,
  fabricateHint,
  fabricateHull,
  fabricateMap,
  idle,
  openExtract,
  selectHotbar,
  setFab,
  setPaused,
  startMission,
  submitExtract,
  typeChar,
  updateFly,
  updateTransition,
} from '../systems.js';

const SNAPSHOT_INTERVAL_MS = 80;
const SHIP_BASE = 72;

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
    this.shipSprite.setDisplaySize(SHIP_BASE, SHIP_BASE);
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

    // T7: decorative presence only — no AI/combat; keep clear of ship start.
    this.spawnPresenceSprites();

    this.events.once('shutdown', this.shutdown, this);
    this.events.once('destroy', this.shutdown, this);

    this.ready = true;
    this.publishSnapshot(true);
  }

  /** One alien, one powerup, one bullet — visible textures, no gameplay hooks. */
  spawnPresenceSprites() {
    const cx = this.state.ship.x;
    const cy = this.state.ship.y;
    const specs = [
      { key: 'alien_saucer.png', x: cx + 720, y: cy - 480, size: 64 },
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
      bridge.on('startMission', (payload) => {
        const missionId =
          typeof payload === 'string'
            ? payload
            : payload && payload.missionId
              ? payload.missionId
              : 'add';
        const seed =
          payload && typeof payload === 'object' && payload.seed != null
            ? payload.seed
            : this.state.seed;
        this.clearFlightInput();
        startMission(this.state, missionId, seed, this.audio);
        this.resyncSprites();
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('setPaused', (paused) => {
        setPaused(this.state, !!paused);
        this.clearFlightInput();
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
        startMission(this.state, next || 'add', this.state.seed, this.audio);
        this.resyncSprites();
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('replayMission', () => {
        const id = this.state.mission ? this.state.mission.id : 'add';
        this.clearFlightInput();
        startMission(this.state, id, this.state.seed, this.audio);
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
      bridge.on('fabBank', () => {
        bankCargo(this.state, this.audio);
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('fabDrive', () => {
        fabricateDrive(this.state, this.audio);
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('fabHull', () => {
        fabricateHull(this.state, this.audio);
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('fabHint', () => {
        fabricateHint(this.state, this.audio);
        this.publishSnapshot(true);
      })
    );

    this.unsubs.push(
      bridge.on('fabMap', () => {
        fabricateMap(this.state, this.audio);
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
      if (mode !== 'fly' && mode !== 'extract') return;
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
        if (mode === 'fly' && this.state.extractAvailable) {
          this.clearFlightInput();
          openExtract(this.state, this.state.extractAvailable, this.audio);
          this.publishSnapshot(true);
          return;
        }
        changeLayer(this.state, 1, this.audio);
        this.publishSnapshot(true);
        return;
      }
      // Digits 1–6 select a hotbar slot only while flying.
      // Extract mode returns above and still types the math answer.
      // Focused inputs are ignored at the top of this handler.
      const digit = digitFromEvent(event);
      if (digit != null) {
        const n = Number(digit);
        if (n >= 1 && n <= 6) {
          selectHotbar(this.state, n - 1);
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

  update(_time, delta) {
    if (!this.ready) return;
    const dt = Math.min(0.033, delta / 1000);
    const mode = this.state.mode;

    if (mode === 'fly') {
      this.syncPointerWorld();
      updateFly(this.state, dt, {
        input: this.inputCtl,
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

    this.syncDisplay();
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
    this.bridge.setSnapshot(buildSnapshotPatch(this.state, this.audio.muted));
  }

  resyncSprites() {
    for (const sprite of this.rockSprites.values()) sprite.destroy();
    this.rockSprites.clear();
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

  applyRockEnvelope(sprite, rock, envelope) {
    const envScale = envelope && envelope.scale != null ? envelope.scale : 1;
    const envAlpha = envelope && envelope.alpha != null ? envelope.alpha : 1;
    const baseAlpha = rock.active ? 1 : rock.near ? 0.95 : 0.85;
    sprite.setPosition(rock.x, rock.y);
    sprite.setRotation(rock.rot);
    sprite.setScale(rockDisplayScale(rock, envScale));
    sprite.setAlpha(baseAlpha * envAlpha);
    sprite.setTint(rock.active ? 0xffffff : rock.near ? 0xe8f4ff : 0xd0d8e8);
    sprite.setVisible(true);
  }

  syncLayerRocks(fx) {
    if (!fx) {
      for (const sprite of this.leaveRockSprites.values()) sprite.destroy();
      this.leaveRockSprites.clear();
      const seen = new Set();
      for (const rock of this.state.asteroids) {
        if (!rock.alive) continue;
        seen.add(rock.id);
        this.applyRockEnvelope(this.ensureRockSprite(this.rockSprites, rock, 5), rock, null);
      }
      this.pruneRockSprites(this.rockSprites, seen);
      return;
    }

    const leaveRocks =
      fx.swapped && this.state.transition.prevAsteroids
        ? this.state.transition.prevAsteroids
        : this.state.asteroids;

    const leaveSeen = new Set();
    if (fx.leave.alpha > 0.01) {
      for (const rock of leaveRocks) {
        if (rock.alive === false) continue;
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
        if (!rock.alive) continue;
        enterSeen.add(rock.id);
        this.applyRockEnvelope(this.ensureRockSprite(this.rockSprites, rock, 5), rock, fx.enter);
      }
    }
    if (fx.swapped) {
      this.pruneRockSprites(this.rockSprites, enterSeen);
    }
  }

  syncDisplay() {
    const fx = layerTransitionFx(this.state);
    const ship = this.state.ship;
    const shipScale = fx ? fx.shipScale : 1;
    const { w, h } = this.viewSize();

    if (this.starGfx) syncStars(this.starGfx, this.state.stars, this.state.camera, w, h);

    if (this.shipSprite) {
      const key = this.textures.exists(ship.sprite) ? ship.sprite : DEFAULT_SHIP;
      if (this.shipSprite.texture.key !== key) this.shipSprite.setTexture(key);
      this.shipSprite.setPosition(ship.x, ship.y);
      this.shipSprite.setRotation(ship.aim + Math.PI / 2);
      this.shipSprite.setDisplaySize(SHIP_BASE * shipScale, SHIP_BASE * shipScale);
      this.shipSprite.setVisible(this.state.mode !== 'title');
    }

    if (this.flameGfx) syncFlame(this.flameGfx, ship, shipScale);

    applyCameraPolish(this.cameras.main, this.state);
    this.syncLayerRocks(fx);

    const seenDrops = new Set();
    for (const drop of this.state.drops) {
      const key = drop.id;
      seenDrops.add(key);
      let sprite = this.dropSprites.get(key);
      if (!sprite) {
        const tex = this.textures.exists(MINERAL_FILE) ? MINERAL_FILE : null;
        sprite = tex
          ? this.add.image(drop.x, drop.y, tex).setDisplaySize(28, 28)
          : this.add.circle(drop.x, drop.y, 10, 0x7ad7ff, 0.9);
        sprite.setDepth(6);
        this.refreshUiIgnore(sprite);
        this.dropSprites.set(key, sprite);
      } else {
        sprite.setPosition(drop.x, drop.y);
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
      this.missileGfx.fillStyle(0xb9f3ff, 0.95);
      for (const m of this.state.missiles) {
        this.missileGfx.fillCircle(m.x, m.y, 4);
      }
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
    for (const off of this.unsubs) off();
    this.unsubs = [];
    if (this.inputCtl) {
      this.inputCtl.destroy();
      this.inputCtl = null;
    }
  }
}
