// 경사하강 시뮬 — 비용 J(w,b) 등고선(히트맵) 위에서 경사하강 경로를 본다.
// 학습률을 키우면 진동/발산, 작으면 느린 수렴. 시작점(θ)은 캔버스 클릭으로 지정.
const SAMPLE = [
  { x: 1, y: 2.1 }, { x: 2, y: 2.6 }, { x: 3, y: 3.7 }, { x: 4, y: 4.0 },
  { x: 5, y: 5.2 }, { x: 6, y: 5.6 }, { x: 7, y: 7.1 }, { x: 8, y: 7.6 },
];
const wR = [-0.6, 2.2], bR = [-2.5, 5.5];
const PAD = { l: 48, r: 16, t: 16, b: 34 };

function heatColor(n) {
  const r = Math.round(36 + n * 205);
  const g = Math.round(175 - n * 130);
  const b = Math.round(95 - n * 60);
  return [r, Math.max(22, g), Math.max(22, b)];
}

export default function createGradientDescent(mount, opts = {}) {
  const el = document.createElement('div');
  el.className = 'sim-lab';
  el.innerHTML = `
    ${opts.intro ? `<p class="sim-intro">${opts.intro}</p>` : ''}
    ${opts.steps ? `<ol class="sim-steps">${opts.steps.map((s) => `<li>${s}</li>`).join('')}</ol>` : ''}
    <div class="sim-grid">
      <div class="sim-canvas-wrap"><canvas class="sim-canvas"></canvas></div>
      <aside class="sim-side">
        <div class="sim-stats">
          <div class="stat big"><span>비용 J</span><b id="J">–</b></div>
          <div class="stat"><span>스텝</span><b id="st">0</b></div>
        </div>
        <div class="sim-knobs">
          <div class="knob"><label>학습률 (lr) <b id="vlr">0.020</b></label><input type="range" id="lr" min="0.002" max="0.09" step="0.002" value="0.02"></div>
        </div>
        <div class="side-info" id="eq"></div>
        <div class="sim-btns">
          <button class="btn primary" id="auto">▶ 자동 하강</button>
          <button class="btn ghost" id="stepb">+1 스텝</button>
          <button class="btn ghost" id="reset">리셋</button>
        </div>
        <div class="side-hint">★ = 최적(최소 비용) · 캔버스 클릭 = 시작점 지정 · 학습률을 크게 하면 진동/발산을 볼 수 있어요</div>
      </aside>
    </div>`;
  mount.appendChild(el);

  const canvas = el.querySelector('.sim-canvas');
  const ctx = canvas.getContext('2d');
  const $ = (id) => el.querySelector('#' + id);

  // 비용·최적값(정규방정식)
  const J = (w, b) => { let s = 0; for (const p of SAMPLE) { const e = w * p.x + b - p.y; s += e * e; } return s / SAMPLE.length; };
  let n = SAMPLE.length, Sx = 0, Sy = 0, Sxx = 0, Sxy = 0;
  for (const p of SAMPLE) { Sx += p.x; Sy += p.y; Sxx += p.x * p.x; Sxy += p.x * p.y; }
  const wOpt = (n * Sxy - Sx * Sy) / (n * Sxx - Sx * Sx);
  const bOpt = (Sy - wOpt * Sx) / n;

  // 히트맵(그리드 고정, 1회 계산)
  const GW = 200, GH = 150;
  const heat = document.createElement('canvas'); heat.width = GW; heat.height = GH;
  (function buildHeat() {
    const hctx = heat.getContext('2d');
    const img = hctx.createImageData(GW, GH);
    const vals = new Float32Array(GW * GH); let mx = 0;
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const w = wR[0] + (i / (GW - 1)) * (wR[1] - wR[0]);
      const b = bR[1] - (j / (GH - 1)) * (bR[1] - bR[0]);
      const v = J(w, b); vals[j * GW + i] = v; if (v > mx) mx = v;
    }
    for (let k = 0; k < vals.length; k++) {
      const nn = Math.min(1, Math.log(1 + vals[k]) / Math.log(1 + mx));
      const c = heatColor(nn);
      img.data[k * 4] = c[0]; img.data[k * 4 + 1] = c[1]; img.data[k * 4 + 2] = c[2]; img.data[k * 4 + 3] = 255;
    }
    hctx.putImageData(img, 0, 0);
  })();

  let w = -0.4, b = 4.6, lr = 0.02, step = 0, path = [{ w, b }];
  let running = false, raf = 0;

  const plot = () => { const W = canvas.width, H = canvas.height; return { W, H, pw: W - PAD.l - PAD.r, ph: H - PAD.t - PAD.b }; };
  function toPx(w_, b_) { const { pw, ph } = plot(); return [PAD.l + (w_ - wR[0]) / (wR[1] - wR[0]) * pw, PAD.t + (1 - (b_ - bR[0]) / (bR[1] - bR[0])) * ph]; }
  function evToWB(ev) {
    const r = canvas.getBoundingClientRect();
    const px = (ev.clientX - r.left) / r.width * canvas.width;
    const py = (ev.clientY - r.top) / r.height * canvas.height;
    const { pw, ph } = plot();
    return [wR[0] + (px - PAD.l) / pw * (wR[1] - wR[0]), bR[1] - (py - PAD.t) / ph * (bR[1] - bR[0])];
  }
  function gstep() {
    let dw = 0, db = 0;
    for (const p of SAMPLE) { const e = w * p.x + b - p.y; dw += 2 * e * p.x; db += 2 * e; }
    dw /= SAMPLE.length; db /= SAMPLE.length;
    w -= lr * dw; b -= lr * db; step++;
    if (Number.isFinite(w) && Number.isFinite(b)) path.push({ w, b });
    if (path.length > 500) path.shift();
  }
  function fit() {
    const wrap = el.querySelector('.sim-canvas-wrap');
    const cw = Math.max(320, wrap.clientWidth | 0);
    const ch = Math.max(260, (wrap.clientHeight | 0) || (cw * 0.62) | 0);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  }
  function draw() {
    fit();
    const { W, H, pw, ph } = plot();
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(heat, PAD.l, PAD.t, pw, ph);
    ctx.strokeStyle = 'rgba(150,170,200,.7)'; ctx.lineWidth = 1.2; ctx.strokeRect(PAD.l, PAD.t, pw, ph);
    ctx.fillStyle = '#cdd6e6'; ctx.font = '12px Pretendard'; ctx.textAlign = 'center';
    ctx.fillText('기울기 w →', PAD.l + pw / 2, H - 8);
    ctx.save(); ctx.translate(15, PAD.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('절편 b →', 0, 0); ctx.restore();
    // 최적
    const [ox, oy] = toPx(wOpt, bOpt);
    ctx.fillStyle = '#3ddc91'; ctx.font = '18px Pretendard'; ctx.textBaseline = 'middle'; ctx.fillText('★', ox, oy);
    // 경로
    ctx.strokeStyle = '#ffd86b'; ctx.lineWidth = 2; ctx.beginPath();
    path.forEach((p, i) => { const [x, y] = toPx(p.w, p.b); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
    // 현재
    const [cx, cy] = toPx(w, b);
    ctx.beginPath(); ctx.fillStyle = '#fff'; ctx.shadowColor = '#ffd86b'; ctx.shadowBlur = 12; ctx.arc(cx, cy, 6, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    // 사이드
    const jv = J(w, b);
    $('J').textContent = Number.isFinite(jv) ? jv.toFixed(2) : '∞';
    $('st').textContent = step;
    $('vlr').textContent = lr.toFixed(3);
    let msg;
    if (!Number.isFinite(jv) || Math.abs(w) >= wR[1] - 0.05 || jv > 40) msg = '⚠️ <b style="color:#ff5a3c">발산!</b> 학습률(lr)을 줄이고 리셋하세요';
    else if (Math.abs(w - wOpt) < 0.05 && Math.abs(b - bOpt) < 0.12) msg = '✅ <b style="color:#3ddc91">최적(★)에 수렴 완료</b>';
    else if (running) msg = '⬇️ 비용이 낮아지는 방향으로 내려가는 중…';
    else msg = '▶ [자동 하강]을 눌러 ★로 내려가는 경로를 보세요';
    $('eq').innerHTML = `현재 직선 <b>y = ${w.toFixed(2)}x + ${b.toFixed(2)}</b><br>${msg}`;
  }

  $('lr').addEventListener('input', (e) => { lr = +e.target.value; $('vlr').textContent = lr.toFixed(3); });
  $('stepb').addEventListener('click', () => { stop(); gstep(); draw(); });
  $('reset').addEventListener('click', () => { stop(); w = -0.4; b = 4.6; step = 0; path = [{ w, b }]; draw(); });
  const autoBtn = $('auto');
  autoBtn.addEventListener('click', () => (running ? stop() : start()));
  function start() { running = true; autoBtn.textContent = '■ 정지'; autoBtn.classList.add('on'); const loop = () => { if (!running) return; gstep(); draw(); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); autoBtn.textContent = '▶ 자동 하강'; autoBtn.classList.remove('on'); }

  function onDown(ev) { stop(); const [nw, nb] = evToWB(ev); w = Math.max(wR[0], Math.min(wR[1], nw)); b = Math.max(bR[0], Math.min(bR[1], nb)); step = 0; path = [{ w, b }]; draw(); }
  canvas.addEventListener('pointerdown', onDown);

  const ro = new ResizeObserver(() => draw());
  ro.observe(el.querySelector('.sim-canvas-wrap'));
  requestAnimationFrame(draw);

  return { el, destroy() { stop(); ro.disconnect(); el.remove(); } };
}
