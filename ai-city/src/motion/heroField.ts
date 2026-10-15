// author: eduino
// 첫 화면 배경: 도시 위를 흐르는 신경망 — 원근 바닥 격자 + 노드 연결 + 지구 색 데이터 펄스 (코드 생성 추상 모션)
// 마우스: 시점이 살짝 따라오고(패럴랙스), 커서 주변 노드가 비켜나며 밝아지고, 가까운 노드와 연결됨. 클릭하면 펄스가 퍼짐.
import { seeded, rgba, type Draw } from './useCanvas';

interface Node { x: number; y: number; z: number; links: number[] }
interface Pulse { from: number; to: number; p: number; v: number; c: string }

export function createHeroField(colors: string[]): Draw {
  const r = seeded(5);
  const nodes: Node[] = Array.from({ length: 120 }, () => ({ x: (r() - 0.5) * 3.2, y: -0.25 + r() * 0.95, z: 0.6 + r() * 3.6, links: [] }));
  nodes.forEach((n, i) => {
    n.links = nodes.map((m, j) => ({ j, d: i === j ? 1e9 : (n.x - m.x) ** 2 + (n.y - m.y) ** 2 + (n.z - m.z) ** 2 }))
      .sort((a, b) => a.d - b.d).slice(0, 3).map((o) => o.j);
  });
  const pulses: Pulse[] = Array.from({ length: 34 }, (_, k) => {
    const from = Math.floor(r() * nodes.length);
    return { from, to: nodes[from].links[0], p: r(), v: 0.25 + r() * 0.35, c: colors[k % colors.length] };
  });
  const scr = nodes.map(() => [0, 0, 0] as [number, number, number]);
  let lastT = 0, px = 0, py = 0, lastClick = -1;

  return (ctx, t, w, h, p) => {
    const dt = Math.min(0.05, t - lastT); lastT = t;
    // 패럴랙스: 커서 쪽으로 시점이 조금 기움
    const tpx = p.in * (p.x / w - 0.5), tpy = p.in * (p.y / h - 0.5);
    px += (tpx - px) * 0.06; py += (tpy - py) * 0.06;
    const drift = Math.sin(t * 0.06) * 0.25 - px * 0.35;
    const lift = py * 0.12;
    const proj = (x: number, y: number, z: number) => {
      const s = 1 / z;
      return [w / 2 + (x + drift) * s * w * 0.42, h * 0.58 - (y - lift) * s * h * 0.62, s] as const;
    };
    const R = Math.min(w, h) * 0.22;

    // 바닥 격자
    ctx.lineWidth = 1;
    const step = 0.35, shift = (t * 0.12) % step;
    for (let z = 0.45; z < 5; z += step) {
      const zz = z - shift; if (zz < 0.3) continue;
      const [x0, y0] = proj(-4, -0.4, zz), [x1] = proj(4, -0.4, zz);
      ctx.strokeStyle = `rgba(120,200,255,${0.13 / zz})`;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
    }
    for (let x = -4; x <= 4; x += 0.4) {
      const [a, b] = proj(x, -0.4, 0.3), [c, d] = proj(x, -0.4, 5);
      ctx.strokeStyle = 'rgba(120,200,255,0.05)';
      ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke();
    }

    // 노드 화면 위치 (커서 주변은 비켜남)
    nodes.forEach((n, i) => {
      const [x, y, s] = proj(n.x, n.y, n.z);
      const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy) || 1;
      const k = p.in * Math.exp(-(d * d) / (2 * R * R));
      scr[i][0] = x + (dx / d) * k * 26 * s;
      scr[i][1] = y + (dy / d) * k * 26 * s;
      scr[i][2] = k;
    });

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      for (const j of n.links) {
        const m = nodes[j], k = Math.max(scr[i][2], scr[j][2]);
        ctx.strokeStyle = `rgba(170,210,255,${0.11 / Math.max(n.z, m.z) + k * 0.25})`;
        ctx.beginPath(); ctx.moveTo(scr[i][0], scr[i][1]); ctx.lineTo(scr[j][0], scr[j][1]); ctx.stroke();
      }
    }
    // 커서 ↔ 가까운 노드 연결 (AI가 나를 감지)
    if (p.in > 0.05) {
      const near = scr.map((s, i) => ({ i, d: Math.hypot(s[0] - p.x, s[1] - p.y) })).sort((a, b) => a.d - b.d).slice(0, 5);
      near.forEach(({ i, d }, n) => {
        const a = p.in * Math.max(0, 1 - d / (R * 1.6)) * 0.7;
        if (a <= 0) return;
        ctx.strokeStyle = rgba(colors[(i + n) % colors.length], a); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(scr[i][0], scr[i][1]); ctx.stroke();
      });
      ctx.strokeStyle = `rgba(233,238,246,${0.5 * p.in})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.stroke();
    }
    nodes.forEach((n, i) => {
      const s = 1 / n.z, k = scr[i][2];
      ctx.fillStyle = `rgba(220,235,255,${Math.min(1, 0.5 * s + k * 0.8)})`;
      ctx.beginPath(); ctx.arc(scr[i][0], scr[i][1], Math.max(0.6, 1.8 * s + k * 2.2), 0, Math.PI * 2); ctx.fill();
    });

    // 클릭: 커서 근처 노드에서 펄스 여러 개 출발
    if (p.click >= 0 && p.click < 0.05 && lastClick !== Math.round(t * 10)) {
      lastClick = Math.round(t * 10);
      const near = scr.map((s, i) => ({ i, d: Math.hypot(s[0] - p.x, s[1] - p.y) })).sort((a, b) => a.d - b.d).slice(0, 6);
      near.forEach(({ i }, k) => pulses.push({ from: i, to: nodes[i].links[k % 3], p: 0, v: 0.6 + r() * 0.4, c: colors[k % colors.length] }));
      while (pulses.length > 70) pulses.shift();
    }
    if (p.click >= 0) {
      ctx.strokeStyle = `rgba(233,238,246,${(1 - p.click / 1.2) * 0.4})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, 8 + p.click * 220, 0, Math.PI * 2); ctx.stroke();
    }

    for (const pl of pulses) {
      pl.p += dt * pl.v;
      if (pl.p >= 1) {
        const next = nodes[pl.to].links;
        pl.from = pl.to; pl.to = next[Math.floor(r() * next.length)]; pl.p = 0;
      }
      const a = scr[pl.from], b = scr[pl.to];
      const x = a[0] + (b[0] - a[0]) * pl.p, y = a[1] + (b[1] - a[1]) * pl.p;
      const z = nodes[pl.from].z + (nodes[pl.to].z - nodes[pl.from].z) * pl.p, s = 1 / z;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 10 * s + 2);
      g.addColorStop(0, rgba(pl.c, Math.min(1, 0.9 * s + 0.2))); g.addColorStop(1, rgba(pl.c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 10 * s + 2, 0, Math.PI * 2); ctx.fill();
    }
  };
}
