// author: eduino
// 비전 2차시 계산 모델 — 이미지는 숫자(밝기 0~255)의 격자. 해상도를 낮추면 칸을 평균, 두 장면의 숫자 차이로 사건을 찾는다.
// 카메라 잡음(센서 노이즈)을 더해 '해상도 ↔ 잡음 ↔ 작은 물체' 맞바꿈이 생기게 함. 화면 · node 점검이 같은 파일을 씀.

export interface Grids { gw: number; gh: number; scenes: { id: string; name: string; base: number[]; event: number[] }[] }
export const RES = [8, 16, 32, 64] as const;          // 가로 칸 수 (세로 = 가로 × 0.625)
export const NOISE = 4;                               // 임시: 카메라 잡음 크기(64×40 칸 기준 표준편차)
export const BASIS2 = `임시 가정 — 카메라 잡음 표준편차 ${NOISE}(64×40 기준), 앞 장면 · 지금 장면 잡음은 서로 다름. 장면은 렌더 이미지의 밝기 평균`;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function gauss(r: () => number) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// 64×40 원본에 잡음을 더한 '한 프레임'
export function frame(src: number[], seed: number, noise = NOISE) {
  const r = rng(seed);
  return src.map((v) => Math.max(0, Math.min(255, v + gauss(r) * noise)));
}
// 해상도 낮추기: 블록 평균 (cols 는 64의 약수)
export function down(g: number[], gw: number, gh: number, cols: number) {
  const k = gw / cols, rows = Math.round(gh / k), out = new Array(cols * rows).fill(0);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) out[Math.floor(y / k) * cols + Math.floor(x / k)] += g[y * gw + x];
  return { cols, rows, v: out.map((s) => s / (k * k)) };
}
export const diff = (a: number[], b: number[]) => a.map((v, i) => Math.abs(v - b[i]));

export interface SceneResult { id: string; name: string; maxEvent: number; maxQuiet: number; found: boolean; falseAlarm: boolean; cell: number }
export interface DetectResult { cols: number; rows: number; numbers: number; threshold: number; found: number; falseAlarms: number; scenes: SceneResult[] }

// 장면마다 앞 프레임(평소+잡음) vs 지금 프레임(사건+잡음 / 평소+잡음) 비교
export function detect(G: Grids, cols: number, threshold: number, seed = 1): DetectResult {
  const scenes = G.scenes.map((s, i) => {
    const before = down(frame(s.base, seed * 100 + i * 3 + 1), G.gw, G.gh, cols).v;
    const now = down(frame(s.event, seed * 100 + i * 3 + 2), G.gw, G.gh, cols).v;
    const quiet = down(frame(s.base, seed * 100 + i * 3 + 3), G.gw, G.gh, cols).v;
    const de = diff(now, before), dq = diff(quiet, before);
    const maxEvent = Math.max(...de), maxQuiet = Math.max(...dq);
    return { id: s.id, name: s.name, maxEvent, maxQuiet, found: maxEvent > threshold, falseAlarm: maxQuiet > threshold, cell: de.indexOf(maxEvent) };
  });
  const rows = Math.round(G.gh / (G.gw / cols));
  return { cols, rows, numbers: cols * rows, threshold, found: scenes.filter((s) => s.found).length, falseAlarms: scenes.filter((s) => s.falseAlarm).length, scenes };
}
