import { describe, expect, it } from "vitest";

import { tokenUrl, transactionUrl } from "./explorer";

// Tests run on the default chain, Arbitrum Sepolia, whose explorer is Arbiscan.
describe("explorer links", () => {
  it("links a transaction", () => {
    expect(transactionUrl(`0x${"a".repeat(64)}`)).toBe(`https://sepolia.arbiscan.io/tx/0x${"a".repeat(64)}`);
  });

  it("links one token of a contract", () => {
    expect(tokenUrl("0xf7f027a6af8d2f99a9b8f466983f4515522daa8d", 3)).toBe(
      "https://sepolia.arbiscan.io/nft/0xf7f027a6af8d2f99a9b8f466983f4515522daa8d/3",
    );
  });
});
