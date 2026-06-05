// 탑다운 이동 캐릭터 — 캔버스로 음영을 입힌 EDDIE 토큰(레퍼런스의 둥근 틸 로봇 톤).
// 실제 아트(characters/eddie.png 투명 PNG)가 들어오면 USE_ART 분기로 즉시 교체.
import Phaser from 'phaser';
import { COLORS } from '../../shared/theme.js';

const TOK = 'eddieToken';
const TW = 150;
const TH = 176;
const CXC = TW / 2;
const HEAD_CY = 70; // 토큰 머리 중심 y → 컨테이너 로컬 0

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function drawToken(scene) {
  if (scene.textures.exists(TOK)) return;
  const cv = scene.textures.createCanvas(TOK, TW, TH);
  if (!cv) return;
  const c = cv.getContext();
  c.clearRect(0, 0, TW, TH);

  // 몸통(어깨) — 머리 아래
  let g = c.createLinearGradient(0, 116, 0, 168);
  g.addColorStop(0, '#1c2c40');
  g.addColorStop(1, '#0a141f');
  c.fillStyle = g;
  rr(c, CXC - 46, 116, 92, 52, 20);
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = 'rgba(90,120,160,0.35)';
  c.stroke();

  // 안테나 로드
  c.strokeStyle = '#27384e';
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(CXC, 20);
  c.lineTo(CXC, 6);
  c.stroke();

  // 머리(둥근 사각, 금속 그라데이션)
  g = c.createLinearGradient(0, 16, 0, 124);
  g.addColorStop(0, '#33506e');
  g.addColorStop(0.5, '#1b2a3e');
  g.addColorStop(1, '#0e1826');
  c.fillStyle = g;
  rr(c, CXC - 54, 18, 108, 106, 30);
  c.fill();
  // 상단 하이라이트
  c.save();
  rr(c, CXC - 54, 18, 108, 106, 30);
  c.clip();
  let rg = c.createRadialGradient(CXC - 22, 36, 6, CXC - 22, 36, 120);
  rg.addColorStop(0, 'rgba(150,185,225,0.32)');
  rg.addColorStop(1, 'rgba(150,185,225,0)');
  c.fillStyle = rg;
  c.fillRect(CXC - 54, 18, 108, 106);
  c.restore();
  // 림라이트
  c.lineWidth = 2.5;
  c.strokeStyle = 'rgba(110,150,200,0.7)';
  rr(c, CXC - 54, 18, 108, 106, 30);
  c.stroke();

  // 사이드 유닛(귀)
  c.fillStyle = '#15212f';
  rr(c, CXC - 64, 54, 14, 40, 6);
  c.fill();
  rr(c, CXC + 50, 54, 14, 40, 6);
  c.fill();

  // 페이스 스크린(깊은 어둠 + 광택)
  rr(c, CXC - 40, 38, 80, 66, 18);
  rg = c.createRadialGradient(CXC, 70, 8, CXC, 70, 70);
  rg.addColorStop(0, '#0a1320');
  rg.addColorStop(1, '#03060c');
  c.fillStyle = rg;
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = 'rgba(80,120,170,0.3)';
  c.stroke();

  cv.refresh();
}

export default class Player extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    scene.add.existing(this);
    this.speed = 240;

    // 발치 빛 풀
    this.light = scene.add
      .image(0, 4, 'glow')
      .setTint(COLORS.eddieGlow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.5)
      .setScale(2.8, 2.4);
    this.shadow = scene.add.ellipse(0, 70, 70, 18, 0x000000, 0.45);

    if (scene.textures.exists('eddieArt')) {
      // ★ 실제 EDDIE 아트(투명 PNG) 사용
      this.body2 = scene.add.image(0, 0, 'eddieArt');
      const targetH = 168;
      const s = targetH / this.body2.height;
      this.body2.setScale(s).setOrigin(0.5, 0.5);
      // 발 위치에 맞춰 살짝 위로(중심 보정)
      this.body2.y = -targetH * 0.12;
      this.shadow.y = targetH * 0.42;
      this.add([this.light, this.shadow, this.body2]);
    } else {
      // 폴백: 코드로 그린 EDDIE 토큰 + 눈빛 오버레이
      drawToken(scene);
      this.body2 = scene.add.image(0, HEAD_CY - TH / 2, TOK).setOrigin(0.5, 0.5);
      this.glowL = scene.add.image(-17, 0, 'glow').setTint(COLORS.eddieGlow).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85).setScale(0.55);
      this.glowR = scene.add.image(17, 0, 'glow').setTint(COLORS.eddieGlow).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85).setScale(0.55);
      this.eyeL = scene.add.ellipse(-17, 0, 14, 18, COLORS.eddieGlow).setBlendMode(Phaser.BlendModes.ADD);
      this.eyeR = scene.add.ellipse(17, 0, 14, 18, COLORS.eddieGlow).setBlendMode(Phaser.BlendModes.ADD);
      this.orb = scene.add.ellipse(0, HEAD_CY - TH / 2 + 6, 8, 8, COLORS.eddieGlow).setBlendMode(Phaser.BlendModes.ADD);
      this.add([this.light, this.shadow, this.body2, this.glowL, this.glowR, this.eyeL, this.eyeR, this.orb]);
      scene.tweens.add({ targets: [this.orb], alpha: 0.4, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this._blink(scene);
    }

    this.setDepth(10);
    scene.tweens.add({ targets: this.light, alpha: 0.3, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // 부유감(살짝 위아래)
    scene.tweens.add({ targets: this.body2, y: this.body2.y - 4, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  _blink(scene) {
    scene.time.addEvent({
      delay: Phaser.Math.Between(2600, 5200),
      loop: true,
      callback: () => {
        if (!this.scene) return;
        this.scene.tweens.add({ targets: [this.eyeL, this.eyeR], scaleY: 0.1, duration: 80, yoyo: true });
      },
    });
  }

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
    // 진행 방향으로 살짝 기울이기(생동감)
    if (dx !== 0) this.body2.setFlipX(dx < 0);
    this.moving = dx !== 0 || dy !== 0;
  }
}
