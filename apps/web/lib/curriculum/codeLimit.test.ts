import { describe, expect, it } from "vitest";

import { MAX_CODE_LENGTH as SERVER_MAX_CODE_LENGTH } from "@/lib/server/codeSubmission";
import { codeLengthLabel, codeLengthLevel, codeTooLongMessage, isCodeTooLong, MAX_CODE_LENGTH } from "./codeLimit";

describe("code length limit", () => {
  it("is the limit the claim and solution routes enforce", () => {
    expect(MAX_CODE_LENGTH).toBe(SERVER_MAX_CODE_LENGTH);
  });

  it("accepts code of exactly the limit and refuses one character more", () => {
    expect(isCodeTooLong("x".repeat(MAX_CODE_LENGTH))).toBe(false);
    expect(isCodeTooLong("x".repeat(MAX_CODE_LENGTH + 1))).toBe(true);
  });

  it("counts UTF-16 units, as the server does", () => {
    // "🦀" is two UTF-16 units: half the limit's worth of crabs is exactly the limit.
    expect(isCodeTooLong("🦀".repeat(MAX_CODE_LENGTH / 2))).toBe(false);
    expect(isCodeTooLong(`${"🦀".repeat(MAX_CODE_LENGTH / 2)}x`)).toBe(true);
  });

  it("is near the limit from 90%, and over it past the limit", () => {
    expect(codeLengthLevel(0)).toBe("ok");
    expect(codeLengthLevel(0.9 * MAX_CODE_LENGTH - 1)).toBe("ok");
    expect(codeLengthLevel(0.9 * MAX_CODE_LENGTH)).toBe("near");
    expect(codeLengthLevel(MAX_CODE_LENGTH)).toBe("near");
    expect(codeLengthLevel(MAX_CODE_LENGTH + 1)).toBe("over");
  });

  it("labels the counter with grouped digits", () => {
    expect(codeLengthLabel(1234)).toBe("1,234 / 10,000");
    expect(codeLengthLabel(0)).toBe("0 / 10,000");
  });

  it("says how many characters to remove", () => {
    const message = codeTooLongMessage(12_345);
    expect(message).toContain("12,345 characters");
    expect(message).toContain("10,000-character limit");
    expect(message).toContain("Remove 2,345 characters");
  });
});
