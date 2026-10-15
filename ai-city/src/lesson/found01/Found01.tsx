// author: eduino
// Foundation Lab 1차시 · AI 로봇은 무엇이 다를까 — '정해진 대로 움직이는 기계'와 '감지 → 판단 → 행동 로봇'에게 같은 물건 줄을 맡겨 비교.
// 수치는 src/sim/recycle.ts 계산값(점검: tools/check_found01.ts). 장면 = 직접 렌더한 선별 라인 + 물건 스프라이트를 코드로 움직임.
import { useEffect, useMemo, useRef, useState } from 'react';
import { stream, fixedMachine, robot, run, KO, KINDS, BASIS, type Item, type Kind, type Sense } from '../../sim/recycle';
import { LessonFrame, type LessonDef } from '../LessonFrame';
import { ConceptBox, Question, Feedback } from '../ui';
import { PointGraph } from '../PointGraph';
import { CodeCells } from '../CodeCells';

type Mach = 'fixed' | 'robot';
type Order = 'cycle' | 'mixed';
interface Cfg { mach: Mach; order: Order; sense: Sense }
interface Run extends Cfg { id: number; kind: 'exp' | 'apply'; items: Item[]; got: Kind[]; ok: number; acc: number; wrong: number[] }
interface Scene { w: number; h: number; belt: number[][]; gate: number[]; arm: number[]; bins: number[][]; sprites: Record<string, { w: number; h: number; dx: number; dy: number }> }
const KEY = '#2fbf8a', N = 30, GOAL = 0.9, SEED: Record<Order, number> = { cycle: 1, mixed: 1 }, APPLY_SEED = 11;
const MN: Record<Mach, string> = { fixed: '정해진 대로 기계', robot: '감지 로봇' }, ON: Record<Order, string> = { cycle: '정해진 순서', mixed: '섞여서' };
const pct = (x: number) => `${Math.round(x * 100)}%`;
const PREDICT = ['그래도 거의 다 맞게 나눈다', '3개 중 1개쯤만 맞게 나눈다', '하나도 못 맞힌다', '감지 로봇보다 잘 나눈다'];
const BIN_COLOR: Record<Kind, string> = { can: '#9aa4ae', pet: '#3b82f6', glass: '#2f7d4f' };
const sname = (it: Item) => (it.variant === 'normal' ? `${it.kind}${it.v}` : `${it.variant}0`);

