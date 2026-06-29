// PCA(주성분분석) 실험실 — 점 구름의 "가장 많이 퍼진 방향(주성분)"을 찾는다.
// 공분산행렬의 고유벡터를 직접 계산해 주축을 그리고, PC1에 투영하면
// 2D 정보를 1D로 줄이며 분산을 얼마나 보존하는지 본다. (라이브러리 X)
import Plot from '../Plot.js';

function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// 상관 있는(비스듬히 퍼진) 점 구름. corr가 클수록 한 방향으로 길쭉.
function genCloud(corr = 0.85) {
  const pts = [];
  for (let i = 0; i < 40; i++) {
    const a = randn() * 2.6, b = randn() * 1.0;
    const x = 5 + a, y = 5 + corr * a + Math.sqrt(1 - corr * corr) * b * 2.6;
    pts.push({ x: clamp(x, 0.3, 9.7), y: clamp(y, 0.3, 9.7) });
  }
  return pts;
}

// 2×2 대칭행렬 [[a,b],[b,c]]의 고유값·고유벡터(해석적)
function eig2(a, b, c) {
  const tr = a + c, det = a * c - b * b;
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const l1 = tr / 2 + disc, l2 = tr / 2 - disc;
  let v1;
  if (Math.abs(b) > 1e-9) v1 = [l1 - c, b];
  else v1 = a >= c ? [1, 0] : [0, 1];
  const n = Math.hypot(v1[0], v1[1]) || 1; v1 = [v1[0] / n, v1[1] / n];
  const v2 = [-v1[1], v1[0]];
  return { l1, l2, v1, v2 };
}

