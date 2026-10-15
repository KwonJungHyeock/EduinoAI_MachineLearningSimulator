// author: eduino
// 첫 화면 배경: 도시 위를 흐르는 신경망 — 원근 바닥 격자 + 노드 연결 + 지구 색 데이터 펄스 (코드 생성 추상 모션)
import { seeded, rgba, type Draw } from './useCanvas';

interface Node { x: number; y: number; z: number; links: number[] }
interface Pulse { from: number; to: number; p: number; v: number; c: string }

export function createHeroField(colors: string[]): Draw {
  const r = seeded(5);
  const nodes: Node[] = Array.from({ length: 120 }, () => ({ x: (r() - 0.5) * 3.2, y: -0.25 + r() * 0.95, z: 0.6 + r() * 3.6, links: [] }));
  nodes.forEach((n, i) => {
    const near = nodes.map((m, j) => ({ j, d: i === j ? 1e9 : (n.x - m.x) ** 2 + (n.y - m.y) ** 2 + (n.z - m.z) ** 2 }))
      .sort((a, b) => a.d - b.d).slice(0, 3).map((o) => o.j);
    n.links = near;
  });
  const pulses: Pulse[] = Array.from({ length: 34 }, (_, k) => {
    const from = Math.floor(r() * nodes.length);
    return { from, to: nodes[from].links[0], p: r(), v: 0.25 + r() * 0.35, c: colors[k % colors.length] };
  });
  let lastT = 0;

  return (ctx, t, w, h) => {
    const dt = Math.min(0.05, t - lastT); lastT = t;
    const drift = Math.sin(t * 0.06) * 0.25;
    const proj = (x: number, y: number, z: number) => {
      const s = 1 / z;
      return [w / 2 + (x + drift) * s * w * 0.42, h * 0.58 - y * s * h * 0.62, s] as const;
    };

    // 바닥 격자 (앞으로 천천히 흐름)
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

    // 연결선
    for (const n of nodes) {
      const [ax, ay] = proj(n.x, n.y, n.z);
      for (const j of n.links) {
        const m = nodes[j]; const [bx, by] = proj(m.x, m.y, m.z);
        ctx.strokeStyle = `rgba(170,210,255,${0.11 / Math.max(n.z, m.z)})`;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
    }
    // 노드
    for (const n of nodes) {
      const [x, y, s] = proj(n.x, n.y, n.z);
      ctx.fillStyle = `rgba(220,235,255,${Math.min(0.8, 0.5 * s)})`;
      ctx.beginPath(); ctx.arc(x, y, Math.max(0.6, 1.8 * s), 0, Math.PI * 2); ctx.fill();
    }
    // 데이터 펄스
    for (const pl of pulses) {
      pl.p += dt * pl.v;
      if (pl.p >= 1) {
        const next = nodes[pl.to].links;
        pl.from = pl.to; pl.to = next[Math.floor(r() * next.length)]; pl.p = 0;
      }
      const a = nodes[pl.from], b = nodes[pl.to];
      const x = a.x + (b.x - a.x) * pl.p, y = a.y + (b.y - a.y) * pl.p, z = a.z + (b.z - a.z) * pl.p;
      const [px, py, s] = proj(x, y, z);
      const g = ctx.createRadialGradient(px, py, 0, px, py, 10 * s + 2);
      g.addColorStop(0, rgba(pl.c, Math.min(1, 0.9 * s + 0.2))); g.addColorStop(1, rgba(pl.c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, 10 * s + 2, 0, Math.PI * 2); ctx.fill();
    }
  };
}
