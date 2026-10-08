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
