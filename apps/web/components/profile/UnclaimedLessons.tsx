'use client';

import Link from 'next/link';
import { ClaimCertificate } from '@/components/claim/ClaimCertificate';
import { buttonClasses } from '@/components/ui/button';
import type { Lesson } from '@/lib/curriculum/lessons';
import { validateCode } from '@/lib/curriculum/validate';
import { useSavedCode } from '@/lib/progress/code';

/**
 * The claim of one lesson, with the code saved for it in this browser (the server re-validates
 * it before signing). Without saved code that still passes, the student reopens the lesson.
 */
function LessonClaim({ lesson }: { lesson: Lesson }) {
  const code = useSavedCode(lesson.id);
  const passing = Boolean(lesson.available && code !== null && validateCode(code, lesson.exercise.checks).passed);
  if (!passing || code === null) {
    return (
      <>
        <span className='text-sm text-steel-400'>Your passing code is no longer saved here.</span>
        <Link href={`/learn/${lesson.slug}`} className={buttonClasses('steel', 'md')}>
          Open lesson
        </Link>
      </>
    );
  }
  return <ClaimCertificate lessonId={lesson.id} code={code} />;
}

/** Lessons passed in this browser whose certificate the connected wallet does not own yet. */
export function UnclaimedLessons({ lessons }: { lessons: Lesson[] }) {
  return (
    <section aria-labelledby='unclaimed-heading'>
      <h2 id='unclaimed-heading' className='font-display text-3xl font-bold'>
        Ready to claim <span className='text-steel-400'>{lessons.length}</span>
      </h2>
      <p className='mt-1 mb-6 text-steel-400'>You passed these lessons in this browser; their certificates are not in your wallet yet.</p>
      <ul className='space-y-3'>
        {lessons.map((lesson) => (
          <li key={lesson.id} className='steel-surface flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4'>
            <div>
              <p className='font-display text-2xl font-bold leading-tight text-steel-100'>{lesson.title}</p>
              <p className='text-sm text-amber-300'>{lesson.xp} XP</p>
            </div>
            <div className='flex flex-wrap items-center justify-end gap-2'>
              <LessonClaim lesson={lesson} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
