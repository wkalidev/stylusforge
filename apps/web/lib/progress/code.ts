import { useSyncExternalStore } from 'react';
import { readItem, subscribe, writeItem } from './storage';

const codeKey = (lessonId: number) => `stylusforge:code:v1:${lessonId}`;

export function saveCode(lessonId: number, code: string): void {
  writeItem(codeKey(lessonId), code);
}

/** Forgets the saved code, so the lesson opens on its starter code again. */
export function resetCode(lessonId: number): void {
  writeItem(codeKey(lessonId), null);
}

/** The code saved for a lesson, or null (always null during server rendering and hydration). */
export function useSavedCode(lessonId: number): string | null {
  return useSyncExternalStore(
    subscribe,
    () => readItem(codeKey(lessonId)),
    () => null,
  );
}
