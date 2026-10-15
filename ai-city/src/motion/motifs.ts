// author: eduino
// 트랙별 모션 모티프 — 그 기술의 '원리'를 움직임으로 보여 주는 추상 모션(코드 생성).
// 마우스를 올리면 그 원리를 학생이 직접 움직이는 방식으로 반응한다. 장소 · 사물 그림은 그리지 않는다(에셋 담당).
import type { MotifId } from '../data/districts';
import { seeded, rgba, type Draw } from './useCanvas';

const TAU = Math.PI * 2;
const ease = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const angLerp = (a: number, b: number, k: number) => { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return a + d * k; };

// 클릭하면 퍼지는 물결 (모든 모티프 공통)
function ripple(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, click: number) {
  if (click < 0) return;
  const r = 10 + click * 260, a = (1 - click / 1.2) * 0.55;
  ctx.strokeStyle = rgba(color, a); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
}

// ── 머신러닝 기초: 기준선이 점들을 두 무리로 가름 → 마우스 쪽으로 기준선을 돌려 볼 수 있음 ──
function split(color: string): Draw {
  const r = seeded(11);
  const g = () => (r() + r() + r() - 1.5) / 1.5; // 근사 정규분포
  const pts = Array.from({ length: 84 }, (_, i) => {
    const a = i % 2 === 0;
    return { a, x: (a ? 0.36 : 0.64) + g() * 0.13, y: (a ? 0.58 : 0.42) + g() * 0.16, ph: r() * TAU };
  });
  let ang = -0.62;
  return (ctx, t, w, h, p) => {
    const cx = w / 2, cy = h / 2;
    const auto = -0.62 + Math.sin(t * 0.45) * 0.32;
    const aim = Math.atan2(p.y - cy, p.x - cx);
    ang = angLerp(ang, p.in > 0.05 ? aim : auto, 0.12);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.fillStyle = rgba(color, 0.06); ctx.fillRect(-w * 2, 0, w * 4, h * 2);
    ctx.restore();
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 14;
    ctx.strokeStyle = rgba(color, 0.9); ctx.lineWidth = 1.6; ctx.beginPath();
    ctx.moveTo(cx - Math.cos(ang) * w, cy - Math.sin(ang) * w);
    ctx.lineTo(cx + Math.cos(ang) * w, cy + Math.sin(ang) * w); ctx.stroke(); ctx.restore();
    for (const q of pts) {
      const x = (q.x + Math.sin(t * 0.5 + q.ph) * 0.012) * w;
      const y = (q.y + Math.cos(t * 0.4 + q.ph) * 0.012) * h;
      const ok = ((x - cx) * nx + (y - cy) * ny > 0) === q.a;
      const lens = p.in * Math.exp(-((x - p.x) ** 2 + (y - p.y) ** 2) / 5000);
      ctx.beginPath(); ctx.arc(x, y, (q.a ? 3 : 2.4) + lens * 2, 0, TAU);
      if (q.a) { ctx.fillStyle = ok ? rgba(color, 0.95) : 'rgba(255,255,255,0.28)'; ctx.fill(); }
      else { ctx.strokeStyle = ok ? 'rgba(255,255,255,0.75)' : rgba(color, 0.45); ctx.lineWidth = 1.2; ctx.stroke(); }
    }
    ripple(ctx, color, p.x, p.y, p.click);
  };
}

