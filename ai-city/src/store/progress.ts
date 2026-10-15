// author: eduino
// 저장 어댑터 (한 곳). 지금은 브라우저 저장소, 서버 연결 자리만 남김. 하드삭제 없음 — 소프트삭제만.
export interface LessonRecord {
  status: 'open' | 'done';
  predict?: number;              // 예측 단계에서 고른 보기 (채점 안 함)
  report?: Record<string, unknown>;
  exp?: { cameras: number; events: number; missed: number; missRate: number }[]; // 실험 근무 결과 (리포트 그래프용)
  assess?: AssessRecord;
  chart?: { title: string; x: string[]; y: number[] };            // 리포트 그래프(0~1)
  updatedAt?: number;
  _deleted?: boolean;
}
export interface AssessRecord {
  answers: (boolean | string | null)[];
  ox: [number, number]; short: [number, number]; essay: { label: string; hit: boolean }[];
  at: number;
}
export interface Progress { v: 1; lessons: Record<string, LessonRecord>; student?: string }

const KEY = 'ai_city_progress_v1';
let mem: Progress | null = null; // 저장소를 못 쓰는 환경 대비

function fresh(): Progress { return { v: 1, lessons: { 'vision-1': { status: 'open' } } }; }

export function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Progress;
  } catch { /* 메모리 폴백 */ }
  return mem ?? fresh();
}
export function save(p: Progress) {
  mem = p;
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* 메모리 폴백 유지 */ }
  // [서버 연결 자리] 여기서 서버로 보냄(비동기). 실패해도 로컬은 유지. 집계는 서버에서.
}
export function lesson(p: Progress, id: string): LessonRecord | null {
  const r = p.lessons[id];
  return r && !r._deleted ? r : null;
}
export function update(id: string, patch: Partial<LessonRecord>) {
  const p = load();
  p.lessons[id] = { ...(p.lessons[id] ?? { status: 'open' }), ...patch, updatedAt: Date.now() };
  save(p);
  return p;
}
export function softDelete(id: string) {
  const p = load();
  if (p.lessons[id]) { p.lessons[id]._deleted = true; save(p); }
}
export function setStudent(name: string) { const p = load(); p.student = name; save(p); }
