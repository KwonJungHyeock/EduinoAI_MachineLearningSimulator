// author: eduino
// 메인 화면 'AI 코어' — 뇌 모양 점 구름 + 신경 연결선 + 궤도 고리(코드로 생성하는 추상 모션).
// 인트로: intro() 가 0 → 1 로 가는 동안 흩어진 점들이 날아와 뇌 모양으로 모인다. 마우스 쪽으로 살짝 돌고, 가까운 점이 밝아진다.
import type { Draw } from './useCanvas';

const TAU = Math.PI * 2;
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

interface Pt { x: number; y: number; z: number; sx: number; sy: number; sz: number; d: number; c: number }
function brain(n: number): { pts: Pt[]; edges: [number, number][] } {
  const R = rng(11), pts: Pt[] = [];
  const add = (x: number, y: number, z: number, c: number) => {
    const a = R() * TAU, b = Math.acos(2 * R() - 1), r = 2.4 + R() * 1.2; // 인트로 시작 위치: 멀리 흩어진 구
    pts.push({ x, y, z, sx: r * Math.sin(b) * Math.cos(a), sy: r * Math.cos(b), sz: r * Math.sin(b) * Math.sin(a), d: R() * 0.45, c });
  };
  for (let i = 0; i < n; i++) {
    const k = R();
    if (k < 0.86) { // 대뇌 두 반구(좌우), 표면 주름
      const side = R() < 0.5 ? -1 : 1, u = R() * TAU, v = Math.acos(2 * R() - 1);
      const fold = 1 + 0.085 * Math.sin(9 * u + 2 * v) * Math.sin(7 * v) + 0.04 * Math.sin(17 * u);
      let x = 0.34 * Math.sin(v) * Math.cos(u) * fold, y = 0.4 * Math.cos(v) * fold, z = 0.56 * Math.sin(v) * Math.sin(u) * fold;
      if (y < -0.18) y = -0.18 + (y + 0.18) * 0.35; // 아래쪽은 납작하게
      x = Math.abs(x) * side + side * 0.06;
      if (Math.abs(x) < 0.12 && y > 0) y -= (0.12 - Math.abs(x)) * 0.9; // 가운데 세로 홈(좌우 반구 사이)
      add(x, y + 0.06, z, (z + 0.6) / 1.2);
    } else if (k < 0.96) { // 소뇌(뒤 아래)
      const u = R() * TAU, v = Math.acos(2 * R() - 1);
      add(0.26 * Math.sin(v) * Math.cos(u), -0.24 + 0.12 * Math.cos(v), -0.36 + 0.16 * Math.sin(v) * Math.sin(u), 0.1);
    } else { // 뇌줄기
      const a = R() * TAU, h = R();
      add(0.06 * Math.cos(a), -0.26 - h * 0.28, -0.16 + 0.06 * Math.sin(a) - h * 0.04, 0.3);
    }
  }
  const edges: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const near: [number, number][] = [];
    for (let j = 0; j < pts.length; j++) if (j !== i) { const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, dz = pts[i].z - pts[j].z, d = dx * dx + dy * dy + dz * dz; if (d < 0.006) near.push([d, j]); }
    near.sort((a, b) => a[0] - b[0]); for (const [, j] of near.slice(0, 2)) if (j > i) edges.push([i, j]);
  }
  return { pts, edges };
}

