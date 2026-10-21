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
    // Nearest keeps hull panel lines from blending as the camera scrolls. Other textures stay linear.
    for (const name of SHIP_FILES) {
      if (!this.textures.exists(name)) continue;
      this.textures.get(name).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const bridge = this.registry.get('bridge');
    this.scene.start('PlayScene', { bridge });
  }
}
