import Phaser from 'phaser';
import { SCENE, COLORS, CSS, FONT, BASE } from '../../shared/theme.js';
import { fadeIn, goTo } from '../fx/transition.js';
import { addVignette } from '../fx/textures.js';
import Player from '../objects/Player.js';
import Button from '../objects/Button.js';

// 미니게임 — 도망치기: 시간이 지날수록 에너지 구체가 늘어난다. 닿으면 끝.
// 오래 버틴 시간 기록(최대 3개), 재도전 / 나가기.
const REC_KEY = 'eduino.dodge.top3';
const ARENA = { x1: 96, y1: 168, x2: 980, y2: 686 };
const SPAWN_EVERY = 2600; // ms마다 구체 +1
const START_BALLS = 2;
const MAX_BALLS = 16;

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(REC_KEY) || '[]');
  } catch {
    return [];
  }
}
function saveRecord(t) {
  const a = loadRecords();
  a.push(t);
  a.sort((x, y) => y - x);
  const top = a.slice(0, 3);
  localStorage.setItem(REC_KEY, JSON.stringify(top));
  return top;
}

export default class Dodge extends Phaser.Scene {
  constructor() {
    super(SCENE.DODGE);
  }

  create() {
    this._over = false;
    this._left = false;
    this.elapsed = 0;
    this.balls = [];

    this.cameras.main.setBackgroundColor('#05080e');
    fadeIn(this, 400);

    this._header();
    this._arena();
    this._recordsPanel();

    // 플레이어(EDDIE)
    this.player = new Player(this, (ARENA.x1 + ARENA.x2) / 2, (ARENA.y1 + ARENA.y2) / 2, { scale: 0.5, speed: 280 });
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    // 타이머 표시
    this.timer = this.add
      .text((ARENA.x1 + ARENA.x2) / 2, ARENA.y1 - 30, '0.0s', {
        fontFamily: FONT.display, fontSize: '30px', color: '#d8fff5',
      })
      .setOrigin(0.5).setDepth(50);
    this.timer.setShadow(0, 0, '#6fffd6', 12, true, true);

    // 나가기(항상)
    this._exitBtn = this.add
      .text(BASE.w - 30, 30, '✕ 나가기', { fontFamily: FONT.body, fontSize: '15px', color: '#9fb0c6' })
      .setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).setDepth(60);
    this._exitBtn.on('pointerover', () => this._exitBtn.setColor('#ffffff'));
    this._exitBtn.on('pointerout', () => this._exitBtn.setColor('#9fb0c6'));
    this._exitBtn.on('pointerup', () => this._exit());
    this.input.keyboard.on('keydown-ESC', () => this._exit());

    // 가이드 멘트
    this.guide = this.add
      .text((ARENA.x1 + ARENA.x2) / 2, ARENA.y2 + 26, '방향키 / WASD 로 에너지 구체를 피하세요 — 오래 버틸수록 고득점!', {
        fontFamily: FONT.body, fontSize: '14px', color: '#9fb0c6',
      })
      .setOrigin(0.5).setDepth(50);

    // 시작 구체 + 주기적 증가
    for (let i = 0; i < START_BALLS; i++) this._spawnBall();
    this.spawnTimer = this.time.addEvent({ delay: SPAWN_EVERY, loop: true, callback: () => this._spawnBall() });

