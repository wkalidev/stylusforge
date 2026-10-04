/**
 * Static lesson checks, shared by the lesson page (instant feedback) and the claim API
 * route (server-side re-validation). Pure functions only: no DOM, no Node APIs.
 */

export interface LessonCheck {
  /** Code snippets; the check passes when the code contains any of them, whatever the whitespace. */
  anyOf: string[];
  /** The goal of the check in plain words, never the expected code ("Increment the count by 1"). */
  objective: string;
  /**
   * Hints revealed one at a time, from a nudge to the exact code: only the last one gives the
   * expected code. Inline code is written between backticks.
   */
  hints: string[];
  /**
   * Optional snippet locating where the check belongs (a struct, a function signature): when the
   * check fails, the editor underlines the line where this snippet starts.
   */
  anchor?: string;
}

export interface CheckResult {
  check: LessonCheck;
  passed: boolean;
  /** 1-based line of the check's anchor in the code, or null without an anchor match. */
  line: number | null;
}

export interface ValidationResult {
  passed: boolean;
  /** Objectives of the failed checks, in check order. They never give the expected code. */
  objectives: string[];
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

/** Replaces every character except newlines with a space, keeping positions and lines. */
function blank(segment: string): string {
  return segment.replace(/[^\n]/g, " ");
}

/** A string literal emptied in place: same length, quotes at both ends, contents blanked. */
function emptyLiteral(literal: string): string {
  return literal.length < 2 ? blank(literal) : `"${blank(literal.slice(1, -1))}"`;
}

/**
 * Removes what a check must never match: line comments, (nested) block comments and the
 * contents of string literals, including raw strings. Positions are preserved: removed
 * characters become spaces (newlines stay), so an index in the result is the same index in the
 * original code and matches map back to lines.
 */
export function stripCommentsAndStrings(code: string): string {
  let out = "";
  let i = 0;
  while (i < code.length) {
    const start = i;
    const rest = code.slice(i);
    if (rest.startsWith("//")) {
      const end = code.indexOf("\n", i);
      i = end === -1 ? code.length : end;
      out += blank(code.slice(start, i));
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
      out += blank(code.slice(start, i));
    } else if (/^b?r#*"/.test(rest) && !/[A-Za-z0-9_]/.test(code[i - 1] ?? "")) {
      // Raw string r"..." / r#"..."#: ends at a quote followed by the same number of hashes.
      const opening = rest.match(/^b?r(#*)"/)!;
      const closing = `"${opening[1]}`;
      const end = code.indexOf(closing, i + opening[0].length);
      i = end === -1 ? code.length : end + closing.length;
      out += emptyLiteral(code.slice(start, i));
    } else if (code[i] === '"') {
      i += 1;
      while (i < code.length && code[i] !== '"') {
        i += code[i] === "\\" ? 2 : 1;
      }
      i = Math.min(i + 1, code.length);
      out += emptyLiteral(code.slice(start, i));
    } else {
      out += code[i];
      i += 1;
    }
  }
  return out;
}

/** 1-based line of a character index. */
function lineAt(code: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (code.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

/**
 * Runs every check against the code, with comments and string contents removed so a check
 * cannot be passed by writing the expected snippet in a comment or a string. Each result
 * carries the line of the check's anchor, for editor diagnostics.
 */
export function evaluateChecks(code: string, checks: LessonCheck[]): CheckResult[] {
  const source = stripCommentsAndStrings(code);
  return checks.map((check) => {
    const passed = check.anyOf.some((snippet) => snippetPattern(snippet).test(source));
    const anchor = check.anchor ? snippetPattern(check.anchor).exec(source) : null;
    return { check, passed, line: anchor ? lineAt(source, anchor.index) : null };
  });
}

/** The verdict of "Check my code": passed when every check passes, with the failed objectives. */
export function validateCode(code: string, checks: LessonCheck[]): ValidationResult {
  const objectives = evaluateChecks(code, checks)
    .filter((result) => !result.passed)
    .map((result) => result.check.objective);
  return { passed: objectives.length === 0, objectives };
}
