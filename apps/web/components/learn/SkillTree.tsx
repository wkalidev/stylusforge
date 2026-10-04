'use client';

import { LESSONS } from '@/lib/curriculum/lessons';
import { MODULES } from '@/lib/curriculum/modules';
import { forgePath, type Heat, type PathZone, type RowHeat } from '@/lib/progress/forgePath';
import { useCompletedLessons } from '@/lib/progress/progress';
import { skillTree, type SkillNode } from '@/lib/progress/skillTree';
import { useClaimedLessons } from '@/lib/useClaimedLessons';
import { LessonCard, statusText, type CertificateState } from './LessonCard';

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
    'absolute top-1/2 left-6 z-10 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-display text-2xl font-extrabold';
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

const SEGMENT = 'absolute left-6 -translate-x-1/2';

function segmentClass(heat: Exclude<Heat, null>): string {
  return heat === 'hot'
    ? 'w-1 bg-gradient-to-b from-molten-500 to-amber-300 shadow-[0_0_12px_var(--color-molten-500)]'
    : 'w-0 border-l-2 border-dashed border-steel-700';
}

/** The path through a row: from its top to its middle (in) and from its middle to its bottom (out). */
function Spine({ heat }: { heat: RowHeat }) {
  return (
    <>
      {heat.in && <span aria-hidden='true' className={`${SEGMENT} top-0 h-1/2 ${segmentClass(heat.in)}`} />}
      {heat.out && <span aria-hidden='true' className={`${SEGMENT} top-1/2 bottom-0 ${segmentClass(heat.out)}`} />}
    </>
  );
}

function zoneStatus(zone: PathZone): string {
  if (zone.total === 0) return 'Lessons coming soon';
  if (zone.state === 'complete') return `All ${zone.total} lessons passed`;
  const firstLocked = zone.nodes[0]?.node;
  if (zone.state === 'locked') {
    return firstLocked?.unlockedBy ? `Pass ${firstLocked.unlockedBy.title} to enter` : 'Lessons coming soon';
  }
  return `${zone.passed} of ${zone.total} lessons passed`;
}

/** A zone header: zone and module names, with the module's progress and completion state. */
function ZoneHeader({ zone }: { zone: PathZone }) {
  const fraction = zone.total ? zone.passed / zone.total : 0;
  return (
    <div className='relative pt-8 pb-4 pl-16'>
      <Spine heat={zone.header} />
      <span
        aria-hidden='true'
        className={
          'absolute top-[calc(50%+0.5rem)] left-6 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 border ' +
          (zone.state === 'complete'
            ? 'border-amber-300 bg-gradient-to-b from-amber-300 to-molten-500 shadow-[0_0_14px_var(--color-molten-500)]'
            : zone.state === 'open'
              ? 'border-amber-300/80 bg-steel-900'
              : 'border-steel-600 bg-steel-850')
        }
      />
      <div className={zone.state === 'locked' ? 'opacity-55' : undefined}>
        <div className='flex flex-wrap items-end justify-between gap-x-6 gap-y-2'>
          <div>
            <p className='text-xs font-semibold tracking-[0.2em] text-amber-300/90 uppercase'>
              Zone {zone.index} · {zone.zone}
            </p>
            <h2 id={`zone-${zone.id}`} className='font-display text-3xl font-bold leading-tight text-steel-100'>
              {zone.name}
            </h2>
          </div>
          {zone.state === 'complete' ? (
            <span className='rounded-[var(--radius-forge)] bg-molten-500/15 px-2.5 py-1 text-xs font-semibold text-amber-300'>
              Zone complete
            </span>
          ) : (
            zone.total > 0 && (
              <span aria-hidden='true' className='h-1.5 w-28 overflow-hidden rounded-full bg-steel-800'>
                <span
                  className='block h-full rounded-full bg-gradient-to-r from-ember-500 via-molten-500 to-amber-300'
                  style={{ width: `${fraction * 100}%` }}
                />
              </span>
            )
          )}
        </div>
        <p className='mt-1 text-sm text-steel-400'>{zoneStatus(zone)}</p>
      </div>
    </div>
  );
}

/** The curriculum as one path through the forge zones, heated along the lessons already passed. */
export function SkillTree() {
  const passed = useCompletedLessons();
  const onChain = useClaimedLessons();
  const zones = forgePath(MODULES, skillTree(LESSONS, passed));
  // Owned certificates show wherever the lesson was passed; passed lessons not known to be claimed
  // get a reminder (unclaimed on-chain, or unknown without a wallet).
  const certificate = (node: SkillNode): CertificateState => {
    if (onChain?.claimed.has(node.lesson.id)) return 'claimed';
    if (node.state !== 'completed') return null;
    return !onChain || onChain.unclaimed.has(node.lesson.id) ? 'unclaimed' : null;
  };

  return (
    <div className='mt-10'>
      {zones.map((zone) => (
        <section key={zone.id} aria-labelledby={`zone-${zone.id}`}>
          <ZoneHeader zone={zone} />
          <ol aria-label={`${zone.name} lessons`} className={zone.state === 'locked' ? 'opacity-70' : undefined}>
            {zone.nodes.map(({ node, ...heat }) => (
              <li key={node.lesson.id} className='relative py-3 pl-16'>
                <Spine heat={heat} />
                <Knot node={node} />
                <span className='sr-only'>{`Lesson ${node.lesson.id}: ${statusText(node)}.`}</span>
                <LessonCard node={node} certificate={certificate(node)} />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
