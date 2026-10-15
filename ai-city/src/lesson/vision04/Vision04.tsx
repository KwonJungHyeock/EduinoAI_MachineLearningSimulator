// author: eduino
// 비전 지구 4차시 · 색으로 물체 골라내기 — 색 범위(색상 · 채도)로 사건 물체만 골라낸다. 색만으로 안 되면 '변화'를 함께 쓴다.
// 수치는 src/sim/colors.ts 계산값(점검: tools/check_vision04.ts).
import { useEffect, useMemo, useRef, useState } from 'react';
import { prepare, evaluate, pass, GOAL, BASIS4, type ColorData, type Range, type SceneEval } from '../../sim/colors';
import { LessonFrame, type LessonDef } from '../LessonFrame';
import { ConceptBox, Question, Feedback } from '../ui';
import { PointGraph } from '../PointGraph';
import { CodeCells } from '../CodeCells';
import { src } from '../vision01/scenes';

interface Run { id: number; kind: 'exp' | 'apply'; r: Range; ev: SceneEval[] }
const KEY = '#14b8a6', WIDTHS = [20, 40, 60, 90, 120], SATS = [0.2, 0.35, 0.5];
const pct = (x: number) => `${Math.round(x * 100)}%`;
const PREDICT = ['주황 차 하나만 정확히 골라진다', '다른 주황색 물체도 함께 골라진다', '아무것도 안 골라진다', '모든 차가 골라진다'];
const tag = (r: Range) => `${r.hue}°±${r.width / 2} · 채도≥${r.sat}${r.change ? ' · +변화' : ''}`;

function MaskView({ D, i, ev }: { D: ColorData; i: number; ev: SceneEval | null }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = cv.current; if (!c) return; c.width = D.w; c.height = D.h;
    const ctx = c.getContext('2d')!; ctx.clearRect(0, 0, D.w, D.h); if (!ev) return;
    const im = ctx.createImageData(D.w, D.h);
    ev.mask.forEach((m, k) => { const col = m === 2 ? [47, 191, 138, 210] : m === 1 ? [239, 68, 68, 210] : m === 3 ? [245, 197, 66, 150] : [0, 0, 0, 0]; im.data.set(col, k * 4); });
    ctx.putImageData(im, 0, 0);
  }, [D, ev]);
  const s = D.scenes[i];
  return (
    <div className="cs__pic">
      <img src={src(s.id, 'event')} alt={s.name} />
      <canvas ref={cv} className="cs__mask" />
      <span className="zoom__rec">{s.name} · {s.situation}</span>
    </div>
  );
}

