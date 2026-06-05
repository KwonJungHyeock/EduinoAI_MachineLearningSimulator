// 탑다운 이동 캐릭터(임시 토큰) — 코드로 그린 EDDIE.
// 실제 캐릭터 스프라이트가 확정되면 이 내부만 교체한다.
import Phaser from 'phaser';
import { COLORS } from '../../shared/theme.js';

export default class Player extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    scene.add.existing(this);
    this.speed = 240;

    // 발치 빛 풀(어둠 속 이동광)
    this.light = scene.add
      .image(0, 6, 'glow')
      .setTint(COLORS.eddieGlow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.5)
      .setScale(2.6, 2.2);

    this.shadow = scene.add.ellipse(0, 26, 52, 16, 0x000000, 0.45);

    const g = scene.add.graphics();
    g.fillStyle(0x16223a, 1);
    g.fillRoundedRect(-22, -30, 44, 50, 12); // 머리/몸 통합 토큰
    g.fillStyle(0x223252, 0.6);
    g.fillRoundedRect(-22, -30, 44, 22, 12);
    g.lineStyle(2, COLORS.edge ?? 0x4a6190, 0.8);
    g.strokeRoundedRect(-22, -30, 44, 50, 12);
    // 페이스 스크린
    g.fillStyle(0x070b12, 1);
    g.fillRoundedRect(-15, -22, 30, 22, 7);

    this.eyeL = scene.add.ellipse(-7, -11, 7, 10, COLORS.eddieGlow).setBlendMode(Phaser.BlendModes.ADD);
    this.eyeR = scene.add.ellipse(7, -11, 7, 10, COLORS.eddieGlow).setBlendMode(Phaser.BlendModes.ADD);

    this.add([this.light, this.shadow, g, this.eyeL, this.eyeR]);
    this.setDepth(10);

    // 눈빛 펄스
    scene.tweens.add({ targets: this.light, alpha: 0.32, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  // 매 프레임 호출: 키 입력으로 이동 + 경계 클램프
  move(cursors, wasd, delta, bounds) {
    const dt = delta / 1000;
    let dx = 0;
    let dy = 0;
    if (cursors.left.isDown || wasd.A.isDown) dx -= 1;
    if (cursors.right.isDown || wasd.D.isDown) dx += 1;
    if (cursors.up.isDown || wasd.W.isDown) dy -= 1;
    if (cursors.down.isDown || wasd.S.isDown) dy += 1;
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.sqrt(2);
      dx *= inv;
      dy *= inv;
    }
    this.x = Phaser.Math.Clamp(this.x + dx * this.speed * dt, bounds.x1, bounds.x2);
    this.y = Phaser.Math.Clamp(this.y + dy * this.speed * dt, bounds.y1, bounds.y2);
    this.moving = dx !== 0 || dy !== 0;
  }
}
