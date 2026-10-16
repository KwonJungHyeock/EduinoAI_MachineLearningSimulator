// author: eduino
// 두 모드 수업 공용 조각: 선택 문제(Pick) · 조건이 맞을 때 한 번 완료(When) · 결과 막대(Bars)
import { useEffect, useState, type ReactNode } from 'react';
import type { Item } from '../../sim/recycle';

// 물건 3D 모델 그림(tools/scene-render ?recycle=sprite&zoom=2.4 고해상도 렌더). 크게 보여 주는 곳은 sprites_hi.
export const spriteName = (it: Item) => (it.variant === 'normal' ? `${it.kind}${it.v}` : `${it.variant}0`);
export const sprite = (it: Item) => `./found/sprites_hi/${spriteName(it)}.webp`;
// 실제 크기 비율(유리병 = 1) — 캔이 병만큼 커 보이지 않게. 부모가 --sh(병 높이)를 정한다.
const RATIO: Record<string, number> = { can: 0.55, crushed: 0.37, pet: 0.97, labeled: 0.97, glass: 1, colorglass: 1 };
export function Sprite({ it, name }: { it?: Item; name?: string }) {
  const n = name ?? spriteName(it!);
  return <img className="spr" src={`./found/sprites_hi/${n}.webp`} style={{ ['--r' as string]: RATIO[n.replace(/\d+$/, '')] ?? 1 }} alt="" />;
}
export const pct = (x: number) => `${Math.round(x * 100)}%`;
export function Pick({ q, opts, correct, why, done }: { q: string; opts: string[]; correct: number; why: string; done: () => void }) {
  const [p, setP] = useState<number | null>(null);
  return (
    <div className="question">
      <p className="question__q">{q}</p>
      <div className="question__opts">{opts.map((o, i) => <button key={o} className={`opt ${p === i ? (i === correct ? 'is-right' : 'is-wrong') : ''}`} onClick={() => { setP(i); if (i === correct) done(); }}><span>{String.fromCharCode(65 + i)}</span>{o}</button>)}</div>
      {p !== null && <p className={`as-fb ${p === correct ? 'ok' : 'no'}`}><b>{p === correct ? '맞음' : '다시'}</b>{p === correct ? why : '다시 골라 보세요.'}</p>}
    </div>
  );
}
export function When({ ok, done, children }: { ok: boolean; done: () => void; children: ReactNode }) {
  useEffect(() => { if (ok) done(); }, [ok]); // eslint-disable-line react-hooks/exhaustive-deps
  return <>{children}</>;
}
export function Bars({ rows, dark }: { rows: { label: string; v: number | null; c: string }[]; dark?: boolean }) {
  return <div className={`fbar ${dark ? 'fbar--dark' : ''}`}>{rows.map((r) => <div key={r.label}><span>{r.label}</span><i><b style={{ width: `${(r.v ?? 0) * 100}%`, background: r.c }} /></i><em>{r.v === null ? '—' : pct(r.v)}</em></div>)}</div>;
}
