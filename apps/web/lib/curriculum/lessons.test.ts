import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import curriculum from "../../../../curriculum/lessons.json";
import { LESSONS, getLesson } from "./lessons";
import { containsSnippet, harnessPath, rustBlocks } from "./rust";
import { SOLUTIONS } from "./solutions";
import { splitSteps } from "./steps";
import { evaluateChecks, snippetPattern, stripCommentsAndStrings, validateCode, type LessonCheck } from "./validate";

/** Whether a text gives any expected snippet of a check, matched like the check itself. */
function givesCode(text: string, check: LessonCheck): boolean {
  return [check.anyOf, ...(check.alsoAnyOf ?? [])].flat().some((snippet) => snippetPattern(snippet).test(text));
}

/** Whether a text gives every part of a check: one snippet of each group. */
function givesAllCode(text: string, check: LessonCheck): boolean {
  return [check.anyOf, ...(check.alsoAnyOf ?? [])].every((group) => group.some((snippet) => snippetPattern(snippet).test(text)));
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

  it("forbids only bugs that the starter code plants", () => {
    // A check with forbidden snippets is about removing a bug: the starter must contain it.
    const starter = stripCommentsAndStrings(starterCode);
    for (const check of checks.filter((candidate) => candidate.noneOf)) {
      expect(check.noneOf!.length, check.objective).toBeGreaterThan(0);
      expect(check.noneOf!.some((snippet) => snippetPattern(snippet).test(starter)), `no forbidden snippet of "${check.objective}" in the starter`).toBe(true);
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

  it("shows no snippet placeholder to students", () => {
    // Everything but the snippets themselves: title, preview, explanation, starter code, quizzes,
    // objectives and hints. A placeholder such as $x only belongs in anyOf, alsoAnyOf, noneOf and anchor.
    const shown = JSON.stringify(lesson, (key, value) => (["anyOf", "alsoAnyOf", "noneOf", "anchor"].includes(key) ? undefined : value));
    expect(shown).toContain(checks[0].objective);
    expect(shown.match(/\$[A-Za-z_][A-Za-z0-9_]*/g) ?? []).toEqual([]);
  });

  it("has the Rust of its explanation in its compiled harness", () => {
    const blocks = rustBlocks(lesson.exercise.explanation);
    if (blocks.length === 0) return;
    const path = harnessPath(lesson.id);
    const harness = readFileSync(fileURLToPath(new URL(`../../../../${path}`, import.meta.url)), "utf8");
    blocks.forEach((block, index) => {
      expect(containsSnippet(harness, block), `rust block ${index + 1} of the explanation is not in ${path}:\n${block}`).toBe(true);
    });
  });

  it("has at least two hints per check, and only the last one gives the code", () => {
    for (const check of checks) {
      expect(check.hints.length, check.objective).toBeGreaterThanOrEqual(2);
      check.hints.forEach((hint, index) => {
        expect(hint.trim(), `empty hint for "${check.objective}"`).not.toBe("");
        const last = index === check.hints.length - 1;
        // The last hint gives every part of the check; the ones before give none.
        const gives = last ? givesAllCode(hint, check) : givesCode(hint, check);
        expect(gives, `hint ${index + 1} of "${check.objective}"`).toBe(last);
      });
    }
  });
});
