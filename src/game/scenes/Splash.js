import Phaser from 'phaser';
import { SCENE, CSS, FONT, BASE } from '../../shared/theme.js';
import { addVignette } from '../fx/textures.js';
import { fadeIn, goTo } from '../fx/transition.js';

// EDUINO AI 부팅 스플래시 → 타이핑되는 부팅 로그 → 타이틀로.
export default class Splash extends Phaser.Scene {
  constructor() {
    super(SCENE.SPLASH);
  }

  create() {
    const cx = BASE.w / 2;
    const cy = BASE.h / 2;
    this.cameras.main.setBackgroundColor('#04060b');
    fadeIn(this, 500);

    // 로고
    const logo = this.add
      .text(cx, cy - 70, 'EDUINO AI', {
        fontFamily: FONT.display,
        fontSize: '64px',
        fontStyle: '900',
        color: CSS.text,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.add
      .text(cx, cy - 18, 'STORY-DRIVEN HARDWARE CODING', {
        fontFamily: FONT.body,
        fontSize: '14px',
        color: CSS.muted,
      })
      .setOrigin(0.5)
      .setLetterSpacing?.(4);

    this.tweens.add({ targets: logo, alpha: 1, duration: 700, ease: 'Sine.out' });

    // 부팅 로그 타이핑
    const lines = [
      '> BOOT SEQUENCE START',
      '> CORE ONLINE',
      '> EDDIE UNIT … LINK',
      '> LOADING  PLAYINO : ESCAPE ROOM',
    ];
    const logText = this.add
      .text(cx, cy + 40, '', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '14px',
        color: CSS.green,
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0);

    let li = 0;
    let shown = '';
    this.time.addEvent({
      delay: 360,
      repeat: lines.length - 1,
      callback: () => {
        shown += (li ? '\n' : '') + lines[li++];
        logText.setText(shown);
        if (li === lines.length) {
          this.time.delayedCall(700, () => this._toTitle());
        }
      },
    });

    addVignette(this);

    // 스킵(클릭/Enter/Space)
    const skip = () => this._toTitle();
    this.input.once('pointerdown', skip);
    this.input.keyboard?.once('keydown-ENTER', skip);
    this.input.keyboard?.once('keydown-SPACE', skip);
  }

  _toTitle() {
    if (this._left) return;
    this._left = true;
    goTo(this, SCENE.TITLE, 450);
  }
}
