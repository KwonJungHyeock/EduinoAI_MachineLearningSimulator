// author: eduino
// Foundation Lab 4차시 · 얼마나 잘 맞혔을까 — 평가는 처음 보는 데이터로.
// '외우기 로봇'(본 물건이면 정답, 처음 보면 찍기)과 '기준선 로봇'(2차시에서 학습한 기준)을 학습 재료 · 처음 보는 물건으로 시험하고, 혼동표를 읽는다.
// 수치는 src/sim/recycle.ts 계산값(점검: tools/check_found03.ts).
import { useEffect, useState } from 'react';
import { stream, learn, run, rule, memorize, confusion, KO, KINDS, type Item, type Kind } from '../../sim/recycle';
import { ModeLesson, type LessonMeta, type Slide, type ContentStep } from '../modes/Modes';
import { SensorPlane, Legend, KC } from '../found02/SensorPlane';
import { Pick, When, Bars, pct, Sprite } from '../modes/kit';

const KEY = '#2fbf8a';
const TRAIN = stream(40, 'mixed', 21, 0.45), TEST = stream(30, 'mixed', 22, 0.45);
const L = learn(TRAIN), MEM = memorize(TRAIN), LINE = rule(L.m, L.l);
type Bot = 'mem' | 'line'; type Set = 'train' | 'test';
const BOT: Record<Bot, { name: string; desc: string; dec: (it: Item, i: number) => Kind }> = {
  mem: { name: '외우기 로봇', desc: '본 물건은 정답을 외워 두고, 처음 보는 물건은 찍는다', dec: MEM },
  line: { name: '기준선 로봇', desc: '예시로 학습한 기준선(금속 · 빛)으로 판단한다', dec: (it) => LINE(it) }
};
const SETN: Record<Set, string> = { train: '학습 재료로 시험', test: '처음 보는 물건으로 시험' };
const items = (s: Set) => (s === 'train' ? TRAIN : TEST);
const A: Record<string, number> = Object.fromEntries((['mem', 'line'] as Bot[]).flatMap((b) => (['train', 'test'] as Set[]).map((s) => [`${b}-${s}`, run(items(s), BOT[b].dec).acc])));
const CM: Record<Bot, number[][]> = { mem: confusion(TEST, MEM), line: confusion(TEST, BOT.line.dec) };

function Matrix({ m, pick, onPick, dark }: { m: number[][]; pick?: [number, number] | null; onPick?: (c: [number, number]) => void; dark?: boolean }) {
  return (
    <table className={`cm4 ${dark ? 'cm4--dark' : ''}`}>
      <thead><tr><th>실제 \ 로봇 판단</th>{KINDS.map((k) => <th key={k}>{KO[k]}</th>)}</tr></thead>
      <tbody>{KINDS.map((r, i) => <tr key={r}><th><i style={{ background: KC[r] }} />{KO[r]}</th>{KINDS.map((c, j) => <td key={c} className={`${i === j ? 'd' : m[i][j] ? 'x' : ''} ${pick && pick[0] === i && pick[1] === j ? 'on' : ''}`} onClick={() => onPick?.([i, j])}>{m[i][j]}</td>)}</tr>)}</tbody>
    </table>
  );
}
// 슬라이드용: 시험 결과 막대가 차례로 채워지는 움직임
function ExamDemo() {
  const [k, setK] = useState(0);
  useEffect(() => { const id = setInterval(() => setK((v) => (v + 1) % 7), 1100); return () => clearInterval(id); }, []);
  const rows = [['외우기 · 학습 재료', 'mem-train', '#a5b4fc'], ['외우기 · 처음 보는 물건', 'mem-test', '#f97316'], ['기준선 · 학습 재료', 'line-train', '#a5b4fc'], ['기준선 · 처음 보는 물건', 'line-test', KEY]] as const;
  return <div className="exam4">{rows.map(([t, key, c], i) => <div key={key} className={i < k ? 'on' : ''}><Bars rows={[{ label: t, v: i < k ? A[key] : 0, c }]} /></div>)}</div>;
}
// 슬라이드용: 학습 재료(배운 문제)와 처음 보는 물건(처음 보는 문제)이 따로 쌓이는 움직임
function SplitDemo() {
  return <div className="split4">{([['배운 문제', `학습 재료 ${TRAIN.length}개`, TRAIN], ['처음 보는 문제', `처음 보는 물건 ${TEST.length}개`, TEST]] as const).map(([t, n, xs], s) => <div key={t} className={s ? 'new' : ''}>
    <div className="split4__grid">{xs.slice(0, 12).map((it, j) => <span key={it.id} style={{ ['--j' as string]: j + s * 6 }}><Sprite it={it} />{s ? <i>?</i> : null}</span>)}</div>
    <p><b>{t}</b>{n}</p></div>)}</div>;
}

