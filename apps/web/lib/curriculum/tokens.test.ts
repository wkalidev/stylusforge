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

/** Validates the reference solution of a lesson with a local variable renamed, then an optional edit. */
function renamed(lessonId: number, name: string, to: string, edit: (code: string) => string = (code) => code) {
  const lesson = LESSONS.find((candidate) => candidate.id === lessonId)!;
  if (!lesson.available) throw new Error(`Lesson ${lessonId} is not available`);
  const solution = SOLUTIONS[lessonId];
  expect(solution, `the solution of lesson ${lessonId} uses "${name}"`).toMatch(new RegExp(`\\b${name}\\b`));
  return validateCode(edit(solution.replace(new RegExp(`\\b${name}\\b`, "g"), to)), lesson.exercise.checks);
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

describe("lesson 13: Allowances", () => {
  const read = "let allowed = self.allowances.getter(from).get(spender);";
  const revert = "return Err(Erc20Error::InsufficientAllowance(InsufficientAllowance {\n                spender,\n                have: allowed,\n                want: value,\n            }));";
  const lower = "self.allowances.setter(from).insert(spender, allowed - value);";
  const guarded = `if allowed != U256::MAX {\n            ${lower}\n        }`;
  const emit = "self.vm().log(Approval { owner, spender, value });";

  it("accepts get(key) for the inner mapping, and setter(key).set(value) for the entry", () => {
    expect(variant(13, "self.allowances.getter(owner).get(spender)", "self.allowances.get(owner).get(spender)").passed).toBe(true);
    expect(variant(13, read, "let allowed = self.allowances.get(from).get(spender);").passed).toBe(true);
    expect(variant(13, "self.allowances.setter(owner).insert(spender, value);", "self.allowances.setter(owner).setter(spender).set(value);").passed).toBe(true);
    expect(variant(13, lower, "self.allowances.setter(from).setter(spender).set(allowed - value);").passed).toBe(true);
  });

  it("accepts the handle to the inner mapping kept in a local first", () => {
    const approve = "self.allowances.setter(owner).insert(spender, value);";
    expect(variant(13, approve, "let mut granted = self.allowances.setter(owner);\n        granted.insert(spender, value);").passed).toBe(true);
    expect(variant(13, approve, "let mut granted = self.allowances.setter(owner);\n        granted.setter(spender).set(value);").passed).toBe(true);
  });

  it("accepts the allowance under any local name, compared either way round", () => {
    expect(renamed(13, "allowed", "remaining").passed).toBe(true);
    expect(variant(13, "if allowed < value {", "if value > allowed {").passed).toBe(true);
  });

  it("accepts the unlimited guard written with < or either way round", () => {
    expect(variant(13, "if allowed != U256::MAX {", "if allowed < U256::MAX {").passed).toBe(true);
    expect(variant(13, "if allowed != U256::MAX {", "if U256::MAX != allowed {").passed).toBe(true);
    expect(variant(13, "if allowed != U256::MAX {", "if U256::MAX > allowed {").passed).toBe(true);
  });

  it("accepts the lowered allowance computed in a local first, and rustfmt line breaks", () => {
    expect(variant(13, lower, "let left = allowed - value;\n            self.allowances.setter(from).insert(spender, left);").passed).toBe(true);
    expect(variant(13, lower, "self.allowances\n                .setter(from)\n                .insert(spender, allowed - value);").passed).toBe(true);
  });

  it("accepts the error built in a local variable first", () => {
    expect(
      variant(13, revert, "let error = InsufficientAllowance {\n                spender,\n                have: allowed,\n                want: value,\n            };\n            return Err(Erc20Error::InsufficientAllowance(error));").passed,
    ).toBe(true);
    expect(
      variant(13, revert, "let error = Erc20Error::InsufficientAllowance(InsufficientAllowance { spender, have: allowed, want: value });\n            return Err(error);").passed,
    ).toBe(true);
    const named = renamed(13, "allowed", "have", (code) =>
      code.replace("InsufficientAllowance {\n                spender,\n                have: have,", "InsufficientAllowance {\n                spender,\n                have,"),
    );
    expect(named.passed).toBe(true);
  });

  it("accepts the Approval event built in a local variable first, on one line or rustfmt style", () => {
    expect(variant(13, emit, "let event = Approval { owner, spender, value };\n        self.vm().log(event);").passed).toBe(true);
    expect(variant(13, emit, "let event = Approval {\n            owner,\n            spender,\n            value,\n        };\n        self.vm().log(event);").passed).toBe(true);
  });

  it("refuses the keys of the nested mapping the wrong way round", () => {
    expect(variant(13, "self.allowances.getter(owner).get(spender)", "self.allowances.getter(spender).get(owner)").objectives).toEqual([
      "Return what a spender may still move",
    ]);
    expect(variant(13, "self.allowances.setter(owner).insert(spender, value);", "self.allowances.setter(spender).insert(owner, value);").objectives).toEqual([
      "Record the spender's allowance on the caller's tokens",
    ]);
    expect(variant(13, read, "let allowed = self.allowances.getter(spender).get(from);").objectives).toEqual([
      "Check the caller's allowance on the owner's tokens before spending it",
    ]);
  });

  it("refuses an error built in a local but never returned", () => {
    const result = variant(13, revert, "let _error = InsufficientAllowance { spender, have: allowed, want: value };\n            return Ok(false);");
    expect(result.objectives).toEqual(["Revert when the allowance is too small"]);
  });

  it("refuses an allowance that is never lowered, or set to the amount instead of lowered by it", () => {
    expect(variant(13, guarded, "").objectives).toEqual(["Lower the allowance by the amount spent", "Leave an unlimited allowance untouched"]);
    expect(variant(13, lower, "self.allowances.setter(from).insert(spender, value);").objectives).toEqual(["Lower the allowance by the amount spent"]);
  });

  it("refuses lowering an unlimited allowance", () => {
    expect(variant(13, guarded, lower).objectives).toEqual(["Leave an unlimited allowance untouched"]);
  });

  it("refuses a transfer_from that never moves the tokens", () => {
    expect(variant(13, "self.move_tokens(from, to, value)?;\n        Ok(true)", "Ok(true)").objectives).toEqual(["Move the tokens and report success"]);
  });
});
