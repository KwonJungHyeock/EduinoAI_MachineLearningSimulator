// author: eduino
// 흑백 장면 PNG(무손실) → 밝기 배열. 점검(tools/png.ts)과 같은 픽셀을 읽는다.
import type { Gray } from '../sim/detect';
export function loadGray(url: string): Promise<Gray> {
  return new Promise((ok, fail) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
      const ctx = c.getContext('2d', { willReadFrequently: true })!; ctx.drawImage(im, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data, px = new Uint8Array(c.width * c.height);
      for (let i = 0; i < px.length; i++) px[i] = d[i * 4];
      ok({ w: c.width, h: c.height, px });
    };
    im.onerror = fail; im.src = url;
  });
}
export const pad3 = (i: number) => String(i).padStart(3, '0');
export const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
