/** Public facts about the project: the footer's links and the app's canonical URL. Handles only: no real names. */

export const AUTHOR_HANDLE = 'wkalidev';
export const AUTHOR_GITHUB_URL = 'https://github.com/wkalidev';
export const AUTHOR_SITE_URL = 'https://wkalidev.com';
export const REPOSITORY_URL = 'https://github.com/wkalidev/stylusforge';
export const LICENSE_URL = `${REPOSITORY_URL}/blob/main/LICENSE`;

/** The deployed app: the default canonical URL outside development. */
export const PRODUCTION_SITE_URL = 'https://stylusforge.wkalidev.com';

/** Where `next dev` serves the app, and the metadata URI `pnpm deploy:local` sets on the local contract. */
export const DEVELOPMENT_SITE_URL = 'http://localhost:3000';

/**
 * The app's canonical origin, from SITE_URL or else the default of the environment. Certificate
 * metadata builds its links from it rather than from the request's host, so a deployment URL or a
 * preview never ends up in a wallet or marketplace cache (#147). Only an origin is accepted:
 * https (http on localhost), no path, query, fragment or credentials; a trailing slash is dropped.
 */
export function resolveSiteUrl(configured: string | undefined, development: boolean): string {
  if (!configured) {
    return development ? DEVELOPMENT_SITE_URL : PRODUCTION_SITE_URL;
  }
  const refuse = (problem: string) => new Error(`SITE_URL must be the app's origin, like ${PRODUCTION_SITE_URL}: ${problem} (got "${configured}")`);
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw refuse('not a URL');
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw refuse('use https (http only for localhost)');
  }
  if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw refuse('remove the path, query, fragment or credentials');
  }
  return url.origin;
}

export const SITE_URL = resolveSiteUrl(process.env.SITE_URL, process.env.NODE_ENV === 'development');

/**
 * Date of the repository's first commit (bcb9965, 2026-09-27). Stored rather than read from git
 * at build time, since deployment builds often use shallow clones without that history.
 */
export const FIRST_COMMIT_DATE = new Date('2026-09-27T00:00:00Z');

/** "2026" when both years match, "2026–2028" otherwise. */
export function copyrightYears(startYear: number, currentYear: number): string {
  return currentYear > startYear ? `${startYear}–${currentYear}` : String(startYear);
}

/** "Est. September 2026". */
export function establishedLabel(date: Date): string {
  return `Est. ${date.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`;
}
