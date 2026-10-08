import { describe, expect, it } from "vitest";

import { evaluateChecks, snippetPattern, stripComments, stripCommentsAndStrings, validateCode } from "./validate";

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

describe("stripComments", () => {
  it("blanks comments in place and keeps every string literal as written", () => {
    const code = 'a /* "x" */ let s = r#"say "hi" // no"#; // "y"\nlet t = "\\" // z";';
    const out = stripComments(code);
    expect(out).toHaveLength(code.length);
    expect(out).toBe(`a ${" ".repeat(9)} let s = r#"say "hi" // no"#; ${" ".repeat(6)}\nlet t = "\\" // z";`);
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

describe("validateCode with forbidden snippets", () => {
  // A planted bug (an unguarded init) and its fix (a constructor), as lesson 20 uses them.
  const checks = [
    {
      anyOf: ["#[constructor] pub fn constructor(&mut self, owner: Address)"],
      noneOf: ["pub fn init("],
      objective: "set the owner once, at deployment",
      hints: [],
    },
  ];
  const fix = "#[constructor]\n    pub fn constructor(&mut self, owner: Address) { self.owner.set(owner); }";
  const bug = "pub fn init(&mut self, owner: Address) { self.owner.set(owner); }";

  it("fails while the code contains a forbidden snippet, even next to the fix", () => {
    expect(validateCode(fix, checks)).toEqual({ passed: true, objectives: [] });
    expect(validateCode(bug, checks)).toEqual({ passed: false, objectives: ["set the owner once, at deployment"] });
    expect(validateCode(`${fix}\n    ${bug}`, checks).passed).toBe(false);
  });

  it("ignores a forbidden snippet left in a comment or a string", () => {
    expect(validateCode(`${fix}\n    // ${bug}`, checks).passed).toBe(true);
    expect(validateCode(`${fix}\n    /* ${bug} */`, checks).passed).toBe(true);
    expect(validateCode(`${fix}\n    const OLD: &str = "pub fn init(";`, checks).passed).toBe(true);
  });

  it("matches forbidden snippets like expected ones: whitespace, identifiers and placeholders", () => {
    const subtraction = [{ anyOf: ["checked_sub(amount)"], noneOf: ["let $x = available - amount;"], objective: "subtract safely", hints: [] }];
    const fixed = "let remaining = available.checked_sub(amount).ok_or(error)?;";
    expect(validateCode(fixed, subtraction).passed).toBe(true);
    expect(validateCode(`${fixed}\nlet left = available\n    - amount;`, subtraction).passed).toBe(false);
    // A placeholder never matches a keyword, and a snippet never starts inside an identifier.
    expect(validateCode(`${fixed}\nlet mut = available - amount;`, subtraction).passed).toBe(true);
    expect(validateCode(`${fixed}\nlet left = unavailable - amount;`, subtraction).passed).toBe(true);
  });

  it("reports the anchor line whether the check fails for a missing or a forbidden snippet", () => {
    const anchored = [{ ...checks[0], anchor: "owner: Address" }];
    expect(evaluateChecks(`${fix}\n    ${bug}`, anchored)[0]).toMatchObject({ passed: false, line: 2 });
    expect(evaluateChecks(bug, anchored)[0]).toMatchObject({ passed: false, line: 1 });
  });
});

describe("validateCode with string literals", () => {
  // Lesson 17: the method answers latestRoundData() under its own name or with a selector attribute.
  const checks = [
    {
      literals: [['#[selector(name = "latestRoundData")] pub fn $n(', "pub fn latest_round_data(&self)"]],
      objective: "answer latestRoundData",
      hints: [],
    },
  ];
  const attribute = '#[selector(name = "latestRoundData")]';
  const method = "pub fn latest_round(&self) -> U256 {";
  const passes = (code: string) => validateCode(code, checks).passed;

  it("passes with the right name, or with the method renamed", () => {
    expect(passes(`${attribute}\n    ${method}`)).toBe(true);
    expect(passes("pub fn latest_round_data(&self) -> U256 {")).toBe(true);
  });

  it("fails with a wrong name, a name with extra spaces, or no attribute", () => {
    expect(passes(`#[selector(name = "latestRound")]\n    ${method}`)).toBe(false);
    expect(passes(`#[selector(name = "latestRoundDatas")]\n    ${method}`)).toBe(false);
    expect(passes(`#[selector(name = " latestRoundData")]\n    ${method}`)).toBe(false);
    expect(passes(`#[selector(name = "")]\n    ${method}`)).toBe(false);
    expect(passes(method)).toBe(false);
  });

  it("fails with the attribute in a line or block comment", () => {
    expect(passes(`// ${attribute}\n    ${method}`)).toBe(false);
    expect(passes(`/* ${attribute} */\n    ${method}`)).toBe(false);
    expect(passes(`/* ${attribute}\n    ${method} */`)).toBe(false);
  });

  it("fails with the attribute inside a normal or raw string", () => {
    const inside = `${attribute} pub fn latest_round(`;
    expect(passes(`const S: &str = "${inside.replace(/"/g, '\\"')}";\n    ${method}`)).toBe(false);
    expect(passes(`const S: &str = r#"${inside}"#;\n    ${method}`)).toBe(false);
    // The name written as a raw string covers more than the expected literal: it does not line up.
    expect(passes(`#[selector(name = r"latestRoundData")]\n    ${method}`)).toBe(false);
  });

  it("fails when the code around the literal is in a string and only the name is code", () => {
    // `"#[selector(name = "` and `")] pub fn latest_round("` are strings, `latestRoundData` is not.
    expect(passes('let a = "#[selector(name = "latestRoundData")] pub fn latest_round(";')).toBe(false);
  });

  it("passes with rustfmt layouts around the attribute", () => {
    expect(passes(`#[selector(\n        name = "latestRoundData"\n    )]\n    ${method}`)).toBe(true);
    expect(passes(`#[selector(name = "latestRoundData")]\n\n    /// The latest round.\n    ${method}`)).toBe(true);
    expect(passes(`#[selector(name = "latestRoundData")] pub fn latest_round(&self) -> U256 {`)).toBe(true);
  });

  it("finds the attribute after a match that is refused for lying in a string", () => {
    const code = `const S: &str = r#"${attribute} pub fn latest_round("#;\n${attribute}\n    ${method}`;
    expect(passes(code)).toBe(true);
  });

  it("combines with anyOf: both must match", () => {
    const both = [{ ...checks[0], anyOf: ["-> U256 {"] }];
    expect(validateCode(`${attribute}\n    ${method}`, both).passed).toBe(true);
    expect(validateCode(`${attribute}\n    pub fn latest_round(&self) -> u8 {`, both).passed).toBe(false);
  });

  it("leaves checks without literals blind to string contents", () => {
    const loose = [{ anyOf: ['#[selector(name = "")] pub fn $n('], objective: "any selector", hints: [] }];
    expect(validateCode(`#[selector(name = "latestRound")]\n    ${method}`, loose).passed).toBe(true);
  });

  it("refuses a check with neither anyOf nor literals", () => {
    expect(() => validateCode("fn main() {}", [{ objective: "nothing", hints: [] }])).toThrow(/anyOf or literals/);
  });
});

describe("validateCode with placeholders bound across groups", () => {
  // Lesson 10: the guard compares the caller, read into a local of any name, with the owner.
  const compare = [
    {
      given: [["let $c = self.vm().msg_sender();"]],
      anyOf: ["if $c != self.owner.get() {", "if self.owner.get() != $c {"],
      objective: "compare the caller with the owner",
      hints: [],
    },
  ];
  const guard = (name: string, compared = name) => `let ${name} = self.vm().msg_sender();\n        if ${compared} != self.owner.get() {`;

  it("accepts the local under any name, used consistently", () => {
    expect(validateCode(guard("caller"), compare).passed).toBe(true);
    expect(validateCode(guard("sender"), compare).passed).toBe(true);
    expect(validateCode("let who = self.vm().msg_sender();\nlet x = 1;\nif self.owner.get() != who {", compare).passed).toBe(true);
  });

  it("refuses a comparison with another local, or a missing given snippet", () => {
    expect(validateCode(guard("sender", "caller"), compare).passed).toBe(false);
    expect(validateCode(guard("sender", "sender2"), compare).passed).toBe(false);
    expect(validateCode("let origin = self.vm().tx_origin();\n        if origin != self.owner.get() {", compare).passed).toBe(false);
    expect(validateCode("if caller != self.owner.get() {", compare).passed).toBe(false);
  });

  it("tries every binding: the right local may be read after another one", () => {
    const code = "let first = self.vm().msg_sender();\nlet second = self.vm().msg_sender();\nif second != self.owner.get() {";
    expect(validateCode(code, compare).passed).toBe(true);
  });

  it("binds across anyOf and alsoAnyOf too", () => {
    const once = [
      {
        anyOf: ["let $r = self.rate_bps.get();"],
        alsoAnyOf: [["Self::fee(first, $r)?"], ["Self::fee(second, $r)?"]],
        objective: "read the rate once",
        hints: [],
      },
    ];
    expect(validateCode("let r = self.rate_bps.get();\nOk((Self::fee(first, r)?, Self::fee(second, r)?))", once).passed).toBe(true);
    expect(validateCode("let r = self.rate_bps.get();\nOk((Self::fee(first, r)?, Self::fee(second, rate)?))", once).passed).toBe(false);
  });

  it("keeps placeholders of different names independent across groups", () => {
    const two = [{ anyOf: ["let $a = 1;"], alsoAnyOf: [["let $b = 2;"]], objective: "two locals", hints: [] }];
    expect(validateCode("let a = 1; let b = 2;", two).passed).toBe(true);
    expect(validateCode("let a = 1; let a = 2;", two).passed).toBe(true);
  });

  it("binds each forbidden snippet on its own", () => {
    const check = [{ given: [["let $x = a();"]], anyOf: ["f($x)"], noneOf: ["g($x)"], objective: "no g", hints: [] }];
    expect(validateCode("let x = a(); f(x);", check).passed).toBe(true);
    expect(validateCode("let x = a(); f(x); g(other);", check).passed).toBe(false);
  });
});
