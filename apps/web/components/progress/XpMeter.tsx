'use client';

import { useLocalXp } from '@/lib/progress/progress';
import { rankProgress } from '@/lib/progress/ranks';

/**
 * Rank, XP and progress to the next rank, from the lessons passed in this browser.
 * Updates as soon as a check passes, wallet or not.
 */
export function XpMeter() {
  const xp = useLocalXp();
  const { rank, next, xpToNext, fraction } = rankProgress(xp);
  const label = next ? `${xp} XP, ${xpToNext} XP to ${next.name}` : `${xp} XP, top rank`;

  return (
    <div className='flex items-center gap-2 sm:gap-3' title={label}>
      <span className='hidden font-display text-lg font-bold leading-none text-amber-300 md:inline'>{rank.name}</span>
      <div className='flex flex-col gap-1'>
        <div
          role='meter'
          aria-label={`Rank ${rank.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fraction * 100)}
          aria-valuetext={label}
          className='h-1.5 w-16 overflow-hidden rounded-full bg-steel-800 sm:w-24'
        >
          <div
            className='h-full rounded-full bg-gradient-to-r from-ember-500 via-molten-500 to-amber-300 transition-[width] duration-500 motion-reduce:transition-none'
            style={{ width: `${fraction * 100}%` }}
          />
        </div>
        <span className='text-[11px] leading-none text-steel-400 tabular-nums'>{xp} XP</span>
      </div>
    </div>
  );
}
