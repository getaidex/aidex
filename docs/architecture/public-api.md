# Public API

The [kernel philosophy doc](kernel-philosophy.md) fixed the *why*: Aidex is a kernel, applications
depend on it, and the Golden Rule keeps its surface small. The [project structure doc](project-structure.md) fixed the *where*: a `kernel/` folder that owns the
public `Aidex` class plus two private registries and a private lifecycle manager, and
a `types/` folder that holds the contracts applications write code against. This
document fixes the *what* — the four public members of `Aidex` are the entire surface
those two documents were protecting, and this is where each one is specified in
full: its signature, what it does, and how to call it correctly.

The kernel described below is implemented and tested — every signature in this
document has been cross-checked against the real `packages/core/src/kernel/Aidex.ts`.

## The Four Calls (locked)

```ts
const aidex = new Aidex(config);
aidex.use(plugin);
aidex.registerStrategy(strategy);
const result = await aidex.execute(request);
```

Nothing else is public. `StrategyRegistry`, `PluginRegistry`, and `Lifecycle` are
never exported from `packages/core/src/index.ts` — they are implementation detail
reachable only indirectly, through the effects of these four calls. If a future
change seems to require a fifth public method, that is a signal to re-read the [kernel philosophy doc](kernel-philosophy.md)'s
Golden Rule before adding one, not a reason to add one.

---

## `new Aidex(config: AidexConfig)`

```ts
interface AidexConfig {
  name?: string;
  version?: string;
  provider: Provider;
  logger?: ILogger;
  plugins?: Plugin[];
  metadata?: Metadata;
}

constructor(config: AidexConfig)
```

Construction is the only place a `Provider` enters the kernel. `AidexConfig.provider`
is required and is injected exactly once, for the lifetime of that `Aidex` instance —
the kernel never selects or swaps providers at request time (see the [kernel philosophy doc](kernel-philosophy.md): "providers
generate," they are not routed). Everything else on `AidexConfig` is optional:
`name`/`version` are descriptive metadata for the instance itself, `logger` is an
optional `ILogger` the kernel and plugins may use, `plugins` is a convenience list of
`Plugin` objects to register during construction, and `metadata` is a free-form bag
the host application can use for anything the kernel doesn't need to understand (the
`shopId` example from the [kernel philosophy doc](kernel-philosophy.md) belongs here, not as a new `AidexConfig` field).

What happens, in order, when `new Aidex(config)` runs:

1. Store `config` on the instance.
2. Construct the three private collaborators: `Lifecycle`, `StrategyRegistry`, and
   `PluginRegistry`. None of these are ever exposed to the caller.
3. Emit the `boot` phase: `lifecycle.emit('boot', this.buildContext())`.
   `this.buildContext()` builds a fresh `ExecutionContext` from `config`
   (provider, logger, metadata) for this call specifically — the real
   constructor calls `buildContext()` once per `emit()` call rather than
   building one shared `ExecutionContext` and reusing it for both `boot` and
   `ready`; the two resulting objects are value-equal (since no request
   exists yet) but are distinct instances. This runs *before*
   `config.plugins` are registered (step 4 below), so at the moment `boot`
   fires, no plugin — not a `config.plugins` entry, not one added later —
   has been wired to the `Lifecycle` manager yet. `boot` therefore always
   fires with zero listeners given the frozen constructor order: no plugin,
   from any source, ever observes `onBoot` on a real `Aidex` instance. The
   hook exists on the `Plugin` interface for forward compatibility (see the
   `use()` section below and Best Practices), not because it currently
   fires for anyone. The `emit('boot', ...)` call is chained with
   `.catch((err) => this.config.logger?.error('boot hook failed', err))`,
   so if a `boot` handler's promise ever rejected, that rejection would be
   caught and logged rather than left unhandled — moot today since `boot`
   has zero listeners, but present in the real code for consistency with
   the `ready` emission below.
4. Register each entry in `config.plugins` by calling the same internal path as the
   public `use()` method — so plugin registration during construction and plugin
   registration after construction behave identically.
5. Emit the `ready` phase: `lifecycle.emit('ready', this.buildContext())`.
   This is a second, independently built `ExecutionContext` — not the same
   object emitted for `boot` in step 3, though value-equal to it. By this
   point every plugin supplied via `config.plugins` is registered, so
   `onReady` hooks can safely assume the full initial plugin set is
   present. The `emit('ready', ...)` call is likewise chained with
   `.catch((err) => this.config.logger?.error('ready hook failed', err))`: a
   plugin's `onReady` handler that rejects has that rejection caught and routed
   to `config.logger?.error` rather than becoming an unhandled promise
   rejection.

