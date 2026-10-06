import type { NextConfig } from "next";
import { chain } from "./lib/chain";
import { securityHeaders } from "./lib/security/headers";

const nextConfig: NextConfig = {
  async headers() {
    const headers = securityHeaders({
      rpcUrls: chain.rpcUrls.default.http,
      development: process.env.NODE_ENV === "development",
    });
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
