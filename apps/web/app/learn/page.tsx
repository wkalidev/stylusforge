import Link from 'next/link';
import { LESSONS } from '@/lib/curriculum/lessons';

export default function LearnPage() {
  return (
    <main className='mx-auto max-w-4xl px-4 py-16 sm:px-6'>
      <h1 className='font-display text-5xl font-extrabold'>Lessons</h1>
      <p className='mt-2 mb-12 text-steel-300'>Learn Arbitrum Stylus smart contracts step by step.</p>
      <ol className='space-y-3'>
        {LESSONS.map((lesson) => {
          const content = (
            <>
              <div className='flex items-center gap-4'>
                <span className='font-display text-3xl font-bold text-steel-600'>{lesson.id}</span>
                <div>
                  <p className='font-semibold'>{lesson.title}</p>
                  <p className='text-sm text-steel-400'>{lesson.difficulty}</p>
                </div>
              </div>
              <span className={lesson.available ? 'font-semibold text-amber-300' : 'text-steel-400'}>
                {lesson.available ? `${lesson.xp} XP` : 'Soon'}
              </span>
            </>
          );
          return (
            <li key={lesson.id}>
              {lesson.available ? (
                <Link
                  href={`/learn/${lesson.slug}`}
                  className='steel-surface flex items-center justify-between gap-4 p-5 transition-colors hover:border-molten-500'
                >
                  {content}
                </Link>
              ) : (
                <div className='steel-surface flex items-center justify-between gap-4 p-5 opacity-60'>{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
