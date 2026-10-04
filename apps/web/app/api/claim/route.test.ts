import { recoverTypedDataAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CLAIM_TYPES, claimDomain } from "@/lib/claim";
import { SOLUTIONS } from "@/lib/curriculum/solutions";

vi.mock("server-only", () => ({}));

const CONTRACT = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const STUDENT = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
const signerKey = generatePrivateKey();

/** Loads the route with the given environment (module-level config is read at import). */
async function loadRoute(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [name, value] of Object.entries(env)) {
    vi.stubEnv(name, value);
  }
  return import("./route");
}

const configured = {
  NEXT_PUBLIC_CHAIN_ID: "31337",
  NEXT_PUBLIC_NFT_CONTRACT_ADDRESS: CONTRACT,
  CLAIM_SIGNER_PRIVATE_KEY: signerKey,
};

function post(body: unknown) {
  return new Request("http://localhost/api/claim", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/claim", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("signs a voucher for a passing solution", async () => {
    const { POST } = await loadRoute(configured);
    const before = Math.floor(Date.now() / 1000);

    const response = await POST(post({ address: STUDENT.toLowerCase(), lessonId: 1, code: SOLUTIONS[1] }));
    expect(response.status).toBe(200);
    const voucher = await response.json();

    expect(voucher.lessonId).toBe("1");
    const deadline = BigInt(voucher.deadline);
    expect(Number(deadline) - before).toBeGreaterThanOrEqual(15 * 60 - 1);
    const recovered = await recoverTypedDataAddress({
      domain: claimDomain(31337, CONTRACT),
      types: CLAIM_TYPES,
      primaryType: "Claim",
      message: { student: STUDENT, lessonId: 1n, deadline },
      signature: voucher.signature,
    });
    expect(recovered).toBe(privateKeyToAccount(signerKey).address);
  });

  it("re-validates the code and returns the hints", async () => {
    const { POST } = await loadRoute(configured);
    const response = await POST(post({ address: STUDENT, lessonId: 1, code: "// string greeting;" }));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.hints.length).toBeGreaterThan(0);
  });

  it.each([
    ["invalid JSON", "{", 400],
    ["a bad address", { address: "0x123", lessonId: 1, code: "" }, 400],
    ["a non-integer lesson id", { address: STUDENT, lessonId: "1", code: "" }, 400],
    ["oversized code", { address: STUDENT, lessonId: 1, code: "x".repeat(50_001) }, 400],
    ["an unknown lesson", { address: STUDENT, lessonId: 99, code: "" }, 404],
    ["an unavailable lesson", { address: STUDENT, lessonId: 5, code: "" }, 404],
  ])("rejects %s", async (_label, body, status) => {
    const { POST } = await loadRoute(configured);
    const response = await POST(post(body));
    expect(response.status).toBe(status);
    expect((await response.json()).error).toBeTypeOf("string");
  });

  it.each([
    ["the signer key is missing", { ...configured, CLAIM_SIGNER_PRIVATE_KEY: "" }],
    ["the signer key is malformed", { ...configured, CLAIM_SIGNER_PRIVATE_KEY: "0x1234" }],
    ["the contract address is missing", { ...configured, NEXT_PUBLIC_NFT_CONTRACT_ADDRESS: "" }],
  ])("answers 503 when %s", async (_label, env) => {
    const { POST } = await loadRoute(env);
    const response = await POST(post({ address: STUDENT, lessonId: 1, code: SOLUTIONS[1] }));
    expect(response.status).toBe(503);
  });
});
