// 옵티마이저 비교 실험실 — 같은 비용 지형에서 SGD·Momentum·Adam이 최솟값까지
// 달려가는 경로를 나란히 본다. 길쭉한 골짜기에선 SGD는 지그재그, 관성/Adam은 빠르다.
const PAD = { l: 44, r: 16, t: 16, b: 32 };
const R = 5;                       // 좌표 범위 [-5,5]
const CX = 1.0, CY = 0.11;          // 길쭉한 골짜기(한 축만 가파름)
const f = (x, y) => 0.5 * (CX * x * x + CY * y * y);
const grad = (x, y) => [CX * x, CY * y];
const START = [-4.2, 4.4];

function heatColor(n) { return [Math.round(36 + n * 205), Math.max(22, Math.round(175 - n * 130)), Math.max(22, Math.round(95 - n * 60))]; }

export default function createOptimizerLab(mount, opts = {}) {
  const el = document.createElement('div');
  el.className = 'sim-lab';
  el.innerHTML = `
    ${opts.intro ? `<p class="sim-intro">${opts.intro}</p>` : ''}
    ${opts.steps ? `<ol class="sim-steps">${opts.steps.map((s) => `<li>${s}</li>`).join('')}</ol>` : ''}
    <div class="sim-grid">
      <div class="sim-canvas-wrap"><canvas class="sim-canvas"></canvas></div>
      <aside class="sim-side">
        <div class="sim-stats"><div class="stat big"><span>스텝</span><b id="st">0</b></div></div>
        <div class="opt-legend">
          <div class="leg"><i style="background:#6fb7ff"></i>SGD <b id="dS">–</b></div>
          <div class="leg"><i style="background:#ffb020"></i>Momentum <b id="dM">–</b></div>
          <div class="leg"><i style="background:#3ddc91"></i>Adam <b id="dA">–</b></div>
        </div>
        <div class="sim-knobs"><div class="knob"><label>학습률 (lr) <b id="vlr">0.060</b></label><input type="range" id="lr" min="0.01" max="0.2" step="0.005" value="0.06"></div></div>
        <div class="side-info" id="msg"></div>
        <div class="sim-btns"><button class="btn primary" id="auto">▶ 동시 출발</button><button class="btn ghost" id="stepb">+1 스텝</button><button class="btn ghost" id="reset">리셋</button></div>
        <div class="side-hint">b=최솟값까지 거리. 길쭉한 골짜기에선 SGD가 좌우로 튀고, Momentum·Adam이 더 곧장 내려갑니다.</div>
      </aside>
    </div>`;
  mount.appendChild(el);

  const canvas = el.querySelector('.sim-canvas');
  const ctx = canvas.getContext('2d');
  const $ = (id) => el.querySelector('#' + id);

  // 히트맵(1회)
  const GW = 200, GH = 160;
  const heat = document.createElement('canvas'); heat.width = GW; heat.height = GH;
  (function () {
    const h = heat.getContext('2d'), img = h.createImageData(GW, GH), vals = new Float32Array(GW * GH); let mx = 0;
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const x = -R + (i / (GW - 1)) * 2 * R, y = R - (j / (GH - 1)) * 2 * R; const v = f(x, y); vals[j * GW + i] = v; if (v > mx) mx = v; }
    for (let k = 0; k < vals.length; k++) { const n = Math.min(1, Math.log(1 + vals[k]) / Math.log(1 + mx)); const c = heatColor(n); img.data[k * 4] = c[0]; img.data[k * 4 + 1] = c[1]; img.data[k * 4 + 2] = c[2]; img.data[k * 4 + 3] = 255; }
    h.putImageData(img, 0, 0);
  })();

  let lr = 0.06, step = 0, running = false, raf = 0;
  let opt = {};
  function reset() {
    step = 0;
    opt = {
      SGD: { p: [...START], path: [[...START]], col: '#6fb7ff' },
      MOM: { p: [...START], v: [0, 0], path: [[...START]], col: '#ffb020' },
      ADAM: { p: [...START], m: [0, 0], s: [0, 0], t: 0, path: [[...START]], col: '#3ddc91' },
    };
  }
  function update() {
    // SGD
    { const o = opt.SGD, [gx, gy] = grad(o.p[0], o.p[1]); o.p[0] -= lr * gx; o.p[1] -= lr * gy; o.path.push([...o.p]); }
    // Momentum
    { const o = opt.MOM, mu = 0.9, [gx, gy] = grad(o.p[0], o.p[1]); o.v[0] = mu * o.v[0] - lr * gx; o.v[1] = mu * o.v[1] - lr * gy; o.p[0] += o.v[0]; o.p[1] += o.v[1]; o.path.push([...o.p]); }
    // Adam (lr 보정: 빠른 적응이라 5배)
    { const o = opt.ADAM, b1 = 0.9, b2 = 0.999, e = 1e-8, la = lr * 5; o.t++; const [gx, gy] = grad(o.p[0], o.p[1]); const g = [gx, gy]; for (let d = 0; d < 2; d++) { o.m[d] = b1 * o.m[d] + (1 - b1) * g[d]; o.s[d] = b2 * o.s[d] + (1 - b2) * g[d] * g[d]; const mh = o.m[d] / (1 - b1 ** o.t), sh = o.s[d] / (1 - b2 ** o.t); o.p[d] -= la * mh / (Math.sqrt(sh) + e); } o.path.push([...o.p]); }
    for (const o of Object.values(opt)) if (o.path.length > 600) o.path.shift();
    step++;
  }

  function fit() { const wrap = el.querySelector('.sim-canvas-wrap'); const cw = Math.max(320, wrap.clientWidth | 0), ch = Math.max(280, (wrap.clientHeight | 0) || (cw * 0.62) | 0); if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; } }
  const toPx = (x, y) => { const pw = canvas.width - PAD.l - PAD.r, ph = canvas.height - PAD.t - PAD.b; return [PAD.l + (x + R) / (2 * R) * pw, PAD.t + (1 - (y + R) / (2 * R)) * ph]; };
  function draw() {
    fit();
    const W = canvas.width, Hc = canvas.height, pw = W - PAD.l - PAD.r, ph = Hc - PAD.t - PAD.b;
    ctx.clearRect(0, 0, W, Hc); ctx.drawImage(heat, PAD.l, PAD.t, pw, ph);
    ctx.strokeStyle = 'rgba(150,170,200,.6)'; ctx.lineWidth = 1.1; ctx.strokeRect(PAD.l, PAD.t, pw, ph);
    // 최솟값
    const [ox, oy] = toPx(0, 0); ctx.fillStyle = '#fff'; ctx.font = '16px Pretendard'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', ox, oy);
    for (const o of Object.values(opt)) {
      ctx.strokeStyle = o.col; ctx.lineWidth = 2; ctx.beginPath();
      o.path.forEach((p, i) => { const [x, y] = toPx(p[0], p[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      const [cx, cy] = toPx(o.p[0], o.p[1]); ctx.beginPath(); ctx.fillStyle = o.col; ctx.arc(cx, cy, 5, 0, 7); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#0c1422'; ctx.stroke();
    }
    const dist = (o) => Math.hypot(o.p[0], o.p[1]);
    $('st').textContent = step;
    $('dS').textContent = dist(opt.SGD).toFixed(2); $('dM').textContent = dist(opt.MOM).toFixed(2); $('dA').textContent = dist(opt.ADAM).toFixed(2);
    $('vlr').textContent = lr.toFixed(3);
    const ds = dist(opt.SGD), dm = dist(opt.MOM), da = dist(opt.ADAM);
    let m = '▶ [동시 출발]로 세 옵티마이저를 같은 지점에서 출발시켜 보세요.';
    if (step > 4) { const best = da <= dm && da <= ds ? 'Adam' : dm <= ds ? 'Momentum' : 'SGD'; m = `현재 ★에 가장 가까운 건 <b>${best}</b>. SGD는 가파른 축에서 <b>지그재그</b>로 느리고, 관성/Adam은 더 곧장 내려갑니다.`; }
    if (!Number.isFinite(ds + dm + da)) m = '⚠️ 학습률이 너무 커서 <b style="color:#ff5a3c">발산</b>! lr을 줄이고 리셋하세요.';
    $('msg').innerHTML = m;
  }

  $('lr').addEventListener('input', (e) => { lr = +e.target.value; $('vlr').textContent = lr.toFixed(3); });
  $('stepb').addEventListener('click', () => { stop(); update(); draw(); });
  $('reset').addEventListener('click', () => { stop(); reset(); draw(); });
  const autoBtn = $('auto'); autoBtn.addEventListener('click', () => (running ? stop() : start()));
  function start() { running = true; autoBtn.textContent = '■ 정지'; autoBtn.classList.add('on'); let tick = 0; const loop = () => { if (!running) return; if (++tick % 6 === 0) { update(); draw(); if (step > 400) { stop(); return; } } raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); autoBtn.textContent = '▶ 동시 출발'; autoBtn.classList.remove('on'); }

  reset();
  const ro = new ResizeObserver(() => draw()); ro.observe(el.querySelector('.sim-canvas-wrap')); requestAnimationFrame(draw);
  return { el, destroy() { stop(); ro.disconnect(); el.remove(); } };
}
