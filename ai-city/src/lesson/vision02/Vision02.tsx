// author: eduino
// Vision Lab 2차시 · 이미지는 숫자다 — 해상도 · 기준값을 바꿔 12장면의 사건을 숫자 차이로 찾는다.
// 모든 수치는 src/sim/pixels.ts 계산값(점검: tools/check_vision02.ts).
import { useEffect, useRef, useState } from 'react';
import { detect, RES, BASIS2, type Grids, type DetectResult } from '../../sim/pixels';
import { LessonFrame, type LessonDef } from '../LessonFrame';
import { ConceptBox, Question, Feedback } from '../ui';
import { PointGraph } from '../PointGraph';
import { CodeCells } from '../CodeCells';
import { PixelScene, type View } from './PixelScene';

interface Run { id: number; kind: 'exp' | 'apply'; cols: number; th: number; res: DetectResult }
const KEY = '#14b8a6', EXP_TH = 20, MAX_NUM = 1000;
const PREDICT = ['모두 찾고 헛알림도 없다', '모두 찾지만 헛알림이 생긴다', '거의 못 찾는다', '해상도와 상관없다'];
const rowsOf = (c: number) => Math.round(c * 0.625);

export function Vision02({ onExit, onHome }: { onExit: () => void; onHome: () => void }) {
  const [G, setG] = useState<Grids | null>(null);
  useEffect(() => { fetch('./vision/grids.json').then((r) => r.json()).then(setG); }, []);
  const [scene, setScene] = useState(0);
  const [view, setView] = useState<View>('photo');
  const [predict, setPredict] = useState<number | null>(null);
  const [expCols, setExpCols] = useState(16);
  const [code, setCode] = useState({ cols: 64, th: 10 });
  const [runs, setRuns] = useState<Run[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [cellSeen, setCellSeen] = useState(false);
  const [diffSeen, setDiffSeen] = useState(false);
  const nid = useRef(1);
  if (!G) return <div className="loading">장면 숫자를 불러오는 중…</div>;

  const run = (kind: Run['kind'], cols: number, th: number) => setRuns((rs) => [...rs, { id: nid.current++, kind, cols, th, res: detect(G, cols, th) }]);
  const exp = runs.filter((r) => r.kind === 'exp'), app = runs.filter((r) => r.kind === 'apply');
  const lowMiss = exp.find((r) => r.cols <= 16 && r.res.found < 12) ?? null;
  const highFA = exp.find((r) => r.cols === 64 && r.res.falseAlarms > 0) ?? null;
  const ok = (r: Run) => r.res.found === 12 && r.res.falseAlarms === 0 && r.res.numbers <= MAX_NUM;
  const applyOk = app.find(ok) ?? null;
  const last = [...runs].reverse()[0] ?? null;
  const shown = runs.find((r) => r.id === hover) ?? (step >= 4 ? [...app].reverse()[0] : [...exp].reverse()[0]) ?? null;
  const cols = shown?.cols ?? (step >= 4 ? code.cols : expCols), th = shown?.th ?? (step >= 4 ? code.th : EXP_TH);

  const fb = (() => {
    const r = [...app].reverse()[0]; if (!r) return null;
    const where = `서랍 [기록] #${r.id}`;
    if (ok(r)) return { ok: true, why: `${r.cols}×${rowsOf(r.cols)} = ${r.res.numbers}개 숫자로 12장면을 모두 찾고 헛알림도 0입니다.`, where };
    if (r.res.falseAlarms > 0) return { ok: false, why: `조용한 장면 ${r.res.falseAlarms}곳에서도 잡음 때문에 숫자가 기준값 ${r.th}보다 크게 바뀌었습니다(헛알림) → 기준값을 올리거나 해상도를 낮춰 잡음을 평균 내 보세요.`, where };
    if (r.res.found < 12) return { ok: false, why: `${12 - r.res.found}장면의 사건을 놓쳤습니다(${r.res.scenes.filter((s) => !s.found).map((s) => s.name).join(' · ')}) → 기준값을 내리거나 해상도를 높여 작은 물체가 흐려지지 않게 하세요.`, where };
    return { ok: false, why: `모두 찾았지만 숫자가 ${r.res.numbers}개로 목표(${MAX_NUM}개 이하)보다 많습니다 → 해상도를 낮춰 보세요.`, where };
  })();

  const graphRuns = step >= 4 ? app : exp;
  const def: LessonDef = {
    id: 'vision-2', n: 2, total: 8, title: '이미지는 숫자다', keyColor: KEY,
    place: '도시 영상 관제센터 · 분석실',
    problem: '컴퓨터는 CCTV 화면을 어떻게 "보는" 걸까? 화면을 숫자로 바꿔 12개 카메라의 사건을 찾아야 한다.',
    goals: [
      { text: '화면이 숫자(밝기)로 되어 있는 것 확인하기', done: cellSeen },
      { text: '해상도에 따라 찾는 결과가 어떻게 바뀌는지 확인하기', done: !!(lowMiss && highFA) },
      { text: `12장면 모두 찾기 · 헛알림 0 · 숫자 ${MAX_NUM}개 이하`, done: !!applyOk }
    ],
    canNext: [true, predict !== null, !!(lowMiss && highFA && cellSeen), diffSeen, !!applyOk],
    now: [
      '분석실 지시서를 읽고 [다음]을 누르세요',
      predict === null ? '보기 하나를 골라 예측하세요' : '[다음]을 눌러 실험으로 가세요',
      !cellSeen ? '[숫자(밝기)] 보기에서 칸 하나를 눌러 숫자를 보세요' : !lowMiss ? '해상도를 낮게(8 또는 16) 두고 [12장면 비교]를 누르세요' : !highFA ? '해상도를 64로 올려 [12장면 비교]를 누르세요' : '[다음]을 눌러 개념으로 가세요',
      diffSeen ? '[다음]을 눌러 적용으로 가세요' : '[차이] 보기에서 주황 칸을 눌러 숫자 차이를 확인하세요',
      applyOk ? '[다음]을 눌러 정리하세요' : '코드 서랍의 노란 칸(해상도 · 기준값)을 바꾸고 [실행]을 누르세요'
    ],
    onStep: (n) => { setStep(n); setHover(null); if (n === 3) setView('diff'); if (n === 2) setView('numbers'); },
    rail: (st) => (
      <>
        {st === 0 && <p className="lead-text">사람 눈에는 사진이지만, 컴퓨터에게 화면은 <b>밝기 숫자가 빽빽한 표</b>입니다. 숫자가 얼마나 바뀌었는지로 사건을 찾을 수 있을까요?</p>}
        {st === 1 && <Question q={`화면을 가장 잘게(64×40) 나눠서 비교하면, 기준값 ${EXP_TH}에서 12장면의 결과는?`} options={PREDICT} picked={predict} onPick={setPredict} target />}
        {st === 2 && (
          <div className="ctrl">
            <p className="ctrl__label">해상도 (가로 칸 수) · 기준값 {EXP_TH} 고정</p>
            <div className="seg seg--4">{RES.map((c) => <button key={c} className={expCols === c ? 'is-on' : ''} onClick={() => { setExpCols(c); setHover(null); }}>{c}×{rowsOf(c)}</button>)}</div>
            <div className="ctrl__row"><button className={`rbtn rbtn--key ${cellSeen && !(lowMiss && highFA) ? 'is-target' : ''}`} onClick={() => run('exp', expCols, EXP_TH)}>12장면 비교</button></div>
            <ul className="obs-check">
              <li className={cellSeen ? 'done' : ''}><i>{cellSeen ? '✓' : ''}</i>칸을 눌러 밝기 숫자 확인</li>
              <li className={lowMiss ? 'done' : ''}><i>{lowMiss ? '✓' : ''}</i>해상도가 낮을 때 놓치는 장면 확인</li>
              <li className={highFA ? 'done' : ''}><i>{highFA ? '✓' : ''}</i>해상도가 높을 때 헛알림 확인</li>
            </ul>
            {lowMiss && highFA && predict !== null && <div className="compare"><p><span>내 예측</span>{PREDICT[predict]}</p><p><span>실제</span>{PREDICT[1]} — 64×40에서 찾음 {highFA.res.found}/12 · 헛알림 {highFA.res.falseAlarms}</p></div>}
          </div>
        )}
        {st === 3 && (
          <ConceptBox term="디지털 이미지 · 픽셀 · 해상도" def="이미지는 픽셀(칸)마다 밝기 숫자(0~255)를 적은 표다. 해상도는 칸의 개수.">
            <p className="concept__formula">|지금 숫자 − 앞 숫자| &gt; 기준값 → 변화</p>
            <p className="concept__note">칸이 많으면 작은 물체도 보이지만 잡음 숫자까지 흔들려 헛알림이 생기고, 칸이 적으면 평균이 잡음을 줄이지만 작은 물체가 흐려집니다. 1차시의 '변화량'이 바로 이 숫자 차이였어요.</p>
          </ConceptBox>
        )}
        {st === 4 && <div className="ctrl"><p className="lead-text">아래 <b>코드 서랍</b>에서 해상도와 기준값을 골라 목표를 맞추세요.</p>{fb && <Feedback {...fb} />}</div>}
      </>
    ),
    scene: () => (
      <PixelScene G={G} scene={scene} cols={cols} threshold={th} view={view} onView={setView} result={shown?.res ?? null} onPick={setScene}
        onCell={(c) => { setCellSeen(true); if (view === 'diff' && c.d > th) setDiffSeen(true); }} />
    ),
    band: last || shown ? (() => { const r = shown ?? last!; return (
      <>
        <span className="chip chip--clock"><i>해상도</i><b>{r.cols}×{rowsOf(r.cols)}</b></span>
        <span className="chip"><i>숫자 개수</i><b>{r.res.numbers}</b></span>
        <span className="chip"><i>기준값</i><b>{r.th}</b></span>
        <span className="chip ok"><i>찾음</i><b>{r.res.found}<small> / 12</small></b></span>
        <span className="chip miss"><i>헛알림</i><b>{r.res.falseAlarms}</b></span>
      </>); })() : <span className="band__idle">해상도를 고르고 [12장면 비교]를 누르면 12개 카메라를 모두 숫자로 비교합니다</span>,
    drawerFor: (n) => (n === 2 ? 'graph' : n === 4 ? 'code' : n === 5 ? 'log' : null),
    drawer: (d, st) => d === 'graph'
      ? <PointGraph xTicks={RES.map((c) => ({ v: c, label: `${c}×${rowsOf(c)}` }))} xMin={8} xMax={64} yMax={12} yFmt={(v) => `${Math.round(v)}`}
          yLabel="장면 수 (12개 중)" xLabel={st >= 4 ? '해상도 (적용 실행)' : `해상도 (기준값 ${EXP_TH})`}
          series={[
            { name: '찾은 장면', cls: 'a', points: graphRuns.map((r) => ({ x: r.cols, y: r.res.found, id: r.id, tip: `${r.cols}×${rowsOf(r.cols)} · 기준값 ${r.th} · 찾음 ${r.res.found}/12 · 헛알림 ${r.res.falseAlarms}` })) },
            { name: '헛알림 장면', cls: 'b', points: graphRuns.map((r) => ({ x: r.cols, y: r.res.falseAlarms, id: r.id + 10000, tip: `${r.cols}×${rowsOf(r.cols)} · 헛알림 ${r.res.falseAlarms}곳 (잡음이 기준값을 넘음)` })) }
          ]}
          activeId={shown?.id ?? null} onHover={(id) => setHover(id === null ? null : id % 10000)}
          read="청록 = 찾은 장면 수(높을수록 좋음), 주황 = 헛알림 장면 수(낮을수록 좋음). 해상도를 올리면 청록은 오르지만 주황도 따라 오른다."
          link={shown ? `아래 12장면 띠에서 '찾음' ${shown.res.found}개 · '헛' ${shown.res.falseAlarms}개 = 이 점들의 높이. 장면을 눌러 [차이] 보기로 확인하세요.` : ''} />
      : d === 'code'
      ? <CodeCells enabled={st === 4} title="Vision Lab · 화면 숫자 비교" run="result = compare_all(cameras=12, cols, threshold)" onRun={() => run('apply', code.cols, code.th)}
          lines={[
            { kind: 'cell', name: 'cols', value: `${code.cols}`, comment: `가로 칸 수 → ${code.cols}×${rowsOf(code.cols)} = ${code.cols * rowsOf(code.cols)}개 숫자`, dec: () => setCode((c) => ({ ...c, cols: RES[Math.max(0, RES.indexOf(c.cols as 8) - 1)] })), inc: () => setCode((c) => ({ ...c, cols: RES[Math.min(3, RES.indexOf(c.cols as 8) + 1)] })) },
            { kind: 'cell', name: 'threshold', value: `${code.th}`, comment: '숫자 차이가 이보다 크면 변화 (5 ~ 60)', dec: () => setCode((c) => ({ ...c, th: Math.max(5, c.th - 5) })), inc: () => setCode((c) => ({ ...c, th: Math.min(60, c.th + 5) })) }
          ]} />
      : <ol className="ldrawer">{[...runs].reverse().map((r) => <li key={r.id}><b>#{r.id}</b> {r.kind === 'exp' ? '실험' : '적용'} · {r.cols}×{rowsOf(r.cols)}({r.res.numbers}개) · 기준값 {r.th} → 찾음 {r.res.found}/12 · 헛알림 {r.res.falseAlarms}</li>)}{!runs.length && <li>아직 기록이 없습니다.</li>}</ol>,
    wrap: (() => {
      const n32 = 32 * rowsOf(32);
      const opts = [n32 / 2, n32, n32 * 2, n32 * 4];
      const lo = exp.find((r) => r.cols <= 16 && r.res.found < 12), hi = exp.find((r) => r.cols === 64);
      return {
        q: '32×20 해상도의 화면은 숫자 몇 개로 되어 있을까?', options: opts.map((v) => `${v}개`), correct: 1,
        why: `가로 32칸 × 세로 20칸 = ${n32}개. 칸 하나에 밝기 숫자 하나가 들어 있습니다.`, where: '서랍 [코드] 해상도 줄의 설명',
        conclusion: applyOk && lo && hi ? `화면은 밝기 숫자(0~255)의 표다. 해상도를 ${lo.cols}×${rowsOf(lo.cols)}로 낮추자 12장면 중 ${lo.res.found ? `${lo.res.found}곳만 찾았고` : '한 곳도 찾지 못했고'}, 64×40으로 올리자 헛알림이 ${hi.res.falseAlarms}곳 생겼다. ${applyOk.cols}×${rowsOf(applyOk.cols)}(숫자 ${applyOk.res.numbers}개) · 기준값 ${applyOk.th}에서 12장면을 모두 찾고 헛알림이 없었다. 숫자 차이로 변화를 찾는 것이 영상처리의 첫걸음이다.` : '',
        record: () => ({ chart: { title: '해상도에 따른 찾은 장면 수 (기준값 20)', x: exp.map((r) => `${r.cols}×${rowsOf(r.cols)}`), y: exp.map((r) => r.res.found / 12) } })
      };
    })(),
    source: `임시: ${BASIS2} · 계산 src/sim/pixels.ts`,
    nextId: 'vision-3'
  };
  return <LessonFrame def={def} onExit={onExit} onHome={onHome} />;
}
