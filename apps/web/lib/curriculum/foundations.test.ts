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