// ── AI 영상처리: 스캔이 지나간 곳은 숫자(양자화)로 → 마우스가 스캔 선을 움직이고, 주변은 확대 렌즈 ──
function vision(color: string): Draw {
  let bx = 0.5, by = 0.5, bs = 0.2, scanX = -1;
  return (ctx, t, w, h, p) => {
    const cs = Math.max(8, Math.round(w / 52));
    const cols = Math.ceil(w / cs), rows = Math.ceil(h / cs);
    const b1 = { x: 0.5 + Math.cos(t * 0.31) * 0.22, y: 0.52 + Math.sin(t * 0.47) * 0.18, s: 0.13 };
    const b2 = { x: 0.3 + Math.sin(t * 0.23 + 1) * 0.16, y: 0.4 + Math.cos(t * 0.37) * 0.2, s: 0.08 };
    const auto = (((t * 0.16 + 0.5) % 1.25) - 0.12) * w;
    scanX = scanX < 0 ? auto : lerp(scanX, lerp(auto, p.x, p.in), 0.25);
    const scan = scanX;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const u = (i + 0.5) / cols, v = (j + 0.5) / rows;
      const d1 = ((u - b1.x) ** 2) / (b1.s ** 2) + ((v - b1.y) * h / w) ** 2 / (b1.s ** 2);
      const d2 = ((u - b2.x) ** 2) / (b2.s ** 2) + ((v - b2.y) * h / w) ** 2 / (b2.s ** 2);
      const it = Math.exp(-d1) + Math.exp(-d2) * 0.7;
      const x = i * cs, y = j * cs;
      const lens = p.in * Math.exp(-((x + cs / 2 - p.x) ** 2 + (y + cs / 2 - p.y) ** 2) / 9000);
      if (x < scan) {
        const q = Math.round(it * 4) / 4; // 양자화: 이미지는 숫자
        ctx.fillStyle = rgba(color, 0.05 + q * 0.55 + lens * 0.35);
      } else ctx.fillStyle = `rgba(255,255,255,${0.03 + it * 0.3 + lens * 0.12})`;
      const pad = 1 - lens * 0.8;
      ctx.fillRect(x + pad, y + pad, cs - pad * 2, cs - pad * 2);
    }
    const grad = ctx.createLinearGradient(scan - 90, 0, scan, 0);
    grad.addColorStop(0, rgba(color, 0)); grad.addColorStop(1, rgba(color, 0.22));
    ctx.fillStyle = grad; ctx.fillRect(scan - 90, 0, 90, h);
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 16;
    ctx.fillStyle = rgba(color, 0.95); ctx.fillRect(scan - 1, 0, 2, h); ctx.restore();
    // 탐지 상자: 스캔이 지나간 물체만
    const tx = b1.x * w, ty = b1.y * h, ts = b1.s * w * 1.25;
    bx += (tx - bx * w) / w * 0.12; by += (ty - by * h) / h * 0.12; bs += (ts - bs * w) / w * 0.12;
    if (scan > tx) {
      const X = bx * w - bs * w, Y = by * h - bs * w * 0.8, W = bs * w * 2, H = bs * w * 1.6, k = Math.min(18, W / 4);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2; ctx.beginPath();
      for (const [px, py, dx, dy] of [[X, Y, 1, 1], [X + W, Y, -1, 1], [X, Y + H, 1, -1], [X + W, Y + H, -1, -1]]) {
        ctx.moveTo(px + dx * k, py); ctx.lineTo(px, py); ctx.lineTo(px, py + dy * k);
      }
      ctx.stroke();
      ctx.font = '600 11px "Space Grotesk", sans-serif';
      const label = 'OBJECT', lw = ctx.measureText(label).width + 12;
      ctx.fillStyle = rgba(color, 0.95); ctx.fillRect(X, Y - 18, lw, 16);
      ctx.fillStyle = '#05080d'; ctx.fillText(label, X + 6, Y - 6);
    }
    ripple(ctx, color, p.x, p.y, p.click);
  };
}

