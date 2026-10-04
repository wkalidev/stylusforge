import { describe, expect, it } from "vitest";

import { LESSONS } from "@/lib/curriculum/lessons";
import { skillTree } from "./skillTree";

const states = (passed: number[]) => skillTree(LESSONS, passed).map((node) => node.state);

describe("skillTree", () => {
  it("opens only the first lesson at the start", () => {
    expect(states([])).toEqual(["available", "locked", "locked", "locked", "locked"]);
  });

  it("unlocks the lesson after each passed one", () => {
    expect(states([1])).toEqual(["completed", "available", "locked", "locked", "locked"]);
    expect(states([1, 2, 3])).toEqual(["completed", "completed", "completed", "available", "locked"]);
  });

  it("keeps a lesson passed out of order completed and opens the one after it", () => {
    expect(states([3])).toEqual(["available", "locked", "completed", "available", "locked"]);
  });

  it("keeps unavailable lessons locked with no lesson to unlock them", () => {
    const last = skillTree(LESSONS, [1, 2, 3, 4]).at(-1)!;
    expect(last).toMatchObject({ state: "locked", unlockedBy: null });
    expect(last.lesson.available).toBe(false);
  });

  it("names the lesson to pass for a locked node", () => {
    expect(skillTree(LESSONS, [])[2].unlockedBy?.id).toBe(2);
  });
});
