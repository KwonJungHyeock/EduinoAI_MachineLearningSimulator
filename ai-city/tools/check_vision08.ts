// author: eduino
// 비전 8차시 점검: 낮 장면으로만 만든 6차시 탐지 모델을 밤 장면에 쓰면? → 밤 조각을 더해 다시 학습 → 낮 · 밤 헛탐지를 모아 다시 학습
// 각 단계 모델의 낮 시험 40장 · 밤 시험 30장 정밀도 · 재현율 (기준 0.3 · 0.5 · 0.7, NMS 켬)
import { readFileSync, writeFileSync } from 'node:fs';
import { prepare, take, join, makeCNN, trainEpoch, accuracy, cnnPredict, unpack, LR, type Crops, type DataSet, type CNN } from '../src/sim/nn.ts';
import { scan, pick, grade, score, mineHard, hardSet, NMS_ON, DET, NIGHT } from '../src/sim/detect.ts';
import { readGray } from './png.ts';
const R = new URL('../public/vision/ds/', import.meta.url);
const C = prepare(JSON.parse(readFileSync(new URL('crops.json', R), 'utf8')) as Crops), SC = JSON.parse(readFileSync(new URL('scenes.json', R), 'utf8'));
const g = (tod: string, i: number) => readGray(new URL(`g/${tod}-${String(i).padStart(3, '0')}.png`, R));
const dIds = Array.from({ length: DET.testN }, (_, i) => DET.testFrom + i), nIds = Array.from({ length: NIGHT.testN }, (_, i) => NIGHT.testFrom + i);
const DG = dIds.map((i) => g('day', i)), NG = nIds.map((i) => g('night', i));
const train = (d: DataSet, E: number) => { const m = makeCNN(20, 8, 1); for (let e = 0; e < E; e++) trainEpoch(m, d, LR, 16, e + 1); return m; };
const out: Record<string, unknown> = {}, t0 = Date.now();
const table = (m: CNN, label: string) => {
  const sd = DG.map((x) => scan(m, x)), sn = NG.map((x) => scan(m, x));
  const ca = { day: accuracy((x) => cnnPredict(m, x), take(C, 'day-test')).acc, night: accuracy((x) => cnnPredict(m, x), take(C, 'night-test')).acc };
  console.log(`${label} · 조각 정확도 낮 ${(ca.day * 100).toFixed(0)}% · 밤 ${(ca.night * 100).toFixed(0)}%`);
  for (const th of [0.3, 0.5, 0.7]) {
    const d = score(dIds.map((i, k) => grade(pick(sd[k], th, NMS_ON), SC.day[i].objs, 256, 160))), n = score(nIds.map((i, k) => grade(pick(sn[k], th, NMS_ON), SC.night[i].objs, 256, 160)));
    out[`${label}|${th}`] = { day: d, night: n, crop: ca };
    console.log(`  기준 ${th}: 낮 정밀 ${(d.precision * 100).toFixed(0)}% 재현 ${(d.recall * 100).toFixed(0)}% · 밤 정밀 ${(n.precision * 100).toFixed(0)}% 재현 ${(n.recall * 100).toFixed(0)}% (밤 물체 ${n.tp + n.fn})`);
  }
};
const mDay = unpack(JSON.parse(readFileSync(new URL('det_model.json', R), 'utf8')).model); table(mDay, '낮만');
// 6차시 재료 다시 만들기(같은 코드 · 같은 순서): 낮 조각 전체 + 낮 헛탐지
const full = take(C, 'day-train'), m0 = train(full, DET.baseEpochs), dh: Float32Array[] = [];
for (let i = 0; i < DET.trainScenes; i++) dh.push(...mineHard(m0, g('day', i), SC.day[i].objs));
const base = join(join(full, hardSet(dh)), take(C, 'night-train'));
const mN = train(base, DET.hardEpochs); table(mN, '+밤 조각');
const nh: Float32Array[] = [], dh2: Float32Array[] = [];
for (let i = 0; i < NIGHT.trainScenes; i++) nh.push(...mineHard(mN, g('night', i), SC.night[i].objs));
for (let i = 0; i < DET.trainScenes; i++) dh2.push(...mineHard(mN, g('day', i), SC.day[i].objs));
console.log(`밤 헛탐지 ${nh.length}개 · 낮 헛탐지 ${dh2.length}개 더 모음`);
const mF = train(join(join(base, hardSet(nh)), hardSet(dh2)), DET.hardEpochs); table(mF, '+밤 헛탐지');
console.log(`(${((Date.now() - t0) / 1000).toFixed(1)}s)`);
writeFileSync(new URL('./vision08_check.json', import.meta.url), JSON.stringify({ nh: nh.length, dh2: dh2.length, out }));
