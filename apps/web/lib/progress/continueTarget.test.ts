import { describe, expect, it } from "vitest";

import type { Lesson } from "@/lib/curriculum/lessons";
import { continueTarget, skillTree } from "./skillTree";

/** A minimal lesson: only the fields the skill tree reads matter here. */
function lesson(id: number, available = true): Lesson {
  const base = { id, slug: `lesson-${id}`, title: `Lesson ${id}`, difficulty: "Beginner", xp: 100, module: "m", preview: "", minutes: 10 };
  return available
    ? { ...base, available: true, exercise: { explanation: "", starterCode: "", checks: [] } }
    : { ...base, available: false };
}

const LESSONS = [lesson(1), lesson(2), lesson(3), lesson(4, false)];
const target = (passed: number[], last: number | null) => {
  const result = continueTarget(skillTree(LESSONS, passed), last);
  return result && { id: result.lesson.id, kind: result.kind };
};

describe("continueTarget", () => {
  it("starts with the first lesson when nothing was opened", () => {
    expect(target([], null)).toEqual({ id: 1, kind: "start" });
  });

  it("resumes the lesson opened last while it is not passed", () => {
    expect(target([1], 2)).toEqual({ id: 2, kind: "resume" });
    // Opened by URL while still locked: still where the student left off.
    expect(target([], 3)).toEqual({ id: 3, kind: "resume" });
  });

  it("moves on to the next available lesson once the last one is passed", () => {
    expect(target([1], 1)).toEqual({ id: 2, kind: "next" });
  });

  it("goes back to an earlier gap when nothing is available after the last lesson", () => {
    expect(target([2, 3], 3)).toEqual({ id: 1, kind: "next" });
  });

  it("ignores an unknown or unwritten last lesson", () => {
    expect(target([1], 99)).toEqual({ id: 2, kind: "next" });
    expect(target([1, 2, 3], 4)).toBeNull();
  });

  it("returns null once every written lesson is passed", () => {
    expect(target([1, 2, 3], 3)).toBeNull();
  });
});
