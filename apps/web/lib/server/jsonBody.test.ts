import { describe, expect, it } from "vitest";

import { readJsonBody } from "./jsonBody";

const LIMIT = 100;
const encoder = new TextEncoder();

function request(body: BodyInit | null, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api", { method: "POST", headers, body, duplex: "half" } as RequestInit);
}

/**
 * A streamed (chunked) body with no content-length, which records how much of it was read. With
 * a high-water mark of 0 the stream is only pulled when the reader asks for data.
 */
function stream(chunks: string[], endless = false) {
  const state = { pulled: 0, cancelled: false };
  let index = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (!endless && index >= chunks.length) {
        controller.close();
        return;
      }
      state.pulled += 1;
      controller.enqueue(encoder.encode(chunks[index % chunks.length]));
      index += 1;
    },
    cancel() {
      state.cancelled = true;
    },
  }, { highWaterMark: 0 });
  return { body, state };
}

describe("readJsonBody", () => {
  it("parses a body within the limit, with or without a content-length", async () => {
    expect(await readJsonBody(request('{"a":1}', { "content-length": "7" }), LIMIT)).toEqual({ ok: true, value: { a: 1 } });
    const { body } = stream(['{"a":', "1}"]);
    expect(await readJsonBody(request(body), LIMIT)).toEqual({ ok: true, value: { a: 1 } });
  });

  it("accepts a body of exactly the limit", async () => {
    const json = JSON.stringify({ code: "x".repeat(LIMIT - 11) });
    expect(encoder.encode(json).byteLength).toBe(LIMIT);
    expect((await readJsonBody(request(json), LIMIT)).ok).toBe(true);
  });

  it("refuses a declared content-length over the limit without reading the body", async () => {
    const { body, state } = stream(["{}"]);
    const result = await readJsonBody(request(body, { "content-length": String(LIMIT + 1) }), LIMIT);
    expect(result).toEqual({ ok: false, reason: "too-large" });
    expect(state.pulled).toBe(0);
  });

  it("stops reading a chunked body as soon as it goes over the limit", async () => {
    const { body, state } = stream(["x".repeat(30)], true);
    const result = await readJsonBody(request(body), LIMIT);
    expect(result).toEqual({ ok: false, reason: "too-large" });
    expect(state.pulled).toBeLessThanOrEqual(LIMIT / 30 + 2);
    expect(state.cancelled).toBe(true);
  });

  it("does not trust a content-length smaller than the body", async () => {
    const { body } = stream(["x".repeat(60), "x".repeat(60)]);
    expect(await readJsonBody(request(body, { "content-length": "10" }), LIMIT)).toEqual({ ok: false, reason: "too-large" });
  });

  it.each([
    ["a malformed content-length", request("{}", { "content-length": "12abc" })],
    ["a negative content-length", request("{}", { "content-length": "-1" })],
    ["malformed JSON", request("{")],
    ["invalid UTF-8", request(new Uint8Array([0x7b, 0xff, 0x7d]))],
    ["no body", request(null)],
  ])("refuses %s as invalid", async (_label, input) => {
    expect(await readJsonBody(input, LIMIT)).toEqual({ ok: false, reason: "invalid" });
  });
});
