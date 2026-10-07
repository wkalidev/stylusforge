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

describe("lesson 16: Calling Solidity", () => {
  const signature =
    "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);";
  const decimals = "let feed = IPriceFeed::new(self.feed.get());\n        Ok(feed.decimals(self.vm(), Call::new())?)";
  const read = "let feed = IPriceFeed::new(self.feed.get());\n        let (_, answer, _, updated_at, _) = feed.latest_round_data(self.vm(), Call::new())?;";
  const stale = "if now - updated_at > self.max_age.get() {";
  const staleError = "return Err(ConsumerError::StalePrice(StalePrice { updated_at, now }).into());";
  const negative = "if answer <= I256::ZERO {";
  const negativeError = "return Err(ConsumerError::NegativePrice(NegativePrice { answer }).into());";

  it("accepts the return values of latestRoundData under any names, or none", () => {
    expect(variant(16, signature, "function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);").passed).toBe(true);
    expect(
      variant(16, signature, "function latestRoundData()\n            external\n            view\n            returns (uint80 id, int256 price, uint256 started, uint256 updated, uint80 answered);").passed,
    ).toBe(true);
  });

  it("accepts the feed built inline or kept in a local, with Call::default() or a configuration kept in a local", () => {
    expect(variant(16, decimals, "Ok(IPriceFeed::new(self.feed.get()).decimals(self.vm(), Call::default())?)").passed).toBe(true);
    expect(
      variant(16, decimals, "let config = Call::new();\n        let decimals = IPriceFeed::new(self.feed.get()).decimals(self.vm(), config)?;\n        Ok(decimals)").passed,
    ).toBe(true);
    expect(variant(16, decimals, "let config = Call::new();\n        let feed = IPriceFeed::new(self.feed.get());\n        Ok(feed.decimals(self.vm(), config)?)").passed).toBe(true);
    expect(variant(16, read, "let oracle = IPriceFeed::from(self.feed.get());\n        let (_, answer, _, updated_at, _) = oracle.latest_round_data(self.vm(), Call::new())?;").passed).toBe(true);
    expect(
      variant(16, read, "let config = Call::new();\n        let oracle = IPriceFeed::new(self.feed.get());\n        let (_, answer, _, updated_at, _) = oracle.latest_round_data(self.vm(), config)?;").passed,
    ).toBe(true);
  });

  it("accepts the round under other local names, rustfmt style", () => {
    const renamed = SOLUTIONS[16]
      .replace(read, "let feed = IPriceFeed::new(self.feed.get());\n        let (_, price, _, updated, _) = feed\n            .latest_round_data(self.vm(), Call::new())?;")
      .replace(stale, "if now - updated > self.max_age.get() {")
      .replace(staleError, "return Err(ConsumerError::StalePrice(StalePrice { updated_at: updated, now }).into());")
      .replace(negative, "if price <= I256::ZERO {")
      .replace(negativeError, "return Err(ConsumerError::NegativePrice(NegativePrice { answer: price }).into());")
      .replace("Ok(answer.into_raw())", "Ok(price.into_raw())");
    expect(validateCode(renamed, LESSONS.find((lesson) => lesson.id === 16)!.exercise!.checks).passed).toBe(true);
  });

  it("accepts the age check either way round, with saturating_sub, a local limit or an addition", () => {
    expect(variant(16, stale, "if self.max_age.get() < now - updated_at {").passed).toBe(true);
    expect(variant(16, stale, "if now.saturating_sub(updated_at) > self.max_age.get() {").passed).toBe(true);
    expect(variant(16, stale, "let max_age = self.max_age.get();\n        if max_age < now.saturating_sub(updated_at) {").passed).toBe(true);
    expect(variant(16, stale, "if now > updated_at + self.max_age.get() {").passed).toBe(true);
  });

  it("accepts the sign check written with is_positive, is_negative and is_zero, or against I256::ONE", () => {
    expect(variant(16, negative, "if !answer.is_positive() {").passed).toBe(true);
    expect(variant(16, negative, "if answer.is_negative() || answer.is_zero() {").passed).toBe(true);
    expect(variant(16, negative, "if answer < I256::ONE {").passed).toBe(true);
    expect(variant(16, negative, "if I256::ZERO >= answer {").passed).toBe(true);
  });

  it("accepts the errors built in a local first, and the answer returned with unsigned_abs or from a local", () => {
    expect(variant(16, staleError, "let error = StalePrice { updated_at, now };\n            return Err(ConsumerError::StalePrice(error).into());").passed).toBe(true);
    expect(
      variant(16, negativeError, "let error = ConsumerError::NegativePrice(NegativePrice {\n                answer,\n            });\n            return Err(error.into());").passed,
    ).toBe(true);
    expect(variant(16, "Ok(answer.into_raw())", "Ok(answer.unsigned_abs())").passed).toBe(true);
    expect(variant(16, "Ok(answer.into_raw())", "let price = answer.into_raw();\n        Ok(price)").passed).toBe(true);
  });

  it("refuses latestRoundData declared without view", () => {
    const result = variant(16, signature, "function latestRoundData() external returns (uint80, int256, uint256, uint256, uint80);");
    expect(result.objectives).toEqual(["Declare the latest round data function of the feed"]);
  });

  it("refuses a writing call configuration for a view function, inline or in a local", () => {
    expect(variant(16, decimals, "let feed = IPriceFeed::new(self.feed.get());\n        Ok(feed.decimals(self.vm(), Call::new_mutating(self))?)").objectives).toEqual([
      "Return the decimals of the feed",
    ]);
    const local = "let config = Call::new_mutating(self);\n        let feed = IPriceFeed::new(self.feed.get());\n        Ok(feed.decimals(self.vm(), config)?)";
    expect(variant(16, decimals, local).objectives).toEqual(["Return the decimals of the feed"]);
  });

  it("refuses an age check written the wrong way round", () => {
    expect(variant(16, stale, "if now - updated_at < self.max_age.get() {").objectives).toEqual(["Refuse a price older than the maximum age"]);
    expect(variant(16, stale, "if updated_at - now > self.max_age.get() {").objectives).toEqual(["Refuse a price older than the maximum age"]);
  });

  it("refuses a sign check that lets zero through, or only refuses negative answers", () => {
    expect(variant(16, negative, "if answer < I256::ZERO {").objectives).toEqual(["Refuse an answer that is zero or negative"]);
    expect(variant(16, negative, "if answer.is_negative() {").objectives).toEqual(["Refuse an answer that is zero or negative"]);
  });

  it("refuses a price returned without the answer of the feed", () => {
    expect(variant(16, "Ok(answer.into_raw())", "Ok(U256::ZERO)").objectives).toEqual(["Return the answer as an unsigned number"]);
  });
});

