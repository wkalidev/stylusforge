import { describe, expect, it } from "vitest";

import { LESSONS } from "./lessons";
import { splitSteps } from "./steps";

describe("splitSteps", () => {
  it("makes the title and introduction the first step, then one step per ### section", () => {
    const steps = splitSteps(["## Title", "", "Intro.", "", "### First", "Body one.", "### Second", "", "Body two.", ""].join("\n"));
    expect(steps).toEqual([
      { title: "Title", body: "Intro." },
      { title: "First", body: "Body one." },
      { title: "Second", body: "Body two." },
    ]);
  });

  it("keeps ## headings after the first step inside the body", () => {
    expect(splitSteps("## A\nx\n### B\n## not a step\ny")[1]).toEqual({ title: "B", body: "## not a step\ny" });
  });
});

const available = LESSONS.flatMap((lesson) => (lesson.available ? [lesson] : []));

describe.each(available)("lesson $id: $title steps and quizzes", (lesson) => {
  const steps = splitSteps(lesson.exercise.explanation);
  const titles = steps.map((step) => step.title);

  it("has at least two titled steps ending with the task", () => {
    expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(titles.every(Boolean)).toBe(true);
    expect(titles.at(-1)).toBe("Your task");
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("has well-formed quizzes attached to existing steps", () => {
    const quizzes = lesson.exercise.quizzes ?? [];
    expect(quizzes.length).toBeGreaterThan(0);
    for (const quiz of quizzes) {
      expect(titles, quiz.question).toContain(quiz.afterStep);
      expect(quiz.afterStep, "no quiz after the task").not.toBe("Your task");
      expect(quiz.options.length).toBeGreaterThanOrEqual(2);
      expect(new Set(quiz.options).size).toBe(quiz.options.length);
      expect(Number.isInteger(quiz.answer) && quiz.answer >= 0 && quiz.answer < quiz.options.length).toBe(true);
      expect(quiz.explanation.length).toBeGreaterThan(0);
    }
  });
});
