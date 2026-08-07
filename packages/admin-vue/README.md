# @aidex/admin-vue

## Installation

```sh
pnpm add @aidex/admin-vue @aidex/admin vue
```

```sh
npm install @aidex/admin-vue @aidex/admin vue
```

A single composable, `useAdmin(controller)`, adapting `@aidex/admin`'s
`AdminController` to Vue. No business logic lives here — every read and
command still goes through the same `AdminController` your application
already constructed; this package only translates its existing
`subscribe()`/`getSnapshot()` into a Vue `ref`.

## Usage

```ts
import { AdminController } from '@aidex/admin';
import { useAdmin } from '@aidex/admin-vue';

// Create the AdminController exactly as in @aidex/admin's own docs — the
// same connectionManager/aiControl/observability instances your app
// already wired into Aidex.
const admin = new AdminController({ connectionManager, aiControl, observability });

export default {
  setup() {
    // snapshot is a Vue ref — read it, use it in templates, watch it.
    const snapshot = useAdmin(admin);

    function toggleAI() {
      // Commands are called directly on the controller — useAdmin never
      // wraps them.
      admin.setAIEnabled(!snapshot.value.aiControl.enabled);
    }

    return { snapshot, toggleAI };
  },
};
```

```vue
<template>
  <p>Health: {{ snapshot.health }}</p>
  <button @click="toggleAI">Toggle AI</button>
</template>
```

## Design notes

- **No Context/provide-inject.** `controller` is passed to `useAdmin`
  directly — there is no ambient Admin state to provide. `AdminController`
  remains the single source of truth.
- **No snapshot-caching workaround.** Unlike the React adapter (which must
  reconcile `AdminController.getSnapshot()`'s always-fresh-object design
  against React's referential-stability requirement), Vue's reactivity has
  no such constraint — this composable is a direct translation of
  `subscribe()`/`getSnapshot()`.
- **Controller replacement is supported**: pass a `ref`/`computed`/getter
  instead of a plain `AdminController` and `useAdmin` will unsubscribe from
  the old controller and subscribe to the new one when it changes. If you
  hold the controller in a ref for this purpose, use `shallowRef`, not
  `ref` — see the doc comment on `useAdmin` for why.
- **SSR-safe.** `AdminController.getSnapshot()` is a synchronous in-memory
  read with no `window`/`document` access.
