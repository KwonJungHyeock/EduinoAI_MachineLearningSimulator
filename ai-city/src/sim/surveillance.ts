// author: eduino
// 비전 지구 1차시 계산 모델: 사람 요원이 여러 카메라를 볼 때 놓치는 사건 vs AI 보조(화면 변화 감지).
// 화면과 node 점검(tools/check_vision01.ts)이 이 파일 하나를 같이 쓴다. 화면 수치는 모두 여기서 계산한 값.

export interface Params {
  cameras: number;     // 카메라 수
  operators: number;   // 관제 요원 수
  aiAssist: boolean;   // AI 보조(화면 변화 감지) 켜기
  threshold: number;   // 변화 감지 기준값 (0~100)
  seed?: number;
}

// 모두 임시 가정 — 화면 맨 아래 '임시'로 표시하고 근거를 적는다.
export const ASSUME = {
  minutes: 60,             // 한 번 돌리는 근무 시간(분)
  eventsPerCamPerHour: 2,  // 카메라 1대에서 1시간에 일어나는 사건 수(평균)
  eventSec: 10,            // 사건이 화면에 보이는 시간(초)
  watchAtOnce: 4,          // 요원 1명이 동시에 주의 깊게 볼 수 있는 화면 수
  dwellSec: 5,             // 화면 묶음을 바꿔 보는 간격(초)
  noiseSigma: 10,          // 평소 화면 변화량(바람 · 조명 흔들림) 크기
  eventChange: 45,         // 사건이 일어날 때 화면 변화량(평균)
  reviewSec: 3,            // 알림 1건을 확인하는 데 걸리는 시간(초)
  alertExpireSec: 15,      // 확인 못 한 알림이 사라지는 시간(초)
  alertCooldownSec: 10     // 같은 카메라에서 다음 알림까지 최소 간격(초)
} as const;

export const BASIS = '임시 가정 — 근무 60분, 카메라당 시간당 사건 2건, 사건 10초, 요원 1명이 동시에 보는 화면 4개 · 5초마다 넘김, 알림 확인 3초 · 15초 뒤 사라짐. 실제 관제 자료로 확인 필요';

export type Cause = 'notWatched' | 'aiMissed' | 'overload';
export interface EventDetail { found: boolean; at: number; cause: Cause | null } // at: 찾은 시각(초), 못 찾았으면 -1
export interface Alert { t: number; cam: number; ev: number; outcome: 'found' | 'repeat' | 'false' | 'expired'; at: number } // ev: 사건 번호, 없으면 -1
export interface Trace { change: Float32Array; alerts: Alert[] } // change[t * cameras + cam] = 그 초의 화면 변화량

