import Phaser from 'phaser';
import { SCENE, CSS, FONT, BASE } from '../../shared/theme.js';
import { addVignette } from '../fx/textures.js';

// 정직한 임시 화면 — 다음 단계(로그인 → 복도 → 방)를 안내.
// 기존 셸 소스 포팅 후 실제 씬으로 교체된다.
export default class ComingSoon extends Phaser.Scene {
  constructor() {
    super(SCENE.COMING_SOON);
  }

  create() {
    const cx = BASE.w / 2;
    const cy = BASE.h / 2;
    this.cameras.main.setBackgroundColor('#04060b');
    this.cameras.main.fadeIn(400, 4, 6, 11);

    this.add
      .text(cx, cy - 60, '시스템 복구 준비 완료', {
        fontFamily: FONT.display,
        fontSize: '30px',
        color: CSS.text,
      })
      .setOrigin(0.5);

    this.add
      .text(
        cx,
        cy,
        '다음 단계: 로그인 → 연구소 복도(HUB) → 미션 방\n(기존 셸 포팅 후 연결됩니다)',
        {
          fontFamily: FONT.body,
          fontSize: '16px',
          color: CSS.muted,
          align: 'center',
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5);

    const back = this.add
      .text(cx, cy + 80, '← 타이틀로', {
        fontFamily: FONT.body,
        fontSize: '15px',
        color: CSS.green,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const go = () => this.scene.start(SCENE.TITLE);
    back.on('pointerup', go);
    this.input.keyboard?.once('keydown-ESC', go);
    this.input.keyboard?.once('keydown-ENTER', go);

    addVignette(this);
  }
}
