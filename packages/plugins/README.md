# @aidex/plugins

Concrete `Plugin` implementations for the Aidex kernel (`@aidex/core`). Plugins are
application-land code per `docs/architecture/plugin-development-guide.md` —
cross-cutting *observers* of the kernel's own lifecycle, registered via
`aidex.use(plugin)` or `AidexConfig.plugins`. This package supplies reusable ones.

## Contents

- **`stub/StubPlugin`** — the reference `Plugin` implementation: all five hooks
  (`onBoot`, `onReady`, `beforeExecute`, `afterExecute`, `onShutdown`) are
  present and do nothing but record that they ran (`plugin.calls`) — no decision
  logic of any kind.
- **`logger/LoggerPlugin`** — demonstrates real lifecycle usage: logs a line on
  every hook via `context.logger?.info(...)`. Safely no-ops (never throws) when
  `AidexConfig` carries no logger.

## The Aidex Plugin System (`PluginManager`)

`packages/core`'s `Plugin` interface only covers lifecycle hooks. The Aidex
Plugin System extends that — without modifying `@aidex/core` — so a plugin
can also declare Engines, Strategies, Prompts, and Tools it wants installed:

```ts
import { PluginManager } from '@aidex/plugins';
import type { ExtendedPlugin } from '@aidex/plugins';

const manager = new PluginManager(aidex); // aidex: an existing Aidex instance

const myPlugin: ExtendedPlugin = {
  name: 'my-plugin',
  registerEngines: () => [myEngine],
  registerStrategies: () => [myStrategy],
  registerPrompts: () => [{ id: 'greeting', version: '1.0.0', template: 'Hello, {{name}}!' }],
  registerTools: () => [myTool],
};

manager.use(myPlugin); // this package's "aidex.use(plugin)"
```

- **`ExtendedPlugin`** extends `@aidex/core`'s `Plugin` — every method (the
  five lifecycle hooks plus the four `register*` methods) is optional, same
  discipline as the base `Plugin`. `registerPrompts()`/`registerTools()`
  return the real `PromptTemplate`/`Tool` shapes from `@aidex/prompts`/
  `@aidex/tools` — not a placeholder type.
- **`PluginManager.use(plugin)`** is the install point: it throws
  `DuplicateRegistrationError` if `plugin.name` was already installed,
  delegates to the real `aidex.use(plugin)` for lifecycle-hook wiring
  (unchanged kernel behavior), and registers every declared extension kind
  into its real, dedicated registry — engines into an `EngineRegistry`
  (`@aidex/engines`), strategies onto the `Aidex` instance via
  `aidex.registerStrategy()`, prompts into a `PromptRegistry`
  (`@aidex/prompts`), tools into a `ToolRegistry` (`@aidex/tools`). A
  duplicate id/version propagates the exact `DuplicateRegistrationError`
  the underlying registry itself throws. `getEngineRegistry()`/
  `getPromptRegistry()`/`getToolRegistry()` expose each one — a prompt or
  tool a plugin registered is immediately usable through the same registry
  API any other caller would use (`registry.render(...)`,
  `registry.execute(...)`).
- All four registries are constructor-injectable with sensible defaults
  (`new PluginManager(aidex, engines?, prompts?, tools?)`) — composition, not
  a hidden global; omitting any of them (including the pre-existing 1-arg
  and 2-arg call shapes) still works.
- Independent of application logic: nothing in `PluginManager` or
  `ExtendedPlugin` knows about any specific application, provider vendor, or
  what a given plugin's engines/strategies/prompts/tools actually do.

## A note on `onBoot`/`onShutdown`

Both hooks are implemented on `LoggerPlugin` for completeness against the
`Plugin` contract, but neither ever actually fires on a real `Aidex` instance
today: per ADR-002 and `docs/architecture/request-lifecycle.md`, `boot` always
emits before any plugin is wired (zero listeners, always), and no public `Aidex`
method ever emits `shutdown`. Their tests call the hook methods directly rather
than through a real `Aidex` instance, since that's the only way to observe them
at all under the current kernel.

## Rules this package follows

- Imports only the public contracts from `@aidex/core` (`Plugin`,
  `ExecutionContext`) — never a kernel internal.
- Neither plugin mutates `context.config`; `LoggerPlugin` only reads
  `context.logger`/`context.request`.
- `Lifecycle` and the `Plugin` interface are untouched — nothing here changes
  what the kernel wires or when.
- `src/index.ts` exports plugin classes only.
