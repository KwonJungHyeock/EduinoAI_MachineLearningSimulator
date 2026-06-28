// "선 맞추기" 시뮬레이터 (LAB 레이아웃) — 큰 캔버스 + 사이드 컨트롤 + 실시간 손실곡선.
// 점 추가/이동/삭제, 슬라이더, 경사하강(1스텝/자동), 리셋. CH0.5 체험 + CH1 회귀의 토대.
import Plot from '../Plot.js';

const SAMPLE = [
  { x: 1, y: 2.1 }, { x: 2, y: 2.6 }, { x: 3, y: 3.7 }, { x: 4, y: 4.0 },
  { x: 5, y: 5.2 }, { x: 6, y: 5.6 }, { x: 7, y: 7.1 }, { x: 8, y: 7.6 },
];

export default function createLineFit(mount, opts = {}) {
  const el = document.createElement('div');
  el.className = 'sim-lab';
  el.innerHTML = `
    ${opts.intro ? `<p class="sim-intro">${opts.intro}</p>` : ''}
    ${opts.challenge ? `<div class="sim-goal" id="goal"></div>` : ''}
    <div class="sim-grid">
      <div class="sim-canvas-wrap"><canvas class="sim-canvas"></canvas></div>
      <aside class="sim-side">
        <div class="sim-stats">
          <div class="stat big"><span>오차 (MSE)</span><b id="mse">–</b></div>
          <div class="stat"><span>스텝</span><b id="step">0</b></div>
        </div>
        <div class="sim-loss">
          <div class="side-label">손실(MSE) 변화 ↓</div>
          <canvas class="loss-canvas" width="300" height="96"></canvas>
        </div>
        <div class="sim-knobs">
          <div class="knob"><label>기울기 w <b id="vw">0.00</b></label><input type="range" id="w" min="-2" max="3" step="0.01" value="0"></div>
          <div class="knob"><label>절편 b <b id="vb">0.00</b></label><input type="range" id="b" min="-2" max="10" step="0.01" value="0"></div>
          <div class="knob"><label>학습률 <b id="vlr">0.010</b></label><input type="range" id="lr" min="0.001" max="0.05" step="0.001" value="0.01"></div>
        </div>
        <div class="sim-btns">
          <button class="btn primary" id="autoBtn">▶ 자동 학습</button>
          <button class="btn ghost" id="stepBtn">+1 스텝</button>
          <button class="btn ghost" id="resetBtn">리셋</button>
        </div>
        <div class="side-hint">캔버스: 클릭=점 추가 · 드래그=이동 · 우클릭=삭제</div>
      </aside>
    </div>
  `;
  mount.appendChild(el);

  const canvas = el.querySelector('.sim-canvas');
  const lossCanvas = el.querySelector('.loss-canvas');
  const lctx = lossCanvas.getContext('2d');
  const plot = new Plot(canvas, { xRange: [0, 10], yRange: [0, 10] });

  let pts = SAMPLE.map((p) => ({ ...p }));
  let w = 0, b = 0, lr = 0.01, step = 0;
  let lossHist = [];
  let running = false, raf = 0, drag = null;

  const $ = (id) => el.querySelector('#' + id);
  const wS = $('w'), bS = $('b'), lrS = $('lr');

  const mse = () => {
    if (!pts.length) return 0;
    let s = 0; for (const p of pts) { const e = w * p.x + b - p.y; s += e * e; }
    return s / pts.length;
  };
  function gradStep() {
    if (!pts.length) return;
    let dw = 0, db = 0;
    for (const p of pts) { const e = w * p.x + b - p.y; dw += 2 * e * p.x; db += 2 * e; }
    dw /= pts.length; db /= pts.length;
    w = Math.max(-2, Math.min(3, w - lr * dw));
    b = Math.max(-2, Math.min(10, b - lr * db));
    step++;
    lossHist.push(mse()); if (lossHist.length > 240) lossHist.shift();
  }

  function fitCanvas() {
    const wrap = el.querySelector('.sim-canvas-wrap');
    const cw = Math.max(320, Math.floor(wrap.clientWidth));
    const ch = Math.max(260, Math.floor(wrap.clientHeight || cw * 0.62));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  }
  function drawLoss() {
    const W = lossCanvas.width, H = lossCanvas.height;
    lctx.clearRect(0, 0, W, H);
    lctx.fillStyle = '#0a1220'; lctx.fillRect(0, 0, W, H);
    if (lossHist.length < 2) return;
    const max = Math.max(...lossHist), min = 0;
    lctx.strokeStyle = '#3ddc91'; lctx.lineWidth = 2; lctx.beginPath();
    lossHist.forEach((v, i) => {
      const x = (i / (lossHist.length - 1)) * (W - 6) + 3;
      const y = H - 4 - ((v - min) / (max - min || 1)) * (H - 8);
      i ? lctx.lineTo(x, y) : lctx.moveTo(x, y);
    });
    lctx.stroke();
  }
  function sync() {
    wS.value = w.toFixed(2); bS.value = b.toFixed(2);
    $('vw').textContent = w.toFixed(2); $('vb').textContent = b.toFixed(2);
    $('vlr').textContent = lr.toFixed(3);
    const m = mse();
    $('mse').textContent = m.toFixed(2); $('step').textContent = step;
    if (opts.challenge) {
      const g = $('goal'); const tgt = opts.challenge.targetMse; const ok = m <= tgt;
      g.classList.toggle('done', ok);
      g.innerHTML = ok ? `🎉 도전 달성! 오차 ${m.toFixed(2)} ≤ ${tgt}` : `🎯 도전: 오차(MSE)를 <b>${tgt}</b> 이하로! · 현재 ${m.toFixed(2)}`;
    }
  }
  function draw() {
    fitCanvas();
    plot.clear(); plot.grid(); plot.residuals(pts, w, b); plot.axes('x (입력)', 'y (정답)');
    plot.points(pts); plot.line(w, b);
    drawLoss(); sync();
  }

  wS.addEventListener('input', () => { stopAuto(); w = +wS.value; draw(); });
  bS.addEventListener('input', () => { stopAuto(); b = +bS.value; draw(); });
  lrS.addEventListener('input', () => { lr = +lrS.value; $('vlr').textContent = lr.toFixed(3); });
  $('stepBtn').addEventListener('click', () => { stopAuto(); gradStep(); draw(); });
  $('resetBtn').addEventListener('click', () => { stopAuto(); pts = SAMPLE.map((p) => ({ ...p })); w = 0; b = 0; step = 0; lossHist = []; draw(); });
  const autoBtn = $('autoBtn');
  autoBtn.addEventListener('click', () => (running ? stopAuto() : startAuto()));

  function startAuto() {
    running = true; autoBtn.textContent = '■ 정지'; autoBtn.classList.add('on');
    const loop = () => { if (!running) return; for (let i = 0; i < 4; i++) gradStep(); draw(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
  }
  function stopAuto() { running = false; cancelAnimationFrame(raf); autoBtn.textContent = '▶ 자동 학습'; autoBtn.classList.remove('on'); }

  function nearestIdx(px, py, maxPx = 18) {
    let best = -1, bd = maxPx * maxPx;
    pts.forEach((p, i) => { const [a, c] = plot.toPx(p.x, p.y); const d = (a - px) ** 2 + (c - py) ** 2; if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function onDown(ev) {
    if (ev.button === 2) return;
    const { px, py, data } = plot.evToData(ev);
    const i = nearestIdx(px, py);
    if (i >= 0) drag = i;
    else { pts.push({ x: clamp(data[0], 0, 10), y: clamp(data[1], 0, 10) }); draw(); }
  }
  function onMove(ev) { if (drag == null) return; const { data } = plot.evToData(ev); pts[drag] = { x: clamp(data[0], 0, 10), y: clamp(data[1], 0, 10) }; draw(); }
  function onUp() { drag = null; }
  function onCtx(ev) { ev.preventDefault(); const { px, py } = plot.evToData(ev); const i = nearestIdx(px, py); if (i >= 0) { pts.splice(i, 1); draw(); } }
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  canvas.addEventListener('contextmenu', onCtx);

  const ro = new ResizeObserver(() => draw());
  ro.observe(el.querySelector('.sim-canvas-wrap'));
  requestAnimationFrame(draw);

  return {
    el,
    destroy() {
      stopAuto();
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el.remove();
    },
  };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
