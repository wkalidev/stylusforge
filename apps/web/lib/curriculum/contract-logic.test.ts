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

describe("lesson 11: Payable and sending ETH", () => {
  it("accepts either order of the sum and setter(key).set(value)", () => {
    expect(
      variant(11, "self.deposits.get(account) + self.vm().msg_value()", "self.vm().msg_value() + self.deposits.get(account)").passed,
    ).toBe(true);
    expect(variant(11, "self.deposits.insert(account, total);", "self.deposits.setter(account).set(total);").passed).toBe(true);
    expect(
      variant(11, "self.deposits.insert(account, available - amount);", "self.deposits.setter(account).set(available - amount);").passed,
    ).toBe(true);
  });

  it("refuses a deposit that is not payable", () => {
    const result = variant(11, "#[payable]\n", "");
    expect(result.objectives).toEqual(["Let deposit receive ETH"]);
  });

  it("refuses sending the ETH before lowering the deposit", () => {
    const result = variant(
      11,
      "self.deposits.insert(account, available - amount);\n        transfer_eth(self.vm(), account, amount)?;",
      "transfer_eth(self.vm(), account, amount)?;\n        self.deposits.insert(account, available - amount);",
    );
    expect(result.objectives).toEqual(["Lower the deposit first, then send the ETH"]);
  });

  it("refuses a withdrawal that never checks the deposit", () => {
    const result = variant(11, "if available < amount {", "if false {");
    expect(result.objectives).toEqual(["Check the deposit before paying anything out"]);
  });
});

describe("lesson 12: View/pure and gas", () => {
  it("accepts the product either way round and 10000 without a separator", () => {
    expect(variant(12, "let scaled = amount\n            .checked_mul(rate_bps)", "let scaled = rate_bps.checked_mul(amount)").passed).toBe(true);
    expect(variant(12, "U256::from(10_000)", "U256::from(10000)").passed).toBe(true);
  });

  it("refuses a fee that multiplies with the wrapping operator", () => {
    const result = variant(
      12,
      "let scaled = amount\n            .checked_mul(rate_bps)\n            .ok_or(QuoteError::FeeOverflow(FeeOverflow { amount, rate_bps }))?;",
      "let scaled = amount * rate_bps;",
    );
    expect(result.objectives).toEqual(["Multiply without silently wrapping around", "Revert with FeeOverflow when the product does not fit"]);
  });

  it("refuses a fee that keeps self, and a quote that takes &mut self", () => {
    expect(variant(12, "pub fn fee(amount: U256", "pub fn fee(&self, amount: U256").objectives).toEqual([
      "Declare fee as pure, since it uses no storage",
    ]);
    expect(variant(12, "pub fn quote(&self, amount: U256)", "pub fn quote(&mut self, amount: U256)").objectives).toEqual([
      "Declare quote as a view, since it only reads storage",
    ]);
  });

  it("refuses a quote_pair that reads the rate twice", () => {
    const result = variant(
      12,
      "let rate = self.rate_bps.get();\n        Ok((Self::fee(first, rate)?, Self::fee(second, rate)?))",
      "Ok((Self::fee(first, self.rate_bps.get())?, Self::fee(second, self.rate_bps.get())?))",
    );
    expect(result.objectives).toEqual(["Read the rate from storage only once"]);
  });
});
