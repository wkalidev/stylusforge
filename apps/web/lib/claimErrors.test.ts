import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError, encodeErrorResult } from "viem";
import { describe, expect, it } from "vitest";

import { describeClaimError, VoucherRequestError } from "./claimErrors";
import { stylusForgeNftAbi } from "./contract";

function revert(errorName: "AlreadyCompleted" | "ClaimExpired" | "InvalidSignature") {
  const args = {
    AlreadyCompleted: ["0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", 1n],
    ClaimExpired: [1n],
    InvalidSignature: [],
  }[errorName];
  const data = encodeErrorResult({ abi: stylusForgeNftAbi, errorName, args } as Parameters<typeof encodeErrorResult>[0]);
  const reverted = new ContractFunctionRevertedError({ abi: stylusForgeNftAbi, data, functionName: "claim" });
  return new BaseError("Execution reverted", { cause: reverted });
}

describe("describeClaimError", () => {
  it("passes voucher errors through", () => {
    expect(describeClaimError(new VoucherRequestError("The code does not pass."))).toBe("The code does not pass.");
  });

  it("explains a rejected wallet request", () => {
    const error = new BaseError("Request failed", { cause: new UserRejectedRequestError(new Error("denied")) });
    expect(describeClaimError(error)).toMatch(/rejected in the wallet/);
  });

  it.each([
    ["AlreadyCompleted", /already on-chain/],
    ["ClaimExpired", /expired/],
    ["InvalidSignature", /claim signer/],
  ] as const)("explains the %s revert", (name, message) => {
    expect(describeClaimError(revert(name))).toMatch(message);
  });

  it("reports an unreachable server", () => {
    expect(describeClaimError(new TypeError("Failed to fetch"))).toMatch(/could not be reached/);
  });

  it("falls back to a generic message", () => {
    expect(describeClaimError("boom")).toMatch(/Try again/);
  });
});
