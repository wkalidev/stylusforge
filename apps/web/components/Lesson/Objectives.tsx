'use client';

import type { CheckResult } from '@/lib/curriculum/validate';

/**
 * The lesson checks as live objectives, re-evaluated as the student types. They are guidance
 * only: "Check my code" stays the validation that records progress.
 *
 * - panel: a card at the top of the explanation (lg and up);
 * - compact: a collapsible summary above the editor (below lg, in the Code tab).
 */
export function Objectives({ results, variant }: { results: CheckResult[]; variant: 'panel' | 'compact' }) {
  const met = results.filter((result) => result.passed).length;
  const list = (
    <ul className='space-y-1.5'>
      {results.map((result) => (
        <li key={result.check.hint} className='flex items-start gap-2.5 text-sm'>
          <span
            aria-hidden='true'
            className={
              'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ' +
              (result.passed ? 'bg-molten-500' : 'border border-steel-600')
            }
          />
          <span className={result.passed ? 'text-steel-100' : 'text-steel-400'}>
            <span className='sr-only'>{result.passed ? 'Done: ' : 'To do: '}</span>
            {result.check.hint}
          </span>
        </li>
      ))}
    </ul>
  );
  const heading = (
    <span className='flex items-center gap-2'>
      <span className='font-display text-xl font-bold text-steel-100'>Objectives</span>
      <span className='text-sm text-steel-400 tabular-nums' aria-live='polite'>
        {met}/{results.length}
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
