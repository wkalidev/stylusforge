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

describe("lesson 18: WASM, ink and gas", () => {
  const price = "pub fn ink_price(&self) -> u32 {\n        self.vm().tx_ink_price()\n    }";
  const toGas = "pub fn to_gas(&self, ink: u64) -> u64 {\n        self.vm().ink_to_gas(ink)\n    }";
  const toInk = "pub fn to_ink(&self, gas: u64) -> u64 {\n        self.vm().gas_to_ink(gas)\n    }";
  const overflow = ".ok_or(BudgetError::BudgetOverflow(BudgetOverflow { items, ink_per_item }))?;";
  const product = "let ink = items\n            .checked_mul(ink_per_item)\n            " + overflow;
  const divide = "Ok(ink / U256::from(self.vm().tx_ink_price()))";

  it("accepts the price returned with return or from a local", () => {
    expect(variant(18, price, "pub fn ink_price(&self) -> u32 {\n        return self.vm().tx_ink_price();\n    }").passed).toBe(true);
    expect(variant(18, price, "pub fn ink_price(&self) -> u32 {\n        let price = self.vm().tx_ink_price();\n        price\n    }").passed).toBe(true);
  });

  it("accepts the conversions written out with the price of the host", () => {
    expect(variant(18, toGas, "pub fn to_gas(&self, ink: u64) -> u64 {\n        ink / u64::from(self.vm().tx_ink_price())\n    }").passed).toBe(true);
    expect(variant(18, toGas, "pub fn to_gas(&self, ink: u64) -> u64 {\n        ink / self.vm().tx_ink_price() as u64\n    }").passed).toBe(true);
    expect(
      variant(18, toGas, "pub fn to_gas(&self, ink: u64) -> u64 {\n        let price = u64::from(self.vm().tx_ink_price());\n        ink / price\n    }").passed,
    ).toBe(true);
    expect(variant(18, toGas, "pub fn to_gas(&self, ink: u64) -> u64 {\n        return self.vm().ink_to_gas(ink);\n    }").passed).toBe(true);
    expect(variant(18, toInk, "pub fn to_ink(&self, gas: u64) -> u64 {\n        gas.saturating_mul(u64::from(self.vm().tx_ink_price()))\n    }").passed).toBe(true);
    expect(variant(18, toInk, "pub fn to_ink(&self, gas: u64) -> u64 {\n        gas.saturating_mul(self.vm().tx_ink_price().into())\n    }").passed).toBe(true);
  });

  it("refuses the default price kept as a constant", () => {
    expect(variant(18, price, "pub fn ink_price(&self) -> u32 {\n        10_000\n    }").objectives).toEqual(["Return the ink price that the chain sets"]);
    expect(variant(18, toGas, "pub fn to_gas(&self, ink: u64) -> u64 {\n        ink / 10_000\n    }").passed).toBe(false);
    expect(variant(18, divide, "Ok(ink / U256::from(10_000))").objectives).toEqual(["Convert the ink of the batch to gas at the ink price of the chain"]);
  });

  it("refuses a conversion to ink that can overflow, or a conversion the wrong way", () => {
    const objective = ["Convert gas to ink at the ink price of the chain, without overflowing"];
    expect(variant(18, toInk, "pub fn to_ink(&self, gas: u64) -> u64 {\n        gas * u64::from(self.vm().tx_ink_price())\n    }").objectives).toEqual(objective);
    expect(variant(18, toInk, "pub fn to_ink(&self, gas: u64) -> u64 {\n        gas.wrapping_mul(u64::from(self.vm().tx_ink_price()))\n    }").objectives).toEqual(objective);
    expect(variant(18, toInk, "pub fn to_ink(&self, gas: u64) -> u64 {\n        self.vm().ink_to_gas(gas)\n    }").objectives).toEqual(objective);
    expect(variant(18, toGas, "pub fn to_gas(&self, ink: u64) -> u64 {\n        self.vm().gas_to_ink(ink)\n    }").passed).toBe(false);
  });

  it("accepts the overflow error with ok_or_else, the fields in any order, rustfmt style, or built in a local", () => {
    expect(variant(18, overflow, ".ok_or_else(|| BudgetError::BudgetOverflow(BudgetOverflow { items, ink_per_item }))?;").passed).toBe(true);
    expect(variant(18, overflow, ".ok_or(BudgetError::BudgetOverflow(BudgetOverflow { ink_per_item, items }))?;").passed).toBe(true);
    expect(
      variant(18, overflow, ".ok_or(BudgetError::BudgetOverflow(BudgetOverflow {\n                items,\n                ink_per_item,\n            }))?;").passed,
    ).toBe(true);
    expect(
      variant(
        18,
        product,
        "let overflow = BudgetError::BudgetOverflow(BudgetOverflow { items, ink_per_item });\n        let ink = ink_per_item.checked_mul(items).ok_or(overflow)?;",
      ).passed,
    ).toBe(true);
  });

  it("refuses a panic, or an overflow turned into zero", () => {
    const objective = ["Revert with BudgetOverflow instead of panicking when the batch is too large"];
    expect(variant(18, overflow, '.expect("budget overflow");').objectives).toEqual(objective);
    expect(variant(18, overflow, ".unwrap();").objectives).toEqual(objective);
    expect(variant(18, overflow, ".unwrap_or(U256::ZERO);").objectives).toEqual(objective);
  });

  it("accepts the price or the gas kept in a local", () => {
    expect(variant(18, divide, "let price = U256::from(self.vm().tx_ink_price());\n        Ok(ink / price)").passed).toBe(true);
    expect(variant(18, divide, "let gas = ink / U256::from(self.vm().tx_ink_price());\n        Ok(gas)").passed).toBe(true);
  });
});

