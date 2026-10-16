// author: eduino
// 센서 평면: 가로 = 금속 반응, 세로 = 빛 투과. 물건 하나 = 점(색 = 실제 종류, 예외 물건은 테두리 굵게).
// 기준선 두 개(금속 m · 빛 l)가 평면을 캔 · 페트 · 유리 구역으로 나눈다. drag 를 주면 선을 끌어 옮길 수 있다. 틀린 점은 빨간 고리.
import { useRef, type PointerEvent } from 'react';
import { rule, KO, type Item, type Kind } from '../../sim/recycle';

export const KC: Record<Kind, string> = { can: '#9aa4ae', pet: '#3b82f6', glass: '#2f9e5f' };
const P = 8, S = 84; // 안쪽 여백 · 크기(viewBox 100)
const X = (v: number) => P + v * S, Y = (v: number) => P + (1 - v) * S;

export function SensorPlane({ items, m, l, onChange, showWrong = true, dark = false, hint }: { items: Item[]; m: number; l: number; onChange?: (m: number, l: number) => void; showWrong?: boolean; dark?: boolean; hint?: string }) {
  const svg = useRef<SVGSVGElement>(null), drag = useRef<'m' | 'l' | null>(null);
  const dec = rule(m, l);
  // 화면 좌표 → viewBox 좌표(가로 · 세로 여백이 생겨도 정확하게)
  const at = (e: PointerEvent) => { const el = svg.current!, pt = el.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const q = pt.matrixTransform(el.getScreenCTM()!.inverse()); return [(q.x - P) / S, 1 - (q.y - P) / S]; };
  const move = (e: PointerEvent) => {
    if (!drag.current || !onChange) return; const [vx, vy] = at(e), c = (v: number) => Math.round(Math.max(0.02, Math.min(0.98, v)) * 50) / 50;
    if (drag.current === 'm') onChange(c(vx), l); else onChange(m, c(vy));
  };
  return (
    <svg ref={svg} className={`splane ${dark ? 'splane--dark' : ''} ${onChange ? 'is-edit' : ''}`} viewBox="0 0 100 100" onPointerMove={move} onPointerUp={() => (drag.current = null)} onPointerLeave={() => (drag.current = null)} role="img" aria-label={`센서 평면 · 금속 기준 ${m} · 빛 기준 ${l}`}>
      {/* 구역 */}
      <rect x={X(m)} y={P} width={X(1) - X(m)} height={S} fill={KC.can} className="splane__zone" />
      <rect x={P} y={P} width={X(m) - P} height={Y(l) - P} fill={KC.pet} className="splane__zone" />
      <rect x={P} y={Y(l)} width={X(m) - P} height={Y(0) - Y(l)} fill={KC.glass} className="splane__zone" />
      <text x={X(m) + (X(1) - X(m)) / 2} y={P + 6} className="splane__zt" textAnchor="middle">캔 구역</text>
      <text x={P + (X(m) - P) / 2} y={P + 6} className="splane__zt" textAnchor="middle">페트 구역</text>
      <text x={P + (X(m) - P) / 2} y={Y(0) - 3} className="splane__zt" textAnchor="middle">유리 구역</text>
      {/* 축 */}
      <rect x={P} y={P} width={S} height={S} className="splane__frame" />
      <text x={P + S / 2} y={99} className="splane__ax" textAnchor="middle">금속 반응 → 클수록 금속</text>
      <text x={3} y={P + S / 2} className="splane__ax" textAnchor="middle" transform={`rotate(-90 3 ${P + S / 2})`}>빛 투과 → 클수록 투명</text>
      {/* 점 */}
      {items.map((it) => { const ok = dec(it) === it.kind; return (
        <g key={it.id}>
          {showWrong && !ok && <circle cx={X(it.metal)} cy={Y(it.light)} r={2.6} className="splane__wrong" />}
          <circle cx={X(it.metal)} cy={Y(it.light)} r={it.variant === 'normal' ? 1.35 : 1.6} fill={KC[it.kind]} className={`splane__dot ${it.variant !== 'normal' ? 'ex' : ''}`}><title>{`${KO[it.kind]}${it.variant !== 'normal' ? `(${it.variant === 'crushed' ? '찌그러짐' : it.variant === 'labeled' ? '라벨' : '색 유리'})` : ''} · 금속 ${it.metal} · 빛 ${it.light} → ${KO[dec(it)]}`}</title></circle>
        </g>); })}
      {/* 기준선 */}
      <g className="splane__line" onPointerDown={(e) => { if (!onChange) return; e.preventDefault(); (e.target as Element).setPointerCapture?.(e.pointerId); drag.current = 'm'; }}>
        <line x1={X(m)} x2={X(m)} y1={P} y2={P + S} className="splane__hit" /><line x1={X(m)} x2={X(m)} y1={P} y2={P + S} />
        <rect x={X(m) - 6} y={P + S + 0.5} width={12} height={4.6} rx={1} /><text x={X(m)} y={P + S + 4} textAnchor="middle">{m.toFixed(2)}</text>
      </g>
      <g className="splane__line" onPointerDown={(e) => { if (!onChange) return; e.preventDefault(); (e.target as Element).setPointerCapture?.(e.pointerId); drag.current = 'l'; }}>
        <line x1={P} x2={X(m)} y1={Y(l)} y2={Y(l)} className="splane__hit" /><line x1={P} x2={X(m)} y1={Y(l)} y2={Y(l)} />
        <rect x={P + 0.5} y={Y(l) - 5.3} width={12} height={4.6} rx={1} /><text x={P + 6.5} y={Y(l) - 1.9} textAnchor="middle">{l.toFixed(2)}</text>
      </g>
      {hint && <text x={50} y={54} className="splane__hint" textAnchor="middle">{hint}</text>}
    </svg>
  );
}
export function Legend({ dark = false }: { dark?: boolean }) {
  return <p className={`splane__lg ${dark ? 'dark' : ''}`}>{(['can', 'pet', 'glass'] as Kind[]).map((k) => <span key={k}><i style={{ background: KC[k] }} />{KO[k]}</span>)}<span><i className="ex" />예외 물건</span><span><i className="wr" />잘못 나눔</span></p>;
}
