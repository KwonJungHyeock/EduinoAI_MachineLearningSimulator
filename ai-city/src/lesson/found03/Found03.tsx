// author: eduino
// Foundation Lab 3차시 · 데이터와 이름표 — 물건에 정답 이름표를 직접 붙이고 그 재료로 학습시킨다.
// 재료가 치우치거나(유리병 예시 없음) 이름표가 틀리면(유리병에 '페트병' 이름표) 학습한 기준이 어떻게 바뀌는지 본다.
// 수치는 src/sim/recycle.ts 계산값(점검: tools/check_found03.ts).
import { useEffect, useMemo, useState } from 'react';
import { learn, acc, run, rule, dataset, asTrain, KO, KINDS, type Kind, type Labeled } from '../../sim/recycle';
import { ModeLesson, type LessonMeta, type Slide, type ContentStep } from '../modes/Modes';
import { SensorPlane, Legend, KC } from '../found02/SensorPlane';
import { Pick, When, Bars, pct, sprite, Sprite } from '../modes/kit';

const KEY = '#2fbf8a';
const TEST = asTrain(dataset(30, 41, 1 / 3, 0));               // 처음 보는 물건 30개(고르게)
const MINE = dataset(12, 51, 1 / 3, 0);                         // 학생이 이름표를 붙일 12개
type Cond = 'good' | 'noglass' | 'wrong';
const COND: Record<Cond, { name: string; desc: string; data: Labeled[] }> = {
  good: { name: '바른 이름표 · 고른 재료', desc: '캔 · 페트 · 유리가 고르게, 이름표도 정확', data: dataset(40, 31, 1 / 3, 0) },
  noglass: { name: '유리병 예시 없음', desc: '재료 40개에 유리병이 하나도 없음', data: dataset(40, 31, 0, 0) },
  wrong: { name: '틀린 이름표 섞임', desc: '유리병의 60%에 실수로 "페트병" 이름표', data: dataset(40, 31, 1 / 3, 0, { from: 'glass', to: 'pet', rate: 0.6 }) }
};
const RES = Object.fromEntries((Object.keys(COND) as Cond[]).map((c) => { const L = learn(asTrain(COND[c].data)); return [c, { L, test: acc(TEST, L.m, L.l), wrong: run(TEST, rule(L.m, L.l)).wrong }]; })) as Record<Cond, { L: ReturnType<typeof learn>; test: number; wrong: number[] }>;

