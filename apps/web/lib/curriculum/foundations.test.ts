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

describe("lesson 2: Storage and State", () => {
  const increment = "self.count.set(self.count.get() + U256::from(1));";

  it("accepts the current count or the new one kept in a local variable", () => {
    expect(variant(2, increment, "let current = self.count.get();\n        self.count.set(current + U256::from(1));").passed).toBe(true);
    expect(variant(2, increment, "let c = self.count.get();\n        self.count.set(c + U256::from(1u8));").passed).toBe(true);
    expect(variant(2, increment, "let next = self.count.get() + U256::from(1);\n        self.count.set(next);").passed).toBe(true);
    expect(
      variant(2, increment, "let mut count = self.count.get();\n        count += U256::from(1);\n        self.count.set(count);").passed,
    ).toBe(true);
  });

  it("accepts a local read split across lines, rustfmt style", () => {
    expect(
      variant(2, increment, "let current = self\n            .count\n            .get();\n        self.count.set(current + U256::from(1));").passed,
    ).toBe(true);
  });

  it("refuses a local that is read but not the one written back", () => {
    const result = variant(
      2,
      increment,
      "let current = self.count.get();\n        let other = U256::ZERO;\n        self.count.set(other + U256::from(1));",
    );
    expect(result.objectives).toEqual(["Increment the count by 1"]);
  });

  it("refuses a local that is never incremented or never written back", () => {
    expect(variant(2, increment, "let current = self.count.get();\n        self.count.set(current);").objectives).toEqual([
      "Increment the count by 1",
    ]);
    expect(variant(2, increment, "let mut count = self.count.get();\n        count += U256::from(1);").objectives).toEqual([
      "Increment the count by 1",
    ]);
  });
});

