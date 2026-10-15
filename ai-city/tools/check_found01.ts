// author: eduino
// Foundation 1차시 점검: 정해진 대로 움직이는 기계 vs 감지 로봇 — 물건 순서(정해진 순서 · 섞임) × 센서 조합별 정확도
import { writeFileSync } from 'node:fs';
import { stream, fixedMachine, robot, run, type Sense } from '../src/sim/recycle.ts';
const out: Record<string, number> = {};
for (const order of ['cycle', 'mixed'] as const) for (const seed of [1, 2, 3]) {
  const it = stream(30, order, seed);
  const f = run(it, fixedMachine), r = run(it, robot({ metal: true, light: true, mTh: 0.5, lTh: 0.7 }));
  out[`${order}-${seed}-fixed`] = f.acc; out[`${order}-${seed}-robot`] = r.acc;
  console.log(`${order === 'cycle' ? '정해진 순서' : '섞여서'} 씨앗 ${seed}: 기계 ${f.ok}/30 (${(f.acc * 100).toFixed(0)}%) · 로봇 ${r.ok}/30 (${(r.acc * 100).toFixed(0)}%)`);
}
// 적용: 섞인 30개(씨앗 11)에서 센서 조합
const it = stream(30, 'mixed', 11);
for (const s of [{ metal: false, light: false }, { metal: true, light: false }, { metal: false, light: true }, { metal: true, light: true }] as Partial<Sense>[]) {
  const r = run(it, robot({ mTh: 0.5, lTh: 0.7, ...s } as Sense));
  out[`apply-${s.metal ? 'M' : ''}${s.light ? 'L' : ''}`] = r.acc;
  console.log(`적용 · 금속 ${s.metal ? '켬' : '끔'} · 빛 ${s.light ? '켬' : '끔'} → ${r.ok}/30 (${(r.acc * 100).toFixed(0)}%) · 틀린 캔/페트/유리 ${r.wrong.join('/')}`);
}
const f = run(it, fixedMachine); console.log(`적용 장면 기계: ${f.ok}/30 (${(f.acc * 100).toFixed(0)}%)`);
writeFileSync(new URL('./found01_check.json', import.meta.url), JSON.stringify(out));
