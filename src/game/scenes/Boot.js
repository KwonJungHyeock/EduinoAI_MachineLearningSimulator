import Phaser from 'phaser';
import { SCENE } from '../../shared/theme.js';
import { ensureFxTextures } from '../fx/textures.js';

// 최소 부팅 — 공용 텍스처 생성 후 Preload로.
export default class Boot extends Phaser.Scene {
  constructor() {
    super(SCENE.BOOT);
  }
  create() {
    ensureFxTextures(this);
    this.scene.start(SCENE.PRELOAD);
  }
}
