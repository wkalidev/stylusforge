import type { Hash } from 'viem';
import { chain } from '@/lib/chain';

/** Block explorer page of a transaction, or null on chains without an explorer (local Hardhat). */
export function transactionUrl(hash: Hash): string | null {
  const explorer = chain.blockExplorers?.default;
  return explorer ? `${explorer.url}/tx/${hash}` : null;
}

/** Name of the chain's explorer, for link labels ("View on Arbiscan"). */
export const explorerName: string | null = chain.blockExplorers?.default.name ?? null;
