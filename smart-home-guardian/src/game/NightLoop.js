// 밤 진행 디렉터 — 위협 스폰·감지·대응 검증·난이도·점수·내구도.
// 엔진은 위협 '배열'만 다룬다(위협 자체는 데이터 객체 src/game/threats/*).
import { THREATS, byId } from './threats/index.js';

const FOCUS = {
  fire: [-1.3, 2.4],
  intruder: [0, 3.5],
  blackout: [0, 0],
  heat: [0, 0],
};

export default class NightLoop {
  constructor({ bus, house, score, hud, app }) {
    this.bus = bus;
    this.house = house;
    this.score = score;
    this.hud = hud;
    this.app = app;

    this.durability = 100;
    this.phase = 'idle'; // idle | night | day | over
    this.active = [];
    this.queue = [];
    this._acc = 0;
    this._nextSpawn = 0;
    this._dayTimer = 0;

    // 플레이어 명령 → 활성 위협 대응 기록
    this._offAct = bus.onAct((token) => this._onCommand(token));
  }

  start() {
    this.durability = 100;
    this.score.points = 0;
    this.score.day = 1;
    this.active = [];
    this.queue = [];
    this.hud.setDurability(100);
    this.hud.setScore(0);
    this._startNight();
  }

  reset() {
    this.active.forEach((a) => byId[a.id]?.disarm?.(this.bus));
    this.active = [];
    this.queue = [];
    this.phase = 'idle';
    this.hud.setAlert(null);
  }

  dispose() {
    this._offAct?.();
  }

  _buildQueue(day) {
    if (day === 1) return ['heat']; // 튜토리얼: 조작 학습
    const count = Math.min(1 + day, 6);
    const out = [];
    for (let i = 0; i < count; i++) {
      out.push(THREATS[Math.floor(Math.random() * THREATS.length)].id);
    }
    return out;
  }

  _startNight() {
    this.phase = 'night';
    this.queue = this._buildQueue(this.score.day);
    this._totalThreats = this.queue.length;
    this._resolved = 0;
    this._nextSpawn = 1.0;
    this._gap = Math.max(1.4, 3.2 - this.score.day * 0.22);
    this._tScale = Math.max(0.55, 1 - this.score.day * 0.05);
    this.house.setDaylight(0.08); // 밤
    this.hud.setDay(this.score.day);
    this.hud.banner(`DAY ${this.score.day} · 밤이 찾아온다`);
    this.hud.setAlert(null);
  }

  _spawn(id) {
    const def = byId[id];
    if (!def) return;
    def.arm?.(this.bus);
    this.house.setThreat(def.vfx, true);
    const f = FOCUS[def.vfx];
    if (f) this.app.focusOn(f[0], f[1]);
    const a = { id, def, timeLeft: (def.timeLimit / 1000) * this._tScale, solved: new Set() };
    this.active.push(a);
    this._updateAlert();
  }

  _onCommand(token) {
    for (const a of this.active) {
      if (a.def.solve.includes(token)) a.solved.add(token);
    }
  }

  _isSolved(a) {
    return a.def.solve.every((t) => a.solved.has(t));
  }

  _resolveSuccess(a) {
    this.score.add(100 + this.score.day * 20);
    this.hud.setScore(this.score.points);
    this.hud.toast(`${a.def.icon} ${a.def.name} 방어 성공! +${100 + this.score.day * 20}`, '#3ddc91');
    a.def.disarm?.(this.bus);
    this.house.setThreat(a.def.vfx, false);
  }

  _resolveFail(a) {
    this.durability = Math.max(0, this.durability - a.def.damageOnFail);
    this.hud.setDurability(this.durability);
    this.hud.toast(`${a.def.icon} ${a.def.name} 방어 실패! -${a.def.damageOnFail}`, '#ff5a3c');
    this.app.shake?.();
    a.def.disarm?.(this.bus);
    this.house.setThreat(a.def.vfx, false);
  }

  update(dt) {
    // 센서 → 집 분위기(습도 안개 등) 항상 반영
    this.house.setHumidity(this.bus.state.humi);

    if (this.phase === 'night') {
      // 스폰
      if (this.queue.length) {
        this._nextSpawn -= dt;
        if (this._nextSpawn <= 0) {
          this._spawn(this.queue.shift());
          this._nextSpawn = this._gap;
        }
      }
      // 활성 위협 진행
      for (let i = this.active.length - 1; i >= 0; i--) {
        const a = this.active[i];
        if (this._isSolved(a)) {
          this._resolveSuccess(a);
          this.active.splice(i, 1);
          this._resolved++;
        } else {
          a.timeLeft -= dt;
          if (a.timeLeft <= 0) {
            this._resolveFail(a);
            this.active.splice(i, 1);
            this._resolved++;
          }
        }
      }
      this._updateAlert();
      // 밤 진행 게이지
      this.hud.setNightProgress(this._totalThreats ? this._resolved / this._totalThreats : 0);

      if (this.durability <= 0) return this._gameOver();
      if (!this.queue.length && !this.active.length) this._endNight();
    } else if (this.phase === 'day') {
      this._dayTimer -= dt;
      if (this._dayTimer <= 0) {
        this.score.day++;
        this._startNight();
      }
    }
  }

  _updateAlert() {
    if (!this.active.length) {
      this.hud.setAlert(null);
      return;
    }
    // 가장 급한(시간 적은) 위협 표시 + 동시 개수
    const sorted = [...this.active].sort((x, y) => x.timeLeft - y.timeLeft);
    const top = sorted[0];
    this.hud.setAlert({
      text: `${top.def.icon} ${top.def.cue}`,
      time: Math.max(0, top.timeLeft),
      total: (top.def.timeLimit / 1000) * this._tScale,
      count: this.active.length,
    });
  }

  _endNight() {
    this.phase = 'day';
    this._dayTimer = 3.0;
    this.house.setDaylight(1); // 낮(정산)
    this.hud.setAlert(null);
    this.hud.banner(`DAY ${this.score.day} 생존! · 점수 ${this.score.points}`);
  }

  _gameOver() {
    if (this.phase === 'over') return;
    this.phase = 'over';
    this.active.forEach((a) => a.def.disarm?.(this.bus));
    this.active = [];
    const isBest = this.score.saveIfBest();
    this.hud.onGameOver({ points: this.score.points, day: this.score.day, best: this.score.best, isBest });
  }
}
