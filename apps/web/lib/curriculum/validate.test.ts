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
    { anyOf: ["uint256 count;"], hint: "declare count", anchor: "pub struct Counter {" },
    { anyOf: ["self.count.get()"], hint: "read count", anchor: "pub fn get(&self)" },
    { anyOf: ["U256::ZERO"], hint: "no anchor" },
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
    { anyOf: ["uint256 count;"], hint: "declare count" },
    { anyOf: ["self.count.set(U256::ZERO)", "self.count.set(U256::from(0))"], hint: "reset" },
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
});
