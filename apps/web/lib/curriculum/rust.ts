/**
 * The Rust of each lesson for the cargo check job: which check crate compiles it, and the
 * explanation snippets that its compiled harness must contain. Pure functions only.
 */

/** A check crate of curriculum/rust: stylus-sdk 0.10.10, or openzeppelin-stylus 0.3.0 on stylus-sdk 0.9.0. */
export type RustCrate = 'stylus' | 'openzeppelin';

/** Lessons built on openzeppelin-stylus 0.3.0, which pins stylus-sdk 0.9.0 (#123). */
export const OPENZEPPELIN_LESSONS: readonly number[] = [15];

/** The check crate that compiles a lesson's Rust. */
export function rustCrateOf(lessonId: number): RustCrate {
  return OPENZEPPELIN_LESSONS.includes(lessonId) ? 'openzeppelin' : 'stylus';
}

/** Path of a lesson's explanation harness, from the repository root. */
export function harnessPath(lessonId: number): string {
  return `curriculum/rust/snippets/lesson-${lessonId}.rs`;
}

/** The code of every ```rust block of a Markdown text, in order. */
export function rustBlocks(markdown: string): string[] {
  return [...markdown.matchAll(/^```rust\n([\s\S]*?)^```$/gm)].map((match) => match[1]);
}

/** The non-empty lines of a text, without their indentation. */
function codeLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/**
 * Whether a harness contains a snippet: every non-empty line of the snippet, indentation aside,
 * appears in the harness in the same order. Other lines may come in between, so the harness can
 * wrap a fragment in a function or finish an `impl` that the snippet shortens with `// ...`.
 */
export function containsSnippet(harness: string, snippet: string): boolean {
  const lines = codeLines(harness);
  let next = 0;
  for (const line of codeLines(snippet)) {
    const found = lines.indexOf(line, next);
    if (found === -1) return false;
    next = found + 1;
  }
  return true;
}
