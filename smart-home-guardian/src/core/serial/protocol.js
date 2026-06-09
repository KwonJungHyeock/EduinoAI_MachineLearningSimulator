// 게임 ↔ ESP32 통신 계약(공통 모듈, 1회 작성).
//  ESP32 → 게임 : "S:temp=24,humi=55,flame=0,pir=0,light=300\n"
//  게임 → ESP32 : "C:FAN:1" / "C:BUZZER:1" / "C:LED:1" / "C:SERVO:90" / "C:LCD:ALERT\n"

// 센서 라인 파싱 → 숫자 객체(부분 갱신용으로 받은 키만 반환)
export function parseSensorLine(line) {
  const t = (line || '').trim();
  if (!t.startsWith('S:')) return null;
  const out = {};
  for (const pair of t.slice(2).split(',')) {
    const [k, v] = pair.split('=');
    if (!k) continue;
    const n = Number(v);
    out[k.trim()] = Number.isFinite(n) ? n : v;
  }
  return out;
}

// 액추에이터 명령 빌드. token 예: 'FAN:1', 'SERVO:90', 'LCD:ALERT'
export function buildCommand(token) {
  return `C:${token}\n`;
}

// 줄 단위 스트림 누적기 — 들어온 청크에서 완성된 라인만 콜백.
export function createLineSplitter(onLine) {
  let buf = '';
  return (chunk) => {
    buf += chunk;
    let idx;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).replace(/\r$/, '');
      buf = buf.slice(idx + 1);
      if (line) onLine(line);
    }
  };
}
