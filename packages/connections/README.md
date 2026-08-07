# @aidex/connections

## Installation

```sh
pnpm add @aidex/connections
```

```sh
npm install @aidex/connections
```

A framework-agnostic manager for named AI-provider **connection**
configurations — the identity/config/enabled-state an application needs to
use a provider, kept separate from `@aidex/core`'s `Provider` interface,
which handles actual model execution. `ConnectionManager` lets an
application register, look up, list, update, enable/disable, and remove
connections, then `resolve()` one into a real `Provider` instance to hand to
`AIBuilder`/`Aidex` itself.

## Why a separate package, not `packages/core`

`docs/roadmap/roadmap.md`'s "What deliberately stays out, and why" section
explicitly rejects a kernel-level provider registry / runtime provider
switching: `AidexConfig.provider` is one `Provider` per `Aidex` instance, by
design (see [ADR-001](../../docs/decisions/ADR-001-kernel-philosophy.md)).
This package doesn't change that — the kernel still only ever sees one
`Provider` per `Aidex` instance. "Multiple connections" lives entirely at
this application-composition layer, the same relationship `@aidex/engines`
already has with the kernel: its own package, depending on `@aidex/core`
only, composed by the application, never imported by `@aidex/core` itself.

## Contents

- **`manager/ConnectionManager`** — `register()`, `get()`, `list()`, `has()`,
  `update()`, `remove()`, `enable()`, `disable()`, `registerProviderFactory()`,
  `resolve()`. Duplicate registrations throw `@aidex/core`'s own
  `DuplicateRegistrationError` (reused, not reimplemented) — mirrors
  `EngineRegistry`'s own convention for the same case.
- **`types/Connection`** — what `get()`/`list()` return: `{ id, providerType,
  enabled, metadata? }`. Deliberately has **no `config` field** — see
  Secrets below.
- **`types/RegisterConnectionInput`** — what `register()` accepts, including
  the opaque, provider-shaped `config` (may contain secrets).
- **`types/ProviderFactory`** — `(config) => Provider`, registered per
  `providerType` via `registerProviderFactory()`. This package has zero
  dependency on `@aidex/providers` and never imports a concrete `Provider`
  implementation — the application supplies the factory.
- **`errors/*`** — `ConnectionNotFoundError`, `DisabledConnectionError`,
  `InvalidConnectionConfigError`, `ProviderFactoryNotFoundError`, all
  extending `@aidex/core`'s `AidexError` and accepting an optional trailing
  `executionId` so an operation inside an `Aidex.execute()` flow can
  correlate its error with the rest of that execution.

## Secrets

`config` — the only place a connection's secrets ever live — is stored
internally by `ConnectionManager` and reachable through exactly one method:
`resolve()`, which hands it to the matching registered `ProviderFactory` and
returns the resulting `Provider`. `get()`/`list()`/every thrown error return
`Connection`, a type that structurally has no `config` field at all. This is
a guarantee by construction, not a field-name-based redaction pass applied
after the fact.

## Usage

```ts
import { ConnectionManager } from '@aidex/connections';
import { GeminiProvider } from '@aidex/providers';

const manager = new ConnectionManager();

manager.registerProviderFactory('gemini', (config) => new GeminiProvider(config));

manager.register({
  id: 'primary',
  providerType: 'gemini',
  config: { apiKey: process.env.GEMINI_API_KEY },
});

const provider = manager.resolve('primary');
// Hand `provider` to AIBuilder/Aidex exactly as any other Provider:
// new AIBuilder().provider(provider).build();
```

## Dependency direction

`@aidex/connections` depends on `@aidex/core` only. It is not a dependency
of `@aidex/sdk` — an application imports it directly and passes its
`resolve()` output into `AIBuilder.provider()` itself.
