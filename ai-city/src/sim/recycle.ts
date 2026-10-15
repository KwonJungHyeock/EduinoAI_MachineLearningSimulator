// author: eduino
// Foundation Lab(머신러닝 기초) 계산 모델 — 재활용 선별 라인.
// 물건마다 센서 값 2개: 금속 반응(metal) · 빛 투과(light), 0~1. 종류별 분포 + 잡음으로 만든다(고정 씨앗 → 언제나 같은 값).
// 1차시: '정해진 대로 움직이는 기계'(순서대로 통을 바꿈) vs '감지 → 판단 → 행동 로봇'(센서 규칙)을 같은 물건 줄로 비교.
export type Kind = 'can' | 'pet' | 'glass';
export const KINDS: Kind[] = ['can', 'pet', 'glass'];
export const KO: Record<Kind, string> = { can: '캔', pet: '페트병', glass: '유리병' };
export interface Item { id: number; kind: Kind; variant: 'normal' | 'crushed' | 'colorglass' | 'labeled'; metal: number; light: number; v: number }

// 값의 근거(임시 · 교육용 단순화): 캔 = 금속 탐지 강함 · 빛 거의 안 통함, 페트 = 금속 없음 · 빛 잘 통함, 유리 = 금속 없음 · 빛 중간(두꺼운 유리 · 색)
export const BASIS = '센서 값은 교육용 단순화(임시): 금속 반응 · 빛 투과 0~1, 종류별 평균 + 정규 잡음 σ=0.06';
const MEAN: Record<Kind, [number, number]> = { can: [0.88, 0.05], pet: [0.05, 0.84], glass: [0.06, 0.52] };
const VAR: Record<Item['variant'], [number, number] | null> = { normal: null, crushed: [0.62, 0.05], colorglass: [0.06, 0.24], labeled: [0.05, 0.47] };
export const SIGMA = 0.06;

export function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const gauss = (R: () => number) => Math.sqrt(-2 * Math.log(R() + 1e-12)) * Math.cos(2 * Math.PI * R());
const clip = (x: number) => Math.max(0, Math.min(1, x));

// 물건 줄 만들기. order: 'cycle' = 캔 → 페트 → 유리 반복(기계가 가정한 순서), 'mixed' = 무작위
export function stream(n: number, order: 'cycle' | 'mixed', seed = 1, exceptions = 0): Item[] {
  const R = rng(seed), out: Item[] = [];
  for (let i = 0; i < n; i++) {
    const kind = order === 'cycle' ? KINDS[i % 3] : KINDS[Math.floor(R() * 3)];
    let variant: Item['variant'] = 'normal';
    if (exceptions > 0 && R() < exceptions) variant = kind === 'can' ? 'crushed' : kind === 'glass' ? 'colorglass' : 'labeled';
    const [m, l] = VAR[variant] ?? MEAN[kind];
    out.push({ id: i, kind, variant, metal: +clip(m + gauss(R) * SIGMA).toFixed(3), light: +clip(l + gauss(R) * SIGMA).toFixed(3), v: Math.floor(R() * 4) });
  }
  return out;
}

// 정해진 대로 움직이는 기계: 물건을 보지 않고 통을 캔 → 페트 → 유리 순서로 바꿔 가며 밀어 넣음
export const fixedMachine = (_it: Item, i: number): Kind => KINDS[i % 3];
// 감지 → 판단 → 행동 로봇: 센서를 켠 것만 읽고 기준값 규칙으로 판단
export interface Sense { metal: boolean; light: boolean; mTh: number; lTh: number }
export const SENSE_ALL: Sense = { metal: true, light: true, mTh: 0.5, lTh: 0.7 };
export function robot(s: Sense) {
  return (it: Item): Kind => {
    if (s.metal && it.metal > s.mTh) return 'can';
    if (s.light) return it.light > s.lTh ? 'pet' : 'glass';
    if (s.metal) return 'pet';            // 빛 센서가 없으면 금속이 아닌 것은 모두 '페트'로
    return 'can';                         // 센서가 하나도 없으면 첫 통으로
  };
}
export function run(items: Item[], decide: (it: Item, i: number) => Kind) {
  const res = items.map((it, i) => { const got = decide(it, i); return { it, got, ok: got === it.kind }; });
  const ok = res.filter((r) => r.ok).length;
  return { res, ok, acc: ok / Math.max(1, items.length), wrong: KINDS.map((k) => res.filter((r) => r.it.kind === k && !r.ok).length) };
}
