import { recoverTypedDataAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CLAIM_TYPES, claimDomain } from "@/lib/claim";
import { LESSONS } from "@/lib/curriculum/lessons";
import { SOLUTIONS } from "@/lib/curriculum/solutions";
import { MAX_BODY_BYTES, MAX_CODE_LENGTH } from "@/lib/server/codeSubmission";
import { POST } from "./route";
import { UNAVAILABLE_LESSON } from "@/test/unavailableLesson";

vi.mock("@/lib/curriculum/lessons", async (importOriginal) =>
  (await import("@/test/unavailableLesson")).withUnavailableLesson(importOriginal),
);

const CONTRACT = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const STUDENT = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
const NOW = new Date("2026-10-04T12:00:00Z");
const signerKey = generatePrivateKey();

/**
 * The chain and the contract address are read from the environment when their modules load.
 * They are mocked instead, so the route is imported once, outside any test: re-importing it in
 * every test made the first one pay for loading viem and the curriculum, and time out under load.
 * The signer key is read on each request, so tests set it with `vi.stubEnv`.
 */
const config = vi.hoisted(() => ({ contract: null as string | null }));
vi.mock("@/lib/chain", async () => ({ chain: (await import("viem/chains")).hardhat }));
vi.mock("@/lib/contract", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/contract")>()),
  get nftContractAddress() {
    return config.contract;
  },
}));

function configure({ contract = CONTRACT, signer = signerKey }: { contract?: string | null; signer?: string } = {}) {
  config.contract = contract;
  vi.stubEnv("CLAIM_SIGNER_PRIVATE_KEY", signer);
}

function post(body: unknown) {
  return new Request("http://localhost/api/claim", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/claim", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    configure();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("signs a voucher for a passing solution", async () => {
    const response = await POST(post({ address: STUDENT.toLowerCase(), lessonId: 1, code: SOLUTIONS[1] }));
    expect(response.status).toBe(200);
    const voucher = await response.json();

    expect(voucher.lessonId).toBe("1");
    const deadline = BigInt(voucher.deadline);
    expect(deadline).toBe(BigInt(NOW.getTime() / 1000 + 15 * 60));
    const recovered = await recoverTypedDataAddress({
      domain: claimDomain(31337, CONTRACT),
      types: CLAIM_TYPES,
      primaryType: "Claim",
      message: { student: STUDENT, lessonId: 1n, deadline },
      signature: voucher.signature,
    });
    expect(recovered).toBe(privateKeyToAccount(signerKey).address);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("re-validates the code and returns the objectives it misses", async () => {
    const response = await POST(post({ address: STUDENT, lessonId: 1, code: "// string greeting;" }));
    expect(response.status).toBe(422);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.objectives).toEqual(LESSONS[0].exercise!.checks.map((check) => check.objective));
    expect(body.hints).toBeUndefined();
  });

  it.each([
    ["invalid JSON", "{", 400],
    ["a bad address", { address: "0x123", lessonId: 1, code: "" }, 400],
    ["a non-integer lesson id", { address: STUDENT, lessonId: "1", code: "" }, 400],
    ["oversized code", { address: STUDENT, lessonId: 1, code: "x".repeat(MAX_CODE_LENGTH + 1) }, 400],
    ["an unknown lesson", { address: STUDENT, lessonId: 99, code: "" }, 404],
    ["an unavailable lesson", { address: STUDENT, lessonId: UNAVAILABLE_LESSON, code: "" }, 404],
  ])("rejects %s", async (_label, body, status) => {
    const response = await POST(post(body));
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).error).toBeTypeOf("string");
  });

  it(`answers 413 to a declared body over ${MAX_BODY_BYTES} bytes, before reading it`, async () => {
    let pulled = false;
    const body = new ReadableStream(
      {
        pull(controller) {
          pulled = true;
          controller.close();
        },
      },
      { highWaterMark: 0 },
    );
    const request = new Request("http://localhost/api/claim", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": String(MAX_BODY_BYTES + 1) },
      body,
      duplex: "half",
    } as RequestInit);
    const response = await POST(request);
    expect(response.status).toBe(413);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).error).toBe("The request body is too large.");
    expect(pulled).toBe(false);
  });

  it(`answers 413 to a chunked body that grows past ${MAX_BODY_BYTES} bytes`, async () => {
    const chunk = new TextEncoder().encode("x".repeat(4 * 1024));
    let sent = 0;
    const body = new ReadableStream({
      pull(controller) {
        sent += chunk.byteLength;
        controller.enqueue(chunk);
      },
    });
    const request = new Request("http://localhost/api/claim", { method: "POST", body, duplex: "half" } as RequestInit);
    const response = await POST(request);
    expect(response.status).toBe(413);
    expect(sent).toBeLessThan(2 * MAX_BODY_BYTES);
  });

  it("still signs a voucher for code of the maximum length, mostly escaped quotes", async () => {
    // MAX_CODE_LENGTH characters, mostly quotes that JSON escapes to 2 bytes each.
    const code = `${SOLUTIONS[1]}${'"'.repeat(MAX_CODE_LENGTH)}`.slice(0, MAX_CODE_LENGTH);
    expect(code).toHaveLength(MAX_CODE_LENGTH);
    const response = await POST(post({ address: STUDENT, lessonId: 1, code }));
    expect(response.status).toBe(200);
  });

  it.each([
    ["the signer key is missing", { signer: "" }],
    ["the signer key is malformed", { signer: "0x1234" }],
    ["the contract address is missing", { contract: null }],
  ])("answers 503 when %s", async (_label, setup) => {
    configure(setup);
    const response = await POST(post({ address: STUDENT, lessonId: 1, code: SOLUTIONS[1] }));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
