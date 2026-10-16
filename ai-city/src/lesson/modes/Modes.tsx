// author: eduino
// 두 가지 학습 모드 공통 틀(Foundation Lab부터).
//   이론 모드  : 왼쪽 16:9 수업 슬라이드(교사가 그대로 띄워 설명) + 오른쪽 실습 패널(슬라이드마다 짧은 조작 · 확인 문제)
//   콘텐츠 모드: 해보기 → 알아보기 → 확인하기 3단계, 한 화면에 질문 1 · 조작 1 · 결과 1
// 어느 모드로 해도 같은 차시 진도(found-N)로 저장. 끝에 1분 요약 카드 + 차시 평가(3문항) + PDF.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { TopBar } from '../../components/TopBar';
import { Assessment } from '../Assessment';
import { update, load, setStudent } from '../../store/progress';
import { downloadReport } from '../../report/pdf';

export type Mode = 'theory' | 'content';
const MKEY = 'ai_labcity_mode';
const getMode = (): Mode => { try { return (localStorage.getItem(MKEY) as Mode) || 'content'; } catch { return 'content'; } };

export interface Summary { keys: string[]; line: string }
export interface LessonMeta { id: string; labId: string; lab: string; n: number; total: number; title: string; keyColor: string; nextId?: string; summary: Summary; conclusion: () => string; chart?: () => { title: string; x: string[]; y: number[] } }

