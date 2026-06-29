// K-평균 군집 실험실 — 정답(라벨) 없이 점들을 k개 무리로 묶는다.
// 할당(가장 가까운 중심) ↔ 갱신(무리 평균으로 중심 이동)을 반복하는 과정을 본다.
import Plot from '../Plot.js';

const COLORS = ['#6fb7ff', '#ffb020', '#3ddc91', '#b39bff', '#ff5a3c'];

function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// 3개 덩어리(blob)를 만든다 — 사람 눈엔 무리가 보이지만 모델은 라벨을 모른다
function genBlobs() {
  const centers = [[2.6, 7], [7.4, 7.2], [5, 2.8]];
  const pts = [];
  for (const [cx, cy] of centers) for (let i = 0; i < 14; i++) pts.push({ x: clamp(cx + randn() * 0.8, 0.3, 9.7), y: clamp(cy + randn() * 0.8, 0.3, 9.7) });
  return pts;
}

export default function createKMeansLab(mount, opts = {}) {
  const el = document.createElement('div');
  el.className = 'sim-lab';
  el.innerHTML = `
    ${opts.intro ? `<p class="sim-intro">${opts.intro}</p>` : ''}
    ${opts.steps ? `<ol class="sim-steps">${opts.steps.map((s) => `<li>${s}</li>`).join('')}</ol>` : ''}
    <div class="sim-grid">
      <div class="sim-canvas-wrap"><canvas class="sim-canvas"></canvas></div>
      <aside class="sim-side">
        <div class="sim-stats">
          <div class="stat big"><span>관성(흩어짐)</span><b id="inertia">–</b></div>
          <div class="stat"><span>반복</span><b id="iter">0</b></div>
        </div>
        <div class="sim-knobs">
          <div class="knob"><label>군집 수 k <b id="vk">3</b></label><input type="range" id="k" min="2" max="5" step="1" value="3"></div>
        </div>
        <div class="side-info" id="msg"></div>
        <div class="sim-btns">
          <button class="btn primary" id="auto">▶ 자동 반복</button>
          <button class="btn ghost" id="stepb">+1 단계</button>
          <button class="btn ghost" id="reinit">중심 재배치</button>
          <button class="btn ghost" id="blob">기본 데이터</button>
        </div>
        <div class="side-hint">✚ = 군집 중심 · 캔버스 클릭=점 추가, 우클릭=삭제 · 단계마다 [할당→중심이동] 반복</div>
      </aside>
    </div>`;
  mount.appendChild(el);

  const canvas = el.querySelector('.sim-canvas');
  const ctx = canvas.getContext('2d');
  const plot = new Plot(canvas, { xRange: [0, 10], yRange: [0, 10] });
  const $ = (id) => el.querySelector('#' + id);

  let pts = genBlobs();
  let k = 3;
  let cents = [];
  let assign = [];     // 각 점의 군집 인덱스
  let iter = 0;
  let phase = 'assign'; // 다음에 할 일: 'assign' | 'update'
  let running = false, raf = 0;

  function initCents() {
    cents = [];
    const used = new Set();
    for (let i = 0; i < k; i++) {
      let idx; do { idx = Math.floor(Math.abs(randn() * pts.length)) % Math.max(1, pts.length); } while (used.has(idx) && used.size < pts.length);
      used.add(idx);
      const p = pts[idx] || { x: 5, y: 5 };
      cents.push({ x: p.x + randn() * 0.4, y: p.y + randn() * 0.4 });
    }
    assign = pts.map(() => -1); iter = 0; phase = 'assign';
  }
  function doAssign() {
    let changed = false;
    assign = pts.map((p, i) => {
      let bi = 0, bd = Infinity;
      cents.forEach((c, ci) => { const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2; if (d < bd) { bd = d; bi = ci; } });
      if (assign[i] !== bi) changed = true;
      return bi;
    });
    phase = 'update';
    return changed;
  }
  function doUpdate() {
    for (let c = 0; c < cents.length; c++) {
      const members = pts.filter((_, i) => assign[i] === c);
      if (members.length) { cents[c].x = members.reduce((a, b) => a + b.x, 0) / members.length; cents[c].y = members.reduce((a, b) => a + b.y, 0) / members.length; }
    }
    phase = 'assign'; iter++;
  }
  function inertia() {
    if (!assign.length || assign[0] < 0) return null;
    let s = 0;
    pts.forEach((p, i) => { const c = cents[assign[i]]; if (c) s += (p.x - c.x) ** 2 + (p.y - c.y) ** 2; });
    return s;
  }
  // 한 "단계" = 할당 또는 갱신 한 번. 사용자가 과정을 또렷이 보게 둘로 쪼갬.
  function step() {
    if (phase === 'assign') { const ch = doAssign(); draw(); return ch || iter === 0; }
    doUpdate(); draw(); return true;
  }

  function fit() {
    const wrap = el.querySelector('.sim-canvas-wrap');
    const cw = Math.max(320, wrap.clientWidth | 0), ch = Math.max(280, (wrap.clientHeight | 0) || (cw * 0.7) | 0);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  }
  function draw() {
    fit();
    plot.clear(); plot.grid(); plot.axes('특징 1', '특징 2');
    // 점 → 할당된 군집 색(미할당이면 회색)
    pts.forEach((p, i) => {
      const [X, Y] = plot.toPx(p.x, p.y);
      const col = assign[i] >= 0 ? COLORS[assign[i] % COLORS.length] : '#7d8aa3';
      // 중심으로 잇는 옅은 선
      if (assign[i] >= 0 && cents[assign[i]]) { const [cx, cy] = plot.toPx(cents[assign[i]].x, cents[assign[i]].y); ctx.strokeStyle = col + '55'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(cx, cy); ctx.stroke(); }
      ctx.beginPath(); ctx.fillStyle = col; ctx.arc(X, Y, 6, 0, 7); ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke();
    });
    // 중심(✚)
    cents.forEach((c, i) => {
      const [X, Y] = plot.toPx(c.x, c.y); const col = COLORS[i % COLORS.length];
      ctx.strokeStyle = '#0c1422'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(X - 9, Y); ctx.lineTo(X + 9, Y); ctx.moveTo(X, Y - 9); ctx.lineTo(X, Y + 9); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(X - 9, Y); ctx.lineTo(X + 9, Y); ctx.moveTo(X, Y - 9); ctx.lineTo(X, Y + 9); ctx.stroke();
    });
    const inv = inertia();
    $('inertia').textContent = inv == null ? '–' : inv.toFixed(1);
    $('iter').textContent = iter;
    let m;
    if (assign[0] < 0) m = '▶ <b>[자동 반복]</b> 또는 [+1 단계]로 군집화를 시작하세요.';
    else if (phase === 'update') m = '🎯 <b>할당</b> 완료 — 각 점이 가장 가까운 중심 색으로. 다음 단계: 중심을 무리 평균으로 이동.';
    else m = `📍 <b>중심 이동</b> 완료(반복 ${iter}) — 관성(흩어짐)이 줄어들면 수렴 중. 더 줄지 않으면 끝!`;
    $('msg').innerHTML = m;
  }

  $('k').addEventListener('input', (e) => { k = +e.target.value; $('vk').textContent = k; stop(); initCents(); draw(); });
  $('stepb').addEventListener('click', () => { stop(); step(); });
  $('reinit').addEventListener('click', () => { stop(); initCents(); draw(); });
  $('blob').addEventListener('click', () => { stop(); pts = genBlobs(); initCents(); draw(); });
  const autoBtn = $('auto');
  autoBtn.addEventListener('click', () => (running ? stop() : start()));
  function start() {
    running = true; autoBtn.textContent = '■ 정지'; autoBtn.classList.add('on');
    let still = 0, tick = 0;
    const loop = () => {
      if (!running) return;
      tick++;
      if (tick % 22 === 0) { const ch = step(); if (!ch && phase === 'assign') { if (++still >= 2) { stop(); return; } } else still = 0; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }
  function stop() { running = false; cancelAnimationFrame(raf); autoBtn.textContent = '▶ 자동 반복'; autoBtn.classList.remove('on'); }

  function near(x, y) { let bi = -1, bd = 0.4; pts.forEach((p, i) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; bi = i; } }); return bi; }
  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.button === 2) return;
    stop(); const { data: [x, y] } = plot.evToData(ev);
    if (x < 0 || x > 10 || y < 0 || y > 10) return;
    pts.push({ x, y }); assign.push(-1); draw();
  });
  canvas.addEventListener('contextmenu', (ev) => { ev.preventDefault(); stop(); const { data: [x, y] } = plot.evToData(ev); const i = near(x, y); if (i >= 0) { pts.splice(i, 1); assign.splice(i, 1); draw(); } });

  initCents();
  const ro = new ResizeObserver(() => draw());
  ro.observe(el.querySelector('.sim-canvas-wrap'));
  requestAnimationFrame(draw);

  return { el, destroy() { stop(); ro.disconnect(); el.remove(); } };
}
