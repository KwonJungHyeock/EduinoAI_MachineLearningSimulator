// EDDIE — 절차적으로 그린 살아있는 로봇 캐릭터.
// 어둠 속에서 "눈 글로우가 유일한 빛"(시그니처). 외부 스프라이트 없이 코드로 생동감:
//  - 미세한 상하 들썩임(idle bob)
//  - 주기적 눈 깜빡임(blink)
//  - 눈빛 펄스 + 방사형 조명 풀
//  - say(text) 말풍선 / setMood(상태)로 눈 색 변화
// 실제 아트(스프라이트/표정 프레임)가 들어오면 이 클래스 내부만 교체하면 된다.
import Phaser from 'phaser';
import { COLORS } from '../../shared/theme.js';

export default class Eddie extends Phaser.GameObjects.Container {
  constructor(scene, x, y, scale = 1) {
    super(scene, x, y);
    scene.add.existing(this);
    this.setScale(scale);
    this._eyeColor = COLORS.eddieGlow;

    // 조명 풀(눈빛이 어둠에 퍼지는 효과) — 캐릭터 뒤, 가산 혼합
    this.lightPool = scene.add
      .image(0, -6, 'glow')
      .setTint(this._eyeColor)
      .setBlendMode(Phaser.BlendMode.ADD)
      .setAlpha(0.5)
      .setScale(3.2);
    this.add(this.lightPool);

    // 몸체(둥근 금속 헤드)
    const body = scene.add.graphics();
    body.fillStyle(0x1a2436, 1);
    body.fillRoundedRect(-70, -86, 140, 150, 26);
    body.lineStyle(3, 0x2f3e58, 1);
    body.strokeRoundedRect(-70, -86, 140, 150, 26);
    // 얼굴 스크린(더 어두운 패널)
    body.fillStyle(0x0a1018, 1);
    body.fillRoundedRect(-54, -70, 108, 92, 18);
    // 안테나
    body.lineStyle(4, 0x2f3e58, 1);
    body.lineBetween(0, -86, 0, -108);
    body.fillStyle(this._eyeColor, 1);
    body.fillCircle(0, -112, 6);
    this.add(body);
    this.body2 = body;

    // 눈(밝은 글로우) — 깜빡임 대상
    this.eyeL = scene.add.ellipse(-24, -28, 26, 30, this._eyeColor).setBlendMode(Phaser.BlendMode.ADD);
    this.eyeR = scene.add.ellipse(24, -28, 26, 30, this._eyeColor).setBlendMode(Phaser.BlendMode.ADD);
    // 눈 하이라이트(코어)
    this.coreL = scene.add.ellipse(-24, -28, 10, 12, 0xffffff).setAlpha(0.9);
    this.coreR = scene.add.ellipse(24, -28, 10, 12, 0xffffff).setAlpha(0.9);
    // 미소형 입(가는 라인)
    this.mouth = scene.add.rectangle(0, 8, 30, 4, this._eyeColor).setAlpha(0.7);
    this.add([this.eyeL, this.eyeR, this.coreL, this.coreR, this.mouth]);

    // ── 애니메이션 ──────────────────────────────
    // 들썩임
    this._bob = scene.tweens.add({
      targets: this,
      y: y - 8,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    // 눈빛 펄스(조명 풀)
    this._pulse = scene.tweens.add({
      targets: this.lightPool,
      alpha: 0.32,
      scale: 3.0,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    // 깜빡임 루프
    this._scheduleBlink();

    this.on('destroy', () => this._cleanup());
  }

  _scheduleBlink() {
    this._blinkTimer = this.scene.time.addEvent({
      delay: Phaser.Math.Between(2600, 5200),
      callback: () => {
        if (!this.scene) return;
        this.scene.tweens.add({
          targets: [this.eyeL, this.eyeR, this.coreL, this.coreR],
          scaleY: 0.08,
          duration: 90,
          yoyo: true,
          ease: 'Quad.in',
        });
        this._scheduleBlink();
      },
    });
  }

  // 상태별 눈 색(green=성공, amber=경고, red=위험, 기본=시그니처)
  setMood(mood) {
    const map = {
      ok: COLORS.green,
      warn: COLORS.amber,
      alert: COLORS.red,
      idle: COLORS.eddieGlow,
    };
    const color = map[mood] ?? COLORS.eddieGlow;
    this._eyeColor = color;
    [this.eyeL, this.eyeR, this.mouth].forEach((o) => o.setFillStyle(color));
    this.lightPool.setTint(color);
  }

  // 말할 때 잠깐 빠르게 들썩 + (옵션) 외부 말풍선 콜백
  talk() {
    this.scene.tweens.add({
      targets: this,
      scaleX: this.scaleX * 1.03,
      scaleY: this.scaleY * 0.97,
      duration: 110,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.inOut',
    });
  }

  _cleanup() {
    this._bob?.remove();
    this._pulse?.remove();
    this._blinkTimer?.remove();
  }
}
