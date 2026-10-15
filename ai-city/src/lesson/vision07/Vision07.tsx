// author: eduino
// 비전 지구 7차시 · 상황 해결① 교차로 위험 감지 — 6차시 탐지 모델 + 규칙(차도 구역 · 기준점 · 횡단보도 제외)으로 무단횡단 경보.
// 수치는 src/sim/alarm.ts · src/sim/detect.ts 계산값(점검: tools/check_vision07.ts).
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { unpack, type CNN } from '../../sim/nn';
import { scan, pick, NMS_ON, visible, type Gray, type Obj, type Win } from '../../sim/detect';
import { judge, anchor, inZone, truthDanger, CROSS, type Rule } from '../../sim/alarm';
import { LessonFrame, type LessonDef } from '../LessonFrame';
import { ConceptBox, Question, Feedback } from '../ui';
import { PointGraph } from '../PointGraph';
import { CodeCells } from '../CodeCells';
import { loadGray, pad3, tick } from '../gray';

interface Cfg extends Rule { th: number }
interface Run extends Cfg { id: number; kind: 'exp' | 'apply'; tp: number; fp: number; fn: number }
interface Scenes { day: { i: number; objs: Obj[] }[] }
const KEY = '#14b8a6', W = 256, H = 160, IDS = Array.from({ length: 40 }, (_, i) => 160 + i), GOAL = 3;
const THS = [0.3, 0.5, 0.7], TOPS = [0.36, 0.4, 0.42, 0.44, 0.46, 0.48, 0.52], BOTS = [0.62, 0.66, 0.7, 0.72, 0.74, 0.78, 0.82];
const PT = { feet: '발(상자 아래)', center: '상자 가운데' } as const;
const tag = (c: Cfg) => `${PT[c.point]} · 차도 ${c.top}~${c.bottom} · 횡단보도 ${c.cross ? '제외' : '포함'} · 기준 ${c.th}`;
const PREDICT = ['상자 가운데', '상자 아래 가운데(발)', '상자 맨 위(머리)', '상자 크기'];
const near = (a: number[], v: number) => a.reduce((b, x) => (Math.abs(x - v) < Math.abs(b - v) ? x : b), a[0]);
const step = (a: number[], v: number, d: number) => a[Math.max(0, Math.min(a.length - 1, a.indexOf(v) + d))];

