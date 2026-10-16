// author: eduino
// Foundation Lab 1차시 · AI 로봇은 무엇이 다를까 — 두 모드(이론: 슬라이드 + 실습 패널 / 콘텐츠: 해보기 → 알아보기 → 확인하기).
// 같은 물건 줄을 '정해진 대로 기계'와 '감지 로봇'에 맡겨 비교. 수치는 src/sim/recycle.ts 계산값(점검: tools/check_found01.ts).
import { useEffect, useMemo, useRef, useState } from 'react';
import { stream, fixedMachine, robot, run, KO, KINDS, type Item, type Kind, type Sense } from '../../sim/recycle';
import { ModeLesson, type LessonMeta, type Slide, type ContentStep } from '../modes/Modes';

type Mach = 'fixed' | 'robot';
type Order = 'cycle' | 'mixed';
interface Cfg { mach: Mach; order: Order; sense: Sense }
interface Run extends Cfg { id: number; items: Item[]; got: Kind[]; ok: number; acc: number; wrong: number[] }
interface Scene { w: number; h: number; belt: number[][]; gate: number[]; arm: number[]; bins: number[][]; sprites: Record<string, { w: number; h: number; dx: number; dy: number }> }
const KEY = '#2fbf8a', N = 30, SEED = 1;
const MN: Record<Mach, string> = { fixed: '정해진 대로 기계', robot: '감지 로봇' }, ON: Record<Order, string> = { cycle: '정해진 순서', mixed: '섞여서' };
const pct = (x: number) => `${Math.round(x * 100)}%`;
const BIN_COLOR: Record<Kind, string> = { can: '#9aa4ae', pet: '#3b82f6', glass: '#2f7d4f' };
const sname = (it: Item) => (it.variant === 'normal' ? `${it.kind}${it.v}` : `${it.variant}0`);
const ALL: Sense = { metal: true, light: true, mTh: 0.5, lTh: 0.7 };
const calc = (mach: Mach, order: Order, sense: Sense = ALL) => { const items = stream(N, order, SEED), r = run(items, mach === 'fixed' ? fixedMachine : robot(sense)); return { items, got: r.res.map((x) => x.got), ok: r.ok, acc: r.acc, wrong: r.wrong }; };

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


// 슬라이드용: 같은 라인 장면을 저절로 반복 재생(움직이는 수업 자료)
function AutoLine({ S, mach, order }: { S: Scene; mach: Mach; order: Order }) {
  const r = useMemo(() => ({ id: 0, mach, order, sense: ALL, ...calc(mach, order) }), [mach, order]);
  const [play, setPlay] = useState(1);
  return <div className="slide__line"><LineScene S={S} r={r} play={play} onEnd={() => setTimeout(() => setPlay((p) => p + 1), 1600)} /></div>;
}

// 두 결과 막대(기계 vs 로봇 등)
function Bars({ rows }: { rows: { label: string; v: number | null; c: string }[] }) {
  return <div className="fbar">{rows.map((r) => <div key={r.label}><span>{r.label}</span><i><b style={{ width: `${(r.v ?? 0) * 100}%`, background: r.c }} /></i><em>{r.v === null ? '—' : pct(r.v)}</em></div>)}</div>;
}
// 센서로 물건 재 보기: 물건을 고르면 금속 · 빛 값(계산) → 로봇의 판단. 센서를 끄면 판단이 어떻게 바뀌는지
const PROBE = (() => { const s = stream(12, 'mixed', 4); return KINDS.map((k) => s.find((x) => x.kind === k)!); })();
function SensorProbe({ onTry, light = true }: { onTry?: (n: number) => void; light?: boolean }) {
  const [pick, setPick] = useState<number | null>(null), [sense, setSense] = useState<Sense>(ALL), tried = useRef(new Set<number>());
  const it = pick === null ? null : PROBE[pick], dec = it ? robot(sense)(it) : null;
  return (
    <div className={`probe ${light ? '' : 'probe--dark'}`}>
      <div className="probe__items">{PROBE.map((x, i) => <button key={i} className={pick === i ? 'on' : ''} onClick={() => { setPick(i); tried.current.add(i); onTry?.(tried.current.size); }}><img src={`./found/sprites/${sname(x)}.webp`} alt="" /><span>{KO[x.kind]}</span></button>)}</div>
      <div className="probe__sw">{(['metal', 'light'] as const).map((k) => <label key={k}><input type="checkbox" checked={sense[k]} onChange={() => setSense((s) => ({ ...s, [k]: !s[k] }))} />{k === 'metal' ? '금속 센서' : '빛 센서'}</label>)}</div>
      {it ? (
        <div className="probe__out">
          <p><span>① 감지</span><span>금속 반응 <b>{sense.metal ? it.metal.toFixed(2) : '—'}</b> · 빛 투과 <b>{sense.light ? it.light.toFixed(2) : '—'}</b></span></p>
          <p><span>② 판단</span><span>{!sense.metal && !sense.light ? '센서가 없어 알 수 없음 → 첫 통' : sense.metal && it.metal > 0.5 ? '금속 반응이 크다(> 0.5) → 캔' : sense.light ? (it.light > 0.7 ? '빛이 잘 통한다(> 0.7) → 페트병' : '빛이 덜 통한다 → 유리병') : '금속이 아니다 → 페트병(빛 센서 없음)'}</span></p>
          <p className={dec === it.kind ? 'ok' : 'no'}><span>③ 행동</span><span>{KO[dec!]} 통에 넣음 {dec === it.kind ? '✓ 맞음' : `✕ 틀림(실제 ${KO[it.kind]})`}</span></p>
        </div>) : <p className="probe__hint">물건을 하나 골라 보세요.</p>}
    </div>
  );
}

