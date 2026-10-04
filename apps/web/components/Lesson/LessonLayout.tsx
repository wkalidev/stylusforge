'use client';
import { useState } from 'react';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import { getLesson } from '@/lib/curriculum/lessons';
import { validateCode } from '@/lib/curriculum/validate';
import { LessonMarkdown } from './LessonMarkdown';

export function LessonLayout({ slug }: { slug: string }) {
  const lesson = getLesson(slug);
  const exercise = lesson?.exercise;
  const [code, setCode] = useState(exercise?.starterCode ?? '');
  const [completed, setCompleted] = useState(false);
  const [hints, setHints] = useState<string[]>([]);

  if (!lesson || !exercise) {
    return (
      <div className='min-h-screen bg-gray-950 text-white flex items-center justify-center'>
        <p className='text-gray-400'>Lesson not found</p>
      </div>
    );
  }

  const checkCode = () => {
    const result = validateCode(code, exercise.checks);
    setCompleted(result.passed);
    setHints(result.hints);
  };

  return (
    <div className='min-h-screen bg-gray-950 text-white flex flex-col'>
      <div className='border-b border-gray-800 px-6 py-4 flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Link href='/learn' className='text-gray-400 hover:text-white text-sm'>← Back</Link>
          <span className='text-gray-600'>|</span>
          <h1 className='font-bold'>{lesson.title}</h1>
          <span className='text-xs bg-gray-800 px-2 py-1 rounded text-gray-400'>{lesson.difficulty}</span>
        </div>
        <span className='text-yellow-400 font-bold'>⚡ {lesson.xp} XP</span>
      </div>
      <div className='flex flex-1 overflow-hidden'>
        <div className='w-1/2 overflow-y-auto p-8 border-r border-gray-800'>
          <LessonMarkdown>{exercise.explanation}</LessonMarkdown>
        </div>
        <div className='w-1/2 flex flex-col p-4 gap-4'>
          <div className='flex-1 rounded-lg overflow-hidden border border-gray-700'>
            <Editor
              height="100%"
              language="rust"
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val ?? '')}
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
              }}
            />
          </div>
          {hints.length > 0 && (
            <div className='bg-yellow-900/30 border border-yellow-600 rounded p-4'>
              <p className='text-yellow-400 font-bold mb-2'>💡 Hints</p>
              {hints.map((h, i) => <p key={i} className='text-yellow-200 text-sm'>→ {h}</p>)}
            </div>
          )}
          {completed && (
            <div className='bg-green-900/30 border border-green-600 rounded p-4 text-center'>
              <p className='text-green-400 font-bold text-lg'>✅ Lesson completed! +{lesson.xp} XP</p>
            </div>
          )}
          <button
            onClick={checkCode}
            className='bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold transition'
          >
            Check my code
          </button>
        </div>
      </div>
    </div>
  );
}