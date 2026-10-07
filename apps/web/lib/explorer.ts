import type { Address, Hash } from 'viem';
import { chain } from '@/lib/chain';

/** Block explorer page of a transaction, or null on chains without an explorer (local Hardhat). */
export function transactionUrl(hash: Hash): string | null {
  const explorer = chain.blockExplorers?.default;
  return explorer ? `${explorer.url}/tx/${hash}` : null;
}

/** Name of the chain's explorer, for link labels ("View on Arbiscan"). */
export const explorerName: string | null = chain.blockExplorers?.default.name ?? null;

/** Block explorer page of one token of an ERC-1155 contract, or null without an explorer. */
export function tokenUrl(contract: Address, tokenId: number): string | null {
  const explorer = chain.blockExplorers?.default;
  return explorer ? `${explorer.url}/nft/${contract}/${tokenId}` : null;
}
