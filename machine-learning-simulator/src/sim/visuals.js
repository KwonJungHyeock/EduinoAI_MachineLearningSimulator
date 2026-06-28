// 개념용 "움직이는" 시각자료 모음 — 자동 애니메이션 캔버스(상호작용 없음, 이해 보조).
// 각 create*는 mount에 붙이고 { el, destroy } 반환.
const COL = { blue: '#6fb7ff', green: '#3ddc91', teal: '#6fffd6', amber: '#ffb020', red: '#ff5a3c', gray: '#7a8aa3', text: '#e6edf7', mute: '#93a1b8' };

function canvasIn(mount, w, h) {
  const el = document.createElement('div');
  el.className = 'c-visual';
  const c = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = w * dpr; c.height = h * dpr;
  c.className = 'vis-canvas';
  c.style.aspectRatio = `${w} / ${h}`;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  el.appendChild(c);
  mount.appendChild(el);
  return { el, ctx, w, h };
}
function animate(draw) {
  let raf, t0 = performance.now();
  const f = (t) => { raf = requestAnimationFrame(f); draw((t - t0) / 1000); };
  raf = requestAnimationFrame(f);
  return () => cancelAnimationFrame(raf);
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function box(ctx, x, y, w, h, label, color, glow = 0) {
  ctx.save();
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
  rrect(ctx, x, y, w, h, 10);
  ctx.fillStyle = 'rgba(13,20,34,0.95)'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.stroke();
  ctx.restore();
  ctx.fillStyle = COL.text; ctx.font = '13px Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
}
function arrow(ctx, x0, x1, y, color) {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1 - 7, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 - 8, y - 4); ctx.lineTo(x1 - 8, y + 4); ctx.closePath(); ctx.fill();
}

// ── 벤다이어그램: AI ⊃ ML ⊃ DL ───────────────
export function createVenn(mount) {
  const { el, ctx, w, h } = canvasIn(mount, 620, 230);
  const stop = animate((t) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.32, cy = h / 2, br = 1 + 0.03 * Math.sin(t * 1.6);
    const ell = (rx, ry, fill, stroke) => { ctx.beginPath(); ctx.ellipse(cx, cy, rx * br, ry * br, 0, 0, 7); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke(); };
    ell(150, 100, 'rgba(111,183,255,0.10)', COL.blue);
    ell(104, 72, 'rgba(61,220,145,0.12)', COL.green);
    ell(58, 44, 'rgba(111,255,214,0.18)', COL.teal);
    ctx.textAlign = 'center'; ctx.font = 'bold 13px Pretendard';
    ctx.fillStyle = COL.blue; ctx.fillText('AI', cx, cy - 84);
    ctx.fillStyle = COL.green; ctx.fillText('머신러닝', cx, cy - 58);
    ctx.fillStyle = COL.teal; ctx.fillText('딥러닝', cx, cy + 2);
    // 범례
    const lx = w * 0.62; ctx.textAlign = 'left'; ctx.font = '13px Pretendard';
    [['AI', '인공지능 — 가장 넓은 개념', COL.blue], ['ML', '데이터로 학습하는 방법', COL.green], ['DL', '여러 층 신경망', COL.teal]].forEach((r, i) => {
      const y = cy - 36 + i * 34;
      ctx.fillStyle = r[2]; ctx.beginPath(); ctx.arc(lx, y, 6, 0, 7); ctx.fill();
      ctx.fillStyle = COL.text; ctx.fillText(r[0], lx + 16, y + 1);
      ctx.fillStyle = COL.mute; ctx.fillText(r[1], lx + 44, y + 1);
    });
  });
  return { el, destroy() { stop(); el.remove(); } };
}

