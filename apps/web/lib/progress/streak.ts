import { useMemo, useSyncExternalStore } from 'react';
import { readItem, subscribe, writeItem } from './storage';

const STREAK_KEY = 'stylusforge:streak:v1';

/** The last active day (local calendar date, YYYY-MM-DD) and the run of consecutive days ending on it. */
export interface StreakState {
  day: string;
  streak: number;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The local calendar date of a moment, as YYYY-MM-DD. */
export function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The local calendar date of the day before a moment. */
function previousDay(date: Date): string {
  return localDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1));
}

/** Parses the stored streak, or null when it is missing or malformed. */
export function parseStreak(raw: string | null): StreakState | null {
  if (!raw) {
    return null;
  }
  try {
    const { day, streak } = JSON.parse(raw) as Partial<StreakState>;
    if (typeof day !== 'string' || !DAY.test(day) || !Number.isSafeInteger(streak) || (streak as number) < 1) {
      return null;
    }
    return { day, streak: streak as number };
  } catch {
    return null;
  }
}

/** The streak after some activity at `now`: unchanged the same day, extended the next day, else 1. */
export function nextStreak(state: StreakState | null, now: Date): StreakState {
  const today = localDay(now);
  if (state?.day === today) {
    return state;
  }
  return { day: today, streak: state?.day === previousDay(now) ? state.streak + 1 : 1 };
}

/** Consecutive active days as of `now`: the run survives until the end of the day after the last activity. */
export function currentStreak(state: StreakState | null, now: Date): number {
  if (!state) {
    return 0;
  }
  return state.day === localDay(now) || state.day === previousDay(now) ? state.streak : 0;
}

/** Records a day of practice ("Check my code" ran). */
export function recordActivity(now = new Date()): void {
  const current = parseStreak(readItem(STREAK_KEY));
  const next = nextStreak(current, now);
  if (next !== current) {
    writeItem(STREAK_KEY, JSON.stringify(next));
  }
}

/** Notifies at the next local midnight and whenever the page becomes visible again. */
function subscribeToDay(onChange: () => void): () => void {
  let timer = 0;
  const schedule = () => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    timer = window.setTimeout(() => {
      onChange();
      schedule();
    }, midnight.getTime() - now.getTime() + 1000);
  };
  schedule();
  document.addEventListener('visibilitychange', onChange);
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', onChange);
  };
}

/** The current daily streak in this browser (0 during server rendering and hydration). */
export function useStreak(): number {
  const raw = useSyncExternalStore(
    subscribe,
    () => readItem(STREAK_KEY),
    () => null,
  );
  // The local date, so the streak also updates when a day passes with the page open.
  const today = useSyncExternalStore(
    subscribeToDay,
    () => localDay(new Date()),
    () => null,
  );
  return useMemo(() => (today ? currentStreak(parseStreak(raw), new Date()) : 0), [raw, today]);
}
