import Phaser from 'phaser';
import { SCENE, COLORS, CSS, FONT, BASE } from '../../shared/theme.js';
import { fadeIn } from '../fx/transition.js';
import { addVignette, addDust } from '../fx/textures.js';
import Player from '../objects/Player.js';

const WORLD_W = 2200;
const WORLD_H = 720;
const FLOOR_TOP = 320; // 걸을 수 있는 바닥 윗변
const FLOOR_BOT = 600;

// 임시 방 배치(3~4개). 센서 방만 진입, 나머지 잠김.
const DOORS = [
  { x: 420, id: 'sensor', name: '센서 방', locked: false },
  { x: 900, id: 'led', name: 'LED 방', locked: true },
  { x: 1380, id: 'buzzer', name: '부저 방', locked: true },
  { x: 1820, id: 'relay', name: '릴레이 방', locked: true },
];

// ── 폐연구소 복도 배경 텍스처(한 번 생성) ──────────────────────
function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function drawCorridorTexture(scene) {
  if (scene.textures.exists('corridorBg')) return;
  const cv = scene.textures.createCanvas('corridorBg', WORLD_W, WORLD_H);
  if (!cv) return;
  const c = cv.getContext();
  const FT = FLOOR_TOP;
  const FB = FLOOR_BOT;

  c.fillStyle = '#06100e';
  c.fillRect(0, 0, WORLD_W, WORLD_H);

  // 뒤벽
  let g = c.createLinearGradient(0, 0, 0, FT);
  g.addColorStop(0, '#0a1614');
  g.addColorStop(1, '#0d211e');
  c.fillStyle = g;
  c.fillRect(0, 0, WORLD_W, FT);
  // 벽 패널
  for (let x = 0; x < WORLD_W; x += 170) {
    c.fillStyle = 'rgba(20,48,44,0.45)';
    rr(c, x + 10, 44, 150, FT - 96, 10);
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = 'rgba(46,92,84,0.4)';
    c.stroke();
    // 패널 볼트
    c.fillStyle = 'rgba(120,160,150,0.18)';
    for (const [bx, by] of [[24, 58], [144, 58], [24, FT - 64], [144, FT - 64]]) {
      c.beginPath();
      c.arc(x + bx, by, 2.5, 0, Math.PI * 2);
      c.fill();
    }
  }
  // 천장 파이프(가로)
  for (const py of [58, 92]) {
    c.strokeStyle = 'rgba(66,104,96,0.55)';
    c.lineWidth = 11;
    c.beginPath();
    c.moveTo(0, py);
    c.lineTo(WORLD_W, py);
    c.stroke();
    c.strokeStyle = 'rgba(150,190,180,0.16)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, py - 3.5);
    c.lineTo(WORLD_W, py - 3.5);
    c.stroke();
  }
  // 녹/그을음 얼룩
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * WORLD_W;
    const y = 110 + Math.random() * (FT - 130);
    c.fillStyle = `rgba(${100 + Math.random() * 70 | 0},${44 + Math.random() * 30 | 0},26,0.10)`;
    c.fillRect(x, y, 2 + Math.random() * 4, 24 + Math.random() * 70);
  }

  // 바닥
  g = c.createLinearGradient(0, FT, 0, FB);
  g.addColorStop(0, '#07120f');
  g.addColorStop(1, '#0c1c17');
  c.fillStyle = g;
  c.fillRect(0, FT, WORLD_W, FB - FT);
  // 바닥 타일
  c.strokeStyle = 'rgba(34,78,68,0.45)';
  c.lineWidth = 1.5;
  for (let x = 0; x <= WORLD_W; x += 96) {
    c.beginPath();
    c.moveTo(x, FT);
    c.lineTo(x, FB);
    c.stroke();
  }
  for (let y = FT; y <= FB; y += 48) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(WORLD_W, y);
    c.stroke();
  }
  // 바닥 틸 윤기 패치
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * WORLD_W;
    const y = FT + 24 + Math.random() * (FB - FT - 48);
    const r = 50 + Math.random() * 90;
    const rg = c.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(80,205,175,0.06)');
    rg.addColorStop(1, 'rgba(80,205,175,0)');
    c.fillStyle = rg;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // 바닥 윗변 라인
  c.strokeStyle = 'rgba(40,90,80,0.5)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(0, FT);
  c.lineTo(WORLD_W, FT);
  c.stroke();

  // 앞쪽(아래) 어두운 띠 — 깊이감
  g = c.createLinearGradient(0, FB, 0, WORLD_H);
  g.addColorStop(0, '#081210');
  g.addColorStop(1, '#030807');
  c.fillStyle = g;
  c.fillRect(0, FB, WORLD_W, WORLD_H - FB);

  cv.refresh();
}

export default class Corridor extends Phaser.Scene {
  constructor() {
    super(SCENE.CORRIDOR);
  }

  create() {
    // ★ 인스턴스 재사용 대비 상태 리셋(방 다녀온 뒤 이동 잠김 방지)
    this._left = false;
    this._near = null;

    this.cameras.main.setBackgroundColor('#04080a');
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    fadeIn(this, 500);

    drawCorridorTexture(this);
    this.add.image(WORLD_W / 2, WORLD_H / 2, 'corridorBg').setDepth(0);

    this._lights(); // 점멸 천장등 + 빛 풀
    this._debris(); // 유리/비커/서류 잔해

    // 문 + 근접 트리거
    this.doors = DOORS.map((d) => this._makeDoor(d));

    // 플레이어
    this.player = new Player(this, 200, 470);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // 입력
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.input.keyboard.on('keydown-SPACE', () => this._tryEnter());

    this._hud();

    addDust(this, 46);
    addVignette(this);
  }

