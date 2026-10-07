import { describe, expect, it } from "vitest";

import { claimRecords, firstClaimBlock, formatClaimDate } from "./claims";

const TX_A = `0x${"a".repeat(64)}` as const;
const TX_B = `0x${"b".repeat(64)}` as const;

describe("firstClaimBlock", () => {
  it("starts at the deployment block on Arbitrum Sepolia, at 0 elsewhere", () => {
    expect(firstClaimBlock(421614)).toBe(315_775_395n);
    expect(firstClaimBlock(31337)).toBe(0n);
  });
});

describe("claimRecords", () => {
  it("maps each lesson to its claim transaction and block time", () => {
    const records = claimRecords(
      [
        { args: { lessonId: 2n }, transactionHash: TX_A, blockNumber: 100n },
        { args: { lessonId: 9n }, transactionHash: TX_B, blockNumber: 200n },
      ],
      new Map([
        [100n, 1_791_148_048n],
        [200n, 1_791_150_000n],
      ]),
    );
    expect(records.get(2)).toEqual({ transactionHash: TX_A, claimedAt: new Date(1_791_148_048_000) });
    expect(records.get(9)?.transactionHash).toBe(TX_B);
  });

  it("keeps the transaction when the block time is unknown", () => {
    const records = claimRecords([{ args: { lessonId: 2n }, transactionHash: TX_A, blockNumber: 100n }], new Map());
    expect(records.get(2)).toEqual({ transactionHash: TX_A, claimedAt: null });
  });

  it("keeps the first log of a lesson and skips incomplete ones", () => {
    const records = claimRecords(
      [
        { args: { lessonId: 2n }, transactionHash: TX_A, blockNumber: 100n },
        { args: { lessonId: 2n }, transactionHash: TX_B, blockNumber: 200n },
        { args: {}, transactionHash: TX_B, blockNumber: 200n },
        { args: { lessonId: 3n }, transactionHash: null, blockNumber: null },
      ],
      new Map(),
    );
    expect([...records.keys()]).toEqual([2]);
    expect(records.get(2)?.transactionHash).toBe(TX_A);
  });
});

describe("formatClaimDate", () => {
  it("formats in UTC, whatever the visitor's time zone", () => {
    expect(formatClaimDate(new Date("2026-10-04T21:07:28Z"))).toBe("4 Oct 2026, 21:07 UTC");
  });
});
