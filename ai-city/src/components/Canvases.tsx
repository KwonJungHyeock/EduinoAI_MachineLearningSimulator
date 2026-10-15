// author: eduino
import { useMemo } from 'react';
import { useCanvas } from '../motion/useCanvas';
import { createMotif } from '../motion/motifs';
import { createHeroField } from '../motion/heroField';
import { createPatternField } from '../motion/patternField';
import type { MotifId } from '../data/districts';

export function MotifCanvas({ motif, color, fps = 30, className }: { motif: MotifId; color: string; fps?: number; className?: string }) {
  const draw = useMemo(() => createMotif(motif, color), [motif, color]);
  const ref = useCanvas(draw, { fps });
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

export function HeroCanvas({ colors, className }: { colors: string[]; className?: string }) {
  const draw = useMemo(() => createHeroField(colors), [colors]);
  const ref = useCanvas(draw, { fps: 30 });
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

export function PatternCanvas({ color, className }: { color: string; className?: string }) {
  const draw = useMemo(() => createPatternField(color), [color]);
  const ref = useCanvas(draw, { fps: 30 });
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
