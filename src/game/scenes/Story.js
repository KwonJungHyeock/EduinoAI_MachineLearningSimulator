import Phaser from 'phaser';
import { SCENE, COLORS, CSS, FONT, BASE } from '../../shared/theme.js';
import { fadeIn, goTo } from '../fx/transition.js';
import { addVignette } from '../fx/textures.js';

// 스토리 인트로 — 검정 배경, 시네마틱 타이핑 + 주변 효과(불티/스캔라인/경고 점멸/흔들림).
// 문구는 초안 — 자유 수정. shake: 폭발 흔들림, eyes: 눈 부팅 연출.
const LINES = [
  { t: '경고 — 메인 리액터 임계 초과', c: '#ff5a3c', shake: 0.012, alert: true },
  { t: '굉음. 시설 전체가 무너지듯 흔들린다.', c: '#ffd9d2', shake: 0.02 },
  { t: '정전. 모든 시스템이 침묵에 잠긴다.', c: CSS.text },
  { t: '…그리고 어둠 속, 단 하나의 불빛 —', c: CSS.muted },
  { t: '너의 두 눈이, 깜빡, 켜진다.', c: '#6fffd6', eyes: true },
  { t: '여긴 폐쇄된 지하 연구소.', c: CSS.text },
  { t: '문은 잠겼고, 출구는 멀다.', c: CSS.text },
  { t: 'EDDIE — 시스템을 복구하며, 탈출하라.', c: COLORS.green, big: true },
];

export default class Story extends Phaser.Scene {
  constructor() {
    super(SCENE.STORY);
  }

  create() {
    this._done = false;
    const cx = BASE.w / 2;
    const cy = BASE.h / 2;
    this.cameras.main.setBackgroundColor('#000000');
    fadeIn(this, 700);

    // 비상 적색 점멸(상단·하단 글로우)
    this.alarm = this.add
      .image(cx, cy, 'glow')
      .setTint(0xff3b25)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setScale(14, 9)
      .setScrollFactor(0);

    // 불티/잔해 입자(아래→위로 떠오름)
    this.embers = this.add.particles(0, 0, 'dust', {
      x: { min: 0, max: BASE.w },
      y: BASE.h + 10,
      lifespan: 6000,
      speedY: { min: -40, max: -14 },
      speedX: { min: -12, max: 12 },
      scale: { min: 0.2, max: 0.7 },
      alpha: { start: 0.5, end: 0 },
      tint: [0xffb020, 0xff5a3c, 0x6fb7ff],
      frequency: 240,
      quantity: 1,
      blendMode: 'ADD',
    }).setDepth(1);

    // 스캔라인(테크 질감)
    this._scanlines(cx, cy);

    // 눈 부팅용(처음엔 숨김)
    this.eyeL = this.add.image(cx - 34, cy - 90, 'glow').setTint(0x6fffd6).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5).setAlpha(0);
    this.eyeR = this.add.image(cx + 34, cy - 90, 'glow').setTint(0x6fffd6).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5).setAlpha(0);

    // 헤더
    this.add
      .text(cx, 132, 'SYSTEM FAILURE', { fontFamily: FONT.display, fontSize: '20px', color: '#ff5a3c' })
      .setOrigin(0.5).setAlpha(0.5).setLetterSpacing?.(8).setDepth(5);

    // 본문
    this.line = this.add
      .text(cx, cy + 10, '', {
        fontFamily: FONT.display, fontSize: '30px', color: CSS.text,
        align: 'center', wordWrap: { width: 1000 },
      })
      .setOrigin(0.5).setDepth(5);

    this.hint = this.add
      .text(cx, BASE.h - 64, 'Space / 클릭 — 다음', { fontFamily: FONT.body, fontSize: '13px', color: CSS.muted })
      .setOrigin(0.5).setAlpha(0.55).setDepth(5);

    const skip = this.add
      .text(BASE.w - 40, 44, '건너뛰기 ▶', { fontFamily: FONT.body, fontSize: '15px', color: CSS.muted })
      .setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).setDepth(5);
    skip.on('pointerover', () => skip.setColor('#ffffff'));
    skip.on('pointerout', () => skip.setColor(CSS.muted));
    skip.on('pointerup', () => this._finish());

    addVignette(this, 4);

    this.idx = -1;
    this._next();

    this.input.on('pointerup', () => this._advance());
    this.input.keyboard?.on('keydown-SPACE', () => this._advance());
    this.input.keyboard?.on('keydown-ENTER', () => this._advance());
    this.input.keyboard?.on('keydown-ESC', () => this._finish());
  }

  _scanlines(cx, cy) {
    const g = this.add.graphics().setDepth(3).setScrollFactor(0).setAlpha(0.06);
    g.fillStyle(0xffffff, 1);
    for (let y = 0; y < BASE.h; y += 4) g.fillRect(0, y, BASE.w, 1);
  }

  _next() {
    this.idx++;
    if (this.idx >= LINES.length) return this._finish();
    const L = LINES[this.idx];

    this.line.setColor(L.c || CSS.text).setFontSize(L.big ? 38 : 30);
    this.full = L.t;
    this.typing = true;
    let i = 0;
    this.line.setText('');

    // 라인별 연출
    if (L.alert) this._flashAlarm();
    if (L.shake) this.cameras.main.shake(600, L.shake);
    if (L.eyes) this._bootEyes();

    this._typer?.remove();
    this._typer = this.time.addEvent({
      delay: 42,
      repeat: this.full.length - 1,
      callback: () => {
        this.line.setText(this.full.slice(0, ++i));
        if (i >= this.full.length) {
          this.typing = false;
          if (this.idx < LINES.length - 1) this._auto = this.time.delayedCall(1400, () => this._advance());
        }
      },
    });
  }

  _flashAlarm() {
    this.tweens.add({ targets: this.alarm, alpha: 0.4, duration: 120, yoyo: true, repeat: 2, ease: 'Quad.in' });
  }

  _bootEyes() {
    [this.eyeL, this.eyeR].forEach((e, k) => {
      this.time.delayedCall(120 * k, () => {
        // 깜빡깜빡 켜짐
        this.tweens.add({ targets: e, alpha: { from: 0, to: 0.9 }, duration: 90, yoyo: true, repeat: 2,
          onComplete: () => this.tweens.add({ targets: e, alpha: 0.7, duration: 300 }) });
      });
    });
  }

  _advance() {
    if (this._done) return;
    if (this.typing) {
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
    goTo(this, SCENE.CORRIDOR, 700);
  }
}
