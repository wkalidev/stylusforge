import { describe, expect, it } from "vitest";

import {
  copyrightYears,
  DEVELOPMENT_SITE_URL,
  establishedLabel,
  FIRST_COMMIT_DATE,
  PRODUCTION_SITE_URL,
  resolveSiteUrl,
} from "./site";

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

describe("resolveSiteUrl", () => {
  it("defaults to the deployed app, and to next dev's origin in development", () => {
    expect(resolveSiteUrl(undefined, false)).toBe(PRODUCTION_SITE_URL);
    expect(resolveSiteUrl("", false)).toBe(PRODUCTION_SITE_URL);
    expect(resolveSiteUrl(undefined, true)).toBe(DEVELOPMENT_SITE_URL);
  });

  it("uses a configured https origin, without a trailing slash", () => {
    expect(resolveSiteUrl("https://forge.example", false)).toBe("https://forge.example");
    expect(resolveSiteUrl("https://forge.example/", true)).toBe("https://forge.example");
  });

  it("accepts http on localhost only", () => {
    expect(resolveSiteUrl("http://localhost:3001", false)).toBe("http://localhost:3001");
    expect(resolveSiteUrl("http://127.0.0.1:3000", false)).toBe("http://127.0.0.1:3000");
    expect(() => resolveSiteUrl("http://forge.example", false)).toThrow(/https/);
  });

  it.each([
    ["a path", "https://forge.example/app"],
    ["a query", "https://forge.example/?a=1"],
    ["a fragment", "https://forge.example/#top"],
    ["credentials", "https://user:pass@forge.example"],
  ])("refuses %s", (_label, value) => {
    expect(() => resolveSiteUrl(value, false)).toThrow(/origin/);
  });

  it("refuses a value that is not a URL", () => {
    expect(() => resolveSiteUrl("stylusforge.wkalidev.com", false)).toThrow(/not a URL/);
  });
});
