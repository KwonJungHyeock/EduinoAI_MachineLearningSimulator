// author: eduino
// 비전 지구 8차시 · 상황 해결② 밤의 교차로 — 데이터 편향. 낮 장면으로만 만든 6차시 탐지 모델을 밤에 쓰면 사람 · 차를 놓친다.
// 밤 조각을 더해 다시 학습 → 늘어난 헛탐지를 다시 모아 학습 → 낮 · 밤을 따로 재서 확인.
// 수치는 src/sim/detect.ts · src/sim/nn.ts 계산값(점검: tools/check_vision08.ts).
import { useEffect, useMemo, useRef, useState } from 'react';
import { prepare, take, join, makeCNN, trainEpoch, unpack, LR, CLASSES, type Crops, type CNN, type DataSet } from '../../sim/nn';
import { scan, pick, grade, score, mineHard, hardSet, NMS_ON, DET, NIGHT, type Gray, type Obj, type Win } from '../../sim/detect';
import { LessonFrame, type LessonDef } from '../LessonFrame';
import { ConceptBox, Question, Feedback } from '../ui';
import { PointGraph } from '../PointGraph';
import { CodeCells } from '../CodeCells';
import { BigCrop } from '../CropGrid';
import { loadGray, pad3, tick } from '../gray';

type MK = 'day' | 'night' | 'final';
type Tod = 'day' | 'night';
interface Cfg { model: MK; th: number }
interface S2 { precision: number; recall: number; tp: number; fp: number; fn: number }
interface Run extends Cfg { id: number; kind: 'exp' | 'apply'; d: S2; n: S2 }
interface Scenes { day: { i: number; objs: Obj[] }[]; night: { i: number; objs: Obj[] }[] }
const KEY = '#14b8a6', W = 256, H = 160, THS = [0.3, 0.5, 0.7], GOAL = 0.75, MKS: MK[] = ['day', 'night', 'final'];
const DIDS = Array.from({ length: DET.testN }, (_, i) => DET.testFrom + i), NIDS = Array.from({ length: NIGHT.testN }, (_, i) => NIGHT.testFrom + i);
const MN: Record<MK, string> = { day: '낮만 배운 모델', night: '+ 밤 조각', final: '+ 밤 헛탐지' };
const CODE: Record<MK, string> = { day: "'day'", night: "'day+night'", final: "'day+night+hard'" };
const pct = (x: number) => `${Math.round(x * 100)}%`;
const tag = (c: Cfg) => `${MN[c.model]} · 기준 ${c.th}`;
const PREDICT = ['낮과 비슷하게 잘 찾는다', '사람 · 차를 많이 놓친다', '헛탐지가 쏟아진다', '하나도 못 찾는다(0%)'];
const pass = (s: S2) => s.precision >= GOAL && s.recall >= GOAL;

