import { describe, expect, it } from "vitest";

import { currentStreak, localDay, nextStreak, parseStreak } from "./streak";

/** A local moment: month is 1-based here for readability. */
const at = (year: number, month: number, day: number, hour = 12) => new Date(year, month - 1, day, hour);

describe("localDay", () => {
  it("uses the local calendar date", () => {
    expect(localDay(at(2026, 3, 9, 0))).toBe("2026-03-09");
    expect(localDay(at(2026, 12, 31, 23))).toBe("2026-12-31");
  });
});

describe("nextStreak", () => {
  it("starts at 1", () => {
    expect(nextStreak(null, at(2026, 10, 4))).toEqual({ day: "2026-10-04", streak: 1 });
  });

  it("counts a day once", () => {
    const state = { day: "2026-10-04", streak: 3 };
    expect(nextStreak(state, at(2026, 10, 4, 23))).toBe(state);
  });

  it("extends the run on the next day, across months and years", () => {
    expect(nextStreak({ day: "2026-10-04", streak: 3 }, at(2026, 10, 5, 0))).toEqual({ day: "2026-10-05", streak: 4 });
    expect(nextStreak({ day: "2026-02-28", streak: 1 }, at(2026, 3, 1))).toEqual({ day: "2026-03-01", streak: 2 });
    expect(nextStreak({ day: "2026-12-31", streak: 9 }, at(2027, 1, 1))).toEqual({ day: "2027-01-01", streak: 10 });
  });

  it("restarts after a missed day", () => {
    expect(nextStreak({ day: "2026-10-02", streak: 7 }, at(2026, 10, 4))).toEqual({ day: "2026-10-04", streak: 1 });
  });
});

describe("currentStreak", () => {
  const state = { day: "2026-10-04", streak: 5 };

  it("holds on the active day and through the next day", () => {
    expect(currentStreak(state, at(2026, 10, 4))).toBe(5);
    expect(currentStreak(state, at(2026, 10, 5, 23))).toBe(5);
  });

  it("is lost after a full day without practice", () => {
    expect(currentStreak(state, at(2026, 10, 6, 0))).toBe(0);
    expect(currentStreak(null, at(2026, 10, 4))).toBe(0);
  });
});

describe("parseStreak", () => {
  it("reads a stored streak", () => {
    expect(parseStreak('{"day":"2026-10-04","streak":2}')).toEqual({ day: "2026-10-04", streak: 2 });
  });

  it("rejects missing or malformed values", () => {
    for (const raw of [null, "", "nope", "[]", '{"day":"04/10/2026","streak":2}', '{"day":"2026-10-04","streak":0}', '{"day":"2026-10-04","streak":1.5}']) {
      expect(parseStreak(raw)).toBeNull();
    }
  });
});