// ── 전통 프로그래밍 vs 머신러닝 (흐르는 데이터) ─────
export function createRulesVsLearn(mount) {
  const { el, ctx, w, h } = canvasIn(mount, 660, 270);
  function panel(x0, pw, title, labels, color, t, model) {
    ctx.fillStyle = color; ctx.font = 'bold 14px Pretendard'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, x0 + 8, 26);
    const bw = pw * 0.27, bh = 46, y = h * 0.45;
    const xs = [x0 + 6, x0 + pw / 2 - bw / 2, x0 + pw - bw - 6];
    for (let i = 0; i < 3; i++) box(ctx, xs[i], y, bw, bh, labels[i], color);
    arrow(ctx, xs[0] + bw, xs[1], y + bh / 2, COL.mute);
    arrow(ctx, xs[1] + bw, xs[2], y + bh / 2, COL.mute);
    // 흐르는 점
    const p = (t * 0.45) % 1.0;
    const total = xs[2] + bw - (xs[0]);
    const dx = xs[0] + p * total;
    ctx.beginPath(); ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.arc(dx, y + bh / 2, 6, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    if (model) { // 모델 박스 안에 형성되는 선
      const mx = xs[2], my = y; const prog = Math.min(1, p * 1.4);
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(mx + 8, my + bh - 8); ctx.lineTo(mx + 8 + (bw - 16) * prog, my + 8 + (bh - 16) * (1 - prog)); ctx.stroke();
    }
  }
  const stop = animate((t) => {
    ctx.clearRect(0, 0, w, h);
    panel(0, w / 2 - 8, '전통 프로그래밍', ['입력', '규칙(코드)', '출력'], COL.blue, t, false);
    ctx.strokeStyle = 'rgba(40,60,92,0.6)'; ctx.beginPath(); ctx.moveTo(w / 2, 14); ctx.lineTo(w / 2, h - 14); ctx.stroke();
    panel(w / 2 + 8, w / 2 - 8, '머신러닝', ['데이터+정답', '학습', '모델'], COL.green, t, true);
    ctx.fillStyle = COL.mute; ctx.font = '12px Pretendard'; ctx.textAlign = 'center';
    ctx.fillText('규칙을 사람이 직접', w / 4, h - 12);
    ctx.fillText('규칙(모델)을 데이터로 학습', w * 0.75, h - 12);
  });
  return { el, destroy() { stop(); el.remove(); } };
}

