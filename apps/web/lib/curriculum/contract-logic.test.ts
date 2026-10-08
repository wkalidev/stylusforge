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
  const body =
    "let visitor = self.vm().msg_sender();\n        let now = U256::from(self.vm().block_timestamp());\n        self.check_ins.insert(visitor, now);\n        self.last_visitor.set(visitor);";

  it("accepts setter(key).set(value) to record the check-in", () => {
    expect(variant(9, "self.check_ins.insert(visitor, now);", "self.check_ins.setter(visitor).set(now);").passed).toBe(true);
  });

  it("accepts the caller and the time under any local names", () => {
    const renamed =
      "let sender = self.vm().msg_sender();\n        let timestamp = U256::from(self.vm().block_timestamp());\n        self.check_ins.setter(sender).set(timestamp);\n        self.last_visitor.set(sender);";
    expect(variant(9, body, renamed).passed).toBe(true);
    const timeFirst =
      "let t = U256::from(self.vm().block_timestamp());\n        let who = self.vm().msg_sender();\n        self.last_visitor.set(who);\n        self.check_ins.insert(who, t);";
    expect(variant(9, body, timeFirst).passed).toBe(true);
  });

  it("refuses the time and the visitor swapped, or a local that is neither", () => {
    expect(variant(9, "self.check_ins.insert(visitor, now);", "self.check_ins.insert(now, visitor);").objectives).toEqual([
      "Record the visitor's check-in time",
    ]);
    expect(variant(9, "self.last_visitor.set(visitor);", "self.last_visitor.set(now);").objectives).toEqual(["Make the caller the last visitor"]);
    expect(variant(9, "self.check_ins.insert(visitor, now);", "self.check_ins.insert(account, now);").objectives).toEqual([
      "Record the visitor's check-in time",
    ]);
  });

  it("refuses tx_origin as the visitor, and so the visitor recorded and kept", () => {
    const result = variant(9, "let visitor = self.vm().msg_sender();", "let visitor = self.vm().tx_origin();");
    expect(result.objectives).toEqual(["Find out who is checking in", "Record the visitor's check-in time", "Make the caller the last visitor"]);
  });

  it("refuses the L1 block number in place of the block time, and so the time recorded", () => {
    const result = variant(9, "self.vm().block_timestamp()", "self.vm().block_number()");
    expect(result.objectives).toEqual(["Read the current block time as a 256-bit number", "Record the visitor's check-in time"]);
  });

  it("refuses a check-in that does not update the last visitor", () => {
    const result = variant(9, "self.last_visitor.set(visitor);", "");
    expect(result.objectives).toEqual(["Make the caller the last visitor"]);
  });
});

describe("lesson 3: Events and Errors", () => {
  const revert = "return Err(TokenError::InsufficientBalance(InsufficientBalance {\n                available,\n                required: amount,\n            }));";
  const emit = "self.vm().log(Transfer { from, to, value: amount });";

  it("accepts the error built in a local variable first", () => {
    expect(
      variant(3, revert, "let error = InsufficientBalance {\n                available,\n                required: amount,\n            };\n            return Err(TokenError::InsufficientBalance(error));").passed,
    ).toBe(true);
    expect(
      variant(3, revert, "let error = TokenError::InsufficientBalance(InsufficientBalance { available, required: amount });\n            return Err(error);").passed,
    ).toBe(true);
  });

  it("accepts the event built in a local variable first, on one line or rustfmt style", () => {
    expect(variant(3, emit, "let event = Transfer { from, to, value: amount };\n        self.vm().log(event);").passed).toBe(true);
    expect(
      variant(3, emit, "let event = Transfer {\n            from,\n            to,\n            value: amount,\n        };\n        self.vm().log(event);").passed,
    ).toBe(true);
  });

  it("refuses an error built in a local but never returned", () => {
    const result = variant(3, revert, "let _error = InsufficientBalance { available, required: amount };\n            return Ok(());");
    expect(result.objectives).toEqual(["Revert when the balance is too low"]);
  });

  it("refuses an event built in a local but never logged", () => {
    const result = variant(3, emit, "let _event = Transfer { from, to, value: amount };");
    expect(result.objectives).toEqual(["Emit Transfer after the balances are updated"]);
  });
});

