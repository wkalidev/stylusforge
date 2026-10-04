'use client';

import type { CheckResult } from '@/lib/curriculum/validate';
import { revealNextHint, useRevealedHints } from '@/lib/progress/hints';
import { InlineCode } from './InlineCode';

/**
 * The lesson checks as live objectives, re-evaluated as the student types. They are guidance
 * only: "Check my code" stays the validation that records progress. A failing objective reveals its
 * hints one at a time, from a nudge to the exact code; revealed hints are saved per lesson.
 *
 * - panel: a card at the top of the explanation (lg and up);
 * - compact: a collapsible summary above the editor (below lg, in the Code tab).
 */
export function Objectives({
  lessonId,
  results,
  variant,
}: {
  lessonId: number;
  results: CheckResult[];
  variant: 'panel' | 'compact';
}) {
  const revealed = useRevealedHints(lessonId);
  const met = results.filter((result) => result.passed).length;
  const list = (
    <ul className='space-y-1.5'>
      {results.map((result, index) => (
        <li key={index} className='flex items-start gap-2.5 text-sm'>
          <span
            aria-hidden='true'
            className={
              'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border transition-[background-color,border-color,box-shadow] duration-500 motion-reduce:transition-none ' +
              (result.passed
                ? 'border-amber-300 bg-gradient-to-b from-amber-300 to-molten-500 shadow-[0_0_10px_var(--color-molten-500)]'
                : 'border-steel-600 bg-steel-850')
            }
          />
          <div className='min-w-0 flex-1'>
            <span className={'transition-colors duration-500 motion-reduce:transition-none ' + (result.passed ? 'text-steel-100' : 'text-steel-400')}>
              <span className='sr-only'>{result.passed ? 'Done: ' : 'To do: '}</span>
              {result.check.objective}
            </span>
            {!result.passed && <ObjectiveHints lessonId={lessonId} checkIndex={index} hints={result.check.hints} revealed={revealed[index] ?? 0} />}
          </div>
        </li>
      ))}
    </ul>
  );
  const fraction = results.length ? met / results.length : 0;
  const heading = (
    <span className='flex items-center gap-3'>
      <span className='font-display text-xl font-bold text-steel-100'>Objectives</span>
      <span className={'text-sm tabular-nums ' + (met === results.length ? 'text-amber-300' : 'text-steel-400')} aria-live='polite'>
        {met}/{results.length}
      </span>
      <span aria-hidden='true' className='h-1 flex-1 overflow-hidden rounded-full bg-steel-800'>
        <span
          className='block h-full rounded-full bg-gradient-to-r from-ember-500 via-molten-500 to-amber-300 transition-[width] duration-500 motion-reduce:transition-none'
          style={{ width: `${fraction * 100}%` }}
        />
      </span>
    </span>
  );

  if (variant === 'compact') {
    return (
      <details className='steel-surface px-4 py-2.5 lg:hidden'>
        <summary className='cursor-pointer list-none [&::-webkit-details-marker]:hidden'>{heading}</summary>
        <div className='mt-2'>{list}</div>
      </details>
    );
  }
  return (
    <section aria-label='Objectives' className='steel-surface mb-8 hidden p-4 lg:block'>
      <div className='mb-3'>{heading}</div>
      {list}
    </section>
  );
}

/** The revealed hints of a failing objective and a button revealing the next one. */
function ObjectiveHints({
  lessonId,
  checkIndex,
  hints,
  revealed,
}: {
  lessonId: number;
  checkIndex: number;
  hints: string[];
  revealed: number;
}) {
  const shown = hints.slice(0, revealed);
  return (
    <>
      {shown.length > 0 && (
        <ol className='mt-1.5 space-y-1 text-[13px] leading-relaxed text-steel-300'>
          {shown.map((hint, index) => (
            <li key={index}>
              <span className='font-semibold text-amber-300'>Hint {index + 1}: </span>
              <InlineCode text={hint} />
            </li>
          ))}
        </ol>
      )}
      {revealed < hints.length && (
        <button
          type='button'
          onClick={() => revealNextHint(lessonId, checkIndex, hints.length)}
          className='mt-1 block text-xs font-semibold text-amber-300/90 underline-offset-4 hover:text-amber-300 hover:underline'
        >
          {revealed === 0 ? 'Show a hint' : 'Next hint'}
          <span className='text-steel-400'>
            {' '}
            ({revealed + 1}/{hints.length})
          </span>
        </button>
      )}
    </>
  );
}
