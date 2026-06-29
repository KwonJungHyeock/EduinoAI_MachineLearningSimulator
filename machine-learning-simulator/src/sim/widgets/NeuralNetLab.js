// 신경망 학습 실험실 — 은닉층을 가진 다층신경망(MLP)이 비선형 경계를 배운다.
// 순전파(예측) → 역전파(기울기) → 가중치 갱신을 직접 구현(라이브러리 X).
// 4.2(은닉층/표현력)와 4.3(역전파/손실 감소)에서 공유. opts.task='xor'|'circle'.
import Plot from '../Plot.js';

const C0 = '#6fb7ff', C1 = '#ffb020';
const sig = (z) => 1 / (1 + Math.exp(-z));
const tanh = Math.tanh;

function genData(task) {
  const pts = [];
  if (task === 'circle') {
    for (let i = 0; i < 60; i++) {
      const r = Math.random() < 0.5 ? Math.random() * 1.8 : 3 + Math.random() * 1.7;
      const a = Math.random() * 7; const x = 5 + r * Math.cos(a), y = 5 + r * Math.sin(a);
      pts.push({ x, y, c: r < 2.4 ? 1 : 0 });
    }
  } else { // xor: 대각선 사분면이 같은 클래스
    const ctr = [[3, 3, 0], [7, 7, 0], [3, 7, 1], [7, 3, 1]];
    for (const [cx, cy, c] of ctr) for (let i = 0; i < 14; i++) pts.push({ x: cx + (Math.random() - 0.5) * 2.4, y: cy + (Math.random() - 0.5) * 2.4, c });
  }
  return pts;
}