describe("lesson 17: Being called (export-abi)", () => {
  const selector = '#[selector(name = "latestRoundData")]\n    pub fn latest_round(&self) -> (U80, I256, U256, U256, U80) {';
  const nextRound = "let round = self.round_id.get() + U80::from(1);\n        self.round_id.set(round);";
  const time = "self.updated_at.set(U256::from(self.vm().block_timestamp()));";

  it("accepts the method renamed instead of a selector attribute", () => {
    expect(variant(17, selector, "pub fn latest_round_data(&self) -> (U80, I256, U256, U256, U80) {").passed).toBe(true);
  });

  it("accepts the new round with U80::ONE, either order, inline or from a local", () => {
    expect(variant(17, nextRound, "self.round_id.set(self.round_id.get() + U80::ONE);").passed).toBe(true);
    expect(variant(17, nextRound, "let current = self.round_id.get();\n        self.round_id.set(U80::ONE + current);").passed).toBe(true);
    expect(variant(17, nextRound, "let round = U80::from(1) + self.round_id.get();\n        self.round_id.set(round);").passed).toBe(true);
  });

  it("accepts the block time kept in a local first", () => {
    expect(variant(17, time, "let now = U256::from(self.vm().block_timestamp());\n        self.updated_at.set(now);").passed).toBe(true);
  });

  it("refuses decimals returned as a uint256", () => {
    expect(variant(17, "pub fn decimals(&self) -> u8 {\n        8", "pub fn decimals(&self) -> U256 {\n        U256::from(8)").objectives).toEqual([
      "Return the number of decimals with the type callers expect",
    ]);
  });

  it("refuses round ids returned as u128 or U256, which export as uint128 or uint256", () => {
    expect(variant(17, "(&self) -> (U80, I256, U256, U256, U80) {", "(&self) -> (u128, I256, U256, U256, u128) {").objectives).toEqual([
      "Return the latest round with the types of the interface",
    ]);
    expect(variant(17, "(&self) -> (U80, I256, U256, U256, U80) {", "(&self) -> (U256, I256, U256, U256, U256) {").objectives).toEqual([
      "Return the latest round with the types of the interface",
    ]);
  });

  it("refuses a method that keeps the name latestRound", () => {
    expect(variant(17, selector, "pub fn latest_round(&self) -> (U80, I256, U256, U256, U80) {").objectives).toEqual([
      "Answer callers that call the latest round data function",
    ]);
  });

  it("refuses an unsigned answer in storage", () => {
    expect(variant(17, "int256 answer;", "uint256 answer;").objectives).toContain("Store the latest answer as a signed number");
  });

  it("refuses a set_answer that keeps the round, the answer or the time", () => {
    expect(variant(17, nextRound, "").objectives).toEqual(["Start a new round with each answer"]);
    expect(variant(17, "self.answer.set(answer);", "").objectives).toEqual(["Store the new answer"]);
    expect(variant(17, time, "").objectives).toEqual(["Record when the answer was published"]);
  });
});
