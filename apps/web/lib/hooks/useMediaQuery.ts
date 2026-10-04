import { useCallback, useSyncExternalStore } from 'react';

/** Whether a media query matches; false during server rendering and hydration. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');

/** Phones and touch-first devices: lighter 3D (fewer particles, lower pixel ratio). */
export const useIsConstrainedDevice = () => useMediaQuery('(max-width: 768px), (pointer: coarse)');
