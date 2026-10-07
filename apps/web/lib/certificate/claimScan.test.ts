import { describe, expect, it } from "vitest";

import { claimCacheKey, parseClaimCache, scanClaims, serializeClaimCache, type ClaimCache, type ClaimSource } from "./claimScan";

const FIRST = 1_000_000n;
const LATEST = 1_400_000n;
const tx = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as const;

/**
 * A fake chain: claims at given blocks, a block time of 10 s per block, and an RPC that can
 * refuse ranges larger than `maxRange` or reading below `failBelow`. Records every call.
 */
function fakeSource({
  claims,
  latest = LATEST,
  maxRange,
  failBelow,
  failBlockTime = false,
  failLatest = false,
}: {
  claims: { lessonId: number; block: bigint }[];
  latest?: bigint;
  maxRange?: bigint;
  failBelow?: bigint;
  failBlockTime?: boolean;
  failLatest?: boolean;
}) {
  const calls = { latest: 0, ranges: [] as [bigint, bigint][], refused: [] as [bigint, bigint][], blockTimes: [] as bigint[] };
  const source: ClaimSource = {
    async latestBlock() {
      calls.latest += 1;
      if (failLatest) throw new Error("rpc down");
      return latest;
    },
    async logs(from, to) {
      if ((maxRange !== undefined && to - from + 1n > maxRange) || (failBelow !== undefined && from < failBelow)) {
        calls.refused.push([from, to]);
        throw new Error("query returned more than 10000 results / block range too large");
      }
      calls.ranges.push([from, to]);
      return claims
        .filter(({ block }) => block >= from && block <= to)
        .map(({ lessonId, block }) => ({ lessonId: BigInt(lessonId), transactionHash: tx(lessonId), blockNumber: block }));
    },
    async blockTime(block) {
      calls.blockTimes.push(block);
      if (failBlockTime) throw new Error("block not found");
      return block * 10n;
    },
  };
  return { source, calls };
}

