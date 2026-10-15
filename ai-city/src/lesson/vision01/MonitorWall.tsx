// author: eduino
// 관제 모니터 벽 — 칸마다 카메라 1대. 그리는 모든 것은 계산 기록(simulate 결과)에서 온다.
// 사람 모드: 요원 시선(밝은 4칸)이 5초마다 이동 · 사건 칸이 빛남 · 찾음(초록)/놓침(주황) 표시
// AI 모드: 칸마다 '화면 변화량' 막대 + 기준값 선 · 알림이 울린 칸 테두리
import { useCallback, useRef } from 'react';
import { useCanvas } from '../../motion/useCanvas';
import { watching, type Result } from '../../sim/surveillance';
import { sceneOf, flipped, camLabel, img, preload } from './scenes';

export interface WallState {
  cameras: number;
  operators: number;
  ai: boolean;
  threshold: number;
  res: Result | null;  // 근무 결과(없으면 대기 화면)
  t: number;           // 지금 보여 줄 근무 시각(초)
}

const TEAL = '#14b8a6', GREEN = '#2fbf8a', ORANGE = '#f97316';

// 줄이 꽉 차도록 카메라 수의 약수 중에서, 칸 모양이 가로 1.2 : 세로 1 에 가장 가까운 배치를 고른다
function grid(C: number, W: number, H: number) {
  let best = { cols: C, rows: 1, d: Infinity };
  for (let cols = 1; cols <= C; cols++) {
    if (C % cols) continue;
    const rows = C / cols, d = Math.abs(Math.log((W / cols) / (H / rows)) - Math.log(1.2));
    if (d < best.d) best = { cols, rows, d };
  }
  return best;
}

