// author: eduino
// 학습 지도 = 신경망. 입력층(공통 기초) → 은닉층(6개 기술 트랙) → 출력층(트랙마다 해결할 사건).
// 연결선을 따라 신호(빛 점)가 흐르고, 뉴런에 마우스를 올리면 그 경로만 켜진다(순전파처럼). 뒤쪽에는 흐린 깊은 층을 깔아 '딥러닝' 느낌.
import { useMemo } from 'react';
import { DISTRICTS } from '../data/districts';

const W = 1000, H = 620;
const IN = DISTRICTS[0], TRACKS = DISTRICTS.slice(1);
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const curve = (x1: number, y1: number, x2: number, y2: number) => { const m = (x1 + x2) / 2; return `M ${x1} ${y1} C ${m} ${y1}, ${m} ${y2}, ${x2} ${y2}`; };

export function NeuralMap({ active, onHover, onPick, labels = true }: { active: string | null; onHover: (id: string | null) => void; onPick: (id: string) => void; labels?: boolean }) {
  const g = useMemo(() => {
    const inp = { x: 120, y: H / 2 };
    const hid = TRACKS.map((d, i) => ({ d, x: 480, y: 70 + i * ((H - 140) / (TRACKS.length - 1)) }));
    const out = hid.flatMap((h, i) => h.d.situations.map((s, j) => ({ s, i, x: 850, y: 36 + (i * 2 + j) * ((H - 72) / (TRACKS.length * 2 - 1)) })));
    // 뒤쪽 흐린 깊은 층(장식): 층 4개 × 뉴런 8개, 이웃 층끼리 몇 줄만
    const R = rng(5), deep = [230, 340, 620, 730].map((x) => Array.from({ length: 8 }, (_, k) => ({ x: x + (R() - 0.5) * 30, y: 40 + k * 77 + (R() - 0.5) * 30 })));
    const deepLinks: string[] = [];
    for (let l = 0; l < deep.length - 1; l++) for (const a of deep[l]) for (const b of deep[l + 1]) if (R() < 0.18) deepLinks.push(`M ${a.x} ${a.y} L ${b.x} ${b.y}`);
    return { inp, hid, out, deep, deepLinks };
  }, []);
  const on = (id: string) => !active || active === id || active === IN.id;
  return (
    <svg className="nmap" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label="학습 신경망 지도" onPointerLeave={() => onHover(null)}>
      <defs>
        <filter id="nglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <radialGradient id="nfill"><stop offset="0" stopColor="#1a1f3a" /><stop offset="1" stopColor="#05070d" /></radialGradient>
      </defs>
      {/* 깊은 층(장식) */}
      <g className="nmap__deep">{g.deepLinks.map((d, i) => <path key={i} d={d} />)}{g.deep.flat().map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.4} />)}</g>
      {/* 입력 → 은닉 */}
      {g.hid.map((h, i) => { const id = curve(g.inp.x, g.inp.y, h.x, h.y), lit = on(h.d.id); return (
        <g key={h.d.id} className={`nmap__edge ${lit ? '' : 'dim'} ${active === h.d.id ? 'hot' : ''}`} style={{ ['--k' as string]: h.d.color }}>
          <path d={id} />
          <circle r={2.6} className="nmap__sig"><animateMotion dur={`${2.6 + i * 0.35}s`} repeatCount="indefinite" path={id} /></circle>
        </g>); })}
      {/* 은닉 → 출력 */}
      {g.out.map((o, k) => { const h = g.hid[o.i], id = curve(h.x, h.y, o.x, o.y), lit = on(h.d.id); return (
        <g key={k} className={`nmap__edge ${lit ? '' : 'dim'} ${active === h.d.id ? 'hot' : ''}`} style={{ ['--k' as string]: h.d.color }}>
          <path d={id} />
          <circle r={2.2} className="nmap__sig"><animateMotion dur={`${2 + (k % 3) * 0.5}s`} begin={`${(k % 4) * 0.4}s`} repeatCount="indefinite" path={id} /></circle>
        </g>); })}
      {/* 출력층: 사건 */}
      {g.out.map((o, k) => { const d = g.hid[o.i].d, lit = on(d.id); return (
        <g key={k} className={`nmap__out ${lit ? '' : 'dim'}`} style={{ ['--k' as string]: d.color }}>
          <circle cx={o.x} cy={o.y} r={5} />
          {labels && <text x={o.x + 14} y={o.y + 4}>{o.s}</text>}
        </g>); })}
      {/* 은닉층: 트랙 */}
      {g.hid.map((h, i) => { const d = h.d, sel = active === d.id, lit = on(d.id); return (
        <g key={d.id} className={`nmap__n ${sel ? 'is-on' : ''} ${lit ? '' : 'dim'}`} style={{ ['--k' as string]: d.color }} tabIndex={0} role="button" aria-label={`${d.order} ${d.tech}`}
          onPointerEnter={() => onHover(d.id)} onFocus={() => onHover(d.id)} onClick={() => onPick(d.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(d.id); } }}>
          <circle cx={h.x} cy={h.y} r={30} className="nmap__hit" />
          <circle cx={h.x} cy={h.y} r={sel ? 20 : 13} className="nmap__halo" />
          <circle cx={h.x} cy={h.y} r={sel ? 11 : 8} className="nmap__core" filter="url(#nglow)" />
          <text x={h.x - 26} y={h.y - 3} className="nmap__no" textAnchor="end">{String(i + 1).padStart(2, '0')} · {d.open ? 'OPEN' : 'SOON'}</text>
          <text x={h.x - 26} y={h.y + 16} className="nmap__t" textAnchor="end">{d.tech}</text>
        </g>); })}
      {/* 입력층: 공통 기초 */}
      <g className={`nmap__n nmap__n--in ${active === IN.id ? 'is-on' : ''}`} style={{ ['--k' as string]: IN.color }} tabIndex={0} role="button" aria-label={`${IN.order} ${IN.tech}`}
        onPointerEnter={() => onHover(IN.id)} onFocus={() => onHover(IN.id)} onClick={() => onPick(IN.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(IN.id); } }}>
        <circle cx={g.inp.x} cy={g.inp.y} r={40} className="nmap__hit" />
        <circle cx={g.inp.x} cy={g.inp.y} r={26} className="nmap__halo" />
        <circle cx={g.inp.x} cy={g.inp.y} r={14} className="nmap__core" filter="url(#nglow)" />
        <text x={g.inp.x} y={g.inp.y + 50} className="nmap__no" textAnchor="middle">00 · INPUT</text>
        <text x={g.inp.x} y={g.inp.y + 70} className="nmap__t" textAnchor="middle">{IN.tech}</text>
      </g>
      {/* 층 이름 */}
      <g className="nmap__layer"><text x={120} y={H - 6} textAnchor="middle">INPUT · 공통 기초</text><text x={480} y={H - 6} textAnchor="middle">HIDDEN · 기술 트랙</text><text x={850} y={H - 6} textAnchor="middle">OUTPUT · 해결할 사건</text></g>
    </svg>
  );
}
