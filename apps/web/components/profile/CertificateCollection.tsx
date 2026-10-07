'use client';

import type { ClaimRecord } from '@/lib/certificate/claims';
import { certificateCollection, type CardState } from '@/lib/certificate/collection';
import type { Zone } from '@/lib/certificate/zones';
import type { Lesson } from '@/lib/curriculum/lessons';
import { CertificateCard, zoneStyle } from './CertificateCard';

const STATUS: Record<Exclude<CardState, 'claimed'>, string> = {
  ready: 'Passed, ready to claim',
  locked: 'Locked',
  soon: 'Coming soon',
};

function ZoneGlyph({ zone, className }: { zone: Zone; className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke={zone.accent} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' className={className}>
      <path d={zone.glyph} />
    </svg>
  );
}

/** A certificate not in the wallet: dimmed and locked, or ready to claim, or coming soon. */
function LockedCard({ lesson, zone, state }: { lesson: Lesson; zone: Zone; state: Exclude<CardState, 'claimed'> }) {
  const ready = state === 'ready';
  return (
    <div
      style={{ ...zoneStyle(zone), background: `linear-gradient(135deg, ${zone.plate[0]}, #0b0d11)` }}
      className={
        'flex aspect-square flex-col justify-between rounded-2xl border-2 border-dashed p-5 ' +
        (ready ? 'border-[var(--zone-accent)]' : 'border-steel-700 opacity-60')
      }
    >
      <div className='flex items-center justify-between'>
        <span className='font-display text-3xl font-extrabold text-steel-600 tabular-nums'>{String(lesson.id).padStart(2, '0')}</span>
        <svg width='26' height='26' viewBox='0 0 24 24' fill='none' stroke={ready ? zone.accent : '#4a5563'} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
          <rect x='5' y='11' width='14' height='10' rx='2' />
          <path d={ready ? 'M8 11V8a4 4 0 0 1 7.6-1.8' : 'M8 11V8a4 4 0 0 1 8 0v3'} />
        </svg>
      </div>
      <div>
        <p className={'font-display text-2xl font-extrabold leading-none ' + (ready ? 'text-steel-100' : 'text-steel-300')}>{lesson.title}</p>
        <p className='mt-1.5 text-sm text-steel-400'>
          {lesson.xp} XP · {STATUS[state]}
        </p>
      </div>
      {ready && (
        <a
          href='#unclaimed-heading'
          className='inline-flex min-h-10 items-center self-start rounded-[var(--radius-forge)] bg-molten-500 px-3.5 text-sm font-semibold text-steel-950 hover:bg-molten-400'
        >
          Claim certificate
        </a>
      )}
    </div>
  );
}

/**
 * Every lesson as a card, grouped by module in its forge zone: claimed certificates (the NFT
 * image, turning over to the claim details) among dimmed, locked ones, in curriculum order, with
 * the overall count.
 */
export function CertificateCollection({
  claimed,
  ready,
  records,
  network,
}: {
  claimed: ReadonlySet<number>;
  ready: ReadonlySet<number>;
  records: ReadonlyMap<number, ClaimRecord> | null | undefined;
  network: string;
}) {
  const collection = certificateCollection(claimed, ready);
  return (
    <section aria-labelledby='collection-heading' className='space-y-10'>
      <div className='steel-surface flex flex-wrap items-end justify-between gap-6 px-6 py-5'>
        <div>
          <h2 id='collection-heading' className='text-sm text-steel-400'>
            Collection
          </h2>
          <p className='font-display text-5xl font-extrabold leading-none tabular-nums text-steel-100'>
            {collection.claimed} <span className='text-steel-400'>/ {collection.available}</span>
          </p>
        </div>
        <div className='min-w-56 flex-1 sm:max-w-md'>
          <p className='mb-2 text-sm text-steel-400'>Certificates claimed on {network}</p>
          <div
            role='meter'
            aria-label='Certificates collected'
            aria-valuemin={0}
            aria-valuemax={collection.available}
            aria-valuenow={collection.claimed}
            className='h-2 overflow-hidden rounded-full bg-steel-800'
          >
            <div
              className='h-full rounded-full bg-gradient-to-r from-molten-500 via-amber-300 to-quench-400'
              style={{ width: `${collection.available ? (collection.claimed / collection.available) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {collection.groups.map(({ zone, cards, claimed: count, available }) => (
        <section key={zone.moduleId} aria-labelledby={`zone-${zone.moduleId}`} className='space-y-4'>
          <div className='flex items-center gap-3.5 border-b border-steel-800 pb-3'>
            <ZoneGlyph zone={zone} className='size-7 shrink-0' />
            <div className='flex-1'>
              <p className='text-xs tracking-[0.2em]' style={{ color: zone.accent }}>
                ZONE {zone.index} · {zone.name.toUpperCase()}
              </p>
              <h3 id={`zone-${zone.moduleId}`} className='font-display text-3xl font-bold leading-tight text-steel-100'>
                {zone.module}
              </h3>
            </div>
            <p className='font-display text-2xl font-bold text-steel-400 tabular-nums'>{available ? `${count} / ${available}` : 'Coming soon'}</p>
          </div>
          <ul className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {cards.map(({ lesson, state }) => (
              <li key={lesson.id}>
                {state === 'claimed' ? (
                  <CertificateCard lesson={lesson} network={network} record={records === undefined ? undefined : (records?.get(lesson.id) ?? null)} />
                ) : (
                  <LockedCard lesson={lesson} zone={zone} state={state} />
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
