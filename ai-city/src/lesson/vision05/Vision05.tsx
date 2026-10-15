// author: eduino
// 비전 지구 5차시 · 분류 대결: kNN vs CNN — 거리 장면에서 잘라낸 20×20 조각을 '차 · 사람 · 빈 곳'으로 나눈다.
// kNN(기억해서 비교) 과 CNN(필터를 스스로 학습)을 학습 조각 수 · 에폭을 바꿔 브라우저에서 직접 학습 · 시험한다.
// 수치는 src/sim/nn.ts 계산값(점검: tools/check_vision05.ts).
import { useEffect, useMemo, useRef, useState } from 'react';
import { prepare, take, knnPredict, makeCNN, cnnPredict, trainEpoch, featureMaps, accuracy, LR, CLASSES, type Crops, type CNN, type DataSet } from '../../sim/nn';
import { LessonFrame, type LessonDef } from '../LessonFrame';
import { ConceptBox, Question, Feedback } from '../ui';
import { PointGraph } from '../PointGraph';
import { CodeCells } from '../CodeCells';
import { CropGrid, BigCrop, type Pred } from '../CropGrid';

type Model = 'knn' | 'cnn';
interface Cfg { model: Model; n: number; epochs: number }
interface Run extends Cfg { id: number; kind: 'exp' | 'apply'; acc: number; ok: number; preds: Pred[]; loss: number[]; accs: number[]; m?: CNN }
interface Street { w: number; h: number; day: { i: number; objs: { cls: string; box: number[] }[] }[] }
const KEY = '#14b8a6', NS = [30, 100, 300, 1000], EPS = [2, 4, 8, 12], EXP_EP = 8, GOAL = 0.95;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const MN = { knn: 'kNN', cnn: 'CNN' } as const;
const tag = (c: Cfg) => `${MN[c.model]} · 조각 ${c.n}${c.model === 'cnn' ? ` · 에폭 ${c.epochs}` : ''}`;
const PREDICT = ['kNN이 계속 앞선다', '조각이 적을 땐 kNN, 많아지면 CNN이 앞선다', 'CNN이 처음부터 끝까지 앞선다', '조각 수와 상관없이 둘이 비슷하다'];
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

