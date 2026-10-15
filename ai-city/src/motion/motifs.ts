// author: eduino
// 트랙별 모션 모티프 — 그 기술의 '원리'를 움직임으로 보여 주는 추상 모션(코드 생성).
// 장소 · 사물 그림은 그리지 않는다(에셋 담당).
import type { MotifId } from '../data/districts';
import { seeded, rgba, type Draw } from './useCanvas';

const TAU = Math.PI * 2;
const ease = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// ── 머신러닝 기초: 점들이 기준선을 따라 두 무리로 갈라짐 ──
function split(color: string): Draw {
  const r = seeded(11);
  const g = () => (r() + r() + r() - 1.5) / 1.5; // 근사 정규분포
  const pts = Array.from({ length: 84 }, (_, i) => {
    const a = i % 2 === 0;
    return { a, x: (a ? 0.36 : 0.64) + g() * 0.13, y: (a ? 0.58 : 0.42) + g() * 0.16, ph: r() * TAU };
  });
  return (ctx, t, w, h) => {
    const cx = w / 2, cy = h / 2;
    const ang = -0.62 + Math.sin(t * 0.45) * 0.32;
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    // 한쪽 면 옅게
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.fillStyle = rgba(color, 0.06); ctx.fillRect(-w * 2, 0, w * 4, h * 2);
    ctx.restore();
    // 기준선
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 14;
    ctx.strokeStyle = rgba(color, 0.9); ctx.lineWidth = 1.6; ctx.beginPath();
    ctx.moveTo(cx - Math.cos(ang) * w, cy - Math.sin(ang) * w);
    ctx.lineTo(cx + Math.cos(ang) * w, cy + Math.sin(ang) * w); ctx.stroke(); ctx.restore();
    for (const p of pts) {
      const x = (p.x + Math.sin(t * 0.5 + p.ph) * 0.012) * w;
      const y = (p.y + Math.cos(t * 0.4 + p.ph) * 0.012) * h;
      const side = (x - cx) * nx + (y - cy) * ny > 0;
      const ok = side === p.a;
      ctx.beginPath(); ctx.arc(x, y, p.a ? 3 : 2.4, 0, TAU);
      if (p.a) { ctx.fillStyle = ok ? rgba(color, 0.95) : 'rgba(255,255,255,0.28)'; ctx.fill(); }
      else { ctx.strokeStyle = ok ? 'rgba(255,255,255,0.75)' : rgba(color, 0.45); ctx.lineWidth = 1.2; ctx.stroke(); }
    }
  };
}

// ── AI 영상처리: 픽셀 격자를 스캔하면 숫자 → 윤곽 → 탐지 상자 ──
function vision(color: string): Draw {
  let bx = 0.5, by = 0.5, bs = 0.2;
  return (ctx, t, w, h) => {
    const cs = Math.max(8, Math.round(w / 52));
    const cols = Math.ceil(w / cs), rows = Math.ceil(h / cs);
    const b1 = { x: 0.5 + Math.cos(t * 0.31) * 0.22, y: 0.52 + Math.sin(t * 0.47) * 0.18, s: 0.13 };
    const b2 = { x: 0.3 + Math.sin(t * 0.23 + 1) * 0.16, y: 0.4 + Math.cos(t * 0.37) * 0.2, s: 0.08 };
    const scan = (((t * 0.16 + 0.5) % 1.25) - 0.12) * w; // 시작부터 화면 절반쯤 스캔된 상태
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const u = (i + 0.5) / cols, v = (j + 0.5) / rows;
      const d1 = ((u - b1.x) ** 2) / (b1.s ** 2) + ((v - b1.y) * h / w) ** 2 / (b1.s ** 2);
      const d2 = ((u - b2.x) ** 2) / (b2.s ** 2) + ((v - b2.y) * h / w) ** 2 / (b2.s ** 2);
      const it = Math.exp(-d1) + Math.exp(-d2) * 0.7;
      const x = i * cs, y = j * cs;
      if (x < scan) {
        const q = Math.round(it * 4) / 4; // 양자화: 이미지는 숫자
        ctx.fillStyle = rgba(color, 0.05 + q * 0.55);
      } else ctx.fillStyle = `rgba(255,255,255,${0.03 + it * 0.3})`;
      ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
    }
    // 스캔 선
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
      const label = 'OBJECT';
      const lw = ctx.measureText(label).width + 12;
      ctx.fillStyle = rgba(color, 0.95); ctx.fillRect(X, Y - 18, lw, 16);
      ctx.fillStyle = '#05080d'; ctx.fillText(label, X + 6, Y - 6);
    }
  };
}

