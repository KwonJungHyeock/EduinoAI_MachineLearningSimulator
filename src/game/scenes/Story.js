import Phaser from 'phaser';
import { SCENE, COLORS, CSS, FONT, BASE } from '../../shared/theme.js';
import { fadeIn, goTo } from '../fx/transition.js';
import { addVignette } from '../fx/textures.js';

// 스토리 인트로 — 검정 배경, 타이핑 연출. 연구소 폭발 → 탈출 동기. 건너뛰기 가능.
// (문구는 초안 — 자유롭게 수정 가능)
const LINES = [
  { t: '경고… 경고… 메인 리액터 과부하.', c: CSS.red },
  { t: '굉음과 함께 시설 전체가 흔들렸다.', c: CSS.text },
  { t: '정전. 모든 시스템이 침묵에 잠긴다.', c: CSS.text },
  { t: '…어둠 속, 단 하나의 불빛 —', c: CSS.muted },
  { t: '너의 두 눈이, 깜빡, 켜진다.', c: '#6fffd6' },
  { t: '여긴 폐쇄된 지하 연구소.', c: CSS.text },
  { t: '문은 잠겼고, 출구는 멀다.', c: CSS.text },
  { t: 'EDDIE — 시스템을 복구하며, 탈출하라.', c: CSS.green },
];

export default class Story extends Phaser.Scene {
  constructor() {
    super(SCENE.STORY);
  }

  create() {
    const cx = BASE.w / 2;
    const cy = BASE.h / 2;
    this.cameras.main.setBackgroundColor('#000000');
    fadeIn(this, 600);
    this._done = false;

    // 헤더(시스템 경고 느낌)
    this.add
      .text(cx, 150, 'SYSTEM FAILURE', {
        fontFamily: FONT.display,
        fontSize: '22px',
        color: '#ff5a3c',
      })
      .setOrigin(0.5)
      .setAlpha(0.55)
      .setLetterSpacing?.(6);

    // 본문(한 줄씩 타이핑)
    this.line = this.add
      .text(cx, cy, '', {
        fontFamily: FONT.display,
        fontSize: '30px',
        color: CSS.text,
        align: 'center',
        wordWrap: { width: 980 },
      })
      .setOrigin(0.5);

    this.hint = this.add
      .text(cx, BASE.h - 70, 'Space / 클릭 — 다음', {
        fontFamily: FONT.body,
        fontSize: '13px',
        color: CSS.muted,
      })
      .setOrigin(0.5)
      .setAlpha(0.6);

    // 건너뛰기
    const skip = this.add
      .text(BASE.w - 40, 44, '건너뛰기 ▶', {
        fontFamily: FONT.body,
        fontSize: '15px',
        color: CSS.muted,
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });
    skip.on('pointerover', () => skip.setColor('#ffffff'));
    skip.on('pointerout', () => skip.setColor(CSS.muted));
    skip.on('pointerup', () => this._finish());

    addVignette(this);

    this.idx = -1;
    this._next();

    // 진행: Space / Enter / 클릭
    this.input.on('pointerup', () => this._advance());
    this.input.keyboard?.on('keydown-SPACE', () => this._advance());
    this.input.keyboard?.on('keydown-ENTER', () => this._advance());
    this.input.keyboard?.on('keydown-ESC', () => this._finish());
  }

  _next() {
    this.idx++;
    if (this.idx >= LINES.length) {
      this._finish();
      return;
    }
    const { t, c } = LINES[this.idx];
    this.line.setColor(c || CSS.text);
    this.typing = true;
    this.full = t;
    let i = 0;
    this.line.setText('');
    this._typer?.remove();
    this._typer = this.time.addEvent({
      delay: 45,
      repeat: t.length - 1,
      callback: () => {
        this.line.setText(t.slice(0, ++i));
        if (i >= t.length) {
          this.typing = false;
          // 마지막 줄 외에는 잠시 후 자동 진행
          if (this.idx < LINES.length - 1) this._auto = this.time.delayedCall(1300, () => this._advance());
        }
      },
    });
  }

  _advance() {
    if (this._done) return;
    if (this.typing) {
      // 타이핑 중이면 즉시 완성
      this._typer?.remove();
      this.line.setText(this.full);
      this.typing = false;
      if (this.idx < LINES.length - 1) this._auto = this.time.delayedCall(900, () => this._advance());
      return;
    }
    this._auto?.remove();
    this._next();
  }

  _finish() {
    if (this._done) return;
    this._done = true;
    this._typer?.remove();
    this._auto?.remove();
    goTo(this, SCENE.CORRIDOR, 600);
  }
}
