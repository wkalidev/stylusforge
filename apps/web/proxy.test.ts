import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { CSP_HEADER } from "./lib/security/headers";
import { config, proxy } from "./proxy";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function run(path = "/learn/hello-world") {
  return proxy(new NextRequest(`https://stylusforge.wkalidev.com${path}`));
}

/** The nonce in a policy's script-src. */
function nonceOf(policy: string | null): string | undefined {
  return policy?.match(/'nonce-([^']+)'/)?.[1];
}

/** Whether the proxy runs for a path, with the given request headers. */
function matches(url: string, headers: Record<string, string> = {}): boolean {
  return unstable_doesMiddlewareMatch({ config, url, headers });
}

describe("proxy", () => {
  it("enforces the Content Security Policy with a nonce", () => {
    const response = run();
    expect(CSP_HEADER).toBe("Content-Security-Policy");
    expect(response.headers.get(CSP_HEADER)).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(response.headers.get("content-security-policy-report-only")).toBeNull();
  });

  it("passes the same policy on to the request, where Next.js reads the nonce", () => {
    const response = run();
    expect(response.headers.get("x-middleware-override-headers")?.split(",")).toContain(CSP_HEADER.toLowerCase());
    expect(response.headers.get(`x-middleware-request-${CSP_HEADER.toLowerCase()}`)).toBe(response.headers.get(CSP_HEADER));
  });

  it("makes the nonce from a random UUID, base64-encoded", () => {
    const nonce = nonceOf(run().headers.get(CSP_HEADER));
    expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(Buffer.from(nonce ?? "", "base64").toString()).toMatch(UUID);
  });

  it("uses a fresh nonce for each request", () => {
    const nonces = new Set(Array.from({ length: 5 }, () => nonceOf(run().headers.get(CSP_HEADER))));
    expect(nonces.size).toBe(5);
  });

  it("allows the configured chain's RPC origin", () => {
    expect(run().headers.get(CSP_HEADER)).toContain("https://sepolia-rollup.arbitrum.io");
  });
});

describe("proxy matcher", () => {
  it("runs on pages", () => {
    expect(matches("/")).toBe(true);
    expect(matches("/learn")).toBe(true);
    expect(matches("/learn/hello-world")).toBe(true);
    expect(matches("/profile")).toBe(true);
  });

  it("runs on API routes", () => {
    expect(matches("/api/claim")).toBe(true);
    expect(matches("/api/metadata/1")).toBe(true);
  });

  it("skips static files, optimized images and the favicon", () => {
    expect(matches("/_next/static/chunks/main.js")).toBe(false);
    expect(matches("/_next/image?url=%2Ficon.png&w=64&q=75")).toBe(false);
    expect(matches("/favicon.ico")).toBe(false);
  });

  it("skips link prefetches", () => {
    expect(matches("/learn/hello-world", { "next-router-prefetch": "1" })).toBe(false);
    expect(matches("/learn/hello-world", { purpose: "prefetch" })).toBe(false);
  });
});
