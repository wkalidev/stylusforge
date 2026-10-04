import Link from 'next/link';
import { LESSONS } from '@/lib/curriculum/lessons';

export default function LearnPage() {
  return (
    <main className='min-h-screen bg-gray-950 text-white px-4 py-16'>
      <div className='max-w-4xl mx-auto'>
        <Link href='/' className='text-gray-400 hover:text-white text-sm mb-8 inline-block'>
          Back to home
        </Link>
        <h1 className='text-4xl font-black mb-2'>Curriculum</h1>
        <p className='text-gray-400 mb-12'>Learn Arbitrum Stylus smart contracts step by step.</p>
        <div className='space-y-4'>
          {LESSONS.map((lesson) => (
            <div key={lesson.id} className='relative'>
              {lesson.available ? (
                <Link href={'/learn/' + lesson.slug} className='flex items-center justify-between bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-purple-600 transition group'>
                  <div className='flex items-center gap-4'>
                    <span className='text-3xl font-black text-gray-700 group-hover:text-purple-800 transition'>
                      {String(lesson.id).padStart(2, '0')}
                    </span>
                    <div>
                      <p className='font-bold'>{lesson.title}</p>
                      <p className='text-gray-400 text-sm'>{lesson.difficulty}</p>
                    </div>
                  </div>
                  <div className='flex items-center gap-4'>
                    <span className='text-yellow-400 font-bold'>{lesson.xp} XP</span>
                    <span className='bg-purple-600 text-white text-xs px-3 py-1 rounded-full'>Start</span>
                  </div>
                </Link>
              ) : (
                <div className='flex items-center justify-between bg-gray-900/50 rounded-xl p-6 border border-gray-800/50 opacity-50 cursor-not-allowed'>
                  <div className='flex items-center gap-4'>
                    <span className='text-3xl font-black text-gray-800'>
                      {String(lesson.id).padStart(2, '0')}
                    </span>
                    <div>
                      <p className='font-bold'>{lesson.title}</p>
                      <p className='text-gray-500 text-sm'>{lesson.difficulty}</p>
                    </div>
                  </div>
                  <div className='flex items-center gap-4'>
                    <span className='text-gray-600 font-bold'>{lesson.xp} XP</span>
                    <span className='bg-gray-700 text-gray-400 text-xs px-3 py-1 rounded-full'>Soon</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
