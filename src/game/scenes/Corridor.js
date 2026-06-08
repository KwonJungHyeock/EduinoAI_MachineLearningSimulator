import Phaser from 'phaser';
import { SCENE, COLORS, CSS, FONT, BASE } from '../../shared/theme.js';
import { fadeIn } from '../fx/transition.js';
import { addVignette, addDust } from '../fx/textures.js';
import { hasAsset } from '../assets.js';
import Player from '../objects/Player.js';

// 방 정의(센서 방만 진입). 배경 아트의 문 프레임 위치(가로 비율)에 맞춰 배치.
const ROOMS = [
  { id: 'dodge', name: '미니게임 룸', locked: false }, // 도망치기 미니게임
  { id: 'led', name: 'LED 방', locked: true }, // ★ 본 커리큘럼 시작점
  { id: 'buzzer', name: '부저 방', locked: true },
  { id: 'relay', name: '릴레이 방', locked: true },
];
// 문 중심 x (월드폭 대비 비율) — 균등 배치(코드가 문을 그리므로 항상 정확)
const DOOR_FRAC = [0.2, 0.4, 0.6, 0.8];

export default class Corridor extends Phaser.Scene {
  constructor() {
    super(SCENE.CORRIDOR);
  }

  create() {
    this._left = false;
    this._near = null;

    this.artBg = hasAsset(this, 'hubBg');

    if (this.artBg) {
      // "멀리서 보는" 프레임: 배경을 화면보다 낮은 높이로 가운데 렌더(상·하 어둠 띠)
      const src = this.textures.get('hubBg').getSourceImage();
      this.renderH = 600;
      this.topY = (WORLD_H - this.renderH) / 2; // 60
      this.worldW = Math.round(this.renderH * (src.width / src.height));
      this.floorTop = Math.round(this.topY + this.renderH * 0.6); // 걷는 바닥 윗변 ≈420
      this.floorBot = Math.round(this.topY + this.renderH * 0.98); // ≈648
      this.doorNameY = Math.round(this.topY + this.renderH * 0.1); // 이름판 ≈120
      this.doorCenterY = Math.round(this.topY + this.renderH * 0.35); // 홀로문 중앙 ≈270
      this.frameH = Math.round(this.renderH * 0.42); // 홀로문 높이 ≈252
    } else {
      this.renderH = WORLD_H;
      this.topY = 0;
      this.worldW = 2200;
      this.floorTop = 360;
      this.floorBot = 640;
      this.doorNameY = 150;
      this.doorCenterY = 250;
      this.frameH = 200;
    }

    this.cameras.main.setBackgroundColor('#04080a');
    this.cameras.main.setBounds(0, 0, this.worldW, WORLD_H); // 세로 고정·가로 스크롤
    fadeIn(this, 500);

    if (this.artBg) {
      this.add.image(this.worldW / 2, WORLD_H / 2, 'hubBg').setDisplaySize(this.worldW, this.renderH).setDepth(0);
      // 상·하 어둠 띠(레터박스 느낌)
      const band = this.add.graphics().setScrollFactor(0).setDepth(1500);
      band.fillStyle(0x03060a, 1);
      band.fillRect(0, 0, BASE.w, this.topY);
      band.fillRect(0, WORLD_H - this.topY, BASE.w, this.topY);
    } else {
      drawCorridorTexture(this, this.worldW, this.floorTop, this.floorBot);
      this.add.image(this.worldW / 2, WORLD_H / 2, 'corridorBg').setDepth(0);
      this._proceduralLights();
      this._debris();
    }

    // 문(이름판/잠금/글로우/트리거) — 아트면 프레임 위에 오버레이만
    this.doors = ROOMS.map((r, i) => this._makeDoor(r, Math.round(this.worldW * (DOOR_FRAC[i] ?? (i + 1) / (ROOMS.length + 1)))));

    // 플레이어 — 직전 위치에서 이어짐(작게 → 멀리서 보는 느낌)
    const pos = this.registry.get('corridorPos') || { x: Math.round(this.worldW * 0.08), y: this.floorBot - 30 };
    this.player = new Player(this, pos.x, pos.y, { scale: this.artBg ? 0.7 : 1 });
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.input.keyboard.on('keydown-SPACE', () => this._tryEnter());

    this._hud();
    addDust(this, 40);
    addVignette(this);
  }