describe("scanClaims", () => {
  it("reads the logs in contiguous chunks of at most 50,000 blocks, newest first", async () => {
    // The claim is in the first block, so the scan reaches it.
    const { source, calls } = fakeSource({ claims: [{ lessonId: 1, block: FIRST }] });
    const { cache, complete } = await scanClaims({ source, wanted: new Set([1]), cache: null, firstBlock: FIRST });
    expect(complete).toBe(true);
    expect(calls.ranges[0]).toEqual([LATEST - 49_999n, LATEST]);
    for (const [from, to] of calls.ranges) expect(to - from + 1n).toBeLessThanOrEqual(50_000n);
    calls.ranges.forEach(([from], i) => {
      if (i > 0) expect(calls.ranges[i - 1][0]).toBe(calls.ranges[i][1] + 1n);
      expect(from).toBeGreaterThanOrEqual(FIRST);
    });
    expect(calls.ranges.at(-1)?.[0]).toBe(FIRST);
    expect(cache.records.get(1)).toEqual({ transactionHash: tx(1), blockNumber: FIRST, claimedAt: new Date(Number(FIRST) * 10_000) });
    expect(cache.scannedTo).toBe(LATEST);
  });

  it("stops as soon as every claimed lesson is found", async () => {
    const { source, calls } = fakeSource({
      claims: [
        { lessonId: 1, block: LATEST - 10n },
        { lessonId: 2, block: LATEST - 60_000n },
        { lessonId: 7, block: FIRST + 5n },
      ],
    });
    const { cache, complete } = await scanClaims({ source, wanted: new Set([1, 2]), cache: null, firstBlock: FIRST });
    expect(complete).toBe(true);
    expect(calls.ranges).toHaveLength(2);
    expect([...cache.records.keys()].sort()).toEqual([1, 2]);
    // Every claim up to the latest block is known (the contract lists them all): later scans start there.
    expect(cache.scannedTo).toBe(LATEST);
  });

  it("reads every block down to the first one when a lesson is never found", async () => {
    const { source, calls } = fakeSource({ claims: [] });
    const { cache, complete } = await scanClaims({ source, wanted: new Set([3]), cache: null, firstBlock: FIRST });
    expect(complete).toBe(true);
    expect(calls.ranges).toHaveLength(Number((LATEST - FIRST + 1n + 49_999n) / 50_000n));
    expect(cache.records.size).toBe(0);
  });

  it("halves a range the RPC refuses, and keeps the smaller size", async () => {
    const { source, calls } = fakeSource({ claims: [{ lessonId: 1, block: FIRST + 3n }], maxRange: 20_000n });
    const { cache, complete } = await scanClaims({ source, wanted: new Set([1]), cache: null, firstBlock: FIRST });
    expect(complete).toBe(true);
    expect(calls.refused.map(([from, to]) => to - from + 1n)).toEqual([50_000n, 25_000n]);
    for (const [from, to] of calls.ranges) expect(to - from + 1n).toBeLessThanOrEqual(12_500n);
    expect(cache.records.has(1)).toBe(true);
  });

  it("gives up below the minimum chunk without throwing, keeping the previous coverage", async () => {
    const { source, calls } = fakeSource({ claims: [{ lessonId: 1, block: LATEST }], maxRange: 500n });
    const { cache, complete } = await scanClaims({ source, wanted: new Set([1]), cache: null, firstBlock: FIRST });
    expect(complete).toBe(false);
    expect(calls.refused.map(([from, to]) => to - from + 1n)).toEqual([50_000n, 25_000n, 12_500n, 6_250n, 3_125n, 1_562n, 1_000n]);
    expect(cache.records.size).toBe(0);
    expect(cache.scannedTo).toBe(FIRST - 1n);
  });

  it("keeps the records found before a failure, without moving the coverage", async () => {
    const { source } = fakeSource({
      claims: [
        { lessonId: 1, block: LATEST - 5n },
        { lessonId: 2, block: FIRST + 5n },
      ],
      failBelow: LATEST - 100_000n,
    });
    const previous: ClaimCache = { scannedTo: FIRST - 1n, records: new Map() };
    const { cache, complete } = await scanClaims({ source, wanted: new Set([1, 2]), cache: previous, firstBlock: FIRST });
    expect(complete).toBe(false);
    expect([...cache.records.keys()]).toEqual([1]);
    expect(cache.scannedTo).toBe(FIRST - 1n);
  });

  it("makes no request when every claimed lesson is cached with its date", async () => {
    const { source, calls } = fakeSource({ claims: [] });
    const cached: ClaimCache = {
      scannedTo: LATEST - 1_000n,
      records: new Map([[1, { transactionHash: tx(1), blockNumber: FIRST, claimedAt: new Date(1) }]]),
    };
    const { cache, complete } = await scanClaims({ source, wanted: new Set([1]), cache: cached, firstBlock: FIRST });
    expect(complete).toBe(true);
    expect(calls).toEqual({ latest: 0, ranges: [], refused: [], blockTimes: [] });
    expect(cache).toEqual(cached);
  });

  it("only reads the blocks after the cached coverage for a new claim", async () => {
    const scannedTo = LATEST - 70_000n;
    const { source, calls } = fakeSource({ claims: [{ lessonId: 9, block: LATEST - 65_000n }] });
    const cached: ClaimCache = { scannedTo, records: new Map([[1, { transactionHash: tx(1), blockNumber: FIRST, claimedAt: new Date(1) }]]) };
    const { cache } = await scanClaims({ source, wanted: new Set([1, 9]), cache: cached, firstBlock: FIRST });
    for (const [from] of calls.ranges) expect(from).toBeGreaterThan(scannedTo);
    expect(calls.ranges.at(-1)?.[0]).toBe(scannedTo + 1n);
    expect([...cache.records.keys()].sort()).toEqual([1, 9]);
    expect(cache.scannedTo).toBe(LATEST);
  });

  it("reads again the date of a cached claim that has none", async () => {
    const { source, calls } = fakeSource({ claims: [] });
    const cached: ClaimCache = { scannedTo: LATEST, records: new Map([[1, { transactionHash: tx(1), blockNumber: FIRST, claimedAt: null }]]) };
    const { cache } = await scanClaims({ source, wanted: new Set([1]), cache: cached, firstBlock: FIRST });
    expect(calls.ranges).toEqual([]);
    expect(calls.blockTimes).toEqual([FIRST]);
    expect(cache.records.get(1)?.claimedAt).toEqual(new Date(Number(FIRST) * 10_000));
  });

  it("keeps a claim without a date when its block cannot be read", async () => {
    const { source } = fakeSource({ claims: [{ lessonId: 1, block: LATEST - 1n }], failBlockTime: true });
    const { cache, complete } = await scanClaims({ source, wanted: new Set([1]), cache: null, firstBlock: FIRST });
    expect(complete).toBe(true);
    expect(cache.records.get(1)).toEqual({ transactionHash: tx(1), blockNumber: LATEST - 1n, claimedAt: null });
  });

  it("throws when the latest block cannot be read, so the caller falls back", async () => {
    const { source } = fakeSource({ claims: [], failLatest: true });
    await expect(scanClaims({ source, wanted: new Set([1]), cache: null, firstBlock: FIRST })).rejects.toThrow("rpc down");
  });
});

describe("claim cache storage", () => {
  const cache: ClaimCache = {
    scannedTo: LATEST,
    records: new Map([
      [1, { transactionHash: tx(1), blockNumber: FIRST + 1n, claimedAt: new Date("2026-10-06T19:30:00Z") }],
      [9, { transactionHash: tx(9), blockNumber: FIRST + 9n, claimedAt: null }],
    ]),
  };

  it("round-trips through JSON, block numbers and dates included", () => {
    expect(parseClaimCache(serializeClaimCache(cache))).toEqual(cache);
  });

  it.each([
    ["nothing", null],
    ["empty", ""],
    ["not JSON", "{"],
    ["no coverage", JSON.stringify({ records: {} })],
    ["a bad hash", JSON.stringify({ scannedTo: "1", records: { "1": { tx: "0x12", block: "1", at: null } } })],
    ["a bad block", JSON.stringify({ scannedTo: "1", records: { "1": { tx: tx(1), block: "-1", at: null } } })],
    ["a bad lesson id", JSON.stringify({ scannedTo: "1", records: { "0": { tx: tx(1), block: "1", at: null } } })],
    ["a bad date", JSON.stringify({ scannedTo: "1", records: { "1": { tx: tx(1), block: "1", at: "soon" } } })],
  ])("is ignored when %s is stored", (_label, raw) => {
    expect(parseClaimCache(raw)).toBeNull();
  });

  it("is kept per chain, contract and wallet, whatever the address case", () => {
    const contract = "0xF7f027a6AF8d2f99a9b8f466983f4515522DaA8d";
    const student = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
    expect(claimCacheKey(421614, contract, student)).toBe(`stylusforge:claims:v1:421614:${contract.toLowerCase()}:${student.toLowerCase()}`);
    expect(claimCacheKey(31337, contract, student)).not.toBe(claimCacheKey(421614, contract, student));
  });
});
