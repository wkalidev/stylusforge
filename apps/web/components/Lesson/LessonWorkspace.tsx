'use client';
import { useState } from 'react';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import { ClaimCertificate } from '@/components/claim/ClaimCertificate';
import { SparkBurst } from '@/components/feedback/SparkBurst';
import { LessonXpBar } from '@/components/progress/LessonXpBar';
import { buttonClasses } from '@/components/ui/button';
import { LESSONS, type Lesson } from '@/lib/curriculum/lessons';
import { validateCode } from '@/lib/curriculum/validate';
import { resetCode, saveCode, useSavedCode } from '@/lib/progress/code';
import { markLessonCompleted, useCompletedLessons } from '@/lib/progress/progress';
import { playAnvilStrike } from '@/lib/sound/anvil';
import { isSoundEnabled } from '@/lib/sound/preference';
import { LessonMarkdown } from './LessonMarkdown';
import { FORGE_EDITOR_THEME, defineForgeEditorTheme } from './forgeEditorTheme';

export type AvailableLesson = Extract<Lesson, { available: true }>;

/** The workspace of an available lesson: explanation, editor, checks and the claim. */
export function LessonWorkspace({ lesson }: { lesson: AvailableLesson }) {
  const { exercise } = lesson;
  const savedCode = useSavedCode(lesson.id);
  const code = savedCode ?? exercise.starterCode;
  const [completed, setCompleted] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [strikes, setStrikes] = useState(0);
  const completedIds = useCompletedLessons();

  const passed = completedIds.includes(lesson.id);
  const index = LESSONS.findIndex((candidate) => candidate.id === lesson.id);
  const next = LESSONS[index + 1];

  const checkCode = () => {
    const result = validateCode(code, exercise.checks);
    setCompleted(result.passed);
    setHints(result.hints);
    if (result.passed) {
      markLessonCompleted(lesson.id);
      setStrikes((count) => count + 1);
      if (isSoundEnabled()) {
        playAnvilStrike();
      }
    }
  };

  const resetToStarter = () => {
    resetCode(lesson.id);
    setCompleted(false);
    setHints([]);
  };

  return (
    <div className='flex flex-col lg:h-[calc(100dvh-3.5rem)]'>
      <div className='border-b border-steel-800'>
        <div className='flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6'>
          <div className='flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1'>
            <Link href='/learn' className='text-sm text-steel-400 hover:text-steel-100'>
              Lessons
            </Link>
            <span aria-hidden='true' className='text-steel-600'>/</span>
            <span
              aria-hidden='true'
              className={
                'flex h-8 w-8 items-center justify-center rounded-full font-display text-lg font-extrabold ' +
                (passed
                  ? 'bg-gradient-to-b from-amber-300 via-molten-500 to-ember-700 text-steel-950'
                  : 'border-2 border-amber-300 text-amber-300')
              }
            >
              {lesson.id}
            </span>
            <h1 className='font-display text-3xl font-bold leading-none'>{lesson.title}</h1>
            <span className='rounded-[var(--radius-forge)] bg-steel-800 px-2 py-0.5 text-xs text-steel-300'>{lesson.difficulty}</span>
            {passed && (
              <span className='rounded-[var(--radius-forge)] bg-molten-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300'>
                Passed
              </span>
            )}
          </div>
          <LessonXpBar lessonId={lesson.id} lessonXp={lesson.xp} />
        </div>
      </div>

      <div className='flex flex-1 flex-col lg:flex-row lg:overflow-hidden'>
        <article className='border-b border-steel-800 p-6 sm:p-8 lg:w-1/2 lg:overflow-y-auto lg:border-r lg:border-b-0 xl:px-12'>
          <div className='mx-auto max-w-2xl'>
            <LessonMarkdown>{exercise.explanation}</LessonMarkdown>
          </div>
        </article>

        <div className='flex flex-col gap-4 p-4 sm:p-5 lg:w-1/2 lg:overflow-y-auto'>
          <div className='flex h-[60vh] min-h-72 flex-col overflow-hidden rounded-[var(--radius-forge)] border border-steel-700 bg-steel-950 lg:h-auto lg:flex-1'>
            <div className='ember-edge flex items-center justify-between border-b border-steel-800 bg-steel-900 px-4 py-2'>
              <span className='font-mono text-xs text-steel-300'>src/lib.rs</span>
              <span className='text-xs text-steel-400'>{savedCode === null ? 'Starter code' : 'Saved in this browser'}</span>
            </div>
            <div className='min-h-0 flex-1'>
              <Editor
                height='100%'
                language='rust'
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
                  padding: { top: 12 },
                }}
              />
            </div>
          </div>

          {hints.length > 0 && (
            <div role='status' className='steel-surface ember-edge p-4'>
              <p className='mb-2 font-semibold text-amber-300'>Not there yet</p>
              <ul className='list-disc space-y-1 pl-5 text-sm text-steel-300'>
                {hints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            </div>
          )}
          {passed && (
            <div role='status' className='steel-surface ember-edge flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3'>
              <p className='font-display text-2xl font-bold leading-none text-amber-300'>
                {completed ? `Forged: +${lesson.xp} XP` : 'Passed'}
              </p>
              <div className='ml-auto flex flex-wrap items-center justify-end gap-2'>
                <ClaimCertificate lessonId={lesson.id} code={code} />
                {next?.available && (
                  <Link href={`/learn/${next.slug}`} className={buttonClasses('steel', 'md')} aria-label={`Next lesson: ${next.title}`}>
                    <span>
                      Next<span className='hidden sm:inline'> lesson</span>
                    </span>
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className='flex gap-3'>
            <button type='button' onClick={resetToStarter} disabled={savedCode === null} className={buttonClasses('steel', 'lg')}>
              Reset code
            </button>
            <div className='relative flex-1'>
              <button type='button' onClick={checkCode} className={buttonClasses('heat', 'lg', 'w-full')}>
                Check my code
              </button>
              <SparkBurst trigger={strikes} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
