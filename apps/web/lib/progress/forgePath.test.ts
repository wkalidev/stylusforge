import { describe, expect, it } from "vitest";

import type { Lesson } from "@/lib/curriculum/lessons";
import { forgePath, zoneStatus } from "./forgePath";
import { skillTree } from "./skillTree";
import { newlyUnlocked, parseSeenUnlocks } from "./unlocks";

function lesson(id: number, module: string, available = true): Lesson {
  const base = { id, slug: `lesson-${id}`, title: `Lesson ${id}`, difficulty: "Beginner", xp: 100, module, preview: "", minutes: 10 };
  return available
    ? { ...base, available: true, exercise: { explanation: "", starterCode: "", checks: [] } }
    : { ...base, available: false };
}

const MODULES = [
  { id: "a", name: "Module A", zone: "Zone A" },
  { id: "b", name: "Module B", zone: "Zone B" },
  { id: "c", name: "Module C", zone: "Zone C" },
];
// Module c has no lesson yet; lesson 4 is not written.
const LESSONS = [lesson(1, "a"), lesson(2, "a"), lesson(3, "b"), lesson(4, "b", false)];
const path = (passed: number[]) => forgePath(MODULES, skillTree(LESSONS, passed));

describe("forgePath", () => {
  it("groups lessons into zones in module order", () => {
    const zones = path([]);
    expect(zones.map((zone) => [zone.index, zone.zone, zone.nodes.map(({ node }) => node.lesson.id)])).toEqual([
      [1, "Zone A", [1, 2]],
      [2, "Zone B", [3, 4]],
      [3, "Zone C", []],
    ]);
  });

  it("reports progress and completion per module", () => {
    expect(path([]).map(({ passed, total, state }) => ({ passed, total, state }))).toEqual([
      { passed: 0, total: 2, state: "open" },
      { passed: 0, total: 2, state: "locked" },
      { passed: 0, total: 0, state: "locked" },
    ]);
    const [a, b] = path([1, 2, 3]);
    expect(a).toMatchObject({ passed: 2, state: "complete" });
    // An unwritten lesson keeps the module incomplete.
    expect(b).toMatchObject({ passed: 1, total: 2, state: "open" });
  });

  it("heats the path from passed lessons into the lessons they open, across zone headers", () => {
    const [a, b] = path([1, 2]);
    expect(a.header).toEqual({ in: null, out: "cold" });
    expect(a.nodes.map(({ in: before, out }) => [before, out])).toEqual([
      ["cold", "hot"],
      ["hot", "hot"],
    ]);
    // Lesson 2 is passed and lesson 3 is open: the heat runs through module B's header.
    expect(b.header).toEqual({ in: "hot", out: "hot" });
    expect(b.nodes[0]).toMatchObject({ in: "hot", out: "cold" });
    expect(b.nodes[1]).toMatchObject({ in: "cold", out: "cold" });
  });

  it("ends the path at the last row", () => {
    const zones = path([]);
    expect(zones[2].header).toEqual({ in: "cold", out: null });
  });
});

describe("zoneStatus", () => {
  it("counts the lessons passed, or names the lesson that opens a locked zone", () => {
    expect(path([]).map(zoneStatus)).toEqual(["0 of 2 lessons passed", "Pass Lesson 2 to enter", "Lessons coming soon"]);
    expect(path([1]).map(zoneStatus)[0]).toBe("1 of 2 lessons passed");
  });

  it.each([
    [1, "Lesson passed"],
    [2, "Both lessons passed"],
    [3, "All 3 lessons passed"],
    [5, "All 5 lessons passed"],
  ])("words a complete zone of %i", (count, status) => {
    const lessons = Array.from({ length: count }, (_, index) => lesson(index + 1, "a"));
    const [zone] = forgePath(MODULES.slice(0, 1), skillTree(lessons, lessons.map(({ id }) => id)));
    expect(zone.state).toBe("complete");
    expect(zoneStatus(zone)).toBe(status);
  });
});

describe("newlyUnlocked", () => {
  it("lists open lessons not shown yet, except the first lesson", () => {
    const nodes = skillTree(LESSONS, [1, 2]);
    expect(newlyUnlocked(nodes, [])).toEqual([3]);
    expect(newlyUnlocked(nodes, [3])).toEqual([]);
    expect(newlyUnlocked(skillTree(LESSONS, []), [])).toEqual([]);
  });

  it("ignores passed and locked lessons", () => {
    expect(newlyUnlocked(skillTree(LESSONS, [1, 2, 3]), [])).toEqual([]);
  });
});

describe("parseSeenUnlocks", () => {
  it("keeps valid lesson ids only", () => {
    expect(parseSeenUnlocks("[2,3,-1,\"4\",1.5]")).toEqual([2, 3]);
    expect(parseSeenUnlocks(null)).toEqual([]);
    expect(parseSeenUnlocks("oops")).toEqual([]);
    expect(parseSeenUnlocks("{}")).toEqual([]);
  });
});
