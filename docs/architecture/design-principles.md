# Design Principles

The architecture docs each specified one slice of the kernel — the philosophy, the folder
layout, the four public calls, the lifecycle, and the three development guides for
the code applications write against it (`Strategy`, `Provider`, `Plugin`). None of
those documents named the design patterns underneath their own decisions; they just
made the decisions. This document is the synthesis: it names the pattern each prior
document already embodies, points at the exact kernel type or file that pattern
lives in, and closes the loop on the two questions the [kernel philosophy doc](kernel-philosophy.md) opened but didn't finish
arguing — why Aidex is not a framework, and why it is not an SDK — now that the
mechanisms that make those answers true (`Strategy`, `Plugin`, `Provider`, the
four-call surface) have actually been specified in the architecture docs.

The kernel described below is implemented and tested. Every type and file named
below has been cross-checked against the real kernel under `packages/core/src/`.

This document adds no new rules. Every principle below is a name for something
the architecture docs already required; if a claim here seems to introduce new behavior, that's
a bug in this document, not a new fact about the kernel — the prior seven documents
are the source of truth, this one is commentary on them.

## Dependency Inversion

**The principle:** high-level modules should not depend on low-level modules;
both should depend on abstractions. Aidex is built on this directly: the kernel
never imports, constructs, or references a concrete strategy, provider, or plugin.
It depends on three interfaces — `Strategy`, `Provider`, `Plugin` — and nothing
that implements them.

**Where it lives:** `packages/core/src/types/Strategy.ts`, `types/Provider.ts`,
`types/Plugin.ts` define the three interfaces. `kernel/Aidex.ts` is typed entirely
against them: `registerStrategy(strategy: Strategy)`, `AidexConfig.provider:
Provider`, `use(plugin: Plugin)`. No file under `kernel/` imports from
`providers/`, `strategies/`, or `plugins/` — the [project structure doc](project-structure.md)'s dependency-direction diagram
makes this the one rule those eight reserved folders exist to enforce: "nothing in
`kernel/` or `types/` ever imports from" them, "ever."

**Why it matters here specifically:** this is the mechanism, not just the
motivation, behind the [kernel philosophy doc](kernel-philosophy.md)'s "Aidex depends on nobody." A `GeminiProvider` can be
swapped for an `OpenAIProvider`, or a Print Platform `CheckoutStrategy` swapped for an
Design Platform `SummarizeStrategy`, without one line of `kernel/` changing, because the
kernel was never coupled to the concrete class — only to the shape it satisfies.
Inversion is what lets the [project structure doc](project-structure.md)'s `providers/`, `strategies/`, and `plugins/` stay
empty, `.gitkeep`-only folders at the skeleton stage while `kernel/` and `types/`
are already fully specified: the kernel's contracts don't need a single concrete
implementation to exist in order to be complete.

## Strategy Pattern

**The principle:** define a family of interchangeable algorithms, encapsulate each
one behind a common interface, and let the caller select which one runs at
runtime by name or reference — rather than the caller (or a chain of
conditionals) hard-coding the algorithm itself.

**Where it lives:** this is closer to a textbook match than any other pattern in
the kernel. `types/Strategy.ts` is the common interface every algorithm
implements (`execute(request, context): Promise<TResult>`); `kernel/registries/
StrategyRegistry.ts` is the name-keyed collection of interchangeable algorithms;
`Aidex.execute(request)` is the caller that selects one at runtime via
`StrategyRegistry.get(request.strategy)` — a string name, not a compile-time
reference — and invokes it uniformly. The [public API doc](public-api.md)'s execute sequence and the [request lifecycle doc](request-lifecycle.md)'s
execution-flow diagram are both, underneath the lifecycle bookkeeping, just this
pattern's dispatch step: look up the algorithm by name, call it, use its result.

