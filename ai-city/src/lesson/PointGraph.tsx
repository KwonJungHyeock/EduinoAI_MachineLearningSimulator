// author: eduino
// 범용 그래프 서랍 — 점 = 학생이 돌린 실행 한 번. 점에 마우스 → 장면이 그 실행으로 바뀜(onHover). '읽는 법' · '장면과의 연결' 설명 고정.
export interface GPoint { x: number; y: number; id: number; tip: string }
export interface GSeries { name: string; cls?: 'a' | 'b'; points: GPoint[] }

export function PointGraph({ xTicks, xMin, xMax, yMax = 1, yFmt = (v) => `${Math.round(v * 100)}%`, yLabel, xLabel, series, activeId, onHover, read, link, goal }: {
  xTicks: { v: number; label: string }[]; xMin: number; xMax: number; yMax?: number; yFmt?: (v: number) => string;
  yLabel: string; xLabel: string; series: GSeries[]; activeId?: number | null; onHover?: (id: number | null) => void;
  read: string; link: string; goal?: { y: number; label: string };
}) {
  const W = 640, H = 200, L = 48, R = 18, T = 30, B = 30;
  const X = (v: number) => L + ((v - xMin) / (xMax - xMin || 1)) * (W - L - R);
  const Y = (v: number) => T + (1 - v / yMax) * (H - T - B);
  const all = series.flatMap((s) => s.points.map((p) => ({ ...p, s })));
  const act = all.find((p) => p.id === activeId) ?? null;
  return (
    <div className="gdrawer">
      <svg viewBox={`0 0 ${W} ${H}`} className="gdrawer__svg" role="img" aria-label={yLabel} onPointerLeave={() => onHover?.(null)}>
        <text x={L} y={14} className="g-axis g-axis--title">↑ {yLabel}</text>
        <text x={W - R} y={H - 2} className="g-axis g-axis--title" textAnchor="end">{xLabel} →</text>
        {[0, 0.5, 1].map((f) => (
          <g key={f}><line x1={L} x2={W - R} y1={Y(f * yMax)} y2={Y(f * yMax)} className={f === 0.5 ? 'g-mid' : 'g-grid'} /><text x={L - 8} y={Y(f * yMax) + 4} className="g-axis" textAnchor="end">{yFmt(f * yMax)}</text></g>
        ))}
        {goal && <><rect x={L} y={Y(goal.y)} width={W - L - R} height={Y(0) - Y(goal.y)} className="g-goal" /><text x={W - R - 4} y={Y(goal.y) - 4} className="g-goaltxt" textAnchor="end">{goal.label}</text></>}
        {xTicks.map((t) => <text key={t.label} x={X(t.v)} y={H - 14} className="g-axis" textAnchor="middle">{t.label}</text>)}
        {series.map((s) => s.points.length > 1 && <polyline key={s.name} points={[...s.points].sort((a, b) => a.x - b.x).map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')} className={`g-line ${s.cls === 'b' ? 'g-line--b' : ''}`} />)}
        {all.map((p) => (
          <g key={`${p.s.name}-${p.id}`} className="g-pt" onPointerEnter={() => onHover?.(p.id)}>
            <circle cx={X(p.x)} cy={Y(p.y)} r={16} className="g-hit" />
            {p.id === activeId && <circle cx={X(p.x)} cy={Y(p.y)} r={9} className="g-ring" />}
            <circle cx={X(p.x)} cy={Y(p.y)} r={5} className={`g-dot ${p.s.cls === 'b' ? 'g-dot--b' : ''}`} />
            <text x={X(p.x)} y={Y(p.y) - 11} className="g-val" textAnchor="middle">{yFmt(p.y)}</text>
          </g>
        ))}
        {series.length > 1 && series.map((s, i) => <g key={s.name}><circle cx={L + 10 + i * 110} cy={H - 30 - 0} r={0} /><text x={L + 120 + i * 90} y={14} className={`g-legend ${s.cls === 'b' ? 'b' : 'a'}`}>● {s.name}</text></g>)}
        {act && (() => { const tw = act.tip.length * 7.6 + 18, tx = Math.min(W - R - tw, Math.max(L, X(act.x) - tw / 2)), ty = Math.max(2, Y(act.y) - 44); return (
          <g pointerEvents="none"><rect x={tx} y={ty} width={tw} height={20} rx={5} className="g-tipbg" /><text x={tx + 8} y={ty + 14} className="g-tip">{act.tip}</text></g>); })()}
      </svg>
      <div className="gdrawer__side">
        <p className="gdrawer__read"><b>읽는 법</b>{read}</p>
        <p className="gdrawer__read"><b>장면과의 연결</b>{all.length ? link : '실행하면 점이 찍힙니다.'}</p>
      </div>
    </div>
  );
}
