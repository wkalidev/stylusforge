import type * as Lessons from "@/lib/curriculum/lessons";

/**
 * The lesson that tests treat as not written yet. Once every listed lesson is available, the
 * curriculum has no unavailable lesson left, so tests of the "soon" paths mock one instead.
 */
export const UNAVAILABLE_LESSON = 5;

/**
 * A `vi.mock` factory for `@/lib/curriculum/lessons` that keeps every lesson but marks
 * UNAVAILABLE_LESSON unavailable, as lessons.ts lists a lesson without an exercise:
 *
 *   vi.mock("@/lib/curriculum/lessons", (importOriginal) => withUnavailableLesson(importOriginal));
 */
export async function withUnavailableLesson(importOriginal: () => Promise<typeof Lessons>): Promise<typeof Lessons> {
  const actual = await importOriginal();
  const LESSONS: Lessons.Lesson[] = actual.LESSONS.map((lesson) =>
    lesson.id === UNAVAILABLE_LESSON ? { ...lesson, available: false, exercise: undefined } : lesson,
  );
  return { ...actual, LESSONS, getLesson: (slug: string) => LESSONS.find((lesson) => lesson.slug === slug) };
}
