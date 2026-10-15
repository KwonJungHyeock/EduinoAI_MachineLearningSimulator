/* author: eduino */
// 계산 모델 점검 (만들기 전 레드팀): 배우게 할 결론이 실제 계산에서 나오는지 확인한다.
//   결론 1) 센서 하나(금속 감지 / 투명도 / 무게)만으로는 캔·페트병·유리병을 다 나눌 수 없다
//   결론 2) 센서 둘(예: 금속 감지 + 무게)이면 다 나눌 수 있다
// 규칙 언어는 화면과 같다: 줄 최대 3개 + '아니면'. 가능한 규칙을 전부 찾아 가장 좋은 결과를 쓴다.
//   A) 촘촘한 기준값(값 사이 가운데) — 이론상 최선
//   B) 편집기 기준값 칸(투명도 10 % · 무게 10 g) — 학생이 실제로 고를 수 있는 값
//   C) 결론 1이 기대는 물건: 하나를 빼면 센서 하나로 다 나뉘어 버리는 물건
// 실행: node tools/check_model.js   (표 출력 + tools/model_check.json 저장, 결론이 안 나오면 exit 1)
'use strict';
const fs = require('fs');
const path = require('path');
const Rules = require('../src/rules.js');

const D = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/items.json'), 'utf8'));
const ITEMS = D.items.filter((it) => it.set === '0-2');
const kinds = Object.keys(D.kinds);
const S = D.sensors;
const STEPS = { transparency: 10, weight: 10 };
const name = (s) => S[s].name;
const kname = (k) => D.kinds[k].name;

function lineText(ln) {
  if (S[ln.sensor].type === 'bool') return `${name(ln.sensor)} ${ln.op === '>=' ? '감지' : '미감지'} → ${kname(ln.bin)}`;
  return `${name(ln.sensor)} ${ln.op} ${ln.value}${S[ln.sensor].unit} → ${kname(ln.bin)}`;
}
const ruleText = (r) => r.lines.map(lineText).concat(['아니면 → ' + kname(r.elseBin)]).join(' / ');

const COMBOS = [['metal'], ['transparency'], ['weight'], ['metal', 'transparency'], ['metal', 'weight'], ['transparency', 'weight'], ['metal', 'transparency', 'weight']];

function table(items, mode) {
  return COMBOS.map((c) => {
    const cands = mode === 'grid' ? Rules.gridCandidates(S, c, STEPS) : null;
    const b = Rules.best(items, c, kinds, cands);
    const res = Rules.run(b.rule, items, null, kinds);
    return {
      sensors: c, label: c.map(name).join(' + '), count: c.length,
      correct: b.correct, total: items.length, all: b.correct === items.length,
      rule: ruleText(b.rule),
      wrong: res.wrong.map((w) => `${ITEMS.find((i) => i.id === w.id).label}(${kname(w.kind)})→${kname(w.to)} 통`),
      mixed: c.length === 1 ? Rules.overlaps(items, c[0], kinds).mixed.map((p) => p.map(kname).join('·')) : []
    };
  });
}
function print(title, rows) {
  console.log(`\n## ${title}`);
  console.log('| 켠 센서 | 최선 정답 | 다 나눔 | 섞이는 쌍 | 최선 규칙 | 잘못 간 물건 |');
  console.log('|---|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.label} | ${r.correct} / ${r.total} | ${r.all ? 'O' : 'X'} | ${r.mixed.join(', ') || '-'} | ${r.rule} | ${r.wrong.join(', ') || '-'} |`);
}
function verdict(rows) {
  const singles = rows.filter((r) => r.count === 1), pairs = rows.filter((r) => r.count === 2);
  return {
    c1: singles.every((r) => !r.all),
    c2: pairs.find((r) => r.sensors.join() === 'metal,weight').all,
    pairsAll: pairs.filter((r) => r.all).map((r) => r.label),
    pairsNot: pairs.filter((r) => !r.all).map((r) => r.label)
  };
}
// C) 물건 하나를 뺐을 때 센서 하나로 다 나뉘게 되는 경우
function dependency(mode) {
  const out = {};
  for (const s of ['metal', 'transparency', 'weight']) {
    out[s] = [];
    for (const it of ITEMS) {
      const rest = ITEMS.filter((x) => x !== it);
      const cands = mode === 'grid' ? Rules.gridCandidates(S, [s], STEPS) : null;
      if (Rules.best(rest, [s], kinds, cands).correct === rest.length) out[s].push(`${it.label}(${it.values[s]}${S[s].unit})`);
    }
  }
  return out;
}

const t0 = Date.now();
const A = table(ITEMS, 'fine'), B = table(ITEMS, 'grid');
const depA = dependency('fine'), depB = dependency('grid');
const ms = Date.now() - t0;
const vA = verdict(A), vB = verdict(B);

console.log(`물건 ${ITEMS.length}개 (${kinds.map((k) => kname(k) + ' ' + ITEMS.filter((i) => i.kind === k).length).join(' · ')}), 규칙 최대 ${Rules.MAX_LINES}줄 + 아니면, 전부 탐색 ${ms} ms`);
print('A. 촘촘한 기준값(이론상 최선)', A);
print(`B. 편집기 기준값 칸(투명도 ${STEPS.transparency} % · 무게 ${STEPS.weight} g 단위)`, B);
console.log('\n## C. 결론 1이 기대는 물건 (빼면 센서 하나로 다 나뉨)');
for (const s of ['metal', 'transparency', 'weight']) console.log(`- ${name(s)}: A ${depA[s].join(', ') || '없음'} / B ${depB[s].join(', ') || '없음'}`);
for (const [t, v] of [['A', vA], ['B', vB]]) {
  console.log(`\n[${t}] 결론 1 (센서 하나로는 다 못 나눔): ${v.c1 ? '확인됨' : '안 나옴'}`);
  console.log(`[${t}] 결론 2 (금속 감지 + 무게면 다 나눔): ${v.c2 ? '확인됨' : '안 나옴'}`);
  console.log(`[${t}] 다 나누는 센서 둘 = ${v.pairsAll.join(', ') || '없음'} / 못 나누는 센서 둘 = ${v.pairsNot.join(', ') || '없음'}`);
}

fs.writeFileSync(path.join(__dirname, 'model_check.json'), JSON.stringify({ items: ITEMS.length, steps: STEPS, ms, A, B, depA, depB, vA, vB }, null, 2));
process.exit(vA.c1 && vA.c2 && vB.c1 && vB.c2 ? 0 : 1);