After the constructor returns, the `Aidex` instance is ready to accept
`registerStrategy()` and `use()` calls and to run `execute()`.

---

## `use(plugin: Plugin): void`

```ts
use(plugin: Plugin): void
```

Registers a `Plugin` and wires whichever lifecycle hooks it defines to the matching
phase on the (private) `Lifecycle` manager. A `Plugin` is a plain object with a
required `name` and up to five optional hook methods:

```ts
interface Plugin {
  readonly name: string;
  onBoot?(context: ExecutionContext): void | Promise<void>;
  onReady?(context: ExecutionContext): void | Promise<void>;
  beforeExecute?(context: ExecutionContext): void | Promise<void>;
  afterExecute?(context: ExecutionContext): void | Promise<void>;
  onShutdown?(context: ExecutionContext): void | Promise<void>;
}
```

`use(plugin)` does two things:

1. `PluginRegistry.register(plugin)` — records the plugin.
2. For each hook the plugin actually defines (`onBoot`, `onReady`, `beforeExecute`,
   `afterExecute`, `onShutdown`), calls `lifecycle.on(phase, ...)` to attach it to the
   matching phase. A plugin that only implements `afterExecute` is wired to exactly
   one phase; nothing fires for the four it left undefined.

Calling `use()` after construction (i.e., outside `config.plugins`) attaches the
plugin's hooks going forward only — it does not retroactively fire `boot` or `ready`
for a plugin registered after those phases already ran once. Because `boot` and
`ready` are emitted exactly once per `Aidex` instance (during the constructor), a
plugin registered via a standalone `aidex.use(plugin)` call after construction will
never see its `onBoot` or `onReady` hooks invoked on that instance — both phases
have already fired by the time `use()` runs. `config.plugins` entries are in a
different position, but not the one it's tempting to assume: since `boot` fires
*before* `config.plugins` are registered (see the constructor sequence above), no
plugin from any source ever observes `onBoot` on a real `Aidex` instance. `ready`
fires *after* `config.plugins` registration, so `config.plugins` entries are the
only plugins guaranteed to observe `onReady` — that guarantee covers `ready` alone,
not both phases. This is why the best practice below is to supply every plugin that
needs `onReady` via `config.plugins` rather than calling `use()` after the fact,
unless you specifically want a plugin that only cares about
`beforeExecute`/`afterExecute`/`onShutdown`.

---

## `registerStrategy(strategy: Strategy): void`

```ts
registerStrategy(strategy: Strategy): void
```

Registers a `Strategy` so that `execute()` can later dispatch to it by name.

```ts
interface Strategy<TResult = unknown, TContext = unknown> {
  readonly name: string;
  readonly version?: string;
  execute(
    request: AidexRequest<TContext>,
    context: ExecutionContext<TContext>
  ): Promise<TResult>;
}
```