  // 홀로그램 문 — 코드로 정확한 위치에 그림(배경 위에 얹힘)
  _makeDoor(r, x) {
    const color = r.locked ? COLORS.red : COLORS.eddieGlow;
    const w = 156;
    const h = this.frameH;
    const top = this.doorCenterY - h / 2;

    // 뒤 글로우
    this.add
      .image(x, this.doorCenterY, 'glow')
      .setTint(color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(r.locked ? 0.12 : 0.2)
      .setScale(w / 90, h / 110)
      .setDepth(1);

    // 홀로 프레임(반투명 + 빛나는 테두리 + 스캔라인)
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(color, 0.05);
    g.fillRoundedRect(x - w / 2, top, w, h, 14);
    g.lineStyle(2.5, color, 0.85);
    g.strokeRoundedRect(x - w / 2, top, w, h, 14);
    g.lineStyle(1, color, 0.18);
    for (let yy = top + 12; yy < top + h - 8; yy += 10) g.lineBetween(x - w / 2 + 8, yy, x + w / 2 - 8, yy);
    // 모서리 틱
    g.lineStyle(3, color, 1);
    const k = 16;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
      const cx2 = x + sx * (w / 2 - 4);
      const cy2 = this.doorCenterY + sy * (h / 2 - 4);
      g.lineBetween(cx2, cy2, cx2 - sx * k, cy2);
      g.lineBetween(cx2, cy2, cx2, cy2 - sy * k);
    });
    this.tweens.add({ targets: g, alpha: { from: 0.75, to: 1 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // 이름판(상단) — 박스 없이 글로우 폰트로 배경에 녹임
    const name = this.add
      .text(x, this.doorNameY, r.name, {
        fontFamily: FONT.display, fontSize: '21px',
        color: r.locked ? '#ffb3a6' : '#d6fff5',
      })
      .setOrigin(0.5).setDepth(3);
    name.setStroke('#04100e', 5);
    name.setShadow(0, 0, r.locked ? '#ff5a3c' : '#6fffd6', 14, true, true);
    name.setLetterSpacing?.(1);

    // 중앙 상태 표시
    if (r.locked) {
      this.add.text(x, this.doorCenterY, '🔒', { fontSize: '42px' }).setOrigin(0.5).setDepth(3).setAlpha(0.92);
    } else {
      const core = this.add.image(x, this.doorCenterY, 'glow').setTint(color).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.4).setScale(0.9).setDepth(3);
      this.tweens.add({ targets: core, alpha: 0.15, scale: 0.6, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const en = this.add.text(x, this.doorCenterY + h / 2 - 24, '▶ 입장 가능', { fontFamily: FONT.body, fontSize: '13px', color: '#cafff2' }).setOrigin(0.5).setDepth(3);
      en.setShadow(0, 0, '#6fffd6', 8, false, true);
    }

    return { ...r, cx: x };
  }

  _hud() {
    const cx = BASE.w / 2;
    // 상단 헤더 바
    const bar = this.add.graphics().setScrollFactor(0).setDepth(1990);
    bar.fillStyle(0x03070c, 0.55);
    bar.fillRect(0, 0, BASE.w, 92);

    this.add
      .text(cx, 18, 'PLAYINO : ESCAPE ROOM', {
        fontFamily: FONT.display, fontSize: '17px', color: '#e6edf7',
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(2000).setLetterSpacing?.(3);
    this.add
      .text(cx, 44, '에피소드 · 시스템 복구', {
        fontFamily: FONT.display, fontSize: '13px', color: '#ffb020',
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(2000).setAlpha(0.85).setLetterSpacing?.(2);
    this.add
      .text(cx, 70, '📍 연구소 복도        방향키 / WASD 이동 · 방 앞에서 Space 입장', {
        fontFamily: FONT.body, fontSize: '13px', color: '#9fb0c6',
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.prompt = this.add
      .text(cx, BASE.h - 40, '', {
        fontFamily: FONT.display, fontSize: '20px', color: CSS.text,
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(2000).setAlpha(0);
    this.prompt.setStroke('#04100e', 5);
    this.prompt.setShadow(0, 0, '#6fffd6', 12, true, true);
  }

  _tryEnter() {
    if (this._left || !this._near || this._near.locked) return;
    this._left = true;
    this.registry.set('corridorPos', { x: this.player.x, y: this.player.y });
    const target = this._near.id === 'dodge' ? SCENE.DODGE : SCENE.ROOM;
    const data = { id: this._near.id, name: this._near.name };
    this.cameras.main.fadeOut(350, 5, 7, 13);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(target, data));
  }

  update(time, delta) {
    if (this._left || !this.player) return;
    this.player.move(this.cursors, this.wasd, delta, {
      x1: 60, x2: this.worldW - 60, y1: this.floorTop + 6, y2: this.floorBot - 10,
    });

    let near = null;
    for (const d of this.doors) {
      if (Math.abs(this.player.x - d.cx) < 80 && this.player.y < this.floorTop + 140) {
        near = d;
        break;
      }
    }
    if (near !== this._near) {
      this._near = near;
      if (near) {
        this.prompt.setText(near.locked ? `🔒 ${near.name} · 준비 중` : `[Space]  ${near.name} 입장`);
        this.prompt.setColor(near.locked ? '#ffb3a6' : '#ffffff');
        this.prompt.setShadow(0, 0, near.locked ? '#ff5a3c' : '#6fffd6', 12, true, true);
        this.tweens.add({ targets: this.prompt, alpha: 1, duration: 150 });
      } else {
        this.tweens.add({ targets: this.prompt, alpha: 0, duration: 150 });
      }
    }
  }

  // ── 절차적 폴백(아트 없을 때) ──────────────────────
  _proceduralLights() {
    const xs = [240, 560, 880, 1200, 1520, 1840, 2120];
    this.flickers = [];
    xs.forEach((x, i) => {
      const amber = i % 3 === 1;
      const img = this.add
        .image(x, this.floorTop - 6, 'glow')
        .setTint(amber ? COLORS.amber : COLORS.eddieGlow)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.14).setScale(3.2, 2.4).setDepth(1);
      if (i % 2 === 0) this.flickers.push(img);
    });
    this.time.addEvent({
      delay: 130, loop: true,
      callback: () => {
        for (const f of this.flickers) if (Math.random() < 0.25) f.setAlpha(0.05 + Math.random() * 0.18);
      },
    });
  }

  _debris() {
    const rand = (a, b) => a + Math.random() * (b - a);
    for (let i = 0; i < 14; i++) {
      const x = rand(120, this.worldW - 120);
      const y = rand(this.floorTop + 40, this.floorBot - 20);
      const g = this.add.graphics({ x, y }).setDepth(2);
      const kind = Math.floor(Math.random() * 3);
      if (kind === 0) {
        g.fillStyle(0x8fe9d6, 0.18);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(rand(8, 16), rand(-6, 6)); g.lineTo(rand(4, 12), rand(8, 16)); g.closePath(); g.fillPath();
      } else if (kind === 1) {
        g.fillStyle(0xb9c2cf, 0.12); g.fillRect(-9, -6, 18, 13);
      } else {
        g.fillStyle(0x6fd6c0, 0.16); g.fillRoundedRect(-6, -2, 12, 16, 3); g.fillRect(-2, -8, 4, 7);
      }
      g.setAngle(rand(0, 360));
    }
  }
}

const WORLD_H = 720;

// 절차적 복도 텍스처(폴백)
function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function drawCorridorTexture(scene, W, FT, FB) {
  if (scene.textures.exists('corridorBg')) return;
  const cv = scene.textures.createCanvas('corridorBg', W, WORLD_H);
  if (!cv) return;
  const c = cv.getContext();
  c.fillStyle = '#06100e'; c.fillRect(0, 0, W, WORLD_H);
  let g = c.createLinearGradient(0, 0, 0, FT); g.addColorStop(0, '#0a1614'); g.addColorStop(1, '#0d211e'); c.fillStyle = g; c.fillRect(0, 0, W, FT);
  for (let x = 0; x < W; x += 170) { c.fillStyle = 'rgba(20,48,44,0.45)'; rr(c, x + 10, 44, 150, FT - 96, 10); c.fill(); }
  g = c.createLinearGradient(0, FT, 0, FB); g.addColorStop(0, '#07120f'); g.addColorStop(1, '#0c1c17'); c.fillStyle = g; c.fillRect(0, FT, W, FB - FT);
  c.strokeStyle = 'rgba(34,78,68,0.45)'; c.lineWidth = 1.5;
  for (let x = 0; x <= W; x += 96) { c.beginPath(); c.moveTo(x, FT); c.lineTo(x, FB); c.stroke(); }
  for (let y = FT; y <= FB; y += 48) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  g = c.createLinearGradient(0, FB, 0, WORLD_H); g.addColorStop(0, '#081210'); g.addColorStop(1, '#030807'); c.fillStyle = g; c.fillRect(0, FB, W, WORLD_H - FB);
  cv.refresh();
}
