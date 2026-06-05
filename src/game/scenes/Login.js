import Phaser from 'phaser';
import { SCENE, COLORS, CSS, FONT, BASE } from '../../shared/theme.js';
import { addVignette, addDust, glowBehind, addCover, pulsingGlow } from '../fx/textures.js';
import { fadeIn, goTo } from '../fx/transition.js';
import { hasAsset } from '../assets.js';
import Eddie from '../objects/Eddie.js';
import CodeInput from '../objects/CodeInput.js';
import { mountLogin } from '../../ui/login.js';

// 배경 아트(login/bg.png) 위 작동 영역 좌표(1280×720). 그림에 맞춰 미세조정 가능.
const ART = {
  code: { x: 248, y: 348 }, // 6칸 코드 입력 중심(베이크된 ACCESS CODE 점 위)
  submit: { x: 240, y: 436, w: 260, h: 52 }, // [ > 접속 진행 ]
  logout: { x: 226, y: 512, w: 230, h: 48 }, // [ > 로그아웃 ]
  eyeL: { x: 616, y: 322 },
  eyeR: { x: 668, y: 322 },
};

// 로그인 — 어둠 속 폐연구소. 배경 아트가 있으면 그 위 작동 UI를, 없으면 절차적 폴백.
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

    if (this.artBg) {
      // 배경에 그려진 로그인 UI 위에 작동 영역을 얹는다(좌표계 1:1).
      this.code = new CodeInput(this, ART.code.x, ART.code.y, {
        length: 6, cell: 44, gap: 11,
        onSubmit: (v) => this._submit(v),
      });
      this._zone(ART.submit, () => this._submit(this.code.value)); // 접속 진행
      this._zone(ART.logout, () => this._proceed('idle')); // 로그아웃 → 체험 입장
      // EDDIE 눈 생기
      pulsingGlow(this, ART.eyeL.x, ART.eyeL.y, COLORS.eddieGlow, 0.5, 0.5);
      pulsingGlow(this, ART.eyeR.x, ART.eyeR.y, COLORS.eddieGlow, 0.5, 0.5);
    } else {
      // 폴백: DOM 로그인 카드(오른쪽)
      this.loginUi = mountLogin({
        align: 'right',
        onSuccess: () => this._proceed('ok'),
        onGuest: () => this._proceed('idle'),
      });
    }

    // ESC → 타이틀
    this.input.keyboard?.on('keydown-ESC', () => this._back());

    // 씬 종료 시 DOM 정리(누수 방지)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this._cleanup());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this._cleanup());
  }

  // 배경에 그려진 버튼 위 투명 클릭존 + 호버 글로우
  _zone(b, cb) {
    const hov = this.add
      .image(b.x, b.y, 'glow')
      .setTint(COLORS.eddieGlow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setScale(b.w / 150, b.h / 60);
    const z = this.add.zone(b.x, b.y, b.w, b.h).setInteractive({ useHandCursor: true });
    z.on('pointerover', () => this.tweens.add({ targets: hov, alpha: 0.28, duration: 150 }));
    z.on('pointerout', () => this.tweens.add({ targets: hov, alpha: 0, duration: 150 }));
    z.on('pointerup', cb);
    return z;
  }

  _submit(code) {
    if ((code || '').length < 6) {
      this.code?.error();
      return;
    }
    this._proceed('ok');
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
