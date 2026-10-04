import { describe, expect, it } from "vitest";

import curriculum from "../../../../curriculum/lessons.json";
import { LESSONS, getLesson } from "./lessons";
import { SOLUTIONS } from "./solutions";
import { splitSteps } from "./steps";
import { evaluateChecks, snippetPattern, validateCode, type LessonCheck } from "./validate";

/** Whether a text gives the expected code of a check, matched like the check itself. */
function givesCode(text: string, check: LessonCheck): boolean {
  return check.anyOf.some((snippet) => snippetPattern(snippet).test(text));
}

describe("LESSONS", () => {
  it("follows curriculum/lessons.json for ids, names, XP, availability and modules", () => {
    expect(LESSONS.map(({ id, title, xp, available, module }) => ({ id, name: title, xp, available, module }))).toEqual(curriculum);
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
      expect(result.check.anchor, result.check.objective).toBeTypeOf("string");
      expect(result.line, `anchor not found: ${result.check.anchor}`).toBeGreaterThan(0);
    }
  });

  it("fails every check on the starter code", () => {
    for (const check of checks) {
      expect(validateCode(starterCode, [check]).passed, check.objective).toBe(false);
    }
  });

  it("passes every check with the reference solution", () => {
    expect(validateCode(solution, checks)).toEqual({ passed: true, objectives: [] });
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

  it("states objectives as goals, never as the expected code", () => {
    for (const check of checks) {
      expect(check.objective.trim(), "empty objective").not.toBe("");
      expect(check.objective, "objectives are plain text").not.toContain("`");
      for (const other of checks) {
        expect(givesCode(check.objective, other), `"${check.objective}" gives the code of "${other.objective}"`).toBe(false);
      }
    }
  });

  it("does not give the expected code in the task step", () => {
    const task = splitSteps(lesson.exercise.explanation).find((step) => step.title === "Your task");
    expect(task).toBeDefined();
    for (const check of checks) {
      expect(givesCode(task!.body, check), `the task step gives the code of "${check.objective}"`).toBe(false);
    }
  });

  it("has at least two hints per check, and only the last one gives the code", () => {
    for (const check of checks) {
      expect(check.hints.length, check.objective).toBeGreaterThanOrEqual(2);
      check.hints.forEach((hint, index) => {
        expect(hint.trim(), `empty hint for "${check.objective}"`).not.toBe("");
        const last = index === check.hints.length - 1;
        expect(givesCode(hint, check), `hint ${index + 1} of "${check.objective}"`).toBe(last);
      });
    }
  });
});
