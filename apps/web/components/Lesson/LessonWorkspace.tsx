'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import { ClaimCertificate } from '@/components/claim/ClaimCertificate';
import { SparkBurst } from '@/components/feedback/SparkBurst';
import { LessonXpBar } from '@/components/progress/LessonXpBar';
import { buttonClasses } from '@/components/ui/button';
import { LESSONS, type Lesson } from '@/lib/curriculum/lessons';
import { evaluateChecks, validateCode } from '@/lib/curriculum/validate';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useIsApplePlatform } from '@/lib/hooks/usePlatform';
import { resetCode, saveCode, useSavedCode } from '@/lib/progress/code';
import { markLessonCompleted, useCompletedLessons } from '@/lib/progress/progress';
import { playAnvilStrike } from '@/lib/sound/anvil';
import { isSoundEnabled } from '@/lib/sound/preference';
import { LessonIngot } from './LessonIngot';
import { ExplanationSteps } from './ExplanationSteps';
import { Objectives } from './Objectives';
import { FORGE_EDITOR_THEME, defineForgeEditorTheme } from './forgeEditorTheme';
import { registerGlossaryHover } from './glossaryHover';
import { WorkspaceTabs, tabId, tabPanelId, type WorkspaceTab } from './WorkspaceTabs';

const beforeEditorMount: BeforeMount = (monaco) => {
  defineForgeEditorTheme(monaco);
  registerGlossaryHover(monaco);
};

export type AvailableLesson = Extract<Lesson, { available: true }>;

/** The workspace of an available lesson: explanation, editor, checks and the claim. */
export function LessonWorkspace({ lesson }: { lesson: AvailableLesson }) {
  const { exercise } = lesson;
  const savedCode = useSavedCode(lesson.id);
  const code = savedCode ?? exercise.starterCode;
  const [completed, setCompleted] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [strikes, setStrikes] = useState(0);
  const [tab, setTab] = useState<WorkspaceTab>('learn');
  const completedIds = useCompletedLessons();
  // Live objectives: the checks re-run on the code once typing pauses.
  const debouncedCode = useDebouncedValue(code, 300);
  const liveResults = useMemo(() => evaluateChecks(debouncedCode, exercise.checks), [debouncedCode, exercise.checks]);
  const metCount = liveResults.filter((result) => result.passed).length;

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

  // Ctrl+Enter / Cmd+Enter checks the code, from the editor or anywhere on the page.
  const checkRef = useRef(checkCode);
  useEffect(() => {
    checkRef.current = checkCode;
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.defaultPrevented) {
        event.preventDefault();
        checkRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const onEditorMount: OnMount = (editor, monaco) => {
    // Overrides Monaco's own Ctrl+Enter ("insert line below").
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => checkRef.current());
    editorRef.current = editor;
    monacoRef.current = monaco;
    setEditorReady(true);
  };

  // Inline diagnostics: each failing check underlines its anchor line, with the hint on hover.
  useEffect(() => {
    const monaco = monacoRef.current;
    const model = editorRef.current?.getModel();
    if (!editorReady || !monaco || !model) return;
    const markers = liveResults
      .filter((result) => !result.passed && result.line !== null && result.line <= model.getLineCount())
      .map((result) => {
        const line = result.line as number;
        return {
          severity: monaco.MarkerSeverity.Warning,
          source: 'Lesson check',
          message: result.check.hint,
          startLineNumber: line,
          startColumn: model.getLineFirstNonWhitespaceColumn(line) || 1,
          endLineNumber: line,
          endColumn: model.getLineMaxColumn(line),
        };
      });
    monaco.editor.setModelMarkers(model, 'stylusforge-checks', markers);
  }, [liveResults, editorReady]);
  const apple = useIsApplePlatform();

  // The editor sits next to the explanation from lg; below it lives in the Code tab.
  const openEditor = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      editorRef.current?.focus();
    } else {
      setTab('code');
      window.scrollTo({ top: 0 });
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
          <div className='flex items-center gap-3'>
            <LessonIngot
              heat={metCount / liveResults.length}
              label={`Forge heat: ${metCount} of ${liveResults.length} objectives met`}
            />
            <LessonXpBar lessonId={lesson.id} lessonXp={lesson.xp} />
          </div>
        </div>
      </div>

      <WorkspaceTabs active={tab} onChange={setTab} />

      <div className='flex flex-1 flex-col lg:flex-row lg:overflow-hidden'>
        <article
          id={tabPanelId('learn')}
          role='tabpanel'
          aria-labelledby={tabId('learn')}
          className={`${tab === 'learn' ? 'block' : 'hidden'} p-6 sm:p-8 lg:block lg:w-1/2 lg:overflow-y-auto lg:border-r lg:border-steel-800 xl:px-12`}
        >
          <div className='mx-auto max-w-2xl'>
            <Objectives results={liveResults} variant='panel' />
            <ExplanationSteps explanation={exercise.explanation} quizzes={exercise.quizzes} onOpenEditor={openEditor} />
          </div>
        </article>

        <div
          id={tabPanelId('code')}
          role='tabpanel'
          aria-labelledby={tabId('code')}
          className={`${tab === 'code' ? 'flex' : 'hidden'} flex-col gap-4 p-4 sm:p-5 lg:flex lg:w-1/2 lg:overflow-y-auto`}
        >
          <Objectives results={liveResults} variant='compact' />
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
                beforeMount={beforeEditorMount}
                onMount={onEditorMount}
                value={code}
                onChange={(val) => saveCode(lesson.id, val ?? '')}
                options={{
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
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
              <button
                type='button'
                onClick={checkCode}
                aria-keyshortcuts='Control+Enter Meta+Enter'
                className={buttonClasses('heat', 'lg', 'w-full')}
              >
                <span>Check my code</span>
                <kbd className='hidden rounded border border-steel-950/30 px-1.5 py-0.5 font-sans text-xs font-medium text-steel-950/70 sm:inline'>
                  {apple ? '⌘ Enter' : 'Ctrl Enter'}
                </kbd>
              </button>
              <SparkBurst trigger={strikes} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
