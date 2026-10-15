// author: eduino
// 학습 로드맵 = 신경망. 왼쪽 입력 줄기: Foundation Lab(머신러닝 기초) 8차시 → '기초 수료' 허브 → 6개 Lab으로 퍼짐.
// 가로축 = 난이도(L1 진입 → L5 상황 해결). 뉴런 하나 = 차시(차시표가 있는 Lab) 또는 배우는 기술(차시표 준비 중인 Lab).
// 뉴런 크기 · 밝기는 난이도를 따라 커지고, 실제 진도(완료 · 다음 · 잠김)가 켜진다. 신호는 쉬운 쪽에서 어려운 쪽으로 흐른다.
import { useMemo, useState } from 'react';
import { ARC, DISTRICTS, VISION_LESSONS, FOUNDATION_LESSONS, LAB_PLAN } from '../data/districts';
import { load, lesson } from '../store/progress';

const W = 1100, H = 660;
const COLX = [470, 580, 690, 800, 930];              // 난이도 L1~L5 열
const LV = (arc: string) => Math.max(0, (ARC as readonly string[]).indexOf(arc));
export interface Node { id: string; lab: string; x: number; y: number; lv: number; label: string; sub: string; st: 'done' | 'next' | 'open' | 'locked' | 'plan'; n?: number }
const curve = (x1: number, y1: number, x2: number, y2: number) => { const m = (x1 + x2) / 2; return `M ${x1} ${y1} C ${m} ${y1}, ${m} ${y2}, ${x2} ${y2}`; };