// ── 언어 모델: 토큰이 흘러 단어 점 구름으로 → 마우스는 '질문', 가까운 구름일수록 주의(attention)가 굵게 ──
function language(color: string): Draw {
  const words = ['도시', '의', '민원', '을', '분류', '해', '줘', '오늘', '날씨', '는', '어때', '버스', '언제', '와'];
  const r = seeded(23);
  const tokens: { x: number; w: string; k: number; y: number }[] = [];
  const parts: { x: number; y: number; c: number; a: number; r: number }[] = [];
  let lastT = 0, spawn = 0, idx = 0, filled = false;
  return (ctx, t, w, h, p) => {
    const dt = Math.min(0.05, t - lastT); lastT = t;
    const centers = [[0.76, 0.3], [0.86, 0.64], [0.64, 0.72]];
    if (!filled) {
      filled = true;
      for (let n = 0; n < 150; n++) { const c = n % 3; parts.push({ x: centers[c][0] * w, y: centers[c][1] * h, c, a: r() * TAU, r: 6 + r() * h * 0.11 }); }
    }
    spawn -= dt;
    if (spawn <= 0) { tokens.push({ x: -40, w: words[idx % words.length], k: idx % 3, y: 0.42 + (r() - 0.5) * 0.1 }); idx++; spawn = 0.42; }
    // 주의(attention): 마우스와 가까운 구름일수록 가중치가 큼 (softmax)
    const ds = centers.map(([ux, uy]) => Math.hypot(ux * w - p.x, uy * h - p.y));
    const ex = ds.map((d) => Math.exp(-d / (w * 0.12)));
    const sum = ex.reduce((a, b) => a + b, 0) || 1;
    const att = ex.map((e) => (e / sum) * p.in);
    centers.forEach(([ux, uy], i) => {
      const g = ctx.createRadialGradient(ux * w, uy * h, 0, ux * w, uy * h, h * (0.24 + att[i] * 0.12));
      g.addColorStop(0, rgba(color, 0.14 + att[i] * 0.25)); g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      if (att[i] > 0.02) {
        ctx.strokeStyle = rgba(color, Math.min(0.9, att[i] * 1.2)); ctx.lineWidth = 0.5 + att[i] * 4;
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        ctx.quadraticCurveTo((p.x + ux * w) / 2, Math.min(p.y, uy * h) - 30, ux * w, uy * h); ctx.stroke();
      }
    });
    ctx.font = '500 12px "Noto Sans KR Local", sans-serif';
    for (let i = tokens.length - 1; i >= 0; i--) {
      const tk = tokens[i];
      tk.x += dt * w * 0.16;
      const yy = lerp(tk.y * h, p.y, p.in * 0.35 * Math.exp(-((tk.x - p.x) ** 2) / 20000));
      const y = yy + Math.sin(tk.x * 0.02) * 4;
      if (tk.x > w * 0.52) {
        for (let n = 0; n < 7; n++) parts.push({ x: tk.x, y, c: tk.k, a: r() * TAU, r: 6 + r() * h * 0.11 });
        tokens.splice(i, 1); continue;
      }
      const tw = ctx.measureText(tk.w).width + 14;
      ctx.strokeStyle = rgba(color, 0.85); ctx.lineWidth = 1; ctx.fillStyle = 'rgba(10,14,22,0.85)';
      ctx.beginPath(); ctx.roundRect(tk.x, y - 11, tw, 22, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillText(tk.w, tk.x + 7, y + 4);
    }
    while (parts.length > 260) parts.shift();
    for (const q of parts) {
      const [ux, uy] = centers[q.c];
      q.a += dt * (0.6 + att[q.c] * 2.4);
      const tx = ux * w + Math.cos(q.a) * q.r, ty = uy * h + Math.sin(q.a) * q.r * 0.7;
      q.x += (tx - q.x) * 0.05; q.y += (ty - q.y) * 0.05;
      ctx.fillStyle = rgba(color, 0.6 + att[q.c] * 0.4); ctx.beginPath(); ctx.arc(q.x, q.y, 1.8 + att[q.c] * 1.2, 0, TAU); ctx.fill();
    }
    ripple(ctx, color, p.x, p.y, p.click);
  };
}

// ── 음성 AI: 파형 → 스펙트로그램 → 마우스 높이 = 소리 크기, 좌우 = 음 높이 ──
function voice(color: string): Draw {
  const cols: number[][] = [];
  const BANDS = 22;
  let acc = 0, lastT = 0, envS = 0.6, pitchS = 1;
  return (ctx, t, w, h, p) => {
    const dt = Math.min(0.05, t - lastT); lastT = t;
    const autoEnv = clamp01(0.55 + 0.45 * Math.sin(t * 1.7) * Math.sin(t * 0.6 + 1));
    envS = lerp(envS, lerp(autoEnv, clamp01(1.15 - p.y / h), p.in), 0.2);
    pitchS = lerp(pitchS, lerp(1, 0.55 + (p.x / w) * 1.3, p.in), 0.15);
    const env = envS;
    const comps = [
      { f: (3 + Math.sin(t * 0.3) * 1.5) * pitchS, a: 0.55 }, { f: (9 + Math.sin(t * 0.21 + 2) * 3) * pitchS, a: 0.3 }, { f: (17 + Math.cos(t * 0.17) * 4) * pitchS, a: 0.16 }
    ];
    const W1 = w * 0.44, mid = h / 2;
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 10;
    ctx.strokeStyle = rgba(color, 0.95); ctx.lineWidth = 1.6; ctx.beginPath();
    for (let x = 0; x <= W1; x += 2) {
      const u = x / W1;
      let s = 0;
      for (const c of comps) s += c.a * Math.sin(TAU * c.f * u + t * 6 * (c.f / 9));
      const y = mid - s * env * h * 0.32 * Math.sin(Math.PI * u);
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke(); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([4, 5]); ctx.beginPath();
    ctx.moveTo(W1 + 8, mid); ctx.lineTo(w * 0.52, mid); ctx.stroke(); ctx.setLineDash([]);
    acc += dt;
    if (acc > 0.06) {
      acc = 0;
      cols.push(Array.from({ length: BANDS }, (_, b) => {
        let v = 0;
        for (const c of comps) { const center = (c.f / 22) * BANDS; v += c.a * Math.exp(-((b - center) ** 2) / 3); }
        return clamp01(v * env * 1.6);
      }));
      if (cols.length > 40) cols.shift();
    }
    const X0 = w * 0.55, SW = w * 0.42, cw = SW / 40, bh = (h * 0.76) / BANDS, Y0 = h * 0.12;
    cols.forEach((col, i) => col.forEach((v, b) => {
      ctx.fillStyle = rgba(color, 0.04 + v * 0.85);
      ctx.fillRect(X0 + i * cw, Y0 + (BANDS - 1 - b) * bh, cw - 1, bh - 1);
    }));
    ripple(ctx, color, p.x, p.y, p.click);
  };
}

// ── 데이터 예측: 지나간 값(실선)과 예측(점선) → 마우스로 '지금'을 옮기면 예측 구간이 바뀜 ──
function data(color: string): Draw {
  const hash = (k: number) => { const x = Math.sin(k * 127.1) * 43758.5453; return x - Math.floor(x); };
  const trend = (k: number) => 0.5 + 0.17 * Math.sin(k * 0.21) + 0.08 * Math.sin(k * 0.057 + 1);
  const val = (k: number) => trend(k) + (hash(Math.floor(k)) - 0.5) * 0.09;
  let nowS = -1;
  return (ctx, t, w, h, p) => {
    const N = 80, off = t * 5, dx = w / (N - 1);
    const autoNow = N * 0.68;
    nowS = nowS < 0 ? autoNow : lerp(nowS, lerp(autoNow, Math.max(8, Math.min(N - 6, p.x / dx)), p.in), 0.2);
    const now = Math.round(nowS);
    const Y = (v: number) => h * 0.88 - v * h * 0.72;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, (h * i) / 5); ctx.lineTo(w, (h * i) / 5); ctx.stroke(); }
    const frac = off % 1, base = Math.floor(off);
    ctx.fillStyle = rgba(color, 0.13); ctx.beginPath();
    for (let i = now; i < N; i++) ctx.lineTo((i - frac) * dx, Y(trend(base + i)) - (i - now) * h * 0.006);
    for (let i = N - 1; i >= now; i--) ctx.lineTo((i - frac) * dx, Y(trend(base + i)) + (i - now) * h * 0.006);
    ctx.fill();
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 10;
    ctx.strokeStyle = rgba(color, 0.95); ctx.lineWidth = 1.8; ctx.beginPath();
    for (let i = 0; i <= now; i++) { const x = (i - frac) * dx, y = Y(val(base + i)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
    ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let i = now; i < N; i++) { const x = (i - frac) * dx, y = Y(trend(base + i)); i === now ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke(); ctx.setLineDash([]);
    const nx = (now - frac) * dx, ny = Y(val(base + now));
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(nx, h * 0.08); ctx.lineTo(nx, h * 0.94); ctx.stroke();
    ctx.fillStyle = '#05080d'; ctx.strokeStyle = rgba(color, 1); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(nx, ny, 4.5, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.font = '600 11px "Space Grotesk", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('NOW', nx + 8, h * 0.12); ctx.fillText('FORECAST', nx + 8 + (w - nx) * 0.35, h * 0.12);
    ripple(ctx, color, p.x, p.y, p.click);
  };
}

// ── 피지컬 AI: 두 관절 팔이 목표를 따라감 → 마우스가 목표가 됨(역기구학) ──
function physical(color: string): Draw {
  const trail: [number, number][] = [];
  let txS = -1, tyS = -1;
  return (ctx, t, w, h, p) => {
    const s = Math.min(w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    for (let i = -8; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(w / 2 + i * w * 0.02, h * 0.62); ctx.lineTo(w / 2 + i * w * 0.12, h); ctx.stroke(); }
    for (let j = 0; j < 5; j++) { const y = h * 0.62 + (h * 0.38) * ((j / 4) ** 1.6); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const base = [w * 0.3, h * 0.84], L1 = s * 0.42, L2 = s * 0.36;
    const ax = w * 0.6 + Math.cos(t * 0.8) * w * 0.17, ay = h * 0.42 + Math.sin(t * 1.6) * h * 0.16;
    const gx = lerp(ax, p.x, p.in), gy = lerp(ay, p.y, p.in);
    txS = txS < 0 ? gx : lerp(txS, gx, 0.25); tyS = tyS < 0 ? gy : lerp(tyS, gy, 0.25);
    const tx = txS, ty = tyS;
    let dx = tx - base[0], dy = ty - base[1];
    let d = Math.hypot(dx, dy);
    const maxR = L1 + L2 - 1;
    if (d > maxR) { dx *= maxR / d; dy *= maxR / d; d = maxR; }
    const a2 = Math.acos(Math.max(-1, Math.min(1, (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2))));
    const a1 = Math.atan2(dy, dx) - Math.atan2(L2 * Math.sin(a2), L1 + L2 * Math.cos(a2));
    const j1 = [base[0] + Math.cos(a1) * L1, base[1] + Math.sin(a1) * L1];
    const ee = [j1[0] + Math.cos(a1 + a2) * L2, j1[1] + Math.sin(a1 + a2) * L2];
    trail.push([ee[0], ee[1]]); if (trail.length > 70) trail.shift();
    trail.forEach(([x, y], i) => { ctx.fillStyle = rgba(color, (i / trail.length) * 0.6); ctx.fillRect(x - 1.5, y - 1.5, 3, 3); });
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(tx, ty, 9, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx - 14, ty); ctx.lineTo(tx + 14, ty); ctx.moveTo(tx, ty - 14); ctx.lineTo(tx, ty + 14); ctx.stroke();
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(color, 0.95); ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.lineTo(j1[0], j1[1]); ctx.lineTo(ee[0], ee[1]); ctx.stroke(); ctx.restore();
    for (const [x, y, rr] of [[base[0], base[1], 9], [j1[0], j1[1], 6], [ee[0], ee[1], 5]]) {
      ctx.fillStyle = '#05080d'; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill(); ctx.stroke();
    }
    ripple(ctx, color, p.x, p.y, p.click);
  };
}

// ── 생성형 AI: 노이즈가 단계마다 걷히며 형태가 나타남(디퓨전) → 마우스 주변부터 노이즈가 걷힘(브러시) ──
function generative(color: string): Draw {
  const r = seeded(37), M = 300;
  const noise = Array.from({ length: M }, () => [r(), r()]);
  const target = Array.from({ length: M }, (_, i) => {
    const th = (i / M) * TAU * 3, ring = i % 3;
    const R = ring === 0 ? 0.36 * (0.7 + 0.3 * Math.cos(5 * th)) : ring === 1 ? 0.22 : 0.1 * (1 + 0.4 * Math.sin(3 * th));
    return [0.5 + Math.cos(th) * R, 0.5 + Math.sin(th) * R];
  });
  const kS = new Float32Array(M);
  return (ctx, t, w, h, p) => {
    const ph = (t % 8) / 8;
    const kg = ph < 0.12 ? 0 : ph < 0.6 ? ease((ph - 0.12) / 0.48) : ph < 0.86 ? 1 : 1 - ease((ph - 0.86) / 0.14);
    const s = Math.min(w, h), ox = (w - s) / 2, oy = (h - s) / 2;
    const sig = s * 0.2;
    let sum = 0;
    for (let i = 0; i < M; i++) {
      const [nx, ny] = noise[i], [gx, gy] = target[i];
      const txp = ox + gx * s, typ = oy + gy * s;
      const local = Math.exp(-((txp - p.x) ** 2 + (typ - p.y) ** 2) / (2 * sig * sig));
      const goal = lerp(kg, local, p.in);
      kS[i] = lerp(kS[i], goal, 0.12);
      const k = kS[i]; sum += k;
      const jit = (1 - k) * 0.03;
      const x = ox + (nx + (gx - nx) * k + Math.sin(t * 7 + i) * jit) * s;
      const y = oy + (ny + (gy - ny) * k + Math.cos(t * 6 + i * 1.3) * jit) * s;
      ctx.fillStyle = k > 0.5 ? rgba(color, 0.4 + k * 0.55) : `rgba(255,255,255,${0.25 + k * 0.4})`;
      ctx.beginPath(); ctx.arc(x, y, 1.4 + k * 0.6, 0, TAU); ctx.fill();
    }
    const steps = 12, on = Math.round((sum / M) * steps);
    for (let i = 0; i < steps; i++) {
      ctx.fillStyle = i < on ? rgba(color, 0.9) : 'rgba(255,255,255,0.12)';
      ctx.fillRect(w * 0.5 - (steps * 10) / 2 + i * 10, h - 14, 7, 3);
    }
    ripple(ctx, color, p.x, p.y, p.click);
  };
}

const FACTORY: Record<MotifId, (c: string) => Draw> = { split, vision, language, voice, data, physical, generative };
export function createMotif(id: MotifId, color: string): Draw { return FACTORY[id](color); }
