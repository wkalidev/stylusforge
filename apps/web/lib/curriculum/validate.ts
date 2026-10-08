/**
 * Static lesson checks, shared by the lesson page (instant feedback) and the claim API
 * route (server-side re-validation). Pure functions only: no DOM, no Node APIs.
 */

export interface LessonCheck {
  /**
   * Code snippets; the check passes when the code contains any of them, whatever the whitespace.
   * A placeholder such as `$x` stands for a local variable of any name (see snippetPattern). A
   * placeholder binds across `given`, `anyOf` and `alsoAnyOf`: every snippet of the check that uses
   * `$x` must match with the same name. Every check has `anyOf`, `literals` or both.
   */
  anyOf?: string[];
  /**
   * Further parts of the same goal, each a group of alternative snippets: the check also needs
   * one snippet of every group ("grow the list" and "set the title" of the new element).
   */
  alsoAnyOf?: string[][];
  /**
   * Optional groups of snippets that name a value the check uses, usually code that an earlier
   * check asks for: the check also needs one snippet of every group, and binds its placeholders
   * with the others. `given: [['let $c = self.vm().msg_sender();']]` with `anyOf: ['if $c != owner']`
   * accepts the caller under any name, but only the caller. Hints need not repeat these snippets.
   */
  given?: string[][];
  /**
   * Optional groups of snippets with string literals to spell exactly, such as
   * `#[selector(name = "latestRoundData")] pub fn $n(`: the check also needs one snippet of every
   * group. Only for a goal that is a string literal, never as a shortcut for code. These snippets
   * match the code with comments removed but strings kept, and a match counts only where each
   * literal of the snippet is a whole string literal of the code and the rest of the match is code,
   * so a snippet written in a comment or inside another string still fails. Literal contents match
   * exactly, whitespace included; around them, the usual whitespace rules apply.
   */
  literals?: string[][];
  /**
   * Optional forbidden snippets: the check fails while the code contains any of them, matched like
   * `anyOf` (comments and strings blanked, placeholders allowed, each snippet binding its own). Use it for a planted bug that a
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
/**
 * A string literal, delimited as the scanner of stripCommentsAndStrings delimits it: a raw string
 * (`r"..."`, `r#"..."#`, `br"..."`) or a normal one with escapes.
 */
const STRING_LITERAL = /(?<![A-Za-z0-9_])b?r(#*)"[\s\S]*?"\1|"(?:\\[\s\S]|[^"\\])*"/;
const WHOLE_LITERAL = new RegExp(`^(?:${STRING_LITERAL.source})$`);
/** The tokens of a `literals` snippet: each string literal is one token. */
const LITERAL_TOKEN = new RegExp(`${STRING_LITERAL.source}|${TOKEN.source}`, "g");
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

/** Identifiers bound to placeholders, by placeholder name without the `$`: `{ c: "caller" }`. */
export type Bindings = Readonly<Record<string, string>>;

/** The prefix of the regular expression group that captures a placeholder's identifier. */
const PLACEHOLDER_GROUP = "placeholder_";

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
 * `$x` never matches `mut`. A pattern binds placeholders within its own snippet; `bindings` lists
 * placeholders already bound by other snippets of the check, which then match that identifier
 * only (see evaluateChecks).
 *
 * With `literals` (for the snippets of `LessonCheck.literals`), each string literal of the snippet
 * is one token, matched exactly with its whitespace and captured in a group named `literal_<n>`,
 * so evaluateChecks can check that it lines up with a string literal of the code.
 *
 * Limit: a snippet matches one contiguous piece of code, so a snippet with several statements
 * only matches when the statements are consecutive. `let $x = a; f($x);` does not match when
 * another statement sits between the two.
 */
export function snippetPattern(
  snippet: string,
  { literals = false, bindings = {} }: { literals?: boolean; bindings?: Bindings } = {},
): RegExp {
  const tokens: string[] = Array.from(snippet.match(literals ? LITERAL_TOKEN : TOKEN) ?? []);
  if (tokens.length === 0) {
    throw new Error("A check snippet cannot be empty");
  }
  const captured = new Set<string>();
  let source = "";
  tokens.forEach((token, index) => {
    if (index > 0) {
      source += WORD.test(tokens[index - 1]) && WORD.test(token) ? "\\s+" : "\\s*";
    }
    if (literals && WHOLE_LITERAL.test(token)) {
      source += `(?<literal_${index}>${escapeRegExp(token)})`;
      return;
    }
    const placeholder = PLACEHOLDER.exec(token);
    if (!placeholder) {
      source += escapeRegExp(token);
      return;
    }
    // A placeholder bound by another snippet matches its identifier. Otherwise, the first
    // occurrence captures the identifier and the next ones must repeat it exactly.
    const group = `${PLACEHOLDER_GROUP}${placeholder[1]}`;
    const known = bindings[placeholder[1]];
    const name = known ? escapeRegExp(known) : captured.has(group) ? `\\k<${group}>` : `(?<${group}>${IDENTIFIER})`;
    source += `(?<![A-Za-z0-9_])${name}(?![A-Za-z0-9_])`;
    captured.add(group);
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

/** A range of character indexes, start included, end excluded. */
type Range = [start: number, end: number];

interface ScannedCode {
  /** The code with comments and string contents blanked in place. */
  stripped: string;
  /** Where each string literal of the code lies, quotes, prefix and raw-string hashes included. */
  literals: Range[];
}

/**
 * Removes what a check must never match: line comments, (nested) block comments and the
 * contents of string literals, including raw strings, and records where each literal lies.
 * Positions are preserved: removed characters become spaces (newlines stay), so an index in the
 * result is the same index in the original code and matches map back to lines.
 */
function scan(code: string): ScannedCode {
  const literals: Range[] = [];
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
      literals.push([start, i]);
      out += emptyLiteral(code.slice(start, i));
    } else if (code[i] === '"') {
      i += 1;
      while (i < code.length && code[i] !== '"') {
        i += code[i] === "\\" ? 2 : 1;
      }
      i = Math.min(i + 1, code.length);
      literals.push([start, i]);
      out += emptyLiteral(code.slice(start, i));
    } else {
      out += code[i];
      i += 1;
    }
  }
  return { stripped: out, literals };
}

/**
 * Removes what a check must never match: line comments, (nested) block comments and the
 * contents of string literals, including raw strings. Positions are preserved: removed
 * characters become spaces (newlines stay), so an index in the result is the same index in the
 * original code and matches map back to lines.
 */
export function stripCommentsAndStrings(code: string): string {
  return scan(code).stripped;
}

/** The stripped code with its string literals put back: comments blanked, strings kept. */
function restoreLiterals(code: string, { stripped, literals }: ScannedCode): string {
  let out = "";
  let at = 0;
  for (const [start, end] of literals) {
    out += stripped.slice(at, start) + code.slice(start, end);
    at = end;
  }
  return out + stripped.slice(at);
}

/**
 * Removes line and (nested) block comments only, keeping string literals as written: the code
 * that `literals` snippets match. It shares the scanner of stripCommentsAndStrings, so both agree
 * on where each literal starts and ends, and positions are preserved the same way.
 */
export function stripComments(code: string): string {
  return restoreLiterals(code, scan(code));
}

/**
 * Whether a `literals` snippet matches the code with comments removed (`uncommented`) at a place
 * where each literal of the snippet is exactly one string literal of the code, and every other
 * character of the match lies outside the code's literals. A snippet written inside a string,
 * or with a literal that only covers part of one, never counts.
 */
function matchesWithLiterals(snippet: string, uncommented: string, literals: Range[]): boolean {
  const pattern = snippetPattern(snippet, { literals: true });
  const search = new RegExp(pattern.source, "dg");
  for (let match = search.exec(uncommented); match; match = search.exec(uncommented)) {
    const start = match.index;
    const end = start + match[0].length;
    const spans = Object.entries(match.indices?.groups ?? {})
      .filter(([name]) => name.startsWith("literal_"))
      .map(([, span]) => span as Range);
    const same = (a: Range) => (b: Range) => a[0] === b[0] && a[1] === b[1];
    const inPlace =
      spans.every((span) => literals.some(same(span))) &&
      literals.filter(([from, to]) => from < end && to > start).every((literal) => spans.some(same(literal)));
    if (inPlace) return true;
    // Try every start: a match refused here may hide a valid one that overlaps it.
    search.lastIndex = start + 1;
  }
  return false;
}

/**
 * Every way a snippet matches the code, as the bindings of its placeholders added to `bindings`:
 * one per distinct set of identifiers, so `let $x = self.count.get();` written twice under two
 * names gives both. Every start position is tried, so overlapping matches are found too.
 */
function snippetBindings(snippet: string, source: string, bindings: Bindings): Bindings[] {
  const search = new RegExp(snippetPattern(snippet, { bindings }).source, "g");
  const found = new Map<string, Bindings>();
  for (let match = search.exec(source); match; match = search.exec(source)) {
    const next: Record<string, string> = { ...bindings };
    for (const [group, name] of Object.entries(match.groups ?? {})) {
      if (group.startsWith(PLACEHOLDER_GROUP)) next[group.slice(PLACEHOLDER_GROUP.length)] = name;
    }
    found.set(JSON.stringify(next), next);
    search.lastIndex = match.index + 1;
  }
  return [...found.values()];
}

/**
 * Whether the code has one snippet of every group, each placeholder bound to the same identifier
 * in all of them. Tries every binding a group allows, and backtracks when a later group refuses it.
 */
function groupsMatch(groups: string[][], source: string, bindings: Bindings = {}): boolean {
  if (groups.length === 0) return true;
  const [group, ...rest] = groups;
  return group.some((snippet) =>
    snippetBindings(snippet, source, bindings).some((next) => groupsMatch(rest, source, next)),
  );
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
 * forbidden snippet left in one. Placeholders bind across the `given`, `anyOf` and `alsoAnyOf`
 * groups of a check; each `literals` and `noneOf` snippet binds its own. `literals` snippets match the code with its strings kept, only
 * where their literals are string literals of the code (see LessonCheck.literals); that view is
 * built only when a check needs it. Each result carries the line of the check's anchor, for
 * editor diagnostics.
 */
export function evaluateChecks(code: string, checks: LessonCheck[]): CheckResult[] {
  const scanned = scan(code);
  const source = scanned.stripped;
  let uncommented: string | undefined;
  return checks.map((check) => {
    if (!check.anyOf && !check.literals) {
      throw new Error(`The check "${check.objective}" needs anyOf or literals`);
    }
    const matches = (snippets: string[]) => snippets.some((snippet) => snippetPattern(snippet).test(source));
    const matchesLiterals = (snippets: string[]) => {
      uncommented ??= restoreLiterals(code, scanned);
      return snippets.some((snippet) => matchesWithLiterals(snippet, uncommented!, scanned.literals));
    };
    // The given snippets come first: they usually bind the names that the others use.
    const groups = [...(check.given ?? []), ...(check.anyOf ? [check.anyOf] : []), ...(check.alsoAnyOf ?? [])];
    const passed =
      groupsMatch(groups, source) && (check.literals ?? []).every(matchesLiterals) && !matches(check.noneOf ?? []);
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