export interface Result {
  list: Event[];          // 사건 목록 (detail 과 같은 순서)
  detail: EventDetail[];
  trace?: Trace;          // AI 보조일 때만, trace 를 요청하면
  events: number;
  detected: number;
  missed: number;
  missRate: number;       // 0~1
  alerts: number;         // AI 알림 수
  falseAlerts: number;    // 사건이 없는데 울린 알림
  expiredAlerts: number;  // 확인 못 하고 사라진 알림
  load: number;           // 요원 확인 부담(알림 확인 시간 / 근무 시간), 1 넘으면 감당 못 함
  cause: { notWatched: number; aiMissed: number; overload: number }; // 놓친 이유별 건수
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface Event { cam: number; start: number; end: number }

// 사건 목록 — 같은 seed 면 카메라 수가 같을 때 항상 같은 사건 (비교를 공정하게)
export function makeEvents(cameras: number, seed = 7): Event[] {
  const r = rng(seed * 1000 + cameras);
  const T = ASSUME.minutes * 60, p = ASSUME.eventsPerCamPerHour / 3600, ev: Event[] = [];
  for (let c = 0; c < cameras; c++) {
    let t = 0;
    while (t < T - ASSUME.eventSec) {
      if (r() < p) { ev.push({ cam: c, start: t, end: t + ASSUME.eventSec }); t += ASSUME.eventSec + 20; }
      else t++;
    }
  }
  return ev;
}

// 사람 요원이 지금 보고 있는 화면인가 (카메라를 요원끼리 나눠 맡고, 4개씩 묶어 5초마다 넘김)
export function watching(cam: number, t: number, cameras: number, operators: number) {
  const op = cam % operators;
  const mine: number[] = [];
  for (let c = op; c < cameras; c += operators) mine.push(c);
  const groups = Math.ceil(mine.length / ASSUME.watchAtOnce);
  const g = Math.floor(t / ASSUME.dwellSec) % groups;
  const idx = mine.indexOf(cam);
  return Math.floor(idx / ASSUME.watchAtOnce) === g;
}

export function simulate(p: Params, opt: { trace?: boolean } = {}): Result {
  const seed = p.seed ?? 7;
  const T = ASSUME.minutes * 60;
  const events = makeEvents(p.cameras, seed);
  const detail: EventDetail[] = events.map(() => ({ found: false, at: -1, cause: null }));
  const res: Result = { list: events, detail, events: events.length, detected: 0, missed: 0, missRate: 0, alerts: 0, falseAlerts: 0, expiredAlerts: 0, load: 0, cause: { notWatched: 0, aiMissed: 0, overload: 0 } };

  if (!p.aiAssist) {
    // 사람만: 사건이 보이는 10초 동안 한 번이라도 그 화면을 보고 있었으면 찾음
    events.forEach((e, i) => {
      let at = -1;
      for (let t = e.start; t < e.end && at < 0; t++) if (watching(e.cam, t, p.cameras, p.operators)) at = t;
      if (at >= 0) { res.detected++; detail[i] = { found: true, at, cause: null }; }
      else { res.cause.notWatched++; detail[i] = { found: false, at: -1, cause: 'notWatched' }; }
    });
  } else {
    // AI 보조: 매초 카메라마다 화면 변화량을 재서 기준값을 넘으면 알림 → 요원이 하나씩 확인
    const r = rng(seed * 7919 + p.cameras * 31 + Math.round(p.threshold));
    const byCam: number[][] = Array.from({ length: p.cameras }, () => []);
    events.forEach((e, i) => byCam[e.cam].push(i));
    const alerted = new Set<number>();
    const cool = new Array(p.cameras).fill(-1e9);
    const queue: Alert[] = [];
    const alerts: Alert[] = [];
    const change = opt.trace ? new Float32Array(T * p.cameras) : null;
    const freeAt = new Array(p.operators).fill(0);
    for (let t = 0; t < T; t++) {
      for (let c = 0; c < p.cameras; c++) {
        const ev = byCam[c].find((i) => t >= events[i].start && t < events[i].end) ?? -1;
        const ch = ev >= 0 ? ASSUME.eventChange + gauss(r) * ASSUME.noiseSigma : Math.abs(gauss(r)) * ASSUME.noiseSigma;
        if (change) change[t * p.cameras + c] = ch;
        if (ch > p.threshold && t - cool[c] >= ASSUME.alertCooldownSec) {
          cool[c] = t; res.alerts++;
          if (ev < 0) res.falseAlerts++; else alerted.add(ev);
          const a: Alert = { t, cam: c, ev, outcome: 'expired', at: -1 };
          queue.push(a); alerts.push(a);
        }
      }
      for (let o = 0; o < p.operators; o++) {
        while (freeAt[o] <= t && queue.length) {
          const a = queue.shift()!;
          if (t - a.t > ASSUME.alertExpireSec) { res.expiredAlerts++; a.at = t; continue; }
          freeAt[o] = t + ASSUME.reviewSec;
          a.at = t;
          if (a.ev < 0) a.outcome = 'false';
          else if (detail[a.ev].found) a.outcome = 'repeat';
          else { a.outcome = 'found'; detail[a.ev] = { found: true, at: t, cause: null }; }
        }
      }
    }
    res.expiredAlerts += queue.length;
    events.forEach((_, i) => {
      if (detail[i].found) res.detected++;
      else if (!alerted.has(i)) { res.cause.aiMissed++; detail[i].cause = 'aiMissed'; }
      else { res.cause.overload++; detail[i].cause = 'overload'; }
    });
    if (change) res.trace = { change, alerts };
    res.load = (res.alerts * ASSUME.reviewSec) / (p.operators * T);
  }
  res.missed = res.events - res.detected;
  res.missRate = res.events ? res.missed / res.events : 0;
  return res;
}
