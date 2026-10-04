import type { Lesson } from '@/lib/curriculum/lessons';

export type NodeState = 'completed' | 'available' | 'locked';

export interface SkillNode {
  lesson: Lesson;
  state: NodeState;
  /** For locked nodes: the lesson to pass first, or null when the lesson is not written yet. */
  unlockedBy: Lesson | null;
}

/**
 * States of the skill tree, in curriculum order: passed lessons are completed; the first lesson
 * and any lesson right after a completed one are available; the rest are locked. Unavailable
 * lessons are always locked ("coming soon").
 */
export function skillTree(lessons: readonly Lesson[], passedIds: readonly number[]): SkillNode[] {
  const passed = new Set(passedIds);
  return lessons.map((lesson, index) => {
    const previous = index > 0 ? lessons[index - 1] : null;
    if (!lesson.available) {
      return { lesson, state: 'locked', unlockedBy: null };
    }
    if (passed.has(lesson.id)) {
      return { lesson, state: 'completed', unlockedBy: null };
    }
    if (!previous || passed.has(previous.id)) {
      return { lesson, state: 'available', unlockedBy: null };
    }
    return { lesson, state: 'locked', unlockedBy: previous };
  });
}
