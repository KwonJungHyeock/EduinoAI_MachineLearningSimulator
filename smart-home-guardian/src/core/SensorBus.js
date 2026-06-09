// 센서 상태 버스 — sim/serial을 추상화. 게임은 bus.state 만 읽는다.
//  - 기본은 시뮬(키보드) 값. SerialManager 연결 시 실제 센서로 자연스럽게 대체.
//  - 액추에이터 명령(send)도 여기로 통일 → 연결 시 실물, 아니면 화면 연출만.
export default class SensorBus {
  constructor(serial) {
    this.serial = serial;
    // 게임이 읽는 단일 상태
    this.state = { temp: 24, humi: 50, flame: 0, pir: 0, light: 400 };
    this.source = 'sim'; // 'sim' | 'serial'
    this._actCbs = new Set();

    if (serial) {
      serial.onSensor((s) => {
        this.source = 'serial';
        Object.assign(this.state, s);
      });
      serial.onState((connected) => {
        this.source = connected ? 'serial' : 'sim';
      });
    }
  }

  get connected() {
    return this.source === 'serial' && this.serial?.connected;
  }

  // 시뮬 입력에서 센서값 설정(연결 안 됐을 때만 반영)
  setSim(key, value) {
    if (this.connected) return;
    this.state[key] = value;
  }
  nudgeSim(key, delta, min, max) {
    if (this.connected) return;
    this.state[key] = Math.max(min, Math.min(max, (this.state[key] || 0) + delta));
  }

  // 액추에이터 명령: 실물(연결 시) + 화면 연출 콜백(항상)
  act(token) {
    if (this.connected) this.serial.send(token);
    for (const fn of this._actCbs) fn(token);
  }
  onAct(fn) {
    this._actCbs.add(fn);
    return () => this._actCbs.delete(fn);
  }
}
