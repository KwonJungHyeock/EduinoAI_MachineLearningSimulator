// "선 맞추기" 인터랙티브 — 점을 찍고 직선(기울기·절편)을 움직여 오차(MSE)를 줄인다.
// 자동 학습(경사하강)으로 직선이 스스로 최적에 다가가는 과정을 본다.
// CH0.5 체험 + CH1 회귀 시뮬의 토대.
import Plot from '../Plot.js';

const SAMPLE = [
  { x: 1, y: 2.1 }, { x: 2, y: 2.6 }, { x: 3, y: 3.7 }, { x: 4, y: 4.0 },
  { x: 5, y: 5.2 }, { x: 6, y: 5.6 }, { x: 7, y: 7.1 }, { x: 8, y: 7.6 },
];

export default function createLineFit(mount, opts = {}) {
  const el = document.createElement('div');
  el.className = 'widget linefit';
  el.innerHTML = `
    ${opts.intro ? `<p class="w-intro">${opts.intro}</p>` : ''}
    <canvas width="600" height="380" class="w-canvas"></canvas>
    <div class="w-controls">
      <div class="w-row">
        <label>기울기 w <b class="v" id="vw">0.00</b></label>
        <input type="range" id="w" min="-2" max="3" step="0.01" value="0" />
      </div>
      <div class="w-row">
        <label>절편 b <b class="v" id="vb">0.00</b></label>
        <input type="range" id="b" min="-2" max="10" step="0.01" value="0" />
      </div>
      <div class="w-row">
        <label>학습률 <b class="v" id="vlr">0.010</b></label>
        <input type="range" id="lr" min="0.001" max="0.05" step="0.001" value="0.01" />
      </div>
      <div class="w-stats">
        <div class="stat"><span>오차 (MSE)</span><b id="mse">–</b></div>
        <div class="stat"><span>스텝</span><b id="step">0</b></div>
      </div>
      <div class="w-btns">
        <button class="btn ghost" id="stepBtn">경사하강 1스텝</button>
        <button class="btn primary" id="autoBtn">자동 학습 ▶</button>
        <button class="btn ghost" id="resetBtn">리셋</button>
      </div>
      <div class="w-hint">캔버스 클릭 = 점 추가 · 드래그 = 이동 · 우클릭 = 삭제</div>
    </div>
  `;
  mount.appendChild(el);

  const canvas = el.querySelector('.w-canvas');
  const plot = new Plot(canvas, { xRange: [0, 10], yRange: [0, 10] });
  let pts = SAMPLE.map((p) => ({ ...p }));
  let w = 0, b = 0, lr = 0.01, step = 0;
  let running = false, raf = 0, drag = null;

  const $ = (id) => el.querySelector('#' + id);
  const wS = $('w'), bS = $('b'), lrS = $('lr');

  function mse() {
    if (!pts.length) return 0;
    let s = 0;
    for (const p of pts) { const e = w * p.x + b - p.y; s += e * e; }
    return s / pts.length;
  }
  function gradStep() {
    if (!pts.length) return;
    let dw = 0, db = 0;
    for (const p of pts) { const e = w * p.x + b - p.y; dw += 2 * e * p.x; db += 2 * e; }
    dw /= pts.length; db /= pts.length;
    w -= lr * dw; b -= lr * db;
    w = Math.max(-2, Math.min(3, w));
    b = Math.max(-2, Math.min(10, b));
    step++;
  }

  function syncInputs() {
    wS.value = w.toFixed(2); bS.value = b.toFixed(2);
    $('vw').textContent = w.toFixed(2);
    $('vb').textContent = b.toFixed(2);
    $('vlr').textContent = lr.toFixed(3);
    $('mse').textContent = mse().toFixed(2);
    $('step').textContent = step;
  }
  function draw() {
    plot.clear();
    plot.grid();
    plot.residuals(pts, w, b);
    plot.axes('x (입력)', 'y (정답)');
    plot.points(pts);
    plot.line(w, b);
    syncInputs();
  }

  // ── 입력 ──
  wS.addEventListener('input', () => { stopAuto(); w = +wS.value; draw(); });
  bS.addEventListener('input', () => { stopAuto(); b = +bS.value; draw(); });
  lrS.addEventListener('input', () => { lr = +lrS.value; $('vlr').textContent = lr.toFixed(3); });

  $('stepBtn').addEventListener('click', () => { stopAuto(); gradStep(); draw(); });
  $('resetBtn').addEventListener('click', () => {
    stopAuto(); pts = SAMPLE.map((p) => ({ ...p })); w = 0; b = 0; step = 0; draw();
  });
  const autoBtn = $('autoBtn');
  autoBtn.addEventListener('click', () => (running ? stopAuto() : startAuto()));

  function startAuto() {
    running = true; autoBtn.textContent = '정지 ■'; autoBtn.classList.add('on');
    const loop = () => {
      if (!running) return;
      for (let i = 0; i < 4; i++) gradStep();
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }
  function stopAuto() {
    running = false; cancelAnimationFrame(raf);
    autoBtn.textContent = '자동 학습 ▶'; autoBtn.classList.remove('on');
  }

  // ── 캔버스 점 편집 ──
  function nearestIdx(px, py, maxPx = 16) {
    let best = -1, bd = maxPx * maxPx;
    pts.forEach((p, i) => {
      const [ppx, ppy] = plot.toPx(p.x, p.y);
      const d = (ppx - px) ** 2 + (ppy - py) ** 2;
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  function onDown(ev) {
    if (ev.button === 2) return;
    const { px, py, data } = plot.evToData(ev);
    const i = nearestIdx(px, py);
    if (i >= 0) { drag = i; }
    else {
      pts.push({ x: clamp(data[0], 0, 10), y: clamp(data[1], 0, 10) });
      draw();
    }
  }
  function onMove(ev) {
    if (drag == null) return;
    const { data } = plot.evToData(ev);
    pts[drag] = { x: clamp(data[0], 0, 10), y: clamp(data[1], 0, 10) };
    draw();
  }
  function onUp() { drag = null; }
  function onCtx(ev) {
    ev.preventDefault();
    const { px, py } = plot.evToData(ev);
    const i = nearestIdx(px, py);
    if (i >= 0) { pts.splice(i, 1); draw(); }
  }
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  canvas.addEventListener('contextmenu', onCtx);

  draw();

  return {
    el,
    destroy() {
      stopAuto();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el.remove();
    },
  };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
