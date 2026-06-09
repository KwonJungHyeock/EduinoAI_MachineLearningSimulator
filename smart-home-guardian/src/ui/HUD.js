// HUD — DOM 오버레이(일수·시간·내구도·점수·경보·연결·센서·액추에이터·게임오버).
const DISP = 'Orbitron, Pretendard, sans-serif';
const BODY = 'Pretendard, "Space Grotesk", sans-serif';

const ACTUATORS = [
  { token: 'FAN:1', off: 'FAN:0', label: '환기팬', key: '1', icon: '🌀' },
  { token: 'BUZZER:1', off: 'BUZZER:0', label: '경보', key: '2', icon: '🔊' },
  { token: 'LED:1', off: 'LED:0', label: '조명', key: '3', icon: '💡' },
  { token: 'SERVO:90', off: 'SERVO:0', label: '문잠금', key: '4', icon: '🔒' },
];

export default class HUD {
  constructor(root, bus, { onStart, onRestart } = {}) {
    this.root = root;
    this.bus = bus;
    this.onStart = onStart;
    this.onRestart = onRestart;
    this._actState = {};
    this._build();
  }

  _build() {
    this.root.innerHTML = `
      <div class="hud-top">
        <div class="hud-stat"><span class="lbl">DAY</span><span id="hud-day" class="val">1</span></div>
        <div class="hud-mid">
          <div class="hud-alert" id="hud-alert"></div>
          <div class="hud-alertbar"><div id="hud-alertfill"></div></div>
          <div class="hud-night"><span>밤</span><div class="bar"><div id="hud-nightfill"></div></div></div>
        </div>
        <div class="hud-stat right"><span class="lbl">SCORE</span><span id="hud-score" class="val">0</span></div>
      </div>

      <div class="hud-left">
        <div class="hud-dura">
          <span class="lbl">집 내구도</span>
          <div class="bar"><div id="hud-durafill"></div></div>
        </div>
        <div class="hud-sensors" id="hud-sensors"></div>
      </div>

      <div class="hud-conn" id="hud-conn"><span class="dot"></span><span id="hud-conntext">키보드 시뮬</span>
        <button id="hud-connect">기기 연결</button>
      </div>

      <div class="hud-actbar" id="hud-actbar"></div>

      <div class="hud-banner" id="hud-banner"></div>
      <div class="hud-toasts" id="hud-toasts"></div>

      <div class="hud-overlay" id="hud-start">
        <div class="card">
          <h1>SMART HOME GUARDIAN</h1>
          <p>매일 밤 집에 위협이 닥칩니다. <b>센서로 감지</b>하고 <b>장치로 대응</b>해 막아내세요.</p>
          <div class="how">
            <div>🌀 환기팬 · 🔊 경보 · 💡 조명 · 🔒 문잠금 으로 대응</div>
            <div>시뮬 조작: <b>W/S</b> 온도 · <b>A/D</b> 습도 · <b>F</b> 불꽃 · <b>P</b> 침입 · <b>L</b> 조도</div>
            <div>대응 단축키: <b>1</b> 팬 · <b>2</b> 경보 · <b>3</b> 조명 · <b>4</b> 문잠금</div>
          </div>
          <button class="primary" id="hud-startbtn">게임 시작 ▸</button>
          <div class="hint">하드웨어가 있으면 우상단 [기기 연결]로 ESP32 연결</div>
        </div>
      </div>

      <div class="hud-overlay" id="hud-gameover" style="display:none">
        <div class="card">
          <h1 class="danger">집이 무너졌다</h1>
          <p id="go-summary"></p>
          <p id="go-best" class="best"></p>
          <button class="primary" id="hud-restartbtn">다시 도전 ↻</button>
        </div>
      </div>
    `;

    // 액추에이터 버튼
    const actbar = this.root.querySelector('#hud-actbar');
    this._actBtns = {};
    for (const a of ACTUATORS) {
      const b = document.createElement('button');
      b.className = 'act';
      b.innerHTML = `<span class="ic">${a.icon}</span><span class="t">${a.label}</span><span class="k">${a.key}</span>`;
      b.addEventListener('click', () => this.toggleAct(a));
      actbar.appendChild(b);
      this._actBtns[a.token] = b;
    }

    this.el = {
      day: this.root.querySelector('#hud-day'),
      score: this.root.querySelector('#hud-score'),
      dura: this.root.querySelector('#hud-durafill'),
      night: this.root.querySelector('#hud-nightfill'),
      alert: this.root.querySelector('#hud-alert'),
      alertfill: this.root.querySelector('#hud-alertfill'),
      sensors: this.root.querySelector('#hud-sensors'),
      conn: this.root.querySelector('#hud-conn'),
      conntext: this.root.querySelector('#hud-conntext'),
      banner: this.root.querySelector('#hud-banner'),
      toasts: this.root.querySelector('#hud-toasts'),
      start: this.root.querySelector('#hud-start'),
      gameover: this.root.querySelector('#hud-gameover'),
    };
    this.setDurability(100);

    this.root.querySelector('#hud-startbtn').addEventListener('click', () => {
      this.el.start.style.display = 'none';
      this.onStart?.();
    });
    this.root.querySelector('#hud-restartbtn').addEventListener('click', () => {
      this.el.gameover.style.display = 'none';
      this.onRestart?.();
    });
    this.connectBtn = this.root.querySelector('#hud-connect');
  }

