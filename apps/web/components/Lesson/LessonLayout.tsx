'use client';
import { useState } from 'react';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import { ClaimCertificate } from '@/components/claim/ClaimCertificate';
import { buttonClasses } from '@/components/ui/button';
import { getLesson } from '@/lib/curriculum/lessons';
import { validateCode } from '@/lib/curriculum/validate';
import { resetCode, saveCode, useSavedCode } from '@/lib/progress/code';
import { markLessonCompleted, useCompletedLessons } from '@/lib/progress/progress';
import { LessonMarkdown } from './LessonMarkdown';
import { FORGE_EDITOR_THEME, defineForgeEditorTheme } from './forgeEditorTheme';

export function LessonLayout({ slug }: { slug: string }) {
  const lesson = getLesson(slug);
  const exercise = lesson?.exercise;
  const savedCode = useSavedCode(lesson?.id ?? 0);
  const code = savedCode ?? exercise?.starterCode ?? '';
  const [completed, setCompleted] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const completedIds = useCompletedLessons();

  if (!lesson || !exercise) {
    return (
      <div className='flex min-h-[50vh] items-center justify-center'>
        <p className='text-steel-400'>Lesson not found</p>
      </div>
    );
  }

  const checkCode = () => {
    const result = validateCode(code, exercise.checks);
    setCompleted(result.passed);
    setHints(result.hints);
    if (result.passed) {
      markLessonCompleted(lesson.id);
    }
  };

  const resetToStarter = () => {
    resetCode(lesson.id);
    setCompleted(false);
    setHints([]);
  };

  return (
    <div className='flex flex-col lg:h-[calc(100dvh-3.5rem)]'>
      <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-steel-800 px-4 py-3 sm:px-6'>
        <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
          <Link href='/learn' className='text-sm text-steel-400 hover:text-steel-100'>Lessons</Link>
          <span aria-hidden='true' className='text-steel-600'>/</span>
          <h1 className='font-display text-2xl font-bold'>{lesson.title}</h1>
          <span className='rounded-[var(--radius-forge)] bg-steel-800 px-2 py-0.5 text-xs text-steel-300'>{lesson.difficulty}</span>
          {completedIds.includes(lesson.id) && (
            <span className='rounded-[var(--radius-forge)] bg-molten-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300'>Passed</span>
          )}
        </div>
        <span className='font-semibold text-amber-300'>{lesson.xp} XP</span>
      </div>
      <div className='flex flex-1 flex-col lg:flex-row lg:overflow-hidden'>
        <div className='border-b border-steel-800 p-6 sm:p-8 lg:w-1/2 lg:overflow-y-auto lg:border-r lg:border-b-0'>
          <LessonMarkdown>{exercise.explanation}</LessonMarkdown>
        </div>
        <div className='flex flex-col gap-4 p-4 lg:w-1/2'>
          <div className='h-[60vh] overflow-hidden rounded-[var(--radius-forge)] border border-steel-700 lg:h-auto lg:flex-1'>
            <Editor
              height="100%"
              language="rust"
              theme={FORGE_EDITOR_THEME}
              beforeMount={defineForgeEditorTheme}
              value={code}
              onChange={(val) => saveCode(lesson.id, val ?? '')}
              options={{
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
              }}
            />
          </div>
          {hints.length > 0 && (
            <div role='status' className='steel-surface ember-edge p-4'>
              <p className='mb-2 font-semibold text-amber-300'>Not there yet</p>
              <ul className='space-y-1 text-sm text-steel-300'>
                {hints.map((h) => <li key={h}>{h}</li>)}
              </ul>
            </div>
          )}
          {completed && (
            <div role='status' className='steel-surface ember-edge p-4 text-center'>
              <p className='text-lg font-semibold text-amber-300'>Lesson complete: +{lesson.xp} XP</p>
            </div>
          )}
          <ClaimCertificate lessonId={lesson.id} code={code} passed={completedIds.includes(lesson.id)} />
          <div className='flex gap-3'>
            <button
              type='button'
              onClick={resetToStarter}
              disabled={savedCode === null}
              className={buttonClasses('steel', 'lg')}
            >
              Reset code
            </button>
            <button type='button' onClick={checkCode} className={buttonClasses('heat', 'lg', 'flex-1')}>
              Check my code
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
