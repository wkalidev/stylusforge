import { describe, expect, it } from "vitest";

import { LESSONS } from "./lessons";
import { SOLUTIONS } from "./solutions";
import { validateCode } from "./validate";

/** Validates the reference solution of a lesson with one replacement applied. */
function variant(lessonId: number, from: string, to: string) {
  const lesson = LESSONS.find((candidate) => candidate.id === lessonId)!;
  if (!lesson.available) throw new Error(`Lesson ${lessonId} is not available`);
  const solution = SOLUTIONS[lessonId];
  expect(solution, `the solution of lesson ${lessonId} contains "${from}"`).toContain(from);
  return validateCode(solution.replace(from, to), lesson.exercise.checks);
}

describe("lesson 4: ERC-20 Token", () => {
  const revert = "return Err(Erc20Error::InsufficientBalance(InsufficientBalance {\n                from,\n                have,\n                want: value,\n            }));";
  const emit = "self.vm().log(Transfer { from, to, value });";

  it("accepts the error built in a local variable first", () => {
    expect(
      variant(4, revert, "let error = InsufficientBalance {\n                from,\n                have,\n                want: value,\n            };\n            return Err(Erc20Error::InsufficientBalance(error));").passed,
    ).toBe(true);
    expect(
      variant(4, revert, "let error = Erc20Error::InsufficientBalance(InsufficientBalance { from, have, want: value });\n            return Err(error);").passed,
    ).toBe(true);
  });

  it("accepts the event built in a local variable first, on one line or rustfmt style", () => {
    expect(variant(4, emit, "let event = Transfer { from, to, value };\n        self.vm().log(event);").passed).toBe(true);
    expect(variant(4, emit, "let event = Transfer {\n            from,\n            to,\n            value,\n        };\n        self.vm().log(event);").passed).toBe(true);
  });

  it("refuses an error built in a local but never returned", () => {
    const result = variant(4, revert, "let _error = InsufficientBalance { from, have, want: value };\n            return Ok(false);");
    expect(result.objectives).toEqual(["Revert a transfer larger than the sender's balance"]);
  });

  it("refuses an event built in a local but never logged", () => {
    const result = variant(4, emit, "let _event = Transfer { from, to, value };");
    expect(result.objectives).toEqual(["Emit Transfer when tokens move"]);
  });
});
