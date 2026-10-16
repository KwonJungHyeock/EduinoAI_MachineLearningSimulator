// author: eduino
// Foundation 3 · 4차시 점검: 재료(이름표 · 유리병 비율)에 따라 학습 결과가 어떻게 바뀌는지, 외우기 로봇 vs 기준선 로봇
import { writeFileSync } from 'node:fs';
import { stream, learn, acc, run, dataset, asTrain, memorize, confusion, rule } from '../src/sim/recycle.ts';
const TEST = asTrain(dataset(30, 41, 1 / 3, 0)), out: Record<string, number> = {};   // Found03과 같은 재료 · 시험지
for (const [name, gr, sw] of [['바른 이름표 · 고른 재료', 1 / 3, undefined], ['유리병 예시 없음', 0, undefined], ['유리병 60% 페트병 이름표', 1 / 3, { from: 'glass', to: 'pet', rate: 0.6 }]] as [string, number, Parameters<typeof dataset>[4]][]) {
  const L = learn(asTrain(dataset(40, 31, gr, 0, sw))), a = acc(TEST, L.m, L.l), w = run(TEST, rule(L.m, L.l)).wrong;
  out[name] = a; console.log(`${name} → 기준 금속>${L.m} · 빛>${L.l} · 시험 ${(a * 100).toFixed(0)}% · 틀린 캔/페트/유리 ${w.join('/')}`);
}
const TEST4 = stream(30, 'mixed', 22, 0.45);
const TR = stream(40, 'mixed', 21, 0.45), L = learn(TR), mem = memorize(TR);
const mTr = run(TR, mem).acc, mTe = run(TEST4, mem).acc, lTr = acc(TR, L.m, L.l), lTe = acc(TEST4, L.m, L.l);
console.log(`외우기 로봇: 학습 재료 ${(mTr * 100).toFixed(0)}% · 처음 보는 물건 ${(mTe * 100).toFixed(0)}% / 기준선 로봇: ${(lTr * 100).toFixed(0)}% · ${(lTe * 100).toFixed(0)}%`);
console.log('혼동표(기준선, 시험):', JSON.stringify(confusion(TEST4, rule(L.m, L.l))), ' 외우기:', JSON.stringify(confusion(TEST4, mem)));
Object.assign(out, { mTr, mTe, lTr, lTe }); writeFileSync(new URL('./found03_check.json', import.meta.url), JSON.stringify(out));
