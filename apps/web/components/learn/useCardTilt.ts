import { useRef } from 'react';
import { useMediaQuery, usePrefersReducedMotion } from '@/lib/hooks/useMediaQuery';

const MAX_TILT = 4; // degrees: a hint of depth, not a spin

/**
 * A subtle 3D tilt towards the pointer for a card, through the --tilt-x / --tilt-y custom
 * properties (one write per animation frame, no re-render). Off with reduced motion or without a
 * fine pointer.
 */
export function useCardTilt<T extends HTMLElement>() {
  const frame = useRef(0);
  const reducedMotion = usePrefersReducedMotion();
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');
  const enabled = finePointer && !reducedMotion;

  const setTilt = (element: T, x: number, y: number) => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      element.style.setProperty('--tilt-x', `${(-y * MAX_TILT).toFixed(2)}deg`);
      element.style.setProperty('--tilt-y', `${(x * MAX_TILT).toFixed(2)}deg`);
    });
  };

  const handlers = enabled
    ? {
        onPointerMove: (event: React.PointerEvent<T>) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setTilt(
            event.currentTarget,
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            ((event.clientY - rect.top) / rect.height) * 2 - 1,
          );
        },
        onPointerLeave: (event: React.PointerEvent<T>) => setTilt(event.currentTarget, 0, 0),
      }
    : {};

  return { handlers, enabled };
}
