'use client';

import { useCompletedLessons, useLocalXp } from '@/lib/progress/progress';
import { rankProgress } from '@/lib/progress/ranks';

/**
 * Rank progress with the reward of the current lesson: a ghost segment shows the XP it will add
 * until the lesson is passed, then the bar fills to include it.
 */
export function LessonXpBar({ lessonId, lessonXp }: { lessonId: number; lessonXp: number }) {
  const xp = useLocalXp();
  const passed = useCompletedLessons().includes(lessonId);
  const now = rankProgress(xp);
  const after = rankProgress(xp + lessonXp);
  const rankUp = !passed && after.rank.name !== now.rank.name;
  const ghostEnd = passed ? now.fraction : rankUp ? 1 : after.fraction;

  const caption = passed
    ? `Passed: ${lessonXp} XP earned`
    : rankUp
      ? `Pass to earn ${lessonXp} XP and become ${after.rank.name}`
      : `Pass to earn ${lessonXp} XP`;

  return (
    <div className='flex min-w-0 items-center gap-3'>
      <span className='font-display text-2xl font-bold leading-none text-amber-300 tabular-nums'>+{lessonXp} XP</span>
      <div className='flex min-w-0 flex-col gap-1'>
        <div
          role='meter'
          aria-label={`Rank ${now.rank.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(now.fraction * 100)}
          aria-valuetext={`${xp} XP. ${caption}.`}
          className='relative h-2 w-36 overflow-hidden rounded-full bg-steel-800 sm:w-48'
        >
          <div
            className='absolute inset-y-0 left-0 rounded-full bg-molten-500/25 ring-1 ring-molten-500/50 ring-inset'
            style={{ width: `${ghostEnd * 100}%` }}
          />
          <div
            className='absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-ember-500 via-molten-500 to-amber-300 transition-[width] duration-700 ease-out motion-reduce:transition-none'
            style={{ width: `${now.fraction * 100}%` }}
          />
        </div>
        <span className='truncate text-xs text-steel-400'>{caption}</span>
      </div>
    </div>
  );
}
