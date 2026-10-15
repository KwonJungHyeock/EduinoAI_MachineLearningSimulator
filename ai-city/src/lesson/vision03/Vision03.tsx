// author: eduino
// Vision Lab 3차시 · 필터로 윤곽 찾기 — 3×3 필터(합성곱)로 12장면의 물체 윤곽을 돋보이게 한다.
// 수치는 src/sim/filters.ts 계산값(점검: tools/check_vision03.ts).
import { useEffect, useRef, useState } from 'react';
import { PRESETS, score, prepare, GOAL_RATIO, BASIS3, type Hires, type Kernel } from '../../sim/filters';
import { LessonFrame, type LessonDef } from '../LessonFrame';
import { ConceptBox, Question, Feedback } from '../ui';
import { PointGraph } from '../PointGraph';
import { FilterScene } from './FilterScene';

interface Run { id: number; kind: 'exp' | 'apply'; name: string; k: Kernel; per: number[]; median: number }
const KEY = '#14b8a6';
const PREDICT = ['흐리게 필터', '그대로 필터', '세로 윤곽 필터', '모두 같다'];
const fmt = (v: number) => (Number.isInteger(v) ? `${v}` : v.toFixed(2));

export function Vision03({ onExit, onHome }: { onExit: () => void; onHome: () => void }) {
  const [H, setH] = useState<Hires | null>(null);
  useEffect(() => { fetch('./vision/hires.json').then((r) => r.json()).then((d) => setH(prepare(d))); }, []);
  const [scene, setScene] = useState(1);
  const [predict, setPredict] = useState<number | null>(null);
  const [preset, setPreset] = useState('identity');
  const [mine, setMine] = useState<Kernel>([0, 0, 0, 0, 1, 0, 0, 0, 0]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [calcSeen, setCalcSeen] = useState(false);
  const nid = useRef(1);
  if (!H) return <div className="loading">장면을 불러오는 중…</div>;

  const run = (kind: Run['kind'], name: string, k: Kernel) => { const s = score(H, k); setRuns((rs) => [...rs, { id: nid.current++, kind, name, k, per: s.per, median: s.median }]); };
  const exp = runs.filter((r) => r.kind === 'exp'), app = runs.filter((r) => r.kind === 'apply');
  const flat = exp.find((r) => r.name === PRESETS.identity.name || r.name === PRESETS.blur.name) ?? null;
  const edge = exp.find((r) => r.median >= GOAL_RATIO) ?? null;
  const horzRun = exp.find((r) => r.name === PRESETS.horz.name) ?? null;
  const applyOk = app.find((r) => r.median >= GOAL_RATIO) ?? null;
  // 지금 장면에 보이는 필터와 같은 실행 결과만 띠 · 그래프에 연결 (마우스로 점을 고르면 그 실행)
  const same = (x: Kernel, y: Kernel) => x.every((v, i) => v === y[i]);
  const curK = step >= 4 ? mine : PRESETS[preset].k;
  const shown = runs.find((r) => r.id === hover) ?? [...(step >= 4 ? app : exp)].reverse().find((r) => same(r.k, curK)) ?? null;
  const k = hover && shown ? shown.k : curK;

  const fb = (() => {
    const r = [...app].reverse()[0]; if (!r) return null;
    const where = `서랍 [기록] #${r.id}`, sum = r.k.reduce((a, b) => a + b, 0);
    if (r.median >= GOAL_RATIO) return { ok: true, why: `내 필터로 12장면 물체 대비가 ${r.median.toFixed(2)}배(중앙값)입니다. 물체 윤곽이 배경보다 확실히 밝게 드러났어요.`, where };
    if (sum !== 0) return { ok: false, why: `필터 숫자의 합이 ${sum}입니다. 합이 0이 아니면 밝은 곳 전체가 그대로 밝게 나와 물체가 돋보이지 않아요 → 한쪽은 +, 반대쪽은 −로 합을 0에 맞춰 보세요.`, where };
    return { ok: false, why: `대비가 ${r.median.toFixed(2)}배로 목표(${GOAL_RATIO}배)에 못 미칩니다. 사람 · 기둥처럼 세로로 긴 물체가 많아요 → 왼쪽 열과 오른쪽 열의 차이를 보는 필터를 만들어 보세요.`, where };
  })();

  const kGrid = (kk: Kernel, edit: boolean) => (
    <div className="kgrid">
      {kk.map((v, i) => edit
        ? <span key={i} className="cell kcell"><button aria-label={`칸${i + 1} 줄이기`} onClick={() => setMine((m) => m.map((x, j) => (j === i ? Math.max(-2, x - 1) : x)))}>−</button><b>{v}</b><button aria-label={`칸${i + 1} 늘리기`} onClick={() => setMine((m) => m.map((x, j) => (j === i ? Math.min(2, x + 1) : x)))}>+</button></span>
        : <span key={i} className="kro">{fmt(v)}</span>)}
    </div>
  );

  const def: LessonDef = {
    id: 'vision-3', n: 3, total: 8, title: '필터로 윤곽 찾기', keyColor: KEY,
    place: '도시 영상 관제센터 · 분석실',
    problem: '숫자 차이만으로는 물체의 모양을 알 수 없다. 물체의 윤곽(경계)을 찾아 돋보이게 해야 한다.',
    goals: [
      { text: '필터가 숫자를 어떻게 계산하는지 확인하기', done: calcSeen },
      { text: '필터마다 화면이 어떻게 달라지는지 비교하기', done: !!(flat && edge) },
      { text: `내 필터로 12장면 물체 대비 ${GOAL_RATIO}배 이상`, done: !!applyOk }
    ],
    canNext: [true, predict !== null, !!(flat && edge && calcSeen), true, !!applyOk],
    now: [
      '지시서를 읽고 [다음]을 누르세요',
      predict === null ? '보기 하나를 골라 예측하세요' : '[다음]을 눌러 실험으로 가세요',
      !calcSeen ? '왼쪽 화면에 마우스를 올려 필터 계산을 보세요' : !flat ? '[그대로] 또는 [흐리게] 필터로 [12장면 적용]을 누르세요' : !edge ? '윤곽 필터를 골라 [12장면 적용]을 누르세요' : '[다음]을 눌러 개념으로 가세요',
      '개념을 읽고 [다음]을 누르세요',
      applyOk ? '[다음]을 눌러 정리하세요' : '코드 서랍에서 필터 9칸을 바꾸고 [실행]을 누르세요'
    ],
    onStep: (n) => { setStep(n); setHover(null); },
    rail: (st) => (
      <>
        {st === 0 && <p className="lead-text">사람은 물체의 <b>경계</b>를 보고 모양을 알아봅니다. 컴퓨터도 경계를 찾을 수 있을까요? 3×3 숫자 표, <b>필터</b>를 화면 위로 미끄러뜨려 봅니다.</p>}
        {st === 1 && <Question q="12장면에서 사람 · 차 같은 물체를 배경보다 가장 돋보이게 만드는 필터는?" options={PREDICT} picked={predict} onPick={setPredict} target />}
        {st === 2 && (
          <div className="ctrl">
            <p className="ctrl__label">필터 고르기</p>
            <div className="seg seg--5">{Object.entries(PRESETS).map(([id, p]) => <button key={id} className={preset === id ? 'is-on' : ''} onClick={() => { setPreset(id); setHover(null); }}>{p.name}</button>)}</div>
            {kGrid(PRESETS[preset].k, false)}
            <div className="ctrl__row"><button className={`rbtn rbtn--key ${calcSeen && !(flat && edge) ? 'is-target' : ''}`} onClick={() => run('exp', PRESETS[preset].name, PRESETS[preset].k)}>12장면 적용</button></div>
            <ul className="obs-check">
              <li className={calcSeen ? 'done' : ''}><i>{calcSeen ? '✓' : ''}</i>3×3 숫자 × 필터 계산 보기</li>
              <li className={flat ? 'done' : ''}><i>{flat ? '✓' : ''}</i>그대로 · 흐리게: 물체가 돋보이지 않음 {flat ? `(${flat.median.toFixed(2)}배)` : ''}</li>
              <li className={edge ? 'done' : ''}><i>{edge ? '✓' : ''}</i>윤곽 필터: 물체가 돋보임 {edge ? `(${edge.median.toFixed(2)}배)` : ''}</li>
            </ul>
            {edge && predict !== null && <div className="compare"><p><span>내 예측</span>{PREDICT[predict]}</p><p><span>실제</span>{edge.name} {edge.median.toFixed(2)}배{horzRun ? ` · 가로 윤곽 ${horzRun.median.toFixed(2)}배` : ''}</p></div>}
          </div>
        )}
        {st === 3 && (
          <ConceptBox term="합성곱 필터 (Convolution)" def="작은 숫자 표(필터)를 화면 위로 한 칸씩 옮기며, 겹친 숫자끼리 곱해 더한 값을 새 화면에 적는 계산">
            <p className="concept__formula">결과 = Σ (화면 숫자 × 필터 숫자)</p>
            <p className="concept__note">왼쪽은 −, 오른쪽은 +인 필터는 "좌우 밝기 차이"를 재서 세로 윤곽에 크게 반응합니다. 숫자 합이 0이면 평평한 곳은 0이 되고 경계만 남아요. 다음 시간의 CNN은 이 필터 숫자를 사람이 아니라 <b>학습으로</b> 정합니다.</p>
          </ConceptBox>
        )}
        {st === 4 && <div className="ctrl"><p className="lead-text">코드 서랍의 노란 9칸(−2 ~ 2)으로 <b>내 필터</b>를 만들어 12장면 물체 대비 {GOAL_RATIO}배를 넘기세요.</p>{fb && <Feedback {...fb} />}</div>}
      </>
    ),
    scene: () => <FilterScene H={H} scene={scene} k={k} per={shown?.per ?? null} onPick={setScene} onCalc={() => setCalcSeen(true)} />,
    band: shown ? (
      <>
        <span className="chip chip--clock"><i>필터</i><b>{shown.name}</b></span>
        <span className="chip ok"><i>물체 대비 (중앙값)</i><b>{shown.median.toFixed(2)}<small>배</small></b></span>
        <span className="chip"><i>목표</i><b>{GOAL_RATIO}<small>배 이상</small></b></span>
        <span className="chip ok"><i>목표 넘은 장면</i><b>{shown.per.filter((v) => v >= GOAL_RATIO).length}<small> / 12</small></b></span>
      </>
    ) : <span className="band__idle">필터를 고르고 [12장면 적용]을 누르면 12개 장면 모두 필터를 통과시켜 물체 대비를 잽니다</span>,
    drawerFor: (n) => (n === 2 ? 'graph' : n === 4 ? 'code' : n === 5 ? 'log' : null),
    drawer: (d, st) => d === 'graph'
      ? <PointGraph xTicks={(st >= 4 ? app : exp).map((r, i) => ({ v: i + 1, label: r.name }))} xMin={0.5} xMax={Math.max(2, (st >= 4 ? app : exp).length) + 0.5} yMax={3} yFmt={(v) => `${v.toFixed(1)}배`}
          yLabel="물체 대비 (12장면 중앙값)" xLabel="실행한 필터" goal={{ y: GOAL_RATIO, label: `목표 ${GOAL_RATIO}배 이상`, above: true }}
          series={[{ name: '대비', points: (st >= 4 ? app : exp).map((r, i) => ({ x: i + 1, y: Math.min(3, r.median), id: r.id, tip: `${r.name} · 물체 대비 ${r.median.toFixed(2)}배 · 목표 넘은 장면 ${r.per.filter((v) => v >= GOAL_RATIO).length}/12` })) }]}
          activeId={shown?.id ?? null} onHover={setHover}
          read="점 하나 = 필터 하나를 12장면에 적용한 결과. 높을수록 물체 윤곽이 배경보다 밝게 드러난다. 초록 띠 안이면 목표 달성."
          link={shown ? `위 오른쪽 지도에서 주황 상자(물체) 안이 밖보다 ${shown.median.toFixed(2)}배 밝다 = 이 점의 높이. 아래 12장면 띠의 숫자가 장면별 값.` : ''} />
      : d === 'code'
      ? (st === 4
        ? <div className="cdrawer"><pre className="code"><span className="c"># Vision Lab · 내 3×3 필터 (각 칸 −2 ~ 2)</span>{'\n'}kernel = </pre>{kGrid(mine, true)}<pre className="code">{'\n'}result = apply_to_all(cameras=12, kernel)   <span className="c"># 합 = {mine.reduce((a, b) => a + b, 0)}</span></pre><button className="run-btn" onClick={() => run('apply', `내 필터 ${app.length + 1}`, mine)}>실행 ▶</button></div>
        : <div className="cdrawer cdrawer--locked">코드 서랍은 적용 단계에서 열립니다.</div>)
      : <ol className="ldrawer">{[...runs].reverse().map((r) => <li key={r.id}><b>#{r.id}</b> {r.kind === 'exp' ? '실험' : '적용'} · {r.name} [{r.k.map(fmt).join(', ')}] → 물체 대비 {r.median.toFixed(2)}배 · 목표 넘은 장면 {r.per.filter((v) => v >= GOAL_RATIO).length}/12</li>)}{!runs.length && <li>아직 기록이 없습니다.</li>}</ol>,
    wrap: {
      q: '3×3 필터는 화면 숫자 몇 개를 곱해 더해서 결과 한 칸을 만들까?', options: ['3개', '6개', '9개', '12개'], correct: 2,
      why: '가로 3 × 세로 3 = 9개의 숫자를 필터 9칸과 각각 곱해 모두 더합니다.', where: '실험 단계의 3×3 계산 상자',
      conclusion: applyOk && flat && edge ? `필터는 3×3 숫자 표다. 화면 위를 한 칸씩 옮기며 곱해 더하면 새 화면이 나온다. ${flat.name} 필터는 물체 대비가 ${flat.median.toFixed(2)}배로 변화가 없었고, ${edge.name} 필터는 ${edge.median.toFixed(2)}배로 물체 윤곽이 돋보였다. 내가 만든 필터 [${applyOk.k.join(', ')}]는 ${applyOk.median.toFixed(2)}배였다. 숫자 합을 0으로 맞추면 평평한 곳은 사라지고 경계만 남는다.` : '',
      record: () => ({ chart: { title: '필터별 12장면 물체 대비 (÷3, 1 = 3배)', x: runs.map((r) => r.name.replace('내 필터 ', '내')), y: runs.map((r) => Math.min(1, r.median / 3)) } })
    },
    source: `${BASIS3} · 계산 src/sim/filters.ts`,
    nextId: 'vision-4'
  };
  return <LessonFrame def={def} onExit={onExit} onHome={onHome} />;
}
