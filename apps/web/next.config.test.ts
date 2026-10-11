import { describe, expect, it } from "vitest";

import nextConfig from "./next.config";
import { securityHeaders } from "./lib/security/headers";

describe("next.config", () => {
  it("does not send X-Powered-By", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("sends the security headers on every path", async () => {
    expect(await nextConfig.headers?.()).toEqual([{ source: "/:path*", headers: securityHeaders() }]);
  });
});