// 이름표 붙이기: 물건 하나씩 보고 통 이름을 고른다
function Labeler({ items, labels, setLabel, dark }: { items: Labeled[]; labels: (Kind | null)[]; setLabel: (i: number, k: Kind) => void; dark?: boolean }) {
  const cur = labels.findIndex((x) => x === null), i = cur < 0 ? items.length - 1 : cur, it = items[i].it;
  return (
    <div className={`lab3 ${dark ? 'lab3--dark' : ''}`}>
      <div className="lab3__main">
        <div className="lab3__pic" key={i}><Sprite it={it} /></div>
        <div className="lab3__side">
          <p className="lab3__n">{cur < 0 ? '12개 모두 붙였어요' : `${i + 1} / ${items.length}번째 물건`}</p>
          <p className="lab3__v">금속 반응 <b>{it.metal.toFixed(2)}</b> · 빛 투과 <b>{it.light.toFixed(2)}</b></p>
          <p className="lab3__q">{cur < 0 ? '아래에서 이름표를 눌러 고칠 수 있어요.' : '이 물건의 정답 이름표는?'}</p>
          {cur >= 0 && <div className="lab3__btns">{KINDS.map((k) => <button key={k} style={{ ['--c' as string]: KC[k] }} onClick={() => setLabel(i, k)}>{KO[k]}</button>)}</div>}
        </div>
      </div>
      <div className="lab3__strip">{items.map((x, j) => <button key={j} className={`${j === cur ? 'on' : ''}`} onClick={() => labels[j] && setLabel(j, KINDS[(KINDS.indexOf(labels[j]!) + 1) % 3])} title="눌러서 이름표 바꾸기"><img src={sprite(x.it)} alt="" />{labels[j] ? <i style={{ background: KC[labels[j]!] }}>{KO[labels[j]!]}</i> : <i className="e">?</i>}</button>)}</div>
    </div>
  );
}
// 슬라이드용: 물건에 이름표가 하나씩 붙는 움직임(ask = 아직 이름표 없음, '?'가 차례로 깜박)
function TagDemo({ ask }: { ask?: boolean }) {
  const [k, setK] = useState(0);
  useEffect(() => { const id = setInterval(() => setK((v) => (v + 1) % 12), 700); return () => clearInterval(id); }, []);
  return <div className={`tag3 ${ask ? 'tag3--ask' : ''}`}>{MINE.slice(0, 8).map((x, j) => <div key={j} className={ask ? (j === k % 8 ? 'on' : '') : j < k ? 'on' : ''}><Sprite it={x.it} />{ask ? <i>?</i> : <i style={{ background: KC[x.label] }}>{KO[x.label]}</i>}</div>)}</div>;
}
// 슬라이드용: 세 가지 재료 → 처음 보는 물건 정확도(막대가 차례로 차오름)
const C3: [Cond, [string, Kind | null][]][] = [
  ['good', [['can0', 'can'], ['pet0', 'pet'], ['glass0', 'glass']]],
  ['noglass', [['can0', 'can'], ['pet0', 'pet'], ['glass0', null]]],
  ['wrong', [['can0', 'can'], ['pet0', 'pet'], ['glass0', 'pet']]]
];
function Cond3() {
  return <div className="cond3">{C3.map(([c, its], i) => <div key={c} className={`cond3__row ${c}`} style={{ ['--i' as string]: i }}>
    <div className="cond3__its">{its.map(([s, lab], j) => <span key={j} className={lab ? (c === 'wrong' && j === 2 ? 'bad' : '') : 'gone'}><Sprite name={s} /><i style={lab ? { background: KC[lab] } : undefined}>{lab ? KO[lab] : '없음'}</i></span>)}</div>
    <div className="cond3__bar"><b>{COND[c].name}</b><i><em style={{ width: pct(RES[c].test), background: c === 'good' ? KEY : '#f97316' }} /></i></div>
    <strong>{pct(RES[c].test)}</strong></div>)}</div>;
}
function CondPlane({ c }: { c: Cond }) {
  return <div className="slide__plane"><SensorPlane items={asTrain(COND[c].data)} m={RES[c].L.m} l={RES[c].L.l} showWrong={false} /><p className="slide__live">{COND[c].name} → 처음 보는 물건 <b>{pct(RES[c].test)}</b></p></div>;
}

