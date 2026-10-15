// author: eduino
// 비전 7차시 점검: 6차시 탐지 모델(기준 · NMS) + 무단횡단 규칙(기준점 · 차도 구역 · 횡단보도 제외) → 시험 장면 40장 경보 맞음 · 헛경보 · 놓친 위험
import { readFileSync, writeFileSync } from 'node:fs';
import { unpack } from '../src/sim/nn.ts';
import { scan, pick, NMS_ON, type Obj } from '../src/sim/detect.ts';
import { judge, type Rule } from '../src/sim/alarm.ts';
import { readGray } from './png.ts';
const SC = JSON.parse(readFileSync(new URL('../public/vision/ds/scenes.json', import.meta.url), 'utf8'));
const m = unpack(JSON.parse(readFileSync(new URL('../public/vision/ds/det_model.json', import.meta.url), 'utf8')).model);
const ids = Array.from({ length: 40 }, (_, i) => 160 + i);
const scans = ids.map((i) => scan(m, readGray(new URL(`../public/vision/ds/g/day-${i}.png`, import.meta.url))));
const per: Record<number, { dets: ReturnType<typeof pick>; objs: Obj[] }[]> = {};
for (const th of [0.3, 0.5, 0.7]) per[th] = ids.map((i, k) => ({ dets: pick(scans[k], th, NMS_ON), objs: SC.day[i].objs as Obj[] }));
const out: Record<string, unknown> = {};
for (const th of [0.3, 0.5, 0.7]) for (const point of ['center', 'feet'] as const) for (const cross of [false, true]) for (const top of [0.36, 0.44, 0.48]) for (const bottom of [0.7, 0.82]) {
  const r: Rule = { point, top, bottom, cross }, j = judge(per[th], r); out[JSON.stringify({ ...r, th })] = { tp: j.tp, fp: j.fp, fn: j.fn };
  console.log(`기준 ${th} ${point.padEnd(6)} 횡단보도제외 ${cross ? 'O' : 'X'} 구역 ${top}~${bottom} → 위험 ${j.danger} · 맞음 ${j.tp} · 헛경보 ${j.fp} · 놓침 ${j.fn}`);
}
writeFileSync(new URL('./vision07_check.json', import.meta.url), JSON.stringify(out));
