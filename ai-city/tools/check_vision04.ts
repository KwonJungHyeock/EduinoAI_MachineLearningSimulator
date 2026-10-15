// author: eduino
// 비전 4차시 모델 점검: 색만 vs 색+변화 — 세 장면 모두 정밀도 ≥ 80% · 재현율 ≥ 50% 되는 설정이 있는가
import { readFileSync, writeFileSync } from 'node:fs';
import { prepare, evaluate, pass, type ColorData } from '../src/sim/colors.ts';
const D = prepare(JSON.parse(readFileSync(new URL('../public/vision/colors.json', import.meta.url), 'utf8')) as ColorData);
const okSets: Record<string, string[]> = { color: [], both: [] };
let bestColor = { f: 0, s: '' };
for (const change of [false, true]) for (let hue = 0; hue < 360; hue += 10) for (const width of [20, 40, 60, 90]) for (const sat of [0.2, 0.35, 0.5]) {
  const ev = evaluate(D, { hue, width, sat, change });
  const tag = `${hue}°±${width / 2} 채도≥${sat}`;
  if (ev.every(pass)) okSets[change ? 'both' : 'color'].push(tag);
  if (!change) { const f = Math.min(...ev.map((e) => e.precision)); if (f > bestColor.f) bestColor = { f, s: tag + ' ' + ev.map((e) => `${e.name} P${Math.round(e.precision * 100)} R${Math.round(e.recall * 100)}`).join(' / ') }; }
}
const cam01 = evaluate(D, { hue: 20, width: 40, sat: 0.35, change: false })[0];
console.log('색만 성공 설정', okSets.color.length, '· 색+변화 성공 설정', okSets.both.length, okSets.both.slice(0, 6).join(', '));
console.log('색만 최선(가장 낮은 정밀도 기준):', bestColor.s);
console.log(`교차로 · 주황(20°±20) 색만: 정밀도 ${Math.round(cam01.precision * 100)}% 재현율 ${Math.round(cam01.recall * 100)}%`);
const c1 = okSets.color.length === 0, c2 = okSets.both.length > 0, c3 = cam01.precision < 0.5;
console.log('결론 1 (색만으로는 세 장면 목표 불가):', c1 ? '확인됨' : '안 나옴');
console.log('결론 2 (색 + 변화면 가능):', c2 ? '확인됨' : '안 나옴');
console.log('결론 3 (교차로: 색만 쓰면 다른 주황 차까지 골라 정밀도 낮음):', c3 ? '확인됨' : '안 나옴');
writeFileSync(new URL('./vision04_check.json', import.meta.url), JSON.stringify({ okSets, bestColor }));
process.exit(c1 && c2 && c3 ? 0 : 1);
