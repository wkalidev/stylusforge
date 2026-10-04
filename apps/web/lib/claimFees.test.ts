import { describe, expect, it } from "vitest";

import { claimFees, suggestClaimFees } from "./claimFees";

/** The fees reported on Arbitrum Sepolia: the wallet's max fee was below the next block's base fee. */
const REPORTED = { walletMaxFeePerGas: 62_278_000n, blockBaseFee: 63_346_000n };

function client(baseFeePerGas: bigint | null | undefined, priority = 0n, fail = false) {
  return {
    getBlock: async () => {
      if (fail) throw new Error("RPC down");
      return { baseFeePerGas } as Awaited<ReturnType<Parameters<typeof suggestClaimFees>[0]["getBlock"]>>;
    },
    estimateMaxPriorityFeePerGas: async () => priority,
  } as Parameters<typeof suggestClaimFees>[0];
}

describe("claimFees", () => {
  it("allows twice the base fee plus the priority fee", () => {
    expect(claimFees(100n, 0n)).toEqual({ maxFeePerGas: 200n, maxPriorityFeePerGas: 0n });
    expect(claimFees(100n, 7n)).toEqual({ maxFeePerGas: 207n, maxPriorityFeePerGas: 7n });
  });

  it("covers the base fee rise that rejected the reported claim", () => {
    // The wallet proposed about the base fee it saw; the next block's was higher.
    expect(REPORTED.walletMaxFeePerGas).toBeLessThan(REPORTED.blockBaseFee);
    const { maxFeePerGas } = claimFees(REPORTED.walletMaxFeePerGas, 0n);
    expect(maxFeePerGas).toBe(124_556_000n);
    expect(maxFeePerGas).toBeGreaterThan(REPORTED.blockBaseFee);
  });

  it("stays valid until the base fee has doubled", () => {
    const baseFee = 63_346_000n;
    const { maxFeePerGas, maxPriorityFeePerGas } = claimFees(baseFee, 1_000n);
    expect(maxFeePerGas).toBeGreaterThanOrEqual(baseFee * 2n + maxPriorityFeePerGas);
    expect(maxFeePerGas).toBeGreaterThanOrEqual(maxPriorityFeePerGas);
  });
});

describe("suggestClaimFees", () => {
  it("uses the latest base fee and the priority fee estimate", async () => {
    expect(await suggestClaimFees(client(63_346_000n, 10n))).toEqual({ maxFeePerGas: 126_692_010n, maxPriorityFeePerGas: 10n });
  });

  it("leaves the fees to the wallet without a base fee or when the RPC fails", async () => {
    expect(await suggestClaimFees(client(null))).toBeNull();
    expect(await suggestClaimFees(client(undefined))).toBeNull();
    expect(await suggestClaimFees(client(1n, 0n, true))).toBeNull();
  });
});
