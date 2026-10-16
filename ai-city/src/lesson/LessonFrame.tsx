// author: eduino
// 공용 차시 엔진 — 공통 양식 v2 6단계(미션 → 예측 → 실험 → 개념 → 적용 → 정리)의 틀을 맡는다.
// 차시는 장면 · 수치 띠 · 서랍 · 단계별 레일 내용 · 계산 결과(목표 · 다음 가능 여부)만 넘긴다.
// 정리 단계(질문 → 결론 자동 작성 → 저장 → 차시 평가 → PDF)는 엔진이 공통으로 처리.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LessonShell, MissionCard, NowBand, StepBar, Question, Nav, type Drawer } from './ui';
import { TopBar } from '../components/TopBar';
import { Assessment } from './Assessment';
import { update, load, setStudent, type LessonRecord } from '../store/progress';
import { downloadReport } from '../report/pdf';

const REDUCE = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface WrapDef {
  q: string; options: string[]; correct: number;
  why: string; where: string;
  conclusion: string;                       // 학생 계산값으로 자동 작성한 결론
  record: () => Partial<LessonRecord>;      // 저장할 값(실험 결과 · 그래프 등)
}

export interface LessonDef {
  id: string;                 // 'vision-2' · 'found-1'
  lab?: string;               // 상단 표기(기본 Vision Lab)
  labId?: string;             // PDF 리포트용 Lab id(기본 vision)
  n: number; total: number;
  title: string; keyColor: string;
  place: string; problem: string;
  goals: { text: string; done: boolean }[];
  canNext: boolean[];         // 단계 0~4 에서 [다음] 가능 여부
  now: string[];              // 단계 0~4 의 지금 할 일
  busy?: boolean;             // 재생 중 등 (다음 · 단계 이동 막음)
  rail: (step: number) => ReactNode;
  scene: (step: number) => ReactNode;
  band: ReactNode;
  drawer: (d: Drawer, step: number) => ReactNode;
  drawerFor?: (step: number) => Drawer | null;   // 단계에 들어갈 때 자동으로 열 서랍
  wrap: WrapDef;
  source: string;
  nextId?: string;            // 저장하면 열릴 다음 차시
  onStep?: (step: number) => void;
}

export function LessonFrame({ def, onExit, onHome }: { def: LessonDef; onExit: () => void; onHome: () => void }) {
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [drawer, setDrawer] = useState<Drawer>(def.drawerFor?.(0) ?? 'graph');
  const [mc, setMc] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [assessed, setAssessed] = useState(false);
  const [student, setStudentName] = useState(() => load().student ?? '');
  const [pdfBusy, setPdfBusy] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const go = (n: number) => {
    if (n < 0 || n > 5 || def.busy) return;
    setStep(n); setReached((r) => Math.max(r, n));
    const d = def.drawerFor?.(n); if (d) setDrawer(d);
    def.onStep?.(n);
  };
  const w = def.wrap;
  const mcOk = mc === w.correct;
  useEffect(() => { if (mcOk) reportRef.current?.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'nearest' }); }, [mcOk, saved]);
  const save = () => {
    update(def.id, { status: 'done', ...w.record(), report: { conclusion: w.conclusion, savedAt: Date.now() } });
    if (def.nextId) update(def.nextId, { status: 'open' });
    setSaved(true);
  };

  const now = def.busy && step < 5 ? def.now[step]
    : step < 5 ? def.now[step]
    : !mcOk ? '질문에 답하세요' : !saved ? '[보고서 저장]을 누르세요' : !assessed ? '형성평가에 답하고 [평가 제출]을 누르세요' : '리포트 PDF를 내려받거나 [단원 안내로]를 누르세요';

  const rail = (
    <>
      <MissionCard place={def.place} problem={def.problem} goals={def.goals} />
      <NowBand text={now} />
      <StepBar step={step} reached={reached} />
      <div className="rail__body">
        {step < 5 && def.rail(step)}
        {step === 5 && (
          <>
            <Question q={w.q} options={w.options} picked={mc} onPick={setMc} correct={w.correct} target={mc === null}
              feedback={mc === null ? null : { ok: mcOk, why: w.why, where: w.where }} />
            {mcOk && (
              <div className="report" ref={reportRef}>
                <p className="report__tag">결론 (내 실험값으로 자동 작성)</p>
                <p>{w.conclusion}</p>
                {!saved
                  ? <button className="rbtn rbtn--key is-target" onClick={save}>보고서 저장</button>
                  : <p className="report__saved">보고서를 저장했습니다{def.nextId ? ' · 다음 차시가 열렸습니다' : ''}</p>}
              </div>
            )}
            {saved && <Assessment lessonId={def.id} onDone={() => setAssessed(true)} />}
            {assessed && (
              <div className="pdfbox">
                <p className="pdfbox__tag">학습 결과 보고서</p>
                <input className="as-in" value={student} placeholder="이름 (리포트에 표시)" onChange={(e) => { setStudentName(e.target.value); setStudent(e.target.value); }} />
                <div className="ctrl__row">
                  <button className="rbtn rbtn--key" disabled={pdfBusy} onClick={async () => { setPdfBusy(true); try { await downloadReport(load(), def.labId ?? 'vision'); } finally { setPdfBusy(false); } }}>{pdfBusy ? 'PDF 만드는 중…' : 'PDF 내려받기'}</button>
                  <button className="rbtn is-target" onClick={onExit}>단원 안내로</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {step < 5 && <Nav step={step} canNext={!!def.canNext[step] && !def.busy} onPrev={() => go(step - 1)} onNext={() => go(step + 1)} />}
    </>
  );

  return (
    <LessonShell
      keyColor={def.keyColor}
      top={<TopBar crumb={`${def.lab ?? 'Vision Lab'} · ${def.n}차시 ${def.title}`} onHome={onHome} right={<><span className="lesson-prog">{def.lab ?? 'Vision Lab'} {def.n} / {def.total}차시</span><button className="btn btn--ghost" onClick={onExit}>← 단원 안내</button></>} />}
      scene={def.scene(step)}
      band={def.band}
      drawer={drawer}
      onDrawer={setDrawer}
      drawerBody={def.drawer(drawer, step)}
      rail={rail}
      source={def.source}
    />
  );
}
