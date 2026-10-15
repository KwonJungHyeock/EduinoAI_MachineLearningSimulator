// author: eduino
// 비전 5~8차시 모델 — 외부 라이브러리 없이 직접 구현. 화면(브라우저 학습)과 node 점검이 같은 코드를 쓴다.
//   kNN: 학습 조각을 모두 기억했다가 가장 가까운 k개의 다수결
//   CNN: 입력 가운데 맞춤(밝기 − 0.5) → 합성곱(3×3 필터 F개) → ReLU → 2×2 최대 풀링 → 완전 연결(3) → 소프트맥스, 미니배치 SGD
export const CLASSES = ['차', '사람', '빈 곳'];
export interface Crops { size: number; classes: string[]; sets: Record<string, { x: string[]; y: number[]; X?: Float32Array[] }> }
const dec = (b64: string) => { const s = atob(b64), o = new Float32Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i) / 255; return o; };
export function prepare(C: Crops) { for (const k in C.sets) if (!C.sets[k].X) C.sets[k].X = C.sets[k].x.map(dec); return C; }
export function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export interface DataSet { X: Float32Array[]; y: number[] }
export function take(C: Crops, key: string, n?: number, seed = 1): DataSet {
  const s = C.sets[key], idx = s.y.map((_, i) => i), r = rng(seed);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const pick = n ? idx.slice(0, n) : idx;
  return { X: pick.map((i) => s.X![i]), y: pick.map((i) => s.y[i]) };
}
export function join(a: DataSet, b: DataSet): DataSet { return { X: [...a.X, ...b.X], y: [...a.y, ...b.y] }; }

// ── kNN ──
export function knnPredict(train: DataSet, x: Float32Array, k = 3) {
  const d: [number, number][] = train.X.map((t, i) => { let s = 0; for (let j = 0; j < t.length; j++) { const e = t[j] - x[j]; s += e * e; } return [s, train.y[i]]; });
  d.sort((a, b) => a[0] - b[0]);
  const v = [0, 0, 0]; for (let i = 0; i < k; i++) v[d[i][1]]++;
  const best = v.indexOf(Math.max(...v)); return { cls: best, conf: v[best] / k };
}

// ── CNN ──
export interface CNN { S: number; F: number; w1: Float32Array; b1: Float32Array; w2: Float32Array; b2: Float32Array }
export function makeCNN(S = 20, F = 8, seed = 1): CNN {
  const r = rng(seed), P = ((S - 2) >> 1), D = P * P * F;
  const g = (n: number, sc: number) => Float32Array.from({ length: n }, () => (r() * 2 - 1) * sc);
  return { S, F, w1: g(9 * F, Math.sqrt(2 / 9)), b1: new Float32Array(F), w2: g(D * 3, Math.sqrt(1 / D)), b2: new Float32Array(3) };
}
function forward(m: CNN, x: Float32Array) {
  const { S, F } = m, C = S - 2, P = C >> 1, conv = new Float32Array(C * C * F), pool = new Float32Array(P * P * F), arg = new Int32Array(P * P * F);
  for (let f = 0; f < F; f++) for (let y = 0; y < C; y++) for (let xx = 0; xx < C; xx++) {
    let s = m.b1[f];
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) s += (x[(y + j) * S + xx + i] - 0.5) * m.w1[f * 9 + j * 3 + i];
    conv[(f * C + y) * C + xx] = s > 0 ? s : 0;
  }
  for (let f = 0; f < F; f++) for (let y = 0; y < P; y++) for (let xx = 0; xx < P; xx++) {
    let best = -1, bi = 0;
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const id = (f * C + y * 2 + j) * C + xx * 2 + i; if (conv[id] > best) { best = conv[id]; bi = id; } }
    pool[(f * P + y) * P + xx] = best; arg[(f * P + y) * P + xx] = bi;
  }
  const z = new Float32Array(3), D = pool.length;
  for (let c = 0; c < 3; c++) { let s = m.b2[c]; for (let i = 0; i < D; i++) s += pool[i] * m.w2[c * D + i]; z[c] = s; }
  const mx = Math.max(z[0], z[1], z[2]), e = z.map((v) => Math.exp(v - mx)), sum = e[0] + e[1] + e[2];
  return { conv, pool, arg, p: e.map((v) => v / sum) };
}
// 필터별 반응 지도(합성곱 + ReLU 결과, (S−2)×(S−2) × F) — '필터가 조각에서 찾은 것'
export function featureMaps(m: CNN, x: Float32Array) { return forward(m, x).conv; }
export function cnnPredict(m: CNN, x: Float32Array) { const { p } = forward(m, x); const cls = p.indexOf(Math.max(...p)); return { cls, conf: p[cls], p: Array.from(p) }; }
// 한 에폭 학습. 돌려줌: 평균 손실
export const LR = 0.02;
export function trainEpoch(m: CNN, data: DataSet, lr = LR, batch = 16, seed = 1) {
  const { S, F } = m, C = S - 2, D = ((C >> 1) ** 2) * F, r = rng(seed), idx = data.y.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  let loss = 0;
  for (let b0 = 0; b0 < idx.length; b0 += batch) {
    const gw1 = new Float32Array(m.w1.length), gb1 = new Float32Array(F), gw2 = new Float32Array(m.w2.length), gb2 = new Float32Array(3);
    const bs = Math.min(batch, idx.length - b0);
    for (let t = 0; t < bs; t++) {
      const n = idx[b0 + t], x = data.X[n], y = data.y[n], f = forward(m, x);
      loss += -Math.log(f.p[y] + 1e-9);
      const dz = Array.from(f.p); dz[y] -= 1;
      const dpool = new Float32Array(D);
      for (let c = 0; c < 3; c++) { gb2[c] += dz[c]; for (let i = 0; i < D; i++) { gw2[c * D + i] += dz[c] * f.pool[i]; dpool[i] += dz[c] * m.w2[c * D + i]; } }
      for (let i = 0; i < D; i++) {
        const id = f.arg[i]; if (f.conv[id] <= 0) continue;
        const ff = Math.floor(id / (C * C)), rem = id % (C * C), yy = Math.floor(rem / C), xx = rem % C, g = dpool[i];
        gb1[ff] += g;
        for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) gw1[ff * 9 + j * 3 + k] += g * (x[(yy + j) * S + xx + k] - 0.5);
      }
    }
    const s = lr / bs;
    for (let i = 0; i < m.w1.length; i++) m.w1[i] -= s * gw1[i];
    for (let i = 0; i < F; i++) m.b1[i] -= s * gb1[i];
    for (let i = 0; i < m.w2.length; i++) m.w2[i] -= s * gw2[i];
    for (let i = 0; i < 3; i++) m.b2[i] -= s * gb2[i];
  }
  return loss / idx.length;
}
export function accuracy(pred: (x: Float32Array) => { cls: number }, data: DataSet) {
  let ok = 0; const conf = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  data.X.forEach((x, i) => { const c = pred(x).cls; conf[data.y[i]][c]++; if (c === data.y[i]) ok++; });
  return { acc: ok / Math.max(1, data.y.length), conf };
}
// 저장된 모델(JSON 숫자 배열) → CNN
export function unpack(j: { S: number; F: number; w1: number[]; b1: number[]; w2: number[]; b2: number[] }): CNN {
  return { S: j.S, F: j.F, w1: Float32Array.from(j.w1), b1: Float32Array.from(j.b1), w2: Float32Array.from(j.w2), b2: Float32Array.from(j.b2) };
}