// ── 언어 모델: 토큰이 흐르다 단어 점 구름(임베딩)으로 뭉침 ──
function language(color: string): Draw {
  const words = ['도시', '의', '민원', '을', '분류', '해', '줘', '오늘', '날씨', '는', '어때', '버스', '언제', '와'];
  const r = seeded(23);
  const tokens: { x: number; w: string; k: number; y: number }[] = [];
  const parts: { x: number; y: number; c: number; a: number; r: number; life: number }[] = [];
  let lastT = 0, spawn = 0, idx = 0, seededFill = false;
  return (ctx, t, w, h) => {
    const dt = Math.min(0.05, t - lastT); lastT = t;
    const centers = [[0.76, 0.3], [0.86, 0.64], [0.64, 0.72]];
    if (!seededFill) { // 처음부터 단어 구름이 어느 정도 차 있게
      seededFill = true;
      for (let n = 0; n < 150; n++) { const c = n % 3; parts.push({ x: centers[c][0] * w, y: centers[c][1] * h, c, a: r() * TAU, r: 6 + r() * h * 0.11, life: 1 }); }
    }
    spawn -= dt;
    if (spawn <= 0) { tokens.push({ x: -40, w: words[idx % words.length], k: idx % 3, y: 0.42 + (r() - 0.5) * 0.1 }); idx++; spawn = 0.42; }
    // 구름 후광
    for (const [ux, uy] of centers) {
      const g = ctx.createRadialGradient(ux * w, uy * h, 0, ux * w, uy * h, h * 0.24);
      g.addColorStop(0, rgba(color, 0.14)); g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    ctx.font = '500 12px "Noto Sans KR Local", sans-serif';
    for (let i = tokens.length - 1; i >= 0; i--) {
      const tk = tokens[i];
      tk.x += dt * w * 0.16;
      const y = tk.y * h + Math.sin(tk.x * 0.02) * 4;
      if (tk.x > w * 0.52) {
        for (let n = 0; n < 7; n++) parts.push({ x: tk.x, y, c: tk.k, a: r() * TAU, r: 6 + r() * h * 0.11, life: 1 });
        tokens.splice(i, 1); continue;
      }
      const tw = ctx.measureText(tk.w).width + 14;
      ctx.strokeStyle = rgba(color, 0.85); ctx.lineWidth = 1; ctx.fillStyle = 'rgba(10,14,22,0.85)';
      ctx.beginPath(); ctx.roundRect(tk.x, y - 11, tw, 22, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillText(tk.w, tk.x + 7, y + 4);
    }
    while (parts.length > 260) parts.shift();
    for (const p of parts) {
      const [ux, uy] = centers[p.c];
      p.a += dt * 0.6;
      const tx = ux * w + Math.cos(p.a) * p.r, ty = uy * h + Math.sin(p.a) * p.r * 0.7;
      p.x += (tx - p.x) * 0.05; p.y += (ty - p.y) * 0.05;
      ctx.fillStyle = rgba(color, 0.85); ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, TAU); ctx.fill();
    }
  };
}

// ── 음성 AI: 파형이 스펙트로그램으로 펼쳐짐 ──
function voice(color: string): Draw {
  const cols: number[][] = [];
  const BANDS = 22;
  let acc = 0, lastT = 0;
  return (ctx, t, w, h) => {
    const dt = Math.min(0.05, t - lastT); lastT = t;
    const env = clamp01(0.55 + 0.45 * Math.sin(t * 1.7) * Math.sin(t * 0.6 + 1));
    const comps = [
      { f: 3 + Math.sin(t * 0.3) * 1.5, a: 0.55 }, { f: 9 + Math.sin(t * 0.21 + 2) * 3, a: 0.3 }, { f: 17 + Math.cos(t * 0.17) * 4, a: 0.16 }
    ];
    // 파형 (왼쪽)
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
    // 화살표
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([4, 5]); ctx.beginPath();
    ctx.moveTo(W1 + 8, mid); ctx.lineTo(w * 0.52, mid); ctx.stroke(); ctx.setLineDash([]);
    // 스펙트로그램 (오른쪽): 같은 성분에서 계산한 대역 세기
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
  };
}

// ── 데이터 예측: 시계열 선이 '지금'을 지나 예측 구간으로 이어짐 ──
function data(color: string): Draw {
  const hash = (k: number) => { const x = Math.sin(k * 127.1) * 43758.5453; return x - Math.floor(x); };
  const trend = (k: number) => 0.5 + 0.17 * Math.sin(k * 0.21) + 0.08 * Math.sin(k * 0.057 + 1);
  const val = (k: number) => trend(k) + (hash(Math.floor(k)) - 0.5) * 0.09;
  return (ctx, t, w, h) => {
    const N = 80, off = t * 5, dx = w / (N - 1), now = Math.floor(N * 0.68);
    const Y = (v: number) => h * 0.88 - v * h * 0.72;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, (h * i) / 5); ctx.lineTo(w, (h * i) / 5); ctx.stroke(); }
    const frac = off % 1, base = Math.floor(off);
    // 예측 범위(점점 넓어짐)
    ctx.fillStyle = rgba(color, 0.13); ctx.beginPath();
    for (let i = now; i < N; i++) ctx.lineTo((i - frac) * dx, Y(trend(base + i)) - (i - now) * h * 0.006);
    for (let i = N - 1; i >= now; i--) ctx.lineTo((i - frac) * dx, Y(trend(base + i)) + (i - now) * h * 0.006);
    ctx.fill();
    // 지나간 값 (실선)
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 10;
    ctx.strokeStyle = rgba(color, 0.95); ctx.lineWidth = 1.8; ctx.beginPath();
    for (let i = 0; i <= now; i++) { const x = (i - frac) * dx, y = Y(val(base + i)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
    // 예측 (점선)
    ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let i = now; i < N; i++) { const x = (i - frac) * dx, y = Y(trend(base + i)); i === now ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke(); ctx.setLineDash([]);
    // 지금
    const nx = (now - frac) * dx;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(nx, h * 0.08); ctx.lineTo(nx, h * 0.94); ctx.stroke();
    ctx.font = '600 11px "Space Grotesk", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('NOW', nx + 6, h * 0.12); ctx.fillText('FORECAST', nx + 6 + (w - nx) * 0.35, h * 0.12);
  };
}

// ── 피지컬 AI: 두 관절 팔이 움직이는 목표를 따라감(궤적) ──
function physical(color: string): Draw {
  const trail: [number, number][] = [];
  return (ctx, t, w, h) => {
    const s = Math.min(w, h);
    // 바닥 격자 (원근)
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    for (let i = -8; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(w / 2 + i * w * 0.02, h * 0.62); ctx.lineTo(w / 2 + i * w * 0.12, h); ctx.stroke(); }
    for (let j = 0; j < 5; j++) { const y = h * 0.62 + (h * 0.38) * ((j / 4) ** 1.6); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const base = [w * 0.3, h * 0.84], L1 = s * 0.42, L2 = s * 0.36;
    const tx = w * 0.6 + Math.cos(t * 0.8) * w * 0.17, ty = h * 0.42 + Math.sin(t * 1.6) * h * 0.16;
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
    // 목표
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(tx, ty, 9, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx - 14, ty); ctx.lineTo(tx + 14, ty); ctx.moveTo(tx, ty - 14); ctx.lineTo(tx, ty + 14); ctx.stroke();
    // 팔
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(color, 0.95); ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.lineTo(j1[0], j1[1]); ctx.lineTo(ee[0], ee[1]); ctx.stroke(); ctx.restore();
    for (const [x, y, r] of [[base[0], base[1], 9], [j1[0], j1[1], 6], [ee[0], ee[1], 5]]) {
      ctx.fillStyle = '#05080d'; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
    }
  };
}

// ── 생성형 AI: 노이즈가 단계마다 걷히며 형태가 나타남(디퓨전) ──
function generative(color: string): Draw {
  const r = seeded(37), M = 300;
  const noise = Array.from({ length: M }, () => [r(), r()]);
  const target = Array.from({ length: M }, (_, i) => {
    const th = (i / M) * TAU * 3, ring = i % 3;
    const R = ring === 0 ? 0.36 * (0.7 + 0.3 * Math.cos(5 * th)) : ring === 1 ? 0.22 : 0.1 * (1 + 0.4 * Math.sin(3 * th));
    return [0.5 + Math.cos(th) * R, 0.5 + Math.sin(th) * R];
  });
  return (ctx, t, w, h) => {
    const p = (t % 8) / 8;
    const k = p < 0.12 ? 0 : p < 0.6 ? ease((p - 0.12) / 0.48) : p < 0.86 ? 1 : 1 - ease((p - 0.86) / 0.14);
    const s = Math.min(w, h), ox = (w - s) / 2, oy = (h - s) / 2;
    const jit = (1 - k) * 0.03;
    for (let i = 0; i < M; i++) {
      const [nx, ny] = noise[i], [gx, gy] = target[i];
      const x = ox + (nx + (gx - nx) * k + Math.sin(t * 7 + i) * jit) * s;
      const y = oy + (ny + (gy - ny) * k + Math.cos(t * 6 + i * 1.3) * jit) * s;
      ctx.fillStyle = k > 0.5 ? rgba(color, 0.4 + k * 0.55) : `rgba(255,255,255,${0.25 + k * 0.4})`;
      ctx.beginPath(); ctx.arc(x, y, 1.4 + k * 0.6, 0, TAU); ctx.fill();
    }
    // 단계 표시 (걷힌 정도)
    const steps = 12, on = Math.round(k * steps);
    for (let i = 0; i < steps; i++) {
      ctx.fillStyle = i < on ? rgba(color, 0.9) : 'rgba(255,255,255,0.12)';
      ctx.fillRect(w * 0.5 - (steps * 10) / 2 + i * 10, h - 14, 7, 3);
    }
  };
}

const FACTORY: Record<MotifId, (c: string) => Draw> = { split, vision, language, voice, data, physical, generative };
export function createMotif(id: MotifId, color: string): Draw { return FACTORY[id](color); }
