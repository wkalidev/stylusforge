import { describe, expect, it } from "vitest";

import { LESSONS } from "./lessons";
import { GLOSSARY, glossaryAt } from "./glossary";

const idAt = (line: string, column: number) => glossaryAt(line, column)?.entry.id ?? null;

describe("glossaryAt", () => {
  it("finds the token under the cursor, with its range", () => {
    expect(glossaryAt("sol_storage! {", 3)).toMatchObject({ entry: { id: "sol_storage" }, startColumn: 1, endColumn: 13 });
    expect(idAt("    #[entrypoint]", 8)).toBe("entrypoint");
    expect(idAt("#[public]", 1)).toBe("public");
  });

  it("tells sol! apart from sol_storage!", () => {
    expect(idAt("sol! {", 2)).toBe("sol");
    expect(idAt("sol_storage! {", 2)).toBe("sol_storage");
  });

  it("matches log only as vm().log", () => {
    const line = "        self.vm().log(Transfer { from, to, value });";
    expect(idAt(line, line.indexOf("log") + 1)).toBe("log");
    expect(idAt(line, line.indexOf("vm") + 1)).toBe("vm");
    expect(idAt("let log = 1;", 5)).toBeNull();
  });

  it("matches insert and delete only as method calls", () => {
    const write = "        self.scores.insert(player, total);";
    expect(idAt(write, write.indexOf("insert") + 1)).toBe("insert");
    const clear = "        self.scores.delete(player);";
    expect(idAt(clear, clear.indexOf("delete") + 1)).toBe("delete");
    expect(idAt("insert(player, total);", 1)).toBeNull();
    expect(idAt("let delete = 1;", 5)).toBeNull();
  });

  it("explains a vector declaration as a whole, and the vector methods", () => {
    expect(glossaryAt("        uint256[] prices;", 10)).toMatchObject({ entry: { id: "vector" }, startColumn: 9, endColumn: 18 });
    expect(idAt("        uint256 count;", 10)).toBe("uint256");
    const push = "        self.prices.push(price);";
    expect(idAt(push, push.indexOf("push") + 1)).toBe("push");
    const pop = "        self.prices.pop();";
    expect(idAt(pop, pop.indexOf("pop") + 1)).toBe("pop");
    const len = "        U256::from(self.prices.len())";
    expect(idAt(len, len.indexOf("len") + 1)).toBe("len");
    expect(idAt("let pop = 1;", 5)).toBeNull();
  });

  it("explains grow and getter on structs", () => {
    const grow = "        let mut task = self.tasks.grow();";
    expect(idAt(grow, grow.indexOf("grow") + 1)).toBe("grow");
    const read = "        let task = self.tasks.getter(id).ok_or(TodoError::UnknownTask(UnknownTask { id }))?;";
    expect(idAt(read, read.indexOf("getter") + 1)).toBe("getter");
    expect(idAt("        Task[] tasks;", 10)).toBe("vector");
    expect(idAt("let grow = 1;", 5)).toBeNull();
  });

  it("does not match inside longer identifiers", () => {
    expect(idAt("let my_U256x = 1;", 8)).toBeNull();
    expect(idAt("uint2567", 2)).toBeNull();
  });

  it("returns null between tokens", () => {
    expect(idAt("pub fn get(&self) -> U256 {", 2)).toBeNull();
  });

  it("uses only patterns safe to reuse", () => {
    for (const entry of GLOSSARY) {
      expect(entry.pattern.global || entry.pattern.sticky, entry.id).toBe(false);
    }
  });

  it("explains the key tokens of every lesson's starter code", () => {
    const starters = LESSONS.flatMap((lesson) => (lesson.available ? [lesson.exercise.starterCode] : [])).join("\n");
    for (const id of ["sol_storage", "entrypoint", "public", "cfg_attr", "alloc", "prelude", "u256", "sol", "solidity_error"]) {
      const entry = GLOSSARY.find((candidate) => candidate.id === id)!;
      expect(entry.pattern.test(starters), id).toBe(true);
    }
  });
});
