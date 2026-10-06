import { describe, expect, it } from "vitest";

import { securityHeaders } from "./headers";

function header(name: string): string | undefined {
  return securityHeaders().find((candidate) => candidate.key === name)?.value;
}

describe("securityHeaders", () => {
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
