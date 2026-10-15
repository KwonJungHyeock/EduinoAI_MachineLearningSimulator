// author: eduino
// 칸 확대 화면 — 장면(평소/사건) · 상황 설명 · 놓친(찾은) 이유 · 시간 막대(요원이 본 시간 · 사건 · AI 변화량)
// 모든 수치와 막대는 계산 결과(simulate)에서 온다.
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { watching, ASSUME, type Result, type Params } from '../../sim/surveillance';
import { sceneOf, flipped, camLabel, src, GW, GH } from './scenes';

const SHIFT = ASSUME.minutes * 60;
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function CamZoom({ cam, p, res, t, onClose, onSeen }: {
  cam: number; p: Params | null; res: Result | null; t: number; onClose: () => void; onSeen?: (kind: 'found' | 'missed') => void;
}) {
  const sc = sceneOf(cam), flip = flipped(cam);
  const evs = useMemo(() => (res ? res.list.map((e, i) => ({ e, d: res.detail[i], i })).filter((x) => x.e.cam === cam) : []), [res, cam]);
  const past = evs.filter((x) => x.e.start <= t);
  const [pick, setPick] = useState<number | null>(past.length ? past[past.length - 1].i : null);
  const cur = evs.find((x) => x.i === pick) ?? null;
  const [view, setView] = useState<'event' | 'base'>('event');
  const [heat, setHeat] = useState(!!p?.aiAssist);
  const [focus, setFocus] = useState(true);
  const showEvent = !!cur && view === 'event';

  // 놓친 · 찾은 이유 (계산)
  const reason = (() => {
    if (!cur || !p) return null;
    const { e, d } = cur;
    if (!p.aiAssist) {
      if (d.found) return { ok: true, text: `${clock(d.at)}에 요원이 이 화면을 보고 있어서 찾았습니다.` };
      const others: number[] = [];
      for (let c = 0; c < p.cameras && others.length < 4; c++) if (watching(c, e.start, p.cameras, p.operators)) others.push(c);
      return { ok: false, text: `사건이 보인 ${clock(e.start)}~${clock(e.end)} 동안 요원은 다른 화면(${others.map(camLabel).join(' · ')})을 보고 있었습니다.` };
    }
    const tr = res?.trace;
    let peak = 0;
    if (tr) for (let s = e.start; s < e.end; s++) peak = Math.max(peak, tr.change[s * p.cameras + cam] ?? 0);
    if (d.found) return { ok: true, text: `변화량이 ${Math.round(peak)}까지 올라 기준값 ${p.threshold}을 넘었고, ${clock(d.at)}에 요원이 알림을 확인했습니다.` };
    if (d.cause === 'aiMissed') return { ok: false, text: `변화량이 가장 클 때도 ${Math.round(peak)}로 기준값 ${p.threshold}을 넘지 못해 알림이 울리지 않았습니다.` };
    return { ok: false, text: `알림은 울렸지만 앞에 쌓인 알림이 너무 많아 ${ASSUME.alertExpireSec}초 안에 확인하지 못했습니다.` };
  })();
  const seenKind = cur && cur.e.start <= t ? (cur.d.found ? 'found' : 'missed') : null;
  useEffect(() => { if (seenKind && onSeen) onSeen(seenKind); }, [seenKind, onSeen]);

  // 시간 막대 (0~60분)
  const X = (s: number) => (s / SHIFT) * 100;
  const watchSegs = useMemo(() => {
    if (!p || p.aiAssist) return [];
    const segs: [number, number][] = [];
    let on = -1;
    for (let s = 0; s <= SHIFT; s += ASSUME.dwellSec) {
      const w = s < SHIFT && watching(cam, s, p.cameras, p.operators);
      if (w && on < 0) on = s; if (!w && on >= 0) { segs.push([on, s]); on = -1; }
    }
    return segs;
  }, [p, cam]);
  const changePts = useMemo(() => {
    const tr = res?.trace; if (!tr || !p) return '';
    const pts: string[] = [];
    for (let s = 0; s < SHIFT; s += 10) {
      let m = 0; for (let k = s; k < s + 10; k++) m = Math.max(m, tr.change[k * p.cameras + cam] ?? 0);
      pts.push(`${X(s + 5).toFixed(2)},${(100 - Math.min(100, m)).toFixed(1)}`);
    }
    return pts.join(' ');
  }, [res, p, cam]);
  const alerts = res?.trace?.alerts.filter((a) => a.cam === cam) ?? [];

  const box = sc.box;
  // 사건 확대: 변화 영역 가운데로 당겨 크게 (1920 해상도 그림이라 확대해도 선명)
  const focusStyle = (() => {
    if (!focus || !box) return undefined;
    const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2;
    const k = Math.max(1.4, Math.min(3, 0.55 / Math.max(box[2] - box[0], (box[3] - box[1]) * 0.9)));
    return { transform: `scale(${k.toFixed(2)})`, transformOrigin: `${(cx * 100).toFixed(1)}% ${(cy * 100).toFixed(1)}%` };
  })();
  return (
    <motion.div className="zoom" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}>
      <div className="zoom__head">
        <b>{camLabel(cam)} · {sc.name}</b>
        <span>{res ? `${clock(t)} 기준` : '근무 전'}</span>
        <button className="zoom__x" onClick={onClose} aria-label="닫기">✕</button>
      </div>
      <div className="zoom__body">
        <div className="zoom__pic">
          <div className="zoom__frame" style={{ transform: flip ? 'scaleX(-1)' : undefined }}>
           <div className="zoom__inner" style={focusStyle}>
            <img src={src(sc.id, showEvent ? 'event' : 'base')} alt={`${sc.name} ${showEvent ? '사건' : '평소'} 장면`} />
            {showEvent && heat && (
              <div className="zoom__heat" style={{ gridTemplateColumns: `repeat(${GW}, 1fr)`, gridTemplateRows: `repeat(${GH}, 1fr)` }}>
                {sc.grid.map((v, i) => <i key={i} style={{ opacity: Math.min(0.85, v / 100) }} />)}
              </div>
            )}
            {showEvent && box && <div className="zoom__box" style={{ left: `${box[0] * 100}%`, top: `${box[1] * 100}%`, width: `${(box[2] - box[0]) * 100}%`, height: `${(box[3] - box[1]) * 100}%` }} />}
           </div>
          </div>
          <span className="zoom__rec">● REC {camLabel(cam)}</span>
          <div className="zoom__views">
            <button className={view === 'base' ? 'is-on' : ''} onClick={() => setView('base')}>평소 화면</button>
            <button className={view === 'event' ? 'is-on' : ''} onClick={() => setView('event')} disabled={!cur}>사건 화면</button>
            <button className={focus ? 'is-on' : ''} onClick={() => setFocus((f) => !f)} disabled={!box}>사건 확대</button>
            <button className={heat ? 'is-on' : ''} onClick={() => setHeat((h) => !h)} disabled={!showEvent}>변화량 보기</button>
          </div>
        </div>
        <div className="zoom__info">
          <p className="zoom__sit">{sc.situation}</p>
          <p className="zoom__detail">{sc.detail}</p>
          {evs.length > 0 && (
            <div className="zoom__evs">
              {evs.map((x, k) => (
                <button key={x.i} className={`${pick === x.i ? 'is-on' : ''} ${x.e.start > t ? 'is-future' : x.d.found ? 'ok' : 'miss'}`} onClick={() => { setPick(x.i); setView('event'); }} disabled={x.e.start > t}>
                  사건 {k + 1} · {clock(x.e.start)}
                </button>
              ))}
            </div>
          )}
          {!res && <p className="zoom__note">근무를 시작하면 이 카메라에서 일어난 사건과 놓친 이유가 나옵니다.</p>}
          {res && evs.length === 0 && <p className="zoom__note">이번 근무에서 이 카메라에는 사건이 없었습니다.</p>}
          {reason && <p className={`zoom__why ${reason.ok ? 'ok' : 'miss'}`}><b>{reason.ok ? '찾음' : '놓침'}</b>{reason.text}</p>}
        </div>
      </div>
      {res && p && (
        <div className="tl">
          <div className="tl__row"><span>{p.aiAssist ? 'AI 알림' : '요원이 본 시간'}</span>
            <div className="tl__bar">
              {!p.aiAssist && watchSegs.map(([a, b]) => <i key={a} className="w" style={{ left: `${X(a)}%`, width: `${Math.max(0.25, X(b) - X(a))}%` }} />)}
              {p.aiAssist && alerts.map((a, k) => <i key={k} className={`al ${a.outcome}`} style={{ left: `${X(a.t)}%` }} />)}
              <em style={{ left: `${X(t)}%` }} />
            </div>
          </div>
          <div className="tl__row"><span>사건</span>
            <div className="tl__bar">
              {evs.map((x) => <i key={x.i} className={x.d.found ? 'ok' : 'miss'} style={{ left: `${X(x.e.start)}%`, width: `${Math.max(0.6, X(x.e.end) - X(x.e.start))}%`, opacity: x.e.start > t ? 0.25 : 1 }} />)}
              <em style={{ left: `${X(t)}%` }} />
            </div>
          </div>
          {p.aiAssist && (
            <div className="tl__row"><span>변화량 · 기준값 {p.threshold}</span>
              <svg className="tl__chg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line x1="0" x2="100" y1={100 - p.threshold} y2={100 - p.threshold} className="th" />
                <polyline points={changePts} className="ln" />
              </svg>
            </div>
          )}
          <div className="tl__ticks"><span>00:00</span><span>15:00</span><span>30:00</span><span>45:00</span><span>60:00</span></div>
        </div>
      )}
    </motion.div>
  );
}
