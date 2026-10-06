import { describe, expect, it } from "vitest";

import { CSP_HEADER, contentSecurityPolicy, securityHeaders } from "./headers";

const SEPOLIA_RPC = "https://sepolia-rollup.arbitrum.io/rpc";
const NONCE = "MDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAw";
const production = { rpcUrls: [SEPOLIA_RPC], development: false, nonce: NONCE };

function header(name: string): string | undefined {
  return securityHeaders().find((candidate) => candidate.key === name)?.value;
}

/** The sources of one directive, or undefined when the policy does not set it. */
function directive(policy: string, name: string): string[] | undefined {
  const entry = policy.split("; ").find((candidate) => candidate.split(" ")[0] === name);
  return entry?.split(" ").slice(1);
}

describe("securityHeaders", () => {
  it("leaves the Content Security Policy, which carries a nonce per request, to the proxy", () => {
    const keys = securityHeaders().map((candidate) => candidate.key.toLowerCase());
    expect(keys).not.toContain("content-security-policy");
    expect(keys).not.toContain("content-security-policy-report-only");
  });

  it("forbids framing by any site", () => {
    expect(header("X-Frame-Options")).toBe("DENY");
  });

  it("disables MIME sniffing", () => {
    expect(header("X-Content-Type-Options")).toBe("nosniff");
  });

  it("sends only the origin in cross-origin referrers", () => {
    expect(header("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("turns off the camera, microphone and geolocation", () => {
    expect(header("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
  });

  it("enforces HTTPS for two years, subdomains included", () => {
    expect(header("Strict-Transport-Security")).toBe("max-age=63072000; includeSubDomains");
  });

  it("sends each header once", () => {
    const keys = securityHeaders().map((candidate) => candidate.key.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("contentSecurityPolicy", () => {
  const policy = contentSecurityPolicy(production);

  it("is enforced, not report-only", () => {
    expect(CSP_HEADER).toBe("Content-Security-Policy");
  });

  it("runs only scripts that carry the request's nonce, or that they load", () => {
    expect(directive(policy, "script-src")).toEqual(["'self'", `'nonce-${NONCE}'`, "'strict-dynamic'"]);
  });

  it("does not allow inline scripts without the nonce", () => {
    expect(directive(policy, "script-src")).not.toContain("'unsafe-inline'");
  });

  it("allows eval in development only, for React's debugging information", () => {
    const development = contentSecurityPolicy({ ...production, development: true });
    expect(directive(development, "script-src")).toEqual(["'self'", `'nonce-${NONCE}'`, "'strict-dynamic'", "'unsafe-eval'"]);
  });

  it("allows inline styles without a nonce, for Monaco and RainbowKit", () => {
    expect(directive(policy, "style-src")).toEqual(["'self'", "'unsafe-inline'"]);
  });

  it("runs workers, such as Monaco's editor worker, from the app only", () => {
    expect(directive(policy, "worker-src")).toEqual(["'self'"]);
  });

  it("forbids framing, plugins and foreign base URLs and form targets", () => {
    expect(directive(policy, "frame-ancestors")).toEqual(["'none'"]);
    expect(directive(policy, "object-src")).toEqual(["'none'"]);
    expect(directive(policy, "base-uri")).toEqual(["'self'"]);
    expect(directive(policy, "form-action")).toEqual(["'self'"]);
  });

  it("connects to the app, the chain RPC origin, WalletConnect and MetaMask", () => {
    const connect = directive(policy, "connect-src");
    expect(connect?.slice(0, 2)).toEqual(["'self'", "https://sepolia-rollup.arbitrum.io"]);
    expect(connect).toContain("wss://relay.walletconnect.org");
    expect(connect).toContain("https://rpc.walletconnect.org");
    expect(connect).toContain("wss://metamask-sdk.api.cx.metamask.io");
  });

  it("connects to the local Hardhat node when it is the configured chain", () => {
    const local = contentSecurityPolicy({ rpcUrls: ["http://127.0.0.1:8545"], development: true, nonce: NONCE });
    expect(directive(local, "connect-src")).toContain("http://127.0.0.1:8545");
  });

  it("lists each RPC origin once", () => {
    const twice = contentSecurityPolicy({ ...production, rpcUrls: [SEPOLIA_RPC, `${SEPOLIA_RPC}/backup`] });
    const connect = directive(twice, "connect-src") ?? [];
    expect(connect.filter((source) => source === "https://sepolia-rollup.arbitrum.io")).toHaveLength(1);
  });

  it("frames only the WalletConnect Verify API", () => {
    expect(directive(policy, "frame-src")).toEqual(["https://verify.walletconnect.org", "https://verify.walletconnect.com"]);
  });

  it("loads fonts from the app, or inlined by the Base wallet dialog", () => {
    expect(directive(policy, "font-src")).toEqual(["'self'", "data:"]);
  });

  it("allows nothing from other origins by default", () => {
    expect(directive(policy, "default-src")).toEqual(["'self'"]);
  });
});
