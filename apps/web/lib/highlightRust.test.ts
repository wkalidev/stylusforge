import { describe, expect, it } from "vitest";

import { highlightRust, sliceTokens } from "./highlightRust";

describe("highlightRust", () => {
  it("keeps the source intact", () => {
    const code = '#[public]\nimpl Counter {\n    // add one\n    pub fn get(&self) -> U256 { self.count.get() }\n}\nlet s = "a // b";';
    expect(highlightRust(code).map((token) => token.text).join("")).toBe(code);
  });

  it("classifies the token kinds", () => {
    const kinds = Object.fromEntries(
      highlightRust('#[entrypoint] pub fn sol_storage! String "hi" // note 42 count').map((t) => [t.text, t.kind]),
    );
    expect(kinds).toMatchObject({
      "#[entrypoint]": "attribute",
      pub: "keyword",
      fn: "keyword",
      "sol_storage!": "macro",
      String: "type",
      '"hi"': "string",
      "// note 42 count": "comment",
    });
  });

  it("does not treat a comment marker inside a string as a comment", () => {
    const tokens = highlightRust('"http://x" y');
    expect(tokens[0]).toEqual({ kind: "string", text: '"http://x"' });
  });
});

describe("sliceTokens", () => {
  it("returns the first characters, cutting the last token", () => {
    const tokens = highlightRust("pub fn get");
    expect(sliceTokens(tokens, 5).map((t) => t.text).join("")).toBe("pub f");
    expect(sliceTokens(tokens, 0)).toEqual([]);
    expect(sliceTokens(tokens, 99).map((t) => t.text).join("")).toBe("pub fn get");
  });
});
