'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ClaimRecord } from '@/lib/certificate/claims';
import { formatClaimDate } from '@/lib/certificate/claims';
import { certificateSvg } from '@/lib/certificate/svg';
import { zoneOf, type Zone } from '@/lib/certificate/zones';
import { nftContractAddress } from '@/lib/contract';
import type { Lesson } from '@/lib/curriculum/lessons';
import { explorerName, tokenUrl, transactionUrl } from '@/lib/explorer';
import { usePointerTilt } from '@/lib/hooks/usePointerTilt';

const MAX_TILT = 8; // degrees

/** A card's zone colors, as the custom properties the stylesheet reads. */
export function zoneStyle(zone: Zone): CSSProperties {
  return {
    '--zone-accent': zone.accent,
    '--zone-light': zone.light,
    '--zone-plate-a': zone.plate[0],
    '--zone-plate-b': zone.plate[1],
  } as CSSProperties;
}

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * A claimed certificate: the NFT image on the front, tilting towards the pointer with a metallic
 * sheen; a click (or Enter, Space) turns it over to the back, with the claim date, the claim on
 * the block explorer, a button that copies that link, and the lesson. The hidden face is inert,
 * focus follows the visible one, and Escape turns the card back.
 *
 * `record` is undefined while the claim is being looked up, null if it could not be found.
 */
export function CertificateCard({ lesson, network, record }: { lesson: Lesson; network: string; record: ClaimRecord | null | undefined }) {
  const zone = zoneOf(lesson.module);
  const [flipped, setFlipped] = useState(false);
  const [copy, setCopy] = useState<CopyState>('idle');
  const turned = useRef(false);
  const front = useRef<HTMLButtonElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const { ref: tilt, interactive, handlers } = usePointerTilt<HTMLDivElement>(MAX_TILT);

  // Focus follows the card when the visitor turns it, not on the first render.
  useEffect(() => {
    if (!turned.current) return;
    turned.current = false;
    if (flipped) back.current?.querySelector<HTMLElement>('a, button')?.focus({ preventScroll: true });
    else front.current?.focus({ preventScroll: true });
  }, [flipped]);

  useEffect(() => {
    if (copy === 'idle') return;
    const timer = setTimeout(() => setCopy('idle'), 2500);
    return () => clearTimeout(timer);
  }, [copy]);

  function turn(toBack: boolean) {
    turned.current = true;
    setFlipped(toBack);
  }

  const claimUrl = record ? transactionUrl(record.transactionHash) : null;
  const link = claimUrl ?? (nftContractAddress ? tokenUrl(nftContractAddress, lesson.id) : null);
  const claimedOn =
    record === undefined ? 'Reading the claim date…' : record?.claimedAt ? formatClaimDate(record.claimedAt) : 'On-chain (date unavailable)';

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopy('copied');
    } catch {
      setCopy('failed');
    }
  }

  return (
    <div className='cert-card' data-flipped={flipped} style={zoneStyle(zone)}>
      <div ref={tilt} className='cert-card__tilt' data-tilt={interactive ? 'on' : 'off'} {...handlers}>
        <div className='cert-card__flip'>
          <button
            ref={front}
            type='button'
            className='cert-card__face cert-card__front'
            aria-label={`Show the back of the ${lesson.title} certificate`}
            inert={flipped}
            onClick={() => turn(true)}
          >
            {/* certificateSvg escapes every lesson field it embeds. */}
            <span aria-hidden='true' className='contents' dangerouslySetInnerHTML={{ __html: certificateSvg(lesson, network) }} />
            <span aria-hidden='true' className='cert-card__sheen' />
          </button>

          <div
            ref={back}
            role='group'
            aria-label={`${lesson.title} certificate, back`}
            className='cert-card__face cert-card__back'
            inert={!flipped}
            onKeyDown={(event) => {
              if (event.key === 'Escape') turn(false);
            }}
          >
            <p className='text-xs tracking-[0.2em] text-[var(--zone-light)]'>
              ZONE {zone.index} · {zone.name.toUpperCase()}
            </p>
            <h3 className='font-display text-2xl font-extrabold leading-none text-steel-100'>{lesson.title}</h3>
            <div className='h-px bg-gradient-to-r from-[var(--zone-accent)] to-transparent' />
            <div>
              <p className='text-xs tracking-[0.15em] text-steel-400'>CLAIMED</p>
              <p className='text-sm text-steel-100'>{claimedOn}</p>
            </div>
            <div className='mt-auto flex flex-wrap gap-2'>
              {link && (
                <a
                  href={link}
                  target='_blank'
                  rel='noreferrer'
                  className='inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-forge)] border border-steel-600 bg-black/35 px-3 text-sm text-quench-300 hover:border-quench-400'
                >
                  {claimUrl ? `View on ${explorerName}` : `${explorerName} token`}
                  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' aria-hidden='true'>
                    <path d='M7 17L17 7M9 7h8v8' />
                  </svg>
                  <span className='sr-only'>(opens in a new tab)</span>
                </a>
              )}
              {link && (
                <button
                  type='button'
                  onClick={copyLink}
                  className='inline-flex min-h-10 items-center rounded-[var(--radius-forge)] border border-steel-600 bg-black/35 px-3 text-sm text-steel-100 hover:border-steel-400'
                >
                  {copy === 'copied' ? 'Copied' : copy === 'failed' ? 'Copy failed' : 'Copy link'}
                </button>
              )}
              <span role='status' className='sr-only'>
                {copy === 'copied' ? 'Link copied' : copy === 'failed' ? 'The link could not be copied' : ''}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <Link href={`/learn/${lesson.slug}`} className='text-sm text-molten-300 underline-offset-4 hover:underline'>
                Open lesson
              </Link>
              <button
                type='button'
                onClick={() => turn(false)}
                aria-label={`Show the front of the ${lesson.title} certificate`}
                className='min-h-10 px-2 text-sm text-steel-300 hover:text-steel-100'
              >
                Flip back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
