/** A response header, in the shape next.config.ts `headers()` expects. */
export type Header = { key: string; value: string };

/** Two years, the max-age Vercel already sends by default. */
const HSTS_MAX_AGE = 63_072_000;

/**
 * Headers sent with every page and API response: no framing by other sites (clickjacking on the
 * claim and profile pages), no MIME sniffing, no full URLs in cross-origin referrers, no camera,
 * microphone or geolocation, and HTTPS for the domain and its subdomains.
 */
export function securityHeaders(): Header[] {
  return [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Strict-Transport-Security', value: `max-age=${HSTS_MAX_AGE}; includeSubDomains` },
  ];
}
