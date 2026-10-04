'use client';

import { playAnvilStrike } from '@/lib/sound/anvil';
import { setSoundEnabled, useSoundEnabled } from '@/lib/sound/preference';

/** Turns the anvil sound on or off. Turning it on plays one strike so the student hears it. */
export function SoundToggle() {
  const enabled = useSoundEnabled();

  function toggle() {
    setSoundEnabled(!enabled);
    if (!enabled) {
      playAnvilStrike();
    }
  }

  return (
    <button
      type='button'
      onClick={toggle}
      aria-pressed={enabled}
      aria-label='Anvil sound'
      title={enabled ? 'Anvil sound on' : 'Anvil sound off'}
      className={
        'flex h-9 w-8 shrink-0 items-center justify-center sm:w-9 rounded-[var(--radius-forge)] border transition-colors ' +
        (enabled
          ? 'border-molten-500/60 text-amber-300 hover:bg-molten-500/10'
          : 'border-steel-700 text-steel-400 hover:border-steel-600 hover:text-steel-100')
      }
    >
      <svg viewBox='0 0 20 20' className='h-5 w-5' aria-hidden='true'>
        <path d='M3 8h3l4-3.5v11L6 12H3z' fill='currentColor' />
        {enabled ? (
          <path
            d='M13 7.2a4 4 0 0 1 0 5.6M15.2 5a7 7 0 0 1 0 10'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
          />
        ) : (
          <path d='M13.5 8l4 4m0-4l-4 4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
        )}
      </svg>
    </button>
  );
}
