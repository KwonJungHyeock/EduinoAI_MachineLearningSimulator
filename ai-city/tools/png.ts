// author: eduino
// 점검용 PNG 읽기(8비트 흑백 · 비월 없음만) — node 기본 zlib 만 사용
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
export function readGray(path: string | URL) {
  const b = readFileSync(path); let p = 8, w = 0, h = 0; const idat: Buffer[] = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p), type = b.toString('ascii', p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); if (d[8] !== 8 || d[9] !== 0 || d[12] !== 0) throw new Error('8비트 흑백 PNG만'); }
    if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (w + 1)], row = raw.subarray(y * (w + 1) + 1, (y + 1) * (w + 1));
    for (let x = 0; x < w; x++) {
      const a = x ? out[y * w + x - 1] : 0, up = y ? out[(y - 1) * w + x] : 0, c = x && y ? out[(y - 1) * w + x - 1] : 0;
      let v = row[x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const q = a + up - c, pa = Math.abs(q - a), pb = Math.abs(q - up), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      out[y * w + x] = v & 255;
    }
  }
  return { w, h, px: out };
}