export function Found03({ onExit, onHome }: { onExit: () => void; onHome: () => void }) {
  const [labels, setLabels] = useState<(Kind | null)[]>(MINE.map(() => null));
  const [trained, setTrained] = useState<{ m: number; l: number; test: number; ok: number } | null>(null);
  const [cond, setCond] = useState<Cond | null>(null), [seen, setSeen] = useState<Cond[]>([]);
  const [mini, setMini] = useState<(Kind | null)[]>([null, null, null]);
  const allLabeled = labels.every(Boolean), myOk = labels.filter((k, i) => k === MINE[i].it.kind).length;
  const setLabel = (i: number, k: Kind) => { setLabels((ls) => ls.map((x, j) => (j === i ? k : x))); setTrained(null); };
  const train = () => { const L = learn(asTrain(MINE.map((x, i) => ({ it: x.it, label: labels[i]! })))); setTrained({ m: L.m, l: L.l, test: acc(TEST, L.m, L.l), ok: myOk }); };
  const pickCond = (c: Cond) => { setCond(c); setSeen((s) => (s.includes(c) ? s : [...s, c])); };
  const bad = seen.filter((c) => c !== 'good').length;
  const rows = useMemo(() => (Object.keys(COND) as Cond[]).map((c) => ({ label: COND[c].name, v: seen.includes(c) ? RES[c].test : null, c: c === 'good' ? KEY : '#f97316' })), [seen]);

  const meta: LessonMeta = {
    id: 'found-3', labId: 'academy', lab: 'Foundation Lab', n: 3, total: 4, title: '데이터와 이름표', keyColor: KEY, nextId: 'found-4',
    summary: { keys: ['데이터', '정답 이름표', '골고루'], line: 'AI는 정답 이름표가 붙은 데이터로 배운다. 이름표가 틀리거나 한쪽 종류가 빠진 데이터로 배우면, AI도 그만큼 틀린다.' },
    conclusion: () => `바른 이름표 · 고른 재료로 배우면 처음 보는 물건 ${pct(RES.good.test)}를 맞혔지만, 유리병 예시가 없으면 ${pct(RES.noglass.test)}, 유리병에 틀린 이름표가 섞이면 ${pct(RES.wrong.test)}로 떨어졌다.${trained ? ` 내가 이름표를 붙인 12개로 배운 기준은 ${pct(trained.test)}였다.` : ''}`,
    chart: () => ({ title: '재료에 따른 처음 보는 물건 정확도', x: ['바른 재료', '유리병 없음', '틀린 이름표'], y: [RES.good.test, RES.noglass.test, RES.wrong.test] })
  };

  const slides: Slide[] = [
    { kicker: 'Foundation Lab · 3차시', title: '데이터와 이름표', body: <><p>2차시에서 컴퓨터는 <b>정답이 붙은 예시</b>를 보고 기준을 찾았습니다.</p><p>이 예시를 <b>데이터</b>, 정답을 <b>이름표</b>라고 합니다. 이름표는 누가 붙일까요?</p></>, visual: <TagDemo ask />, note: '“이름표는 사람이 붙인다”는 점을 먼저 짚어 주세요.' },
    { kicker: '이름표 붙이기', title: '사람이 정답을 알려 준다', body: <><p>물건마다 사람이 보고 <b>캔 · 페트병 · 유리병</b> 중 하나를 붙입니다.</p><p>찌그러진 캔도 <b>캔</b>, 라벨 붙은 페트병도 <b>페트병</b>입니다.</p></>, visual: <TagDemo />,
      practice: { label: '물건 3개에 이름표 붙이기', render: (done) => <When ok={mini.every((k, i) => k === MINE[i].it.kind)} done={done}><div className="mini3">{MINE.slice(0, 3).map((x, i) => <div key={i}><img src={sprite(x.it)} alt="" /><div>{KINDS.map((k) => <button key={k} className={mini[i] === k ? (k === x.it.kind ? 'ok' : 'no') : ''} onClick={() => setMini((m) => m.map((v, j) => (j === i ? k : v)))}>{KO[k]}</button>)}</div></div>)}<p className="lead-text">{mini.every((k, i) => k === MINE[i].it.kind) ? '✓ 모두 맞게 붙였어요' : '물건 모양을 보고 골라 보세요'}</p></div></When> } },
    { kicker: '치우친 데이터', title: '유리병 예시가 없으면?', body: <><p>재료 40개에 유리병이 하나도 없으면, 컴퓨터는 유리병이 무엇인지 배울 수 없습니다.</p><Bars rows={[{ label: '고른 재료', v: RES.good.test, c: KEY }, { label: '유리병 없음', v: RES.noglass.test, c: '#f97316' }]} /><p>처음 보는 유리병 {TEST.filter((x) => x.kind === 'glass').length}개 중 {RES.noglass.wrong[2]}개를 틀렸어요.</p></>, visual: <CondPlane c="noglass" />,
      practice: { label: '확인 문제', render: (done) => <Pick q="유리병을 자꾸 틀리는 로봇을 고치려면?" opts={['기준선을 손으로 옮긴다', '유리병 예시를 데이터에 더 넣어 다시 학습한다', '센서를 끈다']} correct={1} why="빠진 종류의 예시를 더 모아 다시 학습하면 됩니다." done={done} /> } },
    { kicker: '틀린 이름표', title: '이름표가 틀리면?', body: <><p>사람이 실수로 유리병의 60%에 <b>"페트병"</b> 이름표를 붙였습니다.</p><Bars rows={[{ label: '바른 이름표', v: RES.good.test, c: KEY }, { label: '틀린 이름표', v: RES.wrong.test, c: '#f97316' }]} /><p>컴퓨터는 이름표를 그대로 믿고 배웁니다.</p></>, visual: <CondPlane c="wrong" />,
      practice: { label: 'OX 확인', render: (done) => <Pick q="AI는 틀린 이름표를 스스로 알아채고 고쳐서 배운다." opts={['O', 'X']} correct={1} why="AI는 이름표를 정답으로 믿고 배웁니다. 그래서 이름표를 정확히 붙이는 일이 중요해요." done={done} /> } },
    { kicker: '정리', title: '좋은 데이터의 조건', body: <><p><b>① 정확한 이름표</b> — 정답이 맞아야 한다</p><p><b>② 골고루</b> — 모든 종류가 고르게 들어 있어야 한다</p><p><b>③ 충분히</b> — 예외 물건까지 담을 만큼 많아야 한다</p></>, visual: <Cond3 />,
      practice: { label: '확인 문제', render: (done) => <Pick q="좋은 데이터의 조건이 아닌 것은?" opts={['정확한 이름표', '모든 종류가 골고루', '한 종류만 많이']} correct={2} why="한 종류만 많으면 나머지 종류를 제대로 배우지 못합니다." done={done} /> } }
  ];

  const content: [ContentStep, ContentStep] = [
    { title: '체험하기', ask: trained ? `내 이름표 12개로 학습한 기준선 → 처음 보는 물건 30개 중 ${pct(trained.test)} 맞힘` : allLabeled ? '이름표를 다 붙였어요. 이 재료로 학습시켜 봅시다.' : '물건 12개에 정답 이름표를 붙여 주세요. 컴퓨터는 이 이름표를 정답으로 믿고 배웁니다.',
      scene: trained ? <div className="f2__scene"><SensorPlane items={TEST} m={trained.m} l={trained.l} dark /><Legend dark /></div> : <Labeler items={MINE} labels={labels} setLabel={setLabel} dark />,
      panel: <div className="ctrl">
        <p className="lead-text">붙인 이름표 <b>{labels.filter(Boolean).length} / {MINE.length}</b>{allLabeled ? <> · 정답과 같음 <b>{myOk}</b>개</> : ''}</p>
        <button className={`rbtn rbtn--key ${allLabeled && !trained ? 'is-target' : ''}`} disabled={!allLabeled} onClick={train}>{trained ? '다시 학습' : '내 이름표로 학습시키기'}</button>
        {trained && <button className="rbtn" onClick={() => setTrained(null)}>이름표 다시 보기</button>}
        <p className="lead-text">찌그러진 캔 · 라벨 붙은 페트병 · 색 유리병도 섞여 있어요. 모양이 달라도 정답은 원래 종류입니다.</p>
      </div>,
      result: trained ? <Bars dark rows={[{ label: '내 이름표 정확도', v: myOk / MINE.length, c: '#a5b4fc' }, { label: '처음 보는 물건', v: trained.test, c: KEY }]} /> : undefined,
      ready: !!trained },
    { title: '개념 익히기', ask: cond ? `${COND[cond].name}: ${COND[cond].desc} → 처음 보는 물건 ${pct(RES[cond].test)}` : '재료가 달라지면 학습 결과는 어떻게 바뀔까요? 재료를 골라 학습시켜 보세요.',
      scene: cond ? <div className="f2__scene"><SensorPlane items={asTrain(COND[cond].data)} m={RES[cond].L.m} l={RES[cond].L.l} showWrong={false} dark /><Legend dark /></div> : <div className="f2__scene f3__empty"><p>오른쪽에서 재료를 고르세요. 평면에는 학습 재료(바닥 고리 = 붙인 이름표)와 학습한 기준선이 나타납니다.</p></div>,
      panel: <div className="ctrl">
        {(Object.keys(COND) as Cond[]).map((c) => <button key={c} className={`rbtn ${cond === c ? 'rbtn--key' : ''} ${!seen.includes(c) && seen.length < 3 ? 'is-target' : ''}`} onClick={() => pickCond(c)}>{COND[c].name}</button>)}
        <p className="lead-text">바닥 고리 색 = 붙인 이름표. 유리병 위에 파란 고리가 있으면 이름표가 틀린 것입니다.</p>
      </div>,
      result: seen.length ? <Bars dark rows={rows} /> : undefined,
      ready: seen.includes('good') && bad >= 1 }
  ];
  return <ModeLesson meta={meta} slides={slides} content={content} onExit={onExit} onHome={onHome} />;
}
