// EDDIE — 캔버스 그라데이션으로 음영을 입힌 입체 로봇.
// 콘셉트: 어둠 속 폐연구소. 하반신은 어둠에 잠기고 "눈 글로우가 유일한 빛".
// 귀여움보다 으스스한 미스터리 톤(K-12 안전: 위협 연출 없음, 분위기로만).
// 정적 금속/스크린은 고해상 캔버스 텍스처(부드러운 3D 음영)로 1회 생성하고,
// 눈빛/안테나/코어만 가산 발광 오브젝트로 얹어 애니메이션한다.
import Phaser from 'phaser';
import { COLORS } from '../../shared/theme.js';

const TEX = 'eddieBody';
const W = 460;
const H = 640;
const CXC = W / 2; // 캔버스 중심 x
const HEAD_CY = 250; // 캔버스 상 머리 중심 y (컨테이너 로컬 0에 매핑)

// 캔버스 → 컨테이너 로컬 좌표
const lx = (px) => px - CXC;
const ly = (py) => py - HEAD_CY;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawEddieTexture(scene) {
  if (scene.textures.exists(TEX)) return;
  const canvas = scene.textures.createCanvas(TEX, W, H);
  if (!canvas) return;
  const ctx = canvas.getContext();
  ctx.clearRect(0, 0, W, H);

  // ── 어깨/동체 (아래로 갈수록 어둠에 잠김) ──
  let g = ctx.createLinearGradient(0, 330, 0, 560);
  g.addColorStop(0, '#202d44');
  g.addColorStop(0.5, '#101a2a');
  g.addColorStop(1, '#05080e');
  ctx.fillStyle = g;
  rr(ctx, CXC - 135, 360, 270, 220, 64);
  ctx.fill();
  // 동체 상단 림라이트
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(90,120,170,0.35)';
  ctx.stroke();

  // 목
  ctx.fillStyle = '#16202f';
  rr(ctx, CXC - 34, 320, 68, 70, 18);
  ctx.fill();

  // ── 헤드 베이스 (수직 금속 그라데이션) ──
  g = ctx.createLinearGradient(0, 110, 0, 400);
  g.addColorStop(0, '#3a4f74');
  g.addColorStop(0.45, '#1d2a40');
  g.addColorStop(1, '#0c1320');
  ctx.fillStyle = g;
  rr(ctx, CXC - 150, 110, 300, 290, 70);
  ctx.fill();

  // 좌상단 하이라이트(광원)
  ctx.save();
  rr(ctx, CXC - 150, 110, 300, 290, 70);
  ctx.clip();
  let rg = ctx.createRadialGradient(CXC - 70, 160, 10, CXC - 70, 160, 260);
  rg.addColorStop(0, 'rgba(150,180,220,0.30)');
  rg.addColorStop(1, 'rgba(150,180,220,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(CXC - 150, 110, 300, 290);
  // 하단 앰비언트 오클루전
  rg = ctx.createRadialGradient(CXC, 410, 20, CXC, 410, 220);
  rg.addColorStop(0, 'rgba(0,0,0,0.55)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(CXC - 150, 200, 300, 200);
  ctx.restore();

  // 헤드 외곽 림(상단 밝고 하단 어둡게)
  g = ctx.createLinearGradient(0, 110, 0, 400);
  g.addColorStop(0, 'rgba(120,150,200,0.7)');
  g.addColorStop(0.5, 'rgba(60,80,120,0.25)');
  g.addColorStop(1, 'rgba(10,16,28,0.6)');
  ctx.lineWidth = 3;
  ctx.strokeStyle = g;
  rr(ctx, CXC - 150, 110, 300, 290, 70);
  ctx.stroke();

  // 사이드 유닛(귀)
  ctx.fillStyle = '#162032';
  rr(ctx, CXC - 168, 210, 28, 100, 12);
  ctx.fill();
  rr(ctx, CXC + 140, 210, 28, 100, 12);
  ctx.fill();

  // 안테나 로드
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#26344c';
  ctx.beginPath();
  ctx.moveTo(CXC, 112);
  ctx.lineTo(CXC, 70);
  ctx.stroke();

  // ── 페이스 스크린 (깊은 어둠 + 광택) ──
  rr(ctx, CXC - 116, 168, 232, 170, 42);
  rg = ctx.createRadialGradient(CXC, 250, 20, CXC, 250, 180);
  rg.addColorStop(0, '#0b1320');
  rg.addColorStop(1, '#02040a');
  ctx.fillStyle = rg;
  ctx.fill();
  // 스크린 내측 음영 테두리
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(90,120,170,0.25)';
  rr(ctx, CXC - 116, 168, 232, 170, 42);
  ctx.stroke();
  // 상단 광택 반사
  ctx.save();
  rr(ctx, CXC - 116, 168, 232, 170, 42);
  ctx.clip();
  g = ctx.createLinearGradient(0, 170, 0, 250);
  g.addColorStop(0, 'rgba(120,160,210,0.12)');
  g.addColorStop(1, 'rgba(120,160,210,0)');
  ctx.fillStyle = g;
  ctx.fillRect(CXC - 116, 168, 232, 90);
  // 스캔라인(테크 질감)
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let yy = 176; yy < 338; yy += 5) ctx.fillRect(CXC - 116, yy, 232, 1.5);
  ctx.restore();

  canvas.refresh();
}

export default class Eddie extends Phaser.GameObjects.Container {
  constructor(scene, x, y, scale = 1) {
    super(scene, x, y);
    drawEddieTexture(scene);
    scene.add.existing(this);
    this.setScale(scale);
    this._eye = COLORS.eddieGlow;

    // 접지 그림자
    this.shadow = scene.add.ellipse(0, ly(560), 240, 38, 0x000000, 0.55);

    // 전체 눈빛 조명 풀(어둠에 퍼지는 빛)
    this.lightPool = scene.add
      .image(lx(CXC), ly(232), 'glow')
      .setTint(this._eye)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.55)
      .setScale(4.4, 4.0);

    // 정적 본체 텍스처
    this.bodyImg = scene.add.image(0, ly(H / 2), TEX).setOrigin(0.5, 0.5);

    // 가슴 코어
    this.core = scene.add
      .ellipse(lx(CXC), ly(450), 18, 18, this._eye)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.7);

    // 눈 글로우 halo
    const eyeY = ly(244);
    this.glowL = scene.add.image(lx(CXC - 52), eyeY, 'glow').setTint(this._eye).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.9).setScale(1.25);
    this.glowR = scene.add.image(lx(CXC + 52), eyeY, 'glow').setTint(this._eye).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.9).setScale(1.25);
    // 눈(세로 캡슐 — 또렷하고 차갑게)
    this.eyeL = scene.add.ellipse(lx(CXC - 52), eyeY, 30, 46, this._eye).setBlendMode(Phaser.BlendModes.ADD);
    this.eyeR = scene.add.ellipse(lx(CXC + 52), eyeY, 30, 46, this._eye).setBlendMode(Phaser.BlendModes.ADD);
    this.coreL = scene.add.ellipse(lx(CXC - 56), eyeY - 8, 9, 14, 0xffffff).setAlpha(0.9);
    this.coreR = scene.add.ellipse(lx(CXC + 48), eyeY - 8, 9, 14, 0xffffff).setAlpha(0.9);

    // 안테나 오브
    this.orb = scene.add.ellipse(lx(CXC), ly(66), 15, 15, this._eye).setBlendMode(Phaser.BlendModes.ADD);
    this.orbCore = scene.add.ellipse(lx(CXC), ly(66), 6, 6, 0xffffff).setAlpha(0.9);

    this.add([
      this.shadow, this.lightPool, this.bodyImg, this.core,
      this.glowL, this.glowR, this.eyeL, this.eyeR,
      this.coreL, this.coreR, this.orb, this.orbCore,
    ]);

    // ── 애니메이션 ─────────────────────────────
    this._bob = scene.tweens.add({ targets: this, y: y - 10, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this._bobShadow = scene.tweens.add({ targets: this.shadow, scaleX: 0.84, alpha: 0.38, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this._pulse = scene.tweens.add({ targets: [this.lightPool], alpha: 0.36, scaleX: 4.0, scaleY: 3.7, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this._orbPulse = scene.tweens.add({ targets: [this.orb, this.core], alpha: 0.4, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this._scheduleBlink();

    this.on('destroy', () => this._cleanup());
  }

  _scheduleBlink() {
    this._blinkTimer = this.scene.time.addEvent({
      delay: Phaser.Math.Between(3000, 5600),
      callback: () => {
        if (!this.scene) return;
        this.scene.tweens.add({
          targets: [this.eyeL, this.eyeR, this.coreL, this.coreR],
          scaleY: 0.06, duration: 80, yoyo: true, ease: 'Quad.in',
        });
        this._scheduleBlink();
      },
    });
  }

  setMood(mood) {
    const map = { ok: COLORS.green, warn: COLORS.amber, alert: COLORS.red, idle: COLORS.eddieGlow };
    const color = map[mood] ?? COLORS.eddieGlow;
    this._eye = color;
    [this.eyeL, this.eyeR, this.core, this.orb].forEach((o) => o.setFillStyle(color));
    [this.lightPool, this.glowL, this.glowR].forEach((o) => o.setTint(color));
  }

  talk() {
    this.scene.tweens.add({
      targets: this, scaleX: this.scaleX * 1.02, scaleY: this.scaleY * 0.98,
      duration: 120, yoyo: true, repeat: 2, ease: 'Sine.inOut',
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
