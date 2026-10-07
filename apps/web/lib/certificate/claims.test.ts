import { describe, expect, it } from "vitest";

import { firstClaimBlock, formatClaimDate } from "./claims";

describe("firstClaimBlock", () => {
  it("starts at the deployment block on Arbitrum Sepolia, at 0 elsewhere", () => {
    expect(firstClaimBlock(421614)).toBe(315_775_395n);
    expect(firstClaimBlock(31337)).toBe(0n);
  });
});

describe("formatClaimDate", () => {
  it("formats in UTC, whatever the visitor's time zone", () => {
    expect(formatClaimDate(new Date("2026-10-04T21:07:28Z"))).toBe("4 Oct 2026, 21:07 UTC");
  });
});
