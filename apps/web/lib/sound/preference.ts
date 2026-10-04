import { useSyncExternalStore } from 'react';
import { readItem, subscribe, writeItem } from '@/lib/progress/storage';

const SOUND_KEY = 'stylusforge:sound:v1';

/** Whether the anvil sound is on. Off by default, and always off during server rendering. */
export function useSoundEnabled(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => readItem(SOUND_KEY) === 'on',
    () => false,
  );
}

export function isSoundEnabled(): boolean {
  return readItem(SOUND_KEY) === 'on';
}

export function setSoundEnabled(enabled: boolean): void {
  writeItem(SOUND_KEY, enabled ? 'on' : null);
}