export function Roadmap({ selected, onSelect, onLesson }: { selected: string; onSelect: (lab: string) => void; onLesson?: (lab: string, n: number) => void; ready?: number[] }) {
  const [hover, setHover] = useState<Node | null>(null);
  const g = useMemo(() => {
    const prog = load(), labs = DISTRICTS.slice(1), rowH = (H - 130) / labs.length;
    const pst = (pre: string, rd: number[]) => (n: number): Node['st'] => { if (!rd.includes(n)) return 'plan'; const s = lesson(prog, `${pre}-${n}`)?.status ?? (n === 1 ? 'open' : 'locked'); return s === 'done' ? 'done' : s === 'open' ? 'next' : 'locked'; };
    const vst = pst('vision', LAB_PLAN.vision.ready), fst = pst('found', LAB_PLAN.academy.ready);
    // 입력 줄기: Foundation 8차시(위 → 아래로 난이도 상승)
    const fd = DISTRICTS[0], trunk: Node[] = FOUNDATION_LESSONS.map((l, i) => ({ id: `f${l.n}`, lab: fd.id, x: 90 + (i % 2) * 70, y: 110 + i * 62, lv: LV(l.arc), label: `${l.n}차시 · ${l.title}`, sub: `${fd.district} · ${l.arc}${LAB_PLAN.academy.ready.includes(l.n) ? '' : ' · 준비 중'}`, st: fst(l.n), n: l.n }));
    const hub = { x: 330, y: 110 + 3.5 * 62 };
    const rows = labs.map((d, r) => {
      const y = 108 + r * rowH + rowH / 2;
      let nodes: Node[];
      if (d.id === 'vision') {
        const seen: Record<number, number> = {};
        nodes = VISION_LESSONS.map((l) => { const lv = LV(l.arc), k = (seen[lv] = (seen[lv] ?? -1) + 1); return { id: `v${l.n}`, lab: d.id, x: COLX[lv] + k * 34 - 6, y: y + (k ? 0 : 0), lv, label: `${l.n}차시 · ${l.title}`, sub: `${d.district} · ${l.arc}`, st: vst(l.n), n: l.n }; });
      } else {
        const pts = [...d.keywords.slice(0, 4).map((k, i) => ({ k, lv: i })), ...d.situations.map((k) => ({ k, lv: 4 }))];
        const seen: Record<number, number> = {};
        nodes = pts.map((p, i) => { const kk = (seen[p.lv] = (seen[p.lv] ?? -1) + 1); return { id: `${d.id}${i}`, lab: d.id, x: COLX[p.lv] + kk * 34 - 6, y, lv: p.lv, label: p.k, sub: `${d.district} · ${ARC[p.lv]} · 차시표 준비 중`, st: 'plan' as const }; });
      }
      return { d, y, nodes };
    });
    return { trunk, hub, rows, rowH };
  }, []);
  const R = (n: Node) => 4 + n.lv * 1.3;
  const tip = hover && (() => { const w = Math.max(hover.label.length, hover.sub.length * 0.9) * 8.2 + 26, x = Math.min(W - w - 6, Math.max(6, hover.x - w / 2)), y = hover.y - R(hover) - 56; return { w, x, y: y < 4 ? hover.y + 18 : y }; })();
  const click = (n: Node) => { onSelect(n.lab); if (n.n && (n.st === 'done' || n.st === 'next')) onLesson?.(n.lab, n.n); };
  return (
    <svg className="rmap" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label="학습 로드맵" onPointerLeave={() => setHover(null)}>
      <defs>
        <linearGradient id="diff" x1="0" x2="1"><stop offset="0" stopColor="#60a5fa" /><stop offset="1" stopColor="#f472b6" /></linearGradient>
        <filter id="rglow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {/* 난이도 축 */}
      <g className="rmap__axis">
        <line x1={COLX[0] - 40} x2={COLX[4] + 60} y1={44} y2={44} stroke="url(#diff)" />
        {ARC.map((a, i) => (
          <g key={a}>
            <rect x={COLX[i] - 56} y={58} width={112} height={H - 80} rx={14} className="rmap__col" style={{ opacity: 0.02 + i * 0.012 }} />
            <text x={COLX[i]} y={30} textAnchor="middle" className="rmap__lv">L{i + 1}</text>
            <text x={COLX[i]} y={64} textAnchor="middle" className="rmap__arc">{a}</text>
            {Array.from({ length: 5 }, (_, k) => <circle key={k} cx={COLX[i] - 16 + k * 8} cy={44} r={2.2} className={k <= i ? 'on' : ''} />)}
          </g>))}
        <text x={COLX[0] - 46} y={48} textAnchor="end" className="rmap__ax">쉬움</text><text x={COLX[4] + 66} y={48} className="rmap__ax">어려움</text>
        <text x={125} y={64} textAnchor="middle" className="rmap__lv">INPUT</text>
      </g>
      {/* Foundation 줄기 */}
      <g className={`rmap__row ${selected === 'academy' ? 'on' : ''}`} style={{ ['--k' as string]: DISTRICTS[0].color }}>
        {g.trunk.slice(1).map((n, i) => { const a = g.trunk[i], p = curve(a.x, a.y, n.x, n.y); return <g key={n.id}><path d={p} className="rmap__e" /><circle r={2} className="rmap__sig"><animateMotion dur="1.4s" begin={`${i * 0.2}s`} repeatCount="indefinite" path={p} /></circle></g>; })}
        <path d={curve(g.trunk[7].x, g.trunk[7].y, g.hub.x, g.hub.y)} className="rmap__e" />
        <text x={70} y={92} className="rmap__lab">LAB 00 · Foundation Lab</text>
      </g>
      {/* 허브 → Lab 줄 */}
      {g.rows.map(({ d, nodes }) => { const p = curve(g.hub.x, g.hub.y, nodes[0].x, nodes[0].y), on = selected === d.id; return (
        <g key={d.id} className={`rmap__row ${on ? 'on' : ''}`} style={{ ['--k' as string]: d.color }}>
          <rect x={COLX[0] - 70} y={nodes[0].y - g.rowH / 2 + 4} width={COLX[4] - COLX[0] + 170} height={g.rowH - 8} rx={12} className="rmap__lane" onClick={() => onSelect(d.id)} />
          <path d={p} className="rmap__e" />
          <circle r={2.2} className="rmap__sig"><animateMotion dur="1.8s" repeatCount="indefinite" path={p} /></circle>
          {nodes.slice(1).map((n, i) => { const a = nodes[i], q = curve(a.x, a.y, n.x, n.y); return <g key={n.id}><path d={q} className="rmap__e" /><circle r={1.8} className="rmap__sig"><animateMotion dur="1.1s" begin={`${i * 0.15}s`} repeatCount="indefinite" path={q} /></circle></g>; })}
          <text x={COLX[0] - 62} y={nodes[0].y - g.rowH / 2 + 18} className="rmap__lab" onClick={() => onSelect(d.id)}>{d.order} · {d.district}<tspan className="rmap__tech">  {d.tech}</tspan></text>
          <g className="rmap__goal"><rect x={COLX[4] + 92} y={nodes[0].y - 6} width={12} height={12} transform={`rotate(45 ${COLX[4] + 98} ${nodes[0].y})`} /></g>
        </g>); })}
      {/* 허브: 기초 수료 */}
      <g className="rmap__hub"><circle cx={g.hub.x} cy={g.hub.y} r={16} className="rmap__hubhalo" /><circle cx={g.hub.x} cy={g.hub.y} r={8} filter="url(#rglow)" /><text x={g.hub.x} y={g.hub.y + 32} textAnchor="middle" className="rmap__arc">기초 수료</text></g>
      {/* 뉴런(차시 · 기술) */}
      {[...g.trunk, ...g.rows.flatMap((r) => r.nodes)].map((n) => { const d = DISTRICTS.find((x) => x.id === n.lab)!, dim = selected !== n.lab; return (
        <g key={n.id} className={`rmap__n st-${n.st} ${dim ? 'dim' : ''} ${hover?.id === n.id ? 'hov' : ''}`} style={{ ['--k' as string]: d.color }}
          onPointerEnter={() => setHover(n)} onClick={() => click(n)} tabIndex={0} role="button" aria-label={`${d.district} ${n.label}`}
          onFocus={() => setHover(n)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); click(n); } }}>
          <circle cx={n.x} cy={n.y} r={R(n) + 9} className="rmap__hit" />
          {n.st === 'next' && <circle cx={n.x} cy={n.y} r={R(n) + 6} className="rmap__next" />}
          <circle cx={n.x} cy={n.y} r={R(n)} className="rmap__dot" filter={n.st === 'done' || n.st === 'next' ? 'url(#rglow)' : undefined} />
          {n.lab === 'academy' && <text x={n.x + R(n) + 8} y={n.y + 4} className="rmap__fl">{n.n}. {n.label.split(' · ')[1]}</text>}
        </g>); })}
      {/* 말풍선 */}
      {hover && tip && (
        <g className="rmap__tip" pointerEvents="none" style={{ ['--k' as string]: DISTRICTS.find((x) => x.id === hover.lab)!.color }}>
          <rect x={tip.x} y={tip.y} width={tip.w} height={46} rx={9} />
          <text x={tip.x + 13} y={tip.y + 19} className="t">{hover.label}</text>
          <text x={tip.x + 13} y={tip.y + 36} className="s">{hover.sub} · {hover.st === 'done' ? '완료' : hover.st === 'next' ? '다음 학습 — 눌러서 시작' : hover.st === 'locked' ? '잠김(앞 차시를 마치면 열림)' : '준비 중'}</text>
        </g>)}
    </svg>
  );
}
