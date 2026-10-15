// author: eduino
// 비전 2차시 모델 점검: 해상도 · 기준값별로 12장면 사건 찾음 / 헛알림 수 (씨앗 5개)
// 실행: node --experimental-strip-types --no-warnings tools/check_vision02.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { detect, RES, type Grids } from '../src/sim/pixels.ts';

const G = JSON.parse(readFileSync(new URL('../public/vision/grids.json', import.meta.url), 'utf8')) as Grids;
const SEEDS = [1, 2, 3, 4, 5], TH = [10, 15, 20, 25, 30, 35, 40, 50];
const table: Record<string, { found: number[]; fa: number[] }> = {};
for (const c of RES) for (const th of TH) {
  const rs = SEEDS.map((s) => detect(G, c, th, s));
  table[`${c}|${th}`] = { found: rs.map((r) => r.found), fa: rs.map((r) => r.falseAlarms) };
}
console.log('| 해상도 \\ 기준값 | ' + TH.join(' | ') + ' |'); console.log('|---|' + TH.map(() => '---').join('|') + '|');
for (const c of RES) console.log(`| ${c}×${Math.round(c * 0.625)} | ` + TH.map((th) => { const t = table[`${c}|${th}`]; return `${Math.min(...t.found)}~${Math.max(...t.found)} / 헛${Math.max(...t.fa)}`; }).join(' | ') + ' |');
// 장면별 사건 차이 최댓값 (씨앗 1)
for (const c of RES) { const r = detect(G, c, 0, 1); console.log(c, r.scenes.map((s) => `${s.name}:${Math.round(s.maxEvent)}/${Math.round(s.maxQuiet)}`).join(' ')); }
const ok = (c: number, th: number) => table[`${c}|${th}`].found.every((f) => f === 12) && table[`${c}|${th}`].fa.every((f) => f === 0);
const good = RES.flatMap((c) => TH.filter((th) => ok(c, th)).map((th) => ({ c, th })));
const c1 = TH.some((th) => table[`64|${th}`].fa.some((f) => f > 0) && table[`64|${th}`].found.every((f) => f === 12)); // 고해상도: 잡음 헛알림
const c2 = TH.some((th) => table[`8|${th}`].found.some((f) => f < 12) && table[`8|${th}`].fa.every((f) => f === 0));  // 저해상도: 작은 사건 놓침
console.log('\n성공 조합(12/12 · 헛알림 0, 씨앗 5개 모두):', good.map((g) => `${g.c}칸·${g.th}`).join(', ') || '없음');
console.log('결론 A (해상도 높으면 같은 기준값에서 잡음 헛알림):', c1 ? '확인됨' : '안 나옴');
console.log('결론 B (해상도 낮으면 작은 사건 놓침):', c2 ? '확인됨' : '안 나옴');
writeFileSync(new URL('./vision02_check.json', import.meta.url), JSON.stringify({ table, good, c1, c2 }));
process.exit(good.length && c1 && c2 ? 0 : 1);