// 선별 라인 장면: 물건이 왼쪽에서 들어와 센서 게이트(로봇일 때만 빛남) → 로봇 팔 → 통으로. 끝나면 통마다 맞음 · 틀림 개수.
function LineScene({ S, r, play, onEnd }: { S: Scene; r: Run | null; play: number; onEnd: () => void }) {
  const [t, setT] = useState(1e9), raf = useRef(0);
  const DUR = 9; // 30개가 지나가는 시간(초)
  useEffect(() => {
    if (!play || !r) { setT(1e9); return; }
    const t0 = performance.now(); let done = false;
    const step = (now: number) => { const v = (now - t0) / 1000; setT(v); if (v < DUR + 1.2) raf.current = requestAnimationFrame(step); else if (!done) { done = true; onEnd(); } };
    raf.current = requestAnimationFrame(step); return () => cancelAnimationFrame(raf.current);
  }, [play]); // eslint-disable-line react-hooks/exhaustive-deps
  const bx = (x: number) => { const b = S.belt; const i = Math.max(0, Math.min(b.length - 2, Math.floor((x - b[0][0]) / (b[1][0] - b[0][0])))); const k = (x - b[i][0]) / (b[i + 1][0] - b[i][0]); return [b[i][1] + (b[i + 1][1] - b[i][1]) * k, b[i][2] + (b[i + 1][2] - b[i][2]) * k]; };
  const ARM_X = 1.15, START = -2.9, gap = (ARM_X - START) / 6;
  const items = r?.items ?? [], got = r?.got ?? [];
  const live = t < 1e8;
  const placed = live ? items.filter((_, i) => t > (i * DUR) / N + 1.0).length : items.length;
  const counts = KINDS.map((k) => ({ ok: 0, no: 0, k })), shown = got.slice(0, placed);
  shown.forEach((g, i) => { const c = counts[KINDS.indexOf(g)]; if (g === items[i].kind) c.ok++; else c.no++; });
  const gateOn = r?.mach === 'robot' && live && items.some((_, i) => { const x = START + (t - (i * DUR) / N) * gap * 6; return Math.abs(x - -0.6) < 0.18; });
  return (
    <div className="fl1">
      <div className="fl1__pic" style={{ aspectRatio: `${S.w} / ${S.h}` }}>
        <img src="./found/line.webp" alt="재활용 선별 라인" />
        <span className={`fl1__gate ${gateOn ? 'on' : ''} ${r?.mach === 'robot' ? 'robot' : ''}`} style={{ left: `${S.gate[0] * 100}%`, top: `${(S.gate[1] - 0.2) * 100}%` }}>{r?.mach === 'robot' ? '센서' : '센서 꺼짐'}</span>
        {live && items.map((it, i) => {
          const tt = t - (i * DUR) / N; if (tt < 0) return null;
          let x = START + tt * gap * 6, fx: number, fy: number, sc = 1, op = 1;
          if (x < ARM_X) { [fx, fy] = bx(x); }
          else { // 팔에서 통으로 포물선
            const k = Math.min(1, (x - ARM_X) / 1.3), b = S.bins[KINDS.indexOf(got[i])], [ax, ay] = bx(ARM_X);
            fx = ax + (b[0] - ax) * k; fy = ay + (b[1] - ay) * k - Math.sin(k * Math.PI) * 0.16; sc = 1 - 0.3 * k; op = k >= 1 ? 0 : 1; x = ARM_X;
          }
          const sp = S.sprites[sname(it)] ?? S.sprites[`${it.kind}0`];
          return <img key={i} className="fl1__it" src={`./found/sprites/${sname(it)}.webp`} alt="" style={{ left: `${(fx + sp.dx * sc) * 100}%`, top: `${(fy + sp.dy * sc) * 100}%`, width: `${sp.w * sc * 100}%`, opacity: op }} />;
        })}
        <div className="fl1__bins">{KINDS.map((k, i) => (
          <span key={k} className="fl1__bin" style={{ ['--c' as string]: BIN_COLOR[k] }}>
            <b>{KO[k]} 통</b>{r ? <em><i className="ok">✓ {counts[i].ok}</i> <i className="no">✕ {counts[i].no}</i></em> : <em>—</em>}
          </span>))}</div>
        {r && <span className="zoom__rec">{MN[r.mach]} · {ON[r.order]} · {placed}/{N}</span>}
      </div>
      <div className="fl1__strip">
        {items.map((it, i) => <span key={i} className={`fl1__cell ${i < placed ? (got[i] === it.kind ? 'ok' : 'no') : ''}`} title={`${i + 1}번 ${KO[it.kind]} → ${i < placed ? KO[got[i]] + ' 통' : '대기'}`}><img src={`./found/sprites/${sname(it)}.webp`} alt="" /></span>)}
        {!items.length && <span className="fl1__empty">기계와 물건 순서를 고르고 [라인 돌리기]를 누르세요</span>}
      </div>
    </div>
  );
}

