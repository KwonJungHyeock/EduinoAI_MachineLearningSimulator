// author: eduino
// 비전 지구 6차시 · 객체 탐지 — 5차시 조각 분류기를 창 밀기(슬라이딩 윈도)로 장면 전체에 쓴다.
// 확신도 기준 · 겹침 제거(NMS) · 헛탐지 조각을 '빈 곳'으로 더해 다시 학습 → 정밀도 · 재현율.
// 수치는 src/sim/detect.ts · src/sim/nn.ts 계산값(점검: tools/check_vision06.ts).
import { useEffect, useMemo, useRef, useState } from 'react';
import { prepare, take, join, makeCNN, trainEpoch, cnnPredict, LR, CLASSES, type Crops, type CNN, type DataSet } from '../../sim/nn';
import { scan, pick, grade, score, sample, mineHard, hardSet, iou, DET, MATCH, NMS_ON as NMS, type Gray, type Obj, type Win } from '../../sim/detect';
import { LessonFrame, type LessonDef } from '../LessonFrame';
import { ConceptBox, Question, Feedback } from '../ui';
import { PointGraph } from '../PointGraph';
import { CodeCells } from '../CodeCells';
import { BigCrop } from '../CropGrid';
import { loadGray, pad3, tick } from '../gray';

type MK = 'base' | 'hard';
interface Cfg { model: MK; th: number; nms: boolean }
interface Run extends Cfg { id: number; kind: 'exp' | 'apply'; boxes: number; tp: number; fp: number; fn: number; precision: number; recall: number }
interface Scenes { w: number; h: number; day: { i: number; objs: Obj[] }[] }
const KEY = '#14b8a6', THS = [0.3, 0.5, 0.7, 0.9], GOAL = 0.75, W = 256, H = 160;
const IDS = Array.from({ length: DET.testN }, (_, i) => DET.testFrom + i), SHOW = IDS.slice(0, 8);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const MN: Record<MK, string> = { base: '5차시 모델', hard: '헛탐지 추가 모델' };
const tag = (c: Cfg) => `${MN[c.model]} · 기준 ${c.th} · NMS ${c.nms ? '켬' : '끔'}`;
const PREDICT = ['90% 이상 — 조각 정확도가 97%니까', '절반쯤', '10%도 안 된다 — 헛탐지가 쏟아진다', '0% — 하나도 못 찾는다'];
const SWEEP = (() => { const o: number[][] = []; for (let y = 0; y + 32 <= H; y += 8) for (let x = 0; x + 32 <= W; x += 8) o.push([x, y]); return o; })();

