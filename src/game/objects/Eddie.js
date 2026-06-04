// EDDIE — 절차적으로 그린 살아있는 로봇 캐릭터(고급 버전).
// 어둠 속에서 "눈 글로우가 유일한 빛"(시그니처). 외부 스프라이트 없이 코드로:
//  - 금속 동체 + 헤드(상단 하이라이트 / 하단 음영 / 림라이트)
//  - 광택 페이스 스크린 + 캡슐형 눈(깜빡임·코어 하이라이트)
//  - 안테나 글로우 + 가슴 코어 + 접지 그림자
//  - idle 부유, 눈빛/안테나 펄스, 상태별 눈색(setMood)
// 실제 아트가 들어오면 draw 부분만 교체하면 된다.
import Phaser from 'phaser';
import { COLORS } from '../../shared/theme.js';

const C = {
  dark: 0x121a2a,
  mid: 0x1d2940,
  light: 0x2c3c5c,
  edge: 0x4a6190,
  screen: 0x070b12,
};

export default class Eddie extends Phaser.GameObjects.Container {
  constructor(scene, x, y, scale = 1) {
    super(scene, x, y);
    scene.add.existing(this);
    this.setScale(scale);
    this._eye = COLORS.eddieGlow;
    this._baseY = y;

    // 접지 그림자
    this.shadow = scene.add.ellipse(0, 156, 200, 34, 0x000000, 0.5);

    // 전체 눈빛 조명 풀(어둠에 퍼지는 빛)
    this.lightPool = scene.add
      .image(0, -8, 'glow')
      .setTint(this._eye)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.5)
      .setScale(3.6);

    // 정적 금속 부품(한 번 그림)
    const g = scene.add.graphics();
    // 동체
    g.fillStyle(C.dark, 1);
    g.fillRoundedRect(-86, 66, 172, 112, 42);
    g.fillStyle(C.light, 0.4);
    g.fillRoundedRect(-76, 70, 152, 46, 28);
    g.lineStyle(2, C.edge, 0.5);
    g.strokeRoundedRect(-86, 66, 172, 112, 42);
    // 귀(사이드 유닛)
    g.fillStyle(C.mid, 1);
    g.fillRoundedRect(-96, -30, 22, 64, 10);
    g.fillRoundedRect(74, -30, 22, 64, 10);
    // 헤드
    g.fillStyle(C.mid, 1);
    g.fillRoundedRect(-80, -80, 160, 160, 40);
    g.fillStyle(C.light, 0.5); // 상단 하이라이트
    g.fillRoundedRect(-74, -75, 148, 74, 34);
    g.fillStyle(C.dark, 0.45); // 하단 음영
    g.fillRoundedRect(-74, 10, 148, 66, 32);
    g.lineStyle(2.5, C.edge, 0.85); // 림라이트
    g.strokeRoundedRect(-80, -80, 160, 160, 40);
    // 페이스 스크린
    g.fillStyle(C.screen, 1);
    g.fillRoundedRect(-62, -60, 124, 108, 26);
    g.lineStyle(2, 0x14233f, 0.9);
    g.strokeRoundedRect(-62, -60, 124, 108, 26);
    g.fillStyle(0xffffff, 0.05); // 광택 반사
    g.fillRoundedRect(-54, -54, 108, 40, 20);
    // 안테나 로드
    g.lineStyle(4, C.light, 1);
    g.lineBetween(0, -80, 0, -106);
    this.metal = g;

    // 가슴 코어(은은한 펄스)
    this.core = scene.add
      .ellipse(0, 120, 16, 16, this._eye)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.7);

    // 눈 글로우 halo
    this.glowL = scene.add.image(-30, -12, 'glow').setTint(this._eye).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85).setScale(1.0);
    this.glowR = scene.add.image(30, -12, 'glow').setTint(this._eye).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85).setScale(1.0);
    // 눈(캡슐형) + 코어 하이라이트
    this.eyeL = scene.add.ellipse(-30, -12, 30, 40, this._eye).setBlendMode(Phaser.BlendModes.ADD);
    this.eyeR = scene.add.ellipse(30, -12, 30, 40, this._eye).setBlendMode(Phaser.BlendModes.ADD);
    this.coreL = scene.add.ellipse(-33, -18, 9, 12, 0xffffff).setAlpha(0.95);
    this.coreR = scene.add.ellipse(27, -18, 9, 12, 0xffffff).setAlpha(0.95);
    // 입(살짝 미소)
    this.mouth = scene.add.ellipse(0, 30, 30, 7, this._eye).setAlpha(0.6);

    // 안테나 오브
    this.orb = scene.add.ellipse(0, -112, 13, 13, this._eye).setBlendMode(Phaser.BlendModes.ADD);
    this.orbCore = scene.add.ellipse(0, -112, 5, 5, 0xffffff).setAlpha(0.9);

    this.add([
      this.shadow, this.lightPool, this.metal, this.core,
      this.glowL, this.glowR, this.eyeL, this.eyeR,
      this.coreL, this.coreR, this.mouth, this.orb, this.orbCore,
    ]);

    // ── 애니메이션 ─────────────────────────────
    this._bob = scene.tweens.add({
      targets: this, y: y - 9, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    // 그림자는 부유와 반대로 살짝 작아짐
    this._bobShadow = scene.tweens.add({
      targets: this.shadow, scaleX: 0.86, alpha: 0.35, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    this._pulse = scene.tweens.add({
      targets: [this.lightPool], alpha: 0.34, scaleX: 3.3, scaleY: 3.3, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    this._orbPulse = scene.tweens.add({
      targets: [this.orb, this.core], alpha: 0.45, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    this._scheduleBlink();

    this.on('destroy', () => this._cleanup());
  }

  _scheduleBlink() {
    this._blinkTimer = this.scene.time.addEvent({
      delay: Phaser.Math.Between(2800, 5400),
      callback: () => {
        if (!this.scene) return;
        this.scene.tweens.add({
          targets: [this.eyeL, this.eyeR, this.coreL, this.coreR],
          scaleY: 0.08, duration: 85, yoyo: true, ease: 'Quad.in',
        });
        this._scheduleBlink();
      },
    });
  }

  // 상태별 눈색(ok=초록, warn=앰버, alert=레드, idle=시그니처)
  setMood(mood) {
    const map = { ok: COLORS.green, warn: COLORS.amber, alert: COLORS.red, idle: COLORS.eddieGlow };
    const color = map[mood] ?? COLORS.eddieGlow;
    this._eye = color;
    [this.eyeL, this.eyeR, this.mouth, this.core, this.orb].forEach((o) => o.setFillStyle(color));
    [this.lightPool, this.glowL, this.glowR].forEach((o) => o.setTint(color));
  }

  // 말할 때 살짝 들썩 + 입 움직임
  talk() {
    this.scene.tweens.add({
      targets: this, scaleX: this.scaleX * 1.03, scaleY: this.scaleY * 0.97,
      duration: 110, yoyo: true, repeat: 2, ease: 'Sine.inOut',
    });
    this.scene.tweens.add({
      targets: this.mouth, scaleY: 1.8, duration: 90, yoyo: true, repeat: 3, ease: 'Sine.inOut',
    });
  }

  _cleanup() {
    this._bob?.remove();
    this._bobShadow?.remove();
    this._pulse?.remove();
    this._orbPulse?.remove();
    this._blinkTimer?.remove();
  }
}
