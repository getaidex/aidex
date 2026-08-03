# Architecture FAQ

The architecture docs specified Aidex section by section: the philosophy, the folder
layout, the four public calls, the lifecycle, the Strategy/Provider/Plugin
development guides, and the design patterns underneath all of it. This
document is a companion reference, not a new source of truth — it collects
the architectural reasoning from the architecture docs into short, question-shaped
answers for a reader who wants the *why* behind a specific design choice
without re-reading the full series. Nothing below introduces a new fact
about the kernel; every claim traces back to the architecture docs, cited inline.

## Overview

Aidex is a provider-agnostic AI kernel that lets multiple applications share
one orchestration core without coupling to each other or to a specific AI
vendor (the [kernel philosophy doc](kernel-philosophy.md)). It is not a framework, not an SDK, and not a backend — it
is the smallest possible core a set of independent applications can sit on
top of: applications register their own strategies (the actual AI
workflows), inject a single provider (the model they've chosen to talk to),
and call one `execute()` method to run work through it. The kernel's job is
deliberately narrow — look up a strategy by name, run a short list of
lifecycle hooks around the call, hand back the result — so that two
applications with different products, different data models, and different
AI needs can both depend on Aidex without either one shaping what Aidex is.

## Why layered architecture

The [kernel philosophy doc](kernel-philosophy.md)'s division of labor — *"Applications decide. Kernel executes.
Strategies orchestrate. Providers generate."* — is a chain of decreasing
knowledge, read top to bottom: applications know everything about their own
purpose; the kernel knows only how to dispatch; strategies know how to
accomplish one task; providers know only how to talk to one model. No layer
reaches past its neighbor. That's what lets any layer be replaced — a new
provider, a new strategy, even a new application — without the others
noticing (the [kernel philosophy doc](kernel-philosophy.md)).

Concretely, `execute()` runs in three steps around one call (the [public API doc](public-api.md), #4):
every registered plugin's `beforeExecute` hook runs, then the kernel looks
up the named strategy — throwing `StrategyNotFoundError` immediately if it
isn't registered — then calls and awaits `strategy.execute(request,
context)`, then every registered plugin's `afterExecute` hook runs. Inside
that one `await`, the strategy builds a prompt, calls
`context.provider.generate()` (possibly more than once), and shapes the
response into a result — entirely outside the kernel's visibility (the [request lifecycle doc](request-lifecycle.md)).

The [project structure doc](project-structure.md) makes the layering checkable at the folder level: `kernel/` and
`types/` never import from `providers/`, `strategies/`, or `plugins/` — that
boundary is absolute and is the folder-level enforcement of "Aidex depends on
nobody."

## Why dependency inversion

High-level modules shouldn't depend on low-level modules; both should depend
on abstractions. The kernel never imports, constructs, or references a
concrete strategy, provider, or plugin — it depends on three interfaces
(`Strategy`, `Provider`, `Plugin`) and nothing that implements them (the [design principles doc](design-principles.md)). `kernel/Aidex.ts` is typed entirely against `types/Strategy.ts`,
`types/Provider.ts`, `types/Plugin.ts`; no file under `kernel/` imports from
`providers/`, `strategies/`, or `plugins/`.

This is the mechanism, not just the motivation, behind "Aidex depends on
nobody": a `GeminiProvider` can be swapped for an `OpenAIProvider`, or one
application's strategy swapped for another's, without one line of `kernel/`
changing, because the kernel was never coupled to the concrete class — only
to the shape it satisfies (the [design principles doc](design-principles.md)).

## Why the Strategy pattern

A `Strategy` is where the third clause of the [kernel philosophy doc](kernel-philosophy.md)'s division of labor lives —
the one piece of the system that knows how to accomplish a specific task by
talking to a provider. `types/Strategy.ts` is the common interface every
algorithm implements; `StrategyRegistry` is the name-keyed collection of
interchangeable algorithms; `Aidex.execute(request)` selects one at runtime
via `StrategyRegistry.get(request.strategy)` — a string name, not a
compile-time reference — and invokes it uniformly (the [design principles doc](design-principles.md)).

This is what lets the kernel stay ignorant of what any given strategy
actually does — build a prompt once, call a provider three times, call no
provider at all — because the Strategy pattern is precisely the discipline
that keeps "which algorithm" and "how to invoke an algorithm" as two
separate concerns (the [design principles doc](design-principles.md)). Strategies are application code: Aidex ships the
interface, not any concrete strategy (the [strategy development guide](strategy-development-guide.md)).

## Why provider abstraction, and why there's no provider registry

`Provider` is a two-method interface (`name`, `generate(prompt, options?)`)
with zero concrete, vendor-specific implementations shipped in
`packages/core` (the [provider development guide](provider-development-guide.md), #8). `Prompt` and `ProviderResponse` are
deliberately vendor-neutral — no `geminiSafetySettings` field, no
`openaiFunctionCall` field bolted on. If `Prompt` grew a field like that, a
strategy written against it would need to know which concrete provider it's
talking to, and swapping providers would silently strand
provider-specific data with no compile-time signal anything was wrong (the [provider development guide](provider-development-guide.md)). Provider-specific tuning belongs on the provider's own constructor
config, never on `Prompt`.

There is no `ProviderRegistry` because there's nothing to register: an
`Aidex` instance executes against exactly one injected `Provider` for its
entire lifetime, passed once at construction via `AidexConfig.provider`, and
the kernel never selects or swaps providers at request time (the [kernel philosophy doc](kernel-philosophy.md), #3,
#6). Provider selection is an application decision — which vendor, which
model, which credentials — not a kernel concern. If an application needs
two providers (a primary and a fallback), that's two `Aidex` instances, each
bound to one provider, not one instance with provider-switching logic
bolted on.

## Why registries are private

`StrategyRegistry` and `PluginRegistry` back `registerStrategy()` and
`use()`, but neither is ever exported from `packages/core/src/index.ts` —
they're implementation detail reachable only through the effects of the
four public calls (the [public API doc](public-api.md)). This is Composition over Inheritance in
practice: `Aidex` composes these two registries plus a private `Lifecycle`
manager as collaborators inside its own constructor, rather than exposing
their internals or building a class hierarchy applications could reach
into and override (the [design principles doc](design-principles.md)). Keeping them private is also what makes the
kernel's four-call public surface a promise that's actually keepable —
there's no fifth entry point hiding behind a registry an application could
come to depend on.

## Why the plugin architecture (Open-Closed in practice)

`Plugin` is a plain object with a required `name` and up to five optional
lifecycle hooks (`onBoot`, `onReady`, `beforeExecute`, `afterExecute`,
`onShutdown`), registered via `use()` or `AidexConfig.plugins` (the [plugin development guide](plugin-development-guide.md)). This
is the Open-Closed Principle applied literally: the five `Lifecycle` phases
are fixed extension points, closed for modification, while the unbounded
space of plugin classes that can hook into them stays open. A new
cross-cutting concern — logging, metrics, tracing, rate-limiting — is a new
class satisfying `Plugin`; `kernel/Aidex.ts` never gains an `if
(loggingEnabled)` branch or a new constructor parameter for it (the [design principles doc](design-principles.md)).

Two details worth knowing before writing a plugin: `boot` fires *before*
`config.plugins` is registered, so under the current constructor order no
plugin, from any source, ever observes `onBoot`; only plugins supplied via
`config.plugins` are guaranteed to observe `ready`, since that phase fires
after they're wired in (the [request lifecycle doc](request-lifecycle.md), #7). That's documented behavior of a
synchronous constructor (`new Aidex()` can't be `async`), not a bug.

Plugins are also an observation surface, not an interception surface — the
five hooks wrap `execute()` from the outside and cannot substitute for, or
catch failures from, the kernel's single `strategy.execute()` call.
`afterExecute` doesn't fire at all on the failure path, so retry behavior
has to live in the strategy itself or in the calling application's own
`try/catch` around `execute()` — not in a plugin (the [plugin development guide](plugin-development-guide.md)).

## Why the four-call surface is frozen

Every method on the public surface is a promise that has to be kept for as
long as applications depend on it. The design applies one test to every
proposed addition: *"if a feature is required by only one application, it
does not belong inside Aidex"* (the [kernel philosophy doc](kernel-philosophy.md), the Golden Rule). A convenience for
one application is a liability for the kernel, because the kernel can't
tell "useful" apart from "load-bearing for someone else's product" — so the
bar is deliberately strict, and the four-call surface (`new Aidex()`,
`use()`, `registerStrategy()`, `execute()`) is what survives it.

This is also why `execute(request)` takes a single extensible object
instead of a growing list of positional arguments: new capabilities (a
timeout, an abort signal, streaming, debug output) become optional fields
on `AidexRequest`/`AidexOptions`, which existing callers can simply ignore,
rather than a signature change that breaks every caller (the [kernel philosophy doc](kernel-philosophy.md), #3, #8).
The call surface is closed for modification; the payload type is open for
extension.

## Common architectural trade-offs

The design trades convenience today for stability across many consumers
over years, deliberately, not by oversight. Three concrete rigidities:

- **A frozen public API.** Four methods, no fifth without re-litigating the
  Golden Rule first. A genuinely useful one-off capability for a single
  application can't become a kernel method just because it's convenient —
  it has to live in that application's own strategy, plugin, or metadata
  instead. The cost is friction for the first application that wants
  something; the benefit is that the second and third application never
  inherit a kernel warped around the first one's needs.
- **No provider registry, no provider-swapping at request time.** One
  provider per `Aidex` instance, injected once. This rules out a single
  instance transparently load-balancing or failing over between providers —
  that has to be built as two instances plus application-level routing
  logic. The cost is that "just add a fallback provider" isn't a one-line
  kernel feature; the benefit is the kernel never has to know what
  "choosing a provider" means for any given application, keeping
  `Provider` a clean, swappable two-method interface instead of a routing
  surface with its own failure modes.
- **No built-in retry, no error wrapping.** A strategy or provider failure
  propagates straight out of `execute()`. Every application has to decide
  its own retry policy rather than getting one for free. The cost is
  duplicated retry logic across consuming applications if more than one
  wants it (at which point, per the Golden Rule, it's a candidate for a
  shared plugin — still not a kernel feature); the benefit is the kernel
  never silently masks a failure mode an application depends on seeing raw.

The common thread: every trade-off sacrifices a feature that would help
exactly one application right now, in exchange for keeping the kernel a
stable, unopinionated base that many applications can depend on without
stepping on each other.

## Multi-application design, illustrated

Two applications consuming the same kernel — one context-shaped around
identifiers like `shopId`/`queueId`/`jobId`, the other around
`designId`/`templateId`/`projectId` — is the concrete test the [kernel philosophy doc](kernel-philosophy.md)'s
Golden Rule is checked against. Each application constructs its own `Aidex`
instance, injects its own provider, registers its own strategies, and
passes its own shape of `context` into `execute()`. Neither context shape
shares a field with the other, and that's exactly the point: both are
opaque, application-defined payloads the kernel passes straight through to
whichever strategy is named in the request. If a future kernel change ever
required knowing what one of those identifiers means, that would be a
signal the change belongs in that application's own strategies, not in
Aidex (the [kernel philosophy doc](kernel-philosophy.md), the [strategy development guide](strategy-development-guide.md)'s "how strategies use `request.context`").
