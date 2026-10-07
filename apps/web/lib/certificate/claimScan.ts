import type { Address, Hash } from 'viem';
import type { ClaimRecord } from './claims';

/** A LessonCompleted log of one student, reduced to what a claim record needs. */
export interface ClaimLog {
  lessonId: bigint;
  transactionHash: Hash;
  blockNumber: bigint;
}

/** Where the scan reads the chain: the RPC in the app, a fake in the tests. */
export interface ClaimSource {
  latestBlock(): Promise<bigint>;
  /** The student's LessonCompleted logs between two blocks, both included. */
  logs(fromBlock: bigint, toBlock: bigint): Promise<ClaimLog[]>;
  /** Timestamp of a block, in seconds. */
  blockTime(blockNumber: bigint): Promise<bigint>;
}

export interface CachedClaim extends ClaimRecord {
  blockNumber: bigint;
}

/**
 * What is known of a student's claims: their records, and the block up to which every claim is
 * among them, so a later scan only reads newer blocks.
 */
export interface ClaimCache {
  scannedTo: bigint;
  records: Map<number, CachedClaim>;
}

/** Largest block range asked for in one eth_getLogs call. */
export const CLAIM_LOG_CHUNK = 50_000n;
/** A refused range is halved down to this size before the scan gives up. */
export const MIN_CLAIM_LOG_CHUNK = 1_000n;

/**
 * Finds when each `wanted` lesson (the student's certificates, from the contract) was claimed:
 * the cached records first, then logs from the newest block down to the first one not covered
 * by the cache (or `firstBlock`), in chunks of at most `chunkSize` blocks, stopping as soon as
 * every wanted lesson is found. A range the RPC refuses is halved and retried, down to
 * `minChunk`.
 *
 * The returned cache moves `scannedTo` to the latest block only when the scan is complete (every
 * wanted lesson found, or every block read): every claim up to it is then known, since `wanted`
 * lists them all. A scan that stops on an error keeps the records it found and the previous
 * `scannedTo`, so the next one reads that range again.
 */
export async function scanClaims({
  source,
  wanted,
  cache,
  firstBlock,
  chunkSize = CLAIM_LOG_CHUNK,
  minChunk = MIN_CLAIM_LOG_CHUNK,
}: {
  source: ClaimSource;
  wanted: ReadonlySet<number>;
  cache: ClaimCache | null;
  firstBlock: bigint;
  chunkSize?: bigint;
  minChunk?: bigint;
}): Promise<{ cache: ClaimCache; complete: boolean }> {
  const records = new Map(cache?.records ?? []);
  const known = cache?.scannedTo ?? firstBlock - 1n;
  const missing = new Set([...wanted].filter((id) => !records.has(id)));

  let scannedTo = known;
  let complete = missing.size === 0;
  if (!complete) {
    const latest = await source.latestBlock();
    const lower = known + 1n;
    let to = latest;
    let size = chunkSize;
    while (missing.size > 0 && to >= lower) {
      const from = to - size + 1n > lower ? to - size + 1n : lower;
      let logs: ClaimLog[];
      try {
        logs = await source.logs(from, to);
      } catch {
        if (size > minChunk) {
          size = size / 2n > minChunk ? size / 2n : minChunk;
          continue;
        }
        break;
      }
      for (const log of logs) {
        const lessonId = Number(log.lessonId);
        if (records.has(lessonId)) continue;
        records.set(lessonId, { transactionHash: log.transactionHash, blockNumber: log.blockNumber, claimedAt: null });
        missing.delete(lessonId);
      }
      to = from - 1n;
    }
    complete = missing.size === 0 || to < lower;
    if (complete) scannedTo = latest;
  }

  await fillClaimDates(source, records);
  return { cache: { scannedTo, records }, complete };
}

/** Reads the block time of every record still without a date; a failed read leaves it null. */
async function fillClaimDates(source: ClaimSource, records: Map<number, CachedClaim>) {
  const blocks = [...new Set([...records.values()].filter((record) => !record.claimedAt).map((record) => record.blockNumber))];
  const times = new Map<bigint, Date>();
  await Promise.all(
    blocks.map(async (blockNumber) => {
      try {
        times.set(blockNumber, new Date(Number(await source.blockTime(blockNumber)) * 1000));
      } catch {
        // The record keeps its transaction; its date is read again on the next scan.
      }
    }),
  );
  for (const [lessonId, record] of records) {
    const claimedAt = times.get(record.blockNumber);
    if (!record.claimedAt && claimedAt) records.set(lessonId, { ...record, claimedAt });
  }
}

/** localStorage key of a student's claim cache, per chain and contract. */
export function claimCacheKey(chainId: number, contract: Address, student: Address): string {
  return `stylusforge:claims:v1:${chainId}:${contract.toLowerCase()}:${student.toLowerCase()}`;
}

interface StoredClaimCache {
  scannedTo: string;
  records: Record<string, { tx: string; block: string; at: number | null }>;
}

export function serializeClaimCache(cache: ClaimCache): string {
  const records: StoredClaimCache['records'] = {};
  for (const [lessonId, record] of cache.records) {
    records[lessonId] = { tx: record.transactionHash, block: record.blockNumber.toString(), at: record.claimedAt?.getTime() ?? null };
  }
  return JSON.stringify({ scannedTo: cache.scannedTo.toString(), records } satisfies StoredClaimCache);
}

/** The cache stored in `raw`, or null when it is missing or malformed in any way. */
export function parseClaimCache(raw: string | null): ClaimCache | null {
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as StoredClaimCache;
    if (!/^\d+$/.test(stored.scannedTo) || typeof stored.records !== 'object' || stored.records === null) return null;
    const records = new Map<number, CachedClaim>();
    for (const [key, record] of Object.entries(stored.records)) {
      const lessonId = Number(key);
      if (!Number.isSafeInteger(lessonId) || lessonId <= 0) return null;
      if (!/^0x[0-9a-fA-F]{64}$/.test(record.tx) || !/^\d+$/.test(record.block)) return null;
      if (record.at !== null && !Number.isFinite(record.at)) return null;
      records.set(lessonId, {
        transactionHash: record.tx as Hash,
        blockNumber: BigInt(record.block),
        claimedAt: record.at === null ? null : new Date(record.at),
      });
    }
    return { scannedTo: BigInt(stored.scannedTo), records };
  } catch {
    return null;
  }
}
