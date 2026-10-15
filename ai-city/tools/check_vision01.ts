// author: eduino
// 비전 지구 1차시 계산 모델 점검(레드팀): 배우게 할 결론이 계산에서 실제로 나오는지, 씨앗 5개로 확인.
// 실행: node --experimental-strip-types tools/check_vision01.ts   (결과 표 출력 + tools/vision01_check.json, 결론이 안 나오면 exit 1)
import { writeFileSync } from 'node:fs';
import { simulate, ASSUME } from '../src/sim/surveillance.ts';

const SEEDS = [1, 2, 3, 4, 5];
const pct = (x: number) => `${Math.round(x * 100)}%`;
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
function many(p: { cameras: number; operators: number; aiAssist: boolean; threshold: number }) {
  const rs = SEEDS.map((seed) => simulate({ ...p, seed }));
  return {
    miss: avg(rs.map((r) => r.missRate)), missMin: Math.min(...rs.map((r) => r.missRate)), missMax: Math.max(...rs.map((r) => r.missRate)),
    events: avg(rs.map((r) => r.events)), falseAlerts: avg(rs.map((r) => r.falseAlerts)), load: avg(rs.map((r) => r.load)),
    notWatched: avg(rs.map((r) => r.cause.notWatched)), aiMissed: avg(rs.map((r) => r.cause.aiMissed)), overload: avg(rs.map((r) => r.cause.overload))
  };
}
const GOAL = { cameras: 64, maxOperators: 2, maxMiss: 0.1 };
const t0 = Date.now();

// A) 사람 1명, 카메라를 늘리면
const A = [4, 8, 16, 32, 64].map((c) => ({ cameras: c, ...many({ cameras: c, operators: 1, aiAssist: false, threshold: 0 }) }));
// B) 카메라 64대, 사람을 늘리면
const B = [1, 2, 4, 8, 16].map((h) => ({ operators: h, ...many({ cameras: 64, operators: h, aiAssist: false, threshold: 0 }) }));
// C) 카메라 64대 + AI 보조, 기준값을 바꾸면 (요원 1 · 2명)
const TH = Array.from({ length: 17 }, (_, i) => 10 + i * 5);
const C = [1, 2].map((h) => ({ operators: h, rows: TH.map((th) => ({ threshold: th, ...many({ cameras: 64, operators: h, aiAssist: true, threshold: th }) })) }));
const ms = Date.now() - t0;

console.log(`가정(임시): 근무 ${ASSUME.minutes}분 · 카메라당 시간당 사건 ${ASSUME.eventsPerCamPerHour}건 · 사건 ${ASSUME.eventSec}초 · 요원 1명 동시 ${ASSUME.watchAtOnce}화면 · ${ASSUME.dwellSec}초마다 넘김 · 알림 확인 ${ASSUME.reviewSec}초 · ${ASSUME.alertExpireSec}초 뒤 사라짐`);
console.log(`씨앗 ${SEEDS.length}개 평균 (괄호는 최소~최대), 계산 ${ms} ms\n`);
console.log('## A. 요원 1명 · AI 없음 — 카메라 수를 늘리면');
console.log('| 카메라 | 사건(평균) | 놓친 비율 |'); console.log('|---|---|---|');
for (const r of A) console.log(`| ${r.cameras} | ${r.events.toFixed(1)} | ${pct(r.miss)} (${pct(r.missMin)}~${pct(r.missMax)}) |`);
console.log('\n## B. 카메라 64대 · AI 없음 — 요원 수를 늘리면');
console.log('| 요원 | 놓친 비율 |'); console.log('|---|---|');
for (const r of B) console.log(`| ${r.operators} | ${pct(r.miss)} (${pct(r.missMin)}~${pct(r.missMax)}) |`);
for (const g of C) {
  console.log(`\n## C. 카메라 64대 · AI 보조 · 요원 ${g.operators}명 — 기준값을 바꾸면`);
  console.log('| 기준값 | 놓친 비율 | 헛알림/시간 | 확인 부담 | 놓친 이유(AI 못 잡음 / 알림 폭주) |'); console.log('|---|---|---|---|---|');
  for (const r of g.rows) console.log(`| ${r.threshold} | ${pct(r.miss)} (${pct(r.missMin)}~${pct(r.missMax)}) | ${Math.round(r.falseAlerts)} | ${pct(r.load)} | ${r.aiMissed.toFixed(1)} / ${r.overload.toFixed(1)} |`);
}

// 결론 확인 (모든 씨앗에서 성립해야 통과)
const mono = A.every((r, i) => i === 0 || r.miss >= A[i - 1].miss);
const c32 = A.find((r) => r.cameras === 32)!;
const noAiFail = B.filter((r) => r.operators <= GOAL.maxOperators).every((r) => r.missMin > GOAL.maxMiss);
const needH = B.find((r) => r.missMax <= GOAL.maxMiss)?.operators ?? null;
const ok = C.map((g) => ({ h: g.operators, range: g.rows.filter((r) => r.missMax <= GOAL.maxMiss).map((r) => r.threshold) }));
const anyAi = ok.some((o) => o.range.length > 0);
const lowFail = C.every((g) => g.rows[0].missMin > GOAL.maxMiss && g.rows[0].overload > g.rows[0].aiMissed);
const highFail = C.every((g) => { const h = g.rows[g.rows.length - 1]; return h.missMin > GOAL.maxMiss && h.aiMissed > h.overload; });

const checks = [
  ['결론 1', '카메라가 늘수록 요원 1명이 놓치는 사건이 늘어난다', mono],
  ['예측 정답', `카메라 32대면 요원 1명이 절반 넘게 놓친다 (최소 ${pct(c32.missMin)})`, c32.missMin > 0.5],
  ['결론 2', `카메라 ${GOAL.cameras}대를 요원 ${GOAL.maxOperators}명 이하가 사람 눈으로만 보면 놓침 ${pct(GOAL.maxMiss)} 이하가 불가능`, noAiFail],
  ['결론 3', `AI 보조를 켜면 요원 ${GOAL.maxOperators}명 이하로 목표 달성 가능 (기준값 범위: ${ok.map((o) => `${o.h}명 ${o.range.length ? o.range[0] + '~' + o.range[o.range.length - 1] : '없음'}`).join(' · ')})`, anyAi],
  ['적용 피드백 1', '기준값이 너무 낮으면 알림 폭주로 놓친다', lowFail],
  ['적용 피드백 2', '기준값이 너무 높으면 AI가 사건을 못 잡아 놓친다', highFail]
] as const;
console.log('\n## 결론 확인 (씨앗 5개 모두에서)');
for (const [k, d, v] of checks) console.log(`- [${v ? '확인됨' : '안 나옴'}] ${k}: ${d}`);
console.log(`- 참고: 사람 눈으로만 놓침 ${pct(GOAL.maxMiss)} 이하를 맞추려면 요원 ${needH ?? '16명 초과'}명 필요`);

writeFileSync(new URL('./vision01_check.json', import.meta.url), JSON.stringify({ assume: ASSUME, seeds: SEEDS, goal: GOAL, ms, A, B, C, ok, needH, checks: checks.map(([k, d, v]) => ({ k, d, v })) }, null, 2));
process.exit(checks.every((c) => c[2]) ? 0 : 1);
