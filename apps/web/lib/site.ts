/** Public facts about the project, shown in the footer. Handles only: no real names. */

export const AUTHOR_HANDLE = 'wkalidev';
export const AUTHOR_GITHUB_URL = 'https://github.com/wkalidev';
export const AUTHOR_SITE_URL = 'https://wkalidev.com';
export const REPOSITORY_URL = 'https://github.com/wkalidev/stylusforge';
export const LICENSE_URL = `${REPOSITORY_URL}/blob/main/LICENSE`;

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
