import type { Lesson } from "./lessons.js";

export interface RegistrationPlan {
  /** Available lessons that are not on-chain yet, in curriculum order. */
  toAdd: Lesson[];
  /** Lessons already registered with the same name and XP. */
  unchanged: Lesson[];
}

/**
 * Compares the available lessons of the curriculum with the lessons registered on-chain.
 * Registered lessons are immutable, so the plan fails when one differs from the curriculum
 * (name or XP) or is no longer an available lesson; it never proposes to change them.
 */
export function planLessonRegistration(curriculum: readonly Lesson[], onChain: readonly Lesson[]): RegistrationPlan {
  const wanted = new Map(curriculum.map((lesson) => [lesson.id, lesson]));
  const registered = new Map(onChain.map((lesson) => [lesson.id, lesson]));

  const conflicts: string[] = [];
  for (const lesson of onChain) {
    const expected = wanted.get(lesson.id);
    if (!expected) {
      conflicts.push(`lesson ${lesson.id} (${lesson.name}) is registered on-chain but is not an available lesson`);
    } else if (expected.name !== lesson.name || expected.xp !== lesson.xp) {
      conflicts.push(
        `lesson ${lesson.id} is registered as "${lesson.name}" (${lesson.xp} XP), ` +
          `the curriculum says "${expected.name}" (${expected.xp} XP)`,
      );
    }
  }
  if (conflicts.length > 0) {
    throw new Error(
      `Registered lessons cannot change on-chain; fix curriculum/lessons.json:\n- ${conflicts.join("\n- ")}`,
    );
  }

  return {
    toAdd: curriculum.filter((lesson) => !registered.has(lesson.id)),
    unchanged: curriculum.filter((lesson) => registered.has(lesson.id)),
  };
}
