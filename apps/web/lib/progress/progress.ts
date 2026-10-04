import { useMemo, useSyncExternalStore } from 'react';
import { LESSONS } from '@/lib/curriculum/lessons';
import { readItem, subscribe, writeItem } from './storage';

const COMPLETED_KEY = 'stylusforge:completed:v1';

/** Parses the stored list of completed lesson ids, ignoring anything malformed. */
export function parseCompleted(raw: string | null): number[] {
  if (!raw) {
    return [];
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) {
      return [];
    }
    const ids = value.filter((id): id is number => Number.isSafeInteger(id) && id > 0);
    return [...new Set(ids)].sort((a, b) => a - b);
  } catch {
    return [];
  }
}

/** Local XP: the XP of every completed lesson that exists and is available. */
export function localXp(completedIds: readonly number[]): number {
  return LESSONS.filter((lesson) => lesson.available && completedIds.includes(lesson.id)).reduce(
    (total, lesson) => total + lesson.xp,
    0,
  );
}

export function markLessonCompleted(lessonId: number): void {
  const completed = parseCompleted(readItem(COMPLETED_KEY));
  if (!completed.includes(lessonId)) {
    writeItem(COMPLETED_KEY, JSON.stringify([...completed, lessonId]));
  }
}

/**
 * Ids of the lessons passed in this browser. Empty during server rendering and hydration,
 * then the stored value.
 */
export function useCompletedLessons(): number[] {
  const raw = useSyncExternalStore(
    subscribe,
    () => readItem(COMPLETED_KEY),
    () => null,
  );
  return useMemo(() => parseCompleted(raw), [raw]);
}

export function useLocalXp(): number {
  const completed = useCompletedLessons();
  return useMemo(() => localXp(completed), [completed]);
}
