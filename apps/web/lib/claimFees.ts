import type { PublicClient } from 'viem';

export interface ClaimFees {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

/** How many times the current base fee the claim accepts to pay at most. */
export const BASE_FEE_MARGIN = 2n;

/**
 * EIP-1559 fees for the claim transaction: `maxFeePerGas` is twice the current base fee plus the
 * priority fee, so the transaction stays valid if the base fee rises before it is included. Left
 * to itself, the wallet can propose a max fee at the current base fee, which a slightly higher
 * next block rejects ("max fee per gas less than block base fee"). Only the base fee of the block
 * is charged (on Arbitrum the priority fee is not used either), so the margin costs nothing.
 */
export function claimFees(baseFeePerGas: bigint, maxPriorityFeePerGas: bigint): ClaimFees {
  return { maxFeePerGas: baseFeePerGas * BASE_FEE_MARGIN + maxPriorityFeePerGas, maxPriorityFeePerGas };
}

/**
 * Reads the latest base fee and the priority fee estimate. Returns null when they cannot be read
 * (a chain without EIP-1559, an RPC error): the wallet then estimates the fees itself.
 */
export async function suggestClaimFees(
  client: Pick<PublicClient, 'getBlock' | 'estimateMaxPriorityFeePerGas'>,
): Promise<ClaimFees | null> {
  try {
    const [block, maxPriorityFeePerGas] = await Promise.all([
      client.getBlock({ blockTag: 'latest' }),
      client.estimateMaxPriorityFeePerGas(),
    ]);
    if (block.baseFeePerGas === null || block.baseFeePerGas === undefined) {
      return null;
    }
    return claimFees(block.baseFeePerGas, maxPriorityFeePerGas);
  } catch {
    return null;
  }
}