**Why it matters here specifically:** the kernel gets to stay ignorant of what any
given strategy actually does — build a prompt once, call a provider three times,
call no provider at all — because Strategy pattern is precisely the discipline
that keeps "which algorithm" and "how to invoke an algorithm" as two separate
concerns. The [kernel philosophy doc](kernel-philosophy.md)'s "kernel executes, strategies orchestrate" is this pattern
stated as a division of labor rather than as a pattern name.

## Composition over Inheritance

**The principle:** build complex behavior by assembling independent collaborator
objects inside a container, rather than by inheriting shared behavior from a base
class and overriding pieces of it.

**Where it lives:** `kernel/Aidex.ts`. The [project structure doc](project-structure.md) is explicit about this shape: `Aidex`
*composes* a `StrategyRegistry`, a `PluginRegistry`, and a `Lifecycle` — three
private collaborators constructed inside `Aidex`'s own constructor (the [public API doc](public-api.md)'s
constructor sequence, step 2) — rather than `Aidex` extending some `BaseEngine` or
`AbstractKernel` class that ships default registry/lifecycle behavior for
subclasses to override. There is no class hierarchy anywhere in this design: no
`Aidex extends Engine`, no `Strategy extends BaseStrategy`, no abstract base class
of any kind. Every one of the three contracts (`Strategy`, `Provider`, `Plugin`)
is a plain interface, not a base class — implementers satisfy a shape, they never
extend one.

**Why it matters here specifically:** the [project structure doc](project-structure.md)'s dependency-direction rule — only
`kernel/Aidex.ts` is allowed to import from `registries/`, `lifecycle/`,
`errors/`, and `configuration/` "all at once" — is only sensible because those
are composed collaborators owned by `Aidex`, not superclass internals inherited
and reached into from outside. Composition is also what keeps `StrategyRegistry`
and `Lifecycle` genuinely private (never exported from `index.ts`, per the [project structure doc](project-structure.md)):
inheritance would have to expose at least the shape of a base class's protected
members to anyone subclassing it; composition lets `Aidex` hide its collaborators
completely, exposing only the four public methods the [public API doc](public-api.md) specifies.

## Open-Closed Principle, via the plugin architecture

**The principle:** software entities should be open for extension but closed for
modification — new behavior should be addable without editing the code that
already works.

**Where it lives:** `Plugin` (`types/Plugin.ts`), `PluginRegistry`
(`kernel/registries/PluginRegistry.ts`), and `Lifecycle`
(`kernel/lifecycle/Lifecycle.ts`), wired together through `Aidex.use(plugin)`.
The [plugin development guide](plugin-development-guide.md) opens by calling out exactly this: logging, metrics, and tracing are "the
canonical examples" of behavior added through this mechanism, and none of them
require touching `Aidex.ts`. A new cross-cutting concern is a new class satisfying
`Plugin`, registered via `use(plugin)` or `AidexConfig.plugins` — `kernel/Aidex.ts`
itself does not gain an `if (loggingEnabled)` branch, a new constructor
parameter, or any edit at all.

**Why it matters here specifically:** this is the concrete, file-level answer to
"how does a two-year-old kernel absorb needs nobody predicted without becoming
unstable." The [request lifecycle doc](request-lifecycle.md)'s five `Lifecycle` phases are the fixed extension points
(closed for modification — there is no sixth phase, and the [request lifecycle doc](request-lifecycle.md) is explicit that
none are placeholders); `Plugin`'s five optional hook methods, and the unbounded
number of plugin classes that can implement them, are what stays open. A team
building a rate-limiter, a cost tracker, or a request tracer six months from now
writes a `Plugin`, not a patch to `kernel/Aidex.ts` — which is also precisely how
the plugin architecture keeps the [kernel philosophy doc](kernel-philosophy.md)'s Golden Rule enforceable: an app-specific
need becomes an app-owned plugin, never a kernel-owned special case.

## Kernel Stability: the extensible-object parameter

**The principle:** a public API surface meant to survive years of unpredictable
requirements should be shaped so growth happens by *addition* to a payload, never
by *changing* a call signature.

