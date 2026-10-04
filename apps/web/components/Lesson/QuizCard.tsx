'use client';

import { useId, useState } from 'react';
import { buttonClasses } from '@/components/ui/button';
import type { LessonQuiz } from '@/lib/curriculum/steps';

/** An optional question between steps: instant feedback with an explanation, never blocking. */
export function QuizCard({ quiz }: { quiz: LessonQuiz }) {
  const name = useId();
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const correct = checked && choice === quiz.answer;

  return (
    <form
      className='steel-surface mt-8 p-4'
      onSubmit={(event) => {
        event.preventDefault();
        if (choice !== null) setChecked(true);
      }}
    >
      <fieldset>
        <legend className='mb-3 flex flex-wrap items-baseline gap-x-2'>
          <span className='font-display text-xl font-bold text-amber-300'>Quick check</span>
          <span className='text-xs text-steel-400'>Optional</span>
        </legend>
        <p className='mb-3 text-steel-100'>{quiz.question}</p>
        <div className='space-y-2'>
          {quiz.options.map((option, index) => {
            const selected = choice === index;
            const state = checked && selected ? (index === quiz.answer ? 'right' : 'wrong') : null;
            return (
              <label
                key={option}
                className={
                  'flex cursor-pointer items-start gap-3 rounded-[var(--radius-forge)] border px-3 py-2 text-sm transition-colors motion-reduce:transition-none ' +
                  (state === 'right'
                    ? 'border-molten-500 bg-molten-500/10 text-steel-100'
                    : state === 'wrong'
                      ? 'border-ember-500/70 bg-ember-500/10 text-steel-100'
                      : selected
                        ? 'border-amber-300/70 text-steel-100'
                        : 'border-steel-700 text-steel-300 hover:border-steel-600')
                }
              >
                <input
                  type='radio'
                  name={name}
                  checked={selected}
                  onChange={() => {
                    setChoice(index);
                    setChecked(false);
                  }}
                  className='mt-0.5 accent-molten-500'
                />
                <span className='font-mono text-[0.85rem]'>{option}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className='mt-3 flex flex-wrap items-center gap-3'>
        <button type='submit' disabled={choice === null} className={buttonClasses('steel', 'md')}>
          Check answer
        </button>
        <p aria-live='polite' className='text-sm'>
          {checked && (correct ? <span className='font-semibold text-amber-300'>Right.</span> : <span className='font-semibold text-molten-300'>Not quite.</span>)}
        </p>
      </div>
      {checked && <p className='mt-2 text-sm text-steel-300'>{quiz.explanation}</p>}
    </form>
  );
}