export function Vision04({ onExit, onHome }: { onExit: () => void; onHome: () => void }) {
  const [D, setD] = useState<ColorData | null>(null);
  useEffect(() => { fetch('./vision/colors.json').then((r) => r.json()).then((d) => setD(prepare(d))); }, []);
  const [scene, setScene] = useState(0);
  const [predict, setPredict] = useState<number | null>(null);
  const [exp, setExpR] = useState<Range>({ hue: 20, width: 40, sat: 0.35, change: false });
  const [code, setCode] = useState<Range>({ hue: 200, width: 40, sat: 0.5, change: false });
  const [runs, setRuns] = useState<Run[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const nid = useRef(1);
  const cur = step >= 4 ? code : exp;
  const live = useMemo(() => (D ? evaluate(D, cur) : null), [D, cur]);
  if (!D || !live) return <div className="loading">장면 색을 불러오는 중…</div>;

  const run = (kind: Run['kind'], r: Range) => setRuns((rs) => [...rs, { id: nid.current++, kind, r: { ...r }, ev: evaluate(D, r) }]);
  const expR = runs.filter((r) => r.kind === 'exp'), app = runs.filter((r) => r.kind === 'apply');
  const lowP = expR.find((r) => r.ev[0].recall >= 0.4 && r.ev[0].precision < 0.5) ?? null;
  const allFail = expR.filter((r) => !r.ev.every(pass)).length >= 2;
  const applyOk = app.find((r) => r.ev.every(pass)) ?? null;
  const hov = runs.find((r) => r.id === hover) ?? null;
  const ev = hov ? hov.ev : live;
  const shownR = hov ? hov.r : cur;

  const fb = (() => {
    const r = [...app].reverse()[0]; if (!r) return null;
    const where = `서랍 [기록] #${r.id}`, bad = r.ev.filter((e) => !pass(e));
    if (!bad.length) return { ok: true, why: `세 장면 모두 정밀도 ${GOAL.precision * 100}% · 재현율 ${GOAL.recall * 100}% 이상입니다 (${r.ev.map((e) => `${e.name} ${pct(e.precision)}/${pct(e.recall)}`).join(' · ')}).`, where };
    const lowPrec = bad.find((e) => e.precision < GOAL.precision);
    if (lowPrec && !r.r.change) return { ok: false, why: `${lowPrec.name}에서 고른 것 중 진짜 물체가 ${pct(lowPrec.precision)}뿐입니다. 같은 색의 다른 물체가 섞였어요 → use_change 를 True 로 켜서 '바뀐 곳' 중에서만 고르세요.`, where };
    if (lowPrec) return { ok: false, why: `${lowPrec.name}의 정밀도가 ${pct(lowPrec.precision)}입니다 → 색상 범위를 물체 색 쪽으로 옮기거나 채도 기준을 올려 보세요.`, where };
    const lowRec = bad[0];
    return { ok: false, why: `${lowRec.name}에서 진짜 물체의 ${pct(lowRec.recall)}만 골랐습니다(노란 칸 = 놓침) → 색상 폭(width)을 넓히거나 채도 기준(sat)을 낮춰 보세요.`, where };
  })();

  const hueBar = (r: Range) => {
    const st = (r.hue - r.width / 2 + 360) % 360, en = st + r.width;
    const segs = en <= 360 ? [[st, r.width]] : [[st, 360 - st], [0, en - 360]];
    return <div className="huebar">{segs.map(([a, w], i) => <div key={i} className="huebar__sel" style={{ left: `${a / 3.6}%`, width: `${w / 3.6}%` }} />)}</div>;
  };

  const def: LessonDef = {
    id: 'vision-4', n: 4, total: 8, title: '색으로 물체 골라내기', keyColor: KEY,
    place: '도시 영상 관제센터 · 분석실',
    problem: '신호 위반 차 · 무단횡단 현장의 주황 · 빨간 차, 접촉 사고 차량을 색으로 골라내야 한다. 세 장면을 한 가지 설정으로.',
    goals: [
      { text: '색 범위로 고르면 무엇이 골라지는지 확인하기', done: !!lowP },
      { text: '색만으로는 세 장면을 다 맞출 수 없는 것 확인하기', done: !!(lowP && allFail) },
      { text: `세 장면 모두 정밀도 ${GOAL.precision * 100}% · 재현율 ${GOAL.recall * 100}% 이상`, done: !!applyOk }
    ],
    canNext: [true, predict !== null, !!(lowP && allFail), true, !!applyOk],
    now: [
      '지시서를 읽고 [다음]을 누르세요',
      predict === null ? '보기 하나를 골라 예측하세요' : '[다음]을 눌러 실험으로 가세요',
      !lowP ? '주황색(색상 20° 근처)으로 [세 장면 골라내기]를 누르세요' : !allFail ? '색상 · 폭 · 채도를 바꿔 한 번 더 [세 장면 골라내기]를 누르세요' : '[다음]을 눌러 개념으로 가세요',
      '개념을 읽고 [다음]을 누르세요',
      applyOk ? '[다음]을 눌러 정리하세요' : '코드 서랍의 노란 칸을 바꾸고 [실행]을 누르세요'
    ],
    onStep: (n) => { setStep(n); setHover(null); },
    rail: (st) => (
      <>
        {st === 0 && <p className="lead-text">사람은 "주황색 차"처럼 <b>색</b>으로 물체를 찾습니다. 컴퓨터도 픽셀 색이 일정 범위 안에 있으면 골라낼 수 있어요. 그런데 색만으로 충분할까요?</p>}
        {st === 1 && <Question q="교차로 장면에서 주황색 범위로 픽셀을 고르면?" options={PREDICT} picked={predict} onPick={setPredict} target />}
        {st === 2 && (
          <div className="ctrl">
            <p className="ctrl__label">색상(Hue) {exp.hue}°</p>
            <input type="range" className="hue" min={0} max={350} step={10} value={exp.hue} onChange={(e) => setExpR({ ...exp, hue: +e.target.value })} />
            {hueBar(exp)}
            <p className="ctrl__label">색상 폭</p>
            <div className="seg seg--5x">{WIDTHS.map((w) => <button key={w} className={exp.width === w ? 'is-on' : ''} onClick={() => setExpR({ ...exp, width: w })}>{w}°</button>)}</div>
            <p className="ctrl__label">채도(진하기) 기준</p>
            <div className="seg seg--3x">{SATS.map((s) => <button key={s} className={exp.sat === s ? 'is-on' : ''} onClick={() => setExpR({ ...exp, sat: s })}>{s} 이상</button>)}</div>
            <div className="ctrl__row"><button className={`rbtn rbtn--key ${!(lowP && allFail) ? 'is-target' : ''}`} onClick={() => run('exp', exp)}>세 장면 골라내기</button></div>
            <ul className="obs-check">
              <li className={lowP ? 'done' : ''}><i>{lowP ? '✓' : ''}</i>교차로: 다른 주황 물체까지 골라짐 {lowP ? `(정밀도 ${pct(lowP.ev[0].precision)})` : ''}</li>
              <li className={allFail ? 'done' : ''}><i>{allFail ? '✓' : ''}</i>색만으로는 세 장면 목표 실패</li>
            </ul>
            {lowP && predict !== null && <div className="compare"><p><span>내 예측</span>{PREDICT[predict]}</p><p><span>실제</span>{PREDICT[1]} — 정밀도 {pct(lowP.ev[0].precision)}</p></div>}
          </div>
        )}
        {st === 3 && (
          <ConceptBox term="색 공간 (HSV) · 단서 합치기" def="RGB 숫자를 색상(H) · 채도(S) · 밝기(V)로 바꾸면 '주황색'처럼 사람이 말하는 색으로 범위를 정할 수 있다.">
            <p className="concept__formula">고르기 = 색 범위 안 AND 바뀐 곳(2차시)</p>
            <p className="concept__note">색은 강력한 단서지만 같은 색의 다른 물체를 구별하지 못합니다. 2차시의 '숫자 차이(변화)'를 함께 쓰면 "주황색이면서 방금 나타난 것"만 남아요. 여러 단서를 합치는 것이 영상처리의 기본 전략입니다.</p>
          </ConceptBox>
        )}
        {st === 4 && <div className="ctrl"><p className="lead-text">코드 서랍에서 색상 · 폭 · 채도 · <b>use_change</b>를 정해 세 장면을 한 번에 맞추세요.</p>{hueBar(code)}{fb && <Feedback {...fb} />}</div>}
      </>
    ),
    scene: () => (
      <div className="px">
        <div className="cs__main"><MaskView D={D} i={scene} ev={ev[scene]} /></div>
        <div className="cs__legend"><span className="g">■ 맞게 고름</span><span className="r">■ 잘못 고름</span><span className="y">■ 놓친 물체</span><span>설정 {tag(shownR)}</span></div>
        <div className="px__strip px__strip--3">
          {D.scenes.map((s, i) => (
            <button key={s.id} className={`px__th ${i === scene ? 'is-on' : ''}`} onClick={() => setScene(i)}>
              <img src={src(s.id, 'event', true)} alt="" /><span>{s.name}</span>
              <i className={pass(ev[i]) ? 'ok' : 'miss'}>정밀 {pct(ev[i].precision)} · 재현 {pct(ev[i].recall)}</i>
            </button>
          ))}
        </div>
      </div>
    ),
    band: (
      <>
        <span className="chip chip--clock"><i>설정</i><b style={{ fontSize: 13 }}>{tag(shownR)}</b></span>
        {ev.map((e) => <span key={e.id} className={`chip ${pass(e) ? 'ok' : 'miss'}`}><i>{e.name}</i><b>{pct(e.precision)}<small> / {pct(e.recall)}</small></b></span>)}
        <span className="chip"><i>목표 (정밀 / 재현)</i><b>{GOAL.precision * 100}%<small> / {GOAL.recall * 100}%</small></b></span>
      </>
    ),
    drawerFor: (n) => (n === 2 ? 'graph' : n === 4 ? 'code' : n === 5 ? 'log' : null),
    drawer: (d, st) => d === 'graph'
      ? (() => { const rs = st >= 4 ? app : expR; return (
        <PointGraph xTicks={rs.map((r, i) => ({ v: i + 1, label: `#${r.id}` }))} xMin={0.5} xMax={Math.max(2, rs.length) + 0.5}
          yLabel="세 장면 중 가장 낮은 값" xLabel="실행 순서" goal={{ y: GOAL.precision, label: `정밀도 목표 ${GOAL.precision * 100}%`, above: true }}
          series={[
            { name: '정밀도(최저)', cls: 'a', points: rs.map((r, i) => ({ x: i + 1, y: Math.min(...r.ev.map((e) => e.precision)), id: r.id, tip: `${tag(r.r)} · 최저 정밀도 ${pct(Math.min(...r.ev.map((e) => e.precision)))}` })) },
            { name: '재현율(최저)', cls: 'b', points: rs.map((r, i) => ({ x: i + 1, y: Math.min(...r.ev.map((e) => e.recall)), id: r.id + 10000, tip: `${tag(r.r)} · 최저 재현율 ${pct(Math.min(...r.ev.map((e) => e.recall)))}` })) }
          ]}
          activeId={hov?.id ?? null} onHover={(id) => setHover(id === null ? null : id % 10000)}
          read="청록 = 고른 것 중 진짜 물체 비율(헛선택이 적을수록 높음), 주황 = 진짜 물체 중 고른 비율(놓침이 적을수록 높음). 둘 다 높아야 목표."
          link={hov ? `위 장면의 빨간 칸(잘못 고름)이 많으면 청록이 낮고, 노란 칸(놓침)이 많으면 주황이 낮다. 이 실행: ${hov.ev.map((e) => `${e.name} ${pct(e.precision)}/${pct(e.recall)}`).join(' · ')}` : '점에 마우스를 올리면 그 실행의 고른 결과가 위 장면에 나타납니다.'} />); })()
      : d === 'code'
      ? <CodeCells enabled={st === 4} title="비전 지구 · 색으로 고르기" run="result = pick_all(scenes=3, hue, width, sat, use_change)" onRun={() => run('apply', code)}
          lines={[
            { kind: 'cell', name: 'hue', value: `${code.hue}°`, comment: '가운데 색상 (0 빨강 · 30 주황 · 60 노랑 · 120 초록 · 240 파랑)', dec: () => setCode((c) => ({ ...c, hue: (c.hue + 350) % 360 })), inc: () => setCode((c) => ({ ...c, hue: (c.hue + 10) % 360 })) },
            { kind: 'cell', name: 'width', value: `${code.width}°`, comment: '색상 폭', dec: () => setCode((c) => ({ ...c, width: WIDTHS[Math.max(0, WIDTHS.indexOf(c.width) - 1)] })), inc: () => setCode((c) => ({ ...c, width: WIDTHS[Math.min(WIDTHS.length - 1, WIDTHS.indexOf(c.width) + 1)] })) },
            { kind: 'cell', name: 'sat', value: `${code.sat}`, comment: '채도 기준 (이상만 고름)', dec: () => setCode((c) => ({ ...c, sat: SATS[Math.max(0, SATS.indexOf(c.sat) - 1)] })), inc: () => setCode((c) => ({ ...c, sat: SATS[Math.min(2, SATS.indexOf(c.sat) + 1)] })) },
            { kind: 'cell', name: 'use_change', value: code.change ? 'True' : 'False', comment: '바뀐 곳(2차시)에서만 고르기', toggle: () => setCode((c) => ({ ...c, change: !c.change })) }
          ]} />
      : <ol className="ldrawer">{[...runs].reverse().map((r) => <li key={r.id}><b>#{r.id}</b> {r.kind === 'exp' ? '실험' : '적용'} · {tag(r.r)} → {r.ev.map((e) => `${e.name} 정밀 ${pct(e.precision)} 재현 ${pct(e.recall)}`).join(' · ')}</li>)}{!runs.length && <li>아직 기록이 없습니다.</li>}</ol>,
    wrap: {
      q: '색으로만 골랐을 때 교차로에서 정밀도가 낮았던 가장 큰 이유는?', options: ['차가 너무 작아서', '같은 주황색인 다른 차도 골라서', '해상도가 낮아서', '밤이라서'], correct: 1,
      why: `교차로에는 신호 위반 차 말고도 주황색 차가 한 대 더 있습니다. 색만 보면 둘을 구별할 수 없어 정밀도가 ${lowP ? pct(lowP.ev[0].precision) : '낮게'} 나왔어요.`, where: '실험 단계 교차로 장면의 빨간 칸',
      conclusion: applyOk && lowP ? `색 범위로 고르면 원하는 색의 픽셀을 바로 찾을 수 있다. 하지만 교차로에서는 다른 주황색 차까지 골라 정밀도가 ${pct(lowP.ev[0].precision)}였다. 색에 '바뀐 곳' 단서를 더한 ${tag(applyOk.r)} 설정으로 세 장면 모두 정밀도 ${pct(Math.min(...applyOk.ev.map((e) => e.precision)))} 이상 · 재현율 ${pct(Math.min(...applyOk.ev.map((e) => e.recall)))} 이상을 얻었다. 단서 하나보다 여러 단서를 합치면 더 정확하다.` : '',
      record: () => ({ chart: { title: '실행별 세 장면 최저 정밀도', x: runs.map((r) => `#${r.id}`), y: runs.map((r) => Math.min(...r.ev.map((e) => e.precision))) } })
    },
    source: `임시: ${BASIS4} · 계산 src/sim/colors.ts`,
    nextId: 'vision-5'
  };
  return <LessonFrame def={def} onExit={onExit} onHome={onHome} />;
}
