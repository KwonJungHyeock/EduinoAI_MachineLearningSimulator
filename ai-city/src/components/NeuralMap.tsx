// author: eduino
// 학습 지도 = 신경망. 입력층(공통 기초 · 큰 원) → 은닉층(6개 기술 트랙 · 아이콘 링) → 출력층(트랙별 사건 · 마름모).
// 트랙마다 색 구역(레인)으로 나뉘고, 마우스를 올리면 활성화 파동이 입력 → 트랙 → 사건으로 흐른다. 누르면 뉴런이 '발화'.
// 커서를 움직이면 층마다 다른 깊이로 살짝 움직인다(뒤쪽 깊은 층이 더 많이).
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { DISTRICTS, type MotifId } from '../data/districts';

const W = 1000, H = 640;
const IN = DISTRICTS[0], TRACKS = DISTRICTS.slice(1);
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const curve = (x1: number, y1: number, x2: number, y2: number) => { const m = (x1 + x2) / 2; return `M ${x1} ${y1} C ${m} ${y1}, ${m} ${y2}, ${x2} ${y2}`; };

// 기술 아이콘(코드로 그린 선 그림, -9~9 좌표)
function Glyph({ id }: { id: MotifId }) {
  switch (id) {
    case 'split': return <g><circle cx={-4} cy={-3} r={1.6} /><circle cx={-6} cy={2} r={1.6} /><circle cx={4} cy={3} r={1.6} /><circle cx={6} cy={-2} r={1.6} /><path d="M -2 8 L 2 -8" /></g>;
    case 'vision': return <g><path d="M -9 0 Q 0 -8 9 0 Q 0 8 -9 0 Z" /><circle cx={0} cy={0} r={2.8} /></g>;
    case 'language': return <g><path d="M -8 -6 H 8 V 4 H -1 L -5 8 V 4 H -8 Z" /><path d="M -5 -2 H 5 M -5 1 H 2" /></g>;
    case 'voice': return <g><path d="M -8 0 V 0 M -5 -4 V 4 M -2 -7 V 7 M 1 -3 V 3 M 4 -6 V 6 M 7 -2 V 2" /></g>;
    case 'data': return <g><path d="M -8 6 L -3 1 L 1 4 L 8 -5" /><path d="M 5 -5 H 8 V -2" /></g>;
    case 'physical': return <g><path d="M -7 7 L -2 -1 L 6 -4" /><circle cx={-2} cy={-1} r={2} /><path d="M 6 -4 L 8 -7 M 6 -4 L 9 -2" /></g>;
    case 'generative': return <g><path d="M 0 -9 Q 1 -1 9 0 Q 1 1 0 9 Q -1 1 -9 0 Q -1 -1 0 -9 Z" /></g>;
  }
}

