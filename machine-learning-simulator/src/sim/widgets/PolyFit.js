// 다항회귀 과적합/정규화 시뮬 — 차수를 올리면 과적합(훈련↓ 테스트↑),
// 정규화(λ)로 곡선을 부드럽게. 훈련 vs 테스트 오차를 동시에 본다.
import Plot from '../Plot.js';

function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const f = (x) => 4.8 + 1.9 * Math.sin(x * 0.62) - 0.12 * (x - 5);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function genData() {
  const train = [], test = [];
  for (let i = 0; i < 14; i++) { const x = 0.6 + (i / 13) * 8.8 + (Math.random() - 0.5) * 0.3; train.push({ x, y: clamp(f(x) + randn() * 0.55, 0.3, 9.7) }); }
  for (let i = 0; i < 9; i++) { const x = 0.8 + Math.random() * 8.4; test.push({ x, y: clamp(f(x) + randn() * 0.55, 0.3, 9.7) }); }
  return { train, test };
}

// 정규방정식 (XᵀX + λI) c = Xᵀy 풀이 (가우스 소거)
function solve(M, y) {
  const n = y.length; const A = M.map((r, i) => r.concat(y[i]));
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    const piv = A[c][c] || 1e-9;
    for (let r = 0; r < n; r++) { if (r === c) continue; const k = A[r][c] / piv; for (let j = c; j <= n; j++) A[r][j] -= k * A[c][j]; }
  }
  return A.map((r, i) => r[n] / (r[i] || 1e-9));
}
function fitPoly(points, d, lam) {
  const cols = d + 1;
  const M = Array.from({ length: cols }, () => new Array(cols).fill(0));
  const rhs = new Array(cols).fill(0);
  for (const p of points) {
    const t = (p.x - 5) / 5; const row = []; let tp = 1;
    for (let k = 0; k < cols; k++) { row.push(tp); tp *= t; }
    for (let i = 0; i < cols; i++) { rhs[i] += row[i] * p.y; for (let j = 0; j < cols; j++) M[i][j] += row[i] * row[j]; }
  }
  for (let i = 1; i < cols; i++) M[i][i] += lam; // 절편(i=0)은 정규화 제외
  return solve(M, rhs);
}
const predict = (x, c) => { const t = (x - 5) / 5; let s = 0, tp = 1; for (let k = 0; k < c.length; k++) { s += c[k] * tp; tp *= t; } return s; };
const mse = (pts, c) => { if (!pts.length) return 0; let s = 0; for (const p of pts) { const e = predict(p.x, c) - p.y; s += e * e; } return s / pts.length; };

export default function createPolyFit(mount, opts = {}) {
  const el = document.createElement('div');
  el.className = 'sim-lab';
  el.innerHTML = `
    ${opts.intro ? `<p class="sim-intro">${opts.intro}</p>` : ''}
    <div class="sim-grid">
      <div class="sim-canvas-wrap"><canvas class="sim-canvas"></canvas></div>
      <aside class="sim-side">
        <div class="sim-stats">
          <div class="stat"><span>훈련 오차</span><b id="tr">–</b></div>
          <div class="stat"><span>테스트 오차</span><b id="te">–</b></div>
        </div>
        <div class="sim-knobs">
          <div class="knob"><label>다항 차수 <b id="vd">3</b></label><input type="range" id="d" min="1" max="9" step="1" value="3"></div>
          <div class="knob"><label>정규화 λ <b id="vl">0.00</b></label><input type="range" id="lam" min="0" max="1" step="0.02" value="0"></div>
        </div>
        <div class="side-info" id="msg"></div>
        <div class="sim-btns">
          <button class="btn primary" id="newd">데이터 새로</button>
          <button class="btn ghost" id="reset">리셋</button>
        </div>
        <div class="side-hint">● 훈련점(파랑) · ○ 테스트점(주황) · 차수↑ → 과적합(훈련↓ 테스트↑), λ↑ → 곡선이 부드러워짐</div>
      </aside>
    </div>`;
  mount.appendChild(el);

  const canvas = el.querySelector('.sim-canvas');
  const ctx = canvas.getContext('2d');
  const plot = new Plot(canvas, { xRange: [0, 10], yRange: [0, 10] });
  const $ = (id) => el.querySelector('#' + id);

  let { train, test } = genData();
  let d = 3, lam = 0;

  function fitCanvas() {
    const wrap = el.querySelector('.sim-canvas-wrap');
    const cw = Math.max(320, wrap.clientWidth | 0);
    const ch = Math.max(260, (wrap.clientHeight | 0) || (cw * 0.62) | 0);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  }
  function draw() {
    fitCanvas();
    const c = fitPoly(train, d, lam);
    plot.clear(); plot.grid(); plot.axes('x', 'y');
    // 참 함수(옅게)
    ctx.strokeStyle = 'rgba(150,170,200,.35)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.beginPath();
    for (let x = 0; x <= 10; x += 0.2) { const [X, Y] = plot.toPx(x, clamp(f(x), -2, 12)); x === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
    ctx.stroke(); ctx.setLineDash([]);
    // 적합 곡선
    ctx.strokeStyle = '#3ddc91'; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let x = 0; x <= 10; x += 0.08) { const [X, Y] = plot.toPx(x, clamp(predict(x, c), -3, 13)); x === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
    ctx.stroke();
    // 점
    plot.points(train, '#6fb7ff', 6);
    test.forEach((p) => { const [X, Y] = plot.toPx(p.x, p.y); ctx.beginPath(); ctx.strokeStyle = '#ffb020'; ctx.lineWidth = 2.5; ctx.arc(X, Y, 6, 0, 7); ctx.stroke(); });
    // 사이드
    const trE = mse(train, c), teE = mse(test, c);
    $('tr').textContent = trE.toFixed(2);
    const teEl = $('te'); teEl.textContent = teE.toFixed(2);
    teEl.style.color = teE > trE * 2.2 ? '#ff5a3c' : '#fff';
    $('vd').textContent = d; $('vl').textContent = lam.toFixed(2);
    $('msg').innerHTML = teE > trE * 2.2
      ? '⚠️ <b style="color:#ff5a3c">과적합</b> — 훈련엔 잘 맞지만 테스트(새 데이터)엔 약해요. 차수↓ 또는 λ↑'
      : lam > 0.3 ? '🟢 정규화로 곡선이 부드러워졌어요(과소적합 주의)' : '🟢 적당한 적합';
  }

  $('d').addEventListener('input', (e) => { d = +e.target.value; draw(); });
  $('lam').addEventListener('input', (e) => { lam = +e.target.value; draw(); });
  $('newd').addEventListener('click', () => { ({ train, test } = genData()); draw(); });
  $('reset').addEventListener('click', () => { d = 3; lam = 0; $('d').value = 3; $('lam').value = 0; draw(); });

  const ro = new ResizeObserver(() => draw());
  ro.observe(el.querySelector('.sim-canvas-wrap'));
  requestAnimationFrame(draw);

  return { el, destroy() { ro.disconnect(); el.remove(); } };
}
