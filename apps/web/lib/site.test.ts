import { describe, expect, it } from "vitest";

import { copyrightYears, establishedLabel, FIRST_COMMIT_DATE } from "./site";

describe("copyrightYears", () => {
  it("shows a single year when the start year is the current year", () => {
    expect(copyrightYears(2026, 2026)).toBe("2026");
  });

  it("shows a range with an en dash after the start year", () => {
    expect(copyrightYears(2026, 2028)).toBe("2026–2028");
  });

  it("never shows a range backwards", () => {
    expect(copyrightYears(2026, 2025)).toBe("2026");
  });
});

describe("establishedLabel", () => {
  it("formats the first commit month", () => {
    expect(establishedLabel(FIRST_COMMIT_DATE)).toBe("Est. September 2026");
  });
});
