/**
 * Static lesson checks, shared by the lesson page (instant feedback) and the claim API
 * route (server-side re-validation). Pure functions only: no DOM, no Node APIs.
 */

export interface LessonCheck {
  /**
   * Code snippets; the check passes when the code contains any of them, whatever the whitespace.
   * A placeholder such as `$x` stands for a local variable of any name (see snippetPattern).
   */
  anyOf: string[];
  /**
   * Further parts of the same goal, each a group of alternative snippets: the check also needs
   * one snippet of every group ("grow the list" and "set the title" of the new element).
   */
  alsoAnyOf?: string[][];
  /**
   * Optional forbidden snippets: the check fails while the code contains any of them, matched like
   * `anyOf` (comments and strings blanked, placeholders allowed). Use it for a planted bug that a
   * fix written next to it would leave in place, such as an unguarded `init` kept beside a new
   * `#[constructor]`.
   */
  noneOf?: string[];
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

const TOKEN = /\$[A-Za-z_][A-Za-z0-9_]*|[A-Za-z0-9_]+|\S/g;
/** An identifier, keyword or number token, or a placeholder (which stands for an identifier). */
const WORD = /^\$?[A-Za-z0-9_]+$/;
const PLACEHOLDER = /^\$([A-Za-z_][A-Za-z0-9_]*)$/;

/** Rust keywords, strict and reserved (2024 edition): never the name of a variable. */
const KEYWORDS = [
  "as", "async", "await", "break", "const", "continue", "crate", "dyn", "else", "enum", "extern",
  "false", "fn", "for", "if", "impl", "in", "let", "loop", "match", "mod", "move", "mut", "pub",
  "ref", "return", "self", "Self", "static", "struct", "super", "trait", "true", "type", "unsafe",
  "use", "where", "while", "abstract", "become", "box", "do", "final", "gen", "macro", "override",
  "priv", "try", "typeof", "unsized", "virtual", "yield",
];

/** A Rust identifier that is not a keyword, nor `_` (a wildcard, not a name). */
const IDENTIFIER = `(?!(?:${KEYWORDS.join("|")}|_)(?![A-Za-z0-9_]))[A-Za-z_][A-Za-z0-9_]*`;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Turns a snippet into a whitespace-insensitive pattern: identifiers and keywords must stay
 * separated by whitespace, punctuation may or may not be surrounded by it (newlines included, so
 * a method chain split across lines, `self\n    .tasks\n    .get(id)`, still matches), and the
 * snippet cannot start or end in the middle of an identifier.
 *
 * A placeholder, `$` followed by a name such as `$x`, stands for a local variable: it matches any
 * Rust identifier except a keyword, and every occurrence of the same placeholder in a snippet
 * matches the same identifier. `let $x = self.count.get(); self.count.set($x + one)` accepts the
 * variable under any name, but only when the value written is the one read. `let mut $x` works:
 * `$x` never matches `mut`. Placeholders never bind across snippets.
 *
 * Limit: a snippet matches one contiguous piece of code, so a snippet with several statements
 * only matches when the statements are consecutive. `let $x = a; f($x);` does not match when
 * another statement sits between the two.
 */
export function snippetPattern(snippet: string): RegExp {
  const tokens: string[] = Array.from(snippet.match(TOKEN) ?? []);
  if (tokens.length === 0) {
    throw new Error("A check snippet cannot be empty");
  }
  const bound = new Set<string>();
  let source = "";
  tokens.forEach((token, index) => {
    if (index > 0) {
      source += WORD.test(tokens[index - 1]) && WORD.test(token) ? "\\s+" : "\\s*";
    }
    const placeholder = PLACEHOLDER.exec(token);
    if (!placeholder) {
      source += escapeRegExp(token);
      return;
    }
    // The first occurrence captures the identifier; the next ones must repeat it exactly.
    const group = `placeholder_${placeholder[1]}`;
    const name = bound.has(group) ? `\\k<${group}>` : `(?<${group}>${IDENTIFIER})`;
    source += `(?<![A-Za-z0-9_])${name}(?![A-Za-z0-9_])`;
    bound.add(group);
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
 * cannot be passed by writing the expected snippet in a comment or a string, nor failed by a
 * forbidden snippet left in one. Each result carries the line of the check's anchor, for editor
 * diagnostics.
 */
export function evaluateChecks(code: string, checks: LessonCheck[]): CheckResult[] {
  const source = stripCommentsAndStrings(code);
  return checks.map((check) => {
    const matches = (snippets: string[]) => snippets.some((snippet) => snippetPattern(snippet).test(source));
    const passed = [check.anyOf, ...(check.alsoAnyOf ?? [])].every(matches) && !matches(check.noneOf ?? []);
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