// ── 학습의 종류(지도/비지도/강화) ─────────────
export function createLearnTypes(mount) {
  const { el, ctx, w, h } = canvasIn(mount, 690, 240);
  const sup = [{ x: -50, y: -20 }, { x: -30, y: 20 }, { x: -10, y: -30 }, { x: 20, y: 10 }, { x: 40, y: -10 }, { x: 55, y: 30 }];
  const stop = animate((t) => {
    ctx.clearRect(0, 0, w, h);
    const pw = w / 3, cyc = h * 0.56;
    const title = (x, txt, col) => { ctx.fillStyle = col; ctx.font = 'bold 13px Pretendard'; ctx.textAlign = 'center'; ctx.fillText(txt, x, 24); };
    // 지도: x>0 주황, x<0 파랑 (스윕 reveal)
    let cx = pw / 2; title(cx, '지도학습', COL.green);
    const rev = (Math.sin(t * 0.8) * 0.5 + 0.5) * 120 - 60;
    sup.forEach((p) => { const x = cx + p.x, y = cyc + p.y; const shown = p.x < rev; ctx.beginPath(); ctx.fillStyle = !shown ? COL.gray : p.x < 0 ? COL.blue : COL.amber; ctx.arc(x, y, 7, 0, 7); ctx.fill(); });
    ctx.fillStyle = COL.mute; ctx.font = '11px Pretendard'; ctx.fillText('정답대로 분류', cx, h - 12);
    // 비지도: 두 군집으로 드리프트
    cx = pw * 1.5; title(cx, '비지도학습', '#b39bff');
    const c1 = { x: cx - 34, y: cyc }, c2 = { x: cx + 34, y: cyc };
    [c1, c2].forEach((c) => { ctx.strokeStyle = 'rgba(179,155,255,0.5)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(c.x, c.y, 30, 0, 7); ctx.stroke(); ctx.setLineDash([]); });
    for (let i = 0; i < 8; i++) { const c = i < 4 ? c1 : c2; const a = i * 1.7 + t * 0.6; const r = 16 + 6 * Math.sin(t + i); ctx.beginPath(); ctx.fillStyle = '#b39bff'; ctx.arc(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, 6, 0, 7); ctx.fill(); }
    ctx.fillStyle = COL.mute; ctx.fillText('스스로 그룹 발견', cx, h - 12);
    // 강화: 에이전트가 보상(별)로 이동
    cx = pw * 2.5; title(cx, '강화학습', COL.amber);
    const sx = cx - 50, ex = cx + 50; const p = (t * 0.5) % 1.2; const ax = sx + Math.min(1, p) * (ex - sx);
    ctx.strokeStyle = 'rgba(120,140,175,0.4)'; ctx.beginPath(); ctx.moveTo(sx, cyc); ctx.lineTo(ex, cyc); ctx.stroke();
    ctx.font = '20px Pretendard'; ctx.fillText('⭐', ex, cyc + 7);
    ctx.beginPath(); ctx.fillStyle = COL.amber; ctx.shadowColor = COL.amber; ctx.shadowBlur = 10; ctx.arc(ax, cyc, 8, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    if (p > 1) { ctx.fillStyle = COL.green; ctx.font = 'bold 13px Pretendard'; ctx.fillText('+1 보상!', cx, cyc - 26); }
    ctx.fillStyle = COL.mute; ctx.font = '11px Pretendard'; ctx.fillText('보상 최대화', cx, h - 12);
  });
  return { el, destroy() { stop(); el.remove(); } };
}

// ── 과적합: 흔들리는 곡선 vs 안정한 직선 ──────────
export function createOverfit(mount) {
  const { el, ctx, w, h } = canvasIn(mount, 620, 260);
  const pts = [{ x: 1, y: 2.2 }, { x: 2.5, y: 2.0 }, { x: 4, y: 3.4 }, { x: 5.5, y: 2.9 }, { x: 7, y: 4.2 }, { x: 8.5, y: 3.8 }];
  const X0 = 50, X1 = w - 20, Y0 = h - 40, Y1 = 30;
  const px = (x) => X0 + (x / 10) * (X1 - X0);
  const py = (y) => Y0 + (y / 6) * (Y1 - Y0);
  const stop = animate((t) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,140,175,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X0, Y1); ctx.lineTo(X0, Y0); ctx.lineTo(X1, Y0); ctx.stroke();
    // 좋은 적합(직선)
    ctx.strokeStyle = COL.green; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(px(0), py(2.0)); ctx.lineTo(px(10), py(4.4)); ctx.stroke();
    // 과적합(흔들리는 곡선)
    const amp = 0.55 * (0.6 + 0.4 * Math.sin(t * 2));
    ctx.strokeStyle = COL.red; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 0; x <= 10; x += 0.1) { const base = 2.0 + 0.24 * x; const y = base + amp * Math.sin(x * 2.4 + t * 1.5); const X = px(x), Y = py(y); x === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
    ctx.stroke();
    // 점
    pts.forEach((p) => { ctx.beginPath(); ctx.fillStyle = COL.blue; ctx.arc(px(p.x), py(p.y), 6, 0, 7); ctx.fill(); });
    // 범례
    ctx.font = '12px Pretendard'; ctx.textAlign = 'left';
    ctx.fillStyle = COL.green; ctx.fillText('● 좋은 적합 (단순·일반화 ↑)', X0 + 6, Y1 - 6);
    ctx.fillStyle = COL.red; ctx.fillText('● 과적합 (훈련만 완벽·새 데이터 ↓)', X0 + 210, Y1 - 6);
  });
  return { el, destroy() { stop(); el.remove(); } };
}

// ── 데이터 표: 특징 vs 라벨 강조(DOM) ───────────
export function createFeatureTable(mount) {
  const el = document.createElement('div');
  el.className = 'c-visual feat-wrap';
  const rows = [
    ['학생 A', '5h', '90%', '7h', '합격'],
    ['학생 B', '1h', '60%', '5h', '불합격'],
    ['학생 C', '3h', '80%', '6h', '합격'],
  ];
  el.innerHTML = `
    <table class="ftbl">
      <thead><tr>
        <th class="id">샘플</th><th class="feat">공부시간</th><th class="feat">출석률</th><th class="feat">수면</th><th class="label">시험결과</th>
      </tr></thead>
      <tbody>${rows.map((r) => `<tr>
        <td class="id">${r[0]}</td><td class="feat">${r[1]}</td><td class="feat">${r[2]}</td><td class="feat">${r[3]}</td><td class="label">${r[4]}</td>
      </tr>`).join('')}</tbody>
    </table>
    <div class="feat-cap"></div>`;
  mount.appendChild(el);
  const tbl = el.querySelector('.ftbl'), cap = el.querySelector('.feat-cap');
  let s = 0;
  const tick = () => {
    s ^= 1;
    tbl.dataset.hl = s ? 'feat' : 'label';
    cap.innerHTML = s
      ? '<b style="color:#6fb7ff">특징(Feature)</b> — 예측에 쓰는 입력 열 · 한 행 = 한 <b>샘플</b>'
      : '<b style="color:#3ddc91">라벨(Label)</b> — 맞히고 싶은 정답 열 (지도학습)';
  };
  tick();
  const iv = setInterval(tick, 1900);
  return { el, destroy() { clearInterval(iv); el.remove(); } };
}
