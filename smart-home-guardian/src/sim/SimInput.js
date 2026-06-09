// 키보드 시뮬 — 하드웨어 없이 센서값을 흉내. (연결 시 자동 무시: bus.setSim 가드)
//  온도 W/S · 습도 A/D · 불꽃 F(토글) · 침입 P(토글) · 조도 L(토글)
//  대응 단축키 1/2/3/4 는 HUD 액추에이터와 연동.
const ACT_KEYS = { 1: 'FAN:1', 2: 'BUZZER:1', 3: 'LED:1', 4: 'SERVO:90' };

export default class SimInput {
  constructor(bus, hud) {
    this.bus = bus;
    this.hud = hud;
    this._onKey = (e) => this._handle(e);
    window.addEventListener('keydown', this._onKey);
  }

  _handle(e) {
    const s = this.bus.state;
    switch (e.key.toLowerCase()) {
      case 'w': this.bus.nudgeSim('temp', +2, -10, 60); break;
      case 's': this.bus.nudgeSim('temp', -2, -10, 60); break;
      case 'd': this.bus.nudgeSim('humi', +5, 0, 100); break;
      case 'a': this.bus.nudgeSim('humi', -5, 0, 100); break;
      case 'f': this.bus.setSim('flame', s.flame ? 0 : 1); break;
      case 'p': this.bus.setSim('pir', s.pir ? 0 : 1); break;
      case 'l': this.bus.setSim('light', s.light < 60 ? 400 : 20); break;
      default:
        if (ACT_KEYS[e.key]) {
          const a = { FAN: '환기팬', BUZZER: '경보', LED: '조명', SERVO: '문잠금' };
          // HUD 토글과 동일 동작
          const map = { 1: 'FAN:1', 2: 'BUZZER:1', 3: 'LED:1', 4: 'SERVO:90' };
          const off = { 1: 'FAN:0', 2: 'BUZZER:0', 3: 'LED:0', 4: 'SERVO:0' };
          this.hud.toggleAct({ token: map[e.key], off: off[e.key] });
        }
    }
  }

  dispose() {
    window.removeEventListener('keydown', this._onKey);
  }
}
