// 셸의 src/app/board.js (싱글턴 하드웨어 컨트롤러)를 흉내내는 개발용 mock(지침서 §5).
// 실제 보드는 없으므로 모든 동작을 시뮬레이션하고 시리얼 모니터 로그로 흘린다.
// connected 플래그는 하니스 UI에서 토글해 "오프라인에서도 끝까지 클리어" 요건(§9)을 검증한다.
export function createMockBoard({ onLog } = {}) {
  const lineSubs = new Set();
  const stateSubs = new Set();
  let connected = false;

  function emitState() {
    for (const fn of stateSubs) fn({ connected });
  }

  const board = {
    get connected() {
      return connected;
    },

    async digital(pin, on) {
      onLog?.('tx', `digitalWrite(${pin}, ${on ? 'HIGH' : 'LOW'})`);
      if (!connected) return false;
      await wait(20);
      return true;
    },

    async pwm(pin, v) {
      onLog?.('tx', `analogWrite(${pin}, ${v})`);
      if (!connected) return false;
      await wait(20);
      return true;
    },

    async readDht({ timeout = 1200 } = {}) {
      onLog?.('tx', `readDht(timeout=${timeout})`);
      if (!connected) return null;
      await wait(60);
      // 시뮬레이션 값(쾌적 범위 근처)
      return { temp: 24 + Math.round(Math.random() * 3), hum: 45 + Math.round(Math.random() * 10) };
    },

    async blink(pin, times = 3, period = 200) {
      onLog?.('tx', `blink(${pin}, x${times}, ${period}ms)`);
      for (let i = 0; i < times && connected; i++) {
        await this.digital(pin, true);
        await wait(period / 2);
        await this.digital(pin, false);
        await wait(period / 2);
      }
      await this.digital(pin, false); // 항상 OFF로 끝
    },

    async flash() {
      onLog?.('sys', 'flash() — 하니스에서는 미지원(no-op)');
      return false;
    },

    onLine(fn) {
      lineSubs.add(fn);
      return () => lineSubs.delete(fn);
    },

    onState(fn) {
      stateSubs.add(fn);
      fn({ connected }); // 구독 즉시 현재 상태 1회 통지
      return () => stateSubs.delete(fn);
    },

    log(kind, text) {
      onLog?.(kind, text);
    },

    // --- 하니스 전용(셸 board에는 없음) ---
    __setConnected(v) {
      connected = !!v;
      onLog?.('sys', `board ${connected ? 'CONNECTED' : 'disconnected'}`);
      emitState();
    },
    __pushLine(line) {
      for (const fn of lineSubs) fn(line);
    },
  };

  return board;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