describe("lesson 6: Mappings", () => {
  it("accepts setter(key).set(value) and either order of the sum", () => {
    expect(variant(6, "self.scores.insert(player, total);", "self.scores.setter(player).set(total);").passed).toBe(true);
    expect(variant(6, "self.scores.get(player) + points", "points + self.scores.get(player)").passed).toBe(true);
  });

  const record = "let total = self.scores.get(player) + points;\n        self.scores.insert(player, total);";

  it("accepts the current score kept in a local variable first", () => {
    // The attempt reported by a student.
    expect(variant(6, record, "let current = self.scores.get(player);\n        self.scores.insert(player, current + points);").passed).toBe(true);
    expect(variant(6, record, "let current = self.scores.get(player);\n        self.scores.setter(player).set(points + current);").passed).toBe(true);
    expect(
      variant(6, record, "let current = self.scores.get(player);\n        let total = current + points;\n        self.scores.insert(player, total);").passed,
    ).toBe(true);
    expect(variant(6, record, "let mut score = self.scores.get(player);\n        score += points;\n        self.scores.insert(player, score);").passed).toBe(true);
  });

  it("refuses a local score that is not the one the points are added to", () => {
    expect(variant(6, record, "let current = self.scores.get(player);\n        self.scores.insert(player, points);").objectives).toEqual([
      "Add the points to the caller's current score",
    ]);
    const other = variant(6, record, "let current = self.scores.get(player);\n        let other = U256::ZERO;\n        self.scores.insert(player, other + points);");
    expect(other.objectives).toEqual(["Add the points to the caller's current score"]);
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

describe("lesson 8: Nested structs", () => {
  it("accepts the task fields in either order and a borrowed title", () => {
    expect(variant(8, "string title;\n        bool done;", "bool done;\n        string title;").passed).toBe(true);
    expect(variant(8, "task.title.set_str(title);", "task.title.set_str(&title);").passed).toBe(true);
  });

  it("refuses task fields declared in the contract instead of in Task", () => {
    const moved = SOLUTIONS[8]
      .replace("        string title;\n        bool done;\n", "")
      .replace("        Task[] tasks;", "        Task[] tasks;\n        string title;");
    const lesson = LESSONS.find((candidate) => candidate.id === 8)!;
    expect(validateCode(moved, lesson.available ? lesson.exercise.checks : []).objectives).toEqual([
      "Give every task a title and a done flag",
    ]);
  });

  it("refuses a vector of addresses or a mapping of tasks", () => {
    expect(variant(8, "Task[] tasks;", "address[] tasks;").passed).toBe(false);
    expect(variant(8, "Task[] tasks;", "mapping(uint256 => Task) tasks;").passed).toBe(false);
  });

  it("refuses a complete that does not set the flag", () => {
    const result = variant(8, "task.done.set(true);", "task.done.set(false);");
    expect(result.objectives).toEqual(["Mark the task as done, and revert when there is no such task"]);
  });

  it("keeps six checks, each failing when one of its parts is missing", () => {
    const lesson = LESSONS.find((candidate) => candidate.id === 8)!;
    expect(lesson.available && lesson.exercise.checks).toHaveLength(6);
    expect(variant(8, "        task.title.set_str(title);\n", "").objectives).toEqual(["Add a task with the given title at the end of the list"]);
    expect(variant(8, "self.tasks.getter(id).ok_or(TodoError::UnknownTask(UnknownTask { id }))?", "self.tasks.getter(id).unwrap()").objectives).toEqual([
      "Look a task up by its id, and revert when there is no such task",
    ]);
    expect(variant(8, "task.done.get()", "false").objectives).toEqual(["Return the title of the task and whether it is done"]);
  });

  it("binds each revert to its own lookup, so one function's error does not count for the other", () => {
    // complete unwraps the setter: task's revert must not satisfy complete's check.
    expect(variant(8, "self.tasks.setter(id).ok_or(TodoError::UnknownTask(UnknownTask { id }))?", "self.tasks.setter(id).unwrap()").objectives).toEqual([
      "Mark the task as done, and revert when there is no such task",
    ]);
  });

  const taskLookup = "let task = self.tasks.getter(id).ok_or(TodoError::UnknownTask(UnknownTask { id }))?;";
  const completeLookup = "let mut task = self.tasks.setter(id).ok_or(TodoError::UnknownTask(UnknownTask { id }))?;";
  const taskBody = `${taskLookup}\n        Ok((task.title.get_string(), task.done.get()))`;
  const completeBody = `${completeLookup}\n        task.done.set(true);\n        Ok(())`;

  it("accepts get(id) and get_mut(id) as well as getter(id) and setter(id)", () => {
    expect(variant(8, "self.tasks.getter(id)", "self.tasks.get(id)").passed).toBe(true);
    expect(variant(8, "self.tasks.setter(id)", "self.tasks.get_mut(id)").passed).toBe(true);
  });

  it("accepts lookup chains split across lines, rustfmt style", () => {
    expect(
      variant(8, taskLookup, "let task = self\n            .tasks\n            .get(id)\n            .ok_or(TodoError::UnknownTask(UnknownTask { id }))?;").passed,
    ).toBe(true);
    expect(
      variant(8, completeLookup, "let mut task = self\n            .tasks\n            .setter(id)\n            .ok_or(TodoError::UnknownTask(UnknownTask { id }))?;").passed,
    ).toBe(true);
  });

  it("accepts a match on the lookup that reverts with UnknownTask", () => {
    expect(
      variant(8, taskLookup, "let task = match self.tasks.getter(id) {\n            Some(task) => task,\n            None => return Err(TodoError::UnknownTask(UnknownTask { id })),\n        };").passed,
    ).toBe(true);
    expect(
      variant(8, taskLookup, "let task = match self.tasks.get(id) {\n            Some(found) => Ok(found),\n            None => Err(TodoError::UnknownTask(UnknownTask { id })),\n        }?;").passed,
    ).toBe(true);
    expect(
      variant(8, taskLookup, "let task = match self.tasks.getter(id) {\n            None => Err(TodoError::UnknownTask(UnknownTask { id })),\n            Some(task) => Ok(task),\n        }?;").passed,
    ).toBe(true);
    expect(
      variant(8, completeLookup, "let mut task = match self.tasks.setter(id) {\n            None => return Err(TodoError::UnknownTask(UnknownTask { id })),\n            Some(task) => task,\n        };").passed,
    ).toBe(true);
  });

  it("accepts the other match shapes that compile", () => {
    expect(
      variant(8, taskLookup, "let task = match self.tasks.get(id) {\n            None => return Err(TodoError::UnknownTask(UnknownTask { id })),\n            Some(task) => task,\n        };").passed,
    ).toBe(true);
    expect(
      variant(8, completeLookup, "let mut task = match self.tasks.get_mut(id) {\n            Some(task) => Ok(task),\n            None => Err(TodoError::UnknownTask(UnknownTask { id })),\n        }?;").passed,
    ).toBe(true);
    expect(
      variant(8, completeLookup, "let mut task = match self.tasks.setter(id) {\n            None => Err(TodoError::UnknownTask(UnknownTask { id })),\n            Some(task) => Ok(task),\n        }?;").passed,
    ).toBe(true);
    expect(
      variant(8, completeBody, "match self.tasks.setter(id) {\n            Some(mut task) => {\n                task.done.set(true);\n                Ok(())\n            },\n            None => Err(TodoError::UnknownTask(UnknownTask { id })),\n        }").passed,
    ).toBe(true);
  });

  it("accepts a match on the lookup as the whole body", () => {
    expect(
      variant(8, taskBody, "match self.tasks.getter(id) {\n            Some(task) => Ok((task.title.get_string(), task.done.get())),\n            None => Err(TodoError::UnknownTask(UnknownTask { id })),\n        }").passed,
    ).toBe(true);
    expect(
      variant(8, completeBody, "match self.tasks.get_mut(id) {\n            Some(mut task) => {\n                task.done.set(true);\n                Ok(())\n            }\n            None => Err(TodoError::UnknownTask(UnknownTask { id })),\n        }").passed,
    ).toBe(true);
  });

  it("refuses a match whose None arm does not revert", () => {
    const result = variant(8, taskLookup, "let task = match self.tasks.getter(id) {\n            Some(task) => task,\n            None => return Ok((String::new(), false)),\n        };");
    expect(result.objectives).toEqual(["Look a task up by its id, and revert when there is no such task"]);
    const complete = variant(8, completeLookup, "let mut task = match self.tasks.setter(id) {\n            Some(task) => task,\n            None => return Ok(()),\n        };");
    expect(complete.objectives).toEqual(["Mark the task as done, and revert when there is no such task"]);
  });

  it("refuses the read-only get(id) in complete", () => {
    const result = variant(8, "self.tasks.setter(id)", "self.tasks.get(id)");
    expect(result.objectives).toEqual(["Mark the task as done, and revert when there is no such task"]);
  });

  it("accepts ok_or_else for the reverts", () => {
    const lazy = SOLUTIONS[8].replaceAll(".ok_or(TodoError::UnknownTask(", ".ok_or_else(|| TodoError::UnknownTask(");
    const lesson = LESSONS.find((candidate) => candidate.id === 8)!;
    expect(validateCode(lazy, lesson.available ? lesson.exercise.checks : []).passed).toBe(true);
  });
});