describe("lesson 19: Testing in Rust", () => {
  const setup = "let vm = TestVM::default();\n        let mut contract = TimeLock::from(&vm);";
  const deployed = "contract.constructor(U256::from(3600));";
  const recorded = "assert_eq!(contract.deposit_of(ALICE), U256::from(100));";
  const early =
    "assert_eq!(\n            contract.withdraw(),\n            Err(LockError::StillLocked(StillLocked { unlock_at: U256::from(3600), now: U256::ZERO }).into())\n        );";
  const opened = "vm.set_block_timestamp(3600);";
  const succeeds = "assert!(contract.withdraw().is_ok());";
  const cleared = "assert_eq!(contract.deposit_of(ALICE), U256::ZERO);";

  it("accepts TestVM::new() and other names for the VM and the contract", () => {
    const renamed = SOLUTIONS[19]
      .replace(setup, "let host = TestVM::new();\n        let mut lock = TimeLock::from(&host);")
      .replaceAll("contract.", "lock.")
      .replaceAll("vm.", "host.");
    expect(validateCode(renamed, LESSONS.find((lesson) => lesson.id === 19)!.exercise!.checks).passed).toBe(true);
  });

  it("accepts the delay written another way, and the assertions either way round", () => {
    expect(variant(19, deployed, "contract.constructor(U256::from(3_600));").passed).toBe(true);
    expect(variant(19, deployed, "contract.constructor(U256::from(60 * 60));").passed).toBe(true);
    expect(variant(19, recorded, "assert_eq!(U256::from(100), contract.deposit_of(ALICE));").passed).toBe(true);
    expect(variant(19, recorded, "assert!(contract.deposit_of(ALICE) == U256::from(100));").passed).toBe(true);
    expect(variant(19, cleared, "assert!(contract.deposit_of(ALICE) == U256::from(0));").passed).toBe(true);
  });

  it("accepts the StillLocked assertion with the fields in any order, rustfmt style, or through locals", () => {
    const error = "LockError::StillLocked(StillLocked { unlock_at: U256::from(3600), now: U256::ZERO })";
    expect(variant(19, early, "assert_eq!(contract.withdraw(), Err(LockError::StillLocked(StillLocked { now: U256::from(0), unlock_at: U256::from(3_600) }).into()));").passed).toBe(true);
    expect(
      variant(
        19,
        early,
        "assert_eq!(\n            contract.withdraw(),\n            Err(LockError::StillLocked(StillLocked {\n                unlock_at: U256::from(3600),\n                now: U256::ZERO,\n            })\n            .into()),\n        );",
      ).passed,
    ).toBe(true);
    expect(variant(19, early, `let early = contract.withdraw();\n        assert_eq!(early, Err(${error}.into()));`).passed).toBe(true);
    expect(variant(19, early, `let expected = ${error};\n        assert_eq!(contract.withdraw(), Err(expected.into()));`).passed).toBe(true);
    expect(variant(19, early, `assert_eq!(Err(${error}.into()), contract.withdraw());`).passed).toBe(true);
  });

  it("refuses an early withdrawal checked against any error, or against the wrong fields", () => {
    const objective = ["Check that an early withdrawal reverts with StillLocked, and its fields"];
    expect(variant(19, early, "assert!(contract.withdraw().is_err());").objectives).toEqual(objective);
    expect(
      variant(19, early, "assert_eq!(contract.withdraw(), Err(LockError::StillLocked(StillLocked { unlock_at: U256::from(3599), now: U256::ZERO }).into()));").objectives,
    ).toEqual(objective);
    expect(
      variant(19, early, "assert_eq!(contract.withdraw(), Err(LockError::NothingLocked(NothingLocked { account: ALICE }).into()));").objectives,
    ).toEqual(objective);
  });

  it("accepts a successful withdrawal unwrapped or compared with Ok(())", () => {
    expect(variant(19, succeeds, "contract.withdraw().unwrap();").passed).toBe(true);
    expect(variant(19, succeeds, 'contract.withdraw().expect("the lock is open");').passed).toBe(true);
    expect(variant(19, succeeds, "assert_eq!(contract.withdraw(), Ok(()));").passed).toBe(true);
  });

  it("refuses a withdrawal before the lock opens, or one whose success is not checked", () => {
    const objective = ["When the lock opens, check that the withdrawal succeeds and clears her deposit"];
    expect(variant(19, opened, "vm.set_block_timestamp(3599);").objectives).toEqual(objective);
    expect(variant(19, succeeds, "let _ = contract.withdraw();").objectives).toEqual(objective);
    expect(variant(19, cleared, "assert_eq!(contract.deposit_of(ALICE), U256::from(100));").objectives).toEqual(objective);
  });

  it("refuses a deposit sent without its value, or a log check that ignores the event", () => {
    expect(variant(19, "vm.set_value(U256::from(100));", "").objectives).toEqual(["Deposit 100 wei as Alice"]);
    expect(variant(19, "assert_eq!(logs[0].0[0], Deposited::SIGNATURE_HASH);", "").objectives).toEqual(["Check that the deposit was logged with a Deposited event"]);
  });
});

