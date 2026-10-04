'use client';

import Link from 'next/link';
import { LESSONS } from '@/lib/curriculum/lessons';
import { useCompletedLessons } from '@/lib/progress/progress';
import { skillTree, type SkillNode } from '@/lib/progress/skillTree';
import { useClaimedLessons } from '@/lib/useClaimedLessons';

function LockIcon() {
  return (
    <svg viewBox='0 0 16 16' className='h-4 w-4' aria-hidden='true'>
      <path d='M4.5 7V5a3.5 3.5 0 0 1 7 0v2' fill='none' stroke='currentColor' strokeWidth='1.5' />
      <rect x='3' y='7' width='10' height='7' rx='1.5' fill='currentColor' />
    </svg>
  );
}

/** The node on the spine: molten when passed, a live amber ring when next, cold steel when locked. */
function Knot({ node }: { node: SkillNode }) {
  const base =
    'absolute top-1/2 left-6 z-10 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-display text-2xl font-extrabold md:left-1/2';
  if (node.state === 'completed') {
    return (
      <span
        aria-hidden='true'
        className={`${base} bg-gradient-to-b from-amber-300 via-molten-500 to-ember-700 text-steel-950 shadow-[0_0_24px_-2px_var(--color-molten-500)]`}
      >
        {node.lesson.id}
      </span>
    );
  }
  if (node.state === 'available') {
    return (
      <span aria-hidden='true' className={`${base} border-2 border-amber-300 bg-steel-900 text-amber-300`}>
        <span className='absolute inset-0 rounded-full border-2 border-amber-300 motion-safe:animate-ping motion-safe:[animation-duration:2.4s]' />
        {node.lesson.id}
      </span>
    );
  }
  return (
    <span aria-hidden='true' className={`${base} border border-steel-600 bg-steel-850 text-steel-400`}>
      <LockIcon />
    </span>
  );
}

function statusText(node: SkillNode): string {
  if (node.state === 'completed') return 'Passed';
  if (node.state === 'available') return 'Ready to start';
  return node.unlockedBy ? `Pass ${node.unlockedBy.title} to unlock` : 'Coming soon';
}

function NodeCard({ node, claimed }: { node: SkillNode; claimed: boolean }) {
  const { lesson, state } = node;
  const tone =
    state === 'completed'
      ? 'steel-surface ember-edge'
      : state === 'available'
        ? 'steel-surface border-amber-300/70 shadow-[0_18px_50px_-28px_var(--color-molten-500)]'
        : 'steel-surface opacity-70';
  const body = (
    <>
      <div className='flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1'>
        <h2 className='font-display text-2xl font-bold leading-tight text-steel-100'>{lesson.title}</h2>
        <span className={state === 'locked' ? 'text-sm text-steel-400' : 'text-sm font-semibold text-amber-300'}>
          {lesson.xp} XP
        </span>
      </div>
      <p className='mt-1 text-sm text-steel-400'>{lesson.difficulty}</p>
      <div className='mt-4 flex flex-wrap items-center gap-2 text-sm'>
        <span
          className={
            state === 'completed'
              ? 'font-semibold text-amber-300'
              : state === 'available'
                ? 'font-semibold text-steel-100'
                : 'text-steel-400'
          }
        >
          {statusText(node)}
        </span>
        {claimed && (
          <span className='rounded-[var(--radius-forge)] border border-quench-500/60 px-2 py-0.5 text-xs font-semibold text-quench-300'>
            Certificate on-chain
          </span>
        )}
      </div>
    </>
  );
  const className = `${tone} block p-5 transition-colors`;
  // Every written lesson stays reachable: the tree guides, it does not gate.
  return lesson.available ? (
    <Link href={`/learn/${lesson.slug}`} className={`${className} hover:border-molten-500`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** The curriculum as a path of connected nodes, heated along the lessons already passed. */
export function SkillTree() {
  const passed = useCompletedLessons();
  const onChain = useClaimedLessons();
  const nodes = skillTree(LESSONS, passed);

  return (
    <div>
      <ol aria-label='Skill tree' className='relative mt-10'>
        {nodes.map((node, index) => {
          const next = nodes[index + 1];
          const hot = node.state === 'completed' && next && next.state !== 'locked';
          const side = index % 2 === 0 ? 'md:pr-[calc(50%+2.5rem)]' : 'md:pl-[calc(50%+2.5rem)]';
          return (
            <li key={node.lesson.id} className={`relative py-5 pl-14 md:pl-0 ${side}`}>
              {next && (
                <span
                  aria-hidden='true'
                  className={
                    'absolute top-1/2 left-6 h-full -translate-x-1/2 md:left-1/2 ' +
                    (hot
                      ? 'w-1 rounded-full bg-gradient-to-b from-molten-500 to-amber-300 shadow-[0_0_12px_var(--color-molten-500)]'
                      : 'w-0 border-l-2 border-dashed border-steel-700')
                  }
                />
              )}
              <Knot node={node} />
              <span className='sr-only'>{`Lesson ${node.lesson.id}: ${statusText(node)}.`}</span>
              <NodeCard node={node} claimed={Boolean(onChain?.claimed.has(node.lesson.id))} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
