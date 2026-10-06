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

describe("lesson 10: Access control", () => {
  it("accepts the comparison either way round", () => {
    expect(variant(10, "if caller != self.owner.get() {", "if self.owner.get() != caller {").passed).toBe(true);
  });

  it("refuses an owner taken from msg_sender in the constructor", () => {
    const result = variant(10, "self.owner.set(owner);", "self.owner.set(self.vm().msg_sender());");
    expect(result.objectives).toEqual(["Store the owner chosen at deployment"]);
  });

  it("refuses a guard that checks tx_origin", () => {
    const result = variant(10, "let caller = self.vm().msg_sender();", "let caller = self.vm().tx_origin();");
    expect(result.objectives).toEqual(["Find out who is calling"]);
  });

  it("refuses a guard called after the write", () => {
    const result = variant(10, "self.only_owner()?;\n        self.fee.set(fee);", "self.fee.set(fee);\n        self.only_owner()?;");
    expect(result.objectives).toEqual(["Let only the owner change the fee"]);
  });

  it("refuses a transfer_ownership left unguarded", () => {
    const result = variant(10, "self.only_owner()?;\n        self.owner.set(new_owner);", "self.owner.set(new_owner);");
    expect(result.objectives).toEqual(["Let only the owner hand over the contract"]);
  });
});
