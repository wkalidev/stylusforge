'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useIsConstrainedDevice, usePrefersReducedMotion } from '@/lib/hooks/useMediaQuery';
import { hasWebGL } from '@/lib/webgl';
import { HeroFallback } from './HeroFallback';

/** three.js only loads in the browser, in its own chunk, after the page is interactive. */
const HeroScene = dynamic(() => import('./HeroScene'), {
  ssr: false,
  loading: () => <HeroFallback />,
});

export function HeroVisual() {
  const container = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const constrained = useIsConstrainedDevice();
  const [active, setActive] = useState(true);
  const [webgl, setWebgl] = useState<boolean | null>(null);

  useEffect(() => {
    // WebGL support can only be probed in the browser, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebgl(hasWebGL());
    const element = container.current;
    if (!element) {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className='h-full w-full'>
      {webgl ? <HeroScene reducedMotion={reducedMotion} constrained={constrained} active={active} /> : <HeroFallback />}
    </div>
  );
}
