import { useMemo, useSyncExternalStore } from 'react';
import { readItem, subscribe, writeItem } from './storage';

const hintsKey = (lessonId: number) => `stylusforge:hints:v1:${lessonId}`;

/**
 * Parses the stored number of revealed hints per check (by check index), ignoring anything
 * malformed: a missing or invalid entry counts as no hint revealed.
 */
export function parseRevealedHints(raw: string | null): number[] {
  if (!raw) {
    return [];
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map((count) => (Number.isSafeInteger(count) && count > 0 ? (count as number) : 0));
  } catch {
    return [];
  }
}

/** Reveals the next hint of a lesson check, up to the number of hints it has. */
export function revealNextHint(lessonId: number, checkIndex: number, hintCount: number): void {
  const revealed = parseRevealedHints(readItem(hintsKey(lessonId)));
  while (revealed.length <= checkIndex) {
    revealed.push(0);
  }
  revealed[checkIndex] = Math.min(revealed[checkIndex] + 1, hintCount);
  writeItem(hintsKey(lessonId), JSON.stringify(revealed));
}

/** Number of revealed hints per check of a lesson, saved in this browser (empty while hydrating). */
export function useRevealedHints(lessonId: number): number[] {
  const raw = useSyncExternalStore(
    subscribe,
    () => readItem(hintsKey(lessonId)),
    () => null,
  );
  return useMemo(() => parseRevealedHints(raw), [raw]);
}
