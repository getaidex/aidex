import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { AdminController, AdminSnapshot } from '@aidex/admin';

/**
 * Subscribes a React component to an existing AdminController and returns
 * its current AdminSnapshot, re-rendering whenever the controller publishes
 * a change. No business logic lives here — every read/command still goes
 * through the same AdminController the caller constructed; this hook only
 * adapts its existing subscribe()/getSnapshot() pair to React's external
 * store contract.
 *
 * `controller.subscribe(listener)` already matches useSyncExternalStore's
 * `subscribe` parameter shape (takes a callback, returns an unsubscribe
 * function) — the snapshot argument AdminController's listener receives is
 * discarded here because React re-reads the value itself via `getSnapshot`
 * immediately after being notified, rather than trusting a value passed
 * through the change signal.
 *
 * useSyncExternalStore requires `getSnapshot` to return a referentially
 * *stable* value between calls when nothing changed — it calls `getSnapshot`
 * more than once per commit to detect "tearing," and treats a new reference
 * each time as a sign the store is still changing, re-rendering forever.
 * AdminController.getSnapshot() is deliberately the opposite: it builds a
 * fresh object on every call, by design (see @aidex/admin's own tests) —
 * there is nothing wrong with AdminController here, it just wasn't designed
 * against React's specific contract. Reconciling that gap is exactly this
 * adapter's job, not a business-logic duplication: `cachedSnapshot` holds
 * the last read snapshot and is only cleared when the controller actually
 * notifies a change, so repeated `getSnapshot` calls between notifications
 * return the same reference.
 *
 * `subscribe`/`getSnapshot` are wrapped in useCallback, keyed only on
 * `controller`: useSyncExternalStore re-subscribes whenever the `subscribe`
 * function's identity changes, so without this, a fresh inline closure on
 * every render would unsubscribe and resubscribe on every render — pure
 * churn, since nothing about the subscription actually changed. As long as
 * the caller passes the same `controller` across renders (the normal case:
 * constructed once, e.g. via useMemo or a ref), the identity stays stable
 * and no resubscribe happens; passing a genuinely different controller
 * correctly triggers one (and correctly resets the cache below).
 *
 * `getServerSnapshot` reuses the identical `getSnapshot` call: AdminController
 * only ever performs synchronous in-memory reads (no `window`/`document`,
 * no client/server divergence), so there is nothing server-specific to
 * compute — this is what makes the hook SSR-safe without any extra code.
 *
 * Commands (`controller.setAIEnabled()`, `controller.registerConnection()`,
 * etc.) are deliberately not wrapped or re-returned here — the caller
 * already holds `controller` (they passed it in) and calls its methods
 * directly.
 */
interface SnapshotCacheEntry {
  controller: AdminController;
  snapshot: AdminSnapshot;
}

export function useAdmin(controller: AdminController): AdminSnapshot {
  // Keyed by controller, not just a bare snapshot: if `controller` itself
  // changes between renders, a cache entry populated by the *previous*
  // controller must never be handed back for the new one, even though
  // nothing has "notified" yet on the new controller's own timeline.
  const cache = useRef<SnapshotCacheEntry | null>(null);

  const getSnapshot = useCallback(() => {
    if (cache.current === null || cache.current.controller !== controller) {
      cache.current = { controller, snapshot: controller.getSnapshot() };
    }
    return cache.current.snapshot;
  }, [controller]);

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      controller.subscribe(() => {
        cache.current = null;
        onStoreChange();
      }),
    [controller]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