export default function createNeuralNetLab(mount, opts = {}) {
  const task = opts.task || 'xor';
  const el = document.createElement('div');
  el.className = 'sim-lab';
  el.innerHTML = `
    ${opts.intro ? `<p class="sim-intro">${opts.intro}</p>` : ''}
    ${opts.steps ? `<ol class="sim-steps">${opts.steps.map((s) => `<li>${s}</li>`).join('')}</ol>` : ''}
    <div class="sim-grid">
      <div class="sim-canvas-wrap"><canvas class="sim-canvas"></canvas></div>
      <aside class="sim-side">
        <div class="sim-stats"><div class="stat big"><span>정확도</span><b id="acc">–</b></div><div class="stat"><span>손실</span><b id="loss">–</b></div></div>
        <div class="sim-loss"><div class="side-label">신경망 구조 (선=가중치, 초록 +/빨강 −)</div><canvas class="net-canvas"></canvas></div>
        <div class="sim-loss"><div class="side-label">손실(에폭마다) — 역전파로 내려간다</div><canvas class="loss-canvas"></canvas></div>
        <div class="sim-knobs">
          <div class="knob"><label>은닉 뉴런 수 <b id="vh">6</b></label><input type="range" id="h" min="1" max="12" step="1" value="6"></div>
          <div class="knob"><label>학습률 <b id="vlr">0.30</b></label><input type="range" id="lr" min="0.02" max="1" step="0.02" value="0.3"></div>
        </div>
        <div class="side-info" id="msg"></div>
        <div class="sim-btns">
          <button class="btn primary" id="auto">▶ 자동 학습</button>
          <button class="btn ghost" id="reset">리셋(가중치)</button>
          <button class="btn ghost" id="newd">데이터 새로</button>
        </div>
        <div class="side-hint">은닉 뉴런↑ → 더 복잡한 곡선 경계. 1개면 직선밖에 못 그려요.</div>
      </aside>
    </div>`;
  mount.appendChild(el);

  const canvas = el.querySelector('.sim-canvas');
  const ctx = canvas.getContext('2d');
  const netC = el.querySelector('.net-canvas'), nctx = netC.getContext('2d');
  const lossC = el.querySelector('.loss-canvas'), lctx = lossC.getContext('2d');
  const plot = new Plot(canvas, { xRange: [0, 10], yRange: [0, 10] });
  const $ = (id) => el.querySelector('#' + id);

  let pts = genData(task);
  let H = 6, lr = 0.3;
  let W1, b1, W2, b2;     // 2→H (tanh) → 1 (sigmoid)
  let epoch = 0, lossHist = [], running = false, raf = 0;

  const nx = (v) => (v - 5) / 5;
  function initNet() {
    W1 = Array.from({ length: H }, () => [(Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 2.4]);
    b1 = Array.from({ length: H }, () => (Math.random() - 0.5) * 0.5);
    W2 = Array.from({ length: H }, () => (Math.random() - 0.5) * 2.4);
    b2 = (Math.random() - 0.5) * 0.5;
    epoch = 0; lossHist = [];
  }
  function forward(x, y) {
    const h = new Array(H), x1 = nx(x), x2 = nx(y);
    for (let i = 0; i < H; i++) h[i] = tanh(W1[i][0] * x1 + W1[i][1] * x2 + b1[i]);
    let z = b2; for (let i = 0; i < H; i++) z += W2[i] * h[i];
    return { o: sig(z), h, x1, x2 };
  }
  function trainEpoch() {
    const gW1 = Array.from({ length: H }, () => [0, 0]), gb1 = new Array(H).fill(0), gW2 = new Array(H).fill(0); let gb2 = 0;
    let loss = 0; const n = pts.length;
    for (const p of pts) {
      const { o, h, x1, x2 } = forward(p.x, p.y);
      const dz = o - p.c;                       // 교차엔트로피+시그모이드 미분
      loss += -(p.c * Math.log(o + 1e-9) + (1 - p.c) * Math.log(1 - o + 1e-9));
      gb2 += dz;
      for (let i = 0; i < H; i++) {
        gW2[i] += dz * h[i];
        const dh = dz * W2[i] * (1 - h[i] * h[i]); // tanh'
        gW1[i][0] += dh * x1; gW1[i][1] += dh * x2; gb1[i] += dh;
      }
    }
    for (let i = 0; i < H; i++) { W2[i] -= lr * gW2[i] / n; b1[i] -= lr * gb1[i] / n; W1[i][0] -= lr * gW1[i][0] / n; W1[i][1] -= lr * gW1[i][1] / n; }
    b2 -= lr * gb2 / n;
    epoch++; lossHist.push(loss / n); if (lossHist.length > 240) lossHist.shift();
  }
  function accuracy() { let ok = 0; for (const p of pts) if ((forward(p.x, p.y).o >= 0.5 ? 1 : 0) === p.c) ok++; return ok / pts.length; }

  function fitCv(c, wrap, ratio) { const cw = Math.max(280, wrap.clientWidth | 0), ch = ratio ? (cw * ratio) | 0 : c.clientHeight | 0; if (c.width !== cw || c.height !== Math.max(60, ch)) { c.width = cw; c.height = Math.max(60, ch); } }
  function fitMain() { const wrap = el.querySelector('.sim-canvas-wrap'); const cw = Math.max(320, wrap.clientWidth | 0), ch = Math.max(280, (wrap.clientHeight | 0) || (cw * 0.7) | 0); if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; } }

  function draw() {
    fitMain();
    plot.clear();
    const N = 52;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x = (i + 0.5) / N * 10, y = (j + 0.5) / N * 10;
      const o = forward(x, y).o; const conf = Math.abs(o - 0.5) * 2;
      const [px0, py0] = plot.toPx(i / N * 10, (j + 1) / N * 10);
      const [px1, py1] = plot.toPx((i + 1) / N * 10, j / N * 10);
      ctx.fillStyle = o >= 0.5 ? C1 : C0; ctx.globalAlpha = 0.10 + conf * 0.34;
      ctx.fillRect(px0, py0, px1 - px0 + 1, py1 - py0 + 1);
    }
    ctx.globalAlpha = 1; plot.grid(); plot.axes('특징 1', '특징 2');
    for (const p of pts) { const [X, Y] = plot.toPx(p.x, p.y); ctx.beginPath(); ctx.fillStyle = p.c ? C1 : C0; ctx.arc(X, Y, 6, 0, 7); ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.stroke(); }
    drawNet(); drawLoss();
    $('acc').textContent = (accuracy() * 100).toFixed(0) + '%';
    $('loss').textContent = lossHist.length ? lossHist[lossHist.length - 1].toFixed(3) : '–';
    const a = accuracy();
    $('msg').innerHTML = H === 1
      ? '은닉 뉴런이 <b>1개</b>뿐 → 직선 경계만 가능. 비선형 데이터는 못 풀어요. 뉴런 수를 늘려보세요!'
      : a > 0.95 ? '✅ <b style="color:#3ddc91">곡선 경계 학습 성공!</b> 은닉층이 비선형 변환을 해냈습니다.'
        : running ? '⬇️ 역전파로 손실을 줄이며 경계가 휘어지는 중…' : '▶ [자동 학습]을 눌러 경계가 데이터에 맞게 휘는 걸 보세요.';
  }
  function drawNet() {
    const wrap = netC.parentElement; fitCv(netC, wrap, null); if (!netC.height) { netC.height = 130; }
    const W = netC.width, Hh = netC.height; nctx.clearRect(0, 0, W, Hh);
    const layX = [W * 0.16, W * 0.5, W * 0.84];
    const nodes = (cnt) => Array.from({ length: cnt }, (_, i) => Hh * (i + 1) / (cnt + 1));
    const inY = nodes(2), hY = nodes(Math.min(H, 12)), outY = nodes(1);
    // 입력→은닉
    for (let i = 0; i < 2; i++) for (let j = 0; j < hY.length; j++) edge(layX[0], inY[i], layX[1], hY[j], W1[j] ? W1[j][i] : 0);
    for (let j = 0; j < hY.length; j++) edge(layX[1], hY[j], layX[2], outY[0], W2[j] || 0);
    node(layX[0], inY, '#6fb7ff'); node(layX[1], hY, '#b39bff'); node(layX[2], outY, '#3ddc91');
    function edge(x1, y1, x2, y2, w) { nctx.strokeStyle = w >= 0 ? 'rgba(61,220,145,' + Math.min(0.9, 0.15 + Math.abs(w) * 0.4) + ')' : 'rgba(255,90,60,' + Math.min(0.9, 0.15 + Math.abs(w) * 0.4) + ')'; nctx.lineWidth = Math.min(3, 0.4 + Math.abs(w) * 1.1); nctx.beginPath(); nctx.moveTo(x1, y1); nctx.lineTo(x2, y2); nctx.stroke(); }
    function node(x, ys, col) { for (const y of ys) { nctx.beginPath(); nctx.fillStyle = col; nctx.arc(x, y, 5, 0, 7); nctx.fill(); } }
  }
  function drawLoss() {
    fitCv(lossC, lossC.parentElement, null); if (!lossC.height) lossC.height = 96;
    const W = lossC.width, Hh = lossC.height; lctx.clearRect(0, 0, W, Hh);
    if (lossHist.length < 2) return;
    const mx = Math.max(...lossHist), mn = Math.min(...lossHist), rng = mx - mn || 1;
    lctx.strokeStyle = '#ffd86b'; lctx.lineWidth = 2; lctx.beginPath();
    lossHist.forEach((v, i) => { const x = i / (lossHist.length - 1) * (W - 8) + 4; const y = Hh - 6 - (v - mn) / rng * (Hh - 12); i ? lctx.lineTo(x, y) : lctx.moveTo(x, y); });
    lctx.stroke();
  }

  $('h').addEventListener('input', (e) => { H = +e.target.value; $('vh').textContent = H; stop(); initNet(); draw(); });
  $('lr').addEventListener('input', (e) => { lr = +e.target.value; $('vlr').textContent = lr.toFixed(2); });
  $('reset').addEventListener('click', () => { stop(); initNet(); draw(); });
  $('newd').addEventListener('click', () => { stop(); pts = genData(task); initNet(); draw(); });
  const autoBtn = $('auto');
  autoBtn.addEventListener('click', () => (running ? stop() : start()));
  function start() { running = true; autoBtn.textContent = '■ 정지'; autoBtn.classList.add('on'); const loop = () => { if (!running) return; for (let i = 0; i < 4; i++) trainEpoch(); draw(); if (epoch > 4000) { stop(); return; } raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); autoBtn.textContent = '▶ 자동 학습'; autoBtn.classList.remove('on'); }

  initNet();
  const ro = new ResizeObserver(() => draw());
  ro.observe(el.querySelector('.sim-canvas-wrap'));
  requestAnimationFrame(draw);

  return { el, destroy() { stop(); ro.disconnect(); el.remove(); } };
}