`registerStrategy(strategy)` calls `StrategyRegistry.register(strategy)`, which keys
the registry by `strategy.name` alone. `version` is metadata carried on the strategy
object — it is never consulted by the registry, and there is no multi-version
resolution logic (picking "the latest" or "a specific" version would be business
logic the kernel has no business doing, per the [kernel philosophy doc](kernel-philosophy.md)'s Golden Rule).

If a strategy is registered whose `name` already exists in the registry,
`registerStrategy()` throws `DuplicateRegistrationError` instead of silently
overwriting the previous registration or silently ignoring the new one. This is a
deliberate fail-loud choice: two strategies quietly colliding on a name is exactly
the kind of bug that should surface at registration time, not as a mysteriously wrong
result at `execute()` time.

---

## `execute<TResult, TContext>(request: AidexRequest<TContext>): Promise<TResult>`

```ts
interface AidexRequest<TContext = unknown> {
  strategy: string;
  input?: unknown;
  context?: TContext;
  metadata?: Metadata;
  options?: AidexOptions;
}

execute<TResult, TContext>(request: AidexRequest<TContext>): Promise<TResult>
```

The single entry point for running work through the kernel. `request.strategy` names
which registered `Strategy` should handle the call; `input` and `context` are
opaque to the kernel and are passed straight through to the strategy; `metadata` and
`options` (timeout, `AbortSignal`, `stream`, `debug`, and any extension fields) travel
alongside the request for the strategy and any plugins to read.

What happens, in order, when `execute(request)` runs:

1. Emit the `beforeExecute` phase: `lifecycle.emit('beforeExecute', context)`. Every
   plugin with a `beforeExecute` hook runs here, in the order it was registered.
2. Look up the strategy: `StrategyRegistry.get(request.strategy)`. If no strategy was
   registered under that name, throw `StrategyNotFoundError(request.strategy)`
   immediately — the strategy never runs and neither `afterExecute` nor any provider
   call happens.
3. Call `strategy.execute(request, context)` and `await` it. This is where the
   strategy does its work: it builds a `Prompt`, calls `context.provider.generate()`
   to get a `ProviderResponse`, and converts that response into the strategy's
   `TResult`. (Strategy/Provider internals are out of scope for this document — see
   the [strategy development guide](strategy-development-guide.md), the strategy development guide, and the [provider development guide](provider-development-guide.md), the provider development
   guide.)
4. Emit the `afterExecute` phase: `lifecycle.emit('afterExecute', context)`. Every
   plugin with an `afterExecute` hook runs here.
5. Return the strategy's result to the caller.

Two failure paths matter for callers: a missing strategy throws
`StrategyNotFoundError` before any strategy or provider code runs, and any error the
strategy itself throws (including a provider failure) propagates out of `execute()`
as a rejected promise — the kernel does not catch, wrap, or retry strategy errors. If
retry behavior is needed, it belongs in a plugin or in the strategy itself, not in
the kernel.

---

## Usage example

The example below combines all four calls with the minimal stub shapes the design
allows: a `Provider` that only implements `name` and `generate`, and a `Strategy`
whose `execute` returns a literal string without doing any real AI work. This is the
same shape a real integration test for this flow would use. Two plugins are
used so that both `config.plugins` registration and a real, standalone `use()` call
are exercised — see Best Practices below for why `onReady` work belongs in
`config.plugins` rather than in a plugin added this way.

```ts
import {
  Aidex,
  type Provider,
  type Strategy,
  type Plugin,
  type AidexRequest,
} from '@aidex/core';

// A minimal stub Provider — real providers (Gemini, OpenAI, ...) are app-land.
const stubProvider: Provider = {
  name: 'stub-provider',
  async generate(prompt) {
    return { content: `echo: ${prompt.content}` };
  },
};

// A minimal stub Strategy — real strategies build prompts and call the provider.
const greetStrategy: Strategy<string> = {
  name: 'greet',
  async execute(request) {
    return `hello, ${String(request.input)}`;
  },
};

// A minimal stub Plugin — logs around the request without touching its result.
const loggingPlugin: Plugin = {
  name: 'logger',
  beforeExecute(context) {
    context.logger?.info('before execute', context.request.strategy);
  },
  afterExecute(context) {
    context.logger?.info('after execute', context.request.strategy);
  },
};

// A second stub Plugin, registered via use() after construction rather than via
// config.plugins. It only defines beforeExecute/afterExecute — never onBoot or
// onReady — because a plugin added this way never observes either of those two
// phases on this instance (both have already fired by the time use() runs).
const timingPlugin: Plugin = {
  name: 'timing',
  beforeExecute(context) {
    context.metadata = { ...context.metadata, startedAt: Date.now() };
  },
};

// 1. Construct — runs boot (zero listeners), registers config.plugins, runs ready.
const aidex = new Aidex({
  provider: stubProvider,
  plugins: [loggingPlugin],
});

// 2. use() — register an additional plugin after construction. Its beforeExecute
// hook is wired immediately and will run on every subsequent execute() call.
aidex.use(timingPlugin);

// 3. registerStrategy() — must happen before execute() references it by name.
aidex.registerStrategy(greetStrategy);

// 4. execute() — beforeExecute → strategy.execute → afterExecute → result.
const request: AidexRequest = { strategy: 'greet', input: 'world' };
const result = await aidex.execute<string>(request);

console.log(result); // "hello, world"
```

---

## Sequence: construction

Ordered list of what happens, in order, for `new Aidex(config)`:

1. Caller invokes `new Aidex(config)`.
2. Kernel stores `config`.
3. Kernel constructs private `Lifecycle`, `StrategyRegistry`, `PluginRegistry`.
4. Kernel emits `boot`, passing a freshly built `ExecutionContext` (built by
   calling `this.buildContext()` at this point, not a shared object built
   once up front) → no plugin is wired yet at this point (`config.plugins`
   registration is the next step), so `boot` fires with zero listeners; no
   `onBoot` hook is ever invoked given this order. The `emit('boot', ...)`
   call is chained with
   `.catch((err) => this.config.logger?.error('boot hook failed', err))`,
   so a rejection would be caught and logged, not left unhandled.
5. Kernel registers each `config.plugins` entry via the internal `use()` path →
   each plugin's defined hooks are wired to their matching lifecycle phase.
6. Kernel emits `ready`, passing another freshly built `ExecutionContext` —
   a distinct object from the one built for `boot` in step 4, though
   value-equal to it since no request exists yet → every `config.plugins`
   entry's `onReady` hook (if defined) runs. The `emit('ready', ...)` call
   is chained with
   `.catch((err) => this.config.logger?.error('ready hook failed', err))`,
   so a rejected `onReady` handler's promise is caught and logged rather than
   left as an unhandled rejection.
7. Constructor returns the `Aidex` instance to the caller.

## Sequence: `execute()`

Ordered list of what happens, in order, for `await aidex.execute(request)`:

1. Caller invokes `aidex.execute(request)`.
2. Kernel emits `beforeExecute` → every registered plugin's `beforeExecute` hook (if
   defined) runs, in registration order.
