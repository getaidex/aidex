# @aidex/admin-react

## Installation

```sh
pnpm add @aidex/admin-react @aidex/admin react
```

```sh
npm install @aidex/admin-react @aidex/admin react
```

A single hook, `useAdmin(controller)`, adapting `@aidex/admin`'s
`AdminController` to React. No business logic lives here — every read and
command still goes through the same `AdminController` your application
already constructed; this package only translates its existing
`subscribe()`/`getSnapshot()` into React's external-store contract via
`useSyncExternalStore`.

## Usage

```tsx
import { AdminController } from '@aidex/admin';
import { useAdmin } from '@aidex/admin-react';

// 1. Create/configure AdminController exactly as in @aidex/admin's own
//    docs — the same connectionManager/aiControl instances your app
//    already wired into Aidex.
const admin = new AdminController({ connectionManager, aiControl, observability });

function AdminPanel() {
  // 2. Pass it to useAdmin(controller)
  const snapshot = useAdmin(admin);

  // 3. Read the snapshot
  return (
    <div>
      <p>Health: {snapshot.health}</p>
      <p>AI enabled: {String(snapshot.aiControl.enabled)}</p>
      <p>Connections: {snapshot.connections.length}</p>

      {/* 4. Continue using controller commands directly — no wrapped
             command API, no dispatch layer. */}
      <button onClick={() => admin.setAIEnabled(!snapshot.aiControl.enabled)}>
        Toggle AI
      </button>
    </div>
  );
}
```

## Design notes

- **No `AdminProvider`, no React Context.** `admin` is passed to `useAdmin`
  as a plain argument, the same way you'd pass any object to a hook — there
  is no ambient/global Admin state to provide. `AdminController` itself
  remains the single source of truth; this hook never caches or copies its
  state.
- **Pass the same `controller` reference across renders** (construct it once
  — module scope, a ref, or `useMemo`) so the subscription stays stable; a
  new `controller` identity on every render would resubscribe on every
  render, which is correct behavior for "the controller actually changed"
  but wasteful if unintended.
- **SSR-safe.** `AdminController.getSnapshot()` is a synchronous in-memory
  read with no `window`/`document` access, so the hook's server snapshot is
  identical to its client one — no hydration mismatch, no extra code.