  _lights() {
    // 일정 간격 천장등 빛 풀(틸/앰버 섞어), 일부는 점멸
    const xs = [240, 560, 880, 1200, 1520, 1840, 2120];
    this.flickers = [];
    xs.forEach((x, i) => {
      const amber = i % 3 === 1;
      const img = this.add
        .image(x, FLOOR_TOP - 6, 'glow')
        .setTint(amber ? COLORS.amber : COLORS.eddieGlow)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.14)
        .setScale(3.2, 2.4)
        .setDepth(1);
      if (i % 2 === 0) this.flickers.push(img);
    });
    // 점멸 타이머
    this.time.addEvent({
      delay: 130,
      loop: true,
      callback: () => {
        for (const f of this.flickers) {
          if (Math.random() < 0.25) f.setAlpha(0.05 + Math.random() * 0.18);
        }
      },
    });
  }

  _debris() {
    const rand = (a, b) => a + Math.random() * (b - a);
    for (let i = 0; i < 16; i++) {
      const x = rand(120, WORLD_W - 120);
      const y = rand(FLOOR_TOP + 40, FLOOR_BOT - 20);
      const g = this.add.graphics({ x, y }).setDepth(2);
      const kind = Math.floor(Math.random() * 3);
      if (kind === 0) {
        // 깨진 유리 조각
        g.fillStyle(0x8fe9d6, 0.18);
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(rand(8, 16), rand(-6, 6));
        g.lineTo(rand(4, 12), rand(8, 16));
        g.closePath();
        g.fillPath();
      } else if (kind === 1) {
        // 서류
        g.fillStyle(0xb9c2cf, 0.12);
        g.fillRect(-9, -6, 18, 13);
        g.lineStyle(1, 0x6c7787, 0.18);
        g.strokeRect(-9, -6, 18, 13);
      } else {
        // 비커
        g.fillStyle(0x6fd6c0, 0.16);
        g.fillRoundedRect(-6, -2, 12, 16, 3);
        g.fillRect(-2, -8, 4, 7);
      }
      g.setAngle(rand(0, 360));
    }
  }

  _makeDoor(d) {
    const doorY = FLOOR_TOP;
    const w = 110;
    const h = 132;
    const color = d.locked ? COLORS.red : COLORS.green;

    // 문 뒤 빛
    this.add
      .image(d.x, doorY - h / 2, 'glow')
      .setTint(d.locked ? COLORS.red : COLORS.eddieGlow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(d.locked ? 0.1 : 0.22)
      .setScale(1.8, 2.2)
      .setDepth(1);

    const g = this.add.graphics().setDepth(2);
    // 금속 프레임
    g.fillStyle(0x16242f, 1);
    g.fillRoundedRect(d.x - w / 2 - 8, doorY - h - 8, w + 16, h + 12, 12);
    g.fillStyle(0x0a141c, 1);
    g.fillRoundedRect(d.x - w / 2, doorY - h, w, h, 8);
    // 문짝 분할선
    g.lineStyle(2, 0x223444, 0.9);
    g.lineBetween(d.x, doorY - h + 6, d.x, doorY - 6);
    // 프레임 글로우 테두리
    g.lineStyle(3, color, 0.85);
    g.strokeRoundedRect(d.x - w / 2 - 8, doorY - h - 8, w + 16, h + 12, 12);
    // 상단 표시등
    g.fillStyle(color, 1);
    g.fillCircle(d.x, doorY - h + 4, 5);
    // 잠김 균열
    if (d.locked) {
      g.lineStyle(1.5, 0x3a2a24, 0.7);
      g.lineBetween(d.x - 20, doorY - h + 30, d.x + 14, doorY - 40);
      g.lineBetween(d.x + 10, doorY - h + 50, d.x - 18, doorY - 30);
    }

    // 라벨 패널
    const label = this.add
      .text(d.x, doorY - h - 26, d.locked ? `${d.name}  🔒` : d.name, {
        fontFamily: FONT.body, fontSize: '15px', color: d.locked ? CSS.muted : CSS.text,
        backgroundColor: 'rgba(6,12,16,0.6)', padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(3);

    return { ...d, cx: d.x, label };
  }

  _hud() {
    this.add
      .text(BASE.w / 2, 38, '연구소 복도 · 시스템 복구', {
        fontFamily: FONT.display, fontSize: '20px', color: CSS.text,
      })
      .setOrigin(0.5).setScrollFactor(0).setAlpha(0.9).setDepth(2000);
    this.add
      .text(BASE.w / 2, 68, '방향키 / WASD 이동 · 방 앞에서 Space 입장', {
        fontFamily: FONT.body, fontSize: '13px', color: CSS.muted,
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.prompt = this.add
      .text(BASE.w / 2, BASE.h - 66, '', {
        fontFamily: FONT.display, fontSize: '18px', color: CSS.text,
        backgroundColor: 'rgba(6,12,18,0.78)', padding: { x: 18, y: 9 },
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(2000).setAlpha(0);
  }

  _tryEnter() {
    if (this._left || !this._near || this._near.locked) return;
    this._left = true;
    this.cameras.main.fadeOut(350, 5, 7, 13);
    this.cameras.main.once('camerafadeoutcomplete', () =>
      this.scene.start(SCENE.ROOM, { id: this._near.id, name: this._near.name }),
    );
  }

  update(time, delta) {
    if (this._left || !this.player) return;
    this.player.move(this.cursors, this.wasd, delta, {
      x1: 70, x2: WORLD_W - 70, y1: FLOOR_TOP + 18, y2: FLOOR_BOT - 16,
    });

    // 문 앞(가깝고 윗쪽) 감지
    let near = null;
    for (const d of this.doors) {
      if (Math.abs(this.player.x - d.cx) < 70 && this.player.y < FLOOR_TOP + 110) {
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
}
