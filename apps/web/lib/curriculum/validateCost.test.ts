import { describe, expect, it } from "vitest";

import { MAX_CODE_LENGTH } from "@/lib/server/codeSubmission";
import { LESSONS, type Lesson } from "./lessons";
import { SOLUTIONS } from "./solutions";
import { MAX_SNIPPET_BINDINGS, validateCode } from "./validate";

/**
 * Validation time budget for the longest code the API accepts. Bounded matching takes about
 * 150 ms on the input below; before #138 the same 10,000 characters took about 2 seconds, and the
 * old 50,000-character limit about 100.
 */
const BUDGET_MS = 1000;

function lesson(id: number): Extract<Lesson, { available: true }> {
  const found = LESSONS.find((candidate) => candidate.id === id);
  if (!found?.available) throw new Error(`Lesson ${id} is not available`);
  return found;
}

/** Repeats `line(i)` with a fresh index until the code reaches `length` characters. */
function repeated(line: (i: number) => string, length: number): string {
  let code = "";
  for (let i = 0; code.length < length; i += 1) code += line(i);
  return code.slice(0, length);
}

/**
 * Lesson 9's check-in step has two `given` groups, the caller and the timestamp, then the insert
 * that uses both. Each pair below binds both groups under fresh names and never inserts, so
 * unbounded matching tried every caller against every timestamp, rescanning the code each time.
 */
const crafted = repeated(
  (i) => `let a${i} = self.vm().msg_sender();\nlet b${i} = U256::from(self.vm().block_timestamp());\n`,
  MAX_CODE_LENGTH,
);

describe("validation cost", () => {
  it("binds each given group far more often than the cap allows", () => {
    expect(crafted.match(/msg_sender/g)!.length).toBeGreaterThan(2 * MAX_SNIPPET_BINDINGS);
  });

  it(`validates the crafted lesson 9 input of ${MAX_CODE_LENGTH} characters within ${BUDGET_MS} ms`, () => {
    const { checks } = lesson(9).exercise;
    const start = performance.now();
    const result = validateCode(crafted, checks);
    const elapsed = performance.now() - start;
    expect(result.passed).toBe(false);
    expect(elapsed).toBeLessThan(BUDGET_MS);
  });

  it("still passes lesson 9's solution written after a few unused copies of its locals", () => {
    const decoys = repeated((i) => `let caller${i} = self.vm().msg_sender();\n`, 200);
    const code = SOLUTIONS[9].replace("pub fn check_in(&mut self) {\n", (open) => `${open}${decoys}`);
    expect(code).not.toBe(SOLUTIONS[9]);
    expect(validateCode(code, lesson(9).exercise.checks)).toEqual({ passed: true, objectives: [] });
  });
});
