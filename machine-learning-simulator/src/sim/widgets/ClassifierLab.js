// 분류 실험실 — 2클래스 점을 찍고 모델의 "결정경계"를 실시간으로 본다.
// model: 'logistic' | 'knn' | 'tree' | 'svm'. opts.sandbox=true면 모델을 즉석에서 바꿔 비교.
import Plot from '../Plot.js';

const C0 = '#6fb7ff', C1 = '#ffb020';
const SAMPLE = [
  [2, 3, 0], [3, 2, 0], [2.5, 3.6, 0], [3.6, 2.6, 0], [2, 2, 0], [4, 3.2, 0], [3, 4, 0],
  [7, 8, 1], [8, 7, 1], [7.4, 7, 1], [8, 8, 1], [6.6, 7.6, 1], [8.2, 6.6, 1], [7, 6.4, 1],
].map(([x, y, c]) => ({ x, y, c }));

const sig = (z) => 1 / (1 + Math.exp(-z));
const nx = (x) => (x - 5) / 5;
const MODEL_NAMES = { logistic: '로지스틱', knn: 'kNN', tree: '결정트리', svm: 'SVM' };

export default function createClassifierLab(mount, opts = {}) {
  let model = opts.model || 'logistic';
  const sandbox = !!opts.sandbox;
  const el = document.createElement('div');
  el.className = 'sim-lab';
  const knobHTML = (m) => ({
    knn: `<div class="knob"><label>이웃 수 k <b id="vk">5</b></label><input type="range" id="k" min="1" max="15" step="2" value="5"></div>`,
    tree: `<div class="knob"><label>트리 깊이 <b id="vd">3</b></label><input type="range" id="d" min="1" max="6" step="1" value="3"></div>`,
    svm: `<div class="knob"><label>C (마진 강도) <b id="vc">1.0</b></label><input type="range" id="cC" min="0.2" max="8" step="0.2" value="1"></div>`,
    logistic: '',
  }[m] || '');
  el.innerHTML = `
    ${opts.intro ? `<p class="sim-intro">${opts.intro}</p>` : ''}
    ${opts.steps ? `<ol class="sim-steps">${opts.steps.map((s) => `<li>${s}</li>`).join('')}</ol>` : ''}
    <div class="sim-grid">
      <div class="sim-canvas-wrap"><canvas class="sim-canvas"></canvas></div>
      <aside class="sim-side">
        <div class="sim-stats"><div class="stat big"><span>정확도</span><b id="acc">–</b></div></div>
        ${sandbox ? `<div class="sim-knobs"><div class="knob place"><label>모델 선택</label>
          <div class="seg seg2x2"><button class="seg-b on" data-m="logistic">로지스틱</button><button class="seg-b" data-m="knn">kNN</button><button class="seg-b" data-m="tree">결정트리</button><button class="seg-b" data-m="svm">SVM</button></div></div></div>` : ''}
        <div class="sim-knobs">
          <div class="knob place"><label>놓을 클래스</label>
            <div class="seg"><button class="seg-b cls on" data-c="0">🔵 클래스 0</button><button class="seg-b cls" data-c="1">🟠 클래스 1</button></div>
          </div>
          <div id="mknobs">${knobHTML(model)}</div>
        </div>
        <div class="side-info" id="msg"></div>
        <div class="sim-btns"><button class="btn ghost" id="sample">기본 데이터</button><button class="btn ghost" id="clear">모두 지우기</button></div>
        <div class="side-hint">캔버스 클릭 = 선택 클래스 점 추가 · 우클릭 = 삭제</div>
      </aside>
    </div>`;
  mount.appendChild(el);

  const canvas = el.querySelector('.sim-canvas');
  const ctx = canvas.getContext('2d');
  const plot = new Plot(canvas, { xRange: [0, 10], yRange: [0, 10] });
  const $ = (id) => el.querySelector('#' + id);

  let pts = SAMPLE.map((p) => ({ ...p }));
  let placeC = 0;
  let k = 5, depth = 3, C = 1;
  let lw = [0, 0], lb = 0;       // logistic
  let sw = [0, 0], sb = 0;       // svm
  let tree = null;
  let raf = 0, running = false;

  // ── 모델들 ──
  function logiStep() {
    const lr = 0.25, lam = 0.001;
    let g0 = 0, g1 = 0, gb = 0;
    for (const p of pts) { const z = lw[0] * nx(p.x) + lw[1] * nx(p.y) + lb; const e = sig(z) - p.c; g0 += e * nx(p.x); g1 += e * nx(p.y); gb += e; }
    const n = pts.length || 1;
    lw[0] -= lr * (g0 / n + lam * lw[0]); lw[1] -= lr * (g1 / n + lam * lw[1]); lb -= lr * (gb / n);
  }
  function svmStep() {
    const lr = 0.05;
    let dw0 = sw[0] / Math.max(1, C), dw1 = sw[1] / Math.max(1, C), db = 0;
    for (const p of pts) { const yi = p.c ? 1 : -1; const m = yi * (sw[0] * nx(p.x) + sw[1] * nx(p.y) + sb); if (m < 1) { dw0 -= yi * nx(p.x); dw1 -= yi * nx(p.y); db -= yi; } }
    sw[0] -= lr * dw0; sw[1] -= lr * dw1; sb -= lr * db;
  }
  function knnPredict(x, y) {
    const ds = pts.map((p) => ({ d: (p.x - x) ** 2 + (p.y - y) ** 2, c: p.c })).sort((a, b) => a.d - b.d);
    let s = 0, kk = Math.min(k, ds.length); for (let i = 0; i < kk; i++) s += ds[i].c;
    return s / kk;
  }
  function gini(arr) { if (!arr.length) return 0; const p = arr.reduce((a, b) => a + b.c, 0) / arr.length; return 1 - p * p - (1 - p) ** 2; }
  function buildTree(rows, dep) {
    const ones = rows.reduce((a, b) => a + b.c, 0);
    const maj = ones >= rows.length - ones ? 1 : 0;
    if (dep === 0 || rows.length < 3 || ones === 0 || ones === rows.length) return { leaf: maj };
    let best = null;
    for (const f of ['x', 'y']) {
      const vals = [...new Set(rows.map((r) => r[f]))].sort((a, b) => a - b);
      for (let i = 0; i < vals.length - 1; i++) {
        const thr = (vals[i] + vals[i + 1]) / 2;
        const L = rows.filter((r) => r[f] <= thr), Rr = rows.filter((r) => r[f] > thr);
        if (!L.length || !Rr.length) continue;
        const g = (L.length * gini(L) + Rr.length * gini(Rr)) / rows.length;
        if (!best || g < best.g) best = { g, f, thr, L, R: Rr };
      }
    }
    if (!best) return { leaf: maj };
    return { f: best.f, thr: best.thr, left: buildTree(best.L, dep - 1), right: buildTree(best.R, dep - 1) };
  }
  const treePredict = (node, x, y) => node.leaf !== undefined ? node.leaf : ((node.f === 'x' ? x : y) <= node.thr ? treePredict(node.left, x, y) : treePredict(node.right, x, y));

  function predictProb(x, y) {
    if (model === 'knn') return knnPredict(x, y);
    if (model === 'tree') return tree ? treePredict(tree, x, y) : 0.5;
    if (model === 'svm') return sig(2 * (sw[0] * nx(x) + sw[1] * nx(y) + sb));
    return sig(lw[0] * nx(x) + lw[1] * nx(y) + lb);
  }
  function retrain() { if (model === 'tree') tree = buildTree(pts, depth); }
  function accuracy() { if (!pts.length) return 0; let ok = 0; for (const p of pts) if ((predictProb(p.x, p.y) >= 0.5 ? 1 : 0) === p.c) ok++; return ok / pts.length; }

  function fit() {
    const wrap = el.querySelector('.sim-canvas-wrap');
    const cw = Math.max(320, wrap.clientWidth | 0), ch = Math.max(280, (wrap.clientHeight | 0) || (cw * 0.7) | 0);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  }
  function draw() {
    fit();
    plot.clear();
    const N = 56;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x = (i + 0.5) / N * 10, y = (j + 0.5) / N * 10;
      const p = predictProb(x, y);
      const conf = Math.abs(p - 0.5) * 2;
      const col = p >= 0.5 ? C1 : C0;
      const [px0, py0] = plot.toPx(i / N * 10, (j + 1) / N * 10);
      const [px1, py1] = plot.toPx((i + 1) / N * 10, j / N * 10);
      ctx.fillStyle = col; ctx.globalAlpha = 0.10 + conf * 0.32;
      ctx.fillRect(px0, py0, px1 - px0 + 1, py1 - py0 + 1);
    }
    ctx.globalAlpha = 1;
    plot.grid(); plot.axes('특징 1', '특징 2');
    if (model === 'svm' && (sw[0] || sw[1])) {
      for (const lvl of [-1, 0, 1]) {
        ctx.strokeStyle = lvl === 0 ? '#fff' : 'rgba(255,255,255,.4)'; ctx.lineWidth = lvl === 0 ? 2 : 1; ctx.setLineDash(lvl === 0 ? [] : [5, 5]);
        ctx.beginPath(); let started = false;
        for (let xi = 0; xi <= 10; xi += 0.2) { const ny = -(sw[0] * nx(xi) + sb - lvl) / (sw[1] || 1e-6); const yy = ny * 5 + 5; const [X, Y] = plot.toPx(xi, yy); if (yy < -2 || yy > 12) { started = false; continue; } started ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); started = true; }
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    for (const p of pts) {
      const [X, Y] = plot.toPx(p.x, p.y);
      ctx.beginPath(); ctx.fillStyle = p.c ? C1 : C0; ctx.arc(X, Y, 7, 0, 7); ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.stroke();
    }
    $('acc').textContent = (accuracy() * 100).toFixed(0) + '%';
    msg();
  }
  function msg() {
    const m = {
      logistic: '직선 경계로 두 클래스를 가릅니다. 비선형으로 섞으면 정확도가 떨어져요(직선 한계).',
      knn: `가까운 <b>${k}개</b> 이웃의 다수결. k가 작으면 경계가 우툴두툴(과적합), 크면 부드러워요.`,
      tree: `세로/가로 <b>직선 분할</b>로 영역을 나눕니다. 깊이를 키우면 더 잘게 → 과적합.`,
      svm: '흰 실선=경계, 점선=<b>마진</b>. 마진을 최대로 벌립니다(가장 든든한 경계).',
    }[model];
    $('msg').innerHTML = (sandbox ? `<b>${MODEL_NAMES[model]}</b> · ` : '') + m;
  }

  // 클래스 선택
  el.querySelectorAll('.seg-b.cls').forEach((b) => b.addEventListener('click', () => {
    el.querySelectorAll('.seg-b.cls').forEach((x) => x.classList.remove('on')); b.classList.add('on'); placeC = +b.dataset.c;
  }));
  // 모델별 노브 바인딩(샌드박스 전환 시 재호출)
  function bindKnobs() {
    if ($('k')) $('k').addEventListener('input', (e) => { k = +e.target.value; $('vk').textContent = k; draw(); });
    if ($('d')) $('d').addEventListener('input', (e) => { depth = +e.target.value; $('vd').textContent = depth; retrain(); draw(); });
    if ($('cC')) $('cC').addEventListener('input', (e) => { C = +e.target.value; $('vc').textContent = C.toFixed(1); });
  }
  bindKnobs();
  // 샌드박스: 모델 전환
  if (sandbox) el.querySelectorAll('.seg-b[data-m]').forEach((b) => b.addEventListener('click', () => {
    el.querySelectorAll('.seg-b[data-m]').forEach((x) => x.classList.remove('on')); b.classList.add('on');
    model = b.dataset.m; k = 5; depth = 3; C = 1;
    $('mknobs').innerHTML = knobHTML(model); bindKnobs();
    resetModel(); startLoop();
  }));

  $('sample').addEventListener('click', () => { pts = SAMPLE.map((p) => ({ ...p })); resetModel(); startLoop(); });
  $('clear').addEventListener('click', () => { pts = []; resetModel(); startLoop(); });
  function resetModel() { stopLoop(); lw = [0, 0]; lb = 0; sw = [0, 0]; sb = 0; retrain(); draw(); }

  function evToData(ev) { const r = canvas.getBoundingClientRect(); const px = (ev.clientX - r.left) / r.width * canvas.width; const py = (ev.clientY - r.top) / r.height * canvas.height; return plot.toData(px, py); }
  function near(x, y) { let bi = -1, bd = 0.4; pts.forEach((p, i) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; bi = i; } }); return bi; }
  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.button === 2) return;
    const [x, y] = evToData(ev);
    if (x < 0 || x > 10 || y < 0 || y > 10) return;
    pts.push({ x, y, c: placeC }); retrain(); draw();
  });
  canvas.addEventListener('contextmenu', (ev) => { ev.preventDefault(); const [x, y] = evToData(ev); const i = near(x, y); if (i >= 0) { pts.splice(i, 1); retrain(); draw(); } });

  function startLoop() {
    stopLoop(); retrain();
    if (model === 'logistic' || model === 'svm') {
      running = true;
      const loop = () => { if (!running) return; for (let i = 0; i < 3; i++) (model === 'svm' ? svmStep : logiStep)(); draw(); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    } else { requestAnimationFrame(draw); }
  }
  function stopLoop() { running = false; cancelAnimationFrame(raf); }

  startLoop();
  const ro = new ResizeObserver(() => draw());
  ro.observe(el.querySelector('.sim-canvas-wrap'));

  return { el, destroy() { stopLoop(); ro.disconnect(); el.remove(); } };
}
