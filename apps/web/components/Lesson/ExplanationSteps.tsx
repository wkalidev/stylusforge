'use client';

import { useMemo, useRef, useState } from 'react';
import { buttonClasses } from '@/components/ui/button';
import { splitSteps, type LessonQuiz } from '@/lib/curriculum/steps';
import { LessonMarkdown } from './LessonMarkdown';
import { QuizCard } from './QuizCard';

/**
 * The lesson explanation one step at a time, with a progress indicator, previous/next, and a
 * toggle to read every step at once. The last step leads to the editor.
 */
export function ExplanationSteps({
  explanation,
  quizzes = [],
  onOpenEditor,
}: {
  explanation: string;
  quizzes?: LessonQuiz[];
  onOpenEditor: () => void;
}) {
  const steps = useMemo(() => splitSteps(explanation), [explanation]);
  const [index, setIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const step = steps[index];
  const last = index === steps.length - 1;

  function goTo(next: number) {
    setIndex(next);
    // Move focus (and the scroll position) to the new step for keyboard and screen reader users.
    requestAnimationFrame(() => heading.current?.focus());
  }

  const toggle = (
    <button
      type='button'
      onClick={() => setShowAll((value) => !value)}
      aria-pressed={showAll}
      className='text-sm font-medium text-steel-300 underline-offset-4 hover:text-steel-100 hover:underline'
    >
      {showAll ? 'Show step by step' : 'Show all steps'}
    </button>
  );

  if (showAll) {
    return (
      <div>
        <div className='mb-6 flex justify-end'>{toggle}</div>
        {steps.map((item, position) => (
          <section key={item.title} className={position > 0 ? 'mt-10' : ''}>
            <h2 className='mb-4 font-display text-4xl font-bold'>{item.title}</h2>
            <LessonMarkdown>{item.body}</LessonMarkdown>
            {quizzes
              .filter((quiz) => quiz.afterStep === item.title)
              .map((quiz) => (
                <QuizCard key={quiz.question} quiz={quiz} />
              ))}
          </section>
        ))}
        <button type='button' onClick={onOpenEditor} className={buttonClasses('heat', 'lg', 'mt-6 w-full')}>
          Open the editor
        </button>
      </div>
    );
  }

  return (
    <div>
      <nav aria-label='Lesson steps' className='mb-6'>
        <div className='mb-2 flex items-center justify-between gap-4 text-sm'>
          <span className='text-steel-400'>
            Step <span className='font-semibold text-amber-300'>{index + 1}</span> of {steps.length}
          </span>
          {toggle}
        </div>
        <ol className='flex gap-1.5'>
          {steps.map((item, position) => (
            <li key={item.title} className='flex-1'>
              <button
                type='button'
                onClick={() => goTo(position)}
                aria-label={`Step ${position + 1}: ${item.title}`}
                aria-current={position === index ? 'step' : undefined}
                className={
                  'block h-1.5 w-full rounded-full transition-colors duration-300 motion-reduce:transition-none ' +
                  (position < index
                    ? 'bg-molten-500'
                    : position === index
                      ? 'bg-amber-300 shadow-[0_0_8px_var(--color-molten-500)]'
                      : 'bg-steel-800 hover:bg-steel-700')
                }
              />
            </li>
          ))}
        </ol>
      </nav>

      <section aria-labelledby='lesson-step-title'>
        <h2 id='lesson-step-title' ref={heading} tabIndex={-1} className='mb-4 scroll-mt-24 font-display text-4xl font-bold outline-none'>
          {step.title}
        </h2>
        <LessonMarkdown>{step.body}</LessonMarkdown>
        {quizzes
          .filter((quiz) => quiz.afterStep === step.title)
          .map((quiz) => (
            <QuizCard key={`${step.title}-${quiz.question}`} quiz={quiz} />
          ))}
      </section>

      <div className='mt-8 flex gap-3'>
        <button
          type='button'
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className={buttonClasses('steel', 'lg')}
        >
          Previous
        </button>
        {last ? (
          <button type='button' onClick={onOpenEditor} className={buttonClasses('heat', 'lg', 'flex-1')}>
            Open the editor
          </button>
        ) : (
          <button type='button' onClick={() => goTo(index + 1)} className={buttonClasses('heat', 'lg', 'flex-1')}>
            <span>Next: {steps[index + 1].title}</span>
          </button>
        )}
      </div>
    </div>
  );
}
