// 데이터 편향 실험실 — 두 집단(A 다수·B 소수)이 서로 다른 정답 규칙을 가질 때,
// B를 적게 학습시키면 전체 정확도는 높아도 B 집단에선 불공정해진다.
import Plot from '../Plot.js';

function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sig = (z) => 1 / (1 + Math.exp(-z));
const nx = (v) => (v - 5) / 5;

// 집단 A: x1>5.5 면 합격 / 집단 B: x1>3.5 면 합격(규칙이 다름 — 같은 점수도 다르게 평가될 위험)
function gen(group, n, thr) {
  const arr = [];
  for (let i = 0; i < n; i++) { const x = clamp(2 + Math.random() * 6 + randn() * 0.3, 0.3, 9.7), y = clamp(2 + Math.random() * 6, 0.3, 9.7); arr.push({ x, y, c: x > thr ? 1 : 0, g: group }); }
  return arr;
}

export default function createBiasLab(mount, opts = {}) {
  const el = document.createElement('div');
  el.className = 'sim-lab';
  el.innerHTML = `
    ${opts.intro ? `<p class="sim-intro">${opts.intro}</p>` : ''}
    ${opts.steps ? `<ol class="sim-steps">${opts.steps.map((s) => `<li>${s}</li>`).join('')}</ol>` : ''}
    <div class="sim-grid">
      <div class="sim-canvas-wrap"><canvas class="sim-canvas"></canvas></div>
      <aside class="sim-side">
        <div class="metric-bars">
          <div class="mbar"><span>전체 정확도 <i id="vall">–</i></span><div class="mb"><div id="ball"></div></div></div>
          <div class="mbar"><span>집단 A(다수) <i id="va">–</i></span><div class="mb"><div id="ba" style="background:#6fb7ff"></div></div></div>
          <div class="mbar"><span>집단 B(소수) <i id="vb">–</i></span><div class="mb"><div id="bb" style="background:#ffb020"></div></div></div>
        </div>
        <div class="sim-knobs"><div class="knob"><label>학습 데이터 속 B 비율 <b id="vr">10%</b></label><input type="range" id="r" min="2" max="50" step="2" value="10"></div></div>
        <div class="side-info" id="msg"></div>
        <div class="sim-btns"><button class="btn ghost" id="newd">데이터 새로</button></div>
        <div class="side-hint">● 집단 A(원) · ▲ 집단 B(삼각) · 색=합격(주황)/불합격(파랑) · 흰 선=모델 경계</div>
      </aside>
    </div>`;
  mount.appendChild(el);

  const canvas = el.querySelector('.sim-canvas');
  const ctx = canvas.getContext('2d');
  const plot = new Plot(canvas, { xRange: [0, 10], yRange: [0, 10] });
  const $ = (id) => el.querySelector('#' + id);

  let A = gen('A', 60, 5.5), B = gen('B', 60, 3.5);
  let ratio = 0.1;
  let w = [0, 0], b = 0;

  function train() {
    // 학습셋: A 다수 + B 소수(ratio). 가중치로 B 비중을 표현.
    w = [0, 0]; b = 0;
    const wB = ratio / (1 - ratio + 1e-6);   // B 샘플당 가중치
    for (let it = 0; it < 260; it++) {
      let g0 = 0, g1 = 0, gb = 0, wsum = 0;
      for (const p of A) { const z = w[0] * nx(p.x) + w[1] * nx(p.y) + b, e = sig(z) - p.c; g0 += e * nx(p.x); g1 += e * nx(p.y); gb += e; wsum += 1; }
      for (const p of B) { const z = w[0] * nx(p.x) + w[1] * nx(p.y) + b, e = (sig(z) - p.c) * wB; g0 += e * nx(p.x); g1 += e * nx(p.y); gb += e; wsum += wB; }
      w[0] -= 0.5 * g0 / wsum; w[1] -= 0.5 * g1 / wsum; b -= 0.5 * gb / wsum;
    }
  }
  const pred = (p) => (sig(w[0] * nx(p.x) + w[1] * nx(p.y) + b) >= 0.5 ? 1 : 0);
  const acc = (arr) => { let ok = 0; for (const p of arr) if (pred(p) === p.c) ok++; return arr.length ? ok / arr.length : 0; };

  function fit() { const wrap = el.querySelector('.sim-canvas-wrap'); const cw = Math.max(320, wrap.clientWidth | 0), ch = Math.max(280, (wrap.clientHeight | 0) || (cw * 0.7) | 0); if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; } }
  function draw() {
    fit(); train();
    plot.clear(); plot.grid(); plot.axes('점수 (특징 1)', '특징 2');
    // 경계선 w0*nx(x)+w1*nx(y)+b=0 → y
    if (Math.abs(w[1]) > 1e-6) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); let st = false; for (let xi = 0; xi <= 10; xi += 0.2) { const yy = 5 * (-(w[0] * nx(xi) + b) / w[1]) + 5; const [X, Y] = plot.toPx(xi, yy); if (yy < -1 || yy > 11) { st = false; continue; } st ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); st = true; } ctx.stroke(); }
    // 점: A=원, B=삼각
    for (const p of A) { const [X, Y] = plot.toPx(p.x, p.y); ctx.beginPath(); ctx.fillStyle = p.c ? '#ffb020' : '#6fb7ff'; ctx.arc(X, Y, 5, 0, 7); ctx.fill(); if (pred(p) !== p.c) { ctx.lineWidth = 2; ctx.strokeStyle = '#ff5a3c'; ctx.stroke(); } }
    for (const p of B) { const [X, Y] = plot.toPx(p.x, p.y); ctx.beginPath(); ctx.fillStyle = p.c ? '#ffb020' : '#6fb7ff'; ctx.moveTo(X, Y - 6); ctx.lineTo(X + 6, Y + 5); ctx.lineTo(X - 6, Y + 5); ctx.closePath(); ctx.fill(); if (pred(p) !== p.c) { ctx.lineWidth = 2; ctx.strokeStyle = '#ff5a3c'; ctx.stroke(); } }
    const aA = acc(A), aB = acc(B), aAll = acc([...A, ...B]);
    const set = (id, v) => { $('v' + id).textContent = (v * 100).toFixed(0) + '%'; $('b' + id).style.width = (v * 100).toFixed(0) + '%'; };
    set('all', aAll); set('a', aA); set('b', aB);
    $('vr').textContent = (ratio * 100).toFixed(0) + '%';
    const gap = aA - aB;
    $('msg').innerHTML = gap > 0.15
      ? `⚠️ <b style="color:#ff5a3c">공정성 격차 ${(gap * 100).toFixed(0)}%p.</b> 전체 정확도는 높아 보여도, 적게 학습된 <b>집단 B</b>는 훨씬 자주 틀려요(빨간 테두리). 이게 데이터 편향입니다.`
      : `🟢 B 비율을 높이니 두 집단 정확도가 비슷해졌어요(격차 ${(gap * 100).toFixed(0)}%p). 공정한 데이터가 공정한 모델을 만듭니다.`;
  }

  $('r').addEventListener('input', (e) => { ratio = +e.target.value / 100; draw(); });
  $('newd').addEventListener('click', () => { A = gen('A', 60, 5.5); B = gen('B', 60, 3.5); draw(); });

  const ro = new ResizeObserver(() => draw()); ro.observe(el.querySelector('.sim-canvas-wrap')); requestAnimationFrame(draw);
  return { el, destroy() { ro.disconnect(); el.remove(); } };
}