    addVignette(this);
  }

  _header() {
    const cx = BASE.w / 2;
    this.add.text(cx, 22, 'PLAYINO : ESCAPE ROOM', { fontFamily: FONT.display, fontSize: '16px', color: '#e6edf7' })
      .setOrigin(0.5).setAlpha(0.85).setDepth(50).setLetterSpacing?.(3);
    this.add.text(cx, 48, '미니게임 룸 · 도망치기', { fontFamily: FONT.display, fontSize: '13px', color: '#ffb020' })
      .setOrigin(0.5).setAlpha(0.85).setDepth(50);
  }

  _arena() {
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x081016, 0.6);
    g.fillRoundedRect(ARENA.x1, ARENA.y1, ARENA.x2 - ARENA.x1, ARENA.y2 - ARENA.y1, 14);
    g.lineStyle(2, COLORS.eddieGlow, 0.5);
    g.strokeRoundedRect(ARENA.x1, ARENA.y1, ARENA.x2 - ARENA.x1, ARENA.y2 - ARENA.y1, 14);
  }

  _recordsPanel() {
    const px = 1004;
    const pw = BASE.w - px - 24;
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x0a131f, 0.7);
    g.fillRoundedRect(px, ARENA.y1, pw, 250, 12);
    g.lineStyle(1.5, 0x2a3a52, 1);
    g.strokeRoundedRect(px, ARENA.y1, pw, 250, 12);

    this.add.text(px + pw / 2, ARENA.y1 + 26, '🏆 기록 TOP 3', { fontFamily: FONT.display, fontSize: '16px', color: '#d8fff5' })
      .setOrigin(0.5).setDepth(2);

    this.recordTexts = [];
    const medals = ['🥇', '🥈', '🥉'];
    for (let i = 0; i < 3; i++) {
      const t = this.add.text(px + 20, ARENA.y1 + 64 + i * 40, '', {
        fontFamily: 'ui-monospace, monospace', fontSize: '18px', color: '#cdd6e6',
      }).setDepth(2);
      this.recordTexts.push({ t, medal: medals[i] });
    }
    this._refreshRecords();

    // 안내
    this.add.text(px + pw / 2, ARENA.y1 + 300, '구체에 닿으면\n게임 종료', {
      fontFamily: FONT.body, fontSize: '13px', color: '#8b97ad', align: 'center', lineSpacing: 4,
    }).setOrigin(0.5).setDepth(2);
  }

  _refreshRecords(highlight = -1) {
    const recs = loadRecords();
    this.recordTexts.forEach((r, i) => {
      const v = recs[i];
      r.t.setText(`${r.medal}  ${v != null ? v.toFixed(1) + 's' : '—'}`);
      r.t.setColor(i === highlight ? '#6fffd6' : '#cdd6e6');
    });
  }

  _spawnBall() {
    if (this._over || this.balls.length >= MAX_BALLS) return;
    // 플레이어에서 멀리 스폰
    let x, y, tries = 0;
    do {
      x = Phaser.Math.Between(ARENA.x1 + 30, ARENA.x2 - 30);
      y = Phaser.Math.Between(ARENA.y1 + 30, ARENA.y2 - 30);
      tries++;
    } while (tries < 20 && Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 220);

    const r = 17;
    const speed = Phaser.Math.Between(140, 200) + this.balls.length * 4;
    const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);

    const glow = this.add.image(x, y, 'glow').setTint(0xff5a3c).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7).setScale(0.7).setDepth(8);
    const core = this.add.circle(x, y, r, 0xff6a4a).setDepth(9);
    const hi = this.add.circle(x - 4, y - 4, 5, 0xffd8cc).setAlpha(0.9).setDepth(9);
    this.balls.push({ x, y, r, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, glow, core, hi });
    // 등장 점멸
    this.tweens.add({ targets: [core, glow], alpha: { from: 0.2, to: 1 }, duration: 160, yoyo: true, repeat: 1 });
  }

  update(time, delta) {
    if (this._over || this._left || !this.player) return;
    const dt = delta / 1000;
    this.elapsed += dt;
    this.timer.setText(this.elapsed.toFixed(1) + 's');

    this.player.move(this.cursors, this.wasd, delta, {
      x1: ARENA.x1 + 24, x2: ARENA.x2 - 24, y1: ARENA.y1 + 24, y2: ARENA.y2 - 24,
    });

    const pr = 22; // 플레이어 충돌 반경
    for (const b of this.balls) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      // 벽 반사
      if (b.x < ARENA.x1 + b.r) { b.x = ARENA.x1 + b.r; b.vx = Math.abs(b.vx); }
      if (b.x > ARENA.x2 - b.r) { b.x = ARENA.x2 - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y < ARENA.y1 + b.r) { b.y = ARENA.y1 + b.r; b.vy = Math.abs(b.vy); }
      if (b.y > ARENA.y2 - b.r) { b.y = ARENA.y2 - b.r; b.vy = -Math.abs(b.vy); }
      // 가끔 랜덤 흔들림
      if (Math.random() < 0.01) {
        const a = Phaser.Math.FloatBetween(-0.5, 0.5);
        const c = Math.cos(a), s = Math.sin(a);
        const nvx = b.vx * c - b.vy * s, nvy = b.vx * s + b.vy * c;
        b.vx = nvx; b.vy = nvy;
      }
      b.core.setPosition(b.x, b.y);
      b.hi.setPosition(b.x - 4, b.y - 4);
      b.glow.setPosition(b.x, b.y);

      if (Phaser.Math.Distance.Between(b.x, b.y, this.player.x, this.player.y) < pr + b.r) {
        this._gameOver();
        return;
      }
    }
  }

  _gameOver() {
    if (this._over) return;
    this._over = true;
    this.spawnTimer?.remove();
    this.cameras.main.shake(220, 0.01);
    const top = saveRecord(Math.round(this.elapsed * 10) / 10);
    const rank = top.indexOf(Math.round(this.elapsed * 10) / 10);
    this._refreshRecords(rank);

    // 오버레이
    const cx = (ARENA.x1 + ARENA.x2) / 2;
    const cy = (ARENA.y1 + ARENA.y2) / 2;
    const ov = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(cx, cy, ARENA.x2 - ARENA.x1, ARENA.y2 - ARENA.y1, 0x03060a, 0.72);
    const t1 = this.add.text(cx, cy - 70, '게임 종료', { fontFamily: FONT.display, fontSize: '34px', color: '#ff7a66' }).setOrigin(0.5);
    const t2 = this.add.text(cx, cy - 18, `버틴 시간  ${this.elapsed.toFixed(1)}초`, { fontFamily: FONT.display, fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
    const t3 = this.add.text(cx, cy + 18, rank === 0 ? '🏆 신기록!' : rank > 0 ? `TOP ${rank + 1} 기록!` : '', { fontFamily: FONT.body, fontSize: '16px', color: '#6fffd6' }).setOrigin(0.5);
    ov.add([dim, t1, t2, t3]);

    const retry = new Button(this, cx - 96, cy + 80, { label: '재도전', icon: '↻', width: 170, height: 52, color: COLORS.green, onClick: () => this.scene.restart() });
    const exit = new Button(this, cx + 96, cy + 80, { label: '나가기', icon: '✕', width: 170, height: 52, color: 0x6fb7ff, textColor: '#04121f', onClick: () => this._exit() });
    ov.add([retry, exit]);

    this.input.keyboard.once('keydown-SPACE', () => this.scene.restart());
  }

  _exit() {
    if (this._left) return;
    this._left = true;
    goTo(this, SCENE.CORRIDOR, 400);
  }
}
