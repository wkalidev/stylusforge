'use client';

import Link from 'next/link';
import type { SkillNode } from '@/lib/progress/skillTree';

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

/** A lesson on the path: what you build, how long it takes and where you stand. */
export function LessonCard({ node, badges }: { node: SkillNode; badges?: React.ReactNode }) {
  const { lesson, state } = node;
  const tone =
    state === 'completed'
      ? 'steel-surface ember-edge'
      : state === 'available'
        ? 'steel-surface border-amber-300/70 shadow-[0_18px_50px_-28px_var(--color-molten-500)]'
        : 'steel-surface opacity-75';
  const body = (
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
        <span
          className={
            state === 'completed' ? 'font-semibold text-amber-300' : state === 'available' ? 'font-semibold text-steel-100' : 'text-steel-400'
          }
        >
          {statusText(node)}
        </span>
        {badges}
      </div>
    </>
  );
  const className = `${tone} block p-5 transition-colors`;
  return lesson.available ? (
    <Link href={`/learn/${lesson.slug}`} className={`${className} hover:border-molten-500`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
