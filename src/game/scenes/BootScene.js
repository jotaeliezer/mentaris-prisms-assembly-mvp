import Phaser from 'phaser';
import { listPhaserAudio, listPhaserImages } from '../assetsManifest.js';

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
    const bridge = this.registry.get('bridge');
    this.scene.start('PlayScene', { bridge });
  }
}
