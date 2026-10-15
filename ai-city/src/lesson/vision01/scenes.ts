// author: eduino
// CCTV 장면 12종(렌더 이미지) — 카메라 번호마다 장면 하나. 12대를 넘으면 장면을 좌우 반전해 돌려 쓴다.
import data from '../../data/visionScenes.json';

export interface SceneInfo { id: string; name: string; situation: string; detail: string; box: number[] | null; grid: number[] }
export const SCENES = data.scenes as SceneInfo[];
export const GW = data.gw, GH = data.gh;

export const sceneOf = (cam: number) => SCENES[cam % SCENES.length];
export const flipped = (cam: number) => Math.floor(cam / SCENES.length) % 2 === 1;
export const camLabel = (cam: number) => `CAM ${String(cam + 1).padStart(2, '0')}`;
export const src = (id: string, v: 'base' | 'event', small = false) => `./vision/${id}-${v}${small ? '-s' : ''}.webp`;

// 작은 이미지 미리 불러오기 (모니터 벽용)
const cache = new Map<string, HTMLImageElement>();
export function img(id: string, v: 'base' | 'event'): HTMLImageElement | null {
  const k = `${id}-${v}`;
  let im = cache.get(k);
  if (!im) { im = new Image(); im.src = src(id, v, true); cache.set(k, im); }
  return im.complete && im.naturalWidth ? im : null;
}
export function preload() { for (const s of SCENES) { img(s.id, 'base'); img(s.id, 'event'); } }
