/**
 * Writes the Rust of every available lesson for the cargo check job: its reference solution, its
 * starter code and the harness of its explanation snippets, sorted by check crate.
 *
 *   pnpm --filter web export:rust <out dir>
 *
 * gives <out dir>/<crate>/lesson-<id>-<solution|starter|snippets>.rs, and curriculum/rust/check.sh
 * compiles every file with its crate. Run under the react-server condition so solutions.ts loads
 * (`server-only` keeps it out of the browser).
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LESSONS } from '../lib/curriculum/lessons';
import { containsSnippet, harnessPath, rustBlocks, rustCrateOf } from '../lib/curriculum/rust';
import { SOLUTIONS } from '../lib/curriculum/solutions';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const outArgument = process.argv[2];
if (!outArgument) {
  console.error('Usage: export-rust <out dir>');
  process.exit(1);
}
const out = resolve(process.cwd(), outArgument);
rmSync(out, { recursive: true, force: true });

let count = 0;
const write = (crate: string, name: string, code: string) => {
  const file = join(out, crate, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, code);
  count += 1;
};

for (const lesson of LESSONS) {
  if (!lesson.available) continue;
  const crate = rustCrateOf(lesson.id);
  const solution = SOLUTIONS[lesson.id];
  if (!solution) throw new Error(`Lesson ${lesson.id} has no reference solution`);
  write(crate, `lesson-${lesson.id}-solution.rs`, solution);
  write(crate, `lesson-${lesson.id}-starter.rs`, `${lesson.exercise.starterCode}\n`);

  const blocks = rustBlocks(lesson.exercise.explanation);
  if (blocks.length === 0) continue;
  const path = join(root, harnessPath(lesson.id));
  if (!existsSync(path)) throw new Error(`Lesson ${lesson.id} has Rust in its explanation but no ${harnessPath(lesson.id)}`);
  const harness = readFileSync(path, 'utf8');
  // The unit tests check the same; failing here too keeps the job from compiling a stale harness.
  blocks.forEach((block, index) => {
    if (!containsSnippet(harness, block)) throw new Error(`Rust block ${index + 1} of lesson ${lesson.id} is not in ${harnessPath(lesson.id)}`);
  });
  write(crate, `lesson-${lesson.id}-snippets.rs`, harness);
}

console.log(`Wrote ${count} Rust files to ${out}`);
