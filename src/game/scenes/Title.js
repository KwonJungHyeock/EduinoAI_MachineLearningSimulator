import Phaser from 'phaser';
import { SCENE, COLORS, CSS, FONT, BASE } from '../../shared/theme.js';
import { addVignette, addDust, glowBehind } from '../fx/textures.js';
import { fadeIn, goTo } from '../fx/transition.js';
import Eddie from '../objects/Eddie.js';
import Button from '../objects/Button.js';

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
      .image(cx, 600, 'glow')
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
    this.eddie = new Eddie(this, cx, 412, 0.64);

    // 타이틀 카드
    this.add
      .text(cx, 96, 'PLAYINO', {
        fontFamily: FONT.display,
        fontSize: '34px',
        color: CSS.muted,
      })
      .setOrigin(0.5)
      .setAlpha(0.85);

    glowBehind(this, cx, 156, COLORS.eddieGlow, 5, 1.6, 0.16);
    this.add
      .text(cx, 156, 'ESCAPE  ROOM', {
        fontFamily: FONT.display,
        fontSize: '72px',
        fontStyle: '900',
        color: CSS.text,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 202, '어둠 속 폐연구소 — 미션을 풀어 탈출하라', {
        fontFamily: FONT.body,
        fontSize: '16px',
        color: CSS.muted,
      })
      .setOrigin(0.5);

    // 시작 버튼(고급 컴포넌트)
    const btn = new Button(this, cx, 676, {
      label: '시작하기',
      icon: '▶',
      width: 264,
      height: 62,
      color: COLORS.green,
      onClick: () => this._start(),
    });
    btn.on('pointerover', () => this.eddie.setMood('ok'));
    btn.on('pointerout', () => this.eddie.setMood('idle'));

    this.input.keyboard?.on('keydown-ENTER', () => this._start());

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
