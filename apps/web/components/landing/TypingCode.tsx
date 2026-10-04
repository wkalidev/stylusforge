'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { highlightRust, sliceTokens, type TokenKind } from '@/lib/highlightRust';
import { usePrefersReducedMotion } from '@/lib/hooks/useMediaQuery';

const TOKEN_CLASS: Record<TokenKind, string> = {
  comment: 'text-steel-400 italic',
  string: 'text-amber-300',
  attribute: 'text-molten-300',
  keyword: 'text-molten-400',
  type: 'text-quench-300',
  macro: 'text-molten-300',
  number: 'text-amber-400',
  plain: 'text-steel-100',
};

/** Milliseconds per character: fast enough to finish while the section is read. */
const TYPING_DELAY = 22;

/**
 * A code panel that types its snippet once it scrolls into view. Screen readers get the whole
 * snippet at once; with reduced motion it appears complete.
 */
export function TypingCode({ code, filename }: { code: string; filename: string }) {
  const tokens = useMemo(() => highlightRust(code), [code]);
  const reducedMotion = usePrefersReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    const element = panel.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || reducedMotion || typed >= code.length) return;
    const timer = window.setTimeout(() => setTyped((count) => count + 1), TYPING_DELAY);
    return () => window.clearTimeout(timer);
  }, [visible, reducedMotion, typed, code.length]);

  const shown = reducedMotion ? tokens : sliceTokens(tokens, typed);
  const done = reducedMotion || typed >= code.length;

  return (
    <div ref={panel} className='steel-surface overflow-hidden shadow-[0_30px_80px_-40px_var(--color-molten-500)]'>
      <div className='flex items-center justify-between border-b border-steel-700 px-4 py-2.5'>
        <span className='font-mono text-xs text-steel-400'>{filename}</span>
        <span className={'text-xs ' + (done ? 'text-amber-300' : 'text-steel-400')}>{done ? 'Ready to check' : 'Typing'}</span>
      </div>
      <pre className='sr-only'>{code}</pre>
      <pre aria-hidden='true' className='min-h-[22rem] overflow-x-auto p-4 font-mono text-[13px] leading-relaxed sm:p-5 sm:text-sm'>
        <code>
          {shown.map((token, index) => (
            <span key={index} className={TOKEN_CLASS[token.kind]}>
              {token.text}
            </span>
          ))}
          <span className='ml-px inline-block h-[1.1em] w-[0.55ch] translate-y-[0.15em] bg-amber-300 motion-safe:animate-pulse' />
        </code>
      </pre>
    </div>
  );
}
