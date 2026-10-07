'use client';

import { usePointerTilt } from '@/lib/hooks/usePointerTilt';

const MAX_TILT = 12; // degrees

/**
 * Tilts its content in 3D towards the pointer, with a moving glare, like a metal plate turned in
 * the light. Static (a fixed, gentle angle) with reduced motion or without a fine pointer.
 */
export function TiltCard({ children, label }: { children: React.ReactNode; label: string }) {
  const { ref, interactive, handlers } = usePointerTilt<HTMLDivElement>(MAX_TILT);

  return (
    <div className='[perspective:1100px]'>
      <div
        ref={ref}
        role='img'
        aria-label={label}
        {...handlers}
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
