/**
 * Tiny localStorage-backed store for useSyncExternalStore. Every access is guarded: storage
 * can be unavailable (private mode, blocked site data), in which case reads return null and
 * writes only notify the current tab.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function readItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Writes (or removes, for null) a value and notifies subscribers in this tab. */
export function writeItem(key: string, value: string | null): void {
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Storage unavailable: progress lives for this page only.
  }
  notify();
}

/** Subscribes to writes from this tab and, through the storage event, from other tabs. */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}
