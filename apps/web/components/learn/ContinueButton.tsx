'use client';

import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button';
import { LESSONS } from '@/lib/curriculum/lessons';
import { useLastLesson } from '@/lib/progress/lastLesson';
import { useCompletedLessons } from '@/lib/progress/progress';
import { continueTarget, skillTree } from '@/lib/progress/skillTree';

const LABELS = {
  resume: 'Continue where you left off',
  next: 'Continue with the next lesson',
  start: 'Start the first lesson',
} as const;

/** The call to action of the progress hero; hidden once every written lesson is passed. */
export function ContinueButton() {
  const passed = useCompletedLessons();
  const lastLessonId = useLastLesson();
  const target = continueTarget(skillTree(LESSONS, passed), lastLessonId);
  if (!target) {
    return <p className='text-sm text-amber-300'>Every written lesson is passed. New lessons are on the way.</p>;
  }
  return (
    <Link href={`/learn/${target.lesson.slug}`} className={buttonClasses('heat', 'lg')}>
      <span className='flex flex-col items-start leading-tight'>
        <span>{LABELS[target.kind]}</span>
        <span className='text-xs font-medium text-steel-950/70'>{target.lesson.title}</span>
      </span>
    </Link>
  );
}
