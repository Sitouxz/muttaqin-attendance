"use client";

import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

/**
 * Live connectivity flag for the scanner's offline queue.
 *
 * Reads navigator.onLine through useSyncExternalStore rather than seeding state
 * and correcting it in an effect, so a client that is already offline renders as
 * offline on the very first paint instead of flashing "online" for a frame.
 * The server snapshot is `true` because navigator does not exist during SSR.
 */
export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
