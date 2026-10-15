// author: eduino
// 비전 3차시 모델 점검: 필터별 12장면 물체 대비(중앙값). 결론: 윤곽 필터 ≥ 목표, 그대로 · 흐리게 < 목표, 가로만 < 세로
import { readFileSync, writeFileSync } from 'node:fs';
import { PRESETS, score, prepare, GOAL_RATIO, type Hires } from '../src/sim/filters.ts';
const H = prepare(JSON.parse(readFileSync(new URL('../public/vision/hires.json', import.meta.url), 'utf8')) as Hires);
const r: Record<string, number> = {};
for (const [id, p] of Object.entries(PRESETS)) { const s = score(H, p.k); r[id] = s.median; console.log(p.name.padEnd(8), s.median.toFixed(2), s.per.map((v) => v.toFixed(1)).join(' ')); }
// 학생이 만들 수 있는 필터(-2~2 정수) 중 무작위 2000개로 성공 비율 확인
let okN = 0; const N = 400; let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
for (let i = 0; i < N; i++) { const k = Array.from({ length: 9 }, () => Math.floor(rnd() * 5) - 2); if (score(H, k).median >= GOAL_RATIO) okN++; }
const c1 = r.vert >= GOAL_RATIO && r.identity < GOAL_RATIO && r.blur < GOAL_RATIO, c2 = r.horz < r.vert;
console.log(`\n목표 ${GOAL_RATIO} · 무작위 필터 성공 ${okN}/${N}`);
console.log('결론 1 (윤곽 필터는 물체를 돋보이게, 그대로 · 흐리게는 아님):', c1 ? '확인됨' : '안 나옴');
console.log('결론 2 (가로 윤곽보다 세로 윤곽이 사람 · 기둥을 더 잘 잡음):', c2 ? '확인됨' : '안 나옴');
writeFileSync(new URL('./vision03_check.json', import.meta.url), JSON.stringify({ r, okN, N }));
process.exit(c1 && c2 && okN > 0 ? 0 : 1);
