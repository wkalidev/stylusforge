import { BaseError, ContractFunctionRevertedError, createWalletClient, custom, encodeErrorResult } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { describe, expect, it } from "vitest";

import { CLAIM_ERROR_MESSAGES, describeClaimError, VoucherRequestError } from "./claimErrors";
import { stylusForgeNftAbi } from "./contract";

const STUDENT = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
const CONTRACT = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

/**
 * The error viem throws when a wallet (an EIP-1193 provider such as MetaMask) refuses
 * eth_sendTransaction with `walletError`, through the same writeContract path as the claim button.
 */
async function walletFailure(walletError: object): Promise<unknown> {
  const wallet = createWalletClient({
    account: STUDENT,
    chain: arbitrumSepolia,
    transport: custom({
      async request({ method }) {
        if (method === "eth_chainId") return "0x66eee";
        throw walletError;
      },
    }),
  });
  try {
    await wallet.writeContract({ address: CONTRACT, abi: stylusForgeNftAbi, functionName: "claim", args: [1n, 1n, "0x"] });
  } catch (error) {
    return error;
  }
  throw new Error("the wallet call did not fail");
}

/** MetaMask's shape for node errors: -32603 with the node's message in data. */
const internal = (message: string) => ({ code: -32603, message: "Internal JSON-RPC error.", data: { code: -32000, message } });

function revert(errorName: "AlreadyCompleted" | "ClaimExpired" | "InvalidSignature" | "InvalidLesson") {
  const args = {
    AlreadyCompleted: [STUDENT, 1n],
    ClaimExpired: [1n],
    InvalidSignature: [],
    InvalidLesson: [6n],
  }[errorName];
  const data = encodeErrorResult({ abi: stylusForgeNftAbi, errorName, args } as Parameters<typeof encodeErrorResult>[0]);
  const reverted = new ContractFunctionRevertedError({ abi: stylusForgeNftAbi, data, functionName: "claim" });
  return new BaseError("Execution reverted", { cause: reverted });
}

describe("describeClaimError", () => {
  it("passes voucher errors through, without details", () => {
    expect(describeClaimError(new VoucherRequestError("The code does not pass."))).toEqual({ message: "The code does not pass.", details: null });
  });

  it("explains a base fee above the wallet's max fee, which viem reports as a revert", async () => {
    const error = await walletFailure(
      internal("max fee per gas less than block base fee: address 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC, maxFeePerGas: 62278000, baseFee: 63346000"),
    );
    // What the button used to show.
    expect((error as BaseError).shortMessage).toMatch(/reverted/);
    const view = describeClaimError(error);
    expect(view.message).toBe(CLAIM_ERROR_MESSAGES.fee);
    expect(view.details).toContain("maxFeePerGas: 62278000, baseFee: 63346000");
  });

  it("explains an underpriced transaction as a fee change", async () => {
    expect(describeClaimError(await walletFailure(internal("transaction underpriced"))).message).toBe(CLAIM_ERROR_MESSAGES.fee);
  });

  it("explains a request rejected in the wallet", async () => {
    const view = describeClaimError(await walletFailure({ code: 4001, message: "MetaMask Tx Signature: User denied transaction signature." }));
    expect(view).toEqual({ message: CLAIM_ERROR_MESSAGES.rejected, details: null });
  });

  it("explains missing funds for gas", async () => {
    const view = describeClaimError(await walletFailure(internal("insufficient funds for gas * price + value: balance 0, tx cost 21000")));
    expect(view.message).toBe(CLAIM_ERROR_MESSAGES.funds);
    expect(view.details).toContain("insufficient funds for gas");
  });

  it("does not call an unknown wallet refusal a revert", async () => {
    const view = describeClaimError(await walletFailure(internal("nonce too low")));
    expect(view.message).toBe(CLAIM_ERROR_MESSAGES.refused);
    expect(view.message).not.toMatch(/reverted/);
    expect(view.details).toContain("nonce too low");
  });

  it.each([
    ["AlreadyCompleted", /already on-chain/],
    ["ClaimExpired", /expired/],
    ["InvalidSignature", /claim signer/],
    ["InvalidLesson", /not registered/],
  ] as const)("explains the %s revert, with the raw error", (name, message) => {
    const view = describeClaimError(revert(name));
    expect(view.message).toMatch(message);
    expect(view.details).toContain("Execution reverted");
  });

  it("still explains an error whose raw wallet object cannot be serialized", () => {
    const raw: Record<string, unknown> = { code: 4001, message: "User denied transaction signature." };
    raw.self = raw;
    expect(describeClaimError(new Error("Request failed", { cause: raw })).message).toBe(CLAIM_ERROR_MESSAGES.rejected);
    const fee: Record<string, unknown> = { code: -32603, data: { message: "max fee per gas less than block base fee" } };
    fee.self = fee;
    expect(describeClaimError(new Error("Internal JSON-RPC error.", { cause: fee }))).toEqual({
      message: CLAIM_ERROR_MESSAGES.fee,
      details: "Internal JSON-RPC error.",
    });
  });

  it("reports an unreachable server", () => {
    expect(describeClaimError(new TypeError("Failed to fetch"))).toEqual({ message: CLAIM_ERROR_MESSAGES.offline, details: "Failed to fetch" });
  });

  it("falls back to a generic message", () => {
    expect(describeClaimError("boom")).toEqual({ message: CLAIM_ERROR_MESSAGES.unknown, details: "boom" });
  });
});
