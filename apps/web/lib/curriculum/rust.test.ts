import { describe, expect, it } from "vitest";

import { containsSnippet, harnessPath, rustBlocks, rustCrateOf } from "./rust";

describe("rustCrateOf", () => {
  it("checks lesson 15 with openzeppelin-stylus and every other lesson with stylus-sdk 0.10", () => {
    expect(rustCrateOf(15)).toBe("openzeppelin");
    expect(rustCrateOf(1)).toBe("stylus");
    expect(rustCrateOf(14)).toBe("stylus");
    expect(harnessPath(7)).toBe("curriculum/rust/snippets/lesson-7.rs");
  });
});

describe("rustBlocks", () => {
  it("returns the code of ```rust blocks only", () => {
    const markdown = ["Intro", "", "```rust", "let a = 1;", "```", "", "```toml", "[dependencies]", "```", "", "```rust", "fn f() {}", "", "```"].join("\n");
    expect(rustBlocks(markdown)).toEqual(["let a = 1;\n", "fn f() {}\n\n"]);
    expect(rustBlocks("no code")).toEqual([]);
  });
});

describe("containsSnippet", () => {
  const harness = ["impl Door {", "    pub fn open(&mut self) {", "        let opener = self.vm().msg_sender();", "        self.last.set(opener);", "    }", "}"].join("\n");

  it("matches the lines of a snippet in order, whatever the indentation, with lines in between", () => {
    expect(containsSnippet(harness, "let opener = self.vm().msg_sender();\nself.last.set(opener);")).toBe(true);
    expect(containsSnippet(harness, "impl Door {\n    // nothing here\n}")).toBe(false);
    expect(containsSnippet(harness, "impl Door {\n\n}")).toBe(true);
  });

  it("refuses lines out of order, or a line that differs", () => {
    expect(containsSnippet(harness, "self.last.set(opener);\nlet opener = self.vm().msg_sender();")).toBe(false);
    expect(containsSnippet(harness, "self.last.set(opener)")).toBe(false);
  });

  it("needs a distinct harness line for each snippet line", () => {
    expect(containsSnippet("let a = 1;", "let a = 1;\nlet a = 1;")).toBe(false);
    expect(containsSnippet("let a = 1;\nlet a = 1;", "let a = 1;\nlet a = 1;")).toBe(true);
  });
});
