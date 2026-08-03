# @aidex/engines

## Installation

```sh
pnpm add @aidex/engines
```

```sh
npm install @aidex/engines
```

A central registry for registering and executing **Engines** — a
provider-agnostic, domain-agnostic unit of work, dispatched by `id` rather
than compiled in by name. Modeled directly on `@aidex/core`'s
`Strategy`/`StrategyRegistry` pattern, but as its own standalone package: the
frozen kernel (`packages/core`) is never modified to support this.

## Why a separate package, not `packages/core`

`@aidex/core`'s `Strategy` contract (`{ name, version?, execute(request,
context) }`, dispatched by `StrategyRegistry`) already covers "family of
interchangeable units of work, selected by name, common interface." An
`EngineRegistry` inside the kernel itself would duplicate that abstraction
and reopen a folder name (`engine/`) the kernel's own architecture docs
record as deliberately retired in favor of `kernel/`. This package exists
instead — application/plugin-land, exactly where `Strategy`, `Provider`, and
`Plugin` implementations already live, never inside `packages/core`.

## Contents

- **`types/Engine`** — the contract: `{ id, name, description, version,
  execute(context): Promise<TResult> }`. `context` reuses `@aidex/core`'s
  `ExecutionContext` rather than inventing a parallel shape — real
  integration with the existing kernel contracts, without modifying them.
- **`registry/EngineRegistry`** — `register()`, `unregister()`, `has()`,
  `get()`, `list()`, `execute()`. Duplicate registrations throw
  `@aidex/core`'s own `DuplicateRegistrationError` (reused, not
  reimplemented); dispatching to a missing id throws this package's
  `EngineNotFoundError`.
- **`errors/EngineNotFoundError`** — thrown by `execute()` for an
  unregistered id. `get()`/`has()` stay plain accessors (return
  `undefined`/`false`), matching `StrategyRegistry`'s own split between
  silent lookup and fail-loud dispatch.
- **`capabilities/engineSupportsProvider`** — `missingCapabilities(engine, provider)` and `engineSupportsProvider(engine, provider)`, reusing `@aidex/providers`' existing `ProviderCapability`/`CapableProvider` system to check whether a provider satisfies an engine's optional `requiredCapabilities`. A provider that doesn't implement `CapableProvider` (no `getCapabilities()`) is treated as declaring zero capabilities.
- **`errors/UnsupportedProviderCapabilityError`** — thrown by `EngineRegistry.execute()` when the given context's provider doesn't support everything the engine's `requiredCapabilities` lists.

For engine *discovery* — listing all engines available across installed Feature Packs and their metadata — use `@aidex/catalog`'s `EngineCatalog` and `resolveCatalogEngine()`.

## Provider-agnostic, domain-agnostic

Nothing in this package knows what any engine does — no document, print, or
application-specific logic anywhere. `EngineRegistry` only ever sees an
`id` string and an object satisfying `Engine`; it has no idea whether that
engine extracts text from a PDF, resizes an image, or does something not yet
invented.

## Extensibility

A future plugin registers a new engine purely by constructing an object
that satisfies `Engine` and calling `registry.register(engine)` — the
registry itself never needs a code change to support it (the same
Open-Closed discipline `StrategyRegistry` follows).

## Dependency direction

`@aidex/engines` depends on `@aidex/core` only (`ExecutionContext`,
`DuplicateRegistrationError`) for runtime code. It also carries a
**type-only** dependency on `@aidex/providers` — `ProviderCapability`,
`ProviderCapabilities`, and `CapableProvider` are imported as types only,
to check an engine's optional `requiredCapabilities` against a provider's
existing capability model without duplicating it. No runtime import of
`@aidex/providers`, and no dependency on `@aidex/strategies`,
`@aidex/plugins`, or any application code.
