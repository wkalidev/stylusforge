import type { Hash } from 'viem';

/**
 * Block from which LessonCompleted events are searched, per chain id: the block where the
 * StylusForgeNFT on Arbitrum Sepolia was deployed (its creation emits OwnershipTransferred at
 * 315,775,395), so the query never scans blocks that cannot hold a claim. Any other chain, the
 * local Hardhat node included, is searched from its first block.
 */
const FIRST_CLAIM_BLOCK: Record<number, bigint> = {
  421614: 315_775_395n,
};

export function firstClaimBlock(chainId: number): bigint {
  return FIRST_CLAIM_BLOCK[chainId] ?? 0n;
}

/** When and in which transaction a certificate was claimed. */
export interface ClaimRecord {
  transactionHash: Hash;
  /** Block time of the claim, or null if the block could not be read. */
  claimedAt: Date | null;
}

/**
 * Claim records by lesson id, from LessonCompleted logs and the timestamps (in seconds) of their
 * blocks. A certificate is claimed once, so a lesson keeps its first log.
 */
export function claimRecords(
  logs: readonly { args: { lessonId?: bigint }; transactionHash: Hash | null; blockNumber: bigint | null }[],
  timestamps: ReadonlyMap<bigint, bigint>,
): Map<number, ClaimRecord> {
  const records = new Map<number, ClaimRecord>();
  for (const log of logs) {
    if (log.args.lessonId === undefined || !log.transactionHash || log.blockNumber === null) continue;
    const lessonId = Number(log.args.lessonId);
    if (records.has(lessonId)) continue;
    const timestamp = timestamps.get(log.blockNumber);
    records.set(lessonId, {
      transactionHash: log.transactionHash,
      claimedAt: timestamp === undefined ? null : new Date(Number(timestamp) * 1000),
    });
  }
  return records;
}

const CLAIM_DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});

/** "4 Oct 2026, 21:07 UTC": the same for every visitor, whatever their time zone. */
export function formatClaimDate(date: Date): string {
  return `${CLAIM_DATE.format(date)} UTC`;
}
