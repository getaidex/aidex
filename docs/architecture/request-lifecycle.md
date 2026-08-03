# Request Lifecycle

The [public API doc](public-api.md) specified the four public calls and, along the way,
walked through the constructor and `execute()` sequences to explain what each call
does. This document takes the mechanism underneath those sequences — the
`Lifecycle` manager — and makes it the subject rather than a supporting detail: the
five phases it knows about, exactly when each one fires, how `use(plugin)` wires a
plugin's hook methods to it, the full request-execution flow through a `Strategy`
and a `Provider`, and the synchronous-constructor constraint that makes `boot`/
`ready` fire-and-forget while `beforeExecute`/`afterExecute` are properly awaited.

The kernel described below is implemented and tested — everything in this document
has been cross-checked against the real `packages/core/src/kernel/lifecycle/Lifecycle.ts`
and `packages/core/src/kernel/Aidex.ts`.

## `Lifecycle` in one sentence

`Lifecycle` (private, `kernel/lifecycle/Lifecycle.ts`) is a small phase-keyed
event emitter: `on(phase, handler)` attaches a handler to a phase, `emit(phase,
context)` invokes every handler attached to that phase, in the order it was
attached, passing the shared `ExecutionContext`. `Aidex.ts` is the only place that
calls `emit()`. `use(plugin)` is the only place that calls `on()`. Nothing about
`Lifecycle` is exported from `packages/core/src/index.ts` — an application never
touches it directly, only through the effects of `use()` and `execute()`.

## The five phases

Exactly five phases exist. There are no others, and none are placeholders — every
one of them is backed by a real `emit()` call site or, in `shutdown`'s case,
explicitly not yet backed by one (see below).

| Phase | Fires when | Who can observe it |
| --- | --- | --- |
| `boot` | Start of `new Aidex(config)`, immediately after the base `ExecutionContext` is built, *before* `config.plugins` are registered | No one — see "Why `boot` is unobservable" below |
| `ready` | End of `new Aidex(config)`, after every `config.plugins` entry has been registered | Only plugins supplied via `config.plugins` |
| `beforeExecute` | Start of every `aidex.execute(request)` call, before strategy lookup | Every plugin registered by that point, from any source |
| `afterExecute` | End of every `aidex.execute(request)` call, after the strategy has resolved | Every plugin registered by that point, from any source |
| `shutdown` | Never, in this skeleton — reserved | No one; see "`shutdown` is reserved, not wired" below |

### Why `boot` is unobservable

This is the single most important fact in this document, and it corrects an
earlier draft of the public API doc that read as if `onBoot` were a working hook
for `config.plugins` entries. It is not, given the frozen constructor order.

`Aidex`'s constructor emits `boot` *before* it registers `config.plugins`:

```
constructor(config):
  1. store config
  2. construct Lifecycle, StrategyRegistry, PluginRegistry
  3. lifecycle.emit('boot', buildContext())   ← no plugin is wired yet
  4. register each config.plugins entry via use()
  5. lifecycle.emit('ready', buildContext())  ← config.plugins entries are wired now
```

Steps 3 and 5 above each call `buildContext()` independently — the real
constructor calls `this.buildContext()` once per `emit()` call rather than
building one `ExecutionContext` up front and reusing it for both `boot` and
`ready`. The two resulting objects are value-equal (since no request exists
at construction time) but are distinct instances, not the same `context`
variable referenced twice.

At step 3, `Lifecycle` has zero handlers attached to `boot`, because the only
thing that attaches a handler to any phase is `use(plugin)`, and `use()` hasn't
run for a single plugin yet — not for `config.plugins` (that's step 4, which comes
*after* `boot`), and not for a plugin added later via a standalone `aidex.use()`
call (that happens after the constructor has already returned, long after `boot`
fired and finished). So `boot` always emits to an empty listener list. No plugin,
registered any way, on any `Aidex` instance, ever has its `onBoot` hook invoked.

`onBoot` still exists on the `Plugin` interface. It is forward-compatible
plumbing — a hook a future version of this constructor sequence could make real —
not a currently-working extension point. Treat it as effectively inert: writing an
`onBoot` handler today costs nothing and calls nothing.

