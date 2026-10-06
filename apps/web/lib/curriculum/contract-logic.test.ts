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

describe("lesson 9: msg context", () => {
  it("accepts setter(key).set(value) to record the check-in", () => {
    expect(variant(9, "self.check_ins.insert(visitor, now);", "self.check_ins.setter(visitor).set(now);").passed).toBe(true);
  });

  it("refuses tx_origin as the visitor", () => {
    const result = variant(9, "let visitor = self.vm().msg_sender();", "let visitor = self.vm().tx_origin();");
    expect(result.objectives).toEqual(["Find out who is checking in"]);
  });

  it("refuses the L1 block number in place of the block time", () => {
    const result = variant(9, "self.vm().block_timestamp()", "self.vm().block_number()");
    expect(result.objectives).toEqual(["Read the current block time as a 256-bit number"]);
  });

  it("refuses a check-in that does not update the last visitor", () => {
    const result = variant(9, "self.last_visitor.set(visitor);", "");
    expect(result.objectives).toEqual(["Make the caller the last visitor"]);
  });
});
