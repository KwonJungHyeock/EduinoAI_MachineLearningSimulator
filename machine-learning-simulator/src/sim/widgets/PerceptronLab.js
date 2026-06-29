// 퍼셉트론 실험실 — 단일 뉴런이 논리 게이트(AND·OR·XOR)를 배운다.
// AND·OR는 직선으로 갈려 학습 성공, XOR는 직선으로 못 갈라 영원히 실패(딥러닝이 필요한 이유).
import Plot from '../Plot.js';

const GATES = {
  AND: [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 1]],
  OR: [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 1]],
  XOR: [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]],
};

export default function createPerceptronLab(mount, opts = {}) {
  const el = document.createElement('div');
  el.className = 'sim-lab';
  el.innerHTML = `
    ${opts.intro ? `<p class="sim-intro">${opts.intro}</p>` : ''}
    ${opts.steps ? `<ol class="sim-steps">${opts.steps.map((s) => `<li>${s}</li>`).join('')}</ol>` : ''}
    <div class="sim-grid">
      <div class="sim-canvas-wrap"><canvas class="sim-canvas"></canvas></div>
      <aside class="sim-side">
        <div class="sim-stats"><div class="stat big"><span>정확도</span><b id="acc">–</b></div><div class="stat"><span>에폭</span><b id="ep">0</b></div></div>
        <div class="sim-knobs">
          <div class="knob place"><label>논리 게이트</label>
            <div class="seg seg3"><button class="seg-b on" data-g="AND">AND</button><button class="seg-b" data-g="OR">OR</button><button class="seg-b" data-g="XOR">XOR</button></div>
          </div>
        </div>
        <div class="side-info" id="msg"></div>
        <div class="sim-btns">
          <button class="btn primary" id="auto">▶ 자동 학습</button>
          <button class="btn ghost" id="stepb">+1 에폭</button>
          <button class="btn ghost" id="reset">리셋</button>
        </div>
        <div class="side-hint">● 출력 1(주황) · ● 출력 0(파랑) · 흰 선 = 뉴런이 그은 직선 경계 (w₁x₁+w₂x₂+b=0)</div>
      </aside>
    </div>`;
  mount.appendChild(el);

  const canvas = el.querySelector('.sim-canvas');
  const ctx = canvas.getContext('2d');
  const plot = new Plot(canvas, { xRange: [-0.35, 1.35], yRange: [-0.35, 1.35] });
  const $ = (id) => el.querySelector('#' + id);

  let gate = 'AND';
  let w1 = 0.2, w2 = -0.3, b = 0.1;
  let epoch = 0, running = false, raf = 0;
  const lr = 0.1;

  const act = (x1, x2) => (w1 * x1 + w2 * x2 + b >= 0 ? 1 : 0);
  function trainEpoch() {
    for (const [x1, x2, t] of GATES[gate]) { const e = t - act(x1, x2); w1 += lr * e * x1; w2 += lr * e * x2; b += lr * e; }
    epoch++;
  }
  function accuracy() { let ok = 0; for (const [x1, x2, t] of GATES[gate]) if (act(x1, x2) === t) ok++; return ok / 4; }

  function fit() {
    const wrap = el.querySelector('.sim-canvas-wrap');
    const cw = Math.max(320, wrap.clientWidth | 0), ch = Math.max(280, (wrap.clientHeight | 0) || (cw * 0.7) | 0);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  }
  function draw() {
    fit();
    plot.clear();
    // 결정영역(반평면) 옅게
    const N = 44;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x = -0.35 + (i + 0.5) / N * 1.7, y = -0.35 + (j + 0.5) / N * 1.7;
      const [px0, py0] = plot.toPx(-0.35 + i / N * 1.7, -0.35 + (j + 1) / N * 1.7);
      const [px1, py1] = plot.toPx(-0.35 + (i + 1) / N * 1.7, -0.35 + j / N * 1.7);
      ctx.fillStyle = act(x, y) ? '#ffb020' : '#6fb7ff'; ctx.globalAlpha = 0.13;
      ctx.fillRect(px0, py0, px1 - px0 + 1, py1 - py0 + 1);
    }
    ctx.globalAlpha = 1;
    plot.grid(); plot.axes('x₁', 'x₂');
    // 경계선
    if (Math.abs(w2) > 1e-6) { ctx.save(); plot.line(-w1 / w2, -b / w2, '#fff', 2.5); ctx.restore(); }
    // 4개 점
    for (const [x1, x2, t] of GATES[gate]) {
      const [X, Y] = plot.toPx(x1, x2);
      ctx.beginPath(); ctx.fillStyle = t ? '#ffb020' : '#6fb7ff'; ctx.arc(X, Y, 11, 0, 7); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = act(x1, x2) === t ? 'rgba(255,255,255,.6)' : '#ff5a3c'; ctx.stroke();
      ctx.fillStyle = '#0c1422'; ctx.font = 'bold 12px Pretendard'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, X, Y);
    }
    const a = accuracy();
    $('acc').textContent = (a * 100).toFixed(0) + '%';
    $('ep').textContent = epoch;
    let m;
    if (gate === 'XOR') m = a === 1 ? '' : '❌ <b style="color:#ff5a3c">XOR은 직선 하나로 못 가릅니다.</b> 아무리 학습해도 100%가 안 돼요 → <b>은닉층(다층신경망)</b>이 필요한 결정적 이유!';
    else if (a === 1) m = '✅ <b style="color:#3ddc91">학습 성공!</b> 직선 하나로 0과 1을 완벽히 갈랐어요.';
    else m = '⬇️ 틀린 점(빨강 테두리)을 줄이도록 경계선이 움직이는 중…';
    $('msg').innerHTML = m;
  }

  el.querySelectorAll('.seg-b').forEach((bn) => bn.addEventListener('click', () => {
    el.querySelectorAll('.seg-b').forEach((x) => x.classList.remove('on')); bn.classList.add('on'); gate = bn.dataset.g; reset();
  }));
  $('stepb').addEventListener('click', () => { stop(); trainEpoch(); draw(); });
  $('reset').addEventListener('click', reset);
  const autoBtn = $('auto');
  autoBtn.addEventListener('click', () => (running ? stop() : start()));
  function reset() { stop(); w1 = 0.2; w2 = -0.3; b = 0.1; epoch = 0; draw(); }
  function start() {
    running = true; autoBtn.textContent = '■ 정지'; autoBtn.classList.add('on');
    let tick = 0;
    const loop = () => { if (!running) return; if (++tick % 14 === 0) { trainEpoch(); draw(); if (gate !== 'XOR' && accuracy() === 1) { stop(); return; } if (epoch > 200) { stop(); return; } } raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
  }
  function stop() { running = false; cancelAnimationFrame(raf); autoBtn.textContent = '▶ 자동 학습'; autoBtn.classList.remove('on'); }

  const ro = new ResizeObserver(() => draw());
  ro.observe(el.querySelector('.sim-canvas-wrap'));
  requestAnimationFrame(draw);

  return { el, destroy() { stop(); ro.disconnect(); el.remove(); } };
}
