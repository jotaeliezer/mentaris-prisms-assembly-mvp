import Phaser from 'phaser';
import { SHIP_FILES } from './assetsManifest.js';

/**
 * Painted hulls stay smooth while they turn. Nearest sampling made the pixels
 * crawl. Hulls other than the launch ship arrive with the background load, so
 * this runs again once that lands. Names that have not loaded are skipped.
 *
 * Lives apart from assetsManifest.js because that module is imported by the
 * Node tests, which have no Phaser.
 */
export function smoothHulls(scene, names = SHIP_FILES) {
  for (const name of names) {
    if (!scene.textures.exists(name)) continue;
    scene.textures.get(name).setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}
