// 캔버스 내 접속코드 입력기(Phaser) — 배경에 박힌 코드칸 위치에 얹어 작동시킨다.
// DOM 정렬 문제를 피하려고 게임 좌표계(1280×720)에서 직접 처리.
import Phaser from 'phaser';
import { COLORS, FONT } from '../../shared/theme.js';

export default class CodeInput extends Phaser.GameObjects.Container {
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y);
    scene.add.existing(this);
    const { length = 6, cell = 46, gap = 12, onSubmit, onChange } = opts;
    this.len = length;
    this.cellSize = cell;
    this.value = '';
    this._onSubmit = onSubmit;
    this._onChange = onChange;

    const totalW = length * cell + (length - 1) * gap;
    const startX = -totalW / 2 + cell / 2;
    this.cells = [];
    for (let i = 0; i < length; i++) {
      const cxp = startX + i * (cell + gap);
      const g = scene.add.graphics({ x: cxp, y: 0 });
      const t = scene.add
        .text(cxp, 0, '', { fontFamily: FONT.display, fontSize: Math.round(cell * 0.58) + 'px', color: '#eaffff' })
        .setOrigin(0.5);
      this.add(g);
      this.add(t);
      this.cells.push({ g, t });
    }
    this._refresh();

    this._key = (e) => this._onKey(e);
    scene.input.keyboard.on('keydown', this._key);
    this.on('destroy', () => scene.input.keyboard.off('keydown', this._key));
  }

  _drawCell(g, state) {
    const s = this.cellSize;
    g.clear();
    g.fillStyle(0x04080e, 0.55);
    g.fillRoundedRect(-s / 2, -s / 2, s, s, 10);
    const border = state === 'active' ? COLORS.eddieGlow : state === 'filled' ? COLORS.green : 0x2a3a52;
    g.lineStyle(state === 'active' ? 2.5 : 1.5, border, state === 'idle' ? 0.7 : 1);
    g.strokeRoundedRect(-s / 2, -s / 2, s, s, 10);
  }

  _refresh() {
    const active = Math.min(this.value.length, this.len - 1);
    for (let i = 0; i < this.len; i++) {
      const ch = this.value[i] || '';
      this.cells[i].t.setText(ch);
      const state = ch ? 'filled' : i === this.value.length ? 'active' : 'idle';
      this._drawCell(this.cells[i].g, state);
    }
    this._onChange?.(this.value);
  }

  _onKey(e) {
    if (e.key === 'Backspace') {
      this.value = this.value.slice(0, -1);
      this._refresh();
    } else if (e.key === 'Enter') {
      this._onSubmit?.(this.value);
    } else if (e.key.length === 1 && /[a-z0-9]/i.test(e.key)) {
      if (this.value.length < this.len) {
        this.value += e.key.toUpperCase();
        this._refresh();
      }
    }
  }

  error() {
    this.cells.forEach(({ g }) => this._drawCellColor(g, COLORS.red));
    this.scene.tweens.add({ targets: this, x: this.x - 6, duration: 50, yoyo: true, repeat: 3 });
    this.scene.time.delayedCall(420, () => this._refresh());
  }

  _drawCellColor(g, color) {
    const s = this.cellSize;
    g.clear();
    g.fillStyle(0x04080e, 0.55);
    g.fillRoundedRect(-s / 2, -s / 2, s, s, 10);
    g.lineStyle(2, color, 1);
    g.strokeRoundedRect(-s / 2, -s / 2, s, s, 10);
  }

  clear() {
    this.value = '';
    this._refresh();
  }
}