export function Found01({ onExit, onHome }: { onExit: () => void; onHome: () => void }) {
  const [S, setS] = useState<Scene | null>(null);
  useEffect(() => { fetch('./found/scene.json').then((r) => r.json()).then(setS); }, []);
  // 콘텐츠 모드 상태
  const [runs, setRuns] = useState<Run[]>([]), [play, setPlay] = useState(0), [busy, setBusy] = useState(false), [tries, setTries] = useState(0);
  const nid = useRef(1);
  const doRun = (mach: Mach) => { const c = calc(mach, 'mixed'); setRuns((rs) => [...rs, { id: nid.current++, mach, order: 'mixed', sense: ALL, ...c }]); setBusy(true); setPlay((p) => p + 1); };
  const last = (m: Mach) => [...runs].reverse().find((r) => r.mach === m) ?? null;
  const fm = last('fixed'), rm = last('robot'), shown = runs[runs.length - 1] ?? null;
  // 이론 슬라이드에 쓰는 계산값(콘텐츠 모드와 같은 계산)
  const T = useMemo(() => ({ fc: calc('fixed', 'cycle'), fm: calc('fixed', 'mixed'), rm: calc('robot', 'mixed') }), []);
  const [shown3, setShown3] = useState(false);
  if (!S) return <div className="loading">선별 라인을 불러오는 중…</div>;

  const meta: LessonMeta = {
    id: 'found-1', labId: 'academy', lab: 'Foundation Lab', n: 1, total: 4, title: 'AI 로봇은 무엇이 다를까', keyColor: KEY, nextId: 'found-2',
    summary: { keys: ['감지', '판단', '행동'], line: 'AI 로봇은 센서로 지금 상황을 재고(감지), 그 값으로 정하고(판단), 움직인다(행동). 정해진 대로만 움직이는 기계는 상황이 바뀌면 틀린다.' },
    conclusion: () => `물건이 섞여 오자 정해진 대로 기계는 ${N}개 중 ${(fm ?? T.fm).ok}개(${pct((fm ?? T.fm).acc)})만 맞게 나눴고, 센서로 보고 판단하는 감지 로봇은 ${(rm ?? T.rm).ok}개(${pct((rm ?? T.rm).acc)})를 맞게 나눴다.`,
    chart: () => ({ title: '섞여 올 때 맞게 나눈 비율', x: ['기계', '로봇'], y: [(fm ?? T.fm).acc, (rm ?? T.rm).acc] })
  };

  const choice = (q: string, opts: string[], correct: number, why: string) => (done: () => void) => <Pick q={q} opts={opts} correct={correct} why={why} done={done} />;
  const slides: Slide[] = [
    { kicker: 'Foundation Lab · 1차시', title: 'AI 로봇은 무엇이 다를까', body: <><p className="slide__lead">아카데미 선별 라인에 캔 · 페트병 · 유리병이 섞여서 들어옵니다.</p><p>두 기계에게 같은 일을 맡겨 보고, <b>무엇이 다른지</b> 찾아봅시다.</p></>, visual: <AutoLine S={S} mach="robot" order="mixed" />, note: '선별 라인 사진을 보여 주며 “기계가 물건을 어떻게 알아볼까?”를 먼저 물어보세요.' },
    { kicker: '기계 ①', title: '정해진 대로 움직이는 기계', body: <><p>이 기계는 물건을 <b>보지 않습니다.</b></p><p>캔 → 페트 → 유리 순서를 외워 두고, 그 순서대로 통을 바꿔 가며 밀어 넣어요.</p></>, visual: <div className="slide__stack"><AutoLine S={S} mach="fixed" order="cycle" /><div className="sv-seq sv-seq--anim">{KINDS.map((k, i) => <div key={k} style={{ ['--i' as string]: i }}><img src={`./found/sprites/${k}0.webp`} alt="" /><span>{i + 1}번째 → {KO[k]} 통</span></div>)}</div></div>,
      practice: { label: 'OX 확인', render: (done) => <Pick q="이 기계는 센서로 물건을 재서 통을 고른다." opts={['O', 'X']} correct={1} why="물건을 보지 않고 외운 순서대로만 움직입니다." done={done} /> } },
    { kicker: '실험', title: '물건 순서가 바뀌면?', body: <><p>물건이 <b>정해진 순서</b>로 올 때와 <b>섞여서</b> 올 때, 기계는 30개 중 몇 개를 맞게 나눌까요?</p>{shown3 && <Bars rows={[{ label: '정해진 순서', v: T.fc.acc, c: '#9aa4ae' }, { label: '섞여서', v: T.fm.acc, c: '#f97316' }]} />}</>,
      visual: <AutoLine S={S} mach="fixed" order={shown3 ? 'mixed' : 'cycle'} />,
      practice: { label: '직접 돌려 보기', render: (done) => <div className="ctrl"><p className="lead-text">버튼을 눌러 두 경우를 계산해 보세요(같은 물건 30개).</p><button className="rbtn rbtn--key" onClick={() => { setShown3(true); done(); }}>섞어서 돌려 보기</button>{shown3 && <p className="lead-text">정해진 순서 <b>{pct(T.fc.acc)}</b> → 섞여서 <b>{pct(T.fm.acc)}</b>. 순서가 바뀌자 크게 틀렸어요.</p>}</div> },
      note: '왜 떨어졌는지 학생이 먼저 말하게 한 뒤 다음 슬라이드로.' },
    { kicker: '핵심', title: '감지 → 판단 → 행동', body: <><p><b>감지</b> — 센서로 지금 상황을 잰다</p><p><b>판단</b> — 잰 값으로 무엇인지 정한다</p><p><b>행동</b> — 정한 대로 움직인다</p><p className="slide__lead">AI 로봇은 이 세 단계를 매번 되풀이합니다.</p></>, visual: <div className="sv-flow sv-flow--anim"><span>감지<small>센서 게이트</small></span><i>→</i><span>판단<small>규칙 · 학습</small></span><i>→</i><span>행동<small>로봇 팔</small></span></div>,
      practice: { label: '확인 문제', render: choice('센서로 물건의 금속 반응을 재는 것은 어느 단계일까?', ['감지', '판단', '행동'], 0, '센서로 상황을 재는 것은 감지입니다.') } },
    { kicker: '감지', title: '센서 두 개로 물건 재기', body: <><p><b>금속 센서</b> — 캔처럼 금속이면 값이 크다</p><p><b>빛 센서</b> — 페트병은 빛이 잘 통하고, 유리병은 덜 통한다</p><p className="slide__lead">오른쪽에서 물건을 골라 로봇이 어떻게 판단하는지 확인해 보세요.</p></>,
      visual: <div className="sv-sense sv-sense--anim">{PROBE.map((x, j) => <div key={x.kind} style={{ ['--i' as string]: j }}><img src={`./found/sprites/${sname(x)}.webp`} alt="" /><span>{KO[x.kind]}</span><p><em>금속</em><i><b style={{ width: `${x.metal * 100}%` }} /></i><small>{x.metal.toFixed(2)}</small></p><p><em>빛</em><i><b className="l" style={{ width: `${x.light * 100}%` }} /></i><small>{x.light.toFixed(2)}</small></p></div>)}</div>,
      practice: { label: '물건 재 보기 (2개 이상)', render: (done) => <SensorProbe onTry={(n) => { if (n >= 2) done(); }} /> } },
    { kicker: '결과', title: '섞여서 와도 맞게 나눈다', body: <><p>같은 물건 30개(섞여서)를 두 기계에 맡긴 결과입니다.</p><Bars rows={[{ label: '정해진 대로 기계', v: T.fm.acc, c: '#f97316' }, { label: '감지 로봇', v: T.rm.acc, c: KEY }]} /></>,
      visual: <AutoLine S={S} mach="robot" order="mixed" />,
      practice: { label: '확인 문제', render: choice('감지 로봇이 섞여 와도 맞게 나눈 이유는?', ['더 빨라서', '물건마다 센서로 재고 판단해서', '순서를 더 잘 외워서'], 1, '감지 로봇은 순서와 상관없이 매번 센서 값으로 판단합니다.') } }
  ];

  const content: [ContentStep, ContentStep] = [
    { title: '체험하기', ask: '물건이 섞여서 들어옵니다. 어느 쪽이 더 잘 나눌까요? 두 기계로 각각 라인을 돌려 보세요.',
      scene: <LineScene S={S} r={shown} play={play} onEnd={() => setBusy(false)} />,
      panel: <div className="ctrl">
        <button className={`rbtn ${!fm ? 'is-target' : ''}`} disabled={busy} onClick={() => doRun('fixed')}>{busy && shown?.mach === 'fixed' ? '도는 중…' : '① 정해진 대로 기계로 돌리기'}</button>
        <button className={`rbtn rbtn--key ${fm && !rm ? 'is-target' : ''}`} disabled={busy} onClick={() => doRun('robot')}>{busy && shown?.mach === 'robot' ? '도는 중…' : '② 감지 로봇으로 돌리기'}</button>
        <p className="lead-text">정해진 대로 기계는 순서를 외워 움직이고, 감지 로봇은 센서로 재서 판단합니다.</p></div>,
      result: <Bars rows={[{ label: '정해진 대로 기계', v: fm && !(busy && shown?.mach === 'fixed') ? fm.acc : null, c: '#f97316' }, { label: '감지 로봇', v: rm && !(busy && shown?.mach === 'robot') ? rm.acc : null, c: KEY }]} />,
      ready: !!(fm && rm) && !busy },
    { title: '개념 익히기', ask: '감지 로봇은 어떻게 알아봤을까요? 물건을 골라 감지 → 판단 → 행동을 따라가 보세요. 센서를 꺼 보면 어떻게 될까요?',
      scene: <div className="cflow__probe"><div className="sv-flow sv-flow--dark"><span>감지<small>센서 게이트</small></span><i>→</i><span>판단<small>규칙</small></span><i>→</i><span>행동<small>로봇 팔</small></span></div><SensorProbe light={false} onTry={setTries} /></div>,
      panel: <div className="ctrl"><p className="lead-text"><b>AI 로봇 = 감지 → 판단 → 행동.</b> 정해진 대로 기계에는 '감지'가 없어서, 순서가 바뀌면 틀렸어요({fm ? pct(fm.acc) : '—'}).</p><p className="lead-text">물건 2개 이상을 골라 보세요. {tries >= 2 ? '✓' : `(${tries}/2)`}</p></div>,
      ready: tries >= 2 }
  ];
  return <ModeLesson meta={meta} slides={slides} content={content} onExit={onExit} onHome={onHome} />;
}

// 실습 패널용 선택 문제(맞히면 done)
function Pick({ q, opts, correct, why, done }: { q: string; opts: string[]; correct: number; why: string; done: () => void }) {
  const [p, setP] = useState<number | null>(null);
  return (
    <div className="question">
      <p className="question__q">{q}</p>
      <div className="question__opts">{opts.map((o, i) => <button key={o} className={`opt ${p === i ? (i === correct ? 'is-right' : 'is-wrong') : ''}`} onClick={() => { setP(i); if (i === correct) done(); }}><span>{String.fromCharCode(65 + i)}</span>{o}</button>)}</div>
      {p !== null && <p className={`as-fb ${p === correct ? 'ok' : 'no'}`}><b>{p === correct ? '맞음' : '다시'}</b>{p === correct ? why : '다시 골라 보세요.'}</p>}
    </div>
  );
}
