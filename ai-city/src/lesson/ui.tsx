// author: eduino
// 수업 화면 공통 틀 — 공통 양식 v2: 장면(약 65 %) + 오른쪽 레일 360 px, 장면 아래 수치 띠 + 서랍 [그래프 | 코드 | 기록].
// 문구 7종(미션 · 지금 할 일 · 관찰 · 개념 · 질문 · 피드백 · 출처/임시)은 자리와 색이 고정.
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export const STEPS = ['도입', '예측', '탐구', '개념', '적용', '정리'] as const;
export type Drawer = 'graph' | 'code' | 'log';

export function LessonShell(props: {
  top: ReactNode; scene: ReactNode; band: ReactNode;
  drawer: Drawer; onDrawer: (d: Drawer) => void; drawerBody: ReactNode;
  rail: ReactNode; source: string; keyColor: string;
}) {
  const tabs: [Drawer, string][] = [['graph', '그래프'], ['code', '코드'], ['log', '기록']];
  return (
    <section className="screen lesson-screen" style={{ ['--k' as string]: props.keyColor }}>
      {props.top}
      <div className="lesson-mobile" role="note"><b>수업 화면은 넓은 화면용입니다</b><p>장면 · 그래프 · 지시서를 한눈에 보도록 만들어져 있어요.<br />PC나 태블릿 가로 화면에서 열어 주세요.</p></div>
      <div className="lesson-grid">
        <div className="lesson-left">
          <div className="scene">{props.scene}</div>
          <div className="band">{props.band}</div>
          <div className="drawer">
            <div className="drawer__tabs" role="tablist">
              {tabs.map(([k, label]) => (
                <button key={k} role="tab" aria-selected={props.drawer === k} className={`drawer__tab ${props.drawer === k ? 'is-on' : ''}`} onClick={() => props.onDrawer(k)}>{label}</button>
              ))}
            </div>
            <div className="drawer__body">{props.drawerBody}</div>
          </div>
          <p className="lesson-src">{props.source}</p>
        </div>
        <aside className="rail">{props.rail}</aside>
      </div>
    </section>
  );
}

// 미션 카드: 장소 · 문제 · 목표(체크리스트, 단원 내내 갱신)
export function MissionCard({ place, problem, goals }: { place: string; problem: string; goals: { text: string; done: boolean }[] }) {
  return (
    <div className="mission">
      <div className="mission__row"><span>학습 상황</span><b>{place}</b></div>
      <div className="mission__row"><span>탐구 과제</span><b>{problem}</b></div>
      <div className="mission__row mission__row--goal"><span>학습 목표</span>
        <ul>{goals.map((g) => <li key={g.text} className={g.done ? 'done' : ''}><i aria-hidden="true">{g.done ? '✓' : ''}</i>{g.text}</li>)}</ul>
      </div>
    </div>
  );
}

// 지금 할 일: 항상 하나, 동사로 끝나는 한 문장
export function NowBand({ text }: { text: string }) {
  return (
    <motion.div className="now" key={text} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <span className="now__tag">활동 안내</span>{text}
    </motion.div>
  );
}

export function StepBar({ step, reached }: { step: number; reached: number }) {
  return (
    <ol className="steps">
      {STEPS.map((s, i) => (
        <li key={s} className={`${i === step ? 'is-on' : ''} ${i <= reached ? 'is-reached' : ''}`}><span>{i + 1}</span>{s}</li>
      ))}
    </ol>
  );
}

export function ConceptBox({ term, def, children }: { term: string; def: string; children?: ReactNode }) {
  return (
    <div className="concept">
      <p className="concept__tag">개념</p>
      <p className="concept__term">{term}</p>
      <p className="concept__def">{def}</p>
      {children}
    </div>
  );
}

// 질문(회색 상자) + 보기 + 피드백(질문 아래: 맞음/다시 + 이유 + 근거 위치)
export function Question({ q, options, picked, onPick, correct, feedback, target }: {
  q: string; options: string[]; picked: number | null; onPick: (i: number) => void;
  correct?: number; feedback?: { ok: boolean; why: string; where: string } | null; target?: boolean;
}) {
  return (
    <div className="question">
      <p className="question__q">{q}</p>
      <div className={`question__opts ${target && picked === null ? 'is-target' : ''}`}>
        {options.map((o, i) => (
          <button key={o} className={`opt ${picked === i ? 'is-picked' : ''} ${correct !== undefined && picked === i ? (i === correct ? 'is-right' : 'is-wrong') : ''}`} onClick={() => onPick(i)}>
            <span>{String.fromCharCode(65 + i)}</span>{o}
          </button>
        ))}
      </div>
      {feedback && <Feedback {...feedback} />}
    </div>
  );
}

export function Feedback({ ok, why, where }: { ok: boolean; why: string; where: string }) {
  return (
    <div className={`feedback ${ok ? 'ok' : 'retry'}`}>
      <b>{ok ? '맞음' : '다시'}</b>
      <p>{why}</p>
      <small>근거: {where}</small>
    </div>
  );
}

export function Nav({ step, canNext, onPrev, onNext, nextLabel }: { step: number; canNext: boolean; onPrev: () => void; onNext: () => void; nextLabel?: string }) {
  return (
    <div className="rail-nav">
      <button className="rbtn" onClick={onPrev} disabled={step === 0}>이전</button>
      <button className={`rbtn rbtn--next ${canNext ? 'is-target' : ''}`} onClick={onNext} disabled={!canNext}>{nextLabel ?? '다음'}</button>
    </div>
  );
}
