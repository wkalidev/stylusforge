import { describe, expect, it } from "vitest";

import { LESSONS } from "@/lib/curriculum/lessons";
import { localXp, parseCompleted } from "./progress";

describe("parseCompleted", () => {
  it("returns no lessons for missing or malformed data", () => {
    expect(parseCompleted(null)).toEqual([]);
    expect(parseCompleted("not json")).toEqual([]);
    expect(parseCompleted('{"1":true}')).toEqual([]);
  });

  it("keeps unique positive integer ids, sorted", () => {
    expect(parseCompleted("[3, 1, 3, 0, -2, 1.5, \"2\", 2]")).toEqual([1, 2, 3]);
  });
});

describe("localXp", () => {
  it("sums the XP of completed available lessons", () => {
    const [first, second] = LESSONS;
    expect(localXp([first.id, second.id])).toBe(first.xp + second.xp);
  });

  it("ignores unknown and unavailable lessons", () => {
    const unavailable = LESSONS.filter((lesson) => !lesson.available).map((lesson) => lesson.id);
    expect(localXp([999, ...unavailable])).toBe(0);
  });
});
