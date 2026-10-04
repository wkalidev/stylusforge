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

describe("lesson 6: Mappings", () => {
  it("accepts setter(key).set(value) and either order of the sum", () => {
    expect(variant(6, "self.scores.insert(player, total);", "self.scores.setter(player).set(total);").passed).toBe(true);
    expect(variant(6, "self.scores.get(player) + points", "points + self.scores.get(player)").passed).toBe(true);
  });

  it("refuses a mapping with another name or value type", () => {
    expect(variant(6, "mapping(address => uint256) scores;", "mapping(address => uint256) score;").passed).toBe(false);
    expect(variant(6, "mapping(address => uint256) scores;", "mapping(address => bool) scores;").passed).toBe(false);
  });

  it("refuses a record that does not start from the caller's score", () => {
    const result = variant(6, "self.scores.get(player) + points", "points");
    expect(result.objectives).toEqual(["Add the points to the caller's current score"]);
  });

  it("refuses a clear that leaves the score in place", () => {
    const result = variant(6, "self.scores.delete(player);", "");
    expect(result.objectives).toEqual(["Remove the caller's entry from the scoreboard"]);
  });
});

describe("lesson 7: Storage vectors", () => {
  it("accepts an explicit return in length and erase_last in remove_last", () => {
    expect(variant(7, "U256::from(self.prices.len())\n", "return U256::from(self.prices.len());\n").passed).toBe(true);
    expect(variant(7, "self.prices.pop();", "self.prices.erase_last();").passed).toBe(true);
  });

  it("refuses a fixed-size array or a vector of another type", () => {
    expect(variant(7, "uint256[] prices;", "uint256[10] prices;").passed).toBe(false);
    expect(variant(7, "uint256[] prices;", "address[] prices;").passed).toBe(false);
  });

  it("does not count the length used in the error as the length method", () => {
    const solution = SOLUTIONS[7]
      .replace("U256::from(self.prices.len())\n", "U256::ZERO\n")
      .replace("length: self.length(),", "length: U256::from(self.prices.len()),");
    const lesson = LESSONS.find((candidate) => candidate.id === 7)!;
    expect(validateCode(solution, lesson.available ? lesson.exercise.checks : []).objectives).toEqual([
      "Return how many prices are stored",
    ]);
  });

  it("refuses a price_at that returns zero past the end", () => {
    const result = variant(
      7,
      "self.prices.get(index).ok_or(PriceLogError::IndexOutOfBounds(IndexOutOfBounds {\n            index,\n            length: self.length(),\n        }))",
      "Ok(self.prices.get(index).unwrap_or(U256::ZERO))",
    );
    expect(result.objectives).toEqual(["Revert when the index is past the end of the list"]);
  });
});
