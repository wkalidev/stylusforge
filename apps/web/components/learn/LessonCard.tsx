'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '@/lib/hooks/useMediaQuery';
import type { SkillNode } from '@/lib/progress/skillTree';
import { useCardTilt } from './useCardTilt';

export function statusText(node: SkillNode): string {
  if (node.state === 'completed') return 'Passed';
  if (node.state === 'available') return 'Ready to start';
  return node.unlockedBy ? `Pass ${node.unlockedBy.title} to unlock` : 'Coming soon';
}

/** Difficulty, objective count and estimated time, joined with dots. */
function details(node: SkillNode): string {
  const { lesson } = node;
  const parts = [lesson.difficulty];
  if (lesson.available) {
    const count = lesson.exercise.checks.length;
    parts.push(`${count} ${count === 1 ? 'objective' : 'objectives'}`);
  }
  parts.push(`~${lesson.minutes} min`);
  return parts.join(' · ');
}

/**
 * The certificate state of a lesson: claimed (owned by the connected wallet, wherever it was
 * passed) or unclaimed (passed here, and not owned or unknown without a wallet). Null otherwise.
 */
export type CertificateState = 'claimed' | 'unclaimed' | null;

function CertificateBadge({ state }: { state: CertificateState }) {
  if (state === 'claimed') {
    return (
      <span className='inline-flex items-center gap-1.5 rounded-[var(--radius-forge)] border border-quench-500/60 px-2 py-0.5 text-xs font-semibold text-quench-300 quench-edge'>
        <svg viewBox='0 0 12 12' className='h-3 w-3' aria-hidden='true'>
          <path d='M2.5 6.2 5 8.5l4.5-5' fill='none' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' />
        </svg>
        Certificate on-chain
      </span>
    );
  }
  if (state === 'unclaimed') {
    return (
      <span className='rounded-[var(--radius-forge)] border border-dashed border-quench-500/60 px-2 py-0.5 text-xs font-semibold text-quench-300'>
        Claim your certificate
      </span>
    );
  }
  return null;
}

const SHAKE: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-7px)' },
  { transform: 'translateX(6px)' },
  { transform: 'translateX(-4px)' },
  { transform: 'translateX(3px)' },
  { transform: 'translateX(0)' },
];

/** The message of a locked card once clicked. */
function lockedMessage(node: SkillNode): string {
  return node.unlockedBy ? `Pass ${node.unlockedBy.title} first` : 'Coming soon: this lesson is being written';
}

/**
 * A locked lesson: a click shakes the card (unless reduced motion) and says what to do first.
 * The lesson page itself stays reachable by URL.
 */
function LockedCard({
  node,
  className,
  renderBody,
}: {
  node: SkillNode;
  className: string;
  renderBody: (message: string | null) => React.ReactNode;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [nudged, setNudged] = useState(0);

  useEffect(() => {
    if (nudged === 0) return;
    const timer = window.setTimeout(() => setNudged(0), 2600);
    return () => window.clearTimeout(timer);
  }, [nudged]);

  return (
    <button
      type='button'
      onClick={(event) => {
        if (!reducedMotion) {
          event.currentTarget.animate(SHAKE, { duration: 420, easing: 'ease-out' });
        }
        setNudged((count) => count + 1);
      }}
      className={`${className} w-full cursor-not-allowed text-left`}
    >
      {renderBody(nudged > 0 ? lockedMessage(node) : null)}
      <span role='status' className='sr-only'>
        {nudged > 0 ? lockedMessage(node) : ''}
      </span>
    </button>
  );
}

/** A lesson on the path: what you build, how long it takes and where you stand. */
export function LessonCard({ node, certificate = null }: { node: SkillNode; certificate?: CertificateState }) {
  const { lesson, state } = node;
  const tilt = useCardTilt<HTMLAnchorElement>();
  const tone =
    state === 'completed'
      ? 'steel-surface ember-edge'
      : state === 'available'
        ? 'steel-surface border-amber-300/70 shadow-[0_18px_50px_-28px_var(--color-molten-500)]'
        : 'steel-surface opacity-75';
  const renderBody = (message: string | null = null) => (
    <>
      <div className='flex items-baseline justify-between gap-4'>
        <h3 className='font-display text-2xl font-bold leading-tight text-steel-100'>{lesson.title}</h3>
        <span className={'shrink-0 text-sm tabular-nums ' + (state === 'locked' ? 'text-steel-400' : 'font-semibold text-amber-300')}>
          {lesson.xp} XP
        </span>
      </div>
      <p className='mt-1 text-sm text-steel-300'>{lesson.preview}</p>
      <p className='mt-2 text-xs text-steel-400'>{details(node)}</p>
      <div className='mt-4 flex flex-wrap items-center gap-2 text-sm'>
        {message ? (
          <span className='font-semibold text-molten-300'>{message}</span>
        ) : (
          <span
            className={
              state === 'completed' ? 'font-semibold text-amber-300' : state === 'available' ? 'font-semibold text-steel-100' : 'text-steel-400'
            }
          >
            {statusText(node)}
          </span>
        )}
        <CertificateBadge state={certificate} />
      </div>
    </>
  );
  const className = `${tone} block p-5 transition-colors`;
  if (state === 'locked') {
    return (
      <LockedCard node={node} className={className} renderBody={renderBody} />
    );
  }
  return lesson.available ? (
    <div className='[perspective:900px]'>
      <Link
        href={`/learn/${lesson.slug}`}
        {...tilt.handlers}
        className={
          `${className} hover:border-molten-500 ` +
          (tilt.enabled
            ? 'transition-[transform,border-color] duration-200 ease-out [transform:rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))]'
            : '')
        }
      >
        {renderBody()}
      </Link>
    </div>
  ) : (
    <div className={className}>{renderBody()}</div>
  );
}