  toggleAct(a) {
    const on = !this._actState[a.token];
    this._actState[a.token] = on;
    this.bus.act(on ? a.token : a.off);
    this._actBtns[a.token]?.classList.toggle('on', on);
  }

  resetActs() {
    this._actState = {};
    Object.values(this._actBtns).forEach((b) => b.classList.remove('on'));
  }

  setDay(n) { this.el.day.textContent = n; }
  setScore(n) { this.el.score.textContent = n; }
  setDurability(v) {
    this.el.dura.style.width = `${Math.max(0, v)}%`;
    this.el.dura.style.background = v > 50 ? 'linear-gradient(90deg,#3ddc91,#6fffd6)' : v > 25 ? '#ffd11a' : '#ff5a3c';
  }
  setNightProgress(r) { this.el.night.style.width = `${Math.round(r * 100)}%`; }
  setConnection(connected) {
    this.el.conn.classList.toggle('live', connected);
    this.el.conntext.textContent = connected ? 'ESP32 연결됨' : '키보드 시뮬';
  }

  setAlert(a) {
    if (!a) {
      this.el.alert.textContent = '';
      this.el.alert.classList.remove('on');
      this.el.alertfill.style.width = '0%';
      return;
    }
    this.el.alert.classList.add('on');
    this.el.alert.textContent = a.count > 1 ? `${a.text}   (+${a.count - 1} 위협)` : a.text;
    this.el.alertfill.style.width = `${Math.max(0, (a.time / a.total) * 100)}%`;
  }

  updateSensors(s) {
    this.el.sensors.innerHTML =
      `🌡️ ${Math.round(s.temp)}°  💧 ${Math.round(s.humi)}%  🔥 ${s.flame ? 'ON' : '–'}  🚶 ${s.pir ? 'ON' : '–'}  🔆 ${Math.round(s.light)}`;
  }

  banner(text) {
    this.el.banner.textContent = text;
    this.el.banner.classList.remove('show');
    void this.el.banner.offsetWidth;
    this.el.banner.classList.add('show');
  }

  toast(text, color = '#6fffd6') {
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = text;
    d.style.borderColor = color;
    d.style.color = color;
    this.el.toasts.appendChild(d);
    setTimeout(() => d.classList.add('out'), 1600);
    setTimeout(() => d.remove(), 2100);
  }

  onGameOver({ points, day, best, isBest }) {
    this.root.querySelector('#go-summary').innerHTML = `생존 <b>${day}</b>일 · 점수 <b>${points}</b>`;
    this.root.querySelector('#go-best').textContent = isBest ? '🏆 신기록!' : `최고기록: ${best.points}점 (${best.day}일)`;
    this.el.gameover.style.display = 'grid';
  }
}

export { DISP, BODY };
