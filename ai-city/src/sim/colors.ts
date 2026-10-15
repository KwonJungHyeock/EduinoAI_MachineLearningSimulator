// author: eduino
// 비전 4차시 계산 모델 — 색 범위(색상 · 채도 · 밝기)로 픽셀을 고른다. 정답 = 물체 상자 안에서 평소 → 사건으로 바뀐 픽셀.
// 정밀도 = 고른 것 중 진짜 물체 비율, 재현율 = 진짜 물체 중 고른 비율. 화면 · node 점검이 같은 파일을 씀.
export interface ColorData { w: number; h: number; scenes: { id: string; name: string; situation: string; box: number[]; event: string; base: string; E?: number[]; B?: number[] }[] }
export interface Range { hue: number; width: number; sat: number; change: boolean }
export const CHANGE_TH = 60, VMIN = 0.25, GOAL = { precision: 0.8, recall: 0.5 };
export const BASIS4 = `정답 픽셀 = 물체 상자 안에서 평소 · 사건 장면 RGB 차이 합이 ${CHANGE_TH} 넘는 칸(128×80). 밝기 ${VMIN} 미만은 색이 없다고 봄(임시)`;

const dec = (b64: string) => { const s = atob(b64), o = new Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i); return o as number[]; };
export function prepare(D: ColorData) { for (const s of D.scenes) { if (!s.E) s.E = dec(s.event); if (!s.B) s.B = dec(s.base); } return D; }
export function hsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0; if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  return [h, mx ? d / mx : 0, mx];
}
export const inHue = (h: number, c: number, w: number) => { const d = Math.abs(((h - c + 540) % 360) - 180); return d <= w / 2; };
export interface SceneEval { id: string; name: string; truth: number; picked: number; hit: number; precision: number; recall: number; mask: Uint8Array }
export function evaluate(D: ColorData, r: Range): SceneEval[] {
  return D.scenes.map((s) => {
    const n = D.w * D.h, mask = new Uint8Array(n), E = s.E!, B = s.B!, bx = s.box;
    let truth = 0, picked = 0, hit = 0;
    for (let i = 0; i < n; i++) {
      const x = i % D.w, y = (i / D.w) | 0, j = i * 3;
      const d = Math.abs(E[j] - B[j]) + Math.abs(E[j + 1] - B[j + 1]) + Math.abs(E[j + 2] - B[j + 2]);
      const t = d > CHANGE_TH && x >= bx[0] * D.w && x <= bx[2] * D.w && y >= bx[1] * D.h && y <= bx[3] * D.h;
      const [h, sa, v] = hsv(E[j], E[j + 1], E[j + 2]);
      const p = inHue(h, r.hue, r.width) && sa >= r.sat && v >= VMIN && (!r.change || d > CHANGE_TH);
      if (t) truth++; if (p) picked++; if (p && t) hit++;
      mask[i] = p ? (t ? 2 : 1) : t ? 3 : 0; // 2 맞게 고름 · 1 잘못 고름 · 3 놓침
    }
    return { id: s.id, name: s.name, truth, picked, hit, precision: picked ? hit / picked : 0, recall: truth ? hit / truth : 0, mask };
  });
}
export const pass = (e: SceneEval) => e.precision >= GOAL.precision && e.recall >= GOAL.recall;
