import { describe, expect, it } from "vitest";

import { evaluateChecks, snippetPattern, stripCommentsAndStrings, validateCode } from "./validate";

describe("snippetPattern", () => {
  it("ignores whitespace around punctuation", () => {
    const pattern = snippetPattern("self.count.set(U256::ZERO)");
    expect(pattern.test("self . count . set ( U256 :: ZERO )")).toBe(true);
    expect(pattern.test("self.count\n    .set(U256::ZERO)")).toBe(true);
  });

  it("requires whitespace between identifiers", () => {
    const pattern = snippetPattern("uint256 count;");
    expect(pattern.test("uint256    count ;")).toBe(true);
    expect(pattern.test("uint256count;")).toBe(false);
  });

  it("does not match inside a longer identifier", () => {
    const pattern = snippetPattern("uint256 count;");
    expect(pattern.test("uint256 counter;")).toBe(false);
    expect(pattern.test("myuint256 count;")).toBe(false);
  });

  it("treats regex characters literally", () => {
    expect(snippetPattern("a.b()").test("axb()")).toBe(false);
  });

  it("rejects an empty snippet", () => {
    expect(() => snippetPattern("   ")).toThrow();
  });

  it("accepts a method chain split across lines, rustfmt style", () => {
    const pattern = snippetPattern("self.tasks.getter(id).ok_or(TodoError::UnknownTask(UnknownTask {");
    expect(pattern.test("self\n            .tasks\n            .getter(id)\n            .ok_or(TodoError::UnknownTask(UnknownTask {")).toBe(true);
    expect(pattern.test("self.tasks.getter(id).ok_or(TodoError\n    ::UnknownTask(UnknownTask {")).toBe(true);
  });
});

describe("snippetPattern placeholders", () => {
  const increment = snippetPattern("let $x = self.count.get(); self.count.set($x + U256::from(1))");

  it("matches a local variable of any name", () => {
    expect(increment.test("let current = self.count.get(); self.count.set(current + U256::from(1))")).toBe(true);
    expect(increment.test("let c = self.count.get();\n        self.count.set(c + U256::from(1));")).toBe(true);
    expect(increment.test("let _old = self.count.get(); self.count.set(_old + U256::from(1))")).toBe(true);
  });

  it("binds every occurrence in a snippet to the same identifier", () => {
    expect(increment.test("let current = self.count.get(); self.count.set(other + U256::from(1))")).toBe(false);
    expect(increment.test("let current = self.count.get(); self.count.set(current2 + U256::from(1))")).toBe(false);
    expect(increment.test("let current = self.count.get(); self.count.set(my_current + U256::from(1))")).toBe(false);
  });

  it("never matches a keyword", () => {
    for (const keyword of ["let", "mut", "self", "Self", "fn", "return", "match", "ref", "_"]) {
      expect(snippetPattern("$x.done.set(true)").test(`${keyword}.done.set(true)`), keyword).toBe(false);
    }
    expect(snippetPattern("$x.done.set(true)").test("task.done.set(true)")).toBe(true);
  });

  it("supports let mut, and never takes mut for the name", () => {
    const local = snippetPattern("let $x = self.count.get();");
    const mutable = snippetPattern("let mut $x = self.count.get(); $x += U256::from(1);");
    expect(local.test("let mut current = self.count.get();")).toBe(false);
    expect(mutable.test("let mut current = self.count.get();\n current += U256::from(1);")).toBe(true);
    expect(mutable.test("let mut current = self.count.get(); other += U256::from(1);")).toBe(false);
  });

  it("does not match inside a longer identifier", () => {
    const pattern = snippetPattern("$x + points");
    expect(pattern.test("current + points")).toBe(true);
    expect(pattern.test("current + pointsx")).toBe(false);
    expect(snippetPattern("self.scores.insert(player, $x)").test("self.scores.insert(player, total.max(1))")).toBe(false);
  });

  it("binds placeholders with different names independently", () => {
    const pattern = snippetPattern("let $x = a(); let $y = b(); f($x, $y)");
    expect(pattern.test("let left = a(); let right = b(); f(left, right)")).toBe(true);
    expect(pattern.test("let left = a(); let right = b(); f(right, left)")).toBe(false);
  });

  it("follows the same whitespace rules, newlines around . and :: included", () => {
    expect(increment.test("let current = self\n    .count\n    .get();\nself.count.set(current + U256\n    ::from(1))")).toBe(true);
    expect(increment.test("letcurrent = self.count.get(); self.count.set(current + U256::from(1))")).toBe(false);
  });

  it("only matches consecutive statements (documented limit)", () => {
    const apart = "let current = self.count.get();\nlet unrelated = U256::ZERO;\nself.count.set(current + U256::from(1))";
    expect(increment.test(apart)).toBe(false);
  });
});

