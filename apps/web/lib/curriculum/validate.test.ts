import { describe, expect, it } from "vitest";

import { snippetPattern, stripCommentsAndStrings, validateCode } from "./validate";

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
  it("removes line comments", () => {
    expect(stripCommentsAndStrings("a // uint256 count;\nb")).toBe("a  \nb");
  });

  it("removes nested block comments", () => {
    expect(stripCommentsAndStrings("a /* x /* y */ z */ b")).toBe("a   b");
  });

  it("empties string literals, including escaped quotes", () => {
    expect(stripCommentsAndStrings('let s = "uint256 \\" count;";')).toBe('let s = "";');
  });

  it("empties raw strings", () => {
    expect(stripCommentsAndStrings('let s = r#"say "hi" // no"#; x')).toBe('let s = ""; x');
  });

  it("keeps comment markers inside strings out of the comment logic", () => {
    expect(stripCommentsAndStrings('let url = "http://x"; y')).toBe('let url = ""; y');
  });
});

describe("validateCode", () => {
  const checks = [
    { anyOf: ["uint256 count;"], hint: "declare count" },
    { anyOf: ["self.count.set(U256::ZERO)", "self.count.set(U256::from(0))"], hint: "reset" },
  ];

  it("passes when every check matches one of its snippets", () => {
    const result = validateCode("uint256 count; self.count.set(U256::from(0))", checks);
    expect(result).toEqual({ passed: true, hints: [] });
  });

  it("returns the hints of the failed checks in order", () => {
    expect(validateCode("", checks)).toEqual({ passed: false, hints: ["declare count", "reset"] });
  });

  it("ignores snippets written in comments or strings", () => {
    const code = '// uint256 count;\n/* self.count.set(U256::ZERO) */ let s = "uint256 count;";';
    expect(validateCode(code, checks).passed).toBe(false);
  });
});