// 3×3 필터 8개 — 주황 = +, 파랑 = − (3차시 필터와 같은 모양)
function FilterBank({ m, big }: { m: CNN; big?: boolean }) {
  const mx = Math.max(...Array.from(m.w1, Math.abs)) || 1;
  return (
    <div className={`fb ${big ? 'fb--big' : ''}`}>
      {Array.from({ length: m.F }, (_, f) => (
        <div key={f} className="fb__f">
          <div className="fb__m">{Array.from({ length: 9 }, (_, i) => { const v = m.w1[f * 9 + i] / mx; return <span key={i} style={{ background: v >= 0 ? `rgba(249,115,22,${Math.abs(v)})` : `rgba(56,132,255,${Math.abs(v)})` }}>{big ? (Math.abs(m.w1[f * 9 + i]) < 0.05 ? '0' : m.w1[f * 9 + i].toFixed(1)) : ''}</span>; })}</div>
          <i>필터 {f + 1}</i>
        </div>
      ))}
    </div>
  );
}
// 한 조각에 대한 필터별 반응 지도(밝을수록 강하게 반응)
function FeatureMaps({ m, x }: { m: CNN; x: Float32Array }) {
  const conv = useMemo(() => featureMaps(m, x), [m, x]);
  const C = m.S - 2;
  return <div className="fm">{Array.from({ length: m.F }, (_, f) => <MapCv key={f} v={conv.subarray(f * C * C, (f + 1) * C * C)} C={C} />)}</div>;
}
function MapCv({ v, C }: { v: Float32Array; C: number }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const c = cv.current; if (!c) return; c.width = C; c.height = C; const ctx = c.getContext('2d')!, im = ctx.createImageData(C, C), mx = Math.max(1e-6, ...v); for (let i = 0; i < C * C; i++) { const a = (v[i] / mx) * 255; im.data[i * 4] = a; im.data[i * 4 + 1] = a * 0.85; im.data[i * 4 + 2] = a * 0.45; im.data[i * 4 + 3] = 255; } ctx.putImageData(im, 0, 0); }, [v, C]);
  return <canvas ref={cv} />;
}
// 에폭별 시험 정확도(청록) · 손실(주황)
function Curve({ r }: { r: Pick<Run, 'model' | 'n' | 'loss' | 'accs' | 'epochs'> }) {
  if (r.model === 'knn') return <div className="v5__curve"><p className="v5__h">학습 곡선</p><p className="v5__note">kNN은 학습 단계가 없습니다. 조각 {r.n}개를 그대로 기억했다가, 시험 조각과 가장 비슷한 3개의 정답으로 다수결합니다.</p></div>;
  const W = 260, H = 96, E = Math.max(r.epochs, 2), X = (e: number) => 22 + (e / (E - 1 || 1)) * (W - 30), Y = (v: number) => 8 + (1 - v) * (H - 22);
  const L0 = Math.max(1.1, ...r.loss);
  return (
    <div className="v5__curve">
      <p className="v5__h">학습 곡선 <span className="a">● 시험 정확도</span> <span className="b">● 손실(틀린 정도)</span></p>
      <svg viewBox={`0 0 ${W} ${H}`}>
        {[0, 0.5, 1].map((f) => <line key={f} x1={22} x2={W - 8} y1={Y(f)} y2={Y(f)} className="g-grid" />)}
        <line x1={22} x2={W - 8} y1={Y(GOAL)} y2={Y(GOAL)} className="v5__goal" />
        <text x={2} y={Y(1) + 4} className="g-axis">100</text><text x={8} y={Y(0) + 4} className="g-axis">0</text>
        <polyline className="v5__lb" points={r.loss.map((l, e) => `${X(e)},${Y(l / L0)}`).join(' ')} />
        <polyline className="v5__la" points={r.accs.map((a, e) => `${X(e)},${Y(a)}`).join(' ')} />
        {r.accs.map((a, e) => <circle key={e} cx={X(e)} cy={Y(a)} r={2.4} className="v5__da" />)}
        <text x={W - 8} y={H - 2} className="g-axis" textAnchor="end">에폭 {r.accs.length} / {r.epochs}</text>
      </svg>
    </div>
  );
}

