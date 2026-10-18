import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import PlayScene from './scenes/PlayScene.js';

/**
 * Create the Phaser game with Boot → Play scenes and bridge in the registry.
 */
export function createGame(bridge, parent = 'game-root') {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#05060a',
    scene: [BootScene, PlayScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    callbacks: {
      preBoot(game) {
        game.registry.set('bridge', bridge);
      },
    },
  });
}
