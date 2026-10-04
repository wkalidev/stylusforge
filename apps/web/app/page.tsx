import Link from 'next/link';
import { LESSONS } from '@/lib/curriculum/lessons';

export default function HomePage() {
  return (
    <main className='min-h-screen bg-gray-950 text-white'>
      <section className='flex flex-col items-center justify-center min-h-screen text-center px-4'>
        <h1 className='text-6xl font-black mb-6 text-purple-400'>
          StylusForge
        </h1>
        <p className='text-xl text-gray-400 max-w-2xl mb-12'>
          The first interactive IDE to learn Arbitrum Stylus smart contracts in Rust.
        </p>
        <Link href='/learn' className='bg-purple-600 hover:bg-purple-700 px-8 py-4 rounded-xl font-bold text-lg transition'>
          Start learning
        </Link>
      </section>
      <section className='max-w-4xl mx-auto py-20 px-4'>
        <h2 className='text-3xl font-bold mb-8'>Curriculum</h2>
        <div className='space-y-4'>
          {LESSONS.map((lesson) => (
            <div key={lesson.id} className='flex items-center justify-between bg-gray-900 rounded-xl p-6 border border-gray-800'>
              <div className='flex items-center gap-4'>
                <span className='text-3xl font-black text-gray-700'>
                  {String(lesson.id).padStart(2, '0')}
                </span>
                <div>
                  <p className='font-bold'>{lesson.title}</p>
                  <p className='text-gray-400 text-sm'>{lesson.difficulty}</p>
                </div>
              </div>
              <span className='text-yellow-400 font-bold'>{lesson.xp} XP</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
