// author: eduino
// 비전 지구 1차시 · 사람 눈으로는 다 못 본다 — 공통 양식 v2 6단계(미션 → 예측 → 실험 → 개념 → 적용 → 정리)
// 화면의 모든 수치는 src/sim/surveillance.ts 계산값. 가정은 화면 맨 아래 '임시'로 표시.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { simulate, BASIS, ASSUME, type Params } from '../../sim/surveillance';
import { LessonShell, MissionCard, NowBand, StepBar, ConceptBox, Question, Feedback, Nav, type Drawer } from '../ui';
import { MonitorWall } from './MonitorWall';
import { CamZoom } from './CamZoom';
import { GraphDrawer, CodeDrawer, LogDrawer, type Run } from './drawers';
import { TopBar } from '../../components/TopBar';
import { update, load, setStudent } from '../../store/progress';
import { Assessment } from '../Assessment';
import { downloadReport } from '../../report/pdf';

const SEED = 1;
const SHIFT = ASSUME.minutes * 60;     // 근무 시간(초)
const PLAY_SEC = 20;                    // 근무 60분을 20초에 빨리 감기
const KEY = '#14b8a6';
const CAMS = [4, 8, 16, 32, 64];
const PREDICT = ['거의 그대로다', '조금 는다 (10% 안팎)', '절반 넘게 놓친다', '오히려 준다'];
const NEED_OPTS = [2, 4, 8, 16];
const REDUCE = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
// 단계별 카메라: 미션 날아 들어감 · 실험 근접 · 적용 넓게 · 정리 빠져나옴
const CAM_SCALE = [1, 1, 1.02, 1, 0.98, 0.94];

