// 분류 평가 실험실 — 점수(확률) 위에 임계값(threshold)을 옮기며
// 혼동행렬(TP·FP·FN·TN)과 정확도·정밀도·재현율·F1이 어떻게 변하는지 본다.
// 라이브러리 없이 Canvas로 점수 분포 + 임계선 + 지표를 직접 그린다.

function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// 양성(1)·음성(0) 표본의 "모델 점수"를 만든다(겹치게 → 완벽히 못 가름)
function genData() {
  const d = [];
  for (let i = 0; i < 24; i++) d.push({ y: 1, s: clamp(0.66 + randn() * 0.16, 0.02, 0.98) });
  for (let i = 0; i < 24; i++) d.push({ y: 0, s: clamp(0.34 + randn() * 0.16, 0.02, 0.98) });
  return d;
}

export default function createMetricsLab(mount, opts = {}) {
  const el = document.createElement('div');
  el.className = 'sim-lab';
  el.innerHTML = `
    ${opts.intro ? `<p class="sim-intro">${opts.intro}</p>` : ''}
    ${opts.steps ? `<ol class="sim-steps">${opts.steps.map((s) => `<li>${s}</li>`).join('')}</ol>` : ''}
    <div class="sim-grid">
      <div class="sim-canvas-wrap"><canvas class="sim-canvas"></canvas></div>
      <aside class="sim-side">
        <div class="cm-grid">
          <div></div><div class="cm-h">예측 양성</div><div class="cm-h">예측 음성</div>
          <div class="cm-h">실제 양성</div><div class="cm-cell tp"><b id="tp">0</b><span>TP</span></div><div class="cm-cell fn"><b id="fn">0</b><span>FN</span></div>
          <div class="cm-h">실제 음성</div><div class="cm-cell fp"><b id="fp">0</b><span>FP</span></div><div class="cm-cell tn"><b id="tn">0</b><span>TN</span></div>
        </div>
        <div class="sim-knobs">
          <div class="knob"><label>임계값 (threshold) <b id="vth">0.50</b></label><input type="range" id="th" min="0.05" max="0.95" step="0.01" value="0.5"></div>
        </div>
        <div class="metric-bars">
          <div class="mbar"><span>정확도 <i id="vacc">–</i></span><div class="mb"><div id="bacc"></div></div></div>
          <div class="mbar"><span>정밀도 <i id="vpre">–</i></span><div class="mb"><div id="bpre"></div></div></div>
          <div class="mbar"><span>재현율 <i id="vrec">–</i></span><div class="mb"><div id="brec"></div></div></div>
          <div class="mbar"><span>F1 점수 <i id="vf1">–</i></span><div class="mb"><div id="bf1"></div></div></div>
        </div>
        <div class="side-info" id="msg"></div>
        <div class="sim-btns"><button class="btn ghost" id="newd">데이터 새로</button></div>
        <div class="side-hint">● 양성(주황) · ● 음성(파랑) · 흰 선 = 임계값(이 점수↑면 양성으로 예측)</div>
      </aside>
    </div>`;
  mount.appendChild(el);

  const canvas = el.querySelector('.sim-canvas');
  const ctx = canvas.getContext('2d');
  const $ = (id) => el.querySelector('#' + id);
  const PAD = { l: 16, r: 16, t: 24, b: 40 };

  let data = genData();
  let th = 0.5;

  function counts() {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const d of data) {
      const pred = d.s >= th ? 1 : 0;
      if (d.y === 1 && pred === 1) tp++;
      else if (d.y === 1 && pred === 0) fn++;
      else if (d.y === 0 && pred === 1) fp++;
      else tn++;
    }
    return { tp, fp, fn, tn };
  }

  function fit() {
    const wrap = el.querySelector('.sim-canvas-wrap');
    const cw = Math.max(320, wrap.clientWidth | 0), ch = Math.max(280, (wrap.clientHeight | 0) || (cw * 0.6) | 0);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  }
  const sx = (s) => PAD.l + s * (canvas.width - PAD.l - PAD.r);

  function draw() {
    fit();
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const midY = (H - PAD.b + PAD.t) / 2;
    // 임계값 양쪽 배경(예측 음성=왼쪽, 양성=오른쪽)
    const tx = sx(th);
    ctx.fillStyle = 'rgba(111,183,255,.06)'; ctx.fillRect(PAD.l, PAD.t, tx - PAD.l, H - PAD.t - PAD.b);
    ctx.fillStyle = 'rgba(255,176,32,.07)'; ctx.fillRect(tx, PAD.t, W - PAD.r - tx, H - PAD.t - PAD.b);
    // 축
    ctx.strokeStyle = 'rgba(150,170,200,.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD.l, H - PAD.b); ctx.lineTo(W - PAD.r, H - PAD.b); ctx.stroke();
    ctx.fillStyle = '#7d8aa3'; ctx.font = '12px Pretendard'; ctx.textAlign = 'center';
    ctx.fillText('모델 점수(양성일 확률) →  0 ......... 1', W / 2, H - 14);
    // 점(약간의 세로 지터로 겹침 표현)
    for (const d of data) {
      const x = sx(d.s);
      const yj = midY + (d.y === 1 ? -1 : 1) * (28 + ((d.s * 997) % 46));
      const pred = d.s >= th ? 1 : 0;
      const correct = pred === d.y;
      ctx.beginPath(); ctx.fillStyle = d.y === 1 ? '#ffb020' : '#6fb7ff';
      ctx.globalAlpha = correct ? 1 : 0.5; ctx.arc(x, yj, 6, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      if (!correct) { ctx.lineWidth = 2; ctx.strokeStyle = '#ff5a3c'; ctx.stroke(); }
    }
    // 라벨
    ctx.fillStyle = '#ffb020'; ctx.textAlign = 'left'; ctx.font = '12px Pretendard'; ctx.fillText('● 실제 양성', PAD.l + 4, PAD.t + 4);
    ctx.fillStyle = '#6fb7ff'; ctx.fillText('● 실제 음성', PAD.l + 4, H - PAD.b - 4);
    // 임계선
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(tx, PAD.t - 6); ctx.lineTo(tx, H - PAD.b); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 12px Pretendard';
    ctx.fillText('임계값 ' + th.toFixed(2), tx, PAD.t - 10);

    // 지표
    const { tp, fp, fn, tn } = counts();
    $('tp').textContent = tp; $('fp').textContent = fp; $('fn').textContent = fn; $('tn').textContent = tn;
    const acc = (tp + tn) / data.length;
    const pre = tp + fp ? tp / (tp + fp) : 0;
    const rec = tp + fn ? tp / (tp + fn) : 0;
    const f1 = pre + rec ? 2 * pre * rec / (pre + rec) : 0;
    const set = (id, v) => { $('v' + id).textContent = (v * 100).toFixed(0) + '%'; $('b' + id).style.width = (v * 100).toFixed(0) + '%'; };
    set('acc', acc); set('pre', pre); set('rec', rec); set('f1', f1);
    $('vth').textContent = th.toFixed(2);
    let m;
    if (th <= 0.2) m = '임계값이 <b>낮음</b> → 거의 다 "양성"으로 예측. 재현율↑ 이지만 정밀도↓ (FP 많아짐).';
    else if (th >= 0.8) m = '임계값이 <b>높음</b> → 확실할 때만 "양성". 정밀도↑ 이지만 재현율↓ (FN 많아짐, 놓침).';
    else m = '<b>정밀도↔재현율</b>는 맞바꿈(trade-off) 관계예요. 임계값을 옮기면 한쪽이 오르고 다른 쪽이 내려갑니다.';
    $('msg').innerHTML = m;
  }

  $('th').addEventListener('input', (e) => { th = +e.target.value; draw(); });
  $('newd').addEventListener('click', () => { data = genData(); draw(); });

  const ro = new ResizeObserver(() => draw());
  ro.observe(el.querySelector('.sim-canvas-wrap'));
  requestAnimationFrame(draw);

  return { el, destroy() { ro.disconnect(); el.remove(); } };
}
