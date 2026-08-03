# Plugin Development Guide

The [request lifecycle doc](request-lifecycle.md) specified `Lifecycle` itself — the five phases,
exactly when each fires, and the corrected fact that `boot` fires before any plugin
is wired and therefore reaches no plugin, ever, from any registration source. This
document is the companion piece written for the person actually *writing* a plugin:
the full `Plugin` interface, what a plugin is and is not allowed to do, three
illustrative example plugins, and how to register one via `aidex.use()` or
`AidexConfig.plugins`. It assumes the [request lifecycle doc](request-lifecycle.md) as background and does not re-derive the
phase-by-phase mechanics — where this document needs a fact from the [request lifecycle doc](request-lifecycle.md) (most
importantly, that `onBoot` never fires), it states the fact and points back rather
than repeating the full reasoning.

The kernel described below is implemented and tested — the `Plugin` interface
and the lifecycle wiring in this document have been cross-checked against the
real `packages/core/src/types/Plugin.ts` and
`packages/core/src/kernel/lifecycle/Lifecycle.ts`. No concrete
plugin ships in `packages/core` — plugins remain application code, as
described below.

## What a Plugin is

Recall the [kernel philosophy doc](kernel-philosophy.md)'s division of labor: *"Applications decide. Kernel executes.
Strategies orchestrate. Providers generate."* A `Plugin` doesn't appear in that
sentence, and that's deliberate — a plugin is not a fifth actor with its own
responsibility for getting work done. It is a cross-cutting *observer* of the
kernel's own lifecycle: something that wants to run a bit of code every time a
particular phase fires (a request starts, a request ends, an instance boots) without
itself becoming the thing that does the work. Logging, metrics collection, and
tracing are the canonical examples — none of them change *what* `execute()` returns,
they only run alongside it.

Like strategies and providers, plugins are **application code**. Aidex ships the
`Plugin` interface as a contract in `packages/core/src/types/Plugin.ts`; it does not
ship any concrete plugin. Print Platform, Design Platform, and every future application write their
own plugins and register them with their own `Aidex` instance via `use()` or
`AidexConfig.plugins`.

## The `Plugin` interface (locked)

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

That is the entire interface: a required `name` and exactly five optional hook
methods, each taking the shared `ExecutionContext` and returning `void` or
`Promise<void>`. There is no sixth hook, and there are no phase-specific hooks for
systems that don't exist yet in this skeleton — no `beforeValidation`, no
`beforeBuilder`, no `onError`. `validators/` and `builders/` are untouched,
`.gitkeep`-only folders per the [project structure doc](project-structure.md); until something emits a phase for them, there is
no hook to wire one to. If a future kernel version adds a validation or build phase,
it would add a new optional method to this interface *then* — writing one today
that the current `Lifecycle` will never call is not "getting ahead of it," it's
dead code.

Every hook is optional, and a plugin implements any subset — none, one, or all
five. A plugin is a plain object (or a class instance) satisfying this shape; it
does not need to extend a base class or call a `super()` constructor.

## The five hooks — what fires, and what doesn't

The [request lifecycle doc](request-lifecycle.md) covers this in full; the table below is the summary a plugin author needs
while writing hooks, not a restatement of the mechanism:

| Hook | Wired to phase | Ever actually invoked? |
| --- | --- | --- |
| `onBoot` | `boot` | **No.** `boot` fires before `config.plugins` is registered, so it always emits to zero listeners. No plugin, from any registration source, ever observes `onBoot` on a real `Aidex` instance. |
| `onReady` | `ready` | Only for plugins supplied via `AidexConfig.plugins`. A plugin added later via a standalone `aidex.use(plugin)` call is wired after `ready` has already fired and never sees it. |
| `beforeExecute` | `beforeExecute` | Yes — every currently-registered plugin, on every `execute()` call, in registration order. |
| `afterExecute` | `afterExecute` | Yes, but only on the success path — if `strategy.execute()` throws, `afterExecute` does not fire at all (see "Exceptions," below). |
| `onShutdown` | `shutdown` | **No.** `shutdown` is reserved: the hook exists and `Lifecycle` can emit it, but no public `Aidex` method ever calls `lifecycle.emit('shutdown', ...)` in this skeleton. |

