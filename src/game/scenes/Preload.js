import Phaser from 'phaser';
import { SCENE, CSS, FONT, BASE } from '../../shared/theme.js';
import { queueAssets } from '../assets.js';

// 로딩 화면 — 에셋 슬롯(있으면)을 로드하고 진행바 표시.
export default class Preload extends Phaser.Scene {
  constructor() {
    super(SCENE.PRELOAD);
  }

  preload() {
    // public/assets/ 의 슬롯 이미지 로드(없으면 절차적 폴백)
    queueAssets(this);
  }

  create() {
    this.cameras.main.setBackgroundColor(CSS.bg);
    const cx = BASE.w / 2;
    const cy = BASE.h / 2;

    this.add
      .text(cx, cy - 24, 'EDUINO AI', {
        fontFamily: FONT.display,
        fontSize: '24px',
        color: CSS.muted,
      })
      .setOrigin(0.5)
      .setAlpha(0.7);

    const barW = 280;
    const back = this.add.rectangle(cx, cy + 20, barW, 4, 0x1b2740).setOrigin(0.5);
    const fill = this.add.rectangle(cx - barW / 2, cy + 20, 0, 4, 0x6fb7ff).setOrigin(0, 0.5);

    const label = this.add
      .text(cx, cy + 44, 'INITIALIZING…', {
        fontFamily: FONT.body,
        fontSize: '12px',
        color: CSS.muted,
      })
      .setOrigin(0.5);

    // 짧은 부팅 연출(실제 로드가 생기면 load 진행률로 대체)
    this.tweens.add({
      targets: fill,
      width: barW,
      duration: 900,
      ease: 'Sine.inOut',
      onUpdate: (tw) => {
        label.setText(`INITIALIZING… ${Math.round(tw.progress * 100)}%`);
      },
      onComplete: () => this.scene.start(SCENE.SPLASH),
    });
  }
}
