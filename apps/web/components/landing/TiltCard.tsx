'use client';

import { useRef } from 'react';
import { useMediaQuery, usePrefersReducedMotion } from '@/lib/hooks/useMediaQuery';

const MAX_TILT = 12; // degrees

/**
 * Tilts its content in 3D towards the pointer, with a moving glare, like a metal plate turned in
 * the light. Static (a fixed, gentle angle) with reduced motion or without a fine pointer.
 */
export function TiltCard({ children, label }: { children: React.ReactNode; label: string }) {
  const card = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const reducedMotion = usePrefersReducedMotion();
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');
  const interactive = finePointer && !reducedMotion;

  function setTilt(x: number, y: number) {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const element = card.current;
      if (!element) return;
      element.style.setProperty('--tilt-x', `${(-y * MAX_TILT).toFixed(2)}deg`);
      element.style.setProperty('--tilt-y', `${(x * MAX_TILT).toFixed(2)}deg`);
      element.style.setProperty('--glare-x', `${((x + 1) * 50).toFixed(1)}%`);
      element.style.setProperty('--glare-y', `${((y + 1) * 50).toFixed(1)}%`);
    });
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setTilt(((event.clientX - rect.left) / rect.width) * 2 - 1, ((event.clientY - rect.top) / rect.height) * 2 - 1);
  }

  return (
    <div className='[perspective:1100px]'>
      <div
        ref={card}
        role='img'
        aria-label={label}
        onPointerMove={interactive ? onPointerMove : undefined}
        onPointerLeave={interactive ? () => setTilt(0, 0) : undefined}
        className={
          'relative rounded-[22px] transition-transform duration-300 ease-out [transform-style:preserve-3d] ' +
          (interactive
            ? '[transform:rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))]'
            : '[transform:rotateX(6deg)_rotateY(-10deg)]')
        }
      >
        <div aria-hidden='true'>{children}</div>
        {interactive && (
          <div
            aria-hidden='true'
            className='pointer-events-none absolute inset-0 rounded-[22px] mix-blend-screen [background:radial-gradient(circle_at_var(--glare-x,50%)_var(--glare-y,30%),rgb(255_255_255/0.16),transparent_45%)]'
          />
        )}
      </div>
    </div>
  );
}
