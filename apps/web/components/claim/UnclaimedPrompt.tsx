'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LESSONS } from '@/lib/curriculum/lessons';
import { useCompletedLessons } from '@/lib/progress/progress';
import { useClaimedLessons } from '@/lib/useClaimedLessons';

/**
 * Lessons passed in this browser but not claimed by the connected wallet, so local progress and
 * on-chain certificates converge. The current lesson page has its own claim panel and is skipped.
 */
export function UnclaimedPrompt() {
  const pathname = usePathname();
  const passed = useCompletedLessons();
  const onChain = useClaimedLessons();

  if (!onChain) {
    return null;
  }
  const unclaimed = LESSONS.filter(
    (lesson) => passed.includes(lesson.id) && onChain.unclaimed.has(lesson.id) && pathname !== `/learn/${lesson.slug}`,
  );
  if (unclaimed.length === 0) {
    return null;
  }

  return (
    <aside aria-label='Unclaimed certificates' className='border-b border-quench-700/60 bg-quench-700/15'>
      <div className='forge-container flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5 text-sm'>
        <p className='font-semibold text-quench-300'>
          Claim your certificate{unclaimed.length > 1 ? 's' : ''}
        </p>
        <p className='text-steel-300'>You passed these lessons but their certificates are not in your wallet yet:</p>
        <ul className='flex flex-wrap gap-2'>
          {unclaimed.map((lesson) => (
            <li key={lesson.id}>
              <Link
                href={`/learn/${lesson.slug}`}
                className='rounded-[var(--radius-forge)] border border-quench-500/60 px-2.5 py-1 font-medium text-quench-300 hover:bg-quench-500/15'
              >
                {lesson.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