export function Found04({ onExit, onHome }: { onExit: () => void; onHome: () => void }) {
  const [bot, setBot] = useState<Bot>('mem'), [set, setSet] = useState<Set>('train');
  const [tried, setTried] = useState<string[]>([]);
  const [pick, setPick] = useState<[number, number] | null>(null), [pickOk, setPickOk] = useState(false);
  const tryIt = (b: Bot, s: Set) => { setBot(b); setSet(s); setTried((t) => (t.includes(`${b}-${s}`) ? t : [...t, `${b}-${s}`])); };
  const cur = `${bot}-${set}`, done4 = (['mem-train', 'mem-test', 'line-train', 'line-test']).every((k) => tried.includes(k));
  const v = (k: string) => (tried.includes(k) ? A[k] : null);
  const onCell = (c: [number, number]) => { setPick(c); if (c[0] !== c[1]) setPickOk(true); };

  const meta: LessonMeta = {
    id: 'found-4', labId: 'academy', lab: 'Foundation Lab', n: 4, total: 4, title: '얼마나 잘 맞혔을까', keyColor: KEY,
    summary: { keys: ['평가', '처음 보는 데이터', '혼동표'], line: '외운 문제로 시험하면 누구나 100점이다. AI의 실력은 학습에 쓰지 않은, 처음 보는 데이터로 잰다. 혼동표를 보면 무엇을 무엇으로 헷갈렸는지 알 수 있다.' },
    conclusion: () => `외우기 로봇은 학습 재료로 시험하면 ${pct(A['mem-train'])}였지만 처음 보는 물건에서는 ${pct(A['mem-test'])}였다. 기준선 로봇은 학습 재료 ${pct(A['line-train'])} · 처음 보는 물건 ${pct(A['line-test'])}로 실제 실력이 높았다.`,
    chart: () => ({ title: '처음 보는 물건 정확도', x: ['외우기 로봇', '기준선 로봇'], y: [A['mem-test'], A['line-test']] })
  };

  const slides: Slide[] = [
    { kicker: 'Foundation Lab · 4차시', title: '얼마나 잘 맞혔을까', body: <><p>로봇이 배웠다면, 이제 <b>실력</b>을 재 봐야 합니다.</p><p>시험 문제는 어디서 가져와야 할까요? <b>배운 문제</b>일까요, <b>처음 보는 문제</b>일까요?</p></>, visual: <SplitDemo />, note: '“시험 문제를 미리 알려 주면 실력을 잴 수 있을까?”로 시작해 보세요.' },
    { kicker: '두 로봇', title: '외우기 로봇 vs 기준선 로봇', body: <><p><b>외우기 로봇</b> — 학습 재료 40개를 통째로 외운다. 처음 보는 물건은 찍는다.</p><p><b>기준선 로봇</b> — 학습 재료에서 기준선<span className="nw">(금속 &gt; {L.m} · 빛 &gt; {L.l})</span>을 찾았다.</p></>, visual: <div className="slide__plane"><SensorPlane items={TRAIN} m={L.m} l={L.l} showWrong={false} /><Legend /></div>,
      practice: { label: '확인 문제', render: (done) => <Pick q="처음 보는 물건이 들어오면 외우기 로봇은?" opts={['기준선으로 판단한다', '외운 것이 없어서 찍는다', '센서로 다시 배운다']} correct={1} why="외우기 로봇은 본 적 없는 물건에 대한 기준이 없습니다." done={done} /> } },
    { kicker: '시험', title: '배운 문제 vs 처음 보는 문제', body: <><p>같은 두 로봇을 <b>학습 재료</b>와 <b>처음 보는 물건</b>, 두 가지 시험지로 시험했습니다.</p><p>배운 문제로 재면 외우기 로봇이 {pct(A['mem-train'])}로 더 좋아 보입니다.</p><p>처음 보는 물건에서는 외우기 로봇 {pct(A['mem-test'])}, 기준선 로봇 {pct(A['line-test'])}입니다.</p></>, visual: <ExamDemo />,
      practice: { label: 'OX 확인', render: (done) => <Pick q="AI의 실력은 학습에 쓴 데이터로 시험해야 정확히 알 수 있다." opts={['O', 'X']} correct={1} why="학습에 쓰지 않은, 처음 보는 데이터로 시험해야 실제 실력을 알 수 있습니다." done={done} /> } },
    { kicker: '혼동표', title: '무엇을 무엇으로 헷갈렸나', body: <><p>가로줄 = 실제 종류, 세로줄 = 로봇의 판단입니다.</p><p><b>대각선(초록)</b>은 맞힌 개수, 나머지 칸(주황)은 헷갈린 개수입니다.</p><p>외우기 로봇의 처음 보는 물건 시험 결과입니다.</p></>, visual: <Matrix m={CM.mem} />,
      practice: { label: '혼동표에서 헷갈린 칸 누르기', render: (done) => <When ok={pickOk} done={done}><div className="ctrl"><Matrix m={CM.mem} pick={pick} onPick={onCell} /><p className="lead-text">{pick ? (pick[0] === pick[1] ? `맞힌 칸: 실제 ${KO[KINDS[pick[0]]]}을 ${KO[KINDS[pick[0]]]}으로 ${CM.mem[pick[0]][pick[1]]}개` : `헷갈린 칸: 실제 ${KO[KINDS[pick[0]]]}을 ${KO[KINDS[pick[1]]]}으로 ${CM.mem[pick[0]][pick[1]]}개 잘못 판단`) : '대각선이 아닌 칸을 눌러 보세요.'}</p></div></When> } },
    { kicker: 'Foundation Lab 정리', title: '기초 과정에서 배운 것', body: <><p><b>1차시</b> AI 로봇은 감지 → 판단 → 행동</p><p><b>2차시</b> 규칙은 사람이, 학습은 예시로 기준을 찾는다</p><p><b>3차시</b> 정확하고 골고루인 데이터가 필요하다</p><p><b>4차시</b> 실력은 처음 보는 데이터로 잰다</p></>, visual: <div className="fsum4">{['감지 → 판단 → 행동', '규칙 vs 학습', '데이터와 이름표', '평가'].map((t, i) => <div key={t} style={{ ['--i' as string]: i }}><b>{i + 1}</b><span>{t}</span></div>)}</div>,
      practice: { label: '확인 문제', render: (done) => <Pick q="로봇의 실제 실력을 재는 가장 좋은 방법은?" opts={['학습 재료로 다시 시험한다', '학습에 쓰지 않은 물건으로 시험한다', '규칙을 더 길게 만든다']} correct={1} why="처음 보는 데이터로 시험해야 외운 것이 아닌 진짜 실력을 알 수 있습니다." done={done} /> } }
  ];

  const content: [ContentStep, ContentStep] = [
    { title: '체험하기', ask: tried.length ? `${BOT[bot].name} · ${SETN[set]} → ${pct(A[cur])} 맞힘` : '두 로봇을 두 가지 시험지로 시험해 보세요. 어느 로봇이 진짜 실력이 좋을까요?',
      scene: <div className="f2__scene"><SensorPlane items={items(set)} m={L.m} l={L.l} decide={BOT[bot].dec} noLines={bot === 'mem'} dark /><Legend dark /></div>,
      panel: <div className="ctrl">
        {(['mem', 'line'] as Bot[]).map((b) => <div key={b} className="bot4"><p><b>{BOT[b].name}</b><span>{BOT[b].desc}</span></p><div>{(['train', 'test'] as Set[]).map((s) => <button key={s} className={`rbtn ${cur === `${b}-${s}` ? 'rbtn--key' : ''} ${!tried.includes(`${b}-${s}`) ? 'is-target' : ''}`} onClick={() => tryIt(b, s)}>{s === 'train' ? '학습 재료' : '처음 보는 물건'}</button>)}</div></div>)}
      </div>,
      result: <Bars dark rows={[{ label: '외우기 · 학습 재료', v: v('mem-train'), c: '#a5b4fc' }, { label: '외우기 · 처음 보는 물건', v: v('mem-test'), c: '#f97316' }, { label: '기준선 · 학습 재료', v: v('line-train'), c: '#a5b4fc' }, { label: '기준선 · 처음 보는 물건', v: v('line-test'), c: KEY }]} />,
      ready: done4 },
    { title: '개념 익히기', ask: '처음 보는 물건 30개 시험의 혼동표입니다. 대각선 = 맞힘. 헷갈린 칸을 눌러 보세요.',
      scene: <div className="f2__scene cm4__wrap"><div><p>외우기 로봇 · {pct(A['mem-test'])}</p><Matrix m={CM.mem} pick={pick} onPick={onCell} dark /></div><div><p>기준선 로봇 · {pct(A['line-test'])}</p><Matrix m={CM.line} dark /></div></div>,
      panel: <div className="ctrl">
        <p className="lead-text">{pick ? (pick[0] === pick[1] ? `맞힌 칸: 실제 ${KO[KINDS[pick[0]]]}을 그대로 ${KO[KINDS[pick[1]]]}으로 판단한 개수입니다.` : `외우기 로봇은 실제 ${KO[KINDS[pick[0]]]} ${CM.mem[pick[0]][pick[1]]}개를 ${KO[KINDS[pick[1]]]}으로 헷갈렸어요. 기준선 로봇은 같은 칸이 ${CM.line[pick[0]][pick[1]]}개입니다.`) : '왼쪽 외우기 로봇 표에서 대각선이 아닌 칸을 눌러 보세요.'}</p>
        <p className="lead-text"><b>평가는 처음 보는 데이터로.</b> 학습 재료로만 재면 외우기 로봇이 {pct(A['mem-train'])}로 더 좋아 보이지만, 실제 실력은 {pct(A['mem-test'])}입니다.</p>
      </div>,
      ready: pickOk }
  ];
  return <ModeLesson meta={meta} slides={slides} content={content} onExit={onExit} onHome={onHome} />;
}
