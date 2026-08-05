# Creating an Engine

An **Engine** is a provider-agnostic, domain-agnostic unit of work, dispatched
by `id` rather than compiled in by name — the same idea as `@aidex/core`'s
`Strategy`/`StrategyRegistry` pattern, but living in its own standalone
package (`@aidex/engines`) instead of inside the frozen kernel.

## The contract

An `Engine` is a plain object satisfying:

```ts
interface Engine<TResult = unknown> {
  id: string;
  name: string;
  description: string;
  version: string;
  requiredCapabilities?: string[];
  execute(context: ExecutionContext): Promise<TResult>;
}
```

`context` reuses `@aidex/core`'s `ExecutionContext` rather than inventing a
parallel shape — an Engine gets real integration with the kernel's existing
contracts (including the injected `Provider`) without the kernel itself
knowing anything about Engines at all.

## Registering it

```ts
import { EngineRegistry } from '@aidex/engines';

const registry = new EngineRegistry();

registry.register({
  id: 'my-feature.do-thing',
  name: 'Do Thing',
  description: 'Explains what this engine does, in one sentence.',
  version: '1.0.0',
  async execute(context) {
    // read context.provider, context.metadata, etc.
    return { done: true };
  },
});

const result = await registry.execute('my-feature.do-thing', context);
```

`register()` throws `@aidex/core`'s `DuplicateRegistrationError` for a
repeated `id` — reused, not reimplemented. Dispatching to a missing `id`
throws this package's own `EngineNotFoundError`. `get()`/`has()` stay plain,
silent accessors, matching the split every registry in this platform
follows between lookup and fail-loud dispatch.

## Capability gating (optional)

If your engine needs a specific provider capability, declare
`requiredCapabilities` and let the registry check it for you:

```ts
import { engineSupportsProvider } from '@aidex/engines';
```

`EngineRegistry.execute()` throws `UnsupportedProviderCapabilityError` if the
context's provider doesn't support everything the engine's
`requiredCapabilities` lists. A provider with no `getCapabilities()` method
is treated as declaring zero capabilities.

## Where this fits

`@aidex/engines` depends on `@aidex/core` only (for `ExecutionContext` and
`DuplicateRegistrationError`), plus a type-only dependency on
`@aidex/providers` for capability types. It has no dependency on
`@aidex/strategies`, `@aidex/plugins`, or any application code — and nothing
in `packages/core` changes to support a new Engine. For discovering every
Engine registered across installed Feature Packs, see `@aidex/catalog`'s
`EngineCatalog`.

See [14 — Custom Engine](/examples/14-custom-engine) for a full runnable
walkthrough.
