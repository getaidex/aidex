import { onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';
import type { AdminController, AdminSnapshot } from '@aidex/admin';

/**
 * Subscribes to an existing AdminController and returns its current
 * AdminSnapshot as a Vue ref, updating whenever the controller publishes a
 * change. No business logic lives here — every read/command still goes
 * through the same AdminController the caller constructed.
 *
 * Unlike @aidex/admin-react's useAdmin, no snapshot-caching workaround is
 * needed: React's useSyncExternalStore requires getSnapshot() to return a
 * referentially stable value between calls, which AdminController.
 * getSnapshot() deliberately does not (it builds a fresh object every
 * call). Vue's Proxy-based reactivity has no such requirement — assigning
 * a fresh object to `snapshot.value` is exactly how Vue expects updates to
 * work, so this adapter is a more direct translation of the underlying
 * subscribe()/getSnapshot() contract than the React one.
 *
 * `controller` accepts a plain AdminController (static for the composable's
 * lifetime, matching @aidex/admin-react/@aidex/admin-angular) or a
 * MaybeRefOrGetter (a ref/computed/getter) — Vue's core 3.3+ idiom for
 * "this input may itself be reactive." If the resolved controller changes,
 * the previous subscription is torn down and a new one started against the
 * new controller (synchronously — see the `flush: 'sync'` below). A plain
 * value never changes under toValue(), so it behaves identically to the
 * sibling adapters' fixed-controller usage.
 *
 * If you hold the controller in a ref for swapping, use `shallowRef`, not
 * `ref`: AdminController transitively holds @aidex/connections'
 * ConnectionManager, which uses a true private `#connections` field for
 * secret-safety. Vue's plain `ref()` deep-wraps object values in a reactive
 * Proxy, and native private-field access breaks when called through that
 * Proxy. `shallowRef` never wraps its held value — this is also Vue's own
 * documented guidance for holding class instances/opaque objects, not an
 * Aidex-specific workaround.
 *
 * Cleanup uses onScopeDispose(), not onUnmounted(): it works both inside a
 * component's setup() and inside a bare effectScope(), which is what makes
 * this composable usable outside component contexts too (e.g. a Pinia
 * store) — the Vue-documented pattern for reusable composables. If called
 * with no active effect scope, Vue itself warns and the callback is never
 * registered; that is Vue's own documented behavior for onScopeDispose,
 * not something this adapter adds.
 *
 * SSR-safe with no extra code: AdminController performs only synchronous
 * in-memory reads (no window/document), and every Vue API used here
 * (ref/watch/onScopeDispose/toValue) is universal.
 */
export function useAdmin(controller: MaybeRefOrGetter<AdminController>): Readonly<Ref<AdminSnapshot>> {
  let current = toValue(controller);
  const snapshot = ref(current.getSnapshot()) as Ref<AdminSnapshot>;
  let unsubscribe = current.subscribe((next) => {
    snapshot.value = next;
  });

  const stopWatch = watch(
    () => toValue(controller),
    (next) => {
      if (next === current) {
        return;
      }
      unsubscribe();
      current = next;
      snapshot.value = current.getSnapshot();
      unsubscribe = current.subscribe((nextSnapshot) => {
        snapshot.value = nextSnapshot;
      });
    },
    // Vue's default 'pre' flush defers this callback to the next tick.
    // AdminController is a synchronous system (admin-react/admin-angular
    // both react to it synchronously) — a deferred controller switch would
    // leave `snapshot` briefly subscribed to the old controller after the
    // reactive source already changed, an avoidable surprise.
    { flush: 'sync' }
  );

  onScopeDispose(() => {
    stopWatch();
    unsubscribe();
  });

  return snapshot;
}
