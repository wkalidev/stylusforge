import { Hero } from '@/components/landing/Hero';
import { LESSONS } from '@/lib/curriculum/lessons';

export default function HomePage() {
  return (
    <main className='relative'>
      <Hero />
      <section className='mx-auto max-w-4xl px-4 py-20 sm:px-6'>
        <h2 className='mb-8 font-display text-4xl font-bold'>Curriculum</h2>
        <ol className='space-y-3'>
          {LESSONS.map((lesson) => (
            <li key={lesson.id} className='steel-surface flex items-center justify-between gap-4 p-5'>
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
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
