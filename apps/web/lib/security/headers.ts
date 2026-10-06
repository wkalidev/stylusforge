/** A response header, in the shape next.config.ts `headers()` expects. */
export type Header = { key: string; value: string };

/** Two years, the max-age Vercel already sends by default. */
const HSTS_MAX_AGE = 63_072_000;

/**
 * Report-only while the policy is checked against a deployment: violations are logged in the
 * browser console instead of blocked. Enforcing it means renaming this to Content-Security-Policy.
 * Next.js reads the nonce from either header on the request.
 */
export const CSP_HEADER = 'Content-Security-Policy-Report-Only';

/**
 * WalletConnect / Reown endpoints the wallet stack calls from the page: the hosts that Reown's CSP
 * guide lists (docs.reown.com/advanced/security/content-security-policy) and that the client
 * bundle actually contains. RainbowKit draws its own modal, so the AppKit UI hosts (fonts, images,
 * the embedded wallet frame) are not needed.
 */
const WALLETCONNECT_CONNECT = [
  'https://rpc.walletconnect.org',
  'https://relay.walletconnect.org',
  'wss://relay.walletconnect.org',
  'https://pulse.walletconnect.org',
  'https://api.web3modal.org',
  'https://echo.walletconnect.com',
];
/**
 * RainbowKit's MetaMask option runs @metamask/sdk 0.33, which opens a websocket to its socket server
 * (`https://metamask-sdk.api.cx.metamask.io/`, websocket transport only) and posts telemetry to
 * its analytics endpoint, which MetaMask's CSP guidance lists (docs.metamask.io/metamask-connect/troubleshooting).
 */
const METAMASK_CONNECT = ['wss://metamask-sdk.api.cx.metamask.io', 'https://mm-sdk-analytics.api.cx.metamask.io'];
/** The Verify API iframe, which tells wallets whether the requesting domain is genuine. */
const WALLETCONNECT_FRAMES = ['https://verify.walletconnect.org', 'https://verify.walletconnect.com'];

/** Origins of the chain's RPC URLs: https://sepolia-rollup.arbitrum.io/rpc → https://sepolia-rollup.arbitrum.io. */
function origins(urls: readonly string[]): string[] {
  return [...new Set(urls.map((url) => new URL(url).origin))];
}

/** What the Content Security Policy depends on: the chain, the environment and the request's nonce. */
export type CspOptions = { rpcUrls: readonly string[]; development: boolean; nonce: string };

/**
 * Content Security Policy for one request: scripts, styles, fonts and workers (Monaco's included)
 * from the app only, network calls to the app, the chain RPC, WalletConnect and MetaMask, and no
 * framing. Scripts run only when they carry the request's nonce, which Next.js adds to its own
 * inline and bundle scripts, or when a trusted script loads them (`'strict-dynamic'`, which also
 * makes browsers ignore `'self'`). `'unsafe-eval'` is added in development only, where React uses
 * eval for debugging information. Styles allow `'unsafe-inline'` with no nonce: Monaco and
 * RainbowKit set inline styles, and a nonce would make browsers ignore `'unsafe-inline'`.
 */
export function contentSecurityPolicy({ rpcUrls, development, nonce }: CspOptions): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(development ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    // data: for the font that @base-org/account (RainbowKit's Base option) inlines in its dialog.
    'font-src': ["'self'", 'data:'],
    'worker-src': ["'self'"],
    'connect-src': ["'self'", ...origins(rpcUrls), ...WALLETCONNECT_CONNECT, ...METAMASK_CONNECT],
    'frame-src': WALLETCONNECT_FRAMES,
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  return Object.entries(directives)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

/**
 * Headers sent with every response by next.config.ts: no framing by other sites (clickjacking on
 * the claim and profile pages), no MIME sniffing, no full URLs in cross-origin referrers, no camera,
 * microphone or geolocation, and HTTPS for the domain and its subdomains. The Content Security
 * Policy is not among them: it carries a nonce per request, so proxy.ts sends it.
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
