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

export interface ContinueTarget {
  lesson: Lesson;
  /** resume: the unfinished lesson opened last; next: the next lesson to start; start: nothing done yet. */
  kind: 'resume' | 'next' | 'start';
}

/**
 * Where "Continue where you left off" leads: the lesson opened last if it is not passed yet,
 * otherwise the next available lesson (after the last one opened, else the first in the tree).
 * Null once every written lesson is passed.
 */
export function continueTarget(nodes: readonly SkillNode[], lastLessonId: number | null): ContinueTarget | null {
  const lastIndex = nodes.findIndex((node) => node.lesson.id === lastLessonId && node.lesson.available);
  const last = lastIndex === -1 ? null : nodes[lastIndex];
  if (last && last.state !== 'completed') {
    return { lesson: last.lesson, kind: 'resume' };
  }
  const available = nodes.filter((node) => node.state === 'available');
  const next = available.find((node) => nodes.indexOf(node) > lastIndex) ?? available[0];
  if (!next) {
    return null;
  }
  const started = last !== null || nodes.some((node) => node.state === 'completed');
  return { lesson: next.lesson, kind: started ? 'next' : 'start' };
}
