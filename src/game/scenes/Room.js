import Phaser from 'phaser';
import { SCENE, COLORS, CSS, FONT, BASE } from '../../shared/theme.js';
import { fadeIn } from '../fx/transition.js';
import { addVignette, addDust, pulsingGlow } from '../fx/textures.js';

// 미션 방(임시 placeholder) — 진입 확인용. 추후 학습+미니게임이 들어갈 자리.
export default class Room extends Phaser.Scene {
  constructor() {
    super(SCENE.ROOM);
  }

  init(data) {
    this.roomId = data?.id || 'sensor';
    this.roomName = data?.name || '센서 방';
  }

  create() {
    const cx = BASE.w / 2;
    const cy = BASE.h / 2;
    this.cameras.main.setBackgroundColor('#04060b');
    fadeIn(this, 450);

    // 방 바닥/벽 간단 연출
    const g = this.add.graphics();
    g.fillStyle(0x0c1525, 1);
    g.fillRect(140, 120, BASE.w - 280, BASE.h - 240);
    g.lineStyle(2, 0x1d2c46, 1);
    g.strokeRect(140, 120, BASE.w - 280, BASE.h - 240);

    pulsingGlow(this, cx, cy - 30, COLORS.eddieGlow, 1.4, 0.18);

    this.add
      .text(cx, cy - 70, this.roomName, { fontFamily: FONT.display, fontSize: '40px', color: CSS.text })
      .setOrigin(0.5);
    this.add
      .text(cx, cy - 20, '미션 콘텐츠 준비 중 — 학습 + 미니게임이 들어갈 자리', {
        fontFamily: FONT.body, fontSize: '16px', color: CSS.muted,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cy + 30, `roomId: ${this.roomId}`, {
        fontFamily: 'ui-monospace, monospace', fontSize: '13px', color: '#4a566e',
      })
      .setOrigin(0.5);

    const back = this.add
      .text(cx, cy + 110, '← 복도로 (ESC)', {
        fontFamily: FONT.body, fontSize: '16px', color: CSS.green,
        backgroundColor: 'rgba(6,10,18,0.6)', padding: { x: 16, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const go = () => this._back();
    back.on('pointerup', go);
    this.input.keyboard?.once('keydown-ESC', go);

    addDust(this, 28);
    addVignette(this);
  }

  _back() {
    if (this._left) return;
    this._left = true;
    this.cameras.main.fadeOut(300, 4, 6, 11);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE.CORRIDOR));
  }
}
