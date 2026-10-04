import { useId } from 'react';

/** The StylusForge mark: a hot ingot seen from above, with a glowing seam. */
export function ForgeMark({ className = 'h-7 w-7' }: { className?: string }) {
  const id = useId();
  const front = `${id}-front`;
  const top = `${id}-top`;
  return (
    <svg viewBox='0 0 32 32' className={className} aria-hidden='true'>
      <defs>
        <linearGradient id={front} x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stopColor='var(--color-molten-500)' />
          <stop offset='1' stopColor='var(--color-ember-700)' />
        </linearGradient>
        <linearGradient id={top} x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' stopColor='var(--color-amber-300)' />
          <stop offset='1' stopColor='var(--color-molten-400)' />
        </linearGradient>
      </defs>
      <path d='M9 7h14l5 7H4z' fill={`url(#${top})`} />
      <path d='M4 14h24l-3.5 12h-17z' fill={`url(#${front})`} />
      <path d='M7 19.5h18' stroke='var(--color-amber-300)' strokeWidth='1.25' strokeLinecap='round' opacity='0.85' />
    </svg>
  );
}

/** Mark plus wordmark, used in the header. */
export function ForgeLogo() {
  return (
    <span className='inline-flex items-center gap-2'>
      <ForgeMark />
      <span className='hidden font-display text-2xl font-extrabold leading-none tracking-wide text-steel-100 sm:inline'>StylusForge</span>
    </span>
  );
}
