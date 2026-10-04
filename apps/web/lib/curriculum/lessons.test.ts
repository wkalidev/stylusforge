import { describe, expect, it } from "vitest";

import curriculum from "../../../../curriculum/lessons.json";
import { LESSONS, getLesson } from "./lessons";
import { SOLUTIONS } from "./solutions";
import { evaluateChecks, validateCode } from "./validate";

describe("LESSONS", () => {
  it("follows curriculum/lessons.json for ids, names, XP and availability", () => {
    expect(LESSONS.map(({ id, title, xp, available }) => ({ id, name: title, xp, available }))).toEqual(curriculum);
  });

  it("has unique slugs that resolve with getLesson", () => {
    const slugs = LESSONS.map((lesson) => lesson.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const lesson of LESSONS) {
      expect(getLesson(lesson.slug)).toBe(lesson);
    }
    expect(getLesson("missing")).toBeUndefined();
  });
});

const available = LESSONS.flatMap((lesson) => (lesson.available ? [lesson] : []));

describe.each(available)("lesson $id: $title", (lesson) => {
  const { starterCode, checks } = lesson.exercise;
  const solution = SOLUTIONS[lesson.id];

  it("has a reference solution", () => {
    expect(solution).toBeTypeOf("string");
  });

  it("anchors every check to a line of the starter code", () => {
    for (const result of evaluateChecks(starterCode, checks)) {
      expect(result.check.anchor, result.check.hint).toBeTypeOf("string");
      expect(result.line, `anchor not found: ${result.check.anchor}`).toBeGreaterThan(0);
    }
  });

  it("fails every check on the starter code", () => {
    for (const check of checks) {
      expect(validateCode(starterCode, [check]).passed, check.hint).toBe(false);
    }
  });

  it("passes every check with the reference solution", () => {
    expect(validateCode(solution, checks)).toEqual({ passed: true, hints: [] });
  });

  it("still passes when the solution is reformatted", () => {
    const reformatted = solution
      .replace(/\s+/g, " ")
      .replace(/([(){};,])/g, " $1 ");
    expect(validateCode(reformatted, checks).passed).toBe(true);
  });

  it("fails when the solution is only pasted in comments or a string", () => {
    const commented = solution
      .split("\n")
      .map((line) => `// ${line}`)
      .join("\n");
    expect(validateCode(`${starterCode}\n${commented}`, checks).passed).toBe(false);
    expect(validateCode(`${starterCode}\n/* ${solution} */`, checks).passed).toBe(false);
    expect(validateCode(`${starterCode}\nconst S: &str = r#"${solution}"#;`, checks).passed).toBe(false);
  });
});