describe("lesson 20: Security pitfalls", () => {
  const lesson = () => LESSONS.find((candidate) => candidate.id === 20)!.exercise!;
  const constructor = "#[constructor]\n    pub fn constructor(&mut self, owner: Address) {\n        self.owner.set(owner);\n    }";
  const init = "pub fn init(&mut self, owner: Address) {\n        self.owner.set(owner);\n    }";
  const authorized = "let caller = self.vm().msg_sender();\n        if caller != self.owner.get() {";
  const subtraction =
    "let remaining = available\n            .checked_sub(amount)\n            .ok_or(TreasuryError::InsufficientBalance(InsufficientBalance { available, requested: amount }))?;";
  const lowered = "self.balances.insert(account, remaining);\n        unsafe {";
  const payment = "RawCall::new_with_value(self.vm(), amount).flush_storage_cache().call(account, &[])?;";
  const objectives = [
    "Set the owner once, when the contract is deployed",
    "Authorize the account that calls the treasury",
    "Subtract with checked_sub, so a withdrawal above the balance fails instead of wrapping around",
    "Lower the balance before the ETH leaves",
    "Write the storage cache to storage before sending the ETH",
  ];

  it("fails all five objectives on the starter, one per planted bug", () => {
    expect(validateCode(lesson().starterCode, lesson().checks).objectives).toEqual(objectives);
  });

  it("fails while a planted bug stays next to its fix", () => {
    // 1: the constructor added, the open init kept (with or without pub: #[public] exports both).
    expect(variant(20, constructor, `${constructor}\n\n    ${init}`).objectives).toEqual([objectives[0]]);
    expect(variant(20, constructor, `${constructor}\n\n    fn init(&mut self, owner: Address) {\n        self.owner.set(owner);\n    }`).objectives).toEqual([objectives[0]]);
    // 2: msg_sender checked, tx_origin still checked too.
    expect(
      variant(
        20,
        "            return Err(TreasuryError::NotOwner(NotOwner { caller }));\n        }\n        Ok(())",
        "            return Err(TreasuryError::NotOwner(NotOwner { caller }));\n        }\n        if self.vm().tx_origin() != self.owner.get() {\n            return Err(TreasuryError::NotOwner(NotOwner { caller }));\n        }\n        Ok(())",
      ).objectives,
    ).toEqual([objectives[1]]);
    // 3: checked_sub added, the wrapping subtraction kept.
    expect(variant(20, subtraction, `${subtraction}\n        let remaining = available - amount;`).objectives).toEqual([objectives[2]]);
    // 4: the balance written before the call, and again after it.
    expect(
      variant(20, "        }\n        self.vm().log(Withdrawn", "        }\n        self.balances.insert(account, remaining);\n        self.vm().log(Withdrawn").objectives,
    ).toEqual([objectives[3]]);
    // 5: transfer_eth added, the raw call without a flush kept.
    expect(
      variant(20, payment, "RawCall::new_with_value(self.vm(), amount).call(account, &[])?;\n        }\n        transfer_eth(self.vm(), account, amount)?;\n        unsafe {").objectives,
    ).toEqual([objectives[4]]);
  });

  it("accepts the constructor under another name or with a limit, and the owner check either way round", () => {
    expect(variant(20, constructor, "#[constructor]\n    pub fn new(&mut self, initial_owner: Address) {\n        self.owner.set(initial_owner);\n    }").passed).toBe(true);
    expect(
      variant(20, constructor, "#[constructor]\n    pub fn constructor(&mut self, owner: Address, limit: U256) {\n        self.owner.set(owner);\n        self.limit.set(limit);\n    }").passed,
    ).toBe(true);
    expect(variant(20, authorized, "let caller = self.vm().msg_sender();\n        if self.owner.get() != caller {").passed).toBe(true);
    expect(variant(20, authorized, "let caller = self.vm().msg_sender();\n        let sender = caller;\n        if self.vm().msg_sender() != self.owner.get() {").passed).toBe(true);
  });

  it("refuses an owner set without #[constructor]", () => {
    expect(variant(20, constructor, "pub fn constructor(&mut self, owner: Address) {\n        self.owner.set(owner);\n    }").objectives).toEqual([objectives[0]]);
  });

  it("accepts the checked subtraction with ok_or_else, the fields in any order, rustfmt style, or the error in a local", () => {
    const error = "TreasuryError::InsufficientBalance(InsufficientBalance { available, requested: amount })";
    expect(variant(20, subtraction, `let remaining = available.checked_sub(amount).ok_or_else(|| ${error})?;`).passed).toBe(true);
    expect(
      variant(20, subtraction, "let remaining = available.checked_sub(amount).ok_or(TreasuryError::InsufficientBalance(InsufficientBalance { requested: amount, available }))?;")
        .passed,
    ).toBe(true);
    expect(
      variant(
        20,
        subtraction,
        "let remaining = available\n            .checked_sub(amount)\n            .ok_or(TreasuryError::InsufficientBalance(InsufficientBalance {\n                available,\n                requested: amount,\n            }))?;",
      ).passed,
    ).toBe(true);
    expect(variant(20, subtraction, `let error = ${error};\n        let remaining = available.checked_sub(amount).ok_or(error)?;`).passed).toBe(true);
  });

  it("refuses a subtraction that saturates or is guarded by hand", () => {
    expect(variant(20, subtraction, "let remaining = available.saturating_sub(amount);").objectives).toEqual([objectives[2]]);
    const guarded =
      "if available < amount {\n            return Err(TreasuryError::InsufficientBalance(InsufficientBalance { available, requested: amount }).into());\n        }\n        let remaining = available - amount;";
    expect(variant(20, subtraction, guarded).objectives).toEqual([objectives[2]]);
  });

  it("accepts the balance written with setter, and the ETH sent with transfer_eth or a raw call that clears the cache", () => {
    expect(variant(20, lowered, "self.balances.setter(account).set(remaining);\n        unsafe {").passed).toBe(true);
    expect(variant(20, payment, "RawCall::new_with_value(self.vm(), amount).clear_storage_cache().call(account, &[])?;").passed).toBe(true);
    expect(
      variant(20, payment, "RawCall::new_with_value(self.vm(), amount)\n                .skip_return_data()\n                .flush_storage_cache()\n                .call(account, &[])?;").passed,
    ).toBe(true);
    const transfer = SOLUTIONS[20]
      .replace("call::RawCall,", "call::transfer::transfer_eth,")
      .replace(`unsafe {\n            ${payment}\n        }`, "transfer_eth(self.vm(), account, amount)?;");
    expect(transfer).toContain("self.balances.insert(account, remaining);\n        transfer_eth(self.vm(), account, amount)?;");
    expect(validateCode(transfer, lesson().checks)).toEqual({ passed: true, objectives: [] });
  });

  it("refuses the ETH sent before the balance is written, even with a flush", () => {
    const sendFirst = SOLUTIONS[20].replace(
      `self.balances.insert(account, remaining);\n        unsafe {\n            ${payment}\n        }`,
      `unsafe {\n            ${payment}\n        }\n        self.balances.insert(account, remaining);`,
    );
    expect(validateCode(sendFirst, lesson().checks).objectives).toEqual([objectives[3]]);
  });
});

