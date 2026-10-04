import { useSyncExternalStore } from 'react';
import { readItem, subscribe, writeItem } from './storage';

const LAST_LESSON_KEY = 'stylusforge:last-lesson:v1';

/** Parses the stored lesson id, or null when it is missing or malformed. */
export function parseLastLesson(raw: string | null): number | null {
  const id = raw === null ? NaN : Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Remembers the lesson the student opened last, for "Continue where you left off". */
export function rememberLesson(lessonId: number): void {
  if (readItem(LAST_LESSON_KEY) !== String(lessonId)) {
    writeItem(LAST_LESSON_KEY, String(lessonId));
  }
}

/** The id of the lesson opened last in this browser, or null (always null while hydrating). */
export function useLastLesson(): number | null {
  const raw = useSyncExternalStore(
    subscribe,
    () => readItem(LAST_LESSON_KEY),
    () => null,
  );
  return parseLastLesson(raw);
}