export function Vision07({ onExit, onHome }: { onExit: () => void; onHome: () => void }) {
  const [SC, setSC] = useState<Scenes | null>(null);
  const [scans, setScans] = useState<Win[][] | null>(null);
  const [prep, setPrep] = useState(0);
  useEffect(() => {
    let alive = true;
    (async () => {
      const [s, mj, G] = await Promise.all([
        fetch('./vision/ds/scenes.json').then((r) => r.json()),
        fetch('./vision/ds/det_model.json').then((r) => r.json()),
        Promise.all(IDS.map((i) => loadGray(`./vision/ds/g/day-${pad3(i)}.png`)))
      ]);
      const m: CNN = unpack(mj.model), out: Win[][] = [];
      for (let k = 0; k < G.length; k++) { out.push(scan(m, G[k] as Gray)); if (k % 4 === 3) { if (!alive) return; setPrep((k + 1) / G.length); await tick(); } }
      if (!alive) return; setSC(s); setScans(out);
    })();
    return () => { alive = false; };
  }, []);

  const [pic, setPic] = useState(0);
  const [predict, setPredict] = useState<number | null>(null);
  const [exp, setExp] = useState<Cfg>({ point: 'center', top: 0.44, bottom: 0.7, cross: false, th: 0.5 });
  const [code, setCode] = useState<Cfg>({ point: 'center', top: 0.36, bottom: 0.82, cross: false, th: 0.3 });
  const [runs, setRuns] = useState<Run[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [drag, setDrag] = useState<'top' | 'bottom' | null>(null);
  const [stp, setStp] = useState(0);
  const nid = useRef(1);
  const cur = stp >= 4 ? code : exp;
  const hov = runs.find((r) => r.id === hover) ?? null;
  const view: Cfg = hov ?? cur;
  const res = useMemo(() => (SC && scans ? judge(IDS.map((i, k) => ({ dets: pick(scans[k], view.th, NMS_ON), objs: SC.day[i].objs })), view) : null), [SC, scans, view.point, view.top, view.bottom, view.cross, view.th]);
  if (!SC || !scans || !res) return <div className="loading"><div className="v6__prep"><p>6차시 탐지 모델로 시험 장면 40장 탐지 중</p><i><b style={{ width: `${prep * 100}%` }} /></i></div></div>;

  const record = (kind: Run['kind'], c: Cfg) => { const j = judge(IDS.map((i, k) => ({ dets: pick(scans[k], c.th, NMS_ON), objs: SC.day[i].objs })), c); setRuns((rs) => [...rs, { id: nid.current++, kind, ...c, tp: j.tp, fp: j.fp, fn: j.fn }]); };
  const expR = runs.filter((r) => r.kind === 'exp'), app = runs.filter((r) => r.kind === 'apply');
  const same = (a: Cfg, b: Cfg, k: keyof Cfg) => (['point', 'top', 'bottom', 'cross', 'th'] as (keyof Cfg)[]).every((x) => x === k || a[x] === b[x]);
  const pairOf = (k: keyof Cfg) => { for (const a of expR) { const b = expR.find((r) => r[k] !== a[k] && same(a, r, k)); if (b) return [a, b]; } return null; };
  const ptPair = (() => { const p = pairOf('point'); return p ? { c: p.find((r) => r.point === 'center')!, f: p.find((r) => r.point === 'feet')! } : null; })();
  const crPair = (() => { for (const a of expR.filter((r) => r.point === 'feet')) { const b = expR.find((r) => r.point === 'feet' && r.cross !== a.cross && same(a, r, 'cross')); if (b) return a.cross ? { on: a, off: b } : { on: b, off: a }; } return null; })();
  const ok = (r: { fp: number; fn: number }) => r.fp <= GOAL && r.fn <= GOAL;
  const applyOk = app.find(ok) ?? null;
  const danger = res.danger;

  const fb = (() => {
    const r = app[app.length - 1]; if (!r) return null;
    const where = `서랍 [기록] #${r.id}`;
    if (ok(r)) return { ok: true, why: `${tag(r)} → 위험 장면 ${r.tp + r.fn}장 중 ${r.tp}장 경보, 헛경보 ${r.fp}장, 놓친 위험 ${r.fn}장.`, where };
    if (r.point === 'center') return { ok: false, why: `상자 가운데는 사람의 허리 쯤이라 보도 위 사람이 차도로 들어오고 차도 위 사람은 빠집니다(헛경보 ${r.fp} · 놓침 ${r.fn}) → point 를 'feet' 로.`, where };
    if (r.fp > GOAL && !r.cross) return { ok: false, why: `횡단보도를 건너는 사람에게도 경보가 울립니다(헛경보 ${r.fp}) → exclude_crosswalk 를 True 로.`, where };
    if (r.fp > GOAL && r.th < 0.5) return { ok: false, why: `기준 ${r.th}에서는 탐지 모델의 헛탐지까지 경보가 됩니다(헛경보 ${r.fp}) → threshold 를 올려 보세요.`, where };
    if (r.fp > GOAL) return { ok: false, why: `차도 구역이 보도까지 넓어 헛경보가 ${r.fp}장입니다 → road_top 은 키우고(선을 아래로) road_bottom 은 줄여(선을 위로) 구역을 차도로 좁히세요.`, where };
    if (r.th > 0.5) return { ok: false, why: `기준 ${r.th}이 높아 탐지 모델이 사람을 못 찾아 위험 ${r.fn}장을 놓쳤습니다 → threshold 를 내려 보세요.`, where };
    return { ok: false, why: `차도 구역이 좁아 위험 ${r.fn}장을 놓쳤습니다 → 구역을 차도 전체(사람 발이 닿는 곳)로 넓혀 보세요.`, where };
  })();

  const sid = IDS[pic], row = res.rows[pic], objs = SC.day[sid].objs;
  const dets = pick(scans[pic], view.th, NMS_ON).filter((d) => d.cls === 1);
  const pctBox = (b: number[]) => ({ left: `${(b[0] / W) * 100}%`, top: `${(b[1] / H) * 100}%`, width: `${((b[2] - b[0]) / W) * 100}%`, height: `${((b[3] - b[1]) / H) * 100}%` });
  const verdict = (r: { alarm: boolean; truth: boolean }) => (r.alarm && r.truth ? 'tp' : r.alarm ? 'fp' : r.truth ? 'fn' : 'tn');
  const VN = { tp: '경보 맞음', fp: '헛경보', fn: '놓친 위험', tn: '정상' } as const;
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag || stp !== 2) return; const r = e.currentTarget.getBoundingClientRect(), y = (e.clientY - r.top) / r.height;
    const v = near(drag === 'top' ? TOPS : BOTS, y); setExp((c) => (drag === 'top' ? (v < c.bottom ? { ...c, top: v } : c) : (v > c.top ? { ...c, bottom: v } : c)));
  };

  const def: LessonDef = {
    id: 'vision-7', n: 7, total: 8, title: '상황 해결① 교차로 위험 감지', keyColor: KEY,
    place: '도시 영상 관제센터 · 교차로 안전실',
    problem: '횡단보도가 아닌 곳에서 차도로 들어선 사람(무단횡단)이 있으면 경보를 울려야 한다. 6차시 탐지 모델에 규칙을 더해 시험 장면 40장을 판단하자.',
    goals: [
      { text: '기준점(가운데 · 발)에 따른 경보 비교하기', done: !!ptPair },
      { text: '횡단보도 제외 끔 · 켬 비교하기', done: !!crPair },
      { text: `헛경보 ${GOAL}장 이하 · 놓친 위험 ${GOAL}장 이하`, done: !!applyOk }
    ],
    canNext: [true, predict !== null, !!(ptPair && crPair), true, !!applyOk],
    now: [
      '장면과 지시서를 읽고 [다음]을 누르세요',
      predict === null ? '보기 하나를 골라 예측하세요' : '[다음]을 눌러 실험으로 가세요',
      !ptPair ? '기준점을 바꿔 가며 [경보 실행]을 두 번 하세요 (다른 설정은 그대로)' : !crPair ? '기준점 발에서 횡단보도 제외 끔 · 켬으로 각각 [경보 실행] 하세요' : '[다음]을 눌러 개념으로 가세요',
      '개념을 읽고 [다음]을 누르세요',
      applyOk ? '[다음]을 눌러 정리하세요' : '코드 서랍의 노란 칸을 바꾸고 [실행]을 누르세요'
    ],
    onStep: (n) => { setStp(n); setHover(null); },
    rail: (st) => (
      <>
        {st === 0 && <p className="lead-text">6차시에 만든 탐지 모델은 사람과 차의 <b>상자</b>를 찾아 줍니다. 하지만 "위험한가?"는 모델이 알려 주지 않아요. 상자를 어떻게 쓸지 <b>규칙</b>을 정해야 합니다. 규칙: 사람의 위치가 <b>차도 구역</b> 안이고 <b>횡단보도</b> 밖이면 경보. 시험 장면 40장 중 실제 위험 장면은 {danger}장입니다.</p>}
        {st === 1 && <Question q="사람이 '차도 위'에 있는지 판단할 때, 상자의 어느 점을 쓰는 게 가장 정확할까?" options={PREDICT} picked={predict} onPick={setPredict} target />}
        {st === 2 && (
          <div className="ctrl">
            <p className="ctrl__label">사람 위치 기준점</p>
            <div className="seg seg--2">{(['center', 'feet'] as const).map((p) => <button key={p} className={exp.point === p ? 'is-on' : ''} onClick={() => setExp({ ...exp, point: p })}>{PT[p]}</button>)}</div>
            <p className="ctrl__label">차도 구역 (왼쪽 장면의 빨간 띠 위 · 아래 선을 끌어도 됩니다)</p>
            <div className="v7__zone"><span>위 {exp.top}</span><button onClick={() => setExp({ ...exp, top: step(TOPS, exp.top, -1) })}>−</button><button onClick={() => setExp({ ...exp, top: step(TOPS, exp.top, 1) })}>+</button><span>아래 {exp.bottom}</span><button onClick={() => setExp({ ...exp, bottom: step(BOTS, exp.bottom, -1) })}>−</button><button onClick={() => setExp({ ...exp, bottom: step(BOTS, exp.bottom, 1) })}>+</button></div>
            <p className="ctrl__label">횡단보도</p>
            <div className="seg seg--2">{[false, true].map((v) => <button key={String(v)} className={exp.cross === v ? 'is-on' : ''} onClick={() => setExp({ ...exp, cross: v })}>{v ? '제외 (경보 안 함)' : '포함'}</button>)}</div>
            <p className="ctrl__hint">탐지 확신도 기준은 6차시 결과대로 0.5 로 둡니다.</p>
            <div className="ctrl__row"><button className={`rbtn rbtn--key ${!(ptPair && crPair) ? 'is-target' : ''}`} onClick={() => record('exp', exp)}>경보 실행 (40장)</button></div>
            <ul className="obs-check">
              <li className={ptPair ? 'done' : ''}><i>{ptPair ? '✓' : ''}</i>기준점 {ptPair ? `가운데: 헛경보 ${ptPair.c.fp} · 놓침 ${ptPair.c.fn} / 발: 헛경보 ${ptPair.f.fp} · 놓침 ${ptPair.f.fn}` : '가운데 · 발 비교'}</li>
              <li className={crPair ? 'done' : ''}><i>{crPair ? '✓' : ''}</i>횡단보도 {crPair ? `포함: 헛경보 ${crPair.off.fp} / 제외: 헛경보 ${crPair.on.fp} · 놓침 ${crPair.off.fn} → ${crPair.on.fn}` : '포함 · 제외 비교 (기준점 발)'}</li>
            </ul>
            {ptPair && predict !== null && <div className="compare"><p><span>내 예측</span>{PREDICT[predict]}</p><p><span>실제</span>발 기준 놓침 {ptPair.f.fn}장 · 가운데 기준 놓침 {ptPair.c.fn}장</p></div>}
          </div>
        )}
        {st === 3 && (
          <ConceptBox term="관심 구역 (ROI) · 규칙 · 오류의 전달" def="AI 모델은 '무엇이 어디에'까지만 알려 준다. 서비스는 그 결과에 사람이 정한 규칙(구역 · 기준점 · 예외)을 더해 만든다.">
            <p className="concept__formula">탐지(상자) → 기준점 → 구역 안? 예외 밖? → 경보</p>
            <p className="concept__note">사람이 땅을 딛는 곳은 상자 <b>아래</b>이므로 발 기준이 정확합니다. 횡단보도는 건너도 되는 곳이라 <b>예외</b>로 빼야 해요. 그래도 남는 <b>놓친 위험</b>은 대부분 탐지 모델이 사람을 못 찾은 경우입니다 — 모델의 실수는 규칙으로 고칠 수 없고, 경보까지 그대로 전달됩니다. 헛경보가 많으면 관제 요원이 경보를 믿지 않게 되고, 놓치면 사고로 이어지므로 둘 다 줄여야 합니다.</p>
          </ConceptBox>
        )}
        {st === 4 && <div className="ctrl"><p className="lead-text">코드 서랍에서 규칙을 정해 헛경보 {GOAL}장 이하, 놓친 위험 {GOAL}장 이하를 만드세요.</p>{fb && <Feedback {...fb} />}</div>}
      </>
    ),
    scene: (st) => (
      <div className="v6">
        <div className="v6__main">
          <div className={`cs__pic v6__pic v7__pic ${drag ? 'is-drag' : ''}`} onPointerMove={onMove} onPointerUp={() => setDrag(null)} onPointerLeave={() => setDrag(null)}>
            <img src={`./vision/ds/day-${pad3(sid)}.webp`} alt="시험 장면" />
            {st >= 1 && (
              <>
                <span className="v7__road" style={{ top: `${view.top * 100}%`, height: `${(view.bottom - view.top) * 100}%` }} />
                {view.cross && <span className="v7__cross" style={{ left: `${CROSS[0] * 100}%`, width: `${(CROSS[1] - CROSS[0]) * 100}%`, top: `${view.top * 100}%`, height: `${(view.bottom - view.top) * 100}%` }} />}
                {st === 2 && !hov && <>
                  <span className="v7__handle" style={{ top: `${view.top * 100}%` }} onPointerDown={(e) => { e.preventDefault(); setDrag('top'); }}><i>차도 위 선</i></span>
                  <span className="v7__handle" style={{ top: `${view.bottom * 100}%` }} onPointerDown={(e) => { e.preventDefault(); setDrag('bottom'); }}><i>차도 아래 선</i></span>
                </>}
              </>
            )}
            {st >= 1 && dets.map((d, i) => { const a = anchor(d.box, view.point), inz = inZone(a, view); return (
              <span key={i}>
                <span className={`v6__box ${inz ? 'no' : 'ok'}`} style={pctBox(d.box)}><i>사람 {Math.round(d.score * 100)}</i></span>
                <span className={`v7__pt ${inz ? 'in' : ''}`} style={{ left: `${a[0] * 100}%`, top: `${a[1] * 100}%` }} />
              </span>); })}
            {st >= 1 && <span className={`v7__alarm ${row.alarm ? 'on' : ''}`}>{row.alarm ? '⚠ 무단횡단 경보' : '경보 없음'}<em>실제: {row.truth ? '위험' : '안전'} → {VN[verdict(row)]}</em></span>}
            <span className="zoom__rec">교차로 카메라 · 장면 {pic + 1} / 40</span>
          </div>
          <div className="v6__side">
            <p className="cg__t">이 장면의 사람</p>
            {objs.filter((o) => o.cls === 'person').map((o, i) => (
              <p key={i} className="cg__l v7__who"><b className={o.onRoad && Math.abs(o.x) > 2 && visible(o, W, H) ? 'noc' : ''}>{!visible(o, W, H) ? '화면 끝(제외)' : !o.onRoad ? '보도' : Math.abs(o.x) <= 2 ? '횡단보도' : '무단횡단'}</b></p>
            ))}
            <p className="cg__l v6__hint">빨간 상자 = 기준점이 구역 안(경보), 초록 상자 = 구역 밖. 점 = {PT[view.point]}.</p>
            <p className="cg__l">40장: 경보 맞음 <b className="okc">{res.tp}</b> · 헛경보 <b className="noc">{res.fp}</b> · 놓침 <b className="mic">{res.fn}</b></p>
          </div>
        </div>
        <div className="v7__grid">
          {IDS.map((i, n) => { const v = st >= 1 ? verdict(res.rows[n]) : 'tn'; return (
            <button key={i} className={`v7__th ${v} ${n === pic ? 'is-on' : ''}`} onClick={() => setPic(n)} title={VN[v as keyof typeof VN]}>
              <img src={`./vision/ds/day-${pad3(i)}.webp`} alt="" />{st >= 1 && truthDanger(SC.day[i].objs) && <i>위험</i>}
            </button>); })}
        </div>
      </div>
    ),
    band: (
      <>
        <span className="chip chip--clock"><i>규칙</i><b style={{ fontSize: 12 }}>{tag(view)}</b></span>
        <span className="chip ok"><i>경보 맞음</i><b>{res.tp}<small> / {danger}</small></b></span>
        <span className={`chip ${res.fp <= GOAL ? 'ok' : 'miss'}`}><i>헛경보</i><b>{res.fp}</b></span>
        <span className={`chip ${res.fn <= GOAL ? 'ok' : 'miss'}`}><i>놓친 위험</i><b>{res.fn}</b></span>
        <span className="chip"><i>목표</i><b>둘 다 {GOAL} 이하</b></span>
      </>
    ),
    drawerFor: (n) => (n === 2 ? 'graph' : n === 4 ? 'code' : n === 5 ? 'log' : null),
    drawer: (d, st) => d === 'graph'
      ? (() => { const rs = st >= 4 ? runs : expR; return (
        <PointGraph xTicks={rs.map((r, i) => ({ v: i + 1, label: `#${r.id}` }))} xMin={0.5} xMax={Math.max(2, rs.length) + 0.5} yMax={12} yFmt={(v) => `${Math.round(v)}장`}
          yLabel="시험 장면 40장 중" xLabel="실행 순서" goal={{ y: GOAL, label: `목표 ${GOAL}장 이하` }}
          series={[
            { name: '놓친 위험', cls: 'b', points: rs.map((r, i) => ({ x: i + 1, y: r.fn, id: r.id, tip: `${PT[r.point]} · 횡단보도 ${r.cross ? '제외' : '포함'} · 놓침 ${r.fn}장` })) },
            { name: '헛경보', cls: 'a', points: rs.map((r, i) => ({ x: i + 1, y: r.fp, id: r.id + 10000, tip: `${PT[r.point]} · 횡단보도 ${r.cross ? '제외' : '포함'} · 헛경보 ${r.fp}장` })) }
          ]}
          activeId={hov?.id ?? null} onHover={(id) => setHover(id === null ? null : id % 10000)}
          read="주황 = 위험한데 경보가 안 울린 장면 수, 청록 = 안전한데 경보가 울린 장면 수. 둘 다 목표 띠(아래) 안에 들어와야 합니다."
          link={hov ? `위 장면과 아래 40장 격자가 이 실행의 규칙(${tag(hov)})으로 바뀌었습니다. 격자의 빨간 칸 = 헛경보, 노란 칸 = 놓친 위험.` : '점에 마우스를 올리면 그 규칙의 경보 결과가 위 장면 · 40장 격자에 나타납니다.'} />); })()
      : d === 'code'
      ? <CodeCells enabled={st === 4} title="비전 지구 · 무단횡단 경보" run="alarm = any(person in road_zone and not crosswalk  for person in detect(scene, threshold))" onRun={() => record('apply', code)}
          lines={[
            { kind: 'cell', name: 'point', value: `'${code.point}'`, comment: "사람 위치: 'center' 상자 가운데 · 'feet' 상자 아래", toggle: () => setCode((c) => ({ ...c, point: c.point === 'feet' ? 'center' : 'feet' })) },
            { kind: 'cell', name: 'road_top', value: `${code.top}`, comment: '차도 구역 위 선 (화면 높이 비율)', dec: () => setCode((c) => ({ ...c, top: step(TOPS, c.top, -1) })), inc: () => setCode((c) => { const t = step(TOPS, c.top, 1); return t < c.bottom ? { ...c, top: t } : c; }) },
            { kind: 'cell', name: 'road_bottom', value: `${code.bottom}`, comment: '차도 구역 아래 선', dec: () => setCode((c) => { const b = step(BOTS, c.bottom, -1); return b > c.top ? { ...c, bottom: b } : c; }), inc: () => setCode((c) => ({ ...c, bottom: step(BOTS, c.bottom, 1) })) },
            { kind: 'cell', name: 'exclude_crosswalk', value: code.cross ? 'True' : 'False', comment: '횡단보도 위 사람은 경보 안 함', toggle: () => setCode((c) => ({ ...c, cross: !c.cross })) },
            { kind: 'cell', name: 'threshold', value: `${code.th}`, comment: '탐지 확신도 기준 (6차시)', dec: () => setCode((c) => ({ ...c, th: step(THS, c.th, -1) })), inc: () => setCode((c) => ({ ...c, th: step(THS, c.th, 1) })) }
          ]} />
      : <ol className="ldrawer">{[...runs].reverse().map((r) => <li key={r.id}><b>#{r.id}</b> {r.kind === 'exp' ? '실험' : '적용'} · {tag(r)} → 경보 맞음 {r.tp} · 헛경보 {r.fp} · 놓친 위험 {r.fn}</li>)}{!runs.length && <li>아직 기록이 없습니다.</li>}</ol>,
    wrap: {
      q: '규칙을 잘 정해도 끝까지 남은 "놓친 위험"의 주된 원인은?', options: ['차도 구역이 너무 넓어서', '탐지 모델이 그 사람을 찾지 못해서', '횡단보도를 제외해서', '경보 소리가 작아서'], correct: 1,
      why: '규칙은 탐지된 상자만 판단할 수 있습니다. 탐지 모델(6차시 재현율 78%)이 놓친 사람은 어떤 규칙으로도 경보가 울리지 않아요.', where: '놓침(노란 칸) 장면을 눌러 보면 그 사람에게 상자가 없습니다',
      conclusion: applyOk && ptPair && crPair ? `같은 탐지 결과라도 기준점이 상자 가운데면 헛경보 ${ptPair.c.fp} · 놓침 ${ptPair.c.fn}, 발이면 헛경보 ${ptPair.f.fp} · 놓침 ${ptPair.f.fn}였다. 횡단보도를 예외로 빼자 헛경보가 ${crPair.off.fp}장에서 ${crPair.on.fp}장으로 줄었다. 최종 규칙(${tag(applyOk)})으로 위험 장면 ${applyOk.tp + applyOk.fn}장 중 ${applyOk.tp}장에 경보를 울리고 헛경보는 ${applyOk.fp}장이었다. AI 모델의 결과에 상황에 맞는 규칙을 더해야 쓸모 있는 서비스가 되고, 모델이 놓친 것은 규칙으로도 되살릴 수 없다.` : '',
      record: () => ({ chart: { title: '실행별 놓친 위험(장 / 12)', x: runs.map((r) => `#${r.id}`), y: runs.map((r) => Math.min(1, r.fn / 12)) } })
    },
    source: '임시: 직접 렌더한 거리 장면(시험 40장) · 6차시 탐지 모델 public/vision/ds/det_model.json · 계산 src/sim/alarm.ts',
    nextId: 'vision-8'
  };
  return <LessonFrame def={def} onExit={onExit} onHome={onHome} />;
}
