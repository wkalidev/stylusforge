import { useSyncExternalStore } from 'react';

const noop = () => () => {};

/** Whether the browser runs on an Apple platform (shortcut labels use ⌘). False on the server. */
export function useIsApplePlatform(): boolean {
  return useSyncExternalStore(
    noop,
    () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent),
    () => false,
  );
}