The practical upshot for anyone writing a plugin: **`beforeExecute` and
`afterExecute` are the only two hooks with a live, repeated trigger in this
skeleton.** `onReady` fires exactly once, and only for `config.plugins` entries.
`onBoot` and `onShutdown` are dead in practice — implementing them costs nothing and
calls nothing. Do not write a plugin whose correctness depends on `onBoot` running;
under the frozen constructor order (`emit('boot')` → register `config.plugins` →
`emit('ready')`), it never will, for any plugin, on any instance, no matter how the
plugin is registered.

## Plugin responsibilities

A plugin's job is to **observe and react** to lifecycle phases — not to make
decisions the kernel or the strategy are responsible for, and not to reshape the
request or the kernel's own configuration out from under them.

- **Read `context`, don't rewrite `context.config`.** `ExecutionContext.config` is
  the same `AidexConfig` object the `Aidex` instance was constructed with — the
  provider identity, the logger, the plugin list itself. A plugin must never
  mutate it. Swapping `context.config.provider` from inside a hook, for instance,
  would silently violate the one-provider-per-instance guarantee the [public API doc](public-api.md)'s best
  practices rely on, for every strategy and every other plugin sharing that
  instance — and because `ExecutionContext` is a plain object, nothing in the
  kernel stops a plugin from doing this at the type level. It is a discipline the
  plugin author enforces, not something the kernel checks.
- **`context.metadata` is the sanctioned place to pass data between hooks.**
  Unlike `context.config`, `context.metadata` is exactly the free-form bag the [public API doc](public-api.md)
  describes it as, and writing to it from a hook is expected practice — it's how
  the metrics plugin below hands its own `beforeExecute` timestamp to its own
  `afterExecute` call. Merge into it (`context.metadata = { ...context.metadata,
  myKey: value }`) rather than replacing it outright, so multiple plugins sharing
  one instance don't clobber each other's entries.
- **Don't block execution by throwing, unless that is genuinely the plugin's
  intent.** A hook that throws is a hook that decided the request should not
  proceed — that's a legitimate thing for, say, a rate-limiting plugin to do on
  purpose, but it should never be an accident of a logging or metrics plugin's
  bug leaking out as a production outage.
- **Exceptions in `beforeExecute`/`afterExecute` propagate and abort
  `execute()`.** Per the [request lifecycle doc](request-lifecycle.md), `Lifecycle.emit('beforeExecute', context)` and
  `Lifecycle.emit('afterExecute', context)` are both `await`ed inside `execute()`.
  If any plugin's `beforeExecute` hook throws (or its returned promise rejects),
  that exception propagates straight out of `aidex.execute()` as a rejected
  promise — the strategy is never called, no provider request is ever made, and
  no other plugin's `beforeExecute` after it in registration order runs either.
  If a plugin's `afterExecute` hook throws, the strategy has already run and
  returned a result, but that result is discarded: the rejection replaces it as
  what `execute()` resolves to, from the caller's point of view. Neither case is
  caught, wrapped, or retried anywhere in the kernel (the [public API doc](public-api.md), the [request lifecycle doc](request-lifecycle.md)) — a
  throwing hook is exactly as fatal to that `execute()` call as a throwing
  strategy or a throwing provider.
- **`onBoot`/`onReady` exceptions are caught and logged, not left to propagate or
  go unhandled.** `boot` and `ready` are emitted from inside the synchronous
  `Aidex` constructor via
  `Lifecycle.emit()`, which is declared `async` (`kernel/lifecycle/Lifecycle.ts`).
  Because `emit()` is an `async` function, a synchronous throw inside any
  `onBoot`/`onReady` handler can **never** propagate synchronously out of
  `new Aidex(config)` — JavaScript converts any exception thrown inside an
  `async` function's body, whether before or after an `await`, into a rejected
  promise rather than a value the caller could catch with a synchronous
  `try/catch` around `new Aidex(...)`. `Aidex.ts` additionally chains a `.catch()`
  onto both the `boot` and `ready` `emit()` calls — each with its own
  phase-specific log message:
  `.catch((err) => { this.config.logger?.error('boot hook failed', err); })` on
  `emit('boot', ...)`, and
  `.catch((err) => { this.config.logger?.error('ready hook failed', err); })` on
  `emit('ready', ...)` — so whichever way an `onReady` handler fails — throwing
  synchronously, or rejecting later after an `await` — the resulting rejection
  is caught and routed to `config.logger?.error`, not left as an unhandled
  promise rejection. Since `onBoot` never fires, this is
  moot for it in practice — but it's one more reason to treat `onReady` hooks as
  best-effort, not as a place to put anything the rest of the application
  depends on having finished.

