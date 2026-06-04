import Phaser from 'phaser';
import { SCENE, COLORS, CSS, FONT, BASE } from '../../shared/theme.js';
import { addVignette, addDust, glowBehind } from '../fx/textures.js';
import { fadeIn, goTo } from '../fx/transition.js';
import Eddie from '../objects/Eddie.js';

// 타이틀 — 어둠 속 EDDIE(눈빛만 빛). 폐연구소 톤. 시작 버튼(클릭/Enter).
export default class Title extends Phaser.Scene {
  constructor() {
    super(SCENE.TITLE);
  }

  create() {
    const cx = BASE.w / 2;
    this.cameras.main.setBackgroundColor('#04060b');
    fadeIn(this, 600);

    // 바닥 그림자/빛 풀(EDDIE 발치)
    this.add
      .image(cx, 470, 'glow')
      .setTint(COLORS.eddieGlow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.12)
      .setScale(5, 2);

    // 깜빡이는 비상등(앰버) — 위협은 추상 장치로만(K-12)
    const beacon = this.add
      .image(cx, 70, 'glow')
      .setTint(COLORS.amber)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.0)
      .setScale(2.2);
    this.tweens.add({
      targets: beacon,
      alpha: 0.5,
      duration: 140,
      yoyo: true,
      repeatDelay: 1600,
      repeat: -1,
      ease: 'Quad.in',
    });

    // EDDIE
    this.eddie = new Eddie(this, cx, 430, 1.1);

    // 타이틀 카드
    this.add
      .text(cx, 150, 'PLAYINO', {
        fontFamily: FONT.display,
        fontSize: '34px',
        color: CSS.muted,
      })
      .setOrigin(0.5)
      .setAlpha(0.85);

    glowBehind(this, cx, 200, COLORS.eddieGlow, 5, 1.6, 0.16);
    this.add
      .text(cx, 200, 'ESCAPE  ROOM', {
        fontFamily: FONT.display,
        fontSize: '72px',
        fontStyle: '900',
        color: CSS.text,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 250, '어둠 속 폐연구소 — 미션을 풀어 탈출하라', {
        fontFamily: FONT.body,
        fontSize: '16px',
        color: CSS.muted,
      })
      .setOrigin(0.5);

    // 시작 버튼
    const btn = this.add
      .text(cx, 600, '▶  시작하기', {
        fontFamily: FONT.display,
        fontSize: '24px',
        color: CSS.bg,
        backgroundColor: CSS.green,
        padding: { x: 26, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: btn, alpha: 0.7, duration: 900, yoyo: true, repeat: -1 });

    this.add
      .text(cx, 648, 'Enter / 클릭으로 시작', {
        fontFamily: FONT.body,
        fontSize: '12px',
        color: CSS.muted,
      })
      .setOrigin(0.5);

    const start = () => this._start();
    btn.on('pointerover', () => this.eddie.setMood('ok'));
    btn.on('pointerout', () => this.eddie.setMood('idle'));
    btn.on('pointerup', start);
    this.input.keyboard?.on('keydown-ENTER', start);

    addDust(this, 44);
    addVignette(this);

    this.time.delayedCall(700, () => this.eddie.talk());
  }

  _start() {
    if (this._left) return;
    this._left = true;
    this.eddie.setMood('ok');
    this.eddie.talk();
    goTo(this, SCENE.LOGIN, 450);
  }
}
