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

/** The checks of an available lesson. */
function checksOf(lessonId: number) {
  const lesson = LESSONS.find((candidate) => candidate.id === lessonId)!;
  if (!lesson.available) throw new Error(`Lesson ${lessonId} is not available`);
  return lesson.exercise.checks;
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

describe("lesson 14: ERC-721", () => {
  const missing = "if owner.is_zero() {\n            return Err(Erc721Error::NonexistentToken(NonexistentToken { token_id }));\n        }";
  const zeroReceiver = "if to.is_zero() {\n            return Err(Erc721Error::InvalidReceiver(InvalidReceiver { receiver: to }));\n        }";
  const ownerCheck = "let owner = self.owner_of(token_id)?;\n        if owner != from {\n            return Err(Erc721Error::IncorrectOwner(IncorrectOwner { from, token_id, owner }));\n        }";
  const authorize = "if caller != owner && caller != self.token_approvals.get(token_id) {";
  const balances =
    "let sent = self.balances.get(from);\n        self.balances.insert(from, sent - U256::from(1));\n        let received = self.balances.get(to);\n        self.balances.insert(to, received + U256::from(1));";

  it("accepts the zero address compared with == either way round", () => {
    expect(variant(14, "if owner.is_zero() {", "if Address::ZERO == owner {").passed).toBe(true);
    expect(variant(14, "if owner.is_zero() {", "if owner == Address::ZERO {").passed).toBe(true);
    expect(variant(14, "if to.is_zero() {", "if to == Address::ZERO {").passed).toBe(true);
  });

  it("accepts the errors built in a local variable first, rustfmt style", () => {
    expect(
      variant(14, missing, "if owner.is_zero() {\n            let error = NonexistentToken { token_id };\n            return Err(Erc721Error::NonexistentToken(error));\n        }").passed,
    ).toBe(true);
    expect(
      variant(14, zeroReceiver, "if to.is_zero() {\n            let error = Erc721Error::InvalidReceiver(InvalidReceiver {\n                receiver: to,\n            });\n            return Err(error);\n        }").passed,
    ).toBe(true);
  });

  it("accepts the owner under any local name, compared either way round", () => {
    const renamedOwner =
      "let holder = self.owner_of(token_id)?;\n        if from != holder {\n            let error = IncorrectOwner { from, token_id, owner: holder };\n            return Err(Erc721Error::IncorrectOwner(error));\n        }";
    const result = validateCode(
      SOLUTIONS[14].replace(ownerCheck, renamedOwner).replace(authorize, "if caller != holder && caller != self.token_approvals.get(token_id) {"),
      checksOf(14),
    );
    expect(result.passed).toBe(true);
  });

  it("accepts the authorization tests in either order, each either way round, with the approval in a local", () => {
    expect(variant(14, authorize, "if self.token_approvals.get(token_id) != caller && owner != caller {").passed).toBe(true);
    expect(variant(14, authorize, "let approved = self.token_approvals.get(token_id);\n        if approved != caller && caller != owner {").passed).toBe(true);
  });

  it("accepts the approval reset with insert or setter, and the owner written with setter", () => {
    expect(variant(14, "self.token_approvals.delete(token_id);", "self.token_approvals.insert(token_id, Address::ZERO);").passed).toBe(true);
    expect(variant(14, "self.token_approvals.delete(token_id);", "self.token_approvals.setter(token_id).set(Address::ZERO);").passed).toBe(true);
    expect(variant(14, "self.owners.insert(token_id, to);", "self.owners.setter(token_id).set(to);").passed).toBe(true);
  });

  it("accepts the balances read inline in insert, U256::ONE, setter and locals", () => {
    expect(
      variant(14, balances, "self.balances.insert(from, self.balances.get(from) - U256::ONE);\n        let received = self.balances.get(to);\n        let raised = U256::ONE + received;\n        self.balances.setter(to).set(raised);").passed,
    ).toBe(true);
    expect(
      variant(14, balances, "let sent = self.balances.get(from);\n        self.balances.setter(from).set(sent - U256::from(1));\n        self.balances.insert(to, U256::from(1) + self.balances.get(to));").passed,
    ).toBe(true);
  });

  it("accepts the Transfer event built in a local variable first", () => {
    expect(variant(14, "self.vm().log(Transfer { from, to, token_id });", "let event = Transfer { from, to, token_id };\n        self.vm().log(event);").passed).toBe(true);
  });

  it("refuses a transfer_from that lets a token go to the zero address", () => {
    expect(variant(14, zeroReceiver, "").objectives).toEqual(["Refuse to send a token to the zero address"]);
  });

  it("refuses a transfer_from that never checks from against the owner, or reads the owner without owner_of", () => {
    const unchecked = variant(14, ownerCheck, "let owner = self.owner_of(token_id)?;");
    expect(unchecked.objectives).toEqual(["Refuse a transfer from an account that does not own the token"]);
    const raw = variant(14, "let owner = self.owner_of(token_id)?;\n        if owner != from {", "let owner = self.owners.get(token_id);\n        if owner != from {");
    expect(raw.objectives).toEqual(["Refuse a transfer from an account that does not own the token"]);
  });

  it("refuses an authorization that checks only the approval or only the owner, or joins them with ||", () => {
    expect(variant(14, authorize, "if caller != self.token_approvals.get(token_id) {").objectives).toEqual([
      "Let only the owner or the approved account move the token",
    ]);
    expect(variant(14, authorize, "if caller != owner {").objectives).toEqual(["Let only the owner or the approved account move the token"]);
    expect(variant(14, authorize, "if caller != owner || caller != self.token_approvals.get(token_id) {").objectives).toEqual([
      "Let only the owner or the approved account move the token",
    ]);
  });

  it("refuses an approval that survives the transfer", () => {
    expect(variant(14, "self.token_approvals.delete(token_id);", "").objectives).toEqual(["Clear the token's approval when it changes hands"]);
  });

  it("refuses balances moved the wrong way, or only on one side", () => {
    expect(variant(14, "sent - U256::from(1)", "sent + U256::from(1)").objectives).toEqual(["Move one token from the sender's balance to the receiver's"]);
    expect(
      variant(14, "let received = self.balances.get(to);\n        self.balances.insert(to, received + U256::from(1));", "").objectives,
    ).toEqual(["Move one token from the sender's balance to the receiver's"]);
  });

  it("refuses an owner_of that returns the zero address for a missing token", () => {
    expect(variant(14, missing, "").objectives).toEqual(["Revert for a token that nobody owns"]);
  });
});

describe("lesson 15: OpenZeppelin for Stylus", () => {
  const implementsAttribute = "#[implements(IErc20<Error = erc20::Error>, IErc20Metadata, IErc165)]";
  const supports = "self.erc20.supports_interface(interface_id) || self.metadata.supports_interface(interface_id)";

  it("accepts the interfaces in any order, and rustfmt line breaks", () => {
    expect(variant(15, implementsAttribute, "#[implements(IErc165, IErc20Metadata, IErc20<Error = erc20::Error>)]").passed).toBe(true);
    expect(variant(15, implementsAttribute, "#[implements(\n    IErc20Metadata,\n    IErc20<Error = erc20::Error>,\n    IErc165,\n)]").passed).toBe(true);
    expect(variant(15, implementsAttribute, "#[implements(\n    IErc20Metadata,\n    IErc20<Error = erc20::Error>,\n    IErc165\n)]").passed).toBe(true);
  });

  it("accepts the mint returned or passed on with ?, and the forwarding wrapped in Ok", () => {
    expect(variant(15, "self.erc20._mint(recipient, supply)\n", "self.erc20._mint(recipient, supply)?;\n        Ok(())\n").passed).toBe(true);
    expect(variant(15, "self.erc20.transfer(to, value)", "Ok(self.erc20.transfer(to, value)?)").passed).toBe(true);
  });

  it("accepts both answers in either order, with the trait syntax or in locals", () => {
    expect(variant(15, supports, "self.metadata.supports_interface(interface_id) || self.erc20.supports_interface(interface_id)").passed).toBe(true);
    expect(
      variant(15, supports, "Erc20::supports_interface(&self.erc20, interface_id)\n            || Erc20Metadata::supports_interface(&self.metadata, interface_id)").passed,
    ).toBe(true);
    expect(
      variant(
        15,
        supports,
        "let token_answer = self.erc20.supports_interface(interface_id);\n        let metadata_answer = self.metadata.supports_interface(interface_id);\n        token_answer || metadata_answer",
      ).passed,
    ).toBe(true);
  });

  it("refuses an implements list that leaves an interface out", () => {
    expect(variant(15, implementsAttribute, "#[implements(IErc20<Error = erc20::Error>, IErc20Metadata)]").objectives).toEqual([
      "Route calls to the ERC-20, metadata and ERC-165 interfaces",
    ]);
  });

  it("refuses a constructor that never mints, or mints to the caller", () => {
    expect(variant(15, "self.erc20._mint(recipient, supply)\n", "Ok(())\n").objectives).toEqual(["Mint the initial supply to the recipient"]);
    expect(variant(15, "self.erc20._mint(recipient, supply)", "self.erc20._mint(self.vm().msg_sender(), supply)").objectives).toEqual([
      "Mint the initial supply to the recipient",
    ]);
  });

  it("refuses supports_interface answers joined with && or taken from one component", () => {
    expect(variant(15, supports, "self.erc20.supports_interface(interface_id) && self.metadata.supports_interface(interface_id)").objectives).toEqual([
      "Support an interface when either component supports it",
    ]);
    expect(variant(15, supports, "self.erc20.supports_interface(interface_id)").objectives).toEqual([
      "Support an interface when either component supports it",
    ]);
  });
});
