// author: eduino
// 브라우저 학습 진행 패널 — 단계(모으기 → 학습 → 시험) · 진행 막대 · 에폭별 손실 곡선. 수치는 학습 코드가 넘긴 값 그대로.
export interface Busy { stage: string; p: number; loss?: number[] }
export function TrainPanel({ b, phases, cuts, epochs }: { b: Busy; phases: string[]; cuts: number[]; epochs: number }) {
  const ph = cuts.filter((c) => b.p >= c).length, W = 260, H = 54, L = b.loss ?? [], top = Math.max(1.2, ...L);
  const X = (i: number) => 6 + (i / Math.max(1, epochs - 1)) * (W - 12), Y = (v: number) => 6 + (1 - v / top) * (H - 14);
  return (
    <div className="tp" role="status" aria-live="polite">
      <ol className="tp__ph">{phases.map((t, i) => <li key={t} className={i < ph ? 'done' : i === ph ? 'on' : ''}><i>{i < ph ? '✓' : i + 1}</i>{t}</li>)}</ol>
      <p className="tp__st">{b.stage}</p>
      <div className="tp__bar"><b style={{ width: `${b.p * 100}%` }} /></div>
      {L.length > 0 && (
        <div className="tp__loss">
          <svg viewBox={`0 0 ${W} ${H}`}>
            <line x1={6} x2={W - 6} y1={H - 8} y2={H - 8} className="tp__ax" />
            <polyline points={L.map((v, i) => `${X(i)},${Y(v)}`).join(' ')} className="tp__ln" />
            {L.map((v, i) => <circle key={i} cx={X(i)} cy={Y(v)} r={i === L.length - 1 ? 3.6 : 2} className={i === L.length - 1 ? 'tp__now' : 'tp__pt'} />)}
          </svg>
          <p>손실(틀린 정도) <b>{L[L.length - 1].toFixed(2)}</b> · 에폭 {L.length}/{epochs} — 줄어들수록 잘 배우는 중</p>
        </div>
      )}
    </div>
  );
}