export function Found01({ onExit, onHome }: { onExit: () => void; onHome: () => void }) {
  const [S, setS] = useState<Scene | null>(null);
  useEffect(() => { fetch('./found/scene.json').then((r) => r.json()).then(setS); }, []);
  const [predict, setPredict] = useState<number | null>(null);
  const [exp, setExp] = useState<{ mach: Mach; order: Order }>({ mach: 'fixed', order: 'cycle' });
  const [code, setCode] = useState<Sense>({ metal: false, light: false, mTh: 0.5, lTh: 0.7 });
  const [runs, setRuns] = useState<Run[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [play, setPlay] = useState(0), [busy, setBusy] = useState(false);
  const nid = useRef(1);
  const doRun = (kind: Run['kind'], c: Cfg, seed: number) => {
    const items = stream(N, c.order, seed), dec = c.mach === 'fixed' ? fixedMachine : robot(c.sense), r = run(items, dec);
    setRuns((rs) => [...rs, { id: nid.current++, kind, ...c, items, got: r.res.map((x) => x.got), ok: r.ok, acc: r.acc, wrong: r.wrong }]);
    setHover(null); setBusy(true); setPlay((p) => p + 1);
  };
  const expR = runs.filter((r) => r.kind === 'exp'), app = runs.filter((r) => r.kind === 'apply');
  const find = (m: Mach, o: Order) => expR.find((r) => r.mach === m && r.order === o) ?? null;
  const fc = find('fixed', 'cycle'), fm = find('fixed', 'mixed'), rm = find('robot', 'mixed');
  const applyOk = app.find((r) => r.acc >= GOAL) ?? null;
  const shown = (hover !== null ? runs.find((r) => r.id === hover) : null) ?? runs[runs.length - 1] ?? null;
  const allSense: Sense = { metal: true, light: true, mTh: 0.5, lTh: 0.7 };
  const fb = useMemo(() => {
    const r = app[app.length - 1]; if (!r) return null;
    const where = `서랍 [기록] #${r.id}`;
    if (r.acc >= GOAL) return { ok: true, why: `금속 · 빛 센서를 모두 켜자 섞여 오는 ${N}개 중 ${r.ok}개(${pct(r.acc)})를 맞는 통에 넣었습니다.`, where };
    if (!r.sense.metal && !r.sense.light) return { ok: false, why: `센서가 모두 꺼져 있으면 로봇도 물건을 '보지' 못합니다(${pct(r.acc)}). → use_metal_sensor 와 use_light_sensor 를 켜 보세요.`, where };
    if (!r.sense.light) return { ok: false, why: `금속 센서만으로는 캔은 알지만 페트병과 유리병을 구별하지 못합니다(유리병 ${r.wrong[2]}개 틀림). → use_light_sensor 도 켜 보세요.`, where };
    return { ok: false, why: `빛 센서만으로는 빛이 통하지 않는 캔을 유리병으로 잘못 봅니다(캔 ${r.wrong[0]}개 틀림). → use_metal_sensor 도 켜 보세요.`, where };
  }, [app]);
  if (!S) return <div className="loading">선별 라인을 불러오는 중…</div>;

  const def: LessonDef = {
    id: 'found-1', lab: 'Foundation Lab', labId: 'academy', n: 1, total: 8, title: 'AI 로봇은 무엇이 다를까', keyColor: KEY,
    place: 'AI 아카데미 · 재활용 선별 라인',
    problem: '선별 라인의 기계가 캔 · 페트병 · 유리병을 엉뚱한 통에 넣고 있다. 무엇이 문제인지 찾고, 섞여 오는 물건도 바르게 나누자.',
    goals: [
      { text: '정해진 대로 기계에 물건 순서를 바꿔 맡겨 보기', done: !!(fc && fm) },
      { text: '같은 물건 줄을 감지 로봇에게 맡겨 비교하기', done: !!rm },
      { text: `섞여 오는 ${N}개 중 ${GOAL * 100}% 이상 맞게 나누기`, done: !!applyOk }
    ],
    canNext: [true, predict !== null, !!(fc && fm && rm), true, !!applyOk],
    busy,
    now: [
      '장면을 보고 [다음]을 누르세요',
      predict === null ? '보기 하나를 골라 예측하세요' : '[다음]을 눌러 실험으로 가세요',
      busy ? '물건이 지나가는 모습을 보세요' : !fc ? '정해진 대로 기계 · 정해진 순서로 [라인 돌리기]' : !fm ? '물건 순서를 [섞여서]로 바꿔 다시 돌리기' : !rm ? '기계를 [감지 로봇]으로 바꿔 섞여서 돌리기' : '[다음]을 눌러 개념으로 가세요',
      '개념을 읽고 [다음]을 누르세요',
      busy ? '물건이 지나가는 모습을 보세요' : applyOk ? '[다음]을 눌러 정리하세요' : '코드 서랍의 노란 칸을 바꾸고 [실행]을 누르세요'
    ],
    onStep: () => setHover(null),
    rail: (st) => (
      <>
        {st === 0 && <p className="lead-text">선별 라인에는 두 가지 기계가 있습니다. <b>정해진 대로 기계</b>는 물건을 보지 않고 캔 → 페트 → 유리 순서로 통을 바꿔 가며 밀어 넣어요. <b>감지 로봇</b>은 센서 게이트에서 물건을 재고(감지), 무엇인지 정한 뒤(판단), 그 통에 넣습니다(행동).</p>}
        {st === 1 && <Question q="물건이 순서 없이 섞여서 오면, 정해진 대로 기계는?" options={PREDICT} picked={predict} onPick={setPredict} target />}
        {st === 2 && (
          <div className="ctrl">
            <p className="ctrl__label">기계</p>
            <div className="seg seg--2">{(['fixed', 'robot'] as Mach[]).map((m) => <button key={m} className={exp.mach === m ? 'is-on' : ''} disabled={busy} onClick={() => setExp({ ...exp, mach: m })}>{MN[m]}</button>)}</div>
            <p className="ctrl__label">물건이 오는 순서</p>
            <div className="seg seg--2">{(['cycle', 'mixed'] as Order[]).map((o) => <button key={o} className={exp.order === o ? 'is-on' : ''} disabled={busy} onClick={() => setExp({ ...exp, order: o })}>{o === 'cycle' ? '정해진 순서 (캔·페트·유리 반복)' : '섞여서'}</button>)}</div>
            <div className="ctrl__row"><button className={`rbtn rbtn--key ${!(fc && fm && rm) ? 'is-target' : ''}`} disabled={busy} onClick={() => doRun('exp', { ...exp, sense: allSense }, SEED[exp.order])}>{busy ? '라인 도는 중…' : `라인 돌리기 (${N}개)`}</button></div>
            <ul className="obs-check">
              <li className={fc ? 'done' : ''}><i>{fc ? '✓' : ''}</i>기계 · 정해진 순서 {fc ? `${fc.ok}/${N} (${pct(fc.acc)})` : ''}</li>
              <li className={fm ? 'done' : ''}><i>{fm ? '✓' : ''}</i>기계 · 섞여서 {fm ? `${fm.ok}/${N} (${pct(fm.acc)})` : ''}</li>
              <li className={rm ? 'done' : ''}><i>{rm ? '✓' : ''}</i>감지 로봇 · 섞여서 {rm ? `${rm.ok}/${N} (${pct(rm.acc)})` : ''}</li>
            </ul>
            {fm && predict !== null && <div className="compare"><p><span>내 예측</span>{PREDICT[predict]}</p><p><span>실제</span>섞여서 오면 기계는 {N}개 중 {fm.ok}개({pct(fm.acc)})만 맞힘</p></div>}
          </div>
        )}
        {st === 3 && (
          <ConceptBox term="AI 로봇 = 감지 → 판단 → 행동" def="정해진 대로 움직이는 기계는 세상이 예상과 같을 때만 맞다. AI 로봇은 센서로 지금 상황을 재고, 그 값으로 판단해서 움직인다.">
            <p className="concept__formula">감지(센서) → 판단(규칙 · 학습) → 행동(팔 · 바퀴)</p>
            <p className="concept__note">기계는 물건이 '캔 → 페트 → 유리' 순서로 올 때 100%였지만, 섞여 오자 {fm ? pct(fm.acc) : '크게'} 떨어졌어요. 순서만 외우고 물건을 보지 않았기 때문입니다. 감지 로봇은 금속 센서 · 빛 센서 값을 보고 판단해서 순서와 상관없이 맞혔어요. 이번 Lab에서는 이 '판단'을 사람이 규칙으로 만들 때와, 예시로 학습시킬 때를 차례로 비교합니다.</p>
          </ConceptBox>
        )}
        {st === 4 && <div className="ctrl"><p className="lead-text">감지 로봇의 센서를 고장 난 상태로 가져왔습니다. 코드 서랍에서 필요한 센서를 켜서 섞여 오는 {N}개 중 {GOAL * 100}% 이상을 맞게 나누세요.</p>{fb && <Feedback {...fb} />}</div>}
      </>
    ),
    scene: () => <LineScene S={S} r={shown} play={hover === null ? play : 0} onEnd={() => setBusy(false)} />,
    band: (
      <>
        <span className="chip chip--clock"><i>기계</i><b style={{ fontSize: 13 }}>{shown ? `${MN[shown.mach]} · ${ON[shown.order]}` : '—'}</b></span>
        <span className={`chip ${shown ? (shown.acc >= GOAL ? 'ok' : 'miss') : ''}`}><i>맞게 나눔</i><b>{shown ? pct(shown.acc) : '—'}<small>{shown ? ` ${shown.ok}/${N}` : ''}</small></b></span>
        {shown && <span className="chip"><i>틀린 캔 · 페트 · 유리</i><b>{shown.wrong.join(' · ')}</b></span>}
        <span className="chip"><i>목표(섞여서)</i><b>{GOAL * 100}%</b></span>
      </>
    ),
    drawerFor: (n) => (n === 2 ? 'graph' : n === 4 ? 'code' : n === 5 ? 'log' : null),
    drawer: (d, st) => d === 'graph'
      ? (() => { const rs = st >= 4 ? runs : expR; return (
        <PointGraph xTicks={rs.map((r, i) => ({ v: i + 1, label: `#${r.id}` }))} xMin={0.5} xMax={Math.max(3, rs.length) + 0.5}
          yLabel="맞게 나눈 비율" xLabel="실행 순서" goal={{ y: GOAL, label: `목표 ${GOAL * 100}%`, above: true }}
          series={[
            { name: '정해진 대로 기계', cls: 'b', points: rs.filter((r) => r.mach === 'fixed').map((r) => ({ x: rs.indexOf(r) + 1, y: r.acc, id: r.id, tip: `기계 · ${ON[r.order]} · ${pct(r.acc)}` })) },
            { name: '감지 로봇', cls: 'a', points: rs.filter((r) => r.mach === 'robot').map((r) => ({ x: rs.indexOf(r) + 1, y: r.acc, id: r.id, tip: `로봇 · ${ON[r.order]}${r.kind === 'apply' ? ` · 센서 ${r.sense.metal ? '금속' : ''}${r.sense.metal && r.sense.light ? '+' : ''}${r.sense.light ? '빛' : ''}${!r.sense.metal && !r.sense.light ? '없음' : ''}` : ''} · ${pct(r.acc)}` })) }
          ]}
          activeId={hover} onHover={(id) => { if (!busy) setHover(id); }}
          read="주황 = 물건을 보지 않는 기계, 청록 = 센서로 보고 판단하는 로봇. 같은 물건 줄에서 두 점의 높이를 비교하세요."
          link={hover !== null ? '위 장면의 통 숫자와 아래 물건 줄(초록 = 맞는 통, 빨강 = 틀린 통)이 이 실행의 결과로 바뀌었습니다.' : '점에 마우스를 올리면 그 실행에서 물건이 어느 통에 들어갔는지 위 장면에 나타납니다.'} />); })()
      : d === 'code'
      ? <CodeCells enabled={st === 4} title="Foundation Lab · 감지 로봇" run={`robot.sort(items=${N}, order='mixed')`} running={busy} onRun={() => doRun('apply', { mach: 'robot', order: 'mixed', sense: code }, APPLY_SEED)}
          lines={[
            { kind: 'cell', name: 'use_metal_sensor', value: code.metal ? 'True' : 'False', comment: '금속 반응 센서(캔을 알아봄)', toggle: () => setCode((c) => ({ ...c, metal: !c.metal })) },
            { kind: 'cell', name: 'use_light_sensor', value: code.light ? 'True' : 'False', comment: '빛 투과 센서(페트 · 유리 구별)', toggle: () => setCode((c) => ({ ...c, light: !c.light })) },
            { kind: 'text', text: '# 판단 규칙(2차시에 직접 만들어 봅니다): 금속 > 0.5 → 캔, 빛 > 0.7 → 페트, 나머지 → 유리' }
          ]} />
      : <ol className="ldrawer">{[...runs].reverse().map((r) => <li key={r.id}><b>#{r.id}</b> {r.kind === 'exp' ? '실험' : '적용'} · {MN[r.mach]} · {ON[r.order]}{r.kind === 'apply' ? ` · 금속 센서 ${r.sense.metal ? '켬' : '끔'} · 빛 센서 ${r.sense.light ? '켬' : '끔'}` : ''} → {r.ok}/{N} ({pct(r.acc)}) · 틀린 캔 {r.wrong[0]} · 페트 {r.wrong[1]} · 유리 {r.wrong[2]}</li>)}{!runs.length && <li>아직 기록이 없습니다.</li>}</ol>,
    wrap: {
      q: '물건이 섞여서 오자 정해진 대로 기계가 많이 틀린 이유는?', options: ['기계가 너무 느려서', '물건을 보지 않고 정해 둔 순서대로만 통을 바꿔서', '물건이 너무 많아서', '통이 3개뿐이라서'], correct: 1,
      why: `기계는 '캔 → 페트 → 유리'가 반복된다고 가정하고 움직입니다. 순서가 맞으면 ${fc ? pct(fc.acc) : '100%'}, 섞이면 ${fm ? pct(fm.acc) : '낮은 값'}이었어요.`, where: '실험 단계 관찰 기록',
      conclusion: applyOk && fc && fm && rm ? `정해진 대로 기계는 물건이 정해진 순서로 올 때 ${pct(fc.acc)}였지만 섞여 오자 ${pct(fm.acc)}로 떨어졌다. 같은 물건 줄을 센서로 보고 판단하는 감지 로봇은 ${pct(rm.acc)}를 맞혔다. 고장 난 로봇은 금속 · 빛 센서를 모두 켜야 ${pct(applyOk.acc)}가 되었다. AI 로봇은 감지 → 판단 → 행동으로 움직이며, 상황이 바뀌어도 지금 본 값으로 판단한다.` : '',
      record: () => ({ chart: { title: '실행별 맞게 나눈 비율', x: runs.map((r) => `#${r.id}`), y: runs.map((r) => r.acc) } })
    },
    source: `임시: ${BASIS} · 계산 src/sim/recycle.ts · 장면은 직접 렌더`,
    nextId: 'found-2'
  };
  return <LessonFrame def={def} onExit={onExit} onHome={onHome} />;
}
