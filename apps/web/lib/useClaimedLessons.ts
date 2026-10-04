import { useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { chain } from '@/lib/chain';
import { nftContractAddress, stylusForgeNftAbi } from '@/lib/contract';

export interface ClaimedLessons {
  /** Ids of the lessons whose certificate the connected wallet owns. */
  claimed: Set<number>;
  /** Ids of the registered lessons the wallet has not claimed yet. */
  unclaimed: Set<number>;
}

/**
 * On-chain certificates of the connected wallet, from getCompletedLessons, or null without a
 * wallet, without a configured contract, or while the read is pending.
 */
export function useClaimedLessons(): ClaimedLessons | null {
  const { address } = useAccount();
  const { data } = useReadContract({
    address: nftContractAddress ?? undefined,
    abi: stylusForgeNftAbi,
    functionName: 'getCompletedLessons',
    args: address ? [address] : undefined,
    chainId: chain.id,
    query: { enabled: Boolean(address && nftContractAddress) },
  });
  return useMemo(() => {
    if (!address || !data) {
      return null;
    }
    const [ids, done] = data;
    const claimed = new Set<number>();
    const unclaimed = new Set<number>();
    ids.forEach((id, index) => (done[index] ? claimed : unclaimed).add(Number(id)));
    return { claimed, unclaimed };
  }, [address, data]);
}
