// author: eduino
// 비전 5 · 8차시 모델 점검: kNN vs CNN (학습 조각 수 · 에폭), 낮 → 밤 성능 하락과 밤 데이터 추가 재학습
import { readFileSync, writeFileSync } from 'node:fs';
import { prepare, take, join, knnPredict, makeCNN, cnnPredict, trainEpoch, accuracy, LR, type Crops } from '../src/sim/nn.ts';
const C = prepare(JSON.parse(readFileSync(new URL('../public/vision/ds/crops.json', import.meta.url), 'utf8')) as Crops);
const test = take(C, 'day-test'), night = take(C, 'night-test');
const out: Record<string, unknown> = {}; const t0 = Date.now();
for (const n of [30, 100, 300, 1000]) {
  const tr = take(C, 'day-train', n, 7);
  const kn = accuracy((x) => knnPredict(tr, x, 3), test).acc;
  const m = makeCNN(20, 8, 1); const losses: number[] = []; const accs: number[] = [];
  for (let e = 0; e < 12; e++) { losses.push(trainEpoch(m, tr, LR, 16, e + 1)); accs.push(accuracy((x) => cnnPredict(m, x), test).acc); }
  out[n] = { knn: kn, cnn: accs, loss: losses };
  console.log(`학습 ${n}개 · kNN ${(kn * 100).toFixed(0)}% · CNN 에폭별 ${accs.map((a) => (a * 100).toFixed(0)).join(' ')}% · 손실 ${losses.map((l) => l.toFixed(2)).join(' ')}`);
}
// 8차시: 낮만 학습 → 밤 시험 / 낮+밤 학습 → 밤 시험
const day = take(C, 'day-train', 1000, 7), mD = makeCNN(20, 8, 1); for (let e = 0; e < 8; e++) trainEpoch(mD, day, LR, 16, e + 1);
const dd = accuracy((x) => cnnPredict(mD, x), test).acc, dn = accuracy((x) => cnnPredict(mD, x), night).acc;
const mix = join(day, take(C, 'night-train')), mM = makeCNN(20, 8, 1); for (let e = 0; e < 8; e++) trainEpoch(mM, mix, LR, 16, e + 1);
const md = accuracy((x) => cnnPredict(mM, x), test).acc, mn = accuracy((x) => cnnPredict(mM, x), night).acc;
console.log(`낮만 학습: 낮 ${(dd * 100).toFixed(0)}% · 밤 ${(dn * 100).toFixed(0)}% / 낮+밤 학습: 낮 ${(md * 100).toFixed(0)}% · 밤 ${(mn * 100).toFixed(0)}%  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
writeFileSync(new URL('./vision05_check.json', import.meta.url), JSON.stringify({ out, dd, dn, md, mn }));
