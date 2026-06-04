import Phaser from 'phaser';
import { SCENE, CSS, FONT, BASE } from '../../shared/theme.js';
import { resolveAssets } from '../assets.js';

// 로딩 화면 — 장면 배경 등 에셋 슬롯을 탐지해 등록하고 진행바 표시.
export default class Preload extends Phaser.Scene {
  constructor() {
    super(SCENE.PRELOAD);
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
    this.add.rectangle(cx, cy + 20, barW, 4, 0x1b2740).setOrigin(0.5);
    const fill = this.add.rectangle(cx - barW / 2, cy + 20, 0, 4, 0x6fb7ff).setOrigin(0, 0.5);
    const label = this.add
      .text(cx, cy + 44, 'INITIALIZING…', { fontFamily: FONT.body, fontSize: '12px', color: CSS.muted })
      .setOrigin(0.5);

    this.tweens.add({
      targets: fill,
      width: barW,
      duration: 900,
      ease: 'Sine.inOut',
      onUpdate: (tw) => label.setText(`INITIALIZING… ${Math.round(tw.progress * 100)}%`),
    });

    // 에셋 탐지(있으면 등록) 후 다음 씬으로 — 최소 900ms 로딩 연출 보장
    Promise.all([
      resolveAssets(this).catch(() => {}),
      new Promise((r) => this.time.delayedCall(900, r)),
    ]).then(() => this.scene.start(SCENE.SPLASH));
  }
}
