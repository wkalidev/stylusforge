import { useQuery } from '@tanstack/react-query';
import { getAbiItem, type Address } from 'viem';
import { usePublicClient } from 'wagmi';
import { claimCacheKey, parseClaimCache, scanClaims, serializeClaimCache, type ClaimSource } from '@/lib/certificate/claimScan';
import { firstClaimBlock, type ClaimRecord } from '@/lib/certificate/claims';
import { chain } from '@/lib/chain';
import { nftContractAddress, stylusForgeNftAbi } from '@/lib/contract';
import { readItem, writeItem } from '@/lib/progress/storage';

const lessonCompleted = getAbiItem({ abi: stylusForgeNftAbi, name: 'LessonCompleted' });

/**
 * When and in which transaction each of `claimed` (the student's certificates, read from the
 * contract) was claimed. The contract stores no date: scanClaims reads the student's
 * LessonCompleted logs in bounded chunks, newest first, until every certificate is found, and
 * the result is cached in localStorage per chain, contract and wallet, so a later visit only
 * reads the blocks since. Undefined while loading, null if nothing could be read: callers then
 * show the certificate without a date.
 */
export function useClaimRecords(student: Address | undefined, claimed: ReadonlySet<number> | undefined): Map<number, ClaimRecord> | null | undefined {
  const client = usePublicClient({ chainId: chain.id });
  const wanted = claimed ? [...claimed].sort((a, b) => a - b) : [];
  const { data, isError } = useQuery({
    queryKey: ['certificate-claims', chain.id, nftContractAddress, student, wanted],
    enabled: Boolean(client && student && nftContractAddress && claimed),
    staleTime: 60_000,
    retry: 1,
    queryFn: async () => {
      const contract = nftContractAddress;
      if (!client || !student || !contract) return new Map<number, ClaimRecord>();
      const key = claimCacheKey(chain.id, contract, student);
      const cache = parseClaimCache(readItem(key));
      const source: ClaimSource = {
        latestBlock: () => client.getBlockNumber({ cacheTime: 0 }),
        logs: async (fromBlock, toBlock) => {
          const logs = await client.getLogs({ address: contract, event: lessonCompleted, args: { student }, fromBlock, toBlock });
          return logs.flatMap((log) =>
            log.args.lessonId !== undefined && log.transactionHash && log.blockNumber !== null
              ? [{ lessonId: log.args.lessonId, transactionHash: log.transactionHash, blockNumber: log.blockNumber }]
              : [],
          );
        },
        blockTime: async (blockNumber) => (await client.getBlock({ blockNumber })).timestamp,
      };
      try {
        const result = await scanClaims({ source, wanted: new Set(wanted), cache, firstBlock: firstClaimBlock(chain.id) });
        writeItem(key, serializeClaimCache(result.cache));
        return result.cache.records as Map<number, ClaimRecord>;
      } catch (error) {
        // The latest block could not be read: what was cached is still true.
        if (cache) return cache.records as Map<number, ClaimRecord>;
        throw error;
      }
    },
  });
  return isError ? null : data;
}
