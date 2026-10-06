import { NextResponse, type NextRequest } from "next/server";
import { chain } from "./lib/chain";
import { CSP_HEADER, contentSecurityPolicy } from "./lib/security/headers";

/**
 * Sends the Content Security Policy with a fresh nonce for each request. The policy is set on the
 * request, where Next.js reads the nonce and adds it to its scripts while rendering, and on the
 * response, where the browser applies it.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy({
    rpcUrls: chain.rpcUrls.default.http,
    development: process.env.NODE_ENV === "development",
    nonce,
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CSP_HEADER, policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CSP_HEADER, policy);
  return response;
}

export const config = {
  matcher: [
    {
      // Every path except static files, optimized images and the favicon, which run no scripts.
      // API routes stay covered, so their responses carry the policy too.
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      // Link prefetches are skipped, as the Next.js CSP guide recommends: the page is rendered
      // again with its own nonce when it is visited.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
