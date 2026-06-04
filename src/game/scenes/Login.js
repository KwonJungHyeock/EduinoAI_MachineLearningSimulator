import Phaser from 'phaser';
import { SCENE, COLORS, CSS, FONT, BASE } from '../../shared/theme.js';
import { addVignette, addDust, glowBehind, addCover } from '../fx/textures.js';
import { fadeIn, goTo } from '../fx/transition.js';
import { hasAsset } from '../assets.js';
import Eddie from '../objects/Eddie.js';
import { mountLogin } from '../../ui/login.js';

// 로그인 — 왼쪽: 브랜드(PLAYINO / ESCAPE ROOM) + EDDIE + 분위기,
//          오른쪽: 접속코드 DOM 카드. 이스케이프룸 어둠/공포 톤.
export default class Login extends Phaser.Scene {
  constructor() {
    super(SCENE.LOGIN);
  }

  create() {
    const lx = 330; // 왼쪽 브랜드 기준 x
    this.cameras.main.setBackgroundColor('#04060b');
    fadeIn(this, 500);

    // 배경 아트가 있으면 깔고 폼은 왼쪽, 없으면 절차적(브랜드 왼쪽 + 폼 오른쪽).
    this.artBg = hasAsset(this, 'bgLogin');
    if (this.artBg) {
      addCover(this, 'bgLogin');
    } else {
      this.add
        .image(lx, 600, 'glow')
        .setTint(COLORS.eddieGlow)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.1)
        .setScale(4.5, 2);

      const beacon = this.add
        .image(lx, 110, 'glow')
        .setTint(COLORS.amber)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0)
        .setScale(2);
      this.tweens.add({
        targets: beacon, alpha: 0.42, duration: 120, yoyo: true, repeatDelay: 2000, repeat: -1, ease: 'Quad.in',
      });

      this.add
        .text(lx, 200, 'PLAYINO', { fontFamily: FONT.display, fontSize: '40px', color: CSS.muted })
        .setOrigin(0.5)
        .setAlpha(0.85);
      glowBehind(this, lx, 256, COLORS.eddieGlow, 4.5, 1.5, 0.16);
      this.add
        .text(lx, 256, 'ESCAPE ROOM', { fontFamily: FONT.display, fontSize: '60px', fontStyle: '900', color: CSS.text })
        .setOrigin(0.5);
      this.add
        .text(lx, 304, '어둠 속 폐연구소 — 시스템에 접속하라', { fontFamily: FONT.body, fontSize: '15px', color: CSS.muted })
        .setOrigin(0.5);

      this.eddie = new Eddie(this, lx, 470, 0.6);
      this.time.delayedCall(600, () => this.eddie.talk());

      addDust(this, 36);
      addVignette(this);
    }

    // DOM 로그인 카드 — 배경 아트가 있으면 왼쪽(아트 구도에 맞춤), 없으면 오른쪽.
    this.loginUi = mountLogin({
      align: this.artBg ? 'left' : 'right',
      onSuccess: () => this._proceed('ok'),
      onGuest: () => this._proceed('idle'),
    });

    // ESC → 타이틀
    this.input.keyboard?.on('keydown-ESC', () => this._back());

    // 씬 종료 시 DOM 정리(누수 방지)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this._cleanup());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this._cleanup());
  }

  _proceed(mood) {
    if (this._left) return;
    this._left = true;
    this.eddie?.setMood(mood);
    this.eddie?.talk();
    goTo(this, SCENE.COMING_SOON, 450);
  }

  _back() {
    if (this._left) return;
    this._left = true;
    goTo(this, SCENE.TITLE, 350);
  }

  _cleanup() {
    this.loginUi?.destroy();
    this.loginUi = null;
  }
}
