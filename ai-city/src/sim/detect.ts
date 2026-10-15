// author: eduino
// 비전 6~8차시 탐지 — 창을 밀며(슬라이딩 윈도) 5차시 CNN으로 조각마다 묻고, 확신도 기준 · 겹침 제거(NMS)로 상자를 남긴다.
// 정답 상자와 비교해 정밀도 · 재현율을 센다. 화면과 점검(tools/check_vision06.ts)이 같은 코드를 쓴다.
import { rng, type CNN, type DataSet } from './nn.ts';
export interface Gray { w: number; h: number; px: Uint8Array }
export interface Obj { cls: string; box: number[]; onRoad: boolean; x: number; z: number }
export interface Win { box: number[]; cls: number; score: number; p: number[] }   // box: 화면 픽셀 [x0,y0,x1,y1]
export const SIZES = [24, 32, 48, 68, 92];   // 창 간격 = 크기/4 (줄인 화면에서 5칸)
const S = 20;
// 창 하나를 20×20으로 줄이기(넓이 평균 — 학습 조각과 같은 방식)
export function sample(g: Gray, x0: number, y0: number, side: number) {
  const out = new Float32Array(S * S), k = side / S;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const ax = x0 + i * k, ay = y0 + j * k, bx = ax + k, by = ay + k; let s = 0, n = 0;
    for (let y = Math.floor(ay); y < Math.ceil(by); y++) for (let x = Math.floor(ax); x < Math.ceil(bx); x++) {
      if (x < 0 || y < 0 || x >= g.w || y >= g.h) continue;
      const wx = Math.min(bx, x + 1) - Math.max(ax, x), wy = Math.min(by, y + 1) - Math.max(ay, y), w = wx * wy; s += g.px[y * g.w + x] * w; n += w;
    }
    out[j * S + i] = n ? s / n / 255 : 0;
  }
  return out;
}
// 모든 창을 CNN에 묻기 — 창 크기 s 마다 화면을 20/s 로 줄인 뒤 합성곱을 한 번에 계산하고, 창(20×20, 5칸 간격)마다 풀링 · 점수만 계산.
// 창 간격이 s/4 라서 줄인 화면에서는 정확히 5칸 → 창마다 sample() 후 cnnPredict() 한 것과 같은 값(빠르기만 다름).
export function scan(m: CNN, g: Gray, sizes = SIZES): Win[] {
  const out: Win[] = [], F = m.F, P = 9, D = P * P * F;
  for (const s of sizes) {
    const k = s / S, Wd = Math.floor(g.w / k), Hd = Math.floor(g.h / k), im = new Float32Array(Wd * Hd);
    for (let j = 0; j < Hd; j++) for (let i = 0; i < Wd; i++) {
      const ax = i * k, ay = j * k, bx = ax + k, by = ay + k; let sm = 0, n = 0;
      for (let y = Math.floor(ay); y < Math.ceil(by); y++) for (let x = Math.floor(ax); x < Math.ceil(bx); x++) {
        if (x >= g.w || y >= g.h) continue;
        const w = (Math.min(bx, x + 1) - Math.max(ax, x)) * (Math.min(by, y + 1) - Math.max(ay, y)); sm += g.px[y * g.w + x] * w; n += w;
      }
      im[j * Wd + i] = n ? sm / n / 255 : 0;
    }
    const Cw = Wd - 2, Ch = Hd - 2, conv = new Float32Array(Cw * Ch * F);
    for (let f = 0; f < F; f++) for (let y = 0; y < Ch; y++) for (let x = 0; x < Cw; x++) {
      let v = m.b1[f];
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) v += (im[(y + j) * Wd + x + i] - 0.5) * m.w1[f * 9 + j * 3 + i];
      conv[(f * Ch + y) * Cw + x] = v > 0 ? v : 0;
    }
    const pool = new Float32Array(D);
    for (let b = 0; b * 5 + S <= Hd; b++) for (let a = 0; a * 5 + S <= Wd; a++) {
      for (let f = 0; f < F; f++) for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
        let best = -1;
        for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const v = conv[(f * Ch + b * 5 + y * 2 + j) * Cw + a * 5 + x * 2 + i]; if (v > best) best = v; }
        pool[(f * P + y) * P + x] = best;
      }
      const z = [0, 0, 0];
      for (let c = 0; c < 3; c++) { let v = m.b2[c]; for (let i = 0; i < D; i++) v += pool[i] * m.w2[c * D + i]; z[c] = v; }
      const mx = Math.max(z[0], z[1], z[2]), e = z.map((v) => Math.exp(v - mx)), sum = e[0] + e[1] + e[2], p = e.map((v) => v / sum);
      const cls = p[0] >= p[1] ? 0 : 1, x0 = a * 5 * k, y0 = b * 5 * k;
      out.push({ box: [x0, y0, x0 + s, y0 + s], cls, score: p[cls], p });
    }
  }
  return out;
}
// 겹침: 작은 상자 기준(큰 창 안에 들어간 작은 창도 같은 물체로 봄)
export function overlap(a: number[], b: number[]) {
  const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])), iy = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  return (ix * iy) / Math.min((a[2] - a[0]) * (a[3] - a[1]), (b[2] - b[0]) * (b[3] - b[1]));
}
export function iou(a: number[], b: number[]) {
  const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])), iy = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1])), i = ix * iy;
  return i / ((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - i + 1e-9);
}
// 기준 이상만 남기고, nms > 0 이면 더 확신하는 상자와 nms 이상 겹치는 상자를 지운다
export function pick(ws: Win[], th: number, nms: number) {
  const c = ws.filter((w) => w.score >= th).sort((a, b) => b.score - a.score);
  if (!nms) return c;
  const keep: Win[] = [];
  for (const w of c) if (keep.every((k) => overlap(k.box, w.box) < nms)) keep.push(w);
  return keep;
}
// 정답 물체 → 학습 조각과 같은 정사각형(긴 변 × 1.25)
export function gtSquare(o: Obj, W: number, H: number) {
  const b = [o.box[0] * W, o.box[1] * H, o.box[2] * W, o.box[3] * H], s = Math.max(b[2] - b[0], b[3] - b[1]) * 1.25, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  return [cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2];
}
export const MATCH = 0.3;
export const NMS_ON = 0.5;   // NMS 켬: 작은 상자 기준 50% 이상 겹치면 같은 물체
export const visible = (o: Obj, W: number, H: number) => { const b = [o.box[0] * W, o.box[1] * H, o.box[2] * W, o.box[3] * H]; return !(b[2] - b[0] < 4 || b[3] - b[1] < 6 || b[0] <= 0 || b[2] >= W || b[1] <= 0); };
// 한 장면 채점: 상자마다 맞음(정답과 겹침 ≥ MATCH · 같은 종류 · 아직 안 짝지은 정답) / 헛탐지
export function grade(dets: Win[], objs: Obj[], W: number, H: number) {
  const gts = objs.filter((o) => visible(o, W, H)).map((o) => ({ o, sq: gtSquare(o, W, H), hit: false }));
  const cut = objs.filter((o) => !visible(o, W, H)).map((o) => gtSquare(o, W, H));   // 화면 가장자리에 잘린 물체: 맞혀도 틀려도 세지 않음
  const res = dets.map((d) => {
    let best = -1, bi = 0;
    gts.forEach((g, i) => { if (g.hit || (g.o.cls === 'car' ? 0 : 1) !== d.cls) return; const v = iou(d.box, g.sq); if (v > bi) { bi = v; best = i; } });
    if (best >= 0 && bi >= MATCH) { gts[best].hit = true; return { d, ok: true as boolean | null, gt: best }; }
    if (cut.some((q) => iou(d.box, q) >= MATCH)) return { d, ok: null, gt: -1 };
    return { d, ok: false as boolean | null, gt: -1 };
  });
  return { res, gts, tp: res.filter((r) => r.ok === true).length, fp: res.filter((r) => r.ok === false).length, fn: gts.filter((g) => !g.hit).length };
}
export function score(all: { tp: number; fp: number; fn: number }[]) {
  const tp = all.reduce((s, a) => s + a.tp, 0), fp = all.reduce((s, a) => s + a.fp, 0), fn = all.reduce((s, a) => s + a.fn, 0);
  return { tp, fp, fn, precision: tp / Math.max(1, tp + fp), recall: tp / Math.max(1, tp + fn) };
}

// 헛탐지 모으기: 학습 장면에서 기준 이상으로 잡혔지만 어떤 정답과도 거의 안 겹치는 창 → '빈 곳' 조각으로
export const HARD = { th: 0.5, maxIou: 0.3 };   // NMS 전 모든 창에서 모음
export function mineHard(m: CNN, g: Gray, objs: Obj[]) {
  const gts = objs.map((o) => gtSquare(o, g.w, g.h)), X: Float32Array[] = [];
  for (const w of pick(scan(m, g), HARD.th, 0)) if (gts.every((q) => iou(w.box, q) < HARD.maxIou)) X.push(sample(g, w.box[0], w.box[1], w.box[2] - w.box[0]));
  return X;
}
export const DET = { baseEpochs: 8, hardN: 2500, hardEpochs: 12, trainScenes: 40, testFrom: 160, testN: 40 };
// 모은 헛탐지 조각 중 hardN 개를 고정 순서로 무작위 추출 → '빈 곳'(2)
export function hardSet(X: Float32Array[], n = DET.hardN): DataSet {
  const r = rng(5), idx = X.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const k = idx.slice(0, n); return { X: k.map((i) => X[i]), y: k.map(() => 2) };
}
