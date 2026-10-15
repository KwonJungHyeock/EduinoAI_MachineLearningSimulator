// author: eduino
// 2차시 장면 — CCTV 화면을 숫자 격자로 본다. 보기: 사진 · 숫자(밝기) · 차이(지금 − 앞). 칸을 누르면 그 칸의 숫자를 크게.
import { useEffect, useMemo, useState } from 'react';
import { frame, down, diff, type Grids, type DetectResult } from '../../sim/pixels';
import { src } from '../vision01/scenes';

export type View = 'photo' | 'numbers' | 'diff';

export function PixelScene({ G, scene, cols, threshold, view, onView, result, onPick, onCell, seed = 1 }: {
  G: Grids; scene: number; cols: number; threshold: number; view: View; onView: (v: View) => void;
  result: DetectResult | null; onPick: (i: number) => void; onCell?: (info: { v: number; d: number }) => void; seed?: number;
}) {
  const s = G.scenes[scene];
  // 2차시 모델과 똑같은 프레임 · 축소 (씨앗 규칙 동일)
  const data = useMemo(() => {
    const before = down(frame(s.base, seed * 100 + scene * 3 + 1), G.gw, G.gh, cols);
    const now = down(frame(s.event, seed * 100 + scene * 3 + 2), G.gw, G.gh, cols);
    return { rows: before.rows, now: now.v, d: diff(now.v, before.v) };
  }, [G, s, scene, cols, seed]);
  const [cell, setCell] = useState<number | null>(null);
  useEffect(() => setCell(null), [scene, cols]);
  const big = cell !== null ? { v: Math.round(data.now[cell]), d: Math.round(data.d[cell]) } : null;
  useEffect(() => { if (big && onCell) onCell(big); }, [cell]); // eslint-disable-line react-hooks/exhaustive-deps

  const showNum = cols <= 32;
  return (
    <div className="px">
      <div className="px__main">
        <div className="px__frame">
          <img src={src(s.id, 'event')} alt={`${s.name} 지금 장면`} className={view === 'photo' ? '' : 'is-dim'} />
          {view !== 'photo' && (
            <div className="px__grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${data.rows}, 1fr)` }}>
              {(view === 'numbers' ? data.now : data.d).map((v, i) => {
                const hot = view === 'diff' && v > threshold;
                const bg = view === 'numbers' ? `rgb(${v},${v},${v})` : hot ? `rgba(249,115,22,${Math.min(0.95, 0.35 + v / 160)})` : `rgba(20,184,166,${Math.min(0.5, v / 80)})`;
                return (
                  <button key={i} className={`px__c ${cell === i ? 'is-on' : ''} ${hot ? 'is-hot' : ''}`} style={{ background: bg, color: view === 'numbers' ? (v > 140 ? '#111' : '#eee') : '#fff' }} onClick={() => setCell(i)}>
                    {showNum && Math.round(v)}
                  </button>
                );
              })}
            </div>
          )}
          <span className="zoom__rec">● {s.name} · {cols}×{data.rows} = {cols * data.rows}개 숫자</span>
          {big && (
            <div className="px__big">
              <p>선택한 칸</p>
              <b>{big.v}</b><span>밝기 (0 검정 ~ 255 흰색)</span>
              <b className="d">{big.d}</b><span>앞 장면과 차이{big.d > threshold ? ` · 기준값 ${threshold} 넘음 → 변화!` : ` · 기준값 ${threshold} 이하`}</span>
            </div>
          )}
          <div className="zoom__views">
            {(['photo', 'numbers', 'diff'] as View[]).map((v) => <button key={v} className={view === v ? 'is-on' : ''} onClick={() => onView(v)}>{v === 'photo' ? '사진' : v === 'numbers' ? '숫자(밝기)' : '차이'}</button>)}
          </div>
        </div>
      </div>
      <div className="px__strip">
        {G.scenes.map((sc, i) => {
          const r = result?.scenes[i];
          return (
            <button key={sc.id} className={`px__th ${i === scene ? 'is-on' : ''}`} onClick={() => onPick(i)}>
              <img src={src(sc.id, 'event', true)} alt="" />
              <span>{sc.name}</span>
              {r && <i className={r.found ? (r.falseAlarm ? 'warn' : 'ok') : 'miss'}>{r.found ? (r.falseAlarm ? '찾음·헛' : '찾음') : '놓침'}</i>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
