export type TokenKind = 'comment' | 'string' | 'attribute' | 'keyword' | 'type' | 'macro' | 'number' | 'plain';

export interface Token {
  kind: TokenKind;
  text: string;
}

const KEYWORDS = new Set([
  'as', 'crate', 'else', 'enum', 'extern', 'fn', 'for', 'if', 'impl', 'let', 'match', 'mod', 'mut', 'pub',
  'return', 'self', 'Self', 'struct', 'use', 'where', 'while',
]);

// Order matters: the first alternative that matches at a position wins.
const TOKEN = new RegExp(
  [
    String.raw`(?<comment>//[^\n]*)`,
    String.raw`(?<string>"(?:[^"\\]|\\.)*")`,
    String.raw`(?<attribute>#!?\[[^\]\n]*\])`,
    String.raw`(?<macro>[A-Za-z_][A-Za-z0-9_]*!)`,
    String.raw`(?<word>[A-Za-z_][A-Za-z0-9_]*)`,
    String.raw`(?<number>\b\d[\d_]*\b)`,
  ].join('|'),
  'g',
);

/**
 * Splits Rust source into colored tokens for display. Deliberately small: enough for the short
 * snippets on the landing page, not a full lexer.
 */
export function highlightRust(code: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const match of code.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) {
      tokens.push({ kind: 'plain', text: code.slice(last, index) });
    }
    const groups = match.groups ?? {};
    const text = match[0];
    let kind: TokenKind = 'plain';
    if (groups.comment) kind = 'comment';
    else if (groups.string) kind = 'string';
    else if (groups.attribute) kind = 'attribute';
    else if (groups.macro) kind = 'macro';
    else if (groups.number) kind = 'number';
    else if (groups.word) kind = KEYWORDS.has(text) ? 'keyword' : /^[A-Z]/.test(text) ? 'type' : 'plain';
    tokens.push({ kind, text });
    last = index + text.length;
  }
  if (last < code.length) {
    tokens.push({ kind: 'plain', text: code.slice(last) });
  }
  return tokens;
}

/** The first `length` characters of a token list, for typing animations. */
export function sliceTokens(tokens: Token[], length: number): Token[] {
  const out: Token[] = [];
  let remaining = length;
  for (const token of tokens) {
    if (remaining <= 0) break;
    out.push(token.text.length <= remaining ? token : { kind: token.kind, text: token.text.slice(0, remaining) });
    remaining -= token.text.length;
  }
  return out;
}
