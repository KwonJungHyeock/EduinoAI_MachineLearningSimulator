// author: eduino
// 마우스 반응 UI: 커서 위치 빛(스포트라이트) · 자석처럼 끌리는 버튼
import { useRef, type ButtonHTMLAttributes, type PointerEvent } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

// 요소 안 커서 위치를 CSS 변수(--mx · --my)로 넘김 → CSS 에서 빛 · 테두리 반응에 사용
export function spot(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget, r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - r.left}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
}

const REDUCE = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 커서가 가까이 오면 살짝 끌려오는 버튼 (최대 6px)
export function MagneticButton({ className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0), y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18 }), sy = useSpring(y, { stiffness: 260, damping: 18 });
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    spot(e);
    if (REDUCE || rest.disabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set(((e.clientX - r.left) / r.width - 0.5) * 12);
    y.set(((e.clientY - r.top) / r.height - 0.5) * 10);
  };
  const leave = () => { x.set(0); y.set(0); };
  const { onDrag: _a, onDragStart: _b, onDragEnd: _c, onAnimationStart: _d, ...safe } = rest as Record<string, unknown>;
  return (
    <motion.button ref={ref} className={className} style={{ x: sx, y: sy }} onPointerMove={move} onPointerLeave={leave} {...(safe as object)}>
      {children}
    </motion.button>
  );
}