describe("lesson 21: Final project, mini vault", () => {
  const guard = "self.only_owner()?;\n        self.paused.set(paused);";
  const before = "let assets_before = self.total_assets() - assets;";
  const price = "assets.checked_mul(supply).ok_or(VaultError::MathOverflow(MathOverflow {}))? / assets_before";
  const empty = "let shares = if supply.is_zero() {";
  const zero = "if shares.is_zero() {\n            return Err(VaultError::ZeroShares(ZeroShares { assets }));";
  const mint = "let balance = self.shares.get(account) + shares;\n        self.shares.insert(account, balance);\n        self.total_shares.set(supply + shares);";
  const burn = "self.shares.insert(account, available - shares);\n        self.total_shares.set(supply - shares);\n        transfer_eth(self.vm(), account, assets)?;";
  const test = "let vm = TestVM::default();\n        let mut vault = MiniVault::from(&vm);";
  const shares = "assert_eq!(vault.shares_of(ALICE), U256::from(1000));";

  it("accepts the owner checked inline, the paused view, and the balance read directly", () => {
    expect(variant(21, "self.only_owner()?;\n        self.paused.set(paused);", "let caller = self.vm().msg_sender();\n        if caller != self.owner.get() {\n            return Err(VaultError::NotOwner(NotOwner { caller }));\n        }\n        self.paused.set(paused);").passed).toBe(true);
    expect(variant(21, "if self.paused.get() {", "if self.paused() {").passed).toBe(true);
    expect(variant(21, before, "let assets_before = self.vm().balance(self.vm().contract_address()) - self.vm().msg_value();").passed).toBe(true);
  });

  it("refuses the assets before measured without taking out the value", () => {
    expect(variant(21, before, "let assets_before = self.total_assets();").objectives).toEqual(["Measure the assets the vault held before this deposit"]);
  });

  it("refuses set_paused without a guard, and deposits that ignore the pause", () => {
    expect(variant(21, guard, "self.paused.set(paused);").objectives).toEqual(["Let only the owner pause and unpause the vault"]);
    expect(variant(21, "if self.paused.get() {", "if !self.paused.get() {").objectives).toEqual(["Refuse deposits while the vault is paused"]);
  });

  it("accepts the share price with the factors and the empty test either way, ok_or_else, and another name for the assets before", () => {
    expect(variant(21, empty, "let shares = if supply == U256::ZERO {").passed).toBe(true);
    expect(variant(21, price, "supply.checked_mul(assets).ok_or_else(|| VaultError::MathOverflow(MathOverflow {}))? / assets_before").passed).toBe(true);
    const renamed = SOLUTIONS[21].replace(before, "let held = self.total_assets() - assets;").replace(price, price.replace("assets_before", "held"));
    expect(validateCode(renamed, LESSONS.find((lesson) => lesson.id === 21)!.exercise!.checks).passed).toBe(true);
  });

  it("refuses a share price that can overflow, or that divides by the balance after the deposit", () => {
    const objective = ["Mint one share per wei into an empty vault, and in proportion to the assets otherwise"];
    expect(variant(21, price, "assets * supply / assets_before").objectives).toEqual(objective);
    expect(variant(21, price, "assets.checked_mul(supply).ok_or(VaultError::MathOverflow(MathOverflow {}))? / self.total_assets()").objectives).toEqual(objective);
    expect(variant(21, empty, "let shares = if supply.is_zero() {\n            U256::ZERO\n        } else if false {").objectives).toEqual(objective);
  });

  it("requires the zero-share guard", () => {
    expect(variant(21, zero, "if false {\n            return Err(VaultError::ZeroShares(ZeroShares { assets }));").objectives).toEqual(["Refuse a deposit that would mint no share"]);
    expect(variant(21, zero, "if shares == U256::ZERO {\n            return Err(VaultError::ZeroShares(ZeroShares { assets }));").passed).toBe(true);
  });

  it("accepts the shares minted with setter, inline, or the total from a local; refuses half a mint", () => {
    expect(variant(21, mint, "let balance = shares + self.shares.get(account);\n        self.shares.setter(account).set(balance);\n        let total = supply + shares;\n        self.total_shares.set(total);").passed).toBe(true);
    expect(variant(21, mint, "self.shares.insert(account, self.shares.get(account) + shares);\n        self.total_shares.set(shares + supply);").passed).toBe(true);
    expect(variant(21, mint, "let balance = self.shares.get(account) + shares;\n        self.shares.insert(account, balance);").objectives).toEqual(["Add the new shares to the account and to the total"]);
  });

  it("accepts the burn in either order or with setter, and refuses a burn after the ETH has left or a partial one", () => {
    const objective = ["Burn the shares before the ETH leaves"];
    expect(variant(21, burn, "self.total_shares.set(supply - shares);\n        self.shares.setter(account).set(available - shares);\n        transfer_eth(self.vm(), account, assets)?;").passed).toBe(true);
    expect(variant(21, burn, "transfer_eth(self.vm(), account, assets)?;\n        self.shares.insert(account, available - shares);\n        self.total_shares.set(supply - shares);").objectives).toEqual(objective);
    expect(variant(21, burn, "self.shares.insert(account, available - shares);\n        transfer_eth(self.vm(), account, assets)?;").objectives).toEqual(objective);
  });

  it("accepts the test with TestVM::new, other names and the assertion either way round", () => {
    const renamed = SOLUTIONS[21]
      .replace(test, "let host = TestVM::new();\n        let mut v = MiniVault::from(&host);")
      .replace("vault.constructor(OWNER);", "v.constructor(OWNER);")
      .replace("vm.set_sender(ALICE);", "host.set_sender(ALICE);")
      .replace("vm.set_value(U256::from(1000));", "host.set_value(U256::from(1_000));")
      .replace("vm.set_balance(vm.contract_address(), U256::from(1000));", "")
      .replace("assert_eq!(vault.deposit().ok(), Some(U256::from(1000)));", "assert!(v.deposit().is_ok());")
      .replace(shares, "assert_eq!(U256::from(1_000), v.shares_of(ALICE));");
    expect(validateCode(renamed, LESSONS.find((lesson) => lesson.id === 21)!.exercise!.checks).passed).toBe(true);
  });

  it("refuses a test that sends no value or checks the wrong number of shares", () => {
    const objective = ["Test that a first deposit mints one share per wei"];
    expect(variant(21, "vm.set_value(U256::from(1000));", "").objectives).toEqual(objective);
    expect(variant(21, shares, "assert_eq!(vault.shares_of(ALICE), U256::from(100));").objectives).toEqual(objective);
    expect(variant(21, "        assert_eq!(vault.deposit().ok(), Some(U256::from(1000)));\n", "").objectives).toEqual(objective);
  });
});
