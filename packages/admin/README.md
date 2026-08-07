# @aidex/admin

## Installation

```sh
pnpm add @aidex/admin
```

```sh
npm install @aidex/admin
```

Framework-agnostic composition layer over `@aidex/connections`,
`@aidex/ai-control`, and `@aidex/observability`. `AdminController` owns no
state of its own — every read and command goes straight to the same
manager/control/bus instances your application already handed to `Aidex`.
This is the foundation for future `@aidex/admin-react`/`-angular`/`-vue`
adapters; no UI is implemented here. See [ADR-003](../../docs/decisions/ADR-003-admin-composition-layer.md).

## Usage

```ts
import { Aidex } from '@aidex/core';
import { ConnectionManager } from '@aidex/connections';
import { AIFeatureControlPlugin, InMemoryAIFeatureControl } from '@aidex/ai-control';
import { ObservabilityBus } from '@aidex/observability';
import { AdminController } from '@aidex/admin';

// 1. Application creates a ConnectionManager
const connectionManager = new ConnectionManager();
connectionManager.registerProviderFactory('gemini', (config) => new GeminiProvider(config));
connectionManager.register({ id: 'primary', providerType: 'gemini', config: { apiKey: process.env.GEMINI_KEY } });

// 2. Application creates an AIFeatureControl
const aiControl = new InMemoryAIFeatureControl();

// 3. Application creates Aidex, wiring the same aiControl into the plugin
const observability = new ObservabilityBus();
const provider = connectionManager.resolve('primary');
const aidex = new Aidex({ provider, plugins: [new AIFeatureControlPlugin(aiControl)] });

// 4. Application creates AdminController using the SAME instances —
//    Admin and Aidex share state; Admin never copies it into a parallel store.
const admin = new AdminController({ connectionManager, aiControl, observability });

// 5. Admin reads a snapshot — safe to serialize, log, or send to any UI
const snapshot = admin.getSnapshot();
// { connections: [...], aiControl: {...}, observability: {...}, health: 'ok' }

// 6. Admin changes AI state — observed by aidex.execute() on the very next call
admin.setAIEnabled(false);
admin.setFeatureEnabled('text-generation', true); // per-feature override

// 7. Admin manages connections — through the same ConnectionManager Aidex's provider came from
admin.disableConnection('primary');
admin.registerConnection({ id: 'fallback', providerType: 'gemini', config: { apiKey: '...' } });

// React to changes (fires after every command, and after every
// observability event when an ObservabilityBus was supplied)
const unsubscribe = admin.subscribe((next) => console.log(next.health));
```

## Design notes

- **Composition, not ownership.** `AdminController` holds references to your
  existing `ConnectionManager`/`AIFeatureControl`/`ObservabilityBus` — it
  never copies their state into a second store. See ADR-003.
- **`AdminSnapshot` is always safe to serialize.** `connections` is exactly
  `ConnectionManager.list()`'s output (`Connection` has no `config` field —
  a structural guarantee, not a redaction pass); `aiControl` has no
  knowledge of providers at all; the observability summary is a pure
  numeric reduction that never echoes raw event payloads.
- **Provider capability information is deliberately not included** in this
  release — deferred to a later checkpoint.
- **Correctness never depends on `subscribe()`.** Every command works
  identically with zero subscribers; `getSnapshot()` always reflects live
  state.
