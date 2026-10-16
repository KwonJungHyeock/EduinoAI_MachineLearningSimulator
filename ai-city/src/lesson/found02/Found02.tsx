// author: eduino
// Foundation Lab 2차시 · 규칙 vs 학습 — 센서 평면에서 기준선을 직접 끌어 규칙을 만들고(규칙), 예외 물건이 섞이면 무너지는 것을 본 뒤,
// 정답이 붙은 예시로 기준선을 스스로 찾게 한다(학습). 두 모드(개념 학습 · 체험 학습).
// 수치는 src/sim/recycle.ts 계산값(점검: tools/check_found02.ts).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { stream, acc, learn, run, rule } from '../../sim/recycle';
import { ModeLesson, type LessonMeta, type Slide, type ContentStep } from '../modes/Modes';
import { SensorPlane, Legend } from './SensorPlane';

const KEY = '#2fbf8a', GOAL = 0.9;
const NORMAL = stream(30, 'mixed', 2), TRAIN = stream(40, 'mixed', 21, 0.45), TEST = stream(30, 'mixed', 22, 0.45);
const LEARNED = learn(TRAIN);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const EXAMPLE = { crushed: TEST.find((x) => x.variant === 'crushed')!, labeled: TEST.find((x) => x.variant === 'labeled')!, colorglass: TEST.find((x) => x.variant === 'colorglass')! };
const EXN: Record<string, string> = { crushed: '찌그러진 캔', labeled: '라벨 붙은 페트병', colorglass: '색 유리병' };

function Bars({ rows, dark }: { rows: { label: string; v: number | null; c: string }[]; dark?: boolean }) {
  return <div className={`fbar ${dark ? 'fbar--dark' : ''}`}>{rows.map((r) => <div key={r.label}><span>{r.label}</span><i><b style={{ width: `${(r.v ?? 0) * 100}%`, background: r.c }} /></i><em>{r.v === null ? '—' : pct(r.v)}</em></div>)}</div>;
}
// 학습 애니메이션: 금속 기준선을 왼쪽 → 오른쪽으로 훑고, 빛 기준선을 아래 → 위로 훑으며 맞힌 비율을 잰다
function useLearn() {
  const [k, setK] = useState(-1), raf = useRef(0);
  const start = () => { cancelAnimationFrame(raf.current); const t0 = performance.now(), n = LEARNED.frames.length; const step = (now: number) => { const i = Math.min(n, Math.floor((now - t0) / 32)); setK(i); if (i < n) raf.current = requestAnimationFrame(step); }; raf.current = requestAnimationFrame(step); };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const n = LEARNED.frames.length, done = k >= n, f = k >= 0 && k < n ? LEARNED.frames[k] : null;
  return { start, done, running: k >= 0 && !done, m: done ? LEARNED.m : f ? f.m : 0.5, l: done ? LEARNED.l : f ? f.l : 0.5, a: done ? LEARNED.acc : f ? f.acc : null, phase: f?.phase ?? null };
}
function LearnBox({ L, dark }: { L: ReturnType<typeof useLearn>; dark?: boolean }) {
  return (
    <div className={`lbox ${dark ? 'lbox--dark' : ''}`}>
      <p>{L.done ? <>학습 끝: 금속 &gt; <b>{LEARNED.m}</b> · 빛 &gt; <b>{LEARNED.l}</b> 에서 예시 {TRAIN.length}개 중 <b>{pct(LEARNED.acc)}</b> 맞힘</> : L.running ? <>{L.phase === 'm' ? '금속 기준선을 옮겨 보는 중' : '빛 기준선을 옮겨 보는 중'} · 지금 자리에서 맞힘 <b>{L.a !== null ? pct(L.a) : ''}</b></> : <>정답이 붙은 예시 {TRAIN.length}개(예외 물건 포함)로 기준선을 스스로 찾게 합니다.</>}</p>
      <i><b style={{ width: `${(L.a ?? 0) * 100}%` }} /></i>
    </div>
  );
}

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
// 조건이 처음 맞을 때 한 번만 done
function When({ ok, done, children }: { ok: boolean; done: () => void; children: ReactNode }) { useEffect(() => { if (ok) done(); }, [ok]); return <>{children}</>; } // eslint-disable-line react-hooks/exhaustive-deps