`ready`, by contrast, is genuinely observable, but only for one specific set of
plugins. Because `config.plugins` registration (step 4) happens strictly between
`boot` (step 3) and `ready` (step 5), every plugin listed in `config.plugins` is
wired before `ready` fires and therefore does see its `onReady` hook run exactly
once. A plugin added afterward via a standalone `aidex.use(plugin)` call is wired
too late for either phase — both `boot` and `ready` have already fired by the time
that call executes — so it never observes `onBoot` or `onReady` on that instance.
It can still observe `beforeExecute`, `afterExecute`, and (if the phase is ever
wired to a real trigger) `onShutdown`, since those phases are emitted repeatedly
or in the future, not once during construction.

This matches the [public API doc](public-api.md)'s corrected phrasing exactly: `boot` fires with zero
listeners under the frozen constructor order, and only `config.plugins` entries
are guaranteed to observe `ready`.

### `shutdown` is reserved, not wired

`shutdown` is a real phase — `Plugin.onShutdown` exists as a hook, and `Lifecycle`
is capable of emitting a `shutdown` phase and running handlers attached to it.
What does not exist in this skeleton is any public method that calls
`lifecycle.emit('shutdown', context)`. `Aidex`'s public surface is exactly four
members (`new Aidex()`, `use()`, `registerStrategy()`, `execute()` — see the [public API doc](public-api.md)),
and none of them is a `shutdown()` method. There is no code path, anywhere in this
design, that ever fires `shutdown` on a real `Aidex` instance.

Document this plainly rather than implying otherwise: `shutdown` is reserved for
a future version of the kernel that adds an explicit teardown call (or ties into a
process-level signal). Until that lands, `onShutdown` is exactly as inert as
`onBoot` — a plugin can implement it, and it will simply never run.

## Plugin lifecycle wiring

`use(plugin)` is the only place a plugin's hook methods get attached to
`Lifecycle`. A `Plugin` is a plain object with a required `name` and up to five
optional hook methods:

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

`use(plugin)` does two things, in order:

1. `PluginRegistry.register(plugin)` — records the plugin so it's known to exist.
2. For each hook method the plugin actually defines, call `lifecycle.on(phase,
   handler)` with the matching phase name:

   | Plugin method | Wired to phase |
   | --- | --- |
   | `onBoot` | `boot` |
   | `onReady` | `ready` |
   | `beforeExecute` | `beforeExecute` |
   | `afterExecute` | `afterExecute` |
   | `onShutdown` | `shutdown` |

