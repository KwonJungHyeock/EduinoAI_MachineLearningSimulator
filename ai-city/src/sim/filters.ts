// author: eduino
// 비전 3차시 계산 모델 — 3×3 필터(합성곱)로 윤곽 세기 지도를 만든다. 화면 · node 점검이 같은 파일을 씀.
// 과제: 횡단보도 장면에서 '흰 줄무늬(세로 윤곽)'만 강하게, 건물 · 기타는 약하게 반응하는 필터 고르기.

export type Kernel = number[]; // 9칸, 행 우선
export const PRESETS: Record<string, { name: string; k: Kernel }> = {
  identity: { name: '그대로', k: [0, 0, 0, 0, 1, 0, 0, 0, 0] },
  blur: { name: '흐리게(평균)', k: [1, 1, 1, 1, 1, 1, 1, 1, 1].map((v) => v / 9) },
  vert: { name: '세로 윤곽', k: [-1, 0, 1, -2, 0, 2, -1, 0, 1] },
  horz: { name: '가로 윤곽', k: [-1, -2, -1, 0, 0, 0, 1, 2, 1] },
  sharpen: { name: '선명하게', k: [0, -1, 0, -1, 5, -1, 0, -1, 0] }
};

// 합성곱: 가장자리는 0으로, 결과는 절댓값(윤곽 세기)
export function convolve(g: number[], w: number, h: number, k: Kernel) {
  const out = new Array(w * h).fill(0);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    let s = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s += g[(y + j) * w + (x + i)] * k[(j + 1) * 3 + (i + 1)];
    out[y * w + x] = Math.abs(s);
  }
  return out;
}

// 횡단보도 장면에서 '흰 줄무늬 영역'(정답 영역)과 나머지의 평균 반응 비교 → 줄무늬 대비
export interface ContrastResult { inside: number; outside: number; ratio: number }
export function contrast(resp: number[], w: number, h: number, box: number[]): ContrastResult {
  let si = 0, ni = 0, so = 0, no = 0;
  const x0 = Math.floor(box[0] * w), x1 = Math.ceil(box[2] * w), y0 = Math.floor(box[1] * h), y1 = Math.ceil(box[3] * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const v = resp[y * w + x];
    if (x >= x0 && x < x1 && y >= y0 && y < y1) { si += v; ni++; } else { so += v; no++; }
  }
  const inside = si / Math.max(1, ni), outside = so / Math.max(1, no);
  return { inside, outside, ratio: inside / Math.max(1e-6, outside) };
}
export const GOAL_RATIO = 1.8;
export const BASIS3 = '물체 영역 = 평소/사건 장면 차이로 계산한 상자. 물체 대비 = 상자 안 평균 윤곽 세기 ÷ 밖 평균, 12장면 중앙값. 장면은 128×80 밝기';

// 128×80 사건 장면 (public/vision/hires.json)
export interface Hires { w: number; h: number; scenes: { id: string; name: string; box: number[]; data: string; g?: number[] }[] }
export function decode(b64: string) {
  const bin = atob(b64); // 브라우저 · node 18+ 모두 atob 지원
  const out = new Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out as number[];
}
export function prepare(H: Hires) { for (const s of H.scenes) if (!s.g) s.g = decode(s.data); return H; }
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
// 12장면 물체 대비: 장면마다 (물체 상자 안 평균 반응 ÷ 밖 평균), 점수 = 중앙값
export function score(H: Hires, k: Kernel) {
  const per = H.scenes.map((s) => contrast(convolve(s.g!, H.w, H.h, k), H.w, H.h, s.box).ratio);
  return { per, median: median(per) };
}