describe("lesson 10: Access control", () => {
  it("accepts the comparison either way round", () => {
    expect(variant(10, "if caller != self.owner.get() {", "if self.owner.get() != caller {").passed).toBe(true);
  });

  const refuse = "return Err(AccessError::Unauthorized(Unauthorized { caller }));";

  it("accepts the error built in a local variable first", () => {
    expect(variant(10, refuse, "let error = Unauthorized { caller };\n            return Err(AccessError::Unauthorized(error));").passed).toBe(true);
    expect(variant(10, refuse, "let error = AccessError::Unauthorized(Unauthorized { caller });\n            return Err(error);").passed).toBe(true);
  });

  const guard = "let caller = self.vm().msg_sender();\n        if caller != self.owner.get() {\n            return Err(AccessError::Unauthorized(Unauthorized { caller }));";
  const guardNamed = (name: string, compared = name, field = `caller: ${name}`) =>
    `let ${name} = self.vm().msg_sender();\n        if ${compared} != self.owner.get() {\n            return Err(AccessError::Unauthorized(Unauthorized { ${field} }));`;

  it("accepts the caller under any local name, in the comparison and the error", () => {
    expect(variant(10, guard, guardNamed("sender")).passed).toBe(true);
    expect(variant(10, guard, guardNamed("caller", "caller", "caller: caller")).passed).toBe(true);
    expect(
      variant(10, guard, "let account = self.vm().msg_sender();\n        if self.owner.get() != account {\n            let error = Unauthorized { caller: account };\n            return Err(AccessError::Unauthorized(error));").passed,
    ).toBe(true);
  });

  it("refuses a comparison or an error that uses another local than the caller's", () => {
    expect(variant(10, guard, guardNamed("sender", "caller")).objectives).toEqual(["Compare the caller with the owner"]);
    expect(variant(10, guard, guardNamed("sender", "sender", "caller")).objectives).toEqual(["Refuse every caller but the owner"]);
    expect(variant(10, guard, guardNamed("sender", "sender", "caller: owner")).objectives).toEqual(["Refuse every caller but the owner"]);
  });

  it("refuses an error built in a local but never returned", () => {
    const result = variant(10, refuse, "let _error = Unauthorized { caller };\n            return Ok(());");
    expect(result.objectives).toEqual(["Refuse every caller but the owner"]);
  });

  it("refuses an owner taken from msg_sender in the constructor", () => {
    const result = variant(10, "self.owner.set(owner);", "self.owner.set(self.vm().msg_sender());");
    expect(result.objectives).toEqual(["Store the owner chosen at deployment"]);
  });

  it("refuses a guard that checks tx_origin, and so the comparison and the error that use it", () => {
    const result = variant(10, "let caller = self.vm().msg_sender();", "let caller = self.vm().tx_origin();");
    expect(result.objectives).toEqual(["Find out who is calling", "Compare the caller with the owner", "Refuse every caller but the owner"]);
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

  const deposit = "let total = self.deposits.get(account) + self.vm().msg_value();";
  const lower = "self.deposits.insert(account, available - amount);\n        transfer_eth(self.vm(), account, amount)?;";
  const refuse = "return Err(BankError::InsufficientDeposit(InsufficientDeposit { available, requested: amount }).into());";

  it("accepts the deposit or the ETH sent read into local variables first", () => {
    expect(variant(11, deposit, "let sent = self.vm().msg_value();\n        let total = self.deposits.get(account) + sent;").passed).toBe(true);
    expect(
      variant(11, deposit, "let deposited = self.deposits.get(account);\n        let sent = self.vm().msg_value();\n        let total = deposited + sent;").passed,
    ).toBe(true);
    expect(variant(11, deposit, "let mut total = self.deposits.get(account);\n        total += self.vm().msg_value();").passed).toBe(true);
  });

  it("refuses a local ETH amount that is never added, and so the deposit saved", () => {
    const result = variant(11, deposit, "let sent = self.vm().msg_value();\n        let total = self.deposits.get(account) + U256::from(1);");
    expect(result.objectives).toEqual(["Add the ETH sent with the call to the caller's deposit", "Save the caller's new deposit"]);
  });

  const save = `${deposit}\n        self.deposits.insert(account, total);`;

  it("accepts the new deposit under any local name", () => {
    expect(variant(11, save, "let balance = self.deposits.get(account) + self.vm().msg_value();\n        self.deposits.insert(account, balance);").passed).toBe(true);
    expect(
      variant(11, save, "let mut credited = self.deposits.get(account);\n        credited += self.vm().msg_value();\n        self.deposits.setter(account).set(credited);").passed,
    ).toBe(true);
    expect(
      variant(11, save, "let sent = self.vm().msg_value();\n        let new_deposit = sent + self.deposits.get(account);\n        self.deposits.insert(account, new_deposit);").passed,
    ).toBe(true);
  });

  it("refuses a deposit saved from another local than the new total", () => {
    const fromSent = "let sent = self.vm().msg_value();\n        let sum = self.deposits.get(account) + sent;\n        self.deposits.insert(account, sent);";
    expect(variant(11, save, fromSent).objectives).toEqual(["Save the caller's new deposit"]);
    expect(variant(11, save, `${deposit}\n        self.deposits.insert(account, totals);`).objectives).toEqual(["Save the caller's new deposit"]);
  });

  it("accepts the lowered deposit computed in a local variable first", () => {
    expect(
      variant(11, lower, "let remaining = available - amount;\n        self.deposits.insert(account, remaining);\n        transfer_eth(self.vm(), account, amount)?;").passed,
    ).toBe(true);
    expect(
      variant(11, lower, "let remaining = available - amount;\n        self.deposits.setter(account).set(remaining);\n        transfer_eth(self.vm(), account, amount)?;").passed,
    ).toBe(true);
  });

  it("refuses a local lowered deposit written after the ETH is sent, or never written", () => {
    const late = variant(11, lower, "let remaining = available - amount;\n        transfer_eth(self.vm(), account, amount)?;\n        self.deposits.insert(account, remaining);");
    expect(late.objectives).toEqual(["Lower the deposit first, then send the ETH"]);
    const unused = variant(11, lower, "let remaining = available - amount;\n        self.deposits.insert(account, available);\n        transfer_eth(self.vm(), account, amount)?;");
    expect(unused.objectives).toEqual(["Lower the deposit first, then send the ETH"]);
  });

  it("accepts the error built in a local variable first", () => {
    expect(
      variant(11, refuse, "let error = InsufficientDeposit { available, requested: amount };\n            return Err(BankError::InsufficientDeposit(error).into());").passed,
    ).toBe(true);
    expect(
      variant(11, refuse, "let error = BankError::InsufficientDeposit(InsufficientDeposit {\n                available,\n                requested: amount,\n            });\n            return Err(error.into());").passed,
    ).toBe(true);
  });

  it("refuses an error built in a local but never returned", () => {
    const result = variant(11, refuse, "let _error = InsufficientDeposit { available, requested: amount };\n            return Ok(());");
    expect(result.objectives).toEqual(["Revert when the deposit is too small"]);
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

  const product = "let scaled = amount\n            .checked_mul(rate_bps)\n            .ok_or(QuoteError::FeeOverflow(FeeOverflow { amount, rate_bps }))?;";

  it("accepts the overflow error built in a local variable first", () => {
    expect(
      variant(12, product, "let overflow = QuoteError::FeeOverflow(FeeOverflow { amount, rate_bps });\n        let scaled = amount\n            .checked_mul(rate_bps)\n            .ok_or(overflow)?;").passed,
    ).toBe(true);
    expect(
      variant(12, product, "let overflow = FeeOverflow { amount, rate_bps };\n        let scaled = rate_bps.checked_mul(amount).ok_or(QuoteError::FeeOverflow(overflow))?;").passed,
    ).toBe(true);
  });

  it("refuses an overflow error built in a local but never used", () => {
    const result = variant(12, product, "let _overflow = FeeOverflow { amount, rate_bps };\n        let scaled = amount.checked_mul(rate_bps).unwrap_or(U256::ZERO);");
    expect(result.objectives).toEqual(["Revert with FeeOverflow when the product does not fit"]);
  });

  it("accepts the fee computed in a local variable first", () => {
    expect(variant(12, "Ok(scaled / U256::from(10_000))", "let fee = scaled / U256::from(10_000);\n        Ok(fee)").passed).toBe(true);
  });

  it("refuses a local fee that is not the value returned", () => {
    const result = variant(12, "Ok(scaled / U256::from(10_000))", "let _fee = scaled / U256::from(10_000);\n        Ok(scaled)");
    expect(result.objectives).toEqual(["Return the fee as a share of 10,000 basis points"]);
  });

  it("accepts the stored rate read into a local variable first in quote", () => {
    expect(variant(12, "Self::fee(amount, self.rate_bps.get())", "let rate = self.rate_bps.get();\n        Self::fee(amount, rate)").passed).toBe(true);
    expect(variant(12, "Self::fee(amount, self.rate_bps.get())", "let rate = self.rate_bps.get();\n        Ok(Self::fee(amount, rate)?)").passed).toBe(true);
  });

  it("refuses a quote at a rate other than the stored one", () => {
    const result = variant(12, "Self::fee(amount, self.rate_bps.get())", "let _rate = self.rate_bps.get();\n        Self::fee(amount, U256::from(30))");
    expect(result.objectives).toEqual(["Quote the fee at the stored rate"]);
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