## Three example plugins

The examples below are pseudocode — illustrative shapes, not a real transport or a
real metrics/logging backend. They would live in application code (e.g.
`src/plugins/LoggingPlugin.ts`), the same way concrete strategies and providers do;
`packages/core`'s `plugins/` folder is an untouched `.gitkeep` placeholder per the [project structure doc](project-structure.md), ships no concrete plugin, and never will.

### 1. `LoggingPlugin` — the baseline observer

The simplest useful plugin: log around every request using the two hooks that
actually fire on every `execute()` call. It intentionally does **not** implement
`onBoot` — a hook that would never run has no business in an example meant to be
copied — and, if it wants a one-time "plugin is live" log line, uses `onReady`
knowing that guarantee only holds when it's supplied via `AidexConfig.plugins`.

```ts
import type { Plugin, ExecutionContext } from '@aidex/core';

class LoggingPlugin implements Plugin {
  readonly name = 'logging';

  // Fires once, but only if this plugin is passed via AidexConfig.plugins — a
  // standalone aidex.use(new LoggingPlugin()) call never sees this fire (the [request lifecycle doc](request-lifecycle.md)).
  // Deliberately NOT onBoot: under the frozen constructor order, onBoot always
  // emits to zero listeners, so an onBoot handler here would simply never run.
  onReady(context: ExecutionContext) {
    context.logger?.info(`[${this.name}] plugin ready`);
  }

  beforeExecute(context: ExecutionContext) {
    context.logger?.info(`[${this.name}] → ${context.request.strategy}`, {
      input: context.request.input,
    });
  }

  afterExecute(context: ExecutionContext) {
    context.logger?.info(`[${this.name}] ← ${context.request.strategy} done`);
  }
}
```

### 2. `MetricsPlugin` — timing a request across two hooks

The kernel does not time anything itself — there is no `context.duration` or
built-in instrumentation anywhere in this design. A plugin that wants request
duration has to capture its own start timestamp in `beforeExecute` and read it
back in `afterExecute`; `context.metadata` is exactly the sanctioned place to
stash that value for the round trip, the same mechanism the [public API doc](public-api.md)'s `timingPlugin`
usage example demonstrates.

```ts
import type { Plugin, ExecutionContext } from '@aidex/core';

class MetricsPlugin implements Plugin {
  readonly name = 'metrics';

  beforeExecute(context: ExecutionContext) {
    // The kernel provides no timing of its own — capture our own timestamp.
    context.metadata = { ...context.metadata, __metricsStartedAt: Date.now() };
  }

  afterExecute(context: ExecutionContext) {
    const startedAt = context.metadata?.__metricsStartedAt as number | undefined;
    if (startedAt === undefined) {
      // beforeExecute never ran for this request (e.g. this plugin was
      // registered after beforeExecute already fired) — nothing to measure.
      return;
    }
    const durationMs = Date.now() - startedAt;
    // Illustrative only — a real plugin would hand this to StatsD, OpenTelemetry,
    // or whatever metrics backend the application already uses. No real
    // transport is shown here.
    reportMetric('aidex.execute.duration_ms', durationMs, {
      strategy: context.request.strategy,
    });
  }
}

// Pseudocode stand-in for a real metrics client — not part of this design.
declare function reportMetric(
  name: string,
  value: number,
  tags?: Record<string, unknown>
): void;
```

This only works because `beforeExecute` and `afterExecute` are both awaited on the
same `execute()` call (the [request lifecycle doc](request-lifecycle.md)) — the plugin can rely on its own `beforeExecute`
having already run, on the same request, by the time its `afterExecute` runs for
that request. It would not work as `onBoot`/`onReady` timing (fire-and-forget,
once per instance, not once per request) — duration-per-request is precisely why
this plugin lives on `beforeExecute`/`afterExecute`, not on the construction-time
phases.

### 3. `RetryPlugin` — a sketch, and why it stops short

