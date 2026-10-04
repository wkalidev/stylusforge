'use client';

import Link from 'next/link';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContracts } from 'wagmi';
import { buttonClasses } from '@/components/ui/button';
import { certificateSvg } from '@/lib/certificate/svg';
import { chain } from '@/lib/chain';
import { nftContractAddress, stylusForgeNftAbi } from '@/lib/contract';
import { LESSONS } from '@/lib/curriculum/lessons';
import { rankProgress } from '@/lib/progress/ranks';

function Notice({ children }: { children: React.ReactNode }) {
  return <div className='steel-surface max-w-xl space-y-4 p-6 text-steel-300'>{children}</div>;
}

/** On-chain progress of the connected wallet: claimed certificates and the XP they carry. */
export function ProfileView() {
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const contract = { address: nftContractAddress ?? undefined, abi: stylusForgeNftAbi, chainId: chain.id } as const;
  const reads = useReadContracts({
    contracts: address
      ? [
          { ...contract, functionName: 'getTotalXP', args: [address] },
          { ...contract, functionName: 'getCompletedLessons', args: [address] },
        ]
      : [],
    allowFailure: false,
    query: { enabled: Boolean(address && nftContractAddress) },
  });

  if (!nftContractAddress) {
    return <Notice>Certificates are not available here: no contract address is configured.</Notice>;
  }
  if (!address) {
    return (
      <Notice>
        <p>Connect your wallet to see the certificates it holds and the XP they carry.</p>
        <button type='button' onClick={openConnectModal} className={buttonClasses('quench', 'lg')}>
          Connect wallet
        </button>
      </Notice>
    );
  }
  if (reads.isError) {
    return (
      <Notice>
        <p>The certificate contract on {chain.name} could not be read. Check your connection and reload the page.</p>
      </Notice>
    );
  }
  if (!reads.data) {
    return <p className='text-steel-400'>Reading your certificates on {chain.name}…</p>;
  }

  const [totalXp, [registeredIds, done]] = reads.data as [bigint, readonly [readonly bigint[], readonly boolean[]]];
  const claimedIds = new Set(registeredIds.filter((_, index) => done[index]).map(Number));
  const certificates = LESSONS.filter((lesson) => claimedIds.has(lesson.id));
  const xp = Number(totalXp);
  const { rank, next, xpToNext, fraction } = rankProgress(xp);

  return (
    <div className='space-y-12'>
      <section aria-label='On-chain rank' className='steel-surface quench-edge flex flex-wrap items-end justify-between gap-6 p-6'>
        <div>
          <p className='text-sm text-steel-400'>Rank on-chain</p>
          <p className='font-display text-5xl font-extrabold text-steel-100'>{rank.name}</p>
        </div>
        <div className='min-w-56 flex-1 sm:max-w-sm'>
          <p className='mb-2 text-right font-display text-3xl font-bold text-amber-300 tabular-nums'>{xp} XP</p>
          <div
            role='meter'
            aria-label={`On-chain rank ${rank.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(fraction * 100)}
            className='h-2 overflow-hidden rounded-full bg-steel-800'
          >
            <div className='h-full rounded-full bg-gradient-to-r from-quench-700 via-quench-500 to-quench-300' style={{ width: `${fraction * 100}%` }} />
          </div>
          <p className='mt-2 text-right text-sm text-steel-400'>
            {next ? `${xpToNext} XP to ${next.name}` : 'Top rank reached'}
          </p>
        </div>
      </section>

      <section aria-labelledby='certificates-heading'>
        <h2 id='certificates-heading' className='mb-6 font-display text-3xl font-bold'>
          Certificates <span className='text-steel-400'>{certificates.length}</span>
        </h2>
        {certificates.length === 0 ? (
          <Notice>
            <p>No certificates yet. Pass a lesson, then claim its certificate to see it here.</p>
            <Link href='/learn' className={buttonClasses('heat', 'md')}>
              Go to the lessons
            </Link>
          </Notice>
        ) : (
          <ul className='grid gap-6 md:grid-cols-2'>
            {certificates.map((lesson) => (
              <li key={lesson.id}>
                <Link href={`/learn/${lesson.slug}`} aria-label={`${lesson.title} certificate`} className='block rounded-[22px]'>
                  <div
                    className='[&>svg]:h-auto [&>svg]:w-full'
                    // certificateSvg escapes every lesson field it embeds.
                    dangerouslySetInnerHTML={{ __html: certificateSvg(lesson) }}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
