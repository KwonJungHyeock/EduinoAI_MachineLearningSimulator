import Phaser from 'phaser';
import { SCENE, COLORS, CSS, FONT, BASE } from '../../shared/theme.js';
import { fadeIn } from '../fx/transition.js';
import { addVignette, addDust } from '../fx/textures.js';
import { hasAsset } from '../assets.js';
import Player from '../objects/Player.js';

// 방 정의(센서 방만 진입). 배경 아트의 문 프레임 위치(가로 비율)에 맞춰 배치.
const ROOMS = [
  { id: 'sensor', name: '센서 방', locked: false },
  { id: 'led', name: 'LED 방', locked: true },
  { id: 'buzzer', name: '부저 방', locked: true },
  { id: 'relay', name: '릴레이 방', locked: true },
];
// 문 중심 x (월드폭 대비 비율) — 그림 프레임에 맞춰 미세조정 가능
const DOOR_FRAC = [0.16, 0.4, 0.63, 0.86];

export default class Corridor extends Phaser.Scene {
  constructor() {
    super(SCENE.CORRIDOR);
  }

  create() {
    this._left = false;
    this._near = null;

    this.artBg = hasAsset(this, 'hubBg');

    if (this.artBg) {
      // 월드 크기를 배경 비율(7680×2160 등)에 맞춤
      const src = this.textures.get('hubBg').getSourceImage();
      this.worldW = Math.round(WORLD_H * (src.width / src.height));
      this.floorTop = 408; // 걷는 바닥 윗변(그림 기준)
      this.floorBot = 688;
    } else {
      this.worldW = 2200;
      this.floorTop = 320;
      this.floorBot = 600;
    }

    this.cameras.main.setBackgroundColor('#04080a');
    this.cameras.main.setBounds(0, 0, this.worldW, WORLD_H);
    fadeIn(this, 500);

    if (this.artBg) {
      this.add.image(this.worldW / 2, WORLD_H / 2, 'hubBg').setDisplaySize(this.worldW, WORLD_H).setDepth(0);
    } else {
      drawCorridorTexture(this, this.worldW, this.floorTop, this.floorBot);
      this.add.image(this.worldW / 2, WORLD_H / 2, 'corridorBg').setDepth(0);
      this._proceduralLights();
      this._debris();
    }

    // 문(라벨/잠금/글로우/트리거) — 아트면 프레임 위에 오버레이만
    this.doors = ROOMS.map((r, i) => this._makeDoor(r, Math.round(this.worldW * (DOOR_FRAC[i] ?? (i + 1) / (ROOMS.length + 1)))));

    // 플레이어 — 직전 위치에서 이어짐
    const pos = this.registry.get('corridorPos') || { x: Math.round(this.worldW * 0.08), y: this.floorBot - 40 };
    this.player = new Player(this, pos.x, pos.y);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.input.keyboard.on('keydown-SPACE', () => this._tryEnter());

    this._hud();
    addDust(this, 40);
    addVignette(this);
  }

  _makeDoor(r, x) {
    const labelY = this.floorTop - 24; // 문 프레임 위(벽쪽)
    const color = r.locked ? COLORS.red : COLORS.eddieGlow;

    // 프레임 강조 글로우(잠금=레드, 해제=틸)
    this.add
      .image(x, this.floorTop - 70, 'glow')
      .setTint(color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(r.locked ? 0.14 : 0.26)
      .setScale(2.2, 2.6)
      .setDepth(1);

    // 라벨 패널
    this.add
      .text(x, labelY, r.locked ? `${r.name}  🔒` : r.name, {
        fontFamily: FONT.body, fontSize: '17px', color: r.locked ? CSS.muted : '#eafffb',
        backgroundColor: 'rgba(5,12,14,0.72)', padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(3);

    // 잠금 X 표시
    if (r.locked) {
      const g = this.add.graphics().setDepth(2);
      g.lineStyle(4, COLORS.red, 0.5);
      g.lineBetween(x - 26, this.floorTop - 150, x + 26, this.floorTop - 96);
      g.lineBetween(x + 26, this.floorTop - 150, x - 26, this.floorTop - 96);
    }

    return { ...r, cx: x };
  }

  _hud() {
    this.add
      .text(BASE.w / 2, 36, '연구소 복도 · 시스템 복구', { fontFamily: FONT.display, fontSize: '20px', color: CSS.text })
      .setOrigin(0.5).setScrollFactor(0).setAlpha(0.9).setDepth(2000);
    this.add
      .text(BASE.w / 2, 66, '방향키 / WASD 이동 · 방 앞에서 Space 입장', { fontFamily: FONT.body, fontSize: '13px', color: CSS.muted })
      .setOrigin(0.5).setScrollFactor(0).setDepth(2000);
    this.prompt = this.add
      .text(BASE.w / 2, BASE.h - 60, '', {
        fontFamily: FONT.display, fontSize: '18px', color: CSS.text,
        backgroundColor: 'rgba(6,12,18,0.8)', padding: { x: 18, y: 9 },
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(2000).setAlpha(0);
  }

  _tryEnter() {
    if (this._left || !this._near || this._near.locked) return;
    this._left = true;
    this.registry.set('corridorPos', { x: this.player.x, y: this.player.y });
    this.cameras.main.fadeOut(350, 5, 7, 13);
    this.cameras.main.once('camerafadeoutcomplete', () =>
      this.scene.start(SCENE.ROOM, { id: this._near.id, name: this._near.name }),
    );
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
        this.prompt.setColor(near.locked ? CSS.muted : '#ffffff');
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
