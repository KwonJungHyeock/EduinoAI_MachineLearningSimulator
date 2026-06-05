import Phaser from 'phaser';
import { SCENE, COLORS, CSS, FONT, BASE } from '../../shared/theme.js';
import { addVignette, addDust, glowBehind, addCover, pulsingGlow } from '../fx/textures.js';
import { fadeIn, goTo } from '../fx/transition.js';
import { hasAsset } from '../assets.js';
import Eddie from '../objects/Eddie.js';
import Button from '../objects/Button.js';

// 배경 아트(title/bg.png) 위 작동 영역 좌표(1280×720 기준). 그림에 맞춰 미세조정 가능.
const ART = {
  start: { x: 640, y: 636, w: 430, h: 58 }, // 베이크된 "시작하기" 버튼
  eyeL: { x: 614, y: 322 },
  eyeR: { x: 666, y: 322 },
};

// 타이틀 — 어둠 속 EDDIE(눈빛만 빛). 폐연구소 톤. 시작 버튼(클릭/Enter).
export default class Title extends Phaser.Scene {
  constructor() {
    super(SCENE.TITLE);
  }

  create() {
    const cx = BASE.w / 2;
    this.cameras.main.setBackgroundColor('#04060b');
    fadeIn(this, 600);

    // 배경 아트가 있으면 그것을 깔고, 없으면 절차적 EDDIE/브랜드로 폴백.
    this.artBg = hasAsset(this, 'bgTitle');
    if (this.artBg) {
      addCover(this, 'bgTitle');
    } else {
      // 바닥 빛 풀
      this.add
        .image(cx, 600, 'glow')
        .setTint(COLORS.eddieGlow)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.12)
        .setScale(5, 2);

      // 깜빡이는 비상등(앰버)
      const beacon = this.add
        .image(cx, 70, 'glow')
        .setTint(COLORS.amber)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.0)
        .setScale(2.2);
      this.tweens.add({
        targets: beacon, alpha: 0.5, duration: 140, yoyo: true, repeatDelay: 1600, repeat: -1, ease: 'Quad.in',
      });

      // EDDIE
      this.eddie = new Eddie(this, cx, 412, 0.64);

      // 타이틀 카드
      this.add
        .text(cx, 96, 'PLAYINO', { fontFamily: FONT.display, fontSize: '34px', color: CSS.muted })
        .setOrigin(0.5)
        .setAlpha(0.85);
      glowBehind(this, cx, 156, COLORS.eddieGlow, 5, 1.6, 0.16);
      this.add
        .text(cx, 156, 'ESCAPE  ROOM', { fontFamily: FONT.display, fontSize: '72px', fontStyle: '900', color: CSS.text })
        .setOrigin(0.5);
      this.add
        .text(cx, 202, '어둠 속 폐연구소 — 미션을 풀어 탈출하라', { fontFamily: FONT.body, fontSize: '16px', color: CSS.muted })
        .setOrigin(0.5);
    }

    if (this.artBg) {
      // 배경에 그려진 "시작하기" 버튼 위 투명 클릭존 + 호버 글로우
      const b = ART.start;
      const hov = this.add
        .image(b.x, b.y, 'glow')
        .setTint(COLORS.green)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0)
        .setScale(b.w / 150, b.h / 60);
      const zone = this.add.zone(b.x, b.y, b.w, b.h).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => this.tweens.add({ targets: hov, alpha: 0.32, duration: 150 }));
      zone.on('pointerout', () => this.tweens.add({ targets: hov, alpha: 0, duration: 150 }));
      zone.on('pointerup', () => this._start());
      // EDDIE 눈 생기
      pulsingGlow(this, ART.eyeL.x, ART.eyeL.y, COLORS.eddieGlow, 0.5, 0.5);
      pulsingGlow(this, ART.eyeR.x, ART.eyeR.y, COLORS.eddieGlow, 0.5, 0.5);
    } else {
      // 폴백: 고급 버튼 + 안내
      const btn = new Button(this, cx, 646, {
        label: '시작하기', icon: '▶', width: 264, height: 62, color: COLORS.green,
        onClick: () => this._start(),
      });
      btn.on('pointerover', () => this.eddie?.setMood('ok'));
      btn.on('pointerout', () => this.eddie?.setMood('idle'));
      this.add
        .text(cx, 720 - 22, 'Space 또는 클릭으로 시작', { fontFamily: FONT.body, fontSize: '13px', color: CSS.muted })
        .setOrigin(0.5);
      addDust(this, 44);
      addVignette(this);
    }

    // 시작: 스페이스바 / 엔터 / 클릭
    this.input.keyboard?.on('keydown-SPACE', () => this._start());
    this.input.keyboard?.on('keydown-ENTER', () => this._start());

    if (this.eddie) this.time.delayedCall(700, () => this.eddie.talk());
  }

  _start() {
    if (this._left) return;
    this._left = true;
    this.eddie?.setMood('ok');
    this.eddie?.talk();
    goTo(this, SCENE.LOGIN, 450);
  }
}