describe("stripCommentsAndStrings", () => {
  const strip = (code: string) => {
    const out = stripCommentsAndStrings(code);
    expect(out).toHaveLength(code.length);
    return out;
  };

  it("blanks line comments and keeps the newline", () => {
    expect(strip("a // uint256 count;\nb")).toBe(`a ${" ".repeat(17)}\nb`);
  });

  it("blanks nested block comments, keeping their line breaks", () => {
    expect(strip("a /* x /* y */\n z */ b")).toBe(`a ${" ".repeat(12)}\n${" ".repeat(5)} b`);
  });

  it("empties string literals in place, including escaped quotes", () => {
    expect(strip('let s = "uint256 \\" count;";')).toBe(`let s = "${" ".repeat(17)}";`);
  });

  it("empties raw strings in place", () => {
    expect(strip('let s = r#"say "hi" // no"#; x')).toBe(`let s = "${" ".repeat(17)}"; x`);
  });

  it("keeps comment markers inside strings out of the comment logic", () => {
    expect(strip('let url = "http://x"; y')).toBe(`let url = "${" ".repeat(8)}"; y`);
  });

  it("keeps every line where it was", () => {
    const code = 'a /* one\ntwo */ b\n// three\n"four\nfive" c';
    expect(strip(code).split("\n")).toHaveLength(code.split("\n").length);
  });
});

describe("evaluateChecks", () => {
  const checks = [
    { anyOf: ["uint256 count;"], objective: "declare count", hints: [], anchor: "pub struct Counter {" },
    { anyOf: ["self.count.get()"], objective: "read count", hints: [], anchor: "pub fn get(&self)" },
    { anyOf: ["U256::ZERO"], objective: "no anchor", hints: [] },
  ];
  const code = [
    "// pub fn get(&self) in a comment does not count",
    "sol_storage! {",
    "    pub struct Counter {",
    "        uint256 count;",
    "    }",
    "}",
    "pub fn get(&self) -> U256 {",
    "    U256::from(0)",
    "}",
  ].join("\n");

  it("reports each check with the line of its anchor", () => {
    expect(evaluateChecks(code, checks).map(({ passed, line }) => ({ passed, line }))).toEqual([
      { passed: true, line: 3 },
      { passed: false, line: 7 },
      { passed: false, line: null },
    ]);
  });

  it("returns a null line when the anchor is missing", () => {
    expect(evaluateChecks("fn main() {}", checks)[0].line).toBeNull();
  });
});

describe("validateCode", () => {
  const checks = [
    { anyOf: ["uint256 count;"], objective: "declare count", hints: [] },
    { anyOf: ["self.count.set(U256::ZERO)", "self.count.set(U256::from(0))"], objective: "reset", hints: [] },
  ];

  it("passes when every check matches one of its snippets", () => {
    const result = validateCode("uint256 count; self.count.set(U256::from(0))", checks);
    expect(result).toEqual({ passed: true, objectives: [] });
  });

  it("returns the objectives of the failed checks in order", () => {
    expect(validateCode("", checks)).toEqual({ passed: false, objectives: ["declare count", "reset"] });
  });

  it("ignores snippets written in comments or strings", () => {
    const code = '// uint256 count;\n/* self.count.set(U256::ZERO) */ let s = "uint256 count;";';
    expect(validateCode(code, checks).passed).toBe(false);
  });

  it("requires one snippet of every further group of a check", () => {
    const merged = [
      {
        anyOf: ["self.tasks.grow()"],
        alsoAnyOf: [[".title.set_str(title)", ".title.set_str(&title)"]],
        objective: "add a task",
        hints: [],
      },
    ];
    expect(validateCode("let mut task = self.tasks.grow(); task.title.set_str(&title);", merged).passed).toBe(true);
    expect(validateCode("let mut task = self.tasks.grow();", merged)).toEqual({ passed: false, objectives: ["add a task"] });
    expect(validateCode("task.title.set_str(title);", merged).passed).toBe(false);
  });
});
