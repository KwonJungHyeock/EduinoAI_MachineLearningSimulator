// author: eduino
// 비전 6차시 모델 점검: 5차시 CNN(낮 학습 조각 전체 · 에폭 8)으로 낮 시험 장면 40장 탐지 → 확신도 기준 × NMS 별 정밀도 · 재현율
// 그리고 학습 장면 40장의 헛탐지 조각을 '빈 곳'으로 더해 다시 학습한 모델의 같은 표
import { readFileSync, writeFileSync } from 'node:fs';
import { prepare, take, join, makeCNN, trainEpoch, accuracy, cnnPredict, LR, type Crops, type DataSet } from '../src/sim/nn.ts';
import { scan, pick, grade, score, mineHard, hardSet, DET, NMS_ON } from '../src/sim/detect.ts';
import { readGray } from './png.ts';
const C = prepare(JSON.parse(readFileSync(new URL('../public/vision/ds/crops.json', import.meta.url), 'utf8')) as Crops);
const SC = JSON.parse(readFileSync(new URL('../public/vision/ds/scenes.json', import.meta.url), 'utf8'));
const gray = (i: number) => readGray(new URL(`../public/vision/ds/g/day-${String(i).padStart(3, '0')}.png`, import.meta.url));
const t0 = Date.now(), full = take(C, 'day-train'), testC = take(C, 'day-test');
const train = (d: DataSet, E: number) => { const m = makeCNN(20, 8, 1); for (let e = 0; e < E; e++) trainEpoch(m, d, LR, 16, e + 1); return m; };
const ids = Array.from({ length: DET.testN }, (_, i) => DET.testFrom + i), G = ids.map(gray);
const out: Record<string, unknown> = {};
const table = (m: ReturnType<typeof train>, label: string) => {
  const sc = G.map((g) => scan(m, g));
  console.log(`${label} · 조각 정확도 ${(accuracy((x) => cnnPredict(m, x), testC).acc * 100).toFixed(0)}% · 창 ${sc[0].length}개/장면`);
  for (const nms of [0, NMS_ON]) console.log(`  NMS ${nms ? '켬' : '끔'} ` + [0.3, 0.5, 0.7, 0.9].map((th) => {
    const s = score(ids.map((i, k) => grade(pick(sc[k], th, nms), SC.day[i].objs, 256, 160))); out[`${label}|${nms}|${th}`] = s;
    return `기준 ${th}: 상자 ${s.tp + s.fp} 정밀 ${(s.precision * 100).toFixed(0)}% 재현 ${(s.recall * 100).toFixed(0)}%`;
  }).join(' · '));
};
const m0 = train(full, DET.baseEpochs); table(m0, '기본');
const all: Float32Array[] = [];
for (let i = 0; i < DET.trainScenes; i++) all.push(...mineHard(m0, gray(i), SC.day[i].objs));
const hard = hardSet(all);
console.log(`헛탐지 조각 ${all.length}개 모음 → ${hard.X.length}개 추가`);
const m1 = train(join(full, hard), DET.hardEpochs); table(m1, '헛탐지 추가');
console.log(`(${((Date.now() - t0) / 1000).toFixed(1)}s)`);
writeFileSync(new URL('./vision06_check.json', import.meta.url), JSON.stringify({ mined: all.length, hard: hard.X.length, out }));
// 7 · 8차시가 이어 쓰는 '6차시 탐지 모델'(헛탐지 추가 모델) — 같은 코드로 다시 만들 수 있는 계산 결과
const pack = (m: typeof m1) => ({ S: m.S, F: m.F, w1: Array.from(m.w1), b1: Array.from(m.b1), w2: Array.from(m.w2), b2: Array.from(m.b2) });
writeFileSync(new URL('../public/vision/ds/det_model.json', import.meta.url), JSON.stringify({ made: 'tools/check_vision06.ts', model: pack(m1) }));
