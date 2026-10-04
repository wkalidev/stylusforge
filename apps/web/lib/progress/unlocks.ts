import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { SkillNode } from './skillTree';
import { readItem, subscribe, writeItem } from './storage';

const SEEN_KEY = 'stylusforge:seen-unlocked:v1';

/** How long the unlock animation plays before the lesson is recorded as seen. */
export const UNLOCK_ANIMATION_MS = 1600;

/** Parses the stored ids of unlocked lessons already shown, ignoring anything malformed. */
export function parseSeenUnlocks(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((id): id is number => Number.isSafeInteger(id) && id > 0) : [];
  } catch {
    return [];
  }
}

/**
 * Lessons unlocked since the tree was last seen: available, not yet shown, and not the first
 * lesson of the curriculum (it starts open, nothing unlocked it).
 */
export function newlyUnlocked(nodes: readonly SkillNode[], seen: readonly number[]): number[] {
  return nodes.filter((node, index) => index > 0 && node.state === 'available' && !seen.includes(node.lesson.id)).map((node) => node.lesson.id);
}

/**
 * Ids of the lessons to show unlocking now. They are recorded as seen once the animation has
 * played, so each unlock plays once; leaving the page before that replays it next time.
 */
export function useUnlockingLessons(nodes: readonly SkillNode[]): number[] {
  const raw = useSyncExternalStore(
    subscribe,
    () => readItem(SEEN_KEY),
    () => null,
  );
  const unlocking = newlyUnlocked(nodes, parseSeenUnlocks(raw));
  const key = unlocking.join(',');

  useEffect(() => {
    if (!key) return;
    const timer = window.setTimeout(() => {
      const seen = parseSeenUnlocks(readItem(SEEN_KEY));
      const ids = key.split(',').map(Number);
      writeItem(SEEN_KEY, JSON.stringify([...new Set([...seen, ...ids])]));
    }, UNLOCK_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [key]);

  return useMemo(() => (key ? key.split(',').map(Number) : []), [key]);
}