**Where it lives:** `Aidex.execute<TResult, TContext>(request: AidexRequest
<TContext>)` (`kernel/Aidex.ts`, typed by `types/AidexRequest.ts` and
`types/AidexOptions.ts`). `execute()` takes exactly one parameter — a single
object — never a growing list of positional arguments.

**Why it matters here specifically:** the [kernel philosophy doc](kernel-philosophy.md) already made this argument in full
under "Why Kernel Stability Is the Top Design Goal," and it is restated here only
to name it as a principle rather than re-derive it: `execute(strategy, input,
timeout, stream, signal, …)` is a signature that breaks, and breaks every caller,
every time a new capability is added, while `execute(request: AidexRequest)` with
an open `options` field (`AidexOptions` carries `timeout`, `signal`, `stream`,
`debug`, plus an index signature for anything not yet named) absorbs the same new
capabilities as optional properties existing callers can ignore. The [public API doc](public-api.md)'s "the
shape of `execute()` is locked forever; what request objects are allowed to carry
is free to grow" is the design-principles-doc way of saying this is the
Open-Closed Principle applied to a function signature specifically, rather than
to a class: the call surface is closed for modification, the payload type is open
for extension. See the [kernel philosophy doc](kernel-philosophy.md) for the full two-year thought experiment this decision
is tested against — it is not repeated here.

## Why Aidex is not a framework

The [kernel philosophy doc](kernel-philosophy.md) already drew this line once, in the abstract: a framework "owns control
flow and dictates how an application is structured top to bottom," and Aidex
"owns only the narrow act of routing a request to a strategy and returns control
to the caller immediately after." The architecture docs make that claim checkable rather than
asserted, because the entire call surface Aidex ever uses to reach into
application code is now fully enumerated, and it is small and explicit:

- **`Strategy.execute(request, context)`** — called exactly once per `execute()`
  call, from inside `Aidex.execute()` (the [public API doc](public-api.md), the [request lifecycle doc](request-lifecycle.md)).
- **The `Plugin` lifecycle hooks** — `onBoot`, `onReady`, `beforeExecute`,
  `afterExecute`, `onShutdown` — called only at the five fixed phases `Lifecycle`
  knows about, and only for hooks a plugin actually defines (the [request lifecycle doc](request-lifecycle.md), the [plugin development guide](plugin-development-guide.md)).
- **`Provider.generate(prompt)`** — called by a `Strategy`, not by the kernel
  directly; `Aidex` itself "never constructs a `Prompt`, never calls
  `Provider.generate()` itself" (the [request lifecycle doc](request-lifecycle.md)).

