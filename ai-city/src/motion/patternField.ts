// author: eduino
// 배경 패턴: 아주 옅은 점 격자. 커서 주변만 점이 커지고 비켜나며 지구 색으로 물듦. 클릭하면 물결이 지나감.
import { rgba, type Draw } from './useCanvas';

export function createPatternField(color: string, gap = 26): Draw {
  return (ctx, _t, w, h, p) => {
    const sig = 140, sig2 = 2 * sig * sig;
    const wave = p.click >= 0 ? 10 + p.click * 520 : -1;
    const cols = Math.ceil(w / gap) + 1, rows = Math.ceil(h / gap) + 1;
    const ox = (w % gap) / 2, oy = (h % gap) / 2;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      let x = ox + i * gap, y = oy + j * gap;
      const dx = x - p.x, dy = y - p.y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2) || 1;
      let k = p.in * Math.exp(-d2 / sig2);
      if (wave > 0) k += Math.max(0, 1 - Math.abs(d - wave) / 40) * (1 - p.click / 1.2) * 0.8;
      if (k < 0.01) { ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2); continue; }
      x += (dx / d) * k * 7; y += (dy / d) * k * 7;
      const r = 0.7 + k * 1.6;
      ctx.fillStyle = k > 0.25 ? rgba(color, Math.min(0.9, 0.12 + k * 0.8)) : `rgba(255,255,255,${0.06 + k * 0.5})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  };
}
