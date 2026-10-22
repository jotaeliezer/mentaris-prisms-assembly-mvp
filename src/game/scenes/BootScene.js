import Phaser from 'phaser';
import { listPhaserAudio, listPhaserImages, SHIP_FILES } from '../assetsManifest.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    for (const { key, url } of listPhaserImages()) {
      this.load.image(key, url);
    }
    for (const { key, url } of listPhaserAudio()) {
      this.load.audio(key, url);
    }
  }

  create() {
    // Painted hulls stay smooth while they turn. Nearest sampling made the pixels crawl.
    for (const name of SHIP_FILES) {
      if (!this.textures.exists(name)) continue;
      this.textures.get(name).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    const bridge = this.registry.get('bridge');
    this.scene.start('PlayScene', { bridge });
  }
}