// ── 마무리: 1분 요약 → 차시 평가 → 저장 · PDF ──
function Finish({ meta, onExit }: { meta: LessonMeta; onExit: () => void }) {
  const [assessed, setAssessed] = useState(false), [busy, setBusy] = useState(false), [name, setName] = useState(load().student ?? '');
  const save = () => {
    update(meta.id, { status: 'done', report: { conclusion: meta.conclusion(), savedAt: Date.now() }, ...(meta.chart ? { chart: meta.chart() } : {}) });
    if (meta.nextId) update(meta.nextId, { status: 'open' });
  };
  return (
    <div className="mfin">
      <div className="mfin__card" style={{ ['--k' as string]: meta.keyColor }}>
        <p className="mfin__tag">1분 요약</p>
        <div className="mfin__keys">{meta.summary.keys.map((k) => <span key={k}>{k}</span>)}</div>
        <p className="mfin__line">{meta.summary.line}</p>
        <p className="mfin__mine"><b>내 결과</b>{meta.conclusion()}</p>
      </div>
      <Assessment lessonId={meta.id} label="차시 확인" onDone={() => { save(); setAssessed(true); }} />
      {assessed && (
        <div className="pdfbox">
          <p className="pdfbox__tag">완료 · {meta.nextId ? '다음 차시가 열렸습니다' : '모든 차시를 마쳤습니다'}</p>
          <input className="as-in" value={name} placeholder="이름 (리포트에 표시)" onChange={(e) => { setName(e.target.value); setStudent(e.target.value); }} />
          <div className="ctrl__row">
            <button className="rbtn rbtn--key" disabled={busy} onClick={async () => { setBusy(true); try { await downloadReport(load(), meta.labId); } finally { setBusy(false); } }}>{busy ? 'PDF 만드는 중…' : 'PDF 내려받기'}</button>
            <button className="rbtn is-target" onClick={onExit}>브리핑으로</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 이론 모드 ──
export interface Slide {
  kicker?: string; title: string; body: ReactNode; visual?: ReactNode; note?: string;      // note = 교사용 '말할 거리'
  practice?: { label: string; render: (done: () => void) => ReactNode };                     // 실습 패널(끝나면 done 호출)
}
function TheoryDeck({ meta, slides, onExit }: { meta: LessonMeta; slides: Slide[]; onExit: () => void }) {
  const [i, setI] = useState(0), [done, setDone] = useState<Record<number, boolean>>({}), [note, setNote] = useState(false);
  const total = slides.length + 1, last = i === slides.length, s = slides[i];
  const ok = (k: number) => !slides[k]?.practice || done[k];
  const go = useCallback((d: number) => setI((v) => Math.max(0, Math.min(total - 1, v + d))), [total]);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { const k = (e: KeyboardEvent) => { if ((e.target as HTMLElement).closest('input, textarea')) return; if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1); if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [go]);
  const allOk = slides.every((_, k) => ok(k));
  return (
    <div className="theory">
      <div className="theory__stage">
        <div className="slide" ref={box}>
          {last ? (
            <div className="slide__in slide__in--end"><p className="slide__kick">정리</p><h2>{meta.title}</h2><div className="slide__keys">{meta.summary.keys.map((k) => <span key={k}>{k}</span>)}</div><p className="slide__lead">{meta.summary.line}</p></div>
          ) : (
            <motion.div key={i} className={`slide__in ${s.visual ? '' : 'slide__in--text'}`} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}>
              <div className="slide__text">{s.kicker && <p className="slide__kick">{s.kicker}</p>}<h2>{s.title}</h2><div className="slide__body">{s.body}</div></div>
              {s.visual && <div className="slide__vis">{s.visual}</div>}
            </motion.div>
          )}
          <span className="slide__no">{meta.lab} · {meta.n}차시 · {i + 1} / {total}</span>
          <button className="slide__fs" onClick={() => { const el = box.current; if (!el) return; if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.(); }} aria-label="발표 화면(전체 화면)">⛶ 발표</button>
        </div>
        <div className="theory__bar">
          <button className="btn btn--ghost" disabled={i === 0} onClick={() => go(-1)}>← 이전</button>
          <div className="theory__dots">{Array.from({ length: total }, (_, k) => <button key={k} className={`${k === i ? 'on' : ''} ${k < slides.length && ok(k) ? 'ok' : ''}`} onClick={() => setI(k)} aria-label={`${k + 1}번 슬라이드`} />)}</div>
          <button className="btn btn--primary" disabled={last} onClick={() => go(1)}>다음 →</button>
        </div>
        {!last && s.note && <p className={`theory__note ${note ? 'on' : ''}`}><button onClick={() => setNote((v) => !v)}>{note ? '교사 메모 숨기기' : '교사 메모 보기'}</button>{note && <span>{s.note}</span>}</p>}
      </div>
      <aside className="rail theory__rail">
        <p className="mrail__tag">실습 패널 · {last ? '정리' : `${i + 1} / ${slides.length}`}</p>
        {last ? (allOk ? <Finish meta={meta} onExit={onExit} /> : <p className="lead-text">아직 끝내지 않은 실습이 있어요. 아래 점 중 회색인 슬라이드로 돌아가 실습을 마치세요.</p>)
          : s.practice ? (
            <div className={`mprac ${done[i] ? 'is-done' : ''}`}>
              <p className="mprac__label">{s.practice.label}{done[i] && <b> ✓ 완료</b>}</p>
              {s.practice.render(() => setDone((d) => ({ ...d, [i]: true })))}
            </div>)
          : <p className="lead-text">이 슬라이드는 읽고 넘어가면 됩니다. → 키나 [다음]을 누르세요.</p>}
      </aside>
    </div>
  );
}

// ── 콘텐츠 모드(3단계) ──
export interface ContentStep { title: string; ask: string; scene: ReactNode; panel: ReactNode; result?: ReactNode; ready: boolean }
const CSTEPS = ['해보기', '알아보기', '확인하기'];
function ContentFlow({ meta, steps, onExit }: { meta: LessonMeta; steps: [ContentStep, ContentStep]; onExit: () => void }) {
  const [st, setSt] = useState(0), cur = steps[st];
  return (
    <div className="cflow">
      <div className="cflow__main">
        <div className="cflow__steps">{CSTEPS.map((t, k) => <button key={t} className={`${k === st ? 'on' : ''} ${k < st ? 'done' : ''}`} disabled={k > st && !(k === st + 1 && cur?.ready)} onClick={() => setSt(k)}><i>{k < st ? '✓' : k + 1}</i>{t}</button>)}</div>
        {st < 2 ? (
          <>
            <p className="cflow__ask">{cur.ask}</p>
            <div className="cflow__scene">{cur.scene}</div>
            {cur.result && <div className="cflow__result">{cur.result}</div>}
          </>
        ) : (
          <div className="cflow__end"><div className="slide__keys">{meta.summary.keys.map((k) => <span key={k}>{k}</span>)}</div><p className="slide__lead">{meta.summary.line}</p></div>
        )}
      </div>
      <aside className="rail cflow__rail">
        <p className="mrail__tag">{CSTEPS[st]}</p>
        {st < 2 ? (
          <>
            {cur.panel}
            <button className={`rbtn rbtn--key cflow__next ${cur.ready ? 'is-target' : ''}`} disabled={!cur.ready} onClick={() => setSt(st + 1)}>{st === 0 ? '알아보기로 →' : '확인하기로 →'}</button>
          </>
        ) : <Finish meta={meta} onExit={onExit} />}
      </aside>
    </div>
  );
}

// ── 바깥 틀: 상단 바 + 모드 전환 ──
export function ModeLesson({ meta, slides, content, onExit, onHome }: { meta: LessonMeta; slides: Slide[]; content: [ContentStep, ContentStep]; onExit: () => void; onHome: () => void }) {
  const [mode, setModeS] = useState<Mode>(getMode);
  const setMode = (m: Mode) => { setModeS(m); try { localStorage.setItem(MKEY, m); } catch { /* */ } };
  return (
    <section className="screen lesson-screen mlesson" style={{ ['--k' as string]: meta.keyColor }}>
      <TopBar crumb={`${meta.lab} · ${meta.n}차시 ${meta.title}`} onHome={onHome} right={<>
        <div className="mswitch" role="tablist" aria-label="학습 모드">
          {(['theory', 'content'] as Mode[]).map((m) => <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{m === 'theory' ? '이론으로 배우기' : '콘텐츠로 배우기'}</button>)}
        </div>
        <span className="lesson-prog">{meta.lab} {meta.n} / {meta.total}차시</span>
        <button className="btn btn--ghost" onClick={onExit}>← 브리핑</button></>} />
      <div className="lesson-mobile" role="note"><b>수업 화면은 넓은 화면용입니다</b><p>PC나 태블릿 가로 화면에서 열어 주세요.</p></div>
      {mode === 'theory' ? <TheoryDeck meta={meta} slides={slides} onExit={onExit} /> : <ContentFlow meta={meta} steps={content} onExit={onExit} />}
    </section>
  );
}
