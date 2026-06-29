// 교차검증 실험실 — 데이터를 k개 폴드로 나누고, 한 폴드씩 돌아가며 검증셋으로 쓴다.
// 폴드마다 점수가 다르고, 그 평균이 한 번 나눈 점수보다 믿을 만하다는 걸 본다.
const NDATA = 30;

export default function createCrossValLab(mount, opts = {}) {
  const el = document.createElement('div');
  el.className = 'sim-lab';
  el.innerHTML = `
    ${opts.intro ? `<p class="sim-intro">${opts.intro}</p>` : ''}
    ${opts.steps ? `<ol class="sim-steps">${opts.steps.map((s) => `<li>${s}</li>`).join('')}</ol>` : ''}
    <div class="sim-grid">
      <div class="sim-canvas-wrap"><canvas class="sim-canvas"></canvas></div>
      <aside class="sim-side">
        <div class="sim-stats"><div class="stat big"><span>평균 정확도</span><b id="mean">–</b></div><div class="stat"><span>편차 ±</span><b id="std">–</b></div></div>
        <div class="sim-knobs"><div class="knob"><label>폴드 수 k <b id="vk">5</b></label><input type="range" id="k" min="2" max="6" step="1" value="5"></div></div>
        <div class="side-info" id="msg"></div>
        <div class="sim-btns"><button class="btn primary" id="auto">▶ 전체 검증</button><button class="btn ghost" id="next">다음 폴드</button><button class="btn ghost" id="newd">데이터 새로</button></div>
        <div class="side-hint">주황 칸 = 이번 검증 폴드(나머지는 훈련) · ● 맞힘(초록)/틀림(빨강) · 폴드별 점수를 평균</div>
      </aside>
    </div>`;
  mount.appendChild(el);

  const canvas = el.querySelector('.sim-canvas');
  const ctx = canvas.getContext('2d');
  const $ = (id) => el.querySelector('#' + id);

  // 각 샘플의 "맞힐지"를 고정 — 폴드마다 점수가 자연스럽게 달라짐
  let correct = [];
  function genData() { correct = Array.from({ length: NDATA }, () => Math.random() < 0.8); }
  let k = 5, curFold = 0, revealed = 0;     // revealed: 지금까지 검증한 폴드 수

  function foldOf(i) { return Math.floor(i * k / NDATA); }
  function foldScore(fi) { let n = 0, ok = 0; for (let i = 0; i < NDATA; i++) if (foldOf(i) === fi) { n++; if (correct[i]) ok++; } return n ? ok / n : 0; }

  function fit() { const wrap = el.querySelector('.sim-canvas-wrap'); const cw = Math.max(320, wrap.clientWidth | 0), ch = Math.max(280, (wrap.clientHeight | 0) || (cw * 0.6) | 0); if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; } }
  function draw() {
    fit();
    const W = canvas.width, Hc = canvas.height;
    ctx.fillStyle = '#0c1422'; ctx.fillRect(0, 0, W, Hc);
    const top = 56, rowH = Math.min(64, (Hc - top - 30) / k);
    ctx.fillStyle = '#93a1b8'; ctx.font = '13px Pretendard'; ctx.textAlign = 'left';
    ctx.fillText(`데이터 ${NDATA}개를 ${k}개 폴드로 분할 · 폴드 ${revealed}/${k} 검증 완료`, 16, 30);
    const cellW = (W - 120) / NDATA;
    for (let fi = 0; fi < k; fi++) {
      const y = top + fi * rowH;
      const isVal = fi === curFold;
      // 폴드 라벨
      ctx.fillStyle = isVal ? '#ffb020' : '#5a6b86'; ctx.font = 'bold 12px Pretendard'; ctx.textAlign = 'right';
      ctx.fillText('폴드 ' + (fi + 1), 60, y + rowH / 2);
      // 이 행에서 각 샘플을 그리되, 검증폴드 샘플만 강조
      for (let i = 0; i < NDATA; i++) {
        if (foldOf(i) !== fi) continue;
        const x = 72 + i * cellW;
        const done = fi < revealed || (fi === curFold);
        let col;
        if (!done) col = '#1a2740';
        else col = correct[i] ? '#3ddc91' : '#ff5a3c';
        ctx.fillStyle = col; ctx.globalAlpha = isVal ? 1 : (done ? 0.85 : 0.4);
        ctx.fillRect(x, y + 8, cellW - 2, rowH - 18); ctx.globalAlpha = 1;
      }
      if (isVal) { ctx.strokeStyle = '#ffb020'; ctx.lineWidth = 2; ctx.strokeRect(70, y + 5, NDATA * cellW + 2, rowH - 12); }
      // 폴드 점수(검증했으면)
      if (fi < revealed || fi === curFold) { ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Pretendard'; ctx.textAlign = 'left'; ctx.fillText((foldScore(fi) * 100).toFixed(0) + '%', 72 + NDATA * cellW + 8, y + rowH / 2); }
    }
    // 평균
    const done = Math.max(revealed, curFold + 1);
    let sum = 0, arr = []; for (let fi = 0; fi < done; fi++) { arr.push(foldScore(fi)); sum += foldScore(fi); }
    const mean = arr.length ? sum / arr.length : 0;
    const std = arr.length ? Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length) : 0;
    $('mean').textContent = (mean * 100).toFixed(0) + '%';
    $('std').textContent = (std * 100).toFixed(0) + '%';
    $('vk').textContent = k;
    $('msg').innerHTML = revealed >= k
      ? `✅ <b>${k}개 폴드 전부</b> 검증 완료. 평균 <b>${(mean * 100).toFixed(0)}%</b>가 최종 성능 추정치예요. 한 번만 나눴다면 운에 따라 ${(Math.min(...arr) * 100).toFixed(0)}~${(Math.max(...arr) * 100).toFixed(0)}% 중 하나만 봤겠죠.`
      : '한 폴드씩 검증셋으로 바꿔가며 점수를 모으는 중. <b>[다음 폴드]</b>로 진행하세요.';
  }

  $('k').addEventListener('input', (e) => { k = +e.target.value; curFold = 0; revealed = 0; draw(); });
  $('next').addEventListener('click', () => { stop(); if (revealed < k) revealed = curFold + 1; curFold = (curFold + 1) % k; if (revealed >= k) curFold = k - 1; draw(); });
  $('newd').addEventListener('click', () => { stop(); genData(); curFold = 0; revealed = 0; draw(); });
  let running = false, raf = 0;
  const autoBtn = $('auto'); autoBtn.addEventListener('click', () => (running ? stop() : start()));
  function start() { if (revealed >= k) { revealed = 0; curFold = 0; } running = true; autoBtn.textContent = '■ 정지'; autoBtn.classList.add('on'); let tick = 0; const loop = () => { if (!running) return; if (++tick % 40 === 0) { if (revealed < k) { revealed = curFold + 1; if (revealed < k) curFold++; else { stop(); draw(); return; } draw(); } } raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); autoBtn.textContent = '▶ 전체 검증'; autoBtn.classList.remove('on'); }

  genData();
  const ro = new ResizeObserver(() => draw()); ro.observe(el.querySelector('.sim-canvas-wrap')); requestAnimationFrame(draw);
  return { el, destroy() { stop(); ro.disconnect(); el.remove(); } };
}
