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

/**
 * Removes what a check must never match: line comments, (nested) block comments and the
 * contents of string literals, including raw strings. Comments become a space so the tokens
 * around them stay separated; strings keep their quotes and lose their contents.
 */
export function stripCommentsAndStrings(code: string): string {
  let out = "";
  let i = 0;
  while (i < code.length) {
    const rest = code.slice(i);
    if (rest.startsWith("//")) {
      const end = code.indexOf("\n", i);
      i = end === -1 ? code.length : end;
      out += " ";
    } else if (rest.startsWith("/*")) {
      let depth = 1;
      i += 2;
      while (i < code.length && depth > 0) {
        if (code.startsWith("/*", i)) {
          depth += 1;
          i += 2;
        } else if (code.startsWith("*/", i)) {
          depth -= 1;
          i += 2;
        } else {
          i += 1;
        }
      }
      out += " ";
    } else if (/^b?r#*"/.test(rest) && !/[A-Za-z0-9_]/.test(code[i - 1] ?? "")) {
      // Raw string r"..." / r#"..."#: ends at a quote followed by the same number of hashes.
      const opening = rest.match(/^b?r(#*)"/)!;
      const closing = `"${opening[1]}`;
      const end = code.indexOf(closing, i + opening[0].length);
      i = end === -1 ? code.length : end + closing.length;
      out += '""';
    } else if (code[i] === '"') {
      i += 1;
      while (i < code.length && code[i] !== '"') {
        i += code[i] === "\\" ? 2 : 1;
      }
      i += 1;
      out += '""';
    } else {
      out += code[i];
      i += 1;
    }
  }
  return out;
}

/**
 * Runs every check against the code, with comments and string contents removed so a check
 * cannot be passed by writing the expected snippet in a comment or a string.
 */
export function validateCode(code: string, checks: LessonCheck[]): ValidationResult {
  const source = stripCommentsAndStrings(code);
  const hints = checks
    .filter((check) => !check.anyOf.some((snippet) => snippetPattern(snippet).test(source)))
    .map((check) => check.hint);
  return { passed: hints.length === 0, hints };
}
