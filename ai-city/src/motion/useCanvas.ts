// author: eduino
// 캔버스 모션 공통 훅: 화면 배율 · 크기 변화 · 화면 밖 일시정지 · fps 제한 · 움직임 줄이기 설정 대응 · 마우스 반응.
import { useEffect, useRef } from 'react';
import { createFollower, type P } from './pointer';

export type Draw = (ctx: CanvasRenderingContext2D, t: number, w: number, h: number, p: P) => void;

interface Options {
  fps?: number;    // 저사양 기준 30
  still?: boolean; // 정지 화면 한 장만
}

const REDUCE = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const IDLE: P = { x: 0, y: 0, in: 0, click: -1 };

export function useCanvas(draw: Draw, { fps = 30, still = false }: Options = {}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const start = performance.now();
    const frozen = REDUCE || still;
    const follow = createFollower();
    let w = 0, h = 0, raf = 0, last = 0, visible = true;

    const frame = (now: number, p: P) => {
      ctx.clearRect(0, 0, w, h);
      draw(ctx, (now - start) / 1000, w, h, p);
    };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (frozen) frame(start + 4000, IDLE); // 움직임이 잘 보이는 시점 한 장
    };
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || now - last < 1000 / fps - 2) return;
      const dt = Math.min(0.1, (now - (last || now)) / 1000);
      last = now;
      frame(now, follow(canvas.getBoundingClientRect(), dt));
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);
    resize();
    if (!frozen) raf = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [draw, fps, still]);

  return ref;
}

// 같은 화면이 매번 같게 나오도록 고정 씨앗 난수
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