export function Vision01({ onExit, onHome }: { onExit: () => void; onHome: () => void }) {
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [predict, setPredict] = useState<number | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [playing, setPlaying] = useState<number | null>(null); // 재생 중인 근무 id
  const [simT, setSimT] = useState(0);
  const [expCams, setExpCams] = useState(4);
  const [code, setCode] = useState({ operators: 1, ai: false, threshold: 20 });
  const [drawer, setDrawer] = useState<Drawer>('graph');
  const [mc, setMc] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [assessed, setAssessed] = useState(false);
  const [student, setStudentName] = useState(() => load().student ?? '');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [hoverRun, setHoverRun] = useState<number | null>(null);
  const [zoomCam, setZoomCam] = useState<number | null>(null);
  const [seenMiss, setSeenMiss] = useState(false);
  const onSeen = useCallback((k: 'found' | 'missed') => { if (k === 'missed') setSeenMiss(true); }, []);
  const nextId = useRef(1);
  const reportRef = useRef<HTMLDivElement>(null);

  // ── 근무 실행 + 빨리 감기 재생 ──
  const startRun = useCallback((kind: Run['kind'], p: Params) => {
    const res = simulate({ ...p, seed: SEED }, { trace: p.aiAssist });
    const run: Run = { id: nextId.current++, kind, p, res, done: REDUCE };
    setRuns((rs) => [...rs, run]);
    setSimT(REDUCE ? SHIFT : 0);
    setPlaying(REDUCE ? null : run.id);
  }, []);
  const finish = useCallback(() => {
    setSimT(SHIFT);
    setRuns((rs) => rs.map((r) => (r.id === playing ? { ...r, done: true } : r)));
    setPlaying(null);
  }, [playing]);
  useEffect(() => {
    if (playing === null) return;
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      setSimT((t) => {
        const nt = t + dt * (SHIFT / PLAY_SEC);
        return nt >= SHIFT ? SHIFT : nt;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  useEffect(() => { if (playing !== null && simT >= SHIFT) finish(); }, [simT, playing, finish]);

  // ── 계산 결과에서 관찰 · 목표 판정 ──
  const done = runs.filter((r) => r.done);
  const exp = done.filter((r) => r.kind === 'exp');
  const obs1Run = exp.find((r) => r.p.cameras <= 8 && r.res.missed === 0) ?? null;
  const obs2Run = exp.find((r) => r.p.cameras >= 32 && r.res.missRate > 0.5) ?? null;
  const conceptSeen = done.some((r) => r.kind === 'concept');
  const applyOk = done.find((r) => r.kind === 'apply' && r.p.cameras === 64 && r.p.operators === 1 && r.res.missRate <= 0.1) ?? null;
  const lastApply = [...done].reverse().find((r) => r.kind === 'apply') ?? null;
  const goals = [
    { text: '요원 1명이 몇 건을 놓치는지 확인하기', done: exp.length > 0 },
    { text: '카메라가 늘면 어떻게 되는지 확인하기', done: !!(obs1Run && obs2Run && seenMiss) },
    { text: '카메라 64대 · 놓침 10% 이하 · 요원 1명 달성하기', done: !!applyOk }
  ];
  const canNext = [true, predict !== null, !!(obs1Run && obs2Run && seenMiss), conceptSeen, !!applyOk, false][step] && playing === null;

  // 정리 질문 정답: 사람 눈만으로 64대 · 놓침 10% 이하에 필요한 요원 수 (계산)
  const need = useMemo(() => {
    const m = new Map<number, number>();
    for (const h of [1, 2, 4, 8, 16]) m.set(h, simulate({ cameras: 64, operators: h, aiAssist: false, threshold: 0, seed: SEED }).missRate);
    const needH = [1, 2, 4, 8, 16].find((h) => m.get(h)! <= 0.1) ?? 16;
    return { needH, m, correct: NEED_OPTS.indexOf(needH) };
  }, []);

  const go = (n: number) => {
    if (n < 0 || n > 5) return;
    setZoomCam(null);
    setStep(n); setReached((r) => Math.max(r, n));
    if (n === 2) setDrawer('graph');
    if (n === 4) setDrawer('code');
    if (n === 5) setDrawer('log');
  };

  // ── 지금 보여 줄 근무 ──
  const hovered = playing === null && hoverRun !== null ? runs.find((r) => r.id === hoverRun && r.done) ?? null : null;
  const view = playing !== null ? runs.find((r) => r.id === playing) ?? null
    : hovered ? hovered
    : step === 2 ? [...exp].reverse()[0] ?? null
    : step === 3 ? [...done].reverse().find((r) => r.kind === 'concept') ?? null
    : step >= 4 ? lastApply : null;
  const shownT = playing !== null ? simT : view ? SHIFT : 0;
  const preview = { cameras: step === 2 ? expCams : step >= 3 ? 64 : 64, operators: step >= 4 ? code.operators : 1, ai: step >= 4 ? code.ai : step === 3, threshold: step >= 4 ? code.threshold : 20 };
  const wall = view
    ? { cameras: view.p.cameras, operators: view.p.operators, ai: view.p.aiAssist, threshold: view.p.threshold, res: view.res, t: shownT }
    : { ...preview, res: null, t: 0 };

  // 수치 띠: 지금 시각까지의 계산값
  const band = (() => {
    if (!view) return <span className="band__idle">카메라 {wall.cameras}대 · 요원 {wall.operators}명{wall.ai ? ` · AI 보조 · 기준값 ${wall.threshold}` : ''} — 근무를 시작하면 60분 근무를 {PLAY_SEC}초로 빨리 감아 보여 줍니다</span>;
    const t = shownT, r = view.res;
    const started = r.list.filter((e) => e.start <= t).length;
    const found = r.detail.filter((d) => d.found && d.at <= t).length;
    const missed = r.list.filter((e, i) => !r.detail[i].found && e.end <= t).length;
    const al = r.trace ? r.trace.alerts.filter((a) => a.t <= t) : [];
    return (
      <>
        <span className="band__clock">{clock(t)} <i>/ {clock(SHIFT)}</i></span>
        <span>사건 <b>{started}</b></span>
        <span className="ok">찾음 <b>{found}</b></span>
        <span className="miss">놓침 <b>{missed}</b>{started ? ` (${pct(missed / Math.max(1, started))})` : ''}</span>
        {view.p.aiAssist && <><span>알림 <b>{al.length}</b></span><span>헛알림 <b>{al.filter((a) => a.ev < 0).length}</b></span><span className="miss">확인 못 함 <b>{al.filter((a) => a.outcome === 'expired' && a.at <= t).length}</b></span></>}
        {playing !== null && <button className="band__skip" onClick={finish}>결과 바로 보기 ⏭</button>}
      </>
    );
  })();

  // 장면 속 관찰 말풍선(시각 + 값 + 상태)
  const bubble = view && view.done && view.kind === 'exp'
    ? (view === obs1Run ? `근무 60분 · 카메라 ${view.p.cameras}대 · 놓친 사건 ${view.res.missed} / ${view.res.events}건 → 다 찾았다`
      : view === obs2Run ? `근무 60분 · 카메라 ${view.p.cameras}대 · 놓친 사건 ${view.res.missed} / ${view.res.events}건(${pct(view.res.missRate)}) → 절반 넘게 놓쳤다`
      : `근무 60분 · 카메라 ${view.p.cameras}대 · 놓친 사건 ${view.res.missed} / ${view.res.events}건(${pct(view.res.missRate)})`)
    : view && view.done && view.kind === 'concept' ? `컴퓨터는 ${view.p.cameras}칸 전부의 변화량을 매초 봄 · 알림 ${view.res.alerts}건 → 요원이 확인 못 한 알림 ${view.res.expiredAlerts}건`
    : null;

  // 예측 vs 실제 (실험 뒤)
  const actualPick = obs2Run ? 2 : null;

  // 적용 피드백: 어느 목표가 · 어느 방향으로
  const applyFb = (() => {
    if (!lastApply) return null;
    const r = lastApply.res, p = lastApply.p, where = `서랍 [기록] #${lastApply.id}`;
    if (p.operators === 1 && r.missRate <= 0.1) return { ok: true, why: `카메라 64대를 요원 1명이 맡고도 놓친 사건이 ${r.missed} / ${r.events}건(${pct(r.missRate)})입니다.`, where };
    if (!p.aiAssist) return { ok: false, why: `사람 눈으로만 보면 놓침 ${pct(r.missRate)}로 목표(10% 이하)에 못 미칩니다${p.operators > 1 ? `. 요원도 ${p.operators}명이라 목표(1명)를 넘습니다` : ''} → AI 보조를 켜 보세요.`, where };
    if (r.missRate <= 0.1) return { ok: false, why: `놓침은 ${pct(r.missRate)}로 맞췄지만 요원이 ${p.operators}명입니다 → 요원을 1명으로 줄여 보세요.`, where };
    if (r.cause.overload >= r.cause.aiMissed) return { ok: false, why: `알림이 ${r.alerts}건이나 울려 ${r.expiredAlerts}건을 확인하지 못했습니다(알림 폭주) → 기준값을 올려 보세요.`, where };
    return { ok: false, why: `AI가 사건 ${r.cause.aiMissed}건을 잡지 못했습니다(기준값이 너무 높음) → 기준값을 내려 보세요.`, where };
  })();

  // 정리: 결론 자동 작성 (학생이 돌린 계산값으로)
  const conclusion = (() => {
    if (!applyOk || exp.length === 0) return '';
    const sorted = [...exp].sort((a, b) => a.p.cameras - b.p.cameras);
    const lo = sorted[0], hi = sorted[sorted.length - 1];
    return `카메라를 ${lo.p.cameras}대에서 ${hi.p.cameras}대로 늘리자 요원 1명이 놓친 사건이 ${pct(lo.res.missRate)}에서 ${pct(hi.res.missRate)}로 늘었다. 사람 눈으로는 많은 화면을 다 볼 수 없다. AI 보조(변화 감지 기준값 ${applyOk.p.threshold})를 켜자 요원 1명이 카메라 64대를 맡아도 놓친 사건이 ${pct(applyOk.res.missRate)}였다. 그래서 컴퓨터가 영상을 숫자로 바꿔 스스로 찾는 영상처리가 필요하다.`;
  })();
  const mcFb = mc === null ? null : {
    ok: mc === need.correct,
    why: `카메라 64대를 사람 눈으로만 볼 때 요원 4명이면 놓침 ${pct(need.m.get(4)!)}, 8명이면 ${pct(need.m.get(8)!)}입니다. 놓침 10% 이하가 되는 가장 적은 수는 ${need.needH}명입니다.`,
    where: '같은 근무 60분 계산 (카메라 64대 · AI 없음)'
  };
  // 정답을 고르면 결론 카드가 보이도록 레일을 내려 줌
  useEffect(() => { if (mc === need.correct) reportRef.current?.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'nearest' }); }, [mc, need.correct, saved]);
  const saveReport = () => {
    const expLast = new Map<number, Run>(); exp.forEach((r) => expLast.set(r.p.cameras, r));
    update('vision-1', { status: 'done', predict: predict ?? undefined, exp: [...expLast.values()].map((r) => ({ cameras: r.p.cameras, events: r.res.events, missed: r.res.missed, missRate: r.res.missRate })), report: { conclusion, threshold: applyOk?.p.threshold, runs: done.length, savedAt: Date.now() } });
    update('vision-2', { status: 'open' });
    setSaved(true);
  };

  // 지금 할 일 (항상 하나, 동사로 끝남)
  const now = playing !== null ? '근무가 끝날 때까지 모니터 벽을 지켜보세요'
    : step === 0 ? '작업 지시서를 읽고 [다음]을 누르세요'
    : step === 1 ? (predict === null ? '보기 하나를 골라 예측하세요' : '[다음]을 눌러 실험으로 가세요')
    : step === 2 ? (exp.length === 0 ? '카메라 4대로 [근무 시작]을 누르세요' : !obs1Run ? '카메라를 4대나 8대로 두고 근무를 돌려 보세요' : !obs2Run ? '카메라를 32대 이상으로 늘려 근무를 돌려 보세요' : !seenMiss ? '주황 점이 있는 칸을 눌러 왜 놓쳤는지 확인하세요' : '[다음]을 눌러 개념으로 가세요')
    : step === 3 ? (conceptSeen ? '[다음]을 눌러 적용으로 가세요' : '[AI 보조 켜고 보기]를 누르세요')
    : step === 4 ? (applyOk ? '[다음]을 눌러 정리하세요' : '코드 서랍의 노란 칸을 바꾸고 [실행]을 누르세요')
    : !mcFb?.ok ? '질문에 답하세요' : !saved ? '[보고서 저장]을 누르세요' : !assessed ? '차시 평가 5문항에 답하고 [평가 제출]을 누르세요' : '리포트 PDF를 내려받거나 [브리핑으로]를 누르세요';

  const rail = (
    <>
      <MissionCard place="도시 영상 관제센터" problem="밤사이 카메라 64대에서 사건이 일어난다. 관제 요원은 1명뿐이다." goals={goals} />
      <NowBand text={now} />
      <StepBar step={step} reached={reached} />
      <div className="rail__body">
        {step === 0 && <p className="lead-text">카메라가 많아지면 사람 눈으로 다 볼 수 있을까요? 관제 요원이 되어 직접 근무를 서 보며 확인합니다.</p>}
        {step === 1 && <Question q="카메라가 4대에서 32대로 늘면, 요원 1명이 놓치는 사건은?" options={PREDICT} picked={predict} onPick={setPredict} target />}
        {step === 2 && (
          <div className="ctrl">
            <p className="ctrl__label">카메라 수</p>
            <div className={`seg ${playing === null && (exp.length === 0 || (!obs2Run && obs1Run)) ? 'is-target' : ''}`}>
              {CAMS.map((c) => <button key={c} className={expCams === c ? 'is-on' : ''} onClick={() => setExpCams(c)} disabled={playing !== null}>{c}</button>)}
            </div>
            <div className="ctrl__row">
              <button className={`rbtn rbtn--key ${playing === null && !(obs1Run && obs2Run) ? 'is-target' : ''}`} disabled={playing !== null} onClick={() => startRun('exp', { cameras: expCams, operators: 1, aiAssist: false, threshold: 0 })}>근무 시작</button>
            </div>
            <ul className="obs-check">
              <li className={obs1Run ? 'done' : ''}><i>{obs1Run ? '✓' : ''}</i>카메라가 적을 때 놓친 사건 수 확인</li>
              <li className={obs2Run ? 'done' : ''}><i>{obs2Run ? '✓' : ''}</i>카메라가 많을 때 놓친 사건 수 확인</li>
              <li className={seenMiss ? 'done' : ''}><i>{seenMiss ? '✓' : ''}</i>놓친 칸을 눌러 이유 확인</li>
            </ul>
            {obs2Run && predict !== null && (
              <div className="compare">
                <p><span>내 예측</span>{PREDICT[predict]}</p>
                <p><span>실제</span>{PREDICT[actualPick!]} — 카메라 {obs2Run.p.cameras}대에서 놓침 {pct(obs2Run.res.missRate)}</p>
              </div>
            )}
          </div>
        )}
        {step === 3 && (
          <ConceptBox term="영상처리 (Computer Vision)" def="컴퓨터가 영상을 숫자로 바꿔, 필요한 것을 스스로 찾아내는 기술">
            <p className="concept__formula">화면 변화량 &gt; 기준값 → 알림</p>
            <p className="concept__note">사람은 한 번에 {ASSUME.watchAtOnce}칸만 보지만, 컴퓨터는 64칸 전부의 변화량을 매초 잽니다.</p>
            <button className={`rbtn rbtn--key ${!conceptSeen && playing === null ? 'is-target' : ''}`} disabled={playing !== null} onClick={() => startRun('concept', { cameras: 64, operators: 1, aiAssist: true, threshold: 20 })}>AI 보조 켜고 보기</button>
          </ConceptBox>
        )}
        {step === 4 && (
          <div className="ctrl">
            <p className="lead-text">아래 <b>코드 서랍</b>의 노란 칸(요원 수 · AI 보조 · 기준값)을 바꿔 목표를 맞추세요.</p>
            {applyFb && <Feedback {...applyFb} />}
          </div>
        )}
        {step === 5 && (
          <>
            <Question q="카메라 64대를 사람 눈으로만 보면서 놓침을 10% 아래로 낮추려면 요원이 몇 명 필요할까?" options={NEED_OPTS.map((n) => `${n}명`)} picked={mc} onPick={setMc} correct={need.correct} feedback={mcFb} target={mc === null} />
            {mcFb?.ok && (
              <div className="report" ref={reportRef}>
                <p className="report__tag">결론 (자동 작성)</p>
                <p>{conclusion}</p>
                {!saved
                  ? <button className="rbtn rbtn--key is-target" onClick={saveReport}>보고서 저장</button>
                  : <p className="report__saved">관제 보고서 카드를 저장했습니다 · 비전 지구 2차시가 열렸습니다</p>}
              </div>
            )}
            {saved && <Assessment lessonId="vision-1" onDone={() => setAssessed(true)} />}
            {assessed && (
              <div className="pdfbox">
                <p className="pdfbox__tag">학습 리포트</p>
                <input className="as-in" value={student} placeholder="이름 (리포트에 표시)" onChange={(e) => { setStudentName(e.target.value); setStudent(e.target.value); }} />
                <div className="ctrl__row">
                  <button className="rbtn rbtn--key" disabled={pdfBusy} onClick={async () => { setPdfBusy(true); try { await downloadReport(load()); } finally { setPdfBusy(false); } }}>{pdfBusy ? 'PDF 만드는 중…' : 'PDF 내려받기'}</button>
                  <button className="rbtn is-target" onClick={onExit}>브리핑으로</button>
                </div>
              </div>
            )}
            <details className="kit"><summary>실물 키트로 해 보기 (선택)</summary><p>카메라 모듈 키트 연결은 준비 중입니다.</p></details>
          </>
        )}
      </div>
      {step < 5 && <Nav step={step} canNext={!!canNext} onPrev={() => go(step - 1)} onNext={() => go(step + 1)} />}
    </>
  );

  const scene = (
    <motion.div className="scene__cam" initial={{ scale: 1.35, opacity: 0 }} animate={{ scale: CAM_SCALE[step], opacity: 1 }} transition={{ duration: step === 0 ? 1.4 : 0.8, ease: [0.22, 1, 0.36, 1] }}>
      <MonitorWall state={wall} className="scene__wall" selected={zoomCam} onPick={(c) => setZoomCam(c)} />
      <div className="scene__cap"><span className="scene__tag">관제 모니터 벽</span>{wall.ai ? `AI 보조 · 기준값 ${wall.threshold}` : `요원 ${wall.operators}명 · 흰 테두리 = 지금 보는 화면`} · 칸을 누르면 확대</div>
      {bubble && zoomCam === null && <motion.div className="obs" key={bubble} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}><span className="obs__tag">관찰</span>{bubble}</motion.div>}
      {zoomCam !== null && zoomCam < wall.cameras && <CamZoom key={`${zoomCam}-${view?.id ?? 0}`} cam={zoomCam} p={view?.p ?? null} res={view?.res ?? null} t={shownT} onClose={() => setZoomCam(null)} onSeen={onSeen} />}
    </motion.div>
  );

  return (
    <LessonShell
      keyColor={KEY}
      top={<TopBar crumb="비전 지구 · 1차시 사람 눈으로는 다 못 본다" onHome={onHome} right={<><span className="lesson-prog">비전 1 / 8차시</span><button className="btn btn--ghost" onClick={onExit}>← 브리핑</button></>} />}
      scene={scene}
      band={band}
      drawer={drawer}
      onDrawer={setDrawer}
      drawerBody={drawer === 'graph' ? <GraphDrawer runs={runs} mode={step >= 4 ? 'threshold' : 'cameras'} activeId={view?.id ?? null} onHover={setHoverRun} />
        : drawer === 'code' ? <CodeDrawer enabled={step === 4} operators={code.operators} ai={code.ai} threshold={code.threshold} running={playing !== null}
            onChange={(v) => setCode((c) => ({ ...c, ...v }))}
            onRun={() => startRun('apply', { cameras: 64, operators: code.operators, aiAssist: code.ai, threshold: code.threshold })} />
        : <LogDrawer runs={runs} />}
      rail={rail}
      source={`임시: ${BASIS} · 계산 src/sim/surveillance.ts (씨앗 ${SEED})`}
    />
  );
}
