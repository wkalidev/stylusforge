'use client';

import { useState } from 'react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useQueryClient } from '@tanstack/react-query';
import type { Hash } from 'viem';
import { useAccount, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from 'wagmi';
import { buttonClasses } from '@/components/ui/button';
import { chain } from '@/lib/chain';
import type { ClaimErrorResponse, ClaimResponse } from '@/lib/claim';
import { describeClaimError, VoucherRequestError } from '@/lib/claimErrors';
import { nftContractAddress, stylusForgeNftAbi } from '@/lib/contract';
import { explorerName, transactionUrl } from '@/lib/explorer';

type Phase = 'idle' | 'voucher' | 'wallet' | 'confirming';

const PHASE_LABEL: Record<Exclude<Phase, 'idle'>, string> = {
  voucher: 'Checking your code…',
  wallet: 'Confirm in your wallet…',
  confirming: 'Forging on-chain…',
};

function shortHash(hash: Hash) {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

/**
 * The claim action of a passed lesson, compact enough to sit in the lesson's result bar: the
 * server re-validates the code and signs a voucher, then the student sends claim() from their
 * wallet and pays the gas. Renders the action (or the owned badge) and, below it, any error.
 */
export function ClaimCertificate({ lessonId, code }: { lessonId: number; code: string }) {
  const { address, isConnected, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChain, isPending: switching } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: chain.id });
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();
  const [phase, setPhase] = useState<Phase>('idle');
  const [txHash, setTxHash] = useState<Hash | null>(null);
  const [error, setError] = useState<{ message: string; objectives: string[] } | null>(null);

  const owned = useReadContract({
    address: nftContractAddress ?? undefined,
    abi: stylusForgeNftAbi,
    functionName: 'completed',
    args: address ? [address, BigInt(lessonId)] : undefined,
    chainId: chain.id,
    query: { enabled: Boolean(address && nftContractAddress) },
  });

  if (!nftContractAddress) {
    return <span className='text-sm text-steel-400'>Certificates unavailable: no contract configured</span>;
  }

  if (owned.data === true) {
    const url = txHash ? transactionUrl(txHash) : null;
    return (
      <span role='status' className='flex flex-wrap items-center gap-x-3 gap-y-1'>
        <span className='rounded-[var(--radius-forge)] border border-quench-500/60 px-2.5 py-1.5 text-sm font-semibold text-quench-300 quench-edge'>
          Certificate owned
        </span>
        {txHash &&
          (url ? (
            <a href={url} target='_blank' rel='noreferrer' className='text-sm font-medium text-quench-300 underline-offset-4 hover:underline'>
              View on {explorerName}
            </a>
          ) : (
            <span className='font-mono text-xs text-steel-400' title={txHash}>
              Tx {shortHash(txHash)}
            </span>
          ))}
      </span>
    );
  }

  async function claim() {
    if (!address || !nftContractAddress || !publicClient) {
      return;
    }
    setError(null);
    try {
      setPhase('voucher');
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address, lessonId, code }),
      });
      const body = (await response.json()) as ClaimResponse | ClaimErrorResponse;
      if (!response.ok || 'error' in body) {
        const refused = body as ClaimErrorResponse;
        throw new VoucherRequestError(refused.error ?? 'The voucher could not be issued.', refused.objectives);
      }

      const args = [BigInt(body.lessonId), BigInt(body.deadline), body.signature] as const;
      // Simulate first so a revert is decoded before the wallet opens.
      await publicClient.simulateContract({
        account: address,
        address: nftContractAddress,
        abi: stylusForgeNftAbi,
        functionName: 'claim',
        args,
      });

      setPhase('wallet');
      const hash = await writeContractAsync({
        address: nftContractAddress,
        abi: stylusForgeNftAbi,
        functionName: 'claim',
        args,
        chainId: chain.id,
      });
      setTxHash(hash);

      setPhase('confirming');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') {
        throw new Error('The claim transaction reverted.');
      }
      await queryClient.invalidateQueries();
    } catch (cause) {
      setError({
        message: describeClaimError(cause),
        objectives: cause instanceof VoucherRequestError ? cause.objectives : [],
      });
    } finally {
      setPhase('idle');
    }
  }

  const busy = phase !== 'idle';
  let action: React.ReactNode;
  if (!isConnected) {
    action = (
      <button type='button' onClick={openConnectModal} className={buttonClasses('heat', 'md')}>
        Connect wallet to claim
      </button>
    );
  } else if (chainId !== chain.id) {
    action = (
      <button
        type='button'
        onClick={() => switchChain({ chainId: chain.id })}
        disabled={switching}
        className={buttonClasses('quench', 'md')}
      >
        {switching ? 'Switching…' : `Switch to ${chain.name}`}
      </button>
    );
  } else {
    action = (
      <button type='button' onClick={claim} disabled={busy || owned.isLoading} className={buttonClasses('quench', 'md')}>
        {busy ? PHASE_LABEL[phase as Exclude<Phase, 'idle'>] : 'Claim certificate'}
      </button>
    );
  }

  return (
    <>
      {action}
      {error && (
        <div role='alert' className='basis-full text-sm'>
          <p className='text-molten-300'>{error.message}</p>
          {error.objectives.length > 0 && (
            <ul className='mt-1 list-disc pl-5 text-steel-300'>
              {error.objectives.map((objective) => (
                <li key={objective}>{objective}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