export function Vision06({ onExit, onHome }: { onExit: () => void; onHome: () => void }) {
  const [C, setC] = useState<Crops | null>(null);
  const [SC, setSC] = useState<Scenes | null>(null);
  const [G, setG] = useState<Gray[] | null>(null);
  const [models, setModels] = useState<Partial<Record<MK, CNN>>>({});
  const [scans, setScans] = useState<Partial<Record<MK, Win[][]>>>({});
  const [busy, setBusy] = useState<{ stage: string; p: number; loss?: number[] } | null>({ stage: '자료를 불러오는 중', p: 0 });
  const [mined, setMined] = useState<{ total: number; X: Float32Array[] } | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  // 준비: 자료 → 5차시 모델 학습(낮 학습 조각 전체 · 에폭 8) → 시험 장면 40장 창 밀기
  useEffect(() => {
    (async () => {
      const [c, s, g] = await Promise.all([
        fetch('./vision/ds/crops.json').then((r) => r.json()).then((d) => prepare(d)),
        fetch('./vision/ds/scenes.json').then((r) => r.json()),
        Promise.all(IDS.map((i) => loadGray(`./vision/ds/g/day-${pad3(i)}.png`)))
      ]);
      setC(c); setSC(s); setG(g);
      const m = makeCNN(20, 8, 1), full = take(c, 'day-train'), loss: number[] = [];
      for (let e = 0; e < DET.baseEpochs; e++) { loss.push(trainEpoch(m, full, LR, 16, e + 1)); if (!alive.current) return; setBusy({ stage: `5차시 모델 학습 · 에폭 ${e + 1}/${DET.baseEpochs}`, p: (e + 1) / DET.baseEpochs * 0.6, loss: [...loss] }); await tick(); }
      const sc: Win[][] = [];
      for (let k = 0; k < g.length; k++) { sc.push(scan(m, g[k])); if (k % 4 === 3) { if (!alive.current) return; setBusy({ stage: `시험 장면 창 밀기 ${k + 1}/${g.length}`, p: 0.6 + ((k + 1) / g.length) * 0.4 }); await tick(); } }
      setModels({ base: m }); setScans({ base: sc }); setBusy(null);
    })();
  }, []);

  const [pic, setPic] = useState(0);
  const [predict, setPredict] = useState<number | null>(null);
  const [exp, setExp] = useState<Cfg>({ model: 'base', th: 0.5, nms: false });
  const [code, setCode] = useState<Cfg>({ model: 'base', th: 0.9, nms: false });
  const [runs, setRuns] = useState<Run[]>([]);
  const [hover, setHover] = useState<number | null>(null);      // 그래프 점(기준 번호)
  const [hbox, setHbox] = useState<number | null>(null);        // 장면의 상자
  const [sw, setSw] = useState(0);
  const [step, setStep] = useState(0);
  const nid = useRef(1);
  useEffect(() => { if (step > 1) return; const t = setInterval(() => setSw((v) => (v + 1) % SWEEP.length), 70); return () => clearInterval(t); }, [step]);

  const cur: Cfg = step >= 4 ? code : exp;
  const view: Cfg = hover !== null ? { ...cur, th: THS[hover] } : cur;
  const evalCfg = (c: Cfg) => {
    const sc = scans[c.model]; if (!sc || !SC) return null;
    const g = IDS.map((i, k) => grade(pick(sc[k], c.th, c.nms ? NMS : 0), SC.day[i].objs, W, H));
    return { g, s: score(g) };
  };
  const ev = useMemo(() => evalCfg(view), [scans, SC, view.model, view.th, view.nms]);
  const curve = useMemo(() => THS.map((th) => evalCfg({ ...cur, th })?.s ?? null), [scans, SC, cur.model, cur.nms]);
  // 적용: hard 모델이 아직 없으면 먼저 학습 → 학습이 끝나면 기록
  const pendingApply = useRef(false), recordRef = useRef<(() => void) | null>(null);
  useEffect(() => { if (pendingApply.current && scans[code.model]) { pendingApply.current = false; recordRef.current?.(); } });
  const sweepCrop = useMemo(() => (G && models.base && step <= 1 ? (() => { const [x, y] = SWEEP[sw]; const X = sample(G[pic], x, y, 32); return { X, p: cnnPredict(models.base!, X).p }; })() : null), [G, models.base, sw, pic, step]);

  if (!C || !SC || !G || !models.base || !ev) return (
    <div className="loading"><div className="v6__prep"><p>{busy?.stage ?? '준비 중'}</p><i><b style={{ width: `${(busy?.p ?? 0) * 100}%` }} /></i></div></div>
  );

  const retrain = async () => {
    if (busy || models.hard) return;
    setBusy({ stage: '헛탐지 모으기 준비', p: 0 });
    const all: Float32Array[] = [];
    for (let i = 0; i < DET.trainScenes; i++) {
      const g = await loadGray(`./vision/ds/g/day-${pad3(i)}.png`); all.push(...mineHard(models.base!, g, SC.day[i].objs as Obj[]));
      if (!alive.current) return; setBusy({ stage: `학습 장면 ${i + 1}/${DET.trainScenes}에서 헛탐지 모으기 · ${all.length}개`, p: ((i + 1) / DET.trainScenes) * 0.25 }); await tick();
    }
    const hard = hardSet(all); setMined({ total: all.length, X: hard.X });
    const data: DataSet = join(take(C, 'day-train'), hard), m = makeCNN(20, 8, 1), loss: number[] = [];
    for (let e = 0; e < DET.hardEpochs; e++) { loss.push(trainEpoch(m, data, LR, 16, e + 1)); if (!alive.current) return; setBusy({ stage: `다시 학습 · 에폭 ${e + 1}/${DET.hardEpochs}`, p: 0.25 + ((e + 1) / DET.hardEpochs) * 0.6, loss: [...loss] }); await tick(); }
    const sc: Win[][] = [];
    for (let k = 0; k < G.length; k++) { sc.push(scan(m, G[k])); if (k % 4 === 3) { if (!alive.current) return; setBusy({ stage: `시험 장면 창 밀기 ${k + 1}/${G.length}`, p: 0.85 + ((k + 1) / G.length) * 0.15, loss }); await tick(); } }
    setModels((o) => ({ ...o, hard: m })); setScans((o) => ({ ...o, hard: sc })); setBusy(null);
    if (step === 2) setExp((e) => ({ ...e, model: 'hard' }));
  };
  const record = (kind: Run['kind'], c: Cfg) => { const r = evalCfg(c); if (!r) return; setRuns((rs) => [...rs, { id: nid.current++, kind, ...c, boxes: r.s.tp + r.s.fp, ...r.s }]); };
  recordRef.current = () => record('apply', code);

  const expR = runs.filter((r) => r.kind === 'exp'), app = runs.filter((r) => r.kind === 'apply');
  const nmsPair = (() => { for (const r of expR) { const o = expR.find((q) => q.model === 'base' && r.model === 'base' && q.th === r.th && q.nms !== r.nms); if (o) return r.nms ? { on: r, off: o } : { on: o, off: r }; } return null; })();
  const hiTh = expR.find((r) => r.model === 'base' && r.th === 0.9 && r.nms) ?? null;
  const hardRun = expR.find((r) => r.model === 'hard') ?? null;
  const applyOk = app.find((r) => r.precision >= GOAL && r.recall >= GOAL) ?? null;

  const fb = (() => {
    const r = app[app.length - 1]; if (!r) return null;
    const where = `서랍 [기록] #${r.id}`;
    if (r.precision >= GOAL && r.recall >= GOAL) return { ok: true, why: `${tag(r)} → 상자 ${r.boxes}개 중 ${r.tp}개가 진짜(정밀 ${pct(r.precision)}), 물체 ${r.tp + r.fn}개 중 ${r.tp}개를 찾음(재현 ${pct(r.recall)}).`, where };
    if (r.model === 'base') return { ok: false, why: `5차시 모델은 배경(문 · 횡단보도 · 차 일부)을 사람 · 차로 착각해 정밀도가 ${pct(r.precision)}입니다 → hard_negatives 를 True 로.`, where };
    if (!r.nms) return { ok: false, why: `한 물체에 상자가 여러 개 겹쳐 남아 정밀도가 ${pct(r.precision)}입니다 → nms 를 True 로.`, where };
    if (r.precision < GOAL) return { ok: false, why: `기준 ${r.th}에서는 확신이 낮은 헛탐지까지 남아 정밀도가 ${pct(r.precision)}입니다 → threshold 를 올려 보세요.`, where };
    return { ok: false, why: `기준 ${r.th}이 너무 높아 진짜 물체도 ${r.fn}개 놓쳤습니다(재현 ${pct(r.recall)}) → threshold 를 내려 보세요.`, where };
  })();

  const k = pic, sid = IDS[k], gr = ev.g[k];
  const hb = hbox !== null ? gr.res[hbox] : null;
  const hbX = hb ? sample(G[k], hb.d.box[0], hb.d.box[1], hb.d.box[2] - hb.d.box[0]) : null;
  const pctBox = (b: number[]) => ({ left: `${(b[0] / W) * 100}%`, top: `${(b[1] / H) * 100}%`, width: `${((b[2] - b[0]) / W) * 100}%`, height: `${((b[3] - b[1]) / H) * 100}%` });

  const sceneMain = (st: number) => (
    <div className="v6__main">
      <div className="cs__pic v6__pic" onPointerLeave={() => setHbox(null)}>
        <img src={`./vision/ds/day-${pad3(sid)}.webp`} alt="시험 장면" />
        {st <= 1 ? (
          <span className="v6__sweep" style={pctBox([SWEEP[sw][0], SWEEP[sw][1], SWEEP[sw][0] + 32, SWEEP[sw][1] + 32])} />
        ) : (
          <>
            {gr.gts.filter((g) => !g.hit).map((g, i) => <span key={`m${i}`} className="v6__box v6__box--miss" style={pctBox(g.sq)}><i>놓침</i></span>)}
            {gr.res.map((r, i) => (
              <span key={i} className={`v6__box ${r.ok === true ? 'ok' : r.ok === false ? 'no' : 'cut'} ${hbox === i ? 'is-on' : ''}`} style={pctBox(r.d.box)} onPointerEnter={() => setHbox(i)}>
                {gr.res.length <= 40 && <i>{CLASSES[r.d.cls]} {Math.round(r.d.score * 100)}</i>}
              </span>
            ))}
          </>
        )}
        <span className="zoom__rec">시험 장면 {sid - DET.testFrom + 1} / {DET.testN}</span>
      </div>
      <div className="v6__side">
        {st <= 1 && sweepCrop ? (
          <>
            <p className="cg__t">창 하나 = 5차시 조각 하나</p>
            <div className="cg__head"><BigCrop x={sweepCrop.X} size={20} /><p className="cg__l">위치 ({SWEEP[sw][0]}, {SWEEP[sw][1]})<br />창 {sw + 1} / {SWEEP.length}</p></div>
            <div className="cg__bars">{sweepCrop.p.map((v, i) => <div key={i}><span>{CLASSES[i]}</span><i style={{ width: `${v * 100}%` }} /><em>{Math.round(v * 100)}%</em></div>)}</div>
            <p className="cg__l v6__hint">크기 24 · 32 · 48 · 68 · 92 창으로 한 장면에 {scans.base![0].length}번 묻습니다.</p>
          </>
        ) : hb && hbX ? (
          <>
            <p className="cg__t">{hb.ok === true ? '맞은 상자' : hb.ok === false ? '헛탐지' : '화면 끝에 잘린 물체(채점 안 함)'}</p>
            <div className="cg__head"><BigCrop x={hbX} size={20} /><p className={`cg__l ${hb.ok === false ? 'no' : 'ok'}`}>{CLASSES[hb.d.cls]} <b>{Math.round(hb.d.score * 100)}%</b><br />창 {hb.d.box[2] - hb.d.box[0]}px</p></div>
            <div className="cg__bars">{hb.d.p.map((v, i) => <div key={i}><span>{CLASSES[i]}</span><i style={{ width: `${v * 100}%` }} /><em>{Math.round(v * 100)}%</em></div>)}</div>
            {hb.ok === false && (() => { const b = Math.max(0, ...gr.gts.map((g) => iou(hb.d.box, g.sq))); return <p className="cg__l v6__hint">{b > 0.05 ? `물체와 겹침(IoU) ${pct(b)} — ${pct(MATCH)} 미만이면 위치가 어긋난 상자로 셉니다.` : '물체가 없는 곳 — 배경을 물체로 착각했어요.'}</p>; })()}
          </>
        ) : (
          <>
            <p className="cg__t">이 장면</p>
            <p className="cg__l">상자 <b>{gr.res.length}</b> · 맞음 <b className="okc">{gr.tp}</b> · 헛탐지 <b className="noc">{gr.fp}</b> · 놓침 <b className="mic">{gr.fn}</b></p>
            <p className="cg__l v6__hint">상자에 마우스를 올리면 그 창의 조각과 CNN 확률을 볼 수 있어요.</p>
            <div className="v6__lg"><span className="ok">■ 맞음</span><span className="no">■ 헛탐지</span><span className="mi">┅ 놓침</span></div>
          </>
        )}
      </div>
    </div>
  );
  const strip = (
    <div className="px__strip v6__strip">
      {SHOW.map((i, n) => { const g = ev.g[n]; return (
        <button key={i} className={`px__th ${n === pic ? 'is-on' : ''}`} onClick={() => { setPic(n); setHbox(null); }}>
          <img src={`./vision/ds/day-${pad3(i)}.webp`} alt="" /><span>장면 {n + 1}</span>
          {step >= 2 && <i className={g.fp === 0 && g.fn === 0 ? 'ok' : 'miss'}>헛 {g.fp} · 놓침 {g.fn}</i>}
        </button>); })}
    </div>
  );
  const prepBox = busy && (
    <div className="v6__busy">
      <p>{busy.stage}</p><i><b style={{ width: `${busy.p * 100}%` }} /></i>
      {busy.loss && <p className="v6__loss">손실 {busy.loss.map((l) => l.toFixed(2)).join(' → ')}</p>}
    </div>
  );

  const def: LessonDef = {
    id: 'vision-6', n: 6, total: 8, title: '객체 탐지', keyColor: KEY,
    place: '도시 영상 관제센터 · 탐지실',
    problem: '5차시 분류기는 잘라 준 조각 하나만 판단한다. 거리 장면 전체에서 차와 사람이 어디에 있는지 상자로 찾아내야 한다.',
    goals: [
      { text: 'NMS 끄고 켜기 · 기준 0.9 로 탐지해 보기', done: !!(nmsPair && hiTh) },
      { text: '헛탐지 조각을 모아 다시 학습하기', done: !!hardRun },
      { text: `시험 장면 40장 정밀도 · 재현율 모두 ${GOAL * 100}% 이상`, done: !!applyOk }
    ],
    canNext: [true, predict !== null, !!(nmsPair && hiTh && hardRun), true, !!applyOk],
    busy: !!busy,
    now: [
      '창이 장면을 훑는 모습을 보고 [다음]을 누르세요',
      predict === null ? '보기 하나를 골라 예측하세요' : '[다음]을 눌러 실험으로 가세요',
      busy ? '학습 중입니다 — 손실이 줄어드는 것을 보세요' : !nmsPair ? '같은 기준으로 NMS 끔 · 켬을 각각 [탐지 실행] 하세요' : !hiTh ? '기준 0.9 · NMS 켬으로 [탐지 실행] 하세요' : !hardRun ? (models.hard ? '[탐지 실행]으로 새 모델을 확인하세요' : '[헛탐지 모아 다시 학습]을 누르세요') : '[다음]을 눌러 개념으로 가세요',
      '개념을 읽고 [다음]을 누르세요',
      busy ? '학습 중입니다…' : applyOk ? '[다음]을 눌러 정리하세요' : '코드 서랍의 노란 칸을 바꾸고 [실행]을 누르세요'
    ],
    onStep: (n) => { setStep(n); setHover(null); setHbox(null); },
    rail: (st) => (
      <>
        {st === 0 && <p className="lead-text">5차시 CNN은 조각 하나가 '차 · 사람 · 빈 곳' 중 무엇인지 맞혔습니다(97%). 장면 전체에서 물체를 찾으려면 <b>창을 조금씩 밀며 모든 위치 · 여러 크기</b>의 조각을 CNN에 물어보면 됩니다. 이것을 <b>객체 탐지</b>라고 해요. 왼쪽 노란 창이 장면을 훑고 있습니다.</p>}
        {st === 1 && <Question q="조각 정확도 97%인 분류기로 창 밀기 탐지를 하면, 남은 상자 중 진짜 물체의 비율(정밀도)은?" options={PREDICT} picked={predict} onPick={setPredict} target />}
        {st === 2 && (
          <div className="ctrl">
            <p className="ctrl__label">모델</p>
            <div className="seg seg--2">{(['base', 'hard'] as MK[]).map((m) => <button key={m} disabled={!models[m]} className={exp.model === m ? 'is-on' : ''} onClick={() => setExp({ ...exp, model: m })}>{MN[m]}</button>)}</div>
            <p className="ctrl__label">확신도 기준 (이 이상만 상자로)</p>
            <div className="seg seg--4">{THS.map((t) => <button key={t} className={exp.th === t ? 'is-on' : ''} onClick={() => setExp({ ...exp, th: t })}>{t}</button>)}</div>
            <p className="ctrl__label">겹침 제거 (NMS)</p>
            <div className="seg seg--2">{[false, true].map((v) => <button key={String(v)} className={exp.nms === v ? 'is-on' : ''} onClick={() => setExp({ ...exp, nms: v })}>{v ? '켬' : '끔'}</button>)}</div>
            <div className="ctrl__row">
              <button className={`rbtn rbtn--key ${!(nmsPair && hiTh) || (models.hard && !hardRun) ? 'is-target' : ''}`} disabled={!!busy} onClick={() => record('exp', exp)}>탐지 실행 (40장)</button>
              <button className={`rbtn ${nmsPair && hiTh && !models.hard ? 'is-target' : ''}`} disabled={!!busy || !!models.hard || !(nmsPair && hiTh)} onClick={retrain}>{models.hard ? '다시 학습 완료' : '헛탐지 모아 다시 학습'}</button>
            </div>
            {prepBox}
            <ul className="obs-check">
              <li className={nmsPair ? 'done' : ''}><i>{nmsPair ? '✓' : ''}</i>NMS {nmsPair ? `끔 ${nmsPair.off.boxes}개 → 켬 ${nmsPair.on.boxes}개 (정밀 ${pct(nmsPair.off.precision)} → ${pct(nmsPair.on.precision)})` : '끔 · 켬 상자 수 비교'}</li>
              <li className={hiTh ? 'done' : ''}><i>{hiTh ? '✓' : ''}</i>기준 0.9 {hiTh ? `에서도 정밀 ${pct(hiTh.precision)} · 재현 ${pct(hiTh.recall)}` : '로 올려 보기'}</li>
              <li className={hardRun ? 'done' : ''}><i>{hardRun ? '✓' : ''}</i>헛탐지 추가 모델 {hardRun ? `정밀 ${pct(hardRun.precision)} · 재현 ${pct(hardRun.recall)}` : '로 탐지'}</li>
            </ul>
            {nmsPair && predict !== null && <div className="compare"><p><span>내 예측</span>{PREDICT[predict]}</p><p><span>실제</span>5차시 모델 + NMS: 정밀도 {pct(nmsPair.on.precision)} (상자 {nmsPair.on.boxes}개 중 {nmsPair.on.tp}개만 진짜)</p></div>}
          </div>
        )}
        {st === 3 && (
          <ConceptBox term="객체 탐지 · NMS · 헛탐지 학습" def="객체 탐지 = 어디에(상자) + 무엇이(종류) + 얼마나 확신하는지(확신도). 창 하나하나가 조각 분류 문제다.">
            <p className="concept__formula">창 밀기 → 기준 이상만 → NMS → 상자</p>
            <p className="concept__note"><b>NMS</b>(겹침 제거)는 같은 물체에 겹친 상자 중 가장 확신하는 하나만 남깁니다. 창은 한 장면에 1,600번 넘게 묻기 때문에 분류가 97% 맞아도 틀린 3%가 수십 개의 <b>헛탐지</b>가 돼요. 5차시 학습 조각의 '빈 곳'에는 문 · 횡단보도 · 차의 일부 같은 헷갈리는 배경이 없었습니다. 그래서 헛탐지 조각{mined ? ` ${mined.total.toLocaleString()}개 중 ${mined.X.length.toLocaleString()}개` : ''}를 '빈 곳'으로 더해 다시 학습했어요(왼쪽). 기준을 올리면 정밀도↑ 재현율↓ — 둘은 맞바꾸는 관계입니다.</p>
          </ConceptBox>
        )}
        {st === 4 && <div className="ctrl"><p className="lead-text">코드 서랍에서 모델 · 기준 · NMS를 정해 시험 장면 40장의 정밀도와 재현율을 모두 {GOAL * 100}% 이상으로 만드세요.</p>{prepBox}{fb && <Feedback {...fb} />}</div>}
      </>
    ),
    scene: (st) => st === 3 && mined ? (
      <div className="v6 v6--mined">
        <p className="v5__h">다시 학습에 '빈 곳'으로 더한 헛탐지 조각 <span>({mined.total.toLocaleString()}개 중 {mined.X.length.toLocaleString()}개 · 처음 120개)</span></p>
        <div className="v6__gal">{mined.X.slice(0, 120).map((x, i) => <BigCrop key={i} x={x} size={20} />)}</div>
        <p className="v5__note">건물 문, 횡단보도 줄무늬, 차나 사람의 일부, 그림자… 5차시 모델이 '사람' · '차'라고 착각했던 조각들입니다.</p>
      </div>
    ) : (
      <div className="v6">{sceneMain(st)}{strip}</div>
    ),
    band: (
      <>
        <span className="chip chip--clock"><i>설정</i><b style={{ fontSize: 13 }}>{tag(view)}</b></span>
        <span className="chip"><i>상자 (40장)</i><b>{ev.s.tp + ev.s.fp}</b></span>
        <span className={`chip ${ev.s.precision >= GOAL ? 'ok' : 'miss'}`}><i>정밀도</i><b>{pct(ev.s.precision)}</b></span>
        <span className={`chip ${ev.s.recall >= GOAL ? 'ok' : 'miss'}`}><i>재현율</i><b>{pct(ev.s.recall)}<small> {ev.s.tp}/{ev.s.tp + ev.s.fn}</small></b></span>
        <span className="chip"><i>목표</i><b>둘 다 {GOAL * 100}%</b></span>
      </>
    ),
    drawerFor: (n) => (n === 2 ? 'graph' : n === 4 ? 'code' : n === 5 ? 'log' : null),
    drawer: (d, st) => d === 'graph'
      ? <PointGraph xTicks={THS.map((t, i) => ({ v: i + 1, label: `기준 ${t}` }))} xMin={0.5} xMax={4.5}
          yLabel="40장 기준별 값" xLabel="확신도 기준" goal={{ y: GOAL, label: `목표 ${GOAL * 100}%`, above: true }}
          series={[
            { name: '정밀도', cls: 'a', points: curve.flatMap((s, i) => (s ? [{ x: i + 1, y: s.precision, id: i, tip: `기준 ${THS[i]} · 정밀 ${pct(s.precision)} (상자 ${s.tp + s.fp}개 중 ${s.tp})` }] : [])) },
            { name: '재현율', cls: 'b', points: curve.flatMap((s, i) => (s ? [{ x: i + 1, y: s.recall, id: i + 100, tip: `기준 ${THS[i]} · 재현 ${pct(s.recall)} (물체 ${s.tp + s.fn}개 중 ${s.tp})` }] : [])) }
          ]}
          activeId={hover} onHover={(id) => setHover(id === null ? null : id % 100)}
          read={`${MN[cur.model]} · NMS ${cur.nms ? '켬' : '끔'}. 청록 = 남은 상자 중 진짜 물체 비율, 주황 = 진짜 물체 중 찾은 비율. 기준을 올리면(오른쪽) 청록은 오르고 주황은 내려갑니다.`}
          link={hover !== null ? `위 장면이 기준 ${THS[hover]}의 결과로 바뀌었습니다. 빨간 상자(헛탐지)가 줄면 청록이 오르고, 노란 점선(놓침)이 늘면 주황이 내려가요.` : '점에 마우스를 올리면 그 기준으로 찾은 상자가 위 장면에 나타납니다.'} />
      : d === 'code'
      ? <CodeCells enabled={st === 4} title="비전 지구 · 객체 탐지" run="boxes = detect(scenes=40, model, threshold, nms)" running={!!busy}
          onRun={() => { if (code.model === 'hard' && !models.hard) { pendingApply.current = true; retrain(); } else record('apply', code); }}
          lines={[
            { kind: 'cell', name: 'hard_negatives', value: code.model === 'hard' ? 'True' : 'False', comment: "헛탐지 조각을 '빈 곳'으로 더해 다시 학습한 모델", toggle: () => setCode((c) => ({ ...c, model: c.model === 'hard' ? 'base' : 'hard' })) },
            { kind: 'cell', name: 'threshold', value: `${code.th}`, comment: '확신도 기준 (이 이상만 상자로)', dec: () => setCode((c) => ({ ...c, th: THS[Math.max(0, THS.indexOf(c.th) - 1)] })), inc: () => setCode((c) => ({ ...c, th: THS[Math.min(THS.length - 1, THS.indexOf(c.th) + 1)] })) },
            { kind: 'cell', name: 'nms', value: code.nms ? 'True' : 'False', comment: '겹친 상자 중 가장 확신하는 하나만', toggle: () => setCode((c) => ({ ...c, nms: !c.nms })) }
          ]} />
      : <ol className="ldrawer">{[...runs].reverse().map((r) => <li key={r.id}><b>#{r.id}</b> {r.kind === 'exp' ? '실험' : '적용'} · {tag(r)} → 상자 {r.boxes} · 맞음 {r.tp} · 헛탐지 {r.fp} · 놓침 {r.fn} · 정밀 {pct(r.precision)} · 재현 {pct(r.recall)}</li>)}{!runs.length && <li>아직 기록이 없습니다.</li>}</ol>,
    wrap: {
      q: '조각 정확도가 97%인데도 창 밀기 탐지의 정밀도가 낮았던 가장 큰 이유는?', options: ['장면 사진이 흐려서', '한 장면에 1,600번 넘게 물어서 작은 오류도 많은 헛탐지가 되고, 헷갈리는 배경을 배운 적이 없어서', '사람이 너무 많아서', 'NMS가 진짜 물체를 지워서'], correct: 1,
      why: `창이 많으면 틀린 3%도 수십 개의 상자가 됩니다. 학습 조각에 없던 문 · 횡단보도 같은 배경을 '빈 곳'으로 더해 다시 학습하니 정밀도가 ${nmsPair ? pct(nmsPair.on.precision) : '낮은 값'}에서 ${hardRun ? pct(hardRun.precision) : '높은 값'}으로 올랐어요.`, where: '실험 단계 관찰 기록 · 개념 단계의 헛탐지 조각',
      conclusion: applyOk && nmsPair && hiTh && hardRun ? `5차시 모델로 창 밀기 탐지를 하면 NMS 없이 상자가 ${nmsPair.off.boxes}개, NMS를 켜도 정밀도는 ${pct(nmsPair.on.precision)}였고 기준을 0.9로 올려도 ${pct(hiTh.precision)}였다. 학습 장면에서 모은 헛탐지 조각 ${mined?.X.length ?? 0}개를 '빈 곳'으로 더해 다시 학습한 뒤, ${tag(applyOk)} 설정으로 정밀도 ${pct(applyOk.precision)} · 재현율 ${pct(applyOk.recall)}를 얻었다. 탐지는 분류보다 훨씬 많이 묻기 때문에 헷갈리는 배경을 가르치는 것과, 기준으로 정밀도와 재현율의 균형을 잡는 것이 중요하다.` : '',
      record: () => ({ chart: { title: '실행별 정밀도', x: runs.map((r) => `#${r.id}`), y: runs.map((r) => r.precision) } })
    },
    source: `임시: 직접 렌더한 거리 장면(시험 40장 · 헛탐지 모으기 학습 장면 ${DET.trainScenes}장) · 계산 src/sim/detect.ts`,
    nextId: 'vision-7'
  };
  return <LessonFrame def={def} onExit={onExit} onHome={onHome} />;
}
