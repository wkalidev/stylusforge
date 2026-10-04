'use client';

import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/lib/hooks/useMediaQuery';

const COLORS = ['#ffe2a0', '#ffd27a', '#ffbe4a', '#ff9238', '#ff7a1a'];

/**
 * A burst of sparks from the center of its parent, like a hammer striking hot metal. Each change
 * of `trigger` (except the initial 0) fires one burst. Nothing happens with reduced motion.
 */
export function SparkBurst({ trigger, count = 32 }: { trigger: number; count?: number }) {
  const layer = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const container = layer.current;
    if (trigger === 0 || reducedMotion || !container) {
      return;
    }
    const sparks: HTMLSpanElement[] = [];
    for (let i = 0; i < count; i += 1) {
      const spark = document.createElement('span');
      const size = 2 + Math.random() * 4;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      Object.assign(spark.style, {
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '9999px',
        background: color,
        boxShadow: `0 0 ${size * 2}px ${color}`,
      });
      container.appendChild(spark);
      sparks.push(spark);

      // Mostly upwards and sideways, then pulled down: a ballistic arc.
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
      const distance = 60 + Math.random() * 140;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      const fall = 40 + Math.random() * 80;
      spark
        .animate(
          [
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
            { transform: `translate(calc(-50% + ${dx * 0.7}px), calc(-50% + ${dy * 0.8}px)) scale(0.9)`, opacity: 1, offset: 0.45 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + fall}px)) scale(0.2)`, opacity: 0 },
          ],
          { duration: 650 + Math.random() * 550, easing: 'cubic-bezier(0.15, 0.7, 0.35, 1)', fill: 'forwards' },
        )
        .finished.then(() => spark.remove(), () => spark.remove());
    }
    return () => sparks.forEach((spark) => spark.remove());
  }, [trigger, count, reducedMotion]);

  return <div ref={layer} aria-hidden='true' className='pointer-events-none absolute inset-0 overflow-visible' />;
}
