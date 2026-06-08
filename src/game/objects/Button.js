// 고급 버튼 컴포넌트 — 그라데이션·광택·글로우 + "투명 히트존"으로 클릭 영역 보장.
// (컨테이너 자체를 인터랙티브로 하면 중첩/스케일 시 클릭이 어긋남 → 전용 Rectangle 히트존 사용)
import Phaser from 'phaser';
import { FONT } from '../../shared/theme.js';

const shade = (c, fn, amt) => {
  const col = Phaser.Display.Color.IntegerToColor(c);
  col[fn](amt);
  return col.color;
};
const lighten = (c, a) => shade(c, 'brighten', a);
const darken = (c, a) => shade(c, 'darken', a);

export default class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y);
    scene.add.existing(this);

    const {
      label = '버튼', icon = '', width = 220, height = 58,
      color = 0x3ddc91, textColor = '#04140d', onClick,
    } = opts;
    this._onClick = onClick;
    const hw = width / 2;
    const hh = height / 2;
    const r = Math.min(height / 2, 18);

    // 외곽 글로우
    this.glow = scene.add
      .image(0, 5, 'glow').setTint(color).setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.16).setScale(width / 110, height / 50);

    // 드롭 섀도(소프트)
    this.shadow = scene.add
      .image(0, 9, 'glow').setTint(0x000000).setAlpha(0.45).setScale(width / 150, height / 60);

    // 바디(두 톤 + 광택 + 림)
    this.g = scene.add.graphics();
    this._draw(color, width, height, r);

    // 라벨
    this.label = scene.add
      .text(0, -1, (icon ? icon + '  ' : '') + label, {
        fontFamily: FONT.display, fontSize: Math.round(height * 0.36) + 'px', fontStyle: '700', color: textColor,
      })
      .setOrigin(0.5);
    this.label.setShadow(0, 1, 'rgba(255,255,255,0.25)', 0);

    // ★ 투명 히트존 — 버튼 전체가 확실히 클릭됨
    this.hit = scene.add.rectangle(0, 0, width, height, 0xffffff, 0).setInteractive({ useHandCursor: true });

    this.add([this.glow, this.shadow, this.g, this.label, this.hit]);
    this.setSize(width, height);

    this.hit.on('pointerover', () => this._hover(true));
    this.hit.on('pointerout', () => this._hover(false));
    this.hit.on('pointerdown', () => this.setScale(0.97));
    this.hit.on('pointerup', () => {
      this.setScale(1.04);
      this._onClick?.();
    });

    this._breath = scene.tweens.add({ targets: this.glow, alpha: { from: 0.12, to: 0.28 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.on('destroy', () => this._breath?.remove());
  }

  _draw(color, w, h, r) {
    const hw = w / 2;
    const hh = h / 2;
    const g = this.g;
    g.clear();
    // 베이스(아래 어둡게)
    g.fillStyle(darken(color, 16), 1);
    g.fillRoundedRect(-hw, -hh, w, h, r);
    // 상단 라이트
    g.fillStyle(lighten(color, 26), 1);
    g.fillRoundedRect(-hw, -hh, w, h * 0.54, r);
    // 광택 라인
    g.fillStyle(0xffffff, 0.26);
    g.fillRoundedRect(-hw + 7, -hh + 4, w - 14, h * 0.3, r * 0.7);
    // 림라이트 보더
    g.lineStyle(1.5, lighten(color, 60), 0.95);
    g.strokeRoundedRect(-hw, -hh, w, h, r);
  }

  _hover(on) {
    this.scene.tweens.add({ targets: this, scaleX: on ? 1.05 : 1, scaleY: on ? 1.05 : 1, duration: 130, ease: 'Back.out' });
    this.scene.tweens.add({ targets: this.glow, alpha: on ? 0.5 : 0.22, duration: 160 });
  }

  trigger() {
    this._onClick?.();
  }
}