Lay the [request lifecycle doc](request-lifecycle.md)'s execute-flow diagram on top of these and a fourth, distinct
call-out point falls out of it directly: `beforeExecute` hooks, then
`Strategy.execute` (which internally reaches `Provider.generate`), then
`afterExecute` hooks — three named categories of application code, four points
in the request flow where control passes to code Aidex did not write. The first,
second, and fourth of those are kernel-to-application handoffs (`Aidex` itself
calling a plugin hook or `Strategy.execute`); the third — the call inside
`Strategy.execute` to `Provider.generate` — is nested one level deeper and is a
strategy-to-provider handoff, not a kernel-to-provider one, exactly as the [request lifecycle doc](request-lifecycle.md)'s
diagram labels it ("Strategy-owned, not kernel code"). Outside of `execute()`,
the only other construction-time hook that actually fires is `onReady` (for
`config.plugins` entries); `onBoot` and the reserved `onShutdown` never fire
(the [request lifecycle doc](request-lifecycle.md), #7) — strictly more of the same short list, not a new category.

That is the entire inventory. A framework the size of Express, Rails, or NestJS
calls into application code at dozens of uncountable points — route handlers,
middleware chains, ORM hooks, template renderers, dependency-injection
constructors — and it decides, unilaterally, when your code runs relative to
its own internals. Aidex decides nothing about transport (there is no HTTP layer
anywhere in this design), nothing about storage (no database, no persistence
layer — the [kernel philosophy doc](kernel-philosophy.md): "it has no database"), and nothing about UI. It calls into your
code at exactly the points above, and every one of them is either a `Strategy`
you registered by name, a `Plugin` hook you opted into, or a `Provider` you
injected once at construction. Own the call sites; own the framework label.
Aidex doesn't own any that aren't in this list, so it doesn't earn the label.

## Why Aidex is not an SDK

The [kernel philosophy doc](kernel-philosophy.md) drew this line too: an SDK "exists to talk to *someone else's* product,"
and Aidex "has no product behind it." The [provider development guide](provider-development-guide.md) (the provider development guide) is
where this becomes a checkable fact about the type system rather than a claim:
`Provider` is an interface in `types/Provider.ts` with exactly two members
(`name: string` and
`generate(prompt: Prompt, options?: AidexOptions): Promise<ProviderResponse>`), and
nothing in `packages/core` ships a concrete implementation of it. There is no
`GeminiProvider`, no `OpenAIProvider`, no vendor SDK dependency anywhere in
`kernel/` or `types/` — the [provider development guide](provider-development-guide.md)'s worked `GeminiProvider` sketch is explicitly
application code, "the same way concrete strategies and providers do," living
outside the kernel package entirely, in `providers/` (the [project structure doc](project-structure.md): reserved,
`.gitkeep`-only, and never depended on by `kernel/`).

Contrast this with what an SDK actually looks like: the Stripe SDK, the AWS SDK,
the Gemini SDK each hard-code a specific vendor's request/response shapes, a
specific vendor's auth flow, a specific vendor's error taxonomy, directly into
the library's source. Swapping the vendor means swapping the SDK. Aidex cannot be
swapped out for "talking to a different provider," because Aidex was never
talking to a provider in the first place — `AidexConfig.provider` (the [public API doc](public-api.md)) is a
constructor parameter the *application* supplies, injected once, and the kernel
only ever calls the two-method `Provider` interface against whatever concrete
object was injected. Swapping Gemini for OpenAI is a one-line change to which
object gets passed into `new Aidex(config)`; nothing about `kernel/Aidex.ts`
changes, because the kernel never knew which vendor it was "for" to begin with.
An SDK wraps one product. Aidex wraps none — it is the product, and every vendor
integration is a plugin-shaped implementation detail supplied from outside it.

## Summary — one principle, one file

| Principle | Kernel type / file |
| --- | --- |
| Dependency Inversion | `types/Strategy.ts`, `types/Provider.ts`, `types/Plugin.ts` — `kernel/Aidex.ts` depends only on these |
| Strategy Pattern | `types/Strategy.ts` + `kernel/registries/StrategyRegistry.ts`, dispatched from `Aidex.execute()` |
| Composition over Inheritance | `kernel/Aidex.ts` composing `StrategyRegistry` + `PluginRegistry` + `Lifecycle`; no base class anywhere in the design |
| Open-Closed (plugin architecture) | `types/Plugin.ts` + `kernel/registries/PluginRegistry.ts` + `kernel/lifecycle/Lifecycle.ts`, extended via `use(plugin)` |
| Kernel stability (extensible payload) | `types/AidexRequest.ts` + `types/AidexOptions.ts`, the sole parameter to `Aidex.execute()` |
| Not a framework | The bounded call-out list: `Strategy.execute`, `Plugin` hooks, `Provider.generate` — nothing else, anywhere |
| Not an SDK | `types/Provider.ts` — a two-method interface with zero concrete, vendor-specific implementations in `packages/core` |

Every row in this table is a name for a decision the [kernel philosophy doc](kernel-philosophy.md) through the [plugin development guide](plugin-development-guide.md) already
made. Nothing above changes what those documents specified; it only makes the
underlying pattern explicit enough that a reviewer can ask "does this proposed
change respect Dependency Inversion / Composition / Open-Closed here" as a
concrete question with a concrete file to check, rather than an abstract
appeal to "good design."
