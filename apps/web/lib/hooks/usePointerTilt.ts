import { useEffect, useRef } from 'react';
import { useMediaQuery, usePrefersReducedMotion } from './useMediaQuery';

/**
 * Tilts an element towards the pointer, like a metal plate turned in the light. Sets CSS custom
 * properties on it, once per animation frame: `--tilt-x` and `--tilt-y` (degrees, up to
 * `maxTilt`) and `--glare-x` and `--glare-y` (the pointer's position, in percent). The stylesheet
 * turns them into a transform and a glare, so no inline script or style element is needed.
 *
 * Off (`interactive` false, no handlers) with reduced motion or without a fine pointer.
 */
export function usePointerTilt<T extends HTMLElement>(maxTilt: number) {
  const ref = useRef<T>(null);
  const frame = useRef(0);
  const reducedMotion = usePrefersReducedMotion();
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');
  const interactive = finePointer && !reducedMotion;

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function setTilt(x: number, y: number) {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const element = ref.current;
      if (!element) return;
      element.style.setProperty('--tilt-x', `${(-y * maxTilt).toFixed(2)}deg`);
      element.style.setProperty('--tilt-y', `${(x * maxTilt).toFixed(2)}deg`);
      element.style.setProperty('--glare-x', `${((x + 1) * 50).toFixed(1)}%`);
      element.style.setProperty('--glare-y', `${((y + 1) * 50).toFixed(1)}%`);
    });
  }

  function onPointerMove(event: React.PointerEvent<T>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setTilt(((event.clientX - rect.left) / rect.width) * 2 - 1, ((event.clientY - rect.top) / rect.height) * 2 - 1);
  }

  const handlers = interactive ? { onPointerMove, onPointerLeave: () => setTilt(0, 0) } : {};
  return { ref, interactive, handlers };
}