export function Found02({ onExit, onHome }: { onExit: () => void; onHome: () => void }) {
  // 체험 학습 상태
  const [m, setM] = useState(0.15), [l, setL] = useState(0.3);
  const [mine, setMine] = useState<{ m: number; l: number } | null>(null);
  const L = useLearn();
  // 개념 학습 실습 패널 상태
  const [tm, setTm] = useState(0.15), [tl, setTl] = useState(0.3);
  const L2 = useLearn();
  const nAcc = acc(NORMAL, m, l), myRule = mine ?? { m: 0.5, l: 0.7 };
  const myTest = mine ? acc(TEST, mine.m, mine.l) : null, lTest = acc(TEST, LEARNED.m, LEARNED.l);
  const ruleTest = useMemo(() => run(TEST, rule(0.5, 0.7)), []);

  const meta: LessonMeta = {
    id: 'found-2', labId: 'academy', lab: 'Foundation Lab', n: 2, total: 4, title: '규칙 vs 학습', keyColor: KEY, nextId: 'found-3',
    summary: { keys: ['규칙', '학습', '정답이 붙은 예시'], line: '규칙은 사람이 기준을 정하고, 학습은 정답이 붙은 예시를 보고 컴퓨터가 기준을 찾는다. 예외가 많을수록 규칙은 무너지고, 학습은 예시만 있으면 기준을 다시 찾는다.' },
    conclusion: () => `보통 물건으로 정한 내 규칙(금속 > ${myRule.m} · 빛 > ${myRule.l})은 예외 물건이 섞이자 ${pct(myTest ?? acc(TEST, myRule.m, myRule.l))}로 떨어졌다. 정답이 붙은 예시 ${TRAIN.length}개로 학습한 기준선(금속 > ${LEARNED.m} · 빛 > ${LEARNED.l})은 같은 물건에서 ${pct(lTest)}를 맞혔다.`,
    chart: () => ({ title: '예외 물건이 섞인 30개', x: ['내 규칙', '학습한 기준'], y: [myTest ?? acc(TEST, myRule.m, myRule.l), lTest] })
  };


  const slides: Slide[] = [
    { kicker: 'Foundation Lab · 2차시', title: '규칙 vs 학습', body: <><p className="slide__lead">1차시의 감지 로봇은 센서 값으로 판단했습니다.</p><p>그 판단 기준은 <b>누가</b>, <b>어떻게</b> 정할까요? 사람이 정하는 <b>규칙</b>과, 컴퓨터가 예시에서 찾는 <b>학습</b>을 비교합니다.</p></>,
      visual: <div className="slide__plane"><SensorPlane items={NORMAL} m={0.5} l={0.7} showWrong={false} /><Legend /></div>, note: '센서 평면 읽는 법: 오른쪽일수록 금속, 위쪽일수록 투명. 점 하나가 물건 하나입니다.' },
    { kicker: '규칙', title: '사람이 기준선을 정한다', body: <><p>규칙은 <b>만약 ~이면</b>으로 씁니다.</p><p className="slide__code">만약 금속 &gt; <b>m</b> 이면 → 캔<br />아니고 빛 &gt; <b>l</b> 이면 → 페트병<br />나머지 → 유리병</p><p>평면에서는 기준선 두 개가 구역을 나눕니다.</p></>,
      practice: { label: `기준선을 끌어 보통 물건 30개를 ${GOAL * 100}% 이상 나누기`, render: (done) => { const a = acc(NORMAL, tm, tl); return <When ok={a >= GOAL} done={done}><div className="mprac__plane"><SensorPlane items={NORMAL} m={tm} l={tl} onChange={(a2, b2) => { setTm(a2); setTl(b2); }} /><p className="lead-text">맞게 나눔 <b>{pct(a)}</b> {a >= GOAL ? '✓ 규칙 완성' : '· 선을 끌어 옮겨 보세요'}</p></div></When>; } } },
    { kicker: '예외', title: '규칙에 맞지 않는 물건', body: <><p>현장에는 <b>예외 물건</b>이 섞여 옵니다.</p>{Object.entries(EXAMPLE).map(([k, it]) => <p key={k}><b>{EXN[k]}</b> — 금속 {it.metal.toFixed(2)} · 빛 {it.light.toFixed(2)}</p>)}</>,
      visual: <div className="sv-seq">{Object.keys(EXAMPLE).map((k) => <div key={k}><img src={`./found/sprites/${k}0.webp`} alt="" /><span>{EXN[k]}</span></div>)}</div>,
      practice: { label: 'OX 확인', render: (done) => <Pick q="찌그러진 캔도 보통 캔처럼 금속 반응이 크게 나온다." opts={['O', 'X']} correct={1} why="금속 면이 작아져 금속 반응이 약하게 나옵니다(0.4 근처)." done={done} /> } },
    { kicker: '규칙의 한계', title: '예외가 섞이면 규칙이 무너진다', body: <><p>보통 물건에 맞춘 규칙(금속 &gt; 0.5 · 빛 &gt; 0.7)을 예외가 섞인 30개에 그대로 쓰면:</p><Bars rows={[{ label: '보통 물건', v: acc(NORMAL, 0.5, 0.7), c: KEY }, { label: '예외 섞임', v: ruleTest.acc, c: '#f97316' }]} /><p>예외마다 규칙을 덧붙이면 규칙이 점점 길고 복잡해집니다.</p></>,
      visual: <div className="slide__plane"><SensorPlane items={TEST} m={0.5} l={0.7} /><Legend /></div>,
      practice: { label: '확인 문제', render: (done) => <Pick q="예외 물건이 계속 늘어나면 규칙은?" opts={['저절로 고쳐진다', '사람이 계속 덧붙여야 해서 점점 복잡해진다', '예외와 상관없이 늘 맞는다']} correct={1} why="규칙은 사람이 정하므로 예외마다 사람이 고쳐야 합니다." done={done} /> } },
    { kicker: '학습', title: '예시를 보고 기준을 스스로 찾는다', body: <><p>정답 이름표가 붙은 <b>예시</b>를 보여 주면, 컴퓨터는 기준선을 조금씩 옮겨 보며 <b>가장 많이 맞히는 자리</b>를 찾습니다.</p><p className="slide__lead">이것이 머신러닝의 '학습'입니다.</p></>,
      practice: { label: '학습시켜 보기', render: (done) => <When ok={L2.done} done={done}><div className="mprac__plane"><SensorPlane items={TRAIN} m={L2.m} l={L2.l} /><LearnBox L={L2} /><button className="rbtn rbtn--key" disabled={L2.running} onClick={L2.start}>{L2.done ? '다시 학습' : L2.running ? '학습 중…' : '예시로 학습시키기'}</button></div></When> } },
    { kicker: '비교', title: '규칙 vs 학습', body: <table className="slide__tbl"><tbody><tr><th></th><th>규칙</th><th>학습</th></tr><tr><td>기준을 정하는 쪽</td><td>사람</td><td>컴퓨터</td></tr><tr><td>필요한 것</td><td>사람의 생각</td><td>정답이 붙은 예시</td></tr><tr><td>예외가 늘면</td><td>사람이 계속 고침</td><td>예시를 더해 다시 학습</td></tr><tr><td>예외 섞인 30개</td><td>{pct(ruleTest.acc)}</td><td>{pct(lTest)}</td></tr></tbody></table>,
      practice: { label: '확인 문제', render: (done) => <Pick q="학습에 꼭 필요한 것은?" opts={['더 빠른 컴퓨터', '정답이 붙은 예시(데이터)', '더 긴 규칙']} correct={1} why="정답 이름표가 붙은 예시가 있어야 컴퓨터가 기준을 찾을 수 있습니다. 다음 차시에서 직접 이름표를 붙여 봅니다." done={done} /> } }
  ];

  const content: [ContentStep, ContentStep] = [
    { title: '체험하기', ask: mine ? '예외 물건이 섞인 새 묶음에 내 규칙을 그대로 써 보았습니다. 빨간 고리 = 잘못 나눈 물건.' : `기준선 두 개를 끌어 캔 · 페트병 · 유리병을 나누는 규칙을 만드세요. (목표 ${GOAL * 100}%)`,
      scene: <div className="f2__scene"><SensorPlane items={mine ? TEST : NORMAL} m={mine ? mine.m : m} l={mine ? mine.l : l} onChange={mine ? undefined : (a, b) => { setM(a); setL(b); }} dark /><Legend dark /></div>,
      panel: <div className="ctrl">
        <p className="lead-text">내 규칙<br /><code className="f2__code">만약 금속 &gt; {m.toFixed(2)} → 캔<br />아니고 빛 &gt; {l.toFixed(2)} → 페트병<br />나머지 → 유리병</code></p>
        <p className="lead-text">보통 물건 30개 · 맞게 나눔 <b>{pct(nAcc)}</b> {nAcc >= GOAL ? '✓' : ''}</p>
        {!mine ? <button className={`rbtn rbtn--key ${nAcc >= GOAL ? 'is-target' : ''}`} disabled={nAcc < GOAL} onClick={() => setMine({ m, l })}>예외 물건이 섞인 새 묶음에 써 보기</button>
          : <button className="rbtn" onClick={() => setMine(null)}>규칙 다시 고치기</button>}
      </div>,
      result: <Bars dark rows={[{ label: '보통 물건 30개', v: nAcc, c: KEY }, { label: '예외 섞인 30개', v: myTest, c: '#f97316' }]} />,
      ready: !!mine },
    { title: '개념 익히기', ask: L.done ? `같은 예외 섞인 30개에서: 내 규칙 ${myTest !== null ? pct(myTest) : '—'} · 학습한 기준 ${pct(lTest)}` : '규칙 대신, 정답이 붙은 예시를 보여 주고 컴퓨터가 기준선을 스스로 찾게 해 봅시다.',
      scene: <div className="f2__scene"><SensorPlane items={L.done ? TEST : TRAIN} m={L.m} l={L.l} dark /><Legend dark /></div>,
      panel: <div className="ctrl">
        <LearnBox L={L} />
        <button className={`rbtn rbtn--key ${!L.done && !L.running ? 'is-target' : ''}`} disabled={L.running} onClick={L.start}>{L.done ? '다시 학습' : L.running ? '학습 중…' : '예시로 학습시키기'}</button>
        <p className="lead-text"><b>규칙</b>: 사람이 기준을 정함 · <b>학습</b>: 정답이 붙은 예시로 컴퓨터가 기준을 찾음</p>
      </div>,
      result: L.done ? <Bars dark rows={[{ label: '내 규칙', v: myTest, c: '#f97316' }, { label: '학습한 기준', v: lTest, c: KEY }]} /> : undefined,
      ready: L.done }
  ];
  return <ModeLesson meta={meta} slides={slides} content={content} onExit={onExit} onHome={onHome} />;
}