export function MonitorWall({ state, className, selected, onPick }: { state: WallState; className?: string; selected?: number | null; onPick?: (cam: number) => void }) {
  const ref = useRef(state);
  ref.current = state;
  const selRef = useRef(selected ?? null);
  selRef.current = selected ?? null;
  const layout = useRef({ pad: 0, gap: 0, cols: 1, rows: 1, tw: 0, th: 0, C: 0 });
  const hover = useRef(-1);
  if (typeof window !== 'undefined') preload();
  const cache = useRef<{ res: Result | null; byCam: number[][] }>({ res: null, byCam: [] });

  const draw = useCallback((ctx: CanvasRenderingContext2D, now: number, w: number, h: number) => {
    const s = ref.current;
    const C = s.cameras, t = Math.max(0, s.t), sec = Math.floor(t);
    if (cache.current.res !== s.res) {
      const byCam: number[][] = Array.from({ length: C }, () => []);
      s.res?.list.forEach((e, i) => { if (e.cam < C) byCam[e.cam].push(i); });
      cache.current = { res: s.res, byCam };
    }
    const byCam = cache.current.byCam;
    const pad = 22, gap = C > 32 ? 5 : 8;
    const W = w - pad * 2, H = h - pad * 2 - 6;
    const { cols, rows } = grid(C, W, H);
    const tw = (W - gap * (cols - 1)) / cols, th = (H - gap * (rows - 1)) / rows;
    const res = s.res, trace = res?.trace;
    layout.current = { pad, gap, cols, rows, tw, th, C };

    for (let c = 0; c < C; c++) {
      const x = pad + (c % cols) * (tw + gap), y = pad + Math.floor(c / cols) * (th + gap);
      const watched = !s.ai && watching(c, res ? sec : 0, C, s.operators);
      // 사건 진행 중이면 그 칸 장면이 '사건 장면'으로 바뀜
      let active = -1;
      if (res) for (const i of byCam[c] ?? []) { const e = res.list[i]; if (t >= e.start && t < e.end) { active = i; break; } }
      // 칸 = CCTV 장면 (렌더 이미지, 12대 넘으면 좌우 반전)
      const sc = sceneOf(c), pic = img(sc.id, active >= 0 ? 'event' : 'base');
      ctx.fillStyle = '#0a1018'; ctx.fillRect(x, y, tw, th);
      if (pic) {
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, tw, th); ctx.clip();
        const r = Math.max(tw / pic.naturalWidth, th / pic.naturalHeight), iw = pic.naturalWidth * r, ih = pic.naturalHeight * r;
        if (flipped(c)) { ctx.translate(x + tw, y); ctx.scale(-1, 1); ctx.drawImage(pic, (tw - iw) / 2, (th - ih) / 2, iw, ih); }
        else ctx.drawImage(pic, x + (tw - iw) / 2, y + (th - ih) / 2, iw, ih);
        ctx.restore();
        ctx.fillStyle = 'rgba(8,14,22,0.28)'; ctx.fillRect(x, y, tw, th); // CCTV 톤
      }
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      for (let k = 2; k < th; k += 3) ctx.fillRect(x, y + k, tw, 1);
      if (tw > 46) {
        ctx.font = `600 ${Math.max(8, Math.min(11, tw / 10))}px "Space Grotesk", sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText(tw > 90 ? `${camLabel(c)} ${sc.name}` : camLabel(c), x + 4, y + 11);
      }
      if (active >= 0) { const pulse = 0.5 + 0.5 * Math.sin(now * 9); ctx.strokeStyle = `rgba(255,255,255,${0.35 + pulse * 0.4})`; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, tw - 2, th - 2); }

      // AI 모드: 변화량 막대 + 기준값 선
      if (s.ai && trace) {
        const v = trace.change[sec * C + c] ?? 0;
        const bh = Math.min(1, v / 100) * (th - 8), bw = Math.max(4, tw * 0.22);
        const over = v > s.threshold;
        ctx.fillStyle = over ? TEAL : 'rgba(150,170,190,0.35)';
        ctx.fillRect(x + tw - bw - 4, y + th - 4 - bh, bw, bh);
        const ty = y + th - 4 - (s.threshold / 100) * (th - 8);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + 3, ty); ctx.lineTo(x + tw - 3, ty); ctx.stroke(); ctx.setLineDash([]);
      }

      // 사람 모드: 요원이 안 보는 칸은 어둡게
      if (!s.ai && res && !watched) { ctx.fillStyle = 'rgba(5,8,13,0.55)'; ctx.fillRect(x, y, tw, th); }

      // 찾음 · 놓침 누적 점, 방금 일어난 일은 크게
      if (res) {
        let found = 0, missed = 0, flash: 'ok' | 'miss' | null = null;
        for (const i of byCam[c] ?? []) {
          const e = res.list[i], d = res.detail[i];
          if (d.found && d.at <= t) { found++; if (t - d.at < 2.5) flash = 'ok'; }
          else if (!d.found && e.end <= t) { missed++; if (t - e.end < 3.5) flash = 'miss'; }
        }
        const r = Math.max(2, Math.min(3.2, tw / 18));
        let k = 0;
        for (let n = 0; n < Math.min(found, 6); n++, k++) { ctx.fillStyle = GREEN; ctx.beginPath(); ctx.arc(x + 6 + k * (r * 2.6), y + th - 6, r, 0, Math.PI * 2); ctx.fill(); }
        for (let n = 0; n < Math.min(missed, 6); n++, k++) { ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(x + 6 + k * (r * 2.6), y + th - 6, r, 0, Math.PI * 2); ctx.fill(); }
        if (flash) {
          ctx.strokeStyle = flash === 'ok' ? GREEN : ORANGE; ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, tw - 2, th - 2);
          ctx.fillStyle = flash === 'ok' ? GREEN : ORANGE;
          ctx.font = `700 ${Math.max(11, Math.min(20, th * 0.32))}px "Space Grotesk", sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(flash === 'ok' ? '✓' : '✕', x + tw / 2, y + th / 2);
          ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
        }
      }

      // AI 알림이 울린 칸
      if (s.ai && trace) {
        for (const a of trace.alerts) {
          if (a.cam !== c) continue;
          if (sec >= a.t && sec < a.t + 2) { ctx.strokeStyle = TEAL; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, tw - 2, th - 2); }
          if (a.outcome === 'expired' && sec >= a.at && sec < a.at + 2) { ctx.strokeStyle = ORANGE; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, tw - 2, th - 2); }
        }
      }

      // 선택(확대 중) · 마우스 올린 칸
      if (selRef.current === c) { ctx.strokeStyle = '#f5c542'; ctx.lineWidth = 3; ctx.strokeRect(x - 1, y - 1, tw + 2, th + 2); }
      else if (hover.current === c) { ctx.strokeStyle = 'rgba(245,197,66,0.6)'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, tw, th); }
      // 사람 시선
      if (watched) {
        ctx.save(); ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 12;
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1.6; ctx.strokeRect(x + 0.5, y + 0.5, tw - 1, th - 1);
        ctx.restore();
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, tw - 1, th - 1);
      }
    }
  }, []);

  const canvasRef = useCanvas(draw, { fps: 30, essential: true });
  const hit = (e: { currentTarget: HTMLCanvasElement; clientX: number; clientY: number }) => {
    const r = e.currentTarget.getBoundingClientRect(), L = layout.current;
    const cx = e.clientX - r.left - L.pad, cy = e.clientY - r.top - L.pad;
    const col = Math.floor(cx / (L.tw + L.gap)), row = Math.floor(cy / (L.th + L.gap));
    if (cx < 0 || cy < 0 || col >= L.cols || row >= L.rows) return -1;
    if (cx - col * (L.tw + L.gap) > L.tw || cy - row * (L.th + L.gap) > L.th) return -1;
    const c = row * L.cols + col;
    return c < L.C ? c : -1;
  };
  return (
    <canvas ref={canvasRef} className={className} aria-label="관제 모니터 벽 — 칸을 누르면 확대"
      style={{ cursor: onPick ? 'zoom-in' : undefined }}
      onPointerMove={(e) => { hover.current = onPick ? hit(e) : -1; }}
      onPointerLeave={() => { hover.current = -1; }}
      onClick={(e) => { const c = hit(e); if (c >= 0 && onPick) onPick(c); }} />
  );
}