Hooks are entirely optional and independent — a plugin implements any subset of
the five, including none, one, or all. A plugin that only defines `afterExecute`
is wired to exactly one phase; nothing is attached for the four it leaves
undefined, and `Lifecycle` never invokes a phase for a plugin that didn't ask for
it. This is why a logging plugin and a timing plugin (see the [public API doc](public-api.md)'s usage example)
can coexist without interfering: each is wired only to the phases it actually
cares about.

Whether a given hook ever *runs* depends entirely on when `use()` was called
relative to `boot`/`ready` (see above) — wiring and firing are two different
things. A hook being wired (attached via `on()`) does not guarantee it is ever
invoked (via `emit()`); `onBoot` is wired for every plugin that defines it and
invoked for none of them.

## Fire-and-forget vs. awaited: why the two phase pairs behave differently

`boot` and `ready` are emitted from inside the `Aidex` constructor. JavaScript
constructors cannot be `async` — `new Aidex(config)` must return an `Aidex`
instance synchronously, not a `Promise<Aidex>`. That constraint has a direct
consequence for any `onBoot`/`onReady` handler that returns a `Promise` (i.e., is
declared `async` or otherwise returns a promise): the constructor calls it and
moves on without waiting for that promise to settle. The handler's synchronous
portion (everything before its first `await`) runs before the constructor
returns; the rest of it — anything after an `await` — keeps running in the
background, on its own schedule, with no guarantee it completes before the
constructor call finishes, before `registerStrategy()` is called, or even before
the first `execute()` call runs. This is what "fire-and-forget" means here: the
lifecycle manager invokes the handler and does not wait for its returned promise to
*resolve* before the constructor returns or before any subsequent step runs.

"Fire-and-forget" describes not waiting for success — it does not mean a failure
goes untracked. `Aidex.ts` chains `.catch((err) => this.config.logger?.error(...))`
onto both the `boot` and `ready` `emit()` calls, so if an `onBoot`/`onReady`
handler's promise *rejects* — whether the handler throws synchronously or rejects
later after an `await` (both become a rejected promise the same way, since
`Lifecycle.emit` is itself an `async` function, and a synchronous throw inside an
`async` function's body can never propagate synchronously to its caller — see the [plugin development guide](plugin-development-guide.md)'s plugin exception notes) — that rejection is caught and routed to
`config.logger?.error`, not left as an unhandled promise rejection. What
genuinely goes untracked is *resolution*: the constructor does not wait for the
handler's promise to fulfill, and does not know or care when a successful
handler's async work finishes.

In practice this mostly matters for `ready`, since `boot` never has a listener to
begin with (see above). A `config.plugins` entry with an `async onReady` that
awaits, say, a remote config fetch is not guaranteed to have finished that fetch
by the time `new Aidex(config)` returns to the caller. Code that runs immediately
after construction (e.g., the very first `execute()` call) can execute before
that `onReady` handler's async work completes.

`beforeExecute` and `afterExecute` are different, because `execute()` is an
`async` method and *can* return a `Promise` — there is no synchronous-constructor
constraint here. `Lifecycle.emit('beforeExecute', context)` and
`Lifecycle.emit('afterExecute', context)` are both awaited inside `execute()`, so
every `beforeExecute` handler (async or not) is guaranteed to finish before
strategy lookup begins, and every `afterExecute` handler is guaranteed to finish
before `execute()` resolves and hands a result back to the caller. An async
`beforeExecute` hook that needs to do real work — checking a rate limit,
attaching tracing metadata it fetched over the network — can rely on that work
completing before the strategy ever runs.

The rule of thumb: only `beforeExecute`/`afterExecute` handlers can safely assume
their async work has finished by the time the surrounding call returns.
`boot`/`ready` handlers cannot make that assumption, on top of `boot` never
running at all.

## Execution flow, end to end

`execute()` is the one phase pair a request actually flows through, and the
kernel's role in that flow is narrow: dispatch to a `Strategy` and sequence two
lifecycle phases around the call. Everything between `Strategy.execute(...)` and
its return is **Strategy-owned** — the kernel calls into it and awaits the
result, but has no knowledge of what happens inside.

```
Kernel.execute(request)
  → beforeExecute                                    ← kernel: lifecycle phase
  → StrategyRegistry.get(request.strategy)            ← kernel: lookup
  → Strategy.execute(request, context)                ← kernel calls in, then waits
      → Strategy builds a Prompt                      ┐
      → Provider.generate(prompt) → ProviderResponse   ├─ Strategy-owned,
      → Strategy converts ProviderResponse → TResult   ┘  not kernel code
  → afterExecute                                      ← kernel: lifecycle phase
  → return result                                     ← kernel: hand back to caller
```

The three indented lines are entirely outside the kernel's responsibility. `Aidex`
never constructs a `Prompt`, never calls `Provider.generate()` itself, and never
inspects a `ProviderResponse` — it hands `request` and `context` (which carries
the injected `Provider`) to the strategy and awaits whatever `Promise<TResult>`
comes back. How a strategy builds its prompt, how many times it calls the
provider, and how it shapes the response into `TResult` are exactly the concerns
the [strategy development guide](strategy-development-guide.md) (strategy development guide) and the [provider development guide](provider-development-guide.md) (provider development guide) cover
— this document stops at the boundary of `strategy.execute(...)`.

## Sequence: boot flow (`new Aidex(config)`)

1. Caller invokes `new Aidex(config)`.
2. Kernel stores `config` on the instance.
3. Kernel constructs the three private collaborators: `Lifecycle`,
   `StrategyRegistry`, `PluginRegistry`. None have any listeners or registrations
   yet.
4. Kernel calls `lifecycle.emit('boot', context)`, where `context` is a freshly
   built `ExecutionContext` from `config` (provider, logger, metadata) — built
   by calling `this.buildContext()` at this point specifically. This is not a
   shared `ExecutionContext` built once up front and reused for `ready`
   below; the real constructor calls `buildContext()` independently for each
   `emit()` call.
   - Handlers invoked: **none** — `Lifecycle` has zero `boot` listeners at this
     point, because no plugin has been wired yet (`config.plugins` registration
     is the next step). No `onBoot` hook runs.
   - This `emit()` call is chained with
     `.catch((err) => this.config.logger?.error('boot hook failed', err))`
     regardless — moot today since there are zero listeners to reject, but
     present in the real code for consistency with the `ready` emission below.
5. Kernel registers each `config.plugins` entry via the internal `use()` path:
   for each plugin, `PluginRegistry.register(plugin)` runs, then each hook the
   plugin defines is wired to its matching phase via `lifecycle.on(phase, ...)`.
6. Kernel calls `lifecycle.emit('ready', context)`, where `context` here is a
   second, independently built `ExecutionContext` — a distinct object from
   the one built for `boot` in step 4, though value-equal to it since no
   request exists yet.
   - Handlers invoked: every `onReady` hook defined by a `config.plugins` entry,
     in registration order. Each handler is invoked but not awaited (see
     "Fire-and-forget" above) — the constructor does not wait for any returned
     promise to settle.
   - This `emit()` call is chained with
     `.catch((err) => this.config.logger?.error('ready hook failed', err))`,
     so if a handler's returned promise rejects, that rejection is caught and
     logged rather than left as an unhandled rejection — "not awaited" (no
     waiting for success) is not the same thing as "failure goes untracked."
7. Constructor returns the `Aidex` instance to the caller. `boot` and `ready` will
   never fire again on this instance.

## Sequence: execute flow (`await aidex.execute(request)`)

1. Caller invokes `aidex.execute(request)` and awaits the returned promise.
2. Kernel calls and awaits `lifecycle.emit('beforeExecute', context)`.
   - Handlers invoked: every currently-registered plugin's `beforeExecute` hook
     (if defined), in registration order. `execute()` does not proceed to step 3
     until all of these have resolved.
3. Kernel calls `StrategyRegistry.get(request.strategy)`.
   - Not found → throw `StrategyNotFoundError(request.strategy)` and stop here.
     `afterExecute` does **not** fire on this path, and no provider call ever
     happens.
   - Found → continue to step 4.
4. Kernel calls and awaits `strategy.execute(request, context)`. This is the
   Strategy-owned block from the execution-flow diagram above: the strategy
   builds a `Prompt`, calls `context.provider.generate(prompt)` to get a
   `ProviderResponse`, and converts that into `TResult`. Any error thrown here
   (including a provider failure) propagates out of `execute()` unchanged — the
   kernel does not catch, wrap, or retry it, and `afterExecute` does not run on
   this path either.
5. Kernel calls and awaits `lifecycle.emit('afterExecute', context)`.
   - Handlers invoked: every currently-registered plugin's `afterExecute` hook
     (if defined), in registration order. `execute()` does not resolve until all
     of these have finished.
6. Kernel returns the strategy's result to the caller as the resolved value of
   the `execute()` promise.

This sequence runs in full on every call to `execute()` — unlike `boot`/`ready`,
`beforeExecute`/`afterExecute` are not one-time events; they wrap every request,
for the lifetime of the `Aidex` instance.

## Summary

- Five phases exist: `boot`, `ready`, `beforeExecute`, `afterExecute`, `shutdown`.
  No sixth phase, and no placeholder phases like `beforeValidation` or
  `beforeBuilder` — those systems (validators, builders) aren't implemented yet
  and have no lifecycle hooks reserved for them in this skeleton.
- `boot` fires once, during construction, before any plugin is wired — it is
  observed by no plugin, ever, from any registration source.
- `ready` fires once, during construction, after `config.plugins` is registered
  — only `config.plugins` entries observe it; plugins added later via `use()`
  never do.
- `beforeExecute`/`afterExecute` fire on every `execute()` call, observed by
  whichever plugins are registered at that point, from any source.
- `shutdown` is reserved: the hook and the phase exist, but no public method
  triggers it in this skeleton.
- `boot`/`ready` handlers are invoked fire-and-forget, because `new Aidex()`
  cannot be `async`; `beforeExecute`/`afterExecute` handlers are properly awaited,
  because `execute()` is `async`.
- The Strategy → Provider portion of the execute flow (building a `Prompt`,
  calling `Provider.generate()`, converting a `ProviderResponse` to `TResult`) is
  entirely Strategy-owned; the kernel calls into it once and awaits the result,
  with no visibility into what happens inside.
