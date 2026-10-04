'use client';

import { LESSONS } from '@/lib/curriculum/lessons';
import { useCompletedLessons, useLocalXp } from '@/lib/progress/progress';
import { rankProgress } from '@/lib/progress/ranks';
import { useStreak } from '@/lib/progress/streak';

function FlameIcon({ lit }: { lit: boolean }) {
  return (
    <svg viewBox='0 0 24 24' className={'h-7 w-7 ' + (lit ? 'text-molten-500' : 'text-steel-600')} aria-hidden='true'>
      <path
        fill='currentColor'
        d='M12 2c.6 3.2-1.6 5-3 6.9C7.6 10.8 7 12.4 7 14a5 5 0 0 0 10 0c0-1.8-.7-3.3-1.6-4.6-.2 1.2-.9 2.1-1.9 2.6.4-3.3-.7-7.2-1.5-10Z'
      />
      {lit && <path fill='var(--color-amber-300)' d='M12 12.5c1.6 1.4 2.3 2.6 2.3 3.6a2.3 2.3 0 1 1-4.6 0c0-1 .7-2.2 2.3-3.6Z' />}
    </svg>
  );
}

/**
 * The player's progress at the top of /learn: rank, XP, the next milestone and the daily streak,
 * from the lessons passed in this browser. `children` holds the call to action.
 */
export function ProgressHero({ children }: { children?: React.ReactNode }) {
  const xp = useLocalXp();
  const passed = useCompletedLessons();
  const streak = useStreak();
  const { rank, next, xpToNext, thresholdFraction } = rankProgress(xp);
  const written = LESSONS.filter((lesson) => lesson.available);
  const passedCount = written.filter((lesson) => passed.includes(lesson.id)).length;
  const milestone = next ? `${xpToNext} XP to ${next.name}` : 'Top rank reached';

  return (
    <section aria-label='Your progress' className='steel-surface heat-glow relative overflow-hidden p-6 sm:p-8'>
      <div className='flex flex-col gap-8 md:flex-row md:items-end md:justify-between'>
        <div className='min-w-0 flex-1'>
          <p className='text-sm text-steel-400'>Rank</p>
          <p className='font-display text-5xl font-extrabold leading-none text-steel-100 sm:text-6xl'>{rank.name}</p>
          <p className='mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1'>
            <span className='font-display text-3xl font-bold text-amber-300 tabular-nums'>{xp} XP</span>
            <span className='text-sm text-steel-400'>
              {passedCount} of {written.length} lessons passed
            </span>
          </p>
          <div className='mt-3 max-w-md'>
            <div
              role='meter'
              aria-label={next ? `Progress to ${next.name}` : 'Top rank'}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(thresholdFraction * 100)}
              aria-valuetext={milestone}
              className='h-2 overflow-hidden rounded-full bg-steel-800'
            >
              <div
                className='h-full rounded-full bg-gradient-to-r from-ember-500 via-molten-500 to-amber-300 transition-[width] duration-700 ease-out motion-reduce:transition-none'
                style={{ width: `${thresholdFraction * 100}%` }}
              />
            </div>
            <p className='mt-2 text-sm text-steel-300'>{milestone}</p>
          </div>
        </div>

        <div className='flex flex-col gap-4 md:items-end'>
          <div className='flex items-center gap-3'>
            <FlameIcon lit={streak > 0} />
            <div>
              <p className='font-display text-2xl font-bold leading-none text-steel-100'>
                {streak > 0 ? `${streak}-day streak` : 'No streak yet'}
              </p>
              <p className='mt-1 text-xs text-steel-400'>
                {streak > 0 ? 'Check your code once a day to keep it' : 'Check your code today to start one'}
              </p>
            </div>
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}