A "retry plugin" is a natural thing to want: catch a failed request and try it
again automatically, without every strategy re-implementing that logic itself
(the [strategy development guide](strategy-development-guide.md)'s best practices gesture at this: *"global retry policy belongs in a
plugin... not duplicated into every strategy"*). This document is where that
guidance meets the actual mechanism, and the mechanism does not support it — not
because of a bug, but because of how `execute()` is wired in this skeleton.

Here is as far as a `RetryPlugin` can get using only the five `Plugin` hooks:

```ts
import type { Plugin, ExecutionContext } from '@aidex/core';

class RetryPlugin implements Plugin {
  readonly name = 'retry';

  beforeExecute(context: ExecutionContext) {
    // Can observe/annotate the outgoing request...
    context.logger?.debug(`[${this.name}] attempt starting`, {
      strategy: context.request.strategy,
    });
  }

  afterExecute(context: ExecutionContext) {
    // ...but this only runs when strategy.execute() SUCCEEDED. There is no
    // failure-path hook to catch here — see below.
    context.logger?.debug(`[${this.name}] attempt succeeded`);
  }

  // No hook exists for "strategy.execute() threw" — this plugin has no method
  // that Lifecycle ever wires to a failure event, because no such phase exists.
}
```

Why this can't become a real retry plugin, concretely:

- **Hooks wrap `execute()` from the outside; they don't stand in for the call
  to `strategy.execute()` itself.** The kernel calls `strategy.execute(request,
  context)` directly, once, from inside its own `execute()` method (the [public API doc](public-api.md), doc
  #4) — no hook is invoked *in place of*, or *around*, that specific call. A
  plugin has no method the kernel invokes as "call the strategy, and let me
  intercept what happens."
- **`afterExecute` does not fire on the failure path at all.** Per the [public API doc](public-api.md) and
  the [request lifecycle doc](request-lifecycle.md): if `strategy.execute()` throws, that error "propagates out of
  `execute()` unchanged... `afterExecute` does not fire on this path either."
  A retry plugin's most natural instinct — "catch the failure in `afterExecute`,
  then re-invoke the strategy" — has no hook to do the catching in, because the
  one hook that runs after the strategy call simply never runs when the
  strategy fails.
- **The error goes straight to the original caller.** Since nothing in `execute()`
  catches a strategy error (the [public API doc](public-api.md): *"the kernel does not catch, wrap, or retry
  strategy errors"*), the `await aidex.execute(request)` call in application code
  rejects directly. By the time any plugin could theoretically react, the
  promise the application is awaiting has already settled as rejected.

This is a known limitation of this skeleton's plugin mechanism, not a bug to work
around cleverly: the five-hook `Plugin` interface, as frozen, has no failure-path
hook and no way to intercept or replace the single `strategy.execute()` call the
kernel makes. Real retry behavior, today, has to live in one of two places
instead:

1. **Inside the strategy itself** — the strategy's own `execute()` calls
   `context.provider.generate()` in a loop with its own backoff logic before
   returning or letting an error propagate. This is what the [strategy development guide](strategy-development-guide.md) means when it
   says retry belongs in the strategy "if that behavior is genuinely part of the
   strategy's own task."
2. **In the calling application, around `aidex.execute()`** — `try { await
   aidex.execute(request) } catch { /* retry */ }` written by whoever is calling
   `execute()`, entirely outside the kernel and outside the `Plugin` mechanism.

A future version of `Lifecycle` could close this gap by adding a failure phase
(an `onError` hook, or having `afterExecute` fire on both outcomes with a
result/error union) — but that is a change to the frozen five-phase design, not
something achievable by writing a cleverer plugin against today's interface.

## Registering a plugin

Two ways, both funneling through the same internal path (the [public API doc](public-api.md)): `use()` does
`PluginRegistry.register(plugin)` and then wires whichever hooks the plugin
defines to their matching `Lifecycle` phase.

**`aidex.use(plugin)` — after construction:**

```ts
const aidex = new Aidex({ provider: someProvider });
aidex.use(new LoggingPlugin());
aidex.use(new MetricsPlugin());
```

**`AidexConfig.plugins` — at construction:**

```ts
const aidex = new Aidex({
  provider: someProvider,
  plugins: [new LoggingPlugin(), new MetricsPlugin()],
});
```

Both register the plugin and wire the same hooks the same way — the difference is
timing, not mechanism, and it matters for exactly one hook: `onReady` only fires
for plugins supplied via `AidexConfig.plugins`, because `ready` has already fired
by the time a post-construction `aidex.use()` call runs (the [public API doc](public-api.md), the [request lifecycle doc](request-lifecycle.md)). `onBoot`
is unaffected by this choice since it never fires either way.
`beforeExecute`/`afterExecute`/`onShutdown` behave identically regardless of which
registration path was used, since those phases (or, for `onShutdown`, the phase
if it's ever wired to a trigger) aren't tied to construction timing the way
`boot`/`ready` are.

Rule of thumb: **if a plugin needs `onReady` to run, register it via
`AidexConfig.plugins`.** If a plugin only cares about `beforeExecute`/
`afterExecute` (as `MetricsPlugin` above does), either registration path works
identically, and a standalone `aidex.use()` call after construction is fine.

## Best practices

- **Never mutate `context.config`.** It's shared, it's not plugin-owned, and
  nothing in the type system stops a hook from writing to it — the discipline is
  entirely on the plugin author. Use `context.metadata` for anything a plugin
  needs to carry or communicate.
- **Write `onReady` (and any `onBoot` you add defensively) to be safe running
  zero times.** `onBoot` runs zero times, always. `onReady` runs at most once,
  and only for `config.plugins` entries — a plugin added via a later `use()`
  call never sees it. Nothing a plugin's core behavior needs should depend on
  either of these having run.
- **Keep `beforeExecute`/`afterExecute` hooks fast and side-effect-light.** They
  are awaited inline in every `execute()` call (the [request lifecycle doc](request-lifecycle.md)) — a slow or blocking
  hook adds directly to the latency of every request that flows through that
  `Aidex` instance, for every caller, not just the one that happens to trigger a
  slow path inside it.
- **Assume a throwing hook aborts the request.** If a plugin's `beforeExecute`
  or `afterExecute` might throw as a side effect of a bug (a null dereference,
  an unexpected `undefined` in `context.metadata`), that bug now aborts every
  request that plugin is wired to. Guard defensively inside hooks that aren't
  meant to be able to block execution — wrap risky work in its own `try/catch`
  and swallow-and-log rather than letting an incidental exception propagate.
- **Don't reach for a plugin to implement retry, request mutation, or anything
  that changes what a request returns.** Per the `RetryPlugin` sketch above,
  the five hooks are an observation surface, not an interception surface — they
  cannot substitute for, replace, or wrap the single `strategy.execute()` call
  the kernel makes. Behavior that changes a request's outcome belongs in the
  strategy or in application code around `aidex.execute()`, not in a plugin.
- **Prefer several small, single-purpose plugins over one large one.** `Logging`
  and `Metrics` above are deliberately separate classes wired to the same two
  phases — this is exactly the coexistence the [request lifecycle doc](request-lifecycle.md) calls out: each plugin is
  wired only to the phases it defines hooks for, so unrelated plugins on the
  same instance don't interfere with each other.

## Summary

- `Plugin` has exactly five optional hooks — `onBoot`, `onReady`,
  `beforeExecute`, `afterExecute`, `onShutdown` — plus a required `name`. No
  other hooks exist in this skeleton.
- `onBoot` never fires, for any plugin, on any instance, given the frozen
  constructor order (`emit('boot')` → register `config.plugins` →
  `emit('ready')`). `onShutdown` never fires either, because no public method
  triggers the `shutdown` phase. Only `onReady` (once, `config.plugins` entries
  only), `beforeExecute`, and `afterExecute` (every `execute()` call) are
  actually observable today.
- Plugins observe and react; they must never mutate `context.config`.
  `context.metadata` is the sanctioned channel for a hook to pass data forward
  (e.g. a start timestamp) to a later hook on the same request.
- An exception thrown (or a rejected promise returned) from `beforeExecute` or
  `afterExecute` propagates out of `aidex.execute()` and aborts that call, since
  both phases are `await`ed. `afterExecute` additionally never runs at all if
  the strategy itself throws — there is no failure-path hook.
- Real retry cannot be built from the `Plugin` hooks alone: there is no hook
  that intercepts or replaces the kernel's single `strategy.execute()` call,
  and `afterExecute` doesn't fire on the failure path where a retry decision
  would need to happen. This is a known limitation of the frozen five-phase
  design, not a bug — retry belongs in the strategy itself or in the calling
  application's own `try/catch` around `execute()`.
- Register via `aidex.use(plugin)` after construction, or via
  `AidexConfig.plugins` at construction — identical wiring mechanism, differing
  only in whether `onReady` is guaranteed to fire (only `AidexConfig.plugins`
  entries get that guarantee).
