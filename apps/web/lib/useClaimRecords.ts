import { useQuery } from '@tanstack/react-query';
import { getAbiItem, type Address } from 'viem';
import { usePublicClient } from 'wagmi';
import { claimRecords, firstClaimBlock, type ClaimRecord } from '@/lib/certificate/claims';
import { chain } from '@/lib/chain';
import { nftContractAddress, stylusForgeNftAbi } from '@/lib/contract';

const lessonCompleted = getAbiItem({ abi: stylusForgeNftAbi, name: 'LessonCompleted' });

/**
 * When and in which transaction each certificate of `student` was claimed, from the contract's
 * LessonCompleted events and their block times (the contract itself stores no date). Undefined
 * while loading or if the logs cannot be read: callers show the certificate without a date.
 */
export function useClaimRecords(student: Address | undefined): Map<number, ClaimRecord> | undefined {
  const client = usePublicClient({ chainId: chain.id });
  const { data } = useQuery({
    queryKey: ['certificate-claims', chain.id, nftContractAddress, student],
    enabled: Boolean(client && student && nftContractAddress),
    staleTime: 60_000,
    retry: 1,
    queryFn: async () => {
      if (!client || !student || !nftContractAddress) return new Map<number, ClaimRecord>();
      const logs = await client.getLogs({
        address: nftContractAddress,
        event: lessonCompleted,
        args: { student },
        fromBlock: firstClaimBlock(chain.id),
        toBlock: 'latest',
      });
      const timestamps = new Map<bigint, bigint>();
      const blocks = [...new Set(logs.map((log) => log.blockNumber))];
      await Promise.all(
        blocks.map(async (blockNumber) => {
          try {
            timestamps.set(blockNumber, (await client.getBlock({ blockNumber })).timestamp);
          } catch {
            // The claim keeps its transaction link without a date.
          }
        }),
      );
      return claimRecords(logs, timestamps);
    },
  });
  return data;
}