export function Vision08({ onExit, onHome }: { onExit: () => void; onHome: () => void }) {
  const [C, setC] = useState<Crops | null>(null);
  const [SC, setSC] = useState<Scenes | null>(null);
  const [G, setG] = useState<{ d: Gray[]; n: Gray[] } | null>(null);
  const [scans, setScans] = useState<Partial<Record<MK, { d: Win[][]; n: Win[][] }>>>({});
  const [busy, setBusy] = useState<{ stage: string; p: number; loss?: number[] } | null>({ stage: '자료를 불러오는 중', p: 0 });
  const [parts, setParts] = useState<{ label: string; n: number; night?: boolean }[]>([{ label: '낮 조각', n: 1346 }, { label: '낮 헛탐지', n: 2500 }]);
  const models = useRef<Partial<Record<MK, CNN>>>({}), baseData = useRef<DataSet | null>(null), alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const scanAll = async (m: CNN, g: { d: Gray[]; n: Gray[] }, p0: number, p1: number, loss?: number[]) => {
    const d: Win[][] = [], n: Win[][] = [], all = g.d.length + g.n.length;
    for (let k = 0; k < all; k++) {
      if (k < g.d.length) d.push(scan(m, g.d[k])); else n.push(scan(m, g.n[k - g.d.length]));
      if (k % 5 === 4) { if (!alive.current) return null; setBusy({ stage: `시험 장면 창 밀기 (낮 40 · 밤 30) ${k + 1}/${all}`, p: p0 + ((k + 1) / all) * (p1 - p0), loss }); await tick(); }
    }
    return { d, n };
  };
  useEffect(() => {
    (async () => {
      const [c, s, mj, gd, gn] = await Promise.all([
        fetch('./vision/ds/crops.json').then((r) => r.json()).then((d) => prepare(d)),
        fetch('./vision/ds/scenes.json').then((r) => r.json()),
        fetch('./vision/ds/det_model.json').then((r) => r.json()),
        Promise.all(DIDS.map((i) => loadGray(`./vision/ds/g/day-${pad3(i)}.png`))),
        Promise.all(NIDS.map((i) => loadGray(`./vision/ds/g/night-${pad3(i)}.png`)))
      ]);
      setC(c); setSC(s); const g = { d: gd, n: gn }; setG(g);
      const m = unpack(mj.model); models.current.day = m;
      const sc = await scanAll(m, g, 0, 1); if (!sc) return;
      setScans({ day: sc }); setBusy(null);
    })();
  }, []);

  const [tod, setTod] = useState<Tod>('night');
  const [pic, setPic] = useState(0);
  const [predict, setPredict] = useState<number | null>(null);
  const [exp, setExp] = useState<Cfg>({ model: 'day', th: 0.5 });
  const [code, setCode] = useState<Cfg>({ model: 'day', th: 0.5 });
  const [runs, setRuns] = useState<Run[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [stp, setStp] = useState(0);
  const nid = useRef(1), pendingApply = useRef(false), recordRef = useRef<(() => void) | null>(null);
  useEffect(() => { if (pendingApply.current && scans[code.model]) { pendingApply.current = false; recordRef.current?.(); } });

  const cur: Cfg = stp >= 4 ? code : exp;
  const view: Cfg = hover !== null ? { ...cur, model: MKS[hover] } : cur;
  const evalCfg = (c: Cfg) => {
    const sc = scans[c.model]; if (!sc || !SC) return null;
    const gd = DIDS.map((i, k) => grade(pick(sc.d[k], c.th, NMS_ON), SC.day[i].objs, W, H)), gn = NIDS.map((i, k) => grade(pick(sc.n[k], c.th, NMS_ON), SC.night[i].objs, W, H));
    return { gd, gn, d: score(gd), n: score(gn) };
  };
  const ev = useMemo(() => evalCfg(view), [scans, SC, view.model, view.th]);
  const samples = useMemo(() => (C ? (['day-test', 'night-test'] as const).map((k) => { const d = take(C, k, 120, 4); return [0, 1].map((c) => d.X.filter((_, i) => d.y[i] === c).slice(0, 8)); }) : null), [C]);
  if (!C || !SC || !G || !scans.day || !ev || !samples) return (
    <div className="loading"><div className="v6__prep"><p>{busy?.stage ?? '준비 중'}</p><i><b style={{ width: `${(busy?.p ?? 0) * 100}%` }} /></i></div></div>
  );

  const fit = async (data: DataSet, label: string, p0: number, p1: number) => {
    const m = makeCNN(20, 8, 1), loss: number[] = [];
    for (let e = 0; e < DET.hardEpochs; e++) { loss.push(trainEpoch(m, data, LR, 16, e + 1)); if (!alive.current) return null; setBusy({ stage: `${label} · 에폭 ${e + 1}/${DET.hardEpochs}`, p: p0 + ((e + 1) / DET.hardEpochs) * (p1 - p0), loss: [...loss] }); await tick(); }
    return { m, loss };
  };
  // 2단계: 6차시 재료(낮 조각 + 낮 헛탐지)를 같은 코드로 다시 만들고 밤 조각 400개를 더해 학습
  const trainNight = async () => {
    if (busy || models.current.night) return;
    setBusy({ stage: '6차시 재료 다시 만들기 준비', p: 0 });
    const full = take(C, 'day-train'), m0 = makeCNN(20, 8, 1);
    for (let e = 0; e < DET.baseEpochs; e++) { trainEpoch(m0, full, LR, 16, e + 1); if (!alive.current) return; setBusy({ stage: `6차시 재료 다시 만들기 · 5차시 모델 에폭 ${e + 1}/${DET.baseEpochs}`, p: ((e + 1) / DET.baseEpochs) * 0.1 }); await tick(); }
    const dh: Float32Array[] = [];
    for (let i = 0; i < DET.trainScenes; i++) { dh.push(...mineHard(m0, await loadGray(`./vision/ds/g/day-${pad3(i)}.png`), SC.day[i].objs)); if (!alive.current) return; setBusy({ stage: `6차시 재료 다시 만들기 · 낮 헛탐지 ${dh.length}개`, p: 0.1 + ((i + 1) / DET.trainScenes) * 0.15 }); await tick(); }
    const nc = take(C, 'night-train'), base = join(join(full, hardSet(dh)), nc); baseData.current = base;
    const r = await fit(base, `밤 조각 ${nc.y.length}개를 더해 다시 학습`, 0.25, 0.75); if (!r) return;
    const sc = await scanAll(r.m, G, 0.75, 1, r.loss); if (!sc) return;
    models.current.night = r.m; setScans((o) => ({ ...o, night: sc })); setParts((p) => [...p, { label: '밤 조각', n: nc.y.length, night: true }]); setBusy(null);
    if (stp === 2) setExp((e) => ({ ...e, model: 'night' }));
  };
  // 3단계: '+밤 조각' 모델로 밤 · 낮 학습 장면의 헛탐지를 다시 모아 '빈 곳'으로 더해 학습
  const trainFinal = async () => {
    if (busy || models.current.final || !models.current.night || !baseData.current) return;
    setBusy({ stage: '헛탐지 모으기 준비', p: 0 });
    const mN = models.current.night, nh: Float32Array[] = [], dh2: Float32Array[] = [];
    for (let i = 0; i < NIGHT.trainScenes; i++) { nh.push(...mineHard(mN, await loadGray(`./vision/ds/g/night-${pad3(i)}.png`), SC.night[i].objs)); if (!alive.current) return; setBusy({ stage: `밤 학습 장면 ${i + 1}/${NIGHT.trainScenes}에서 헛탐지 모으기 · ${nh.length}개`, p: ((i + 1) / NIGHT.trainScenes) * 0.12 }); await tick(); }
    for (let i = 0; i < DET.trainScenes; i++) { dh2.push(...mineHard(mN, await loadGray(`./vision/ds/g/day-${pad3(i)}.png`), SC.day[i].objs)); if (!alive.current) return; setBusy({ stage: `낮 학습 장면 ${i + 1}/${DET.trainScenes}에서 헛탐지 모으기 · ${dh2.length}개`, p: 0.12 + ((i + 1) / DET.trainScenes) * 0.13 }); await tick(); }
    const r = await fit(join(join(baseData.current, hardSet(nh)), hardSet(dh2)), `헛탐지 ${nh.length + dh2.length}개를 더해 다시 학습`, 0.25, 0.75); if (!r) return;
    const sc = await scanAll(r.m, G, 0.75, 1, r.loss); if (!sc) return;
    models.current.final = r.m; setScans((o) => ({ ...o, final: sc })); setParts((p) => [...p, { label: '밤 헛탐지', n: nh.length, night: true }, { label: '낮 헛탐지(추가)', n: dh2.length }]); setBusy(null);
    if (stp === 2) setExp((e) => ({ ...e, model: 'final' }));
  };
  const record = (kind: Run['kind'], c: Cfg) => { const r = evalCfg(c); if (!r) return; setRuns((rs) => [...rs, { id: nid.current++, kind, ...c, d: r.d, n: r.n }]); };
  recordRef.current = () => record('apply', code);

  const expR = runs.filter((r) => r.kind === 'exp'), app = runs.filter((r) => r.kind === 'apply');
  const rDay = expR.find((r) => r.model === 'day') ?? null, rNight = expR.find((r) => r.model === 'night') ?? null, rFinal = expR.find((r) => r.model === 'final') ?? null;
  const applyOk = app.find((r) => pass(r.d) && pass(r.n)) ?? null;
  const fb = (() => {
    const r = app[app.length - 1]; if (!r) return null;
    const where = `서랍 [기록] #${r.id}`, s = `낮 ${pct(r.d.precision)}/${pct(r.d.recall)} · 밤 ${pct(r.n.precision)}/${pct(r.n.recall)}`;
    if (pass(r.d) && pass(r.n)) return { ok: true, why: `${tag(r)} → ${s} (정밀/재현). 낮과 밤 모두 목표를 넘었습니다.`, where };
    if (r.model === 'day') return { ok: false, why: `낮 장면으로만 배운 모델은 밤에 물체 ${r.n.tp + r.n.fn}개 중 ${r.n.tp}개만 찾습니다(${s}) → training_data 에 밤 자료를 더하세요.`, where };
    if (r.model === 'night') return { ok: false, why: `밤 조각을 더하자 밤 재현율은 올랐지만 새 헛탐지가 늘었습니다(${s}) → 'day+night+hard' 로 헛탐지를 다시 가르치세요.`, where };
    if (r.n.recall < GOAL) return { ok: false, why: `밤에는 모델의 확신도가 낮게 나와 기준 ${r.th}에서 밤 물체를 ${r.n.fn}개 놓칩니다(${s}) → threshold 를 낮춰 보세요.`, where };
    return { ok: false, why: `${s} → threshold 를 바꿔 낮 · 밤 모두 75% 이상이 되는 곳을 찾으세요.`, where };
  })();

  const ids = tod === 'day' ? DIDS : NIDS, gs = tod === 'day' ? ev.gd : ev.gn, k = Math.min(pic, ids.length - 1), gr = gs[k];
  const pctBox = (b: number[]) => ({ left: `${(b[0] / W) * 100}%`, top: `${(b[1] / H) * 100}%`, width: `${((b[2] - b[0]) / W) * 100}%`, height: `${((b[3] - b[1]) / H) * 100}%` });
  const total = parts.reduce((s, p) => s + p.n, 0);
  const prepBox = busy && (
    <div className="v6__busy"><p>{busy.stage}</p><i><b style={{ width: `${busy.p * 100}%` }} /></i>{busy.loss && <p className="v6__loss">손실 {busy.loss.map((l) => l.toFixed(2)).join(' → ')}</p>}</div>
  );
  const todSeg = <div className="seg seg--2 v8__tod">{(['day', 'night'] as Tod[]).map((t) => <button key={t} className={tod === t ? 'is-on' : ''} onClick={() => { setTod(t); setPic(0); }}>{t === 'day' ? '낮 시험 40장' : '밤 시험 30장'}</button>)}</div>;

  const def: LessonDef = {
    id: 'vision-8', n: 8, total: 8, title: '상황 해결② 밤의 교차로', keyColor: KEY,
    place: '도시 영상 관제센터 · 야간 근무',
    problem: '6 · 7차시 시스템을 밤에도 켜 달라는 요청이 왔다. 그런데 이 모델은 낮 장면으로만 배웠다. 밤에도 믿을 수 있을까?',
    goals: [
      { text: '낮만 배운 모델을 낮 · 밤에 따로 재기', done: !!rDay },
      { text: '밤 자료를 더해 다시 학습하고 결과 비교하기', done: !!(rNight && rFinal) },
      { text: `낮 · 밤 모두 정밀도 · 재현율 ${GOAL * 100}% 이상`, done: !!applyOk }
    ],
    canNext: [true, predict !== null, !!(rDay && rNight && rFinal), true, !!applyOk],
    busy: !!busy,
    now: [
      '밤 장면을 보고 [다음]을 누르세요',
      predict === null ? '보기 하나를 골라 예측하세요' : '[다음]을 눌러 실험으로 가세요',
      busy ? '학습 중입니다 — 손실이 줄어드는 것을 보세요' : !rDay ? '낮만 배운 모델로 [탐지 실행]을 누르세요' : !models.current.night ? '[밤 조각 더해 다시 학습]을 누르세요' : !rNight ? '[탐지 실행]으로 새 모델을 재세요' : !models.current.final ? '[헛탐지 다시 모아 학습]을 누르세요' : !rFinal ? '[탐지 실행]으로 새 모델을 재세요' : '[다음]을 눌러 개념으로 가세요',
      '개념을 읽고 [다음]을 누르세요',
      busy ? '학습 중입니다…' : applyOk ? '[다음]을 눌러 정리하세요' : '코드 서랍의 노란 칸을 바꾸고 [실행]을 누르세요'
    ],
    onStep: (n) => { setStp(n); setHover(null); },
    rail: (st) => (
      <>
        {st === 0 && <p className="lead-text">지금까지 만든 탐지 모델은 <b>낮</b> 거리 장면에서 잘라낸 조각으로만 배웠습니다. 밤에는 가로등 불빛만 있고 그림자 · 색 · 밝기가 전혀 달라요. AI는 배운 자료와 다른 상황을 만나면 어떻게 될까요? 시험 장면은 낮 40장 · 밤 30장입니다.</p>}
        {st === 1 && <Question q="낮 장면으로만 배운 탐지 모델(낮 정밀 89% · 재현 78%)을 밤 장면에 쓰면?" options={PREDICT} picked={predict} onPick={setPredict} target />}
        {st === 2 && (
          <div className="ctrl">
            <p className="ctrl__label">모델 (학습 자료)</p>
            <div className="seg seg--3x">{MKS.map((m) => <button key={m} disabled={!scans[m]} className={exp.model === m ? 'is-on' : ''} onClick={() => setExp({ ...exp, model: m })}>{MN[m]}</button>)}</div>
            <p className="ctrl__hint">확신도 기준은 6차시 결과대로 0.5, NMS 켬.</p>
            <div className="ctrl__row"><button className={`rbtn rbtn--key ${(!rDay || (scans.night && !rNight) || (scans.final && !rFinal)) ? 'is-target' : ''}`} disabled={!!busy} onClick={() => record('exp', exp)}>탐지 실행 (낮 40 · 밤 30)</button></div>
            <div className="ctrl__row">
              <button className={`rbtn ${rDay && !scans.night ? 'is-target' : ''}`} disabled={!!busy || !!scans.night || !rDay} onClick={trainNight}>{scans.night ? '밤 조각 학습 완료' : '밤 조각 더해 다시 학습'}</button>
              <button className={`rbtn ${rNight && !scans.final ? 'is-target' : ''}`} disabled={!!busy || !!scans.final || !rNight} onClick={trainFinal}>{scans.final ? '헛탐지 학습 완료' : '헛탐지 다시 모아 학습'}</button>
            </div>
            {prepBox}
            <ul className="obs-check">
              <li className={rDay ? 'done' : ''}><i>{rDay ? '✓' : ''}</i>낮만 배운 모델 {rDay ? `재현율 낮 ${pct(rDay.d.recall)} → 밤 ${pct(rDay.n.recall)}` : ''}</li>
              <li className={rNight ? 'done' : ''}><i>{rNight ? '✓' : ''}</i>+ 밤 조각 {rNight ? `밤 재현 ${pct(rNight.n.recall)} · 밤 정밀 ${pct(rNight.n.precision)} · 낮 정밀 ${pct(rNight.d.precision)}` : ''}</li>
              <li className={rFinal ? 'done' : ''}><i>{rFinal ? '✓' : ''}</i>+ 밤 헛탐지 {rFinal ? `밤 정밀 ${pct(rFinal.n.precision)} · 낮 정밀 ${pct(rFinal.d.precision)}` : ''}</li>
            </ul>
            {rDay && predict !== null && <div className="compare"><p><span>내 예측</span>{PREDICT[predict]}</p><p><span>실제</span>밤 물체 {rDay.n.tp + rDay.n.fn}개 중 {rDay.n.tp}개만 찾음 (재현 {pct(rDay.n.recall)}, 정밀 {pct(rDay.n.precision)})</p></div>}
          </div>
        )}
        {st === 3 && (
          <ConceptBox term="데이터 편향" def="학습 자료가 실제로 쓰일 상황을 고루 담지 못하면, 자료에 적었던 상황에서만 성능이 떨어진다. 모델은 배운 것만 안다.">
            <p className="concept__formula">성능은 상황별로 따로 잰다: 낮 ≠ 밤</p>
            <p className="concept__note">낮 · 밤을 합친 평균만 보면 문제가 가려질 수 있어요. 해결은 <b>부족한 상황의 자료</b>를 모으는 것인데, 새 자료는 새 헛탐지도 데려옵니다. 그래서 6차시처럼 헛탐지를 다시 모아 가르쳤어요. 밤에는 모델의 확신도가 낮게 나오기 때문에 기준값도 다시 맞춰야 합니다. 사람 얼굴 · 피부색 · 나이처럼 <b>사람 집단</b>에서 이런 편향이 생기면 공정성 문제가 됩니다.</p>
          </ConceptBox>
        )}
        {st === 4 && <div className="ctrl"><p className="lead-text">코드 서랍에서 학습 자료와 기준을 정해 낮 · 밤 모두 정밀도 · 재현율 {GOAL * 100}% 이상을 만드세요.</p>{prepBox}{fb && <Feedback {...fb} />}</div>}
      </>
    ),
    scene: (st) => st === 3 ? (
      <div className="v6 v8--concept">
        {(['낮 시험 조각', '밤 시험 조각'] as const).map((t, i) => (
          <div key={t} className="v8__set"><p className="v5__h">{t}</p>{[0, 1].map((c) => <div key={c} className="v8__row"><span>{CLASSES[c]}</span>{samples[i][c].map((x, j) => <BigCrop key={j} x={x} size={20} />)}</div>)}</div>
        ))}
        <div className="v8__mix"><p className="v5__h">학습 자료 구성 <span>(조각 {total.toLocaleString()}개)</span></p><div className="v8__bar">{parts.map((p) => <i key={p.label} className={p.night ? 'n' : ''} style={{ flex: p.n }} title={`${p.label} ${p.n}`} />)}</div><p className="v5__note">{parts.map((p) => `${p.label} ${p.n.toLocaleString()}`).join(' · ')} — 밤 자료는 전체의 {pct(parts.filter((p) => p.night).reduce((s, p) => s + p.n, 0) / total)}</p></div>
      </div>
    ) : (
      <div className="v6">
        <div className="v6__main">
          <div className="cs__pic v6__pic">
            <img src={`./vision/ds/${tod}-${pad3(ids[k])}.webp`} alt="시험 장면" />
            {st >= 2 && <>
              {gr.gts.filter((g) => !g.hit).map((g, i) => <span key={`m${i}`} className="v6__box v6__box--miss" style={pctBox(g.sq)}><i>놓침</i></span>)}
              {gr.res.map((r, i) => <span key={i} className={`v6__box ${r.ok === true ? 'ok' : r.ok === false ? 'no' : 'cut'}`} style={pctBox(r.d.box)}><i>{CLASSES[r.d.cls]} {Math.round(r.d.score * 100)}</i></span>)}
            </>}
            <span className="zoom__rec">{tod === 'day' ? '낮' : '밤'} 시험 장면 {k + 1} / {ids.length}</span>
          </div>
          <div className="v6__side">
            {todSeg}
            <p className="cg__t">{MN[view.model]} · 기준 {view.th}</p>
            {st >= 2 ? <>
              <p className="cg__l">이 장면: 맞음 <b className="okc">{gr.tp}</b> · 헛탐지 <b className="noc">{gr.fp}</b> · 놓침 <b className="mic">{gr.fn}</b></p>
              <div className="v8__cmp">{([['낮', ev.d], ['밤', ev.n]] as const).map(([l, s]) => <div key={l}><span>{l}</span><b>정밀 {pct(s.precision)}</b><b>재현 {pct(s.recall)}</b></div>)}</div>
            </> : <p className="cg__l v6__hint">밤에는 가로등 아래만 밝고 사람 · 차의 윤곽이 흐립니다.</p>}
            <p className="cg__t v8__mt">학습 자료 구성</p>
            <div className="v8__bar">{parts.map((p) => <i key={p.label} className={p.night ? 'n' : ''} style={{ flex: p.n }} title={`${p.label} ${p.n}`} />)}</div>
            <p className="cg__l v6__hint">주황 = 밤 자료 {parts.filter((p) => p.night).reduce((s, p) => s + p.n, 0)}개 / 전체 {total.toLocaleString()}개</p>
          </div>
        </div>
        <div className="px__strip v6__strip v8__strip">
          {ids.slice(0, 10).map((i, n) => { const g = gs[n]; return (
            <button key={i} className={`px__th ${n === k ? 'is-on' : ''}`} onClick={() => setPic(n)}>
              <img src={`./vision/ds/${tod}-${pad3(i)}.webp`} alt="" /><span>{n + 1}</span>
              {st >= 2 && <i className={g.fp === 0 && g.fn === 0 ? 'ok' : 'miss'}>헛 {g.fp} · 놓침 {g.fn}</i>}
            </button>); })}
        </div>
      </div>
    ),
    band: (
      <>
        <span className="chip chip--clock"><i>모델</i><b style={{ fontSize: 13 }}>{tag(view)}</b></span>
        <span className={`chip ${pass(ev.d) ? 'ok' : 'miss'}`}><i>낮 정밀 / 재현</i><b>{pct(ev.d.precision)}<small> / {pct(ev.d.recall)}</small></b></span>
        <span className={`chip ${pass(ev.n) ? 'ok' : 'miss'}`}><i>밤 정밀 / 재현</i><b>{pct(ev.n.precision)}<small> / {pct(ev.n.recall)}</small></b></span>
        <span className="chip"><i>목표</i><b>모두 {GOAL * 100}%</b></span>
      </>
    ),
    drawerFor: (n) => (n === 2 ? 'graph' : n === 4 ? 'code' : n === 5 ? 'log' : null),
    drawer: (d, st) => d === 'graph'
      ? (() => { const pts = MKS.map((m, i) => ({ m, i, r: evalCfg({ model: m, th: cur.th }) })).filter((x) => x.r); return (
        <PointGraph xTicks={MKS.map((m, i) => ({ v: i + 1, label: MN[m] }))} xMin={0.5} xMax={3.5}
          yLabel={`재현율 (기준 ${cur.th})`} xLabel="학습 자료" goal={{ y: GOAL, label: `목표 ${GOAL * 100}%`, above: true }}
          series={[
            { name: '낮', cls: 'a', points: pts.map(({ m, i, r }) => ({ x: i + 1, y: r!.d.recall, id: i, tip: `${MN[m]} · 낮 재현 ${pct(r!.d.recall)} · 정밀 ${pct(r!.d.precision)}` })) },
            { name: '밤', cls: 'b', points: pts.map(({ m, i, r }) => ({ x: i + 1, y: r!.n.recall, id: i + 100, tip: `${MN[m]} · 밤 재현 ${pct(r!.n.recall)} · 정밀 ${pct(r!.n.precision)}` })) }
          ]}
          activeId={hover} onHover={(id) => setHover(id === null ? null : id % 100)}
          read={`청록 = 낮 시험 장면, 주황 = 밤 시험 장면에서 찾은 물체 비율. 두 선의 간격이 데이터 편향의 크기입니다.${st >= 4 ? '' : ' 다시 학습하면 점이 하나씩 늘어납니다.'}`}
          link={hover !== null ? `위 장면이 '${MN[MKS[hover]]}'의 결과로 바뀌었습니다. 오른쪽 위 [낮 · 밤] 버튼으로 다른 시간대도 보세요.` : '점에 마우스를 올리면 그 모델의 탐지 결과가 위 장면에 나타납니다.'} />); })()
      : d === 'code'
      ? <CodeCells enabled={st === 4} title="비전 지구 · 낮 · 밤 탐지" run="model = train(training_data);  detect(day=40, night=30, threshold)" running={!!busy}
          onRun={async () => { if (scans[code.model]) { record('apply', code); return; } pendingApply.current = true; if (!models.current.night) await trainNight(); if (code.model === 'final' && !models.current.final) await trainFinal(); }}
          lines={[
            { kind: 'cell', name: 'training_data', value: CODE[code.model], comment: '낮만 · 낮+밤 조각 · 낮+밤+헛탐지', dec: () => setCode((c) => ({ ...c, model: MKS[Math.max(0, MKS.indexOf(c.model) - 1)] })), inc: () => setCode((c) => ({ ...c, model: MKS[Math.min(2, MKS.indexOf(c.model) + 1)] })) },
            { kind: 'cell', name: 'threshold', value: `${code.th}`, comment: '확신도 기준', dec: () => setCode((c) => ({ ...c, th: THS[Math.max(0, THS.indexOf(c.th) - 1)] })), inc: () => setCode((c) => ({ ...c, th: THS[Math.min(2, THS.indexOf(c.th) + 1)] })) }
          ]} />
      : <ol className="ldrawer">{[...runs].reverse().map((r) => <li key={r.id}><b>#{r.id}</b> {r.kind === 'exp' ? '실험' : '적용'} · {tag(r)} → 낮 정밀 {pct(r.d.precision)} 재현 {pct(r.d.recall)} · 밤 정밀 {pct(r.n.precision)} 재현 {pct(r.n.recall)}</li>)}{!runs.length && <li>아직 기록이 없습니다.</li>}</ol>,
    wrap: {
      q: '낮 장면으로만 배운 모델이 밤에 사람 · 차를 많이 놓친 이유는?', options: ['밤에는 사람이 적어서', '학습 자료에 밤 장면이 없어 밤의 모습을 배운 적이 없어서', '창 밀기 크기가 작아서', 'NMS가 상자를 지워서'], correct: 1,
      why: `모델은 배운 자료와 비슷한 것만 알아봅니다. 밤 자료를 더하자 밤 재현율이 ${rDay ? pct(rDay.n.recall) : '낮은 값'}에서 ${rNight ? pct(rNight.n.recall) : '높은 값'}으로 올랐어요.`, where: '실험 단계 관찰 기록 · 개념 단계의 낮 / 밤 조각 비교',
      conclusion: applyOk && rDay && rNight && rFinal ? `낮 장면으로만 배운 모델은 낮 재현율 ${pct(rDay.d.recall)}였지만 밤에는 ${pct(rDay.n.recall)}로 떨어졌다. 밤 조각을 더해 다시 학습하자 밤 재현율은 ${pct(rNight.n.recall)}로 올랐지만 밤 정밀도가 ${pct(rNight.n.precision)}로 낮아졌다. 헛탐지를 다시 모아 가르친 뒤 ${tag(applyOk)} 설정으로 낮 ${pct(applyOk.d.precision)}/${pct(applyOk.d.recall)}, 밤 ${pct(applyOk.n.precision)}/${pct(applyOk.n.recall)}(정밀/재현)를 얻었다. AI는 배운 자료만큼만 안다 — 쓰일 상황을 고루 담은 자료를 모으고, 상황별로 따로 재서 확인해야 한다.` : '',
      record: () => ({ chart: { title: '실행별 밤 재현율', x: runs.map((r) => `#${r.id}`), y: runs.map((r) => r.n.recall) } })
    },
    source: '임시: 직접 렌더한 거리 장면(낮 시험 40 · 밤 시험 30 · 밤 조각 400) · 계산 src/sim/detect.ts',
    nextId: 'vision-final'
  };
  return <LessonFrame def={def} onExit={onExit} onHome={onHome} />;
}
