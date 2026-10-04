/**
 * Static lesson checks, shared by the lesson page (instant feedback) and the claim API
 * route (server-side re-validation). Pure functions only: no DOM, no Node APIs.
 */

export interface LessonCheck {
  /** Code snippets; the check passes when the code contains any of them, whatever the whitespace. */
  anyOf: string[];
  /** Shown to the student when the check fails. */
  hint: string;
}

export interface ValidationResult {
  passed: boolean;
  /** Hints of the failed checks, in check order. */
  hints: string[];
}

const TOKEN = /[A-Za-z0-9_]+|\S/g;
const WORD = /^[A-Za-z0-9_]+$/;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Turns a snippet into a whitespace-insensitive pattern: identifiers and keywords must stay
 * separated by whitespace, punctuation may or may not be surrounded by it, and the snippet
 * cannot start or end in the middle of an identifier.
 */
export function snippetPattern(snippet: string): RegExp {
  const tokens: string[] = Array.from(snippet.match(TOKEN) ?? []);
  if (tokens.length === 0) {
    throw new Error("A check snippet cannot be empty");
  }
  let source = "";
  tokens.forEach((token, index) => {
    if (index > 0) {
      source += WORD.test(tokens[index - 1]) && WORD.test(token) ? "\\s+" : "\\s*";
    }
    source += escapeRegExp(token);
  });
  const start = WORD.test(tokens[0]) ? "(?<![A-Za-z0-9_])" : "";
  const end = WORD.test(tokens[tokens.length - 1]) ? "(?![A-Za-z0-9_])" : "";
  return new RegExp(start + source + end);
}

/** Runs every check against the code and collects the hints of the failed ones. */
export function validateCode(code: string, checks: LessonCheck[]): ValidationResult {
  const hints = checks
    .filter((check) => !check.anyOf.some((snippet) => snippetPattern(snippet).test(code)))
    .map((check) => check.hint);
  return { passed: hints.length === 0, hints };
}
