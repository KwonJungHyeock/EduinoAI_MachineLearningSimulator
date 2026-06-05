import Phaser from 'phaser';
import { SCENE, COLORS, CSS, FONT, BASE } from '../../shared/theme.js';
import { fadeIn } from '../fx/transition.js';
import { addVignette, addDust } from '../fx/textures.js';
import Player from '../objects/Player.js';

const WORLD_W = 1900;
const WORLD_H = 720;
const FLOOR_TOP = 360; // 걸을 수 있는 영역
const FLOOR_BOT = 580;

// 임시 방 배치(3~4개). 1개만 진짜 진입 가능(센서 방), 나머지는 잠김.
const DOORS = [
  { x: 360, id: 'sensor', name: '센서 방', locked: false },
  { x: 760, id: 'led', name: 'LED 방', locked: true },
  { x: 1160, id: 'buzzer', name: '부저 방', locked: true },
  { x: 1560, id: 'relay', name: '릴레이 방', locked: true },
];

export default class Corridor extends Phaser.Scene {
  constructor() {
    super(SCENE.CORRIDOR);
  }

  create() {
    this.cameras.main.setBackgroundColor('#05070d');
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    fadeIn(this, 500);

    this._drawCorridor();

    // 문 + 근접 트리거
    this.doors = DOORS.map((d) => this._makeDoor(d));

    // 플레이어
    this.player = new Player(this, 150, 470);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // 입력
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.input.keyboard.on('keydown-SPACE', () => this._tryEnter());

    // HUD (카메라 고정)
    this.add
      .text(BASE.w / 2, 40, '연구소 복도 · 시스템 복구', {
        fontFamily: FONT.display, fontSize: '20px', color: CSS.text,
      })
      .setOrigin(0.5).setScrollFactor(0).setAlpha(0.85).setDepth(2000);
    this.add
      .text(BASE.w / 2, 70, '방향키 / WASD 이동 · 방 앞에서 Space 입장', {
        fontFamily: FONT.body, fontSize: '13px', color: CSS.muted,
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.prompt = this.add
      .text(BASE.w / 2, BASE.h - 70, '', {
        fontFamily: FONT.display, fontSize: '18px', color: CSS.text,
        backgroundColor: 'rgba(6,10,18,0.7)', padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(2000).setAlpha(0);

    addDust(this, 40);
    addVignette(this);
  }

  _drawCorridor() {
    const g = this.add.graphics().setDepth(0);
    // 벽(위/아래)
    g.fillStyle(0x0a1322, 1);
    g.fillRect(0, 0, WORLD_W, FLOOR_TOP);
    g.fillRect(0, FLOOR_BOT, WORLD_W, WORLD_H - FLOOR_BOT);
    // 바닥
    g.fillStyle(0x0e1726, 1);
    g.fillRect(0, FLOOR_TOP, WORLD_W, FLOOR_BOT - FLOOR_TOP);
    // 바닥 타일 라인
    g.lineStyle(1, 0x18243a, 0.8);
    for (let x = 0; x <= WORLD_W; x += 80) g.lineBetween(x, FLOOR_TOP, x, FLOOR_BOT);
    g.lineBetween(0, FLOOR_TOP, WORLD_W, FLOOR_TOP);
    g.lineBetween(0, FLOOR_BOT, WORLD_W, FLOOR_BOT);
    // 천장 파이프 느낌
    g.lineStyle(3, 0x14203a, 0.6);
    for (let x = 40; x < WORLD_W; x += 200) g.lineBetween(x, 0, x, FLOOR_TOP - 30);
  }

  _makeDoor(d) {
    const doorY = FLOOR_TOP; // 윗벽에 붙은 문
    const w = 96;
    const h = 120;
    const color = d.locked ? COLORS.red : COLORS.green;

    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x111c30, 1);
    g.fillRoundedRect(d.x - w / 2, doorY - h, w, h, 10);
    g.lineStyle(3, color, 0.85);
    g.strokeRoundedRect(d.x - w / 2, doorY - h, w, h, 10);
    // 상단 표시등
    g.fillStyle(color, 1);
    g.fillCircle(d.x, doorY - h + 16, 6);

    // 문 위 빛
    this.add.image(d.x, doorY - h / 2, 'glow').setTint(color).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.16).setScale(1.6, 2).setDepth(1);

    // 라벨
    this.add
      .text(d.x, doorY - h - 16, `${d.name}${d.locked ? ' 🔒' : ''}`, {
        fontFamily: FONT.body, fontSize: '14px', color: d.locked ? CSS.muted : CSS.text,
      })
      .setOrigin(0.5).setDepth(2);

    return { ...d, cx: d.x, triggerY: doorY + 30 };
  }

  _tryEnter() {
    if (this._near && !this._near.locked) {
      this._left = true;
      this.cameras.main.fadeOut(350, 5, 7, 13);
      this.cameras.main.once('camerafadeoutcomplete', () =>
        this.scene.start(SCENE.ROOM, { id: this._near.id, name: this._near.name }),
      );
    }
  }

  update(time, delta) {
    if (this._left || !this.player) return;
    this.player.move(this.cursors, this.wasd, delta, {
      x1: 70, x2: WORLD_W - 70, y1: FLOOR_TOP + 20, y2: FLOOR_BOT - 20,
    });

    // 근접 문 탐색(문 앞 + 윗쪽에 가까울 때)
    let near = null;
    for (const d of this.doors) {
      if (Math.abs(this.player.x - d.cx) < 64 && this.player.y < FLOOR_TOP + 90) {
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
