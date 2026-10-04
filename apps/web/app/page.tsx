import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button';
import { LESSONS } from '@/lib/curriculum/lessons';

export default function HomePage() {
  return (
    <main className='relative'>
      <section className='heat-glow flex min-h-[calc(100dvh-3.5rem)] flex-col justify-center'>
        <div className='forge-container'>
          <h1 className='font-display text-6xl font-extrabold leading-none text-steel-100 sm:text-8xl'>
            Forge your first Rust smart contract
          </h1>
          <p className='mt-6 max-w-xl text-lg text-steel-300'>
            Write Arbitrum Stylus contracts in the browser, check them line by line and claim a soul-bound certificate
            on-chain for every lesson you finish.
          </p>
          <Link href='/learn' className={buttonClasses('heat', 'lg', 'mt-10')}>
            Start the first lesson
          </Link>
        </div>
      </section>
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
