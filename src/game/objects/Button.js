// 고급 버튼 컴포넌트(재사용) — 그라데이션 바디 + 림 + 광택 + 글로우 + 호버/프레스.
// 사각 텍스트 버튼 대신 모든 씬에서 이걸로 통일한다.
import Phaser from 'phaser';
import { FONT } from '../../shared/theme.js';

const tint = (c, fn, amt) => {
  const col = Phaser.Display.Color.IntegerToColor(c);
  col[fn](amt);
  return col.color;
};
const brighten = (c, a) => tint(c, 'brighten', a);
const darken = (c, a) => tint(c, 'darken', a);

export default class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y);
    scene.add.existing(this);

    const {
      label = '버튼',
      icon = '',
      width = 240,
      height = 62,
      color = 0x3ddc91,
      textColor = '#04140d',
      onClick,
    } = opts;
    this._onClick = onClick;

    const hw = width / 2;
    const hh = height / 2;
    const r = height / 2; // 알약형

    // 뒤 글로우
    this.glow = scene.add
      .image(0, 4, 'glow')
      .setTint(color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.2)
      .setScale(width / 150, height / 70);

    // 그림자
    const sh = scene.add.graphics();
    sh.fillStyle(0x000000, 0.4);
    sh.fillRoundedRect(-hw, -hh + 8, width, height, r);

    // 바디(두 톤 + 림 + 광택)
    const g = scene.add.graphics();
    g.fillStyle(darken(color, 18), 1);
    g.fillRoundedRect(-hw, -hh, width, height, r);
    g.fillStyle(brighten(color, 22), 1); // 상단 라이트
    g.fillRoundedRect(-hw, -hh, width, height * 0.55, r);
    g.fillStyle(0xffffff, 0.28); // 상단 광택 라인
    g.fillRoundedRect(-hw + 7, -hh + 4, width - 14, height * 0.3, r * 0.6);
    g.lineStyle(1.5, brighten(color, 55), 0.95); // 림라이트
    g.strokeRoundedRect(-hw, -hh, width, height, r);

    // 라벨
    this.label = scene.add
      .text(0, 0, (icon ? icon + '  ' : '') + label, {
        fontFamily: FONT.display,
        fontSize: Math.round(height * 0.32) + 'px',
        fontStyle: '700',
        color: textColor,
      })
      .setOrigin(0.5);

    this.add([this.glow, sh, g, this.label]);

    // 입력
    this.setSize(width, height);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-hw, -hh, width, height),
      Phaser.Geom.Rectangle.Contains,
      { useHandCursor: true },
    );
    this.on('pointerover', () => this._hover(true));
    this.on('pointerout', () => this._hover(false));
    this.on('pointerdown', () => this.setScale(this._baseScale * 0.96));
    this.on('pointerup', () => {
      this.setScale(this._baseScale * 1.05);
      this._fire();
    });
    this._baseScale = 1;

    // 은은한 글로우 호흡
    this._breath = scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.14, to: 0.3 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.on('destroy', () => this._breath?.remove());
  }

  _hover(on) {
    this.scene.tweens.add({
      targets: this,
      scaleX: on ? 1.05 : 1,
      scaleY: on ? 1.05 : 1,
      duration: 130,
      ease: 'Back.out',
    });
    this.scene.tweens.add({ targets: this.glow, alpha: on ? 0.5 : 0.22, duration: 160 });
  }

  _fire() {
    this._onClick?.();
  }
  trigger() {
    this._fire();
  }
}
