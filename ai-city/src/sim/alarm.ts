// author: eduino
// 비전 7차시 규칙 — 탐지한 사람 상자의 기준점이 '차도 구역' 안이고 '횡단보도' 밖이면 무단횡단 경보.
// 정답: 화면에 온전히 보이는 사람 중 차도 위(onRoad)이면서 가운데 교차로 칸(|x| ≤ 2) 밖에 있는 사람이 있으면 위험 장면.
import { visible, type Obj, type Win } from './detect.ts';
export interface Rule { point: 'feet' | 'center'; top: number; bottom: number; cross: boolean }
export const CROSS = [0.37, 0.63];   // 횡단보도(가운데 교차로 칸) 화면 가로 범위
export const truthDanger = (objs: Obj[]) => objs.some((o) => o.cls === 'person' && visible(o, 256, 160) && o.onRoad && Math.abs(o.x) > 2);
export function anchor(b: number[], point: Rule['point'], W = 256, H = 160) { return [((b[0] + b[2]) / 2) / W, (point === 'feet' ? b[3] : (b[1] + b[3]) / 2) / H]; }
export function inZone(p: number[], r: Rule) { return p[1] >= r.top && p[1] <= r.bottom && !(r.cross && p[0] >= CROSS[0] && p[0] <= CROSS[1]); }
export function alarmOf(dets: Win[], r: Rule) { return dets.filter((d) => d.cls === 1).filter((d) => inZone(anchor(d.box, r.point), r)); }
export function judge(perScene: { dets: Win[]; objs: Obj[] }[], r: Rule) {
  const rows = perScene.map(({ dets, objs }) => { const hits = alarmOf(dets, r), alarm = hits.length > 0, truth = truthDanger(objs); return { alarm, truth, hits }; });
  const tp = rows.filter((x) => x.alarm && x.truth).length, fp = rows.filter((x) => x.alarm && !x.truth).length, fn = rows.filter((x) => !x.alarm && x.truth).length;
  return { rows, tp, fp, fn, danger: tp + fn };
}