export function Vision05({ onExit, onHome }: { onExit: () => void; onHome: () => void }) {
  const [C, setC] = useState<Crops | null>(null);
  const [S, setS] = useState<Street | null>(null);
  useEffect(() => {
    fetch('./vision/ds/crops.json').then((r) => r.json()).then((d) => setC(prepare(d)));
    fetch('./vision/ds/scenes.json').then((r) => r.json()).then(setS);
  }, []);
  const test = useMemo(() => (C ? take(C, 'day-test') : null), [C]);
  const trains = useMemo(() => new Map<number, DataSet>(), [C]);
  const trainOf = (n: number) => { if (!trains.has(n)) trains.set(n, take(C!, 'day-train', n, 7)); return trains.get(n)!; };
  const samples = useMemo(() => (C ? [0, 1, 2].map((c) => { const d = take(C, 'day-train', 200, 3); return d.X.filter((_, i) => d.y[i] === c).slice(0, 6); }) : null), [C]);

  const [pic, setPic] = useState(0);
  const [predict, setPredict] = useState<number | null>(null);
  const [exp, setExp] = useState<Cfg>({ model: 'knn', n: 100, epochs: EXP_EP });
  const [code, setCode] = useState<Cfg>({ model: 'knn', n: 300, epochs: 2 });
  const [runs, setRuns] = useState<Run[]>([]);
  const [live, setLive] = useState<(Cfg & { loss: number[]; accs: number[]; preds: Pred[]; m?: CNN }) | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const nid = useRef(1), alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  if (!C || !S || !test || !samples) return <div className="loading">학습 조각을 불러오는 중…</div>;

  const train = async (kind: Run['kind'], cfg: Cfg) => {
    if (live) return;
    const tr = trainOf(cfg.n), base = { ...cfg, loss: [] as number[], accs: [] as number[], preds: [] as Pred[] };
    setLive(base); setHover(null); await tick(30);
    let preds: Pred[] = [], m: CNN | undefined; const loss: number[] = [], accs: number[] = [];
    if (cfg.model === 'knn') { preds = test.X.map((x) => knnPredict(tr, x, 3)); }
    else {
      m = makeCNN(20, 8, 1);
      for (let e = 0; e < cfg.epochs; e++) {
        loss.push(trainEpoch(m, tr, LR, 16, e + 1));
        preds = test.X.map((x) => cnnPredict(m!, x));
        accs.push(accuracy((x) => cnnPredict(m!, x), test).acc);
        if (!alive.current) return;
        setLive({ ...base, loss: [...loss], accs: [...accs], preds, m: { ...m, w1: m.w1.slice() } }); await tick(70);
      }
    }
    const ok = preds.filter((p, i) => p.cls === test.y[i]).length;
    if (!alive.current) return;
    setRuns((rs) => [...rs, { id: nid.current++, kind, ...cfg, acc: ok / test.y.length, ok, preds, loss, accs, m }]);
    setLive(null);
  };

  const expR = runs.filter((r) => r.kind === 'exp'), app = runs.filter((r) => r.kind === 'apply');
  const pair = (ns: number[]) => {
    for (const n of ns) { const k = [...expR].reverse().find((r) => r.n === n && r.model === 'knn'), c = [...expR].reverse().find((r) => r.n === n && r.model === 'cnn'); if (k && c) return { n, k, c }; }
    return null;
  };
  const small = pair([30, 100]), large = pair([1000, 300]);
  const applyOk = app.find((r) => r.acc >= GOAL) ?? null;
  const hov = runs.find((r) => r.id === hover) ?? null;
  const stage = step >= 4 ? app : expR;
  const shown = hov ?? live ?? stage[stage.length - 1] ?? null;
  const done: Run | null = shown && 'id' in shown ? (shown as Run) : null;
  const lastCnn = (hov?.m ? hov : null) ?? [...runs].reverse().find((r) => r.m) ?? null;
  const win = (p: NonNullable<typeof small>) => (p.k.acc >= p.c.acc ? 'kNN' : 'CNN');

  const fb = (() => {
    const r = app[app.length - 1]; if (!r) return null;
    const where = `서랍 [기록] #${r.id}`;
    if (r.acc >= GOAL) return { ok: true, why: `${tag(r)} → 시험 조각 ${test.y.length}개 중 ${r.ok}개(${pct(r.acc)})를 맞혔습니다.`, where };
    if (r.model === 'knn') return { ok: false, why: `kNN은 ${pct(r.acc)}입니다. 조각을 통째로 비교해서 위치 · 밝기가 조금만 달라도 다른 것과 가까워져요 → model 을 'cnn' 으로 바꿔 보세요.`, where };
    if (r.n < 1000) return { ok: false, why: `CNN도 학습 조각이 ${r.n}개뿐이면 ${pct(r.acc)}입니다 → n_crops 를 늘려 더 많은 예를 보여 주세요.`, where };
    return { ok: false, why: `${pct(r.acc)}입니다. 학습 곡선에서 손실이 아직 내려가는 중이에요 → epochs 를 늘려 더 여러 번 복습시키세요.`, where };
  })();

  const sideFor = (i: number) => {
    const r = shown; if (!r) return null;
    if (r.model === 'knn') {
      const tr = trainOf(r.n), x = test.X[i];
      const d = tr.X.map((t, j) => { let s = 0; for (let k = 0; k < t.length; k++) { const e = t[k] - x[k]; s += e * e; } return [s, j]; }).sort((a, b) => a[0] - b[0]).slice(0, 3);
      return <div className="v5__nb"><p className="cg__l">가장 비슷한 학습 조각 3개</p><div>{d.map(([, j]) => <figure key={j}><BigCrop x={tr.X[j]} size={20} /><figcaption>{CLASSES[tr.y[j]]}</figcaption></figure>)}</div></div>;
    }
    return r.m ? <div className="v5__nb"><p className="cg__l">필터 8개가 이 조각에서 찾은 것</p><FeatureMaps m={r.m} x={test.X[i]} /></div> : null;
  };

  const street = S.day[pic];
  const def: LessonDef = {
    id: 'vision-5', n: 5, total: 8, title: '분류 대결: kNN vs CNN', keyColor: KEY,
    place: '도시 영상 관제센터 · 학습실',
    problem: '거리 카메라에서 잘라낸 조각이 차인지, 사람인지, 빈 곳인지 자동으로 알아봐야 한다. 두 가지 모델 중 어느 것을 쓸지 실험으로 정하자.',
    goals: [
      { text: '적은 조각(100개 이하)으로 두 모델 비교하기', done: !!small },
      { text: '많은 조각(300개 이상)으로 두 모델 비교하기', done: !!large },
      { text: `시험 조각 정확도 ${GOAL * 100}% 이상`, done: !!applyOk }
    ],
    canNext: [true, predict !== null, !!(small && large), true, !!applyOk],
    busy: !!live,
    now: [
      '거리 장면과 잘라낸 조각을 보고 [다음]을 누르세요',
      predict === null ? '보기 하나를 골라 예측하세요' : '[다음]을 눌러 실험으로 가세요',
      live ? '학습 중입니다 — 왼쪽에서 조각 색이 바뀌는 것을 보세요' : !small ? '조각 100개 이하로 kNN과 CNN을 각각 [학습 + 시험] 하세요' : !large ? '조각 300개 이상으로 kNN과 CNN을 각각 [학습 + 시험] 하세요' : '[다음]을 눌러 개념으로 가세요',
      '개념을 읽고 [다음]을 누르세요',
      live ? '학습 중입니다…' : applyOk ? '[다음]을 눌러 정리하세요' : '코드 서랍의 노란 칸을 바꾸고 [실행]을 누르세요'
    ],
    onStep: (n) => { setStep(n); setHover(null); },
    rail: (st) => (
      <>
        {st === 0 && <p className="lead-text">2~4차시에서는 사람이 규칙(기준값 · 필터 · 색 범위)을 정했습니다. 이번에는 <b>정답이 붙은 예</b>를 보여 주고 컴퓨터가 스스로 구별법을 익히게 합니다. 거리 장면의 상자를 20×20 흑백 <b>조각</b>으로 잘라 '차 · 사람 · 빈 곳' 정답을 붙였어요.</p>}
        {st === 1 && <Question q="학습 조각을 30개 → 1000개로 늘리면 두 모델의 시험 정확도는?" options={PREDICT} picked={predict} onPick={setPredict} target />}
        {st === 2 && (
          <div className="ctrl">
            <p className="ctrl__label">모델</p>
            <div className="seg seg--2">{(['knn', 'cnn'] as Model[]).map((m) => <button key={m} className={exp.model === m ? 'is-on' : ''} onClick={() => setExp({ ...exp, model: m })}>{m === 'knn' ? 'kNN · 기억해서 비교' : 'CNN · 필터 학습'}</button>)}</div>
            <p className="ctrl__label">학습 조각 수</p>
            <div className="seg seg--4">{NS.map((n) => <button key={n} className={exp.n === n ? 'is-on' : ''} onClick={() => setExp({ ...exp, n })}>{n}개</button>)}</div>
            <p className="ctrl__hint">CNN은 에폭 {EXP_EP}번(학습 조각 전체를 {EXP_EP}번 복습)으로 고정합니다.</p>
            <div className="ctrl__row"><button className={`rbtn rbtn--key ${!(small && large) ? 'is-target' : ''}`} disabled={!!live} onClick={() => train('exp', { ...exp, epochs: EXP_EP })}>{live ? '학습 중…' : '학습 + 시험'}</button></div>
            <ul className="obs-check">
              <li className={small ? 'done' : ''}><i>{small ? '✓' : ''}</i>적은 조각 {small ? `(${small.n}개): kNN ${pct(small.k.acc)} · CNN ${pct(small.c.acc)}` : '(100개 이하): 두 모델'}</li>
              <li className={large ? 'done' : ''}><i>{large ? '✓' : ''}</i>많은 조각 {large ? `(${large.n}개): kNN ${pct(large.k.acc)} · CNN ${pct(large.c.acc)}` : '(300개 이상): 두 모델'}</li>
            </ul>
            {small && large && predict !== null && <div className="compare"><p><span>내 예측</span>{PREDICT[predict]}</p><p><span>실제</span>조각 {small.n}개에선 {win(small)}, {large.n}개에선 {win(large)}이 앞섬</p></div>}
          </div>
        )}
        {st === 3 && (
          <ConceptBox term="합성곱 신경망 (CNN) · 학습" def="3차시에는 사람이 필터 숫자를 정했다. CNN은 정답이 붙은 조각을 보며 틀린 만큼 필터 숫자를 조금씩 스스로 고친다.">
            <p className="concept__formula">조각 → 필터 8개 → 줄이기 → 점수 3개 → 확률</p>
            <p className="concept__note"><b>kNN</b>은 배우지 않고 기억만 합니다. 예가 적을 때는 바로 쓸 수 있어 유리하지만, 조각을 픽셀 그대로 비교해서 위치 · 밝기가 조금만 달라도 헷갈려요. <b>CNN</b>은 윤곽 같은 특징을 찾는 필터를 배우므로 예가 충분하면 더 정확합니다. 학습 조각 전체를 한 번 복습하는 것을 <b>에폭</b>, 틀린 정도를 <b>손실</b>이라고 해요. 왼쪽이 방금 학습된 필터입니다.</p>
          </ConceptBox>
        )}
        {st === 4 && <div className="ctrl"><p className="lead-text">코드 서랍에서 모델 · 학습 조각 수 · 에폭을 정해 시험 조각 정확도 {GOAL * 100}% 이상을 만드세요.</p>{fb && <Feedback {...fb} />}</div>}
      </>
    ),
    scene: (st) => st <= 1 ? (
      <div className="px">
        <div className="cs__main">
          <div className="cs__pic">
            <img src={`./vision/ds/day-${String(street.i).padStart(3, '0')}.webp`} alt="거리 장면" />
            {street.objs.map((o, k) => <span key={k} className={`v5__box v5__box--${o.cls}`} style={{ left: `${o.box[0] * 100}%`, top: `${o.box[1] * 100}%`, width: `${(o.box[2] - o.box[0]) * 100}%`, height: `${(o.box[3] - o.box[1]) * 100}%` }}><i>{o.cls === 'car' ? '차' : '사람'}</i></span>)}
            <span className="zoom__rec">거리 카메라 · 장면 {street.i + 1}</span>
          </div>
        </div>
        <div className="v5__samples">
          {samples.map((xs, c) => <div key={c}><p>{CLASSES[c]}</p><div>{xs.map((x, i) => <BigCrop key={i} x={x} size={20} />)}</div></div>)}
          <div className="v5__pics">{S.day.slice(0, 4).map((d, i) => <button key={i} className={i === pic ? 'is-on' : ''} onClick={() => setPic(i)}><img src={`./vision/ds/day-${String(d.i).padStart(3, '0')}.webp`} alt="" /></button>)}</div>
        </div>
      </div>
    ) : st === 3 && lastCnn?.m ? (
      <div className="v5 v5--concept">
        <p className="v5__h">CNN이 스스로 배운 필터 8개 <span>({tag(lastCnn)})</span></p>
        <FilterBank m={lastCnn.m} big />
        <div className="v5__cmp"><div className="fl__m fl__m--k">{[-1, 0, 1, -1, 0, 1, -1, 0, 1].map((v, i) => <span key={i}>{v}</span>)}</div><p>3차시에 사람이 정한 세로 윤곽 필터. CNN은 이런 숫자를 정답을 보며 스스로 찾아냅니다. 주황 = +, 파랑 = −</p></div>
      </div>
    ) : (
      <div className="v5">
        <CropGrid data={test} preds={shown?.preds.length ? shown.preds : null} title={`시험 조각 ${test.y.length}개 · ${shown ? tag(shown) : '아직 학습 전'}`} side={sideFor} />
        <div className="v5__bottom">
          {shown ? <Curve r={shown} /> : <div className="v5__curve"><p className="v5__note">모델과 조각 수를 고르고 [학습 + 시험]을 누르면, 시험 조각마다 맞힘(초록) · 틀림(빨강)이 표시됩니다.</p></div>}
          <div className="v5__curve">
            <p className="v5__h">{shown?.model === 'cnn' ? '지금 필터 8개' : '기억한 학습 조각'}</p>
            {shown?.model === 'cnn' && (shown.m ?? (live?.m)) ? <FilterBank m={(shown.m ?? live!.m)!} />
              : shown ? <div className="v5__mem">{trainOf(shown.n).X.slice(0, 24).map((x, i) => <BigCrop key={i} x={x} size={20} />)}<span>… 총 {shown.n}개</span></div>
              : <p className="v5__note">—</p>}
          </div>
        </div>
      </div>
    ),
    band: (
      <>
        <span className="chip chip--clock"><i>모델</i><b style={{ fontSize: 13 }}>{shown ? tag(shown) : '—'}</b></span>
        <span className={`chip ${done ? (done.acc >= GOAL ? 'ok' : 'miss') : ''}`}><i>시험 정확도</i><b>{done ? pct(done.acc) : live?.accs.length ? pct(live.accs[live.accs.length - 1]) : '—'}<small>{done ? ` ${done.ok}/${test.y.length}` : ''}</small></b></span>
        {shown?.model === 'cnn' && <span className="chip"><i>손실</i><b>{shown.loss.length ? shown.loss[shown.loss.length - 1].toFixed(2) : '—'}</b></span>}
        <span className="chip"><i>목표</i><b>{GOAL * 100}%</b></span>
      </>
    ),
    drawerFor: (n) => (n === 2 ? 'graph' : n === 4 ? 'code' : n === 5 ? 'log' : null),
    drawer: (d, st) => d === 'graph'
      ? (() => { const rs = st >= 4 ? runs : expR; const pts = (m: Model) => rs.filter((r) => r.model === m).map((r) => ({ x: NS.indexOf(r.n) + 1 + (m === 'cnn' ? 0.06 : -0.06), y: r.acc, id: r.id, tip: `${tag(r)} · ${pct(r.acc)}` })); return (
        <PointGraph xTicks={NS.map((n, i) => ({ v: i + 1, label: `${n}개` }))} xMin={0.5} xMax={4.5}
          yLabel="시험 조각 정확도" xLabel="학습 조각 수" goal={{ y: GOAL, label: `목표 ${GOAL * 100}%`, above: true }}
          series={[{ name: 'kNN', cls: 'a', points: pts('knn') }, { name: 'CNN', cls: 'b', points: pts('cnn') }]}
          activeId={hov?.id ?? null} onHover={setHover}
          read="같은 학습 조각 수에서 청록(kNN)과 주황(CNN) 점의 높이를 비교하세요. 오른쪽으로 갈수록 예가 많습니다."
          link={hov ? `위 조각 격자가 이 실행의 결과로 바뀌었습니다. 빨간 테두리 ${test.y.length - hov.ok}개 = 틀린 조각. 조각에 마우스를 올리면 왜 그렇게 판단했는지 볼 수 있어요.` : '점에 마우스를 올리면 그 실행의 맞힘 · 틀림이 위 조각 격자에 나타납니다.'} />); })()
      : d === 'code'
      ? <CodeCells enabled={st === 4} title="비전 지구 · 조각 분류" run="model = train(model, n_crops, epochs);  test(model, crops=183)" running={!!live} onRun={() => train('apply', code)}
          lines={[
            { kind: 'cell', name: 'model', value: `'${code.model}'`, comment: "'knn' 기억해서 비교 · 'cnn' 필터 학습", toggle: () => setCode((c) => ({ ...c, model: c.model === 'knn' ? 'cnn' : 'knn' })) },
            { kind: 'cell', name: 'n_crops', value: `${code.n}`, comment: '학습 조각 수', dec: () => setCode((c) => ({ ...c, n: NS[Math.max(0, NS.indexOf(c.n) - 1)] })), inc: () => setCode((c) => ({ ...c, n: NS[Math.min(NS.length - 1, NS.indexOf(c.n) + 1)] })) },
            { kind: 'cell', name: 'epochs', value: `${code.epochs}`, comment: 'CNN 복습 횟수 (kNN은 쓰지 않음)', dec: () => setCode((c) => ({ ...c, epochs: EPS[Math.max(0, EPS.indexOf(c.epochs) - 1)] })), inc: () => setCode((c) => ({ ...c, epochs: EPS[Math.min(EPS.length - 1, EPS.indexOf(c.epochs) + 1)] })) }
          ]} />
      : <ol className="ldrawer">{[...runs].reverse().map((r) => <li key={r.id}><b>#{r.id}</b> {r.kind === 'exp' ? '실험' : '적용'} · {tag(r)} → 시험 {r.ok}/{test.y.length} ({pct(r.acc)}){r.loss.length ? ` · 마지막 손실 ${r.loss[r.loss.length - 1].toFixed(2)}` : ''}</li>)}{!runs.length && <li>아직 기록이 없습니다.</li>}</ol>,
    wrap: {
      q: '학습 조각이 많을 때 CNN이 kNN보다 정확했던 가장 큰 이유는?', options: ['조각을 더 많이 기억해서', '윤곽 같은 특징을 찾는 필터를 스스로 배워서', '시험 조각을 미리 봐서', '계산이 더 단순해서'], correct: 1,
      why: `kNN은 조각을 픽셀 그대로 비교하지만, CNN은 정답을 보며 필터 숫자를 고쳐 차 · 사람의 윤곽을 찾아냅니다${large ? ` (조각 ${large.n}개: kNN ${pct(large.k.acc)} · CNN ${pct(large.c.acc)})` : ''}.`, where: '개념 단계의 학습된 필터 · 조각에 마우스를 올렸을 때의 반응 지도',
      conclusion: applyOk && small && large ? `학습 조각이 ${small.n}개일 때는 kNN ${pct(small.k.acc)} · CNN ${pct(small.c.acc)}로 ${win(small)}이 앞섰고, ${large.n}개일 때는 kNN ${pct(large.k.acc)} · CNN ${pct(large.c.acc)}로 ${win(large)}이 앞섰다. ${tag(applyOk)} 설정으로 시험 조각 ${test.y.length}개 중 ${applyOk.ok}개(${pct(applyOk.acc)})를 맞혔다. 예가 적으면 기억하는 방법도 쓸 만하지만, 예가 충분하면 특징(필터)을 스스로 배우는 CNN이 더 정확하다.` : '',
      record: () => ({ chart: { title: '실행별 시험 조각 정확도', x: runs.map((r) => `#${r.id} ${MN[r.model]}${r.n}`), y: runs.map((r) => r.acc) } })
    },
    source: '임시: 직접 렌더한 거리 장면 200장에서 잘라낸 조각(학습 1346 · 시험 183) · 계산 src/sim/nn.ts',
    nextId: 'vision-6'
  };
  return <LessonFrame def={def} onExit={onExit} onHome={onHome} />;
}