// tint(): 지금 강조할 지구 색(없으면 null) → 점 · 연결선 색이 그 색으로 서서히 물듦
export function createCore(intro: () => number, tint: () => string | null = () => null): Draw {
  const { pts, edges } = brain(1500);
  const proj = new Float32Array(pts.length * 3);
  const sig = Array.from({ length: 26 }, (_, i) => ({ e: (i * 97) % edges.length, s: i * 0.37 }));
  let rotY = 0, rotX = 0, mix = 0; const tc = [129, 140, 248];
  return (ctx, t, w, h, p) => {
    const want = tint();
    if (want) { const n = parseInt(want.slice(1), 16); tc[0] += (((n >> 16) & 255) - tc[0]) * 0.12; tc[1] += (((n >> 8) & 255) - tc[1]) * 0.12; tc[2] += ((n & 255) - tc[2]) * 0.12; }
    mix += ((want ? 0.75 : 0) - mix) * 0.08;
    const k = intro(), cx = w / 2, cy = h * 0.5, S = Math.min(w, h) * 0.5;
    // 받침대에서 올라오는 부드러운 빛(위로 갈수록 옅어짐)
    const bk = ease(k * 1.4 - 0.2);
    ctx.save(); ctx.translate(cx, h * 0.98); ctx.scale(1, 2.4);
    const beam = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.26);
    beam.addColorStop(0, `rgba(99,102,241,${0.34 * bk})`); beam.addColorStop(0.6, `rgba(99,102,241,${0.08 * bk})`); beam.addColorStop(1, 'rgba(99,102,241,0)');
    ctx.fillStyle = beam; ctx.beginPath(); ctx.arc(0, 0, w * 0.26, Math.PI, TAU); ctx.fill(); ctx.restore();
    // 회전: 천천히 돌고, 마우스 쪽으로 기움
    const tx = p.in ? (p.x / w - 0.5) * 0.9 : 0, ty = p.in ? (p.y / h - 0.5) * 0.5 : 0;
    rotY += ((0.55 + Math.sin(t * 0.3) * 0.45 + tx) - rotY) * 0.08; rotX += ((-0.42 + ty) - rotX) * 0.08; // 옆모습 쪽에서 천천히 흔들림 → 뇌 윤곽이 보이게
    const cyR = Math.cos(rotY), syR = Math.sin(rotY), cxR = Math.cos(rotX), sxR = Math.sin(rotX);
    for (let i = 0; i < pts.length; i++) {
      const q = pts[i], m = ease((k - q.d) / 0.55);
      let x = q.sx + (q.x - q.sx) * m, y = q.sy + (q.y - q.sy) * m, z = q.sz + (q.z - q.sz) * m;
      const x1 = x * cyR + z * syR, z1 = -x * syR + z * cyR; x = x1; z = z1;
      const y1 = y * cxR - z * sxR, z2 = y * sxR + z * cxR; y = y1; z = z2;
      const f = 2.6 / (2.6 + z);
      proj[i * 3] = cx + x * S * f; proj[i * 3 + 1] = cy - y * S * f; proj[i * 3 + 2] = z;
    }
    const form = ease((k - 0.45) / 0.5);
    // 연결선
    ctx.lineWidth = 1;
    for (const [a, b] of edges) {
      const za = (proj[a * 3 + 2] + proj[b * 3 + 2]) / 2, al = (0.06 + 0.3 * (0.6 - za)) * form;
      if (al <= 0.01) continue;
      ctx.strokeStyle = `rgba(${Math.round(129 + (tc[0] - 129) * mix)},${Math.round(140 + (tc[1] - 140) * mix)},${Math.round(248 + (tc[2] - 248) * mix)},${al})`; ctx.beginPath(); ctx.moveTo(proj[a * 3], proj[a * 3 + 1]); ctx.lineTo(proj[b * 3], proj[b * 3 + 1]); ctx.stroke();
    }
    // 점(앞쪽일수록 크고 밝게, 마우스 가까이면 더 밝게)
    for (let i = 0; i < pts.length; i++) {
      const x = proj[i * 3], y = proj[i * 3 + 1], z = proj[i * 3 + 2], c = pts[i].c;
      const near = p.in ? Math.max(0, 1 - Math.hypot(x - p.x, y - p.y) / 90) : 0;
      const a = Math.min(1, (0.3 + 0.75 * (0.6 - z)) + near * 0.8) * (0.25 + 0.75 * ease(k * 1.2));
      const r = 0.55 + (0.6 - z) * 0.9 + near * 1.4;
      ctx.fillStyle = `rgba(${Math.round(96 + 90 * c + (tc[0] - 96 - 90 * c) * mix)},${Math.round(165 - 40 * c + (tc[1] - 165 + 40 * c) * mix)},${Math.round(255 + (tc[2] - 255) * mix)},${a})`;
      ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, TAU); ctx.fill();
    }
    // 신호(연결선을 따라 흐르는 빛)
    if (form > 0.5) for (const s of sig) {
      const u = Math.max(0, t) * 0.9 + s.s, ph = u % 1, [a, b] = edges[((s.e + Math.floor(u)) * 7) % edges.length]; // 첫 프레임 시각이 시작보다 조금 이를 수 있어 음수 방지
      const x = proj[a * 3] + (proj[b * 3] - proj[a * 3]) * ph, y = proj[a * 3 + 1] + (proj[b * 3 + 1] - proj[a * 3 + 1]) * ph;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 4.5); g.addColorStop(0, `rgba(224,231,255,${0.9 * form})`); g.addColorStop(1, 'rgba(165,180,252,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU); ctx.fill();
    }
    // 궤도 고리 3개 + 고리 위를 도는 점
    const ring = ease((k - 0.55) / 0.4);
    for (let r = 0; r < 3; r++) {
      const rx = S * (0.52 + r * 0.1), ry = rx * 0.2, yy = cy + S * (0.18 - r * 0.2), tilt = (r - 1) * 0.06;
      ctx.save(); ctx.translate(cx, yy); ctx.rotate(tilt);
      ctx.strokeStyle = `rgba(165,180,252,${0.32 * ring})`; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.ellipse(0, 0, rx * (0.6 + 0.4 * ring), ry, 0, 0, TAU); ctx.stroke();
      for (let d = 0; d < 5; d++) { const a = t * (0.35 + r * 0.12) * (r % 2 ? -1 : 1) + d * TAU / 5; const px = Math.cos(a) * rx * (0.6 + 0.4 * ring), py = Math.sin(a) * ry, front = Math.sin(a) > 0;
        ctx.fillStyle = `rgba(224,231,255,${(front ? 0.95 : 0.35) * ring})`; ctx.beginPath(); ctx.arc(px, py, front ? 2.6 : 1.6, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    // 클릭 물결
    if (p.click >= 0) { const rr = p.click * 220; ctx.strokeStyle = `rgba(165,180,252,${0.5 * (1 - p.click / 1.2)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, TAU); ctx.stroke(); }
  };
}
