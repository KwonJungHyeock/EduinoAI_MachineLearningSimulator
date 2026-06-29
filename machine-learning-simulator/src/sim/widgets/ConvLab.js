// 합성곱(CNN) 맛보기 실험실 — 작은 그림에 3×3 필터(커널)를 미끄러뜨려
// 특징 맵을 만든다. 같은 필터가 어디서든 같은 특징(에지 등)을 찾는 걸 본다. (라이브러리 X)

const N = 9; // 입력 그리드
const KERNELS = {
  vedge: { name: '세로 에지', k: [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]], signed: true },
  hedge: { name: '가로 에지', k: [[-1, -1, -1], [0, 0, 0], [1, 1, 1]], signed: true },
  blur: { name: '블러(흐림)', k: [[1, 1, 1], [1, 1, 1], [1, 1, 1]].map((r) => r.map((v) => v / 9)), signed: false },
  sharpen: { name: '샤픈(또렷)', k: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]], signed: false },
};
// 손글씨 'ㅁ'/네모 비슷한 기본 그림
function sampleGrid() {
  const g = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let i = 2; i <= 6; i++) { g[2][i] = 1; g[6][i] = 1; g[i][2] = 1; g[i][6] = 1; }
  return g;
}

export default function createConvLab(mount, opts = {}) {
  const el = document.createElement('div');
  el.className = 'sim-lab';
  el.innerHTML = `
    ${opts.intro ? `<p class="sim-intro">${opts.intro}</p>` : ''}
    ${opts.steps ? `<ol class="sim-steps">${opts.steps.map((s) => `<li>${s}</li>`).join('')}</ol>` : ''}
    <div class="sim-grid">
      <div class="sim-canvas-wrap"><canvas class="sim-canvas"></canvas></div>
      <aside class="sim-side">
        <div class="sim-knobs">
          <div class="knob place"><label>필터(커널) 선택</label>
            <div class="seg seg2x2"><button class="seg-b on" data-k="vedge">세로 에지</button><button class="seg-b" data-k="hedge">가로 에지</button><button class="seg-b" data-k="blur">블러</button><button class="seg-b" data-k="sharpen">샤픈</button></div>
          </div>
        </div>
        <div class="side-info" id="kview"></div>
        <div class="side-info" id="msg"></div>
        <div class="sim-btns"><button class="btn ghost" id="sample">기본 그림</button><button class="btn ghost" id="clear">지우기</button></div>
        <div class="side-hint">왼쪽 그림을 <b>드래그</b>해 칠하세요(우클릭=지움). 같은 3×3 필터가 전체를 훑어 오른쪽 특징 맵을 만듭니다.</div>
      </aside>
    </div>`;
  mount.appendChild(el);

  const canvas = el.querySelector('.sim-canvas');
  const ctx = canvas.getContext('2d');
  const $ = (id) => el.querySelector('#' + id);

  let grid = sampleGrid();
  let kern = 'vedge';
  let painting = 0; // 0=없음, 1=칠, -1=지움

  function convolve() {
    const K = KERNELS[kern].k, out = Array.from({ length: N - 2 }, () => new Array(N - 2).fill(0));
    for (let r = 1; r < N - 1; r++) for (let c = 1; c < N - 1; c++) {
      let s = 0; for (let a = -1; a <= 1; a++) for (let bb = -1; bb <= 1; bb++) s += grid[r + a][c + bb] * K[a + 1][bb + 1];
      out[r - 1][c - 1] = s;
    }
    return out;
  }

  // 레이아웃: 왼쪽 입력 그리드 + 오른쪽 특징 맵
  let geom = null;
  function fit() {
    const wrap = el.querySelector('.sim-canvas-wrap');
    const cw = Math.max(320, wrap.clientWidth | 0), ch = Math.max(280, (wrap.clientHeight | 0) || (cw * 0.6) | 0);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  }
  function draw() {
    fit();
    const W = canvas.width, Hc = canvas.height;
    ctx.fillStyle = '#0c1422'; ctx.fillRect(0, 0, W, Hc);
    const gap = 28, half = (W - gap - 32) / 2, cell = Math.min(half / N, (Hc - 64) / N);
    const gw = cell * N;
    const lx = (W / 2 - gap / 2) - gw - 2, ly = (Hc - gw) / 2 + 8;
    const ox = (W / 2 + gap / 2) + 2;
    const oCell = gw / (N - 2), oy = (Hc - oCell * (N - 2)) / 2 + 8;
    geom = { lx, ly, cell };
    // 제목
    ctx.fillStyle = '#93a1b8'; ctx.font = '13px Pretendard'; ctx.textAlign = 'center';
    ctx.fillText('입력 그림 (드래그해 그리기)', lx + gw / 2, ly - 12);
    ctx.fillText('특징 맵 (필터 통과 결과)', ox + oCell * (N - 2) / 2, oy - 12);
    // 입력
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const v = grid[r][c]; ctx.fillStyle = v ? '#e8eefc' : '#111b2d';
      ctx.fillRect(lx + c * cell, ly + r * cell, cell - 1, cell - 1);
    }
    // 특징 맵
    const out = convolve(), signed = KERNELS[kern].signed;
    let mx = 0.001; for (const row of out) for (const v of row) mx = Math.max(mx, Math.abs(v));
    for (let r = 0; r < N - 2; r++) for (let c = 0; c < N - 2; c++) {
      const v = out[r][c]; let col;
      if (signed) { const t = Math.max(-1, Math.min(1, v / mx)); col = t >= 0 ? `rgba(61,220,145,${t})` : `rgba(255,90,60,${-t})`; ctx.fillStyle = '#0e1626'; ctx.fillRect(ox + c * oCell, oy + r * oCell, oCell - 1, oCell - 1); ctx.fillStyle = col; }
      else { const t = Math.max(0, Math.min(1, v / mx)); col = `rgba(232,238,252,${t})`; ctx.fillStyle = '#111b2d'; ctx.fillRect(ox + c * oCell, oy + r * oCell, oCell - 1, oCell - 1); ctx.fillStyle = col; }
      ctx.fillRect(ox + c * oCell, oy + r * oCell, oCell - 1, oCell - 1);
    }
    // 커널 표 + 설명
    const K = KERNELS[kern].k;
    $('kview').innerHTML = '<b>3×3 커널</b><br>' + K.map((row) => row.map((x) => (Math.round(x * 100) / 100)).join('&nbsp;&nbsp;')).join('<br>');
    $('msg').innerHTML = {
      vedge: '<b>세로 에지</b> 필터: 좌우 밝기 차가 큰 곳(세로선)에서 강하게 반응해요.',
      hedge: '<b>가로 에지</b> 필터: 위아래 밝기 차가 큰 곳(가로선)을 찾습니다.',
      blur: '<b>블러</b>: 주변 9칸 평균 → 경계가 부드러워집니다.',
      sharpen: '<b>샤픈</b>: 중심을 강조하고 주변을 빼 윤곽을 또렷하게.',
    }[kern];
  }

  function cellAt(ev) { if (!geom) return null; const r = canvas.getBoundingClientRect(); const px = (ev.clientX - r.left) / r.width * canvas.width, py = (ev.clientY - r.top) / r.height * canvas.height; const c = Math.floor((px - geom.lx) / geom.cell), row = Math.floor((py - geom.ly) / geom.cell); if (row < 0 || row >= N || c < 0 || c >= N) return null; return [row, c]; }
  canvas.addEventListener('pointerdown', (ev) => { const rc = cellAt(ev); if (!rc) return; painting = ev.button === 2 ? -1 : 1; grid[rc[0]][rc[1]] = painting > 0 ? 1 : 0; draw(); });
  canvas.addEventListener('pointermove', (ev) => { if (!painting) return; const rc = cellAt(ev); if (!rc) return; grid[rc[0]][rc[1]] = painting > 0 ? 1 : 0; draw(); });
  const onUp = () => (painting = 0);
  window.addEventListener('pointerup', onUp);
  canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());

  el.querySelectorAll('.seg-b').forEach((b) => b.addEventListener('click', () => { el.querySelectorAll('.seg-b').forEach((x) => x.classList.remove('on')); b.classList.add('on'); kern = b.dataset.k; draw(); }));
  $('sample').addEventListener('click', () => { grid = sampleGrid(); draw(); });
  $('clear').addEventListener('click', () => { grid = Array.from({ length: N }, () => new Array(N).fill(0)); draw(); });

  const ro = new ResizeObserver(() => draw());
  ro.observe(el.querySelector('.sim-canvas-wrap'));
  requestAnimationFrame(draw);

  return { el, destroy() { window.removeEventListener('pointerup', onUp); ro.disconnect(); el.remove(); } };
}