3. Kernel looks up `request.strategy` in `StrategyRegistry`.
   - Not found → throw `StrategyNotFoundError(request.strategy)`; stop here.
   - Found → continue.
4. Kernel calls and awaits `strategy.execute(request, context)`.
5. Kernel emits `afterExecute` → every registered plugin's `afterExecute` hook (if
   defined) runs, in registration order.
6. Kernel returns the strategy's result to the caller as the resolved promise.

---

## Best practices

- **Never construct more than one `Aidex` per provider identity you need.** Each
  `Aidex` instance is bound to exactly one `Provider` for its lifetime via
  `AidexConfig.provider`. If an application genuinely needs to talk to two different
  providers (e.g., a primary and a fallback), that is two `Aidex` instances, not one
  instance with provider-switching logic — the kernel deliberately has no concept of
  selecting between providers at request time.
- **Register all strategies before calling `execute()`.** `registerStrategy()` and
  `execute()` have no ordering enforced between them beyond "the strategy must be
  registered before the specific `execute()` call that names it" — but treating
  strategy registration as a distinct, upfront phase (right after construction, before
  any `execute()` call) avoids a class of race-y bugs where a strategy is registered
  concurrently with requests that reference it. Registering late is not a runtime
  error until a request actually names an unregistered strategy, at which point it
  surfaces as `StrategyNotFoundError` — treat that error as a sign strategy
  registration order needs fixing, not as a signal to add retry logic around
  `execute()`.
- **Plugins should be idempotent, since `boot`/`ready` fire once per instance (and
  `onBoot` in particular never fires at all).** `boot` and `ready` are each emitted
  exactly once per `Aidex` instance, during construction. `boot` fires *before*
  `config.plugins` are registered, so no plugin — from `config.plugins` or a later
  `use()` call — ever observes `onBoot` given the frozen constructor order; treat
  `onBoot` as effectively inert today rather than a hook to build on. `ready` fires
  *after* `config.plugins` registration, so `config.plugins` entries do observe
  `onReady` exactly once, and a plugin registered later via a standalone `use()`
  call never sees `onReady` fire again on that instance. Write `onReady` hooks (and
  any `onBoot` hook you add defensively, in case the constructor order ever changes)
  so that running them zero or one times both leave the system in a correct state —
  never assume a second `boot` or `ready` will come along to fix up state left over
  from a first one.
- **Prefer `config.plugins` over a standalone `use()` call when a plugin needs
  `onReady`.** Only plugins supplied at construction time are guaranteed to observe
  `ready` (`boot`, by contrast, is observed by no plugin at all, from any source —
  see above); a plugin added later via `aidex.use(plugin)` only ever sees
  `beforeExecute`/`afterExecute`/`onShutdown` on that instance, since `boot` and
  `ready` have already fired by the time it's registered.
- **Treat `DuplicateRegistrationError` and `StrategyNotFoundError` as configuration
  bugs, not runtime conditions to branch on.** Both errors exist so misconfiguration
  (a duplicate strategy name, a typo'd `request.strategy`) fails loudly and early
  rather than silently producing the wrong behavior. Catching them to implement
  fallback logic reintroduces exactly the kind of routing decision the kernel is
  designed not to make.
