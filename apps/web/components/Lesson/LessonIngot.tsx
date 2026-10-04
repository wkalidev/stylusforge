'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePrefersReducedMotion } from '@/lib/hooks/useMediaQuery';
import { hasWebGL } from '@/lib/webgl';

/**
 * A static ingot drawn with gradients, colored by heat: shown while three.js loads and when
 * WebGL is unavailable.
 */
function IngotFallback({ heat }: { heat: number }) {
  const hot = Math.round(heat * 100);
  const front = `color-mix(in oklab, var(--color-molten-500) ${hot}%, var(--color-steel-600))`;
  const top = `color-mix(in oklab, var(--color-amber-300) ${hot}%, var(--color-steel-400))`;
  return (
    <div aria-hidden='true' className='flex h-full w-full items-center justify-center'>
      <div className='w-3/5'>
        <div className='mx-auto h-2 w-3/4 [clip-path:polygon(12%_0,88%_0,100%_100%,0_100%)]' style={{ background: top }} />
        <div className='h-4 [clip-path:polygon(0_0,100%_0,94%_100%,6%_100%)]' style={{ background: front }} />
      </div>
    </div>
  );
}

/** three.js only loads in the browser, in its own chunk, after the page is interactive. */
const LessonIngotScene = dynamic(() => import('./LessonIngotScene'), {
  ssr: false,
  loading: () => <IngotFallback heat={0} />,
});

/** The lesson header's ingot, heating from cold steel to molten as objectives are met. */
export function LessonIngot({ heat, label }: { heat: number; label: string }) {
  const container = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [active, setActive] = useState(true);
  const [webgl, setWebgl] = useState<boolean | null>(null);

  useEffect(() => {
    // WebGL support can only be probed in the browser, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebgl(hasWebGL());
    const element = container.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} role='img' aria-label={label} className='h-12 w-16 shrink-0'>
      {webgl ? (
        <LessonIngotScene heat={heat} reducedMotion={reducedMotion} active={active} />
      ) : (
        <IngotFallback heat={heat} />
      )}
    </div>
  );
}
