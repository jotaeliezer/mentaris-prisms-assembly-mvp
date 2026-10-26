import Phaser from 'phaser';
import { DEFAULT_SHIP, listBootAudio, listBootImages } from '../assetsManifest.js';
import { smoothHulls } from '../hulls.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Only the hull, the rock faces, the crystal, and the first cues. The rest
    // streams in from PlayScene so the belt opens without a long wait.
    for (const { key, url } of listBootImages()) {
      this.load.image(key, url);
    }
    for (const { key, url } of listBootAudio()) {
      this.load.audio(key, url);
    }
  }

  create() {
    // Painted hulls stay smooth while they turn. Nearest sampling made the pixels crawl.
    // The other hulls get the same treatment as the background load lands them.
    smoothHulls(this, [DEFAULT_SHIP]);
    const bridge = this.registry.get('bridge');
    this.scene.start('PlayScene', { bridge });
  }
}
