/**
 * Longest code /api/claim and /api/solution accept, in UTF-16 units (JavaScript string length):
 * about twice the longest reference solution or starter (4,572 characters, lesson 21), so every
 * real attempt fits and the server never validates more code than that (#138). Shared by the
 * routes and the lesson page, which warns before sending longer code (#140).
 */
export const MAX_CODE_LENGTH = 10_000;

/** From this share of the limit, the editor's counter turns amber. */
const NEAR_LIMIT_RATIO = 0.9;

/** Fixed locale, so the server render and the browser agree: "10,000". */
const NUMBER = new Intl.NumberFormat('en-US');

/** How close the code is to the limit: under it, near it (90% and more) or over it. */
export type CodeLengthLevel = 'ok' | 'near' | 'over';

export function codeLengthLevel(length: number): CodeLengthLevel {
  if (length > MAX_CODE_LENGTH) return 'over';
  return length >= NEAR_LIMIT_RATIO * MAX_CODE_LENGTH ? 'near' : 'ok';
}

/** Whether the server would refuse this code for being too long. */
export function isCodeTooLong(code: string): boolean {
  return code.length > MAX_CODE_LENGTH;
}

/** The editor's counter: "1,234 / 10,000". */
export function codeLengthLabel(length: number): string {
  return `${NUMBER.format(length)} / ${NUMBER.format(MAX_CODE_LENGTH)}`;
}

/** Why code over the limit cannot be sent, and how much to remove. */
export function codeTooLongMessage(length: number): string {
  return (
    `Your code is ${NUMBER.format(length)} characters, over the ${NUMBER.format(MAX_CODE_LENGTH)}-character limit ` +
    `for claiming a certificate or comparing with the reference. Remove ${NUMBER.format(length - MAX_CODE_LENGTH)} ` +
    'characters, such as long comments or unused code, then try again.'
  );
}