export default function createPCALab(mount, opts = {}) {
  const el = document.createElement('div');
  el.className = 'sim-lab';
  el.innerHTML = `
    ${opts.intro ? `<p class="sim-intro">${opts.intro}</p>` : ''}
    ${opts.steps ? `<ol class="sim-steps">${opts.steps.map((s) => `<li>${s}</li>`).join('')}</ol>` : ''}
    <div class="sim-grid">
      <div class="sim-canvas-wrap"><canvas class="sim-canvas"></canvas></div>
      <aside class="sim-side">
        <div class="sim-stats">
          <div class="stat big"><span>PC1 설명분산</span><b id="ev1">–</b></div>
          <div class="stat"><span>PC2</span><b id="ev2">–</b></div>
        </div>
        <div class="sim-knobs">
          <div class="knob"><label>데이터 상관(퍼짐 방향) <b id="vco">0.85</b></label><input type="range" id="co" min="0" max="0.97" step="0.01" value="0.85"></div>
          <div class="knob place"><label>보기</label>
            <div class="seg"><button class="seg-b on" data-v="axes">주성분 축</button><button class="seg-b" data-v="proj">PC1에 투영</button></div>
          </div>
        </div>
        <div class="side-info" id="msg"></div>
        <div class="sim-btns"><button class="btn ghost" id="newd">데이터 새로</button></div>
        <div class="side-hint">─ PC1(가장 길게 퍼진 방향) · ─ PC2(직각) · 투영 보기 = 2D→1D 차원축소</div>
      </aside>
    </div>`;
  mount.appendChild(el);

  const canvas = el.querySelector('.sim-canvas');
  const ctx = canvas.getContext('2d');
  const plot = new Plot(canvas, { xRange: [0, 10], yRange: [0, 10] });
  const $ = (id) => el.querySelector('#' + id);

  let corr = 0.85;
  let pts = genCloud(corr);
  let view = 'axes';

  function pca() {
    const n = pts.length || 1;
    const mx = pts.reduce((a, p) => a + p.x, 0) / n, my = pts.reduce((a, p) => a + p.y, 0) / n;
    let cxx = 0, cyy = 0, cxy = 0;
    for (const p of pts) { const dx = p.x - mx, dy = p.y - my; cxx += dx * dx; cyy += dy * dy; cxy += dx * dy; }
    cxx /= n; cyy /= n; cxy /= n;
    const e = eig2(cxx, cyy, cxy); // 주의: a=cxx, c=cyy, b=cxy
    return { mx, my, ...e };
  }

  function fit() {
    const wrap = el.querySelector('.sim-canvas-wrap');
    const cw = Math.max(320, wrap.clientWidth | 0), ch = Math.max(280, (wrap.clientHeight | 0) || (cw * 0.7) | 0);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  }
  function draw() {
    fit();
    plot.clear(); plot.grid(); plot.axes('특징 1', '특징 2');
    const { mx, my, l1, l2, v1, v2 } = pca();
    const s1 = Math.sqrt(Math.max(l1, 0)) * 2.2, s2 = Math.sqrt(Math.max(l2, 0)) * 2.2;

    if (view === 'proj') {
      // 각 점을 PC1 직선에 투영 → 투영선 + 투영점(2D를 1D로)
      for (const p of pts) {
        const dx = p.x - mx, dy = p.y - my;
        const t = dx * v1[0] + dy * v1[1];
        const qx = mx + t * v1[0], qy = my + t * v1[1];
        const [X, Y] = plot.toPx(p.x, p.y), [QX, QY] = plot.toPx(qx, qy);
        ctx.strokeStyle = 'rgba(255,90,60,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(QX, QY); ctx.stroke();
      }
    }
    // 점
    for (const p of pts) { const [X, Y] = plot.toPx(p.x, p.y); ctx.beginPath(); ctx.fillStyle = '#6fb7ff'; ctx.globalAlpha = view === 'proj' ? 0.45 : 1; ctx.arc(X, Y, 5, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    // 평균점
    const [MX, MY] = plot.toPx(mx, my);
    // 주축 PC1
    const drawAxis = (v, s, col, w, label) => {
      const [AX, AY] = plot.toPx(mx - v[0] * s, my - v[1] * s), [BX, BY] = plot.toPx(mx + v[0] * s, my + v[1] * s);
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(AX, AY); ctx.lineTo(BX, BY); ctx.stroke();
      ctx.fillStyle = col; ctx.font = 'bold 13px Pretendard'; ctx.fillText(label, BX + 4, BY);
    };
    drawAxis(v1, s1, '#3ddc91', 3.5, 'PC1');
    drawAxis(v2, s2, '#ffb020', 2.5, 'PC2');
    if (view === 'proj') for (const p of pts) { const dx = p.x - mx, dy = p.y - my; const t = dx * v1[0] + dy * v1[1]; const [QX, QY] = plot.toPx(mx + t * v1[0], my + t * v1[1]); ctx.beginPath(); ctx.fillStyle = '#3ddc91'; ctx.arc(QX, QY, 4, 0, 7); ctx.fill(); }
    ctx.beginPath(); ctx.fillStyle = '#fff'; ctx.arc(MX, MY, 4, 0, 7); ctx.fill();

    const tot = l1 + l2 || 1;
    $('ev1').textContent = (l1 / tot * 100).toFixed(0) + '%';
    $('ev2').textContent = (l2 / tot * 100).toFixed(0) + '%';
    const r = l1 / tot;
    $('msg').innerHTML = view === 'proj'
      ? `2D 점을 <b>PC1 하나</b>로 줄였어요(빨간 선=버린 정보). PC1만으로 전체 흩어짐의 <b>${(r * 100).toFixed(0)}%</b>를 보존 → 1차원으로도 거의 표현됩니다.`
      : r > 0.9 ? `데이터가 <b>한 방향(PC1)</b>으로 길쭉 → PC1이 분산의 <b>${(r * 100).toFixed(0)}%</b> 설명. 이 방향만 남기면 차원축소!`
        : `상관이 약해 두 방향에 고르게 퍼졌어요(PC1 ${(r * 100).toFixed(0)}%). 이럴 땐 1D로 줄이면 정보 손실이 큽니다.`;
  }

  el.querySelectorAll('.seg-b').forEach((b) => b.addEventListener('click', () => {
    el.querySelectorAll('.seg-b').forEach((x) => x.classList.remove('on')); b.classList.add('on'); view = b.dataset.v; draw();
  }));
  $('co').addEventListener('input', (e) => { corr = +e.target.value; $('vco').textContent = corr.toFixed(2); pts = genCloud(corr); draw(); });
  $('newd').addEventListener('click', () => { pts = genCloud(corr); draw(); });

  const ro = new ResizeObserver(() => draw());
  ro.observe(el.querySelector('.sim-canvas-wrap'));
  requestAnimationFrame(draw);

  return { el, destroy() { ro.disconnect(); el.remove(); } };
}