export function NeuralMap({ active, onHover, onPick, labels = true }: { active: string | null; onHover: (id: string | null) => void; onPick: (id: string) => void; labels?: boolean }) {
  const g = useMemo(() => {
    const inp = { x: 110, y: H / 2 };
    const lane = (H - 60) / TRACKS.length;
    const hid = TRACKS.map((d, i) => ({ d, i, x: 470, y: 40 + lane * i + lane / 2, top: 40 + lane * i }));
    const out = hid.flatMap((h, i) => h.d.situations.map((s, j) => ({ s, i, x: 760, y: h.y + (j ? 18 : -18) })));
    const R = rng(5), deep = [250, 350, 600, 680].map((x, l) => Array.from({ length: 9 }, (_, k) => ({ x: x + (R() - 0.5) * 30, y: 30 + k * 72 + (R() - 0.5) * 26, l })));
    const deepLinks: string[] = [];
    for (let l = 0; l < deep.length - 1; l++) for (const a of deep[l]) for (const b of deep[l + 1]) if (R() < 0.16) deepLinks.push(`M ${a.x} ${a.y} L ${b.x} ${b.y}`);
    return { inp, hid, out, deep, deepLinks, lane };
  }, []);
  const lit = (id: string) => !active || active === id || active === IN.id;
  // 발화: 누른 뉴런에서 고리가 퍼지고 그 경로로 빠른 신호가 한 번 지나감
  const [fire, setFire] = useState<{ id: string; n: number } | null>(null);
  const pick = (id: string) => { setFire((f) => ({ id, n: (f?.n ?? 0) + 1 })); onPick(id); };
  // 활성화 파동: 강조 경로가 바뀔 때마다 빠른 신호를 다시 출발시킴
  const waves = useRef<SVGAnimateMotionElement[]>([]);
  useEffect(() => { waves.current.forEach((a) => { try { a.beginElement(); } catch { /* */ } }); }, [active, fire]);
  // 깊이 시차
  const [par, setPar] = useState({ x: 0, y: 0 });
  const move = (e: PointerEvent<SVGSVGElement>) => { const r = e.currentTarget.getBoundingClientRect(); setPar({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 }); };
  const shift = (k: number) => ({ transform: `translate(${-par.x * k}px, ${-par.y * k * 0.7}px)` });
  waves.current = [];
  const wave = (path: string, delay: number, key: string) => (
    <circle key={key} r={4} className="nmap__wave" opacity={0}>
      <animateMotion ref={(el) => { if (el) waves.current.push(el as SVGAnimateMotionElement); }} dur={`${0.7 + delay}s`} begin="indefinite" fill="freeze" path={path} calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />
      <animate ref={(el) => { if (el) waves.current.push(el as unknown as SVGAnimateMotionElement); }} attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.8;1" dur={`${0.7 + delay}s`} begin="indefinite" fill="freeze" />
    </circle>
  );
  return (
    <svg className="nmap" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label="학습 신경망 지도" onPointerLeave={() => { onHover(null); setPar({ x: 0, y: 0 }); }} onPointerMove={move}>
      <defs>
        <filter id="nglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        {TRACKS.map((d) => <linearGradient key={d.id} id={`lane-${d.id}`} x1="0" x2="1"><stop offset="0" stopColor={d.color} stopOpacity="0" /><stop offset="0.25" stopColor={d.color} stopOpacity="0.07" /><stop offset="1" stopColor={d.color} stopOpacity="0.02" /></linearGradient>)}
      </defs>
      {/* 층 구분선 · 층 이름 */}
      <g className="nmap__layer">
        {[[110, 'INPUT', 'Foundation Lab'], [470, 'HIDDEN', '기술 Lab · 6'], [760, 'OUTPUT', '도시 사건 · 12']].map(([x, a, b]) => (
          <g key={a as string}><line x1={x as number} x2={x as number} y1={20} y2={H - 26} /><text x={x as number} y={H - 8} textAnchor="middle"><tspan className="a">{a}</tspan>  {b}</text></g>))}
      </g>
      {/* 깊은 층(장식, 가장 크게 움직임) */}
      <g className="nmap__deep" style={shift(22)}>{g.deepLinks.map((d, i) => <path key={i} d={d} />)}{g.deep.flat().map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.2} />)}</g>
      {/* 트랙 레인(카테고리 구역) */}
      <g style={shift(6)}>
        {g.hid.map((h) => { const on = active === h.d.id; return (
          <g key={h.d.id} className={`nmap__lane ${on ? 'on' : ''} ${lit(h.d.id) ? '' : 'dim'}`} style={{ ['--k' as string]: h.d.color }}>
            <rect x={420} y={h.top + 4} width={570} height={g.lane - 8} rx={14} fill={`url(#lane-${h.d.id})`} />
            <text x={980} y={h.top + g.lane - 14} textAnchor="end" className="nmap__lanetag">{h.d.district}</text>
          </g>); })}
      </g>
      {/* 연결: 입력 → 은닉, 은닉 → 출력 */}
      <g style={shift(10)}>
        {g.hid.map((h, i) => { const p = curve(g.inp.x, g.inp.y, h.x, h.y), hot = active === h.d.id; return (
          <g key={h.d.id} className={`nmap__edge ${lit(h.d.id) ? '' : 'dim'} ${hot ? 'hot' : ''}`} style={{ ['--k' as string]: h.d.color }}>
            <path d={p} />
            <circle r={2.4} className="nmap__sig"><animateMotion dur={`${2.6 + i * 0.35}s`} repeatCount="indefinite" path={p} /></circle>
            {hot && wave(p, 0, `w${i}`)}
          </g>); })}
        {g.out.map((o, k) => { const h = g.hid[o.i], p = curve(h.x, h.y, o.x, o.y), hot = active === h.d.id; return (
          <g key={k} className={`nmap__edge ${lit(h.d.id) ? '' : 'dim'} ${hot ? 'hot' : ''}`} style={{ ['--k' as string]: h.d.color }}>
            <path d={p} />
            <circle r={2} className="nmap__sig"><animateMotion dur={`${1.8 + (k % 3) * 0.4}s`} repeatCount="indefinite" path={p} /></circle>
            {hot && wave(`M ${g.inp.x} ${g.inp.y} ${curve(g.inp.x, g.inp.y, h.x, h.y).slice(curve(g.inp.x, g.inp.y, h.x, h.y).indexOf('C'))} ${p.slice(p.indexOf('C'))}`, 0.3, `wo${k}`)}
          </g>); })}
      </g>
      {/* 출력층: 사건(마름모) */}
      <g style={shift(10)}>
        {g.out.map((o, k) => { const d = g.hid[o.i].d, hot = active === d.id; return (
          <g key={k} className={`nmap__out ${lit(d.id) ? '' : 'dim'} ${hot ? 'hot' : ''}`} style={{ ['--k' as string]: d.color }} onPointerEnter={() => onHover(d.id)} onClick={() => pick(d.id)}>
            <rect x={o.x - 5} y={o.y - 5} width={10} height={10} transform={`rotate(45 ${o.x} ${o.y})`} />
            {labels && <text x={o.x + 16} y={o.y + 4}>{o.s}</text>}
          </g>); })}
      </g>
      {/* 은닉층: 트랙(아이콘 링) */}
      <g style={shift(14)}>
        {g.hid.map((h) => { const d = h.d, sel = active === d.id, f = fire?.id === d.id; return (
          <g key={d.id} className={`nmap__n ${sel ? 'is-on' : ''} ${lit(d.id) ? '' : 'dim'}`} style={{ ['--k' as string]: d.color }} tabIndex={0} role="button" aria-label={`${d.order} ${d.tech}`}
            onPointerEnter={() => onHover(d.id)} onFocus={() => onHover(d.id)} onClick={() => pick(d.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(d.id); } }}>
            <circle cx={h.x} cy={h.y} r={34} className="nmap__hit" />
            {f && <circle key={fire!.n} cx={h.x} cy={h.y} r={20} className="nmap__fire" />}
            <circle cx={h.x} cy={h.y} r={sel ? 24 : 19} className="nmap__halo" />
            <circle cx={h.x} cy={h.y} r={sel ? 17 : 14} className="nmap__ring" />
            <g transform={`translate(${h.x} ${h.y}) scale(${sel ? 1 : 0.85})`} className="nmap__glyph"><Glyph id={d.motif} /></g>
            <text x={h.x - 34} y={h.y - 4} className="nmap__no" textAnchor="end">{d.order} · {d.open ? 'OPEN' : 'SOON'}</text>
            <text x={h.x - 34} y={h.y + 15} className="nmap__t" textAnchor="end">{d.tech}</text>
          </g>); })}
      </g>
      {/* 입력층: 공통 기초(큰 원) */}
      <g style={shift(12)}>
        <g className={`nmap__n nmap__n--in ${active === IN.id ? 'is-on' : ''}`} style={{ ['--k' as string]: IN.color }} tabIndex={0} role="button" aria-label={`${IN.order} ${IN.tech}`}
          onPointerEnter={() => onHover(IN.id)} onFocus={() => onHover(IN.id)} onClick={() => pick(IN.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(IN.id); } }}>
          <circle cx={g.inp.x} cy={g.inp.y} r={46} className="nmap__hit" />
          {fire?.id === IN.id && <circle key={fire.n} cx={g.inp.x} cy={g.inp.y} r={30} className="nmap__fire" />}
          <circle cx={g.inp.x} cy={g.inp.y} r={34} className="nmap__halo nmap__halo--in" />
          <circle cx={g.inp.x} cy={g.inp.y} r={24} className="nmap__ring" />
          <g transform={`translate(${g.inp.x} ${g.inp.y}) scale(1.3)`} className="nmap__glyph"><Glyph id="split" /></g>
          <text x={g.inp.x} y={g.inp.y + 58} className="nmap__no" textAnchor="middle">LAB 00 · INPUT</text>
          <text x={g.inp.x} y={g.inp.y + 78} className="nmap__t" textAnchor="middle">{IN.tech}</text>
        </g>
      </g>
    </svg>
  );
}
