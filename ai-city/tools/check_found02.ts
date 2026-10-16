// author: eduino
// Foundation 2차시 점검: 보통 물건으로 정한 규칙(가운데 기준선)이 예외 물건 묶음에서 얼마나 떨어지는지, 학습한 기준선은 어떤지
import { writeFileSync } from 'node:fs';
import { stream, acc, learn, run, rule } from '../src/sim/recycle.ts';
const normal = stream(30, 'mixed', 2), exTrain = stream(40, 'mixed', 21, 0.45), exTest = stream(30, 'mixed', 22, 0.45);
const out: Record<string, number> = {};
for (const [m, l] of [[0.5, 0.7], [0.47, 0.68], [0.3, 0.6], [0.6, 0.75]]) {
  out[`rule ${m}/${l} normal`] = acc(normal, m, l); out[`rule ${m}/${l} test`] = acc(exTest, m, l);
  console.log(`규칙 금속>${m} · 빛>${l} → 보통 ${(acc(normal, m, l) * 100).toFixed(0)}% · 예외 섞인 시험 ${(acc(exTest, m, l) * 100).toFixed(0)}% · 틀린 캔/페트/유리 ${run(exTest, rule(m, l)).wrong.join('/')}`);
}
const L = learn(exTrain); out.learnM = L.m; out.learnL = L.l; out.learnTrain = L.acc; out.learnTest = acc(exTest, L.m, L.l);
console.log(`학습(예시 40개) → 금속>${L.m} · 빛>${L.l} · 예시 ${(L.acc * 100).toFixed(0)}% · 시험 ${(out.learnTest * 100).toFixed(0)}% · 보통 ${(acc(normal, L.m, L.l) * 100).toFixed(0)}% (프레임 ${L.frames.length})`);
console.log('예외 개수(시험):', exTest.filter((x) => x.variant !== 'normal').length, exTest.filter((x) => x.variant !== 'normal').map((x) => `${x.variant}:${x.metal}/${x.light}`).join(' '));
writeFileSync(new URL('./found02_check.json', import.meta.url), JSON.stringify(out));
