# @aidex/core

## Installation

```sh
pnpm add @aidex/core
```

```sh
npm install @aidex/core
```

The Aidex kernel. This is the one package in the entire platform every other
package ultimately depends on — and the one package that depends on nothing.
It is frozen: architecture-complete, not under active redesign, and every
other package in this repository (`providers`, `strategies`, `plugins`,
`engines`, `prompts`, `tools`, `workflow`, `memory`, `observability`,
`evaluation`, `sdk`, `adapters`, `cli`) treats it as a stable foundation to
build on, not a moving target.

## What this is

`@aidex/core` is a **kernel**, not a framework and not an SDK for any
particular AI vendor. It owns exactly one job: given a request that names a
registered `Strategy`, dispatch to that strategy, sequence a small set of
lifecycle hooks around the call, and hand back whatever the strategy
produces. It has no opinion about which AI provider you use, what your
application does, or how you talk to it — Gemini, OpenAI, a stub, a
mainframe: the kernel cannot tell the difference, by design.

## Philosophy

*"Applications decide. Kernel executes. Strategies orchestrate. Providers
generate."*

The kernel's entire design rests on one governing test — the **Golden
Rule**: *if a feature is required by only one application, it does not
belong inside Aidex.* Every decision about what's in this package and what
isn't traces back to that sentence. The public surface is four methods,
frozen, on purpose: a signature that never grows keeps every application
built on this kernel safe from breaking changes for years, at the cost of
the kernel staying small forever. Growth happens by *addition* to the
request payload (`AidexRequest`/`AidexOptions` can gain optional fields),
never by adding a fifth method.

## Responsibilities

The kernel, and only the kernel, owns:

- **Dispatch** — looking up a `Strategy` by the name in `request.strategy`
  and calling it.
- **Lifecycle sequencing** — five phases (`boot`, `ready`, `beforeExecute`,
  `afterExecute`, `shutdown`), each wired to whichever `Plugin` hooks
  registered for it, fired in a fixed, documented order.
- **Registry bookkeeping** — `StrategyRegistry` and `PluginRegistry`,
  private, name-keyed maps that reject duplicate registrations
  (`DuplicateRegistrationError`) rather than silently overwriting.
- **The two public error types** the kernel itself can throw
  (`StrategyNotFoundError`, `DuplicateRegistrationError`) — fail-loud
  signals for configuration mistakes, not conditions callers are meant to
  branch on.
- **The shared vocabulary** every other package is written against:
  `AidexRequest`, `AidexOptions`, `ExecutionContext`, `Prompt`,
  `ProviderResponse`, `Metadata`, and the three contracts —
  `Strategy`, `Provider`, `Plugin` — that application code implements.

## What does NOT belong in the kernel

Everything else. Concretely, none of the following will ever be added here,
regardless of how convenient it would be:

- **No concrete `Provider`.** No `GeminiProvider`, no HTTP client, no vendor
  SDK dependency of any kind. `packages/core` has zero runtime dependencies
  — verified, not aspirational.
- **No concrete `Strategy` or `Plugin`.** No business logic, no prompt
  templates, no task-specific orchestration.
- **No provider registry, no provider selection, no runtime provider
  switching, no fallback/retry between providers.** `AidexConfig.provider`
  is exactly one `Provider`, injected once, for the instance's lifetime. An
  application that needs two providers constructs two `Aidex` instances —
  that is an application-level decision, never a kernel feature. (This is a
  settled architectural position — see `ADR-001` — not an oversight.)
- **No storage, no database, no persistence of any kind.**
- **No transport layer.** No HTTP server, no routing — the kernel doesn't
  know or care how a request reached it.
- **No configuration loading, no environment-variable reading, no secrets
  handling.** The kernel never touches `process.env`; every value in
  `AidexConfig` is supplied by the caller.
- **No application-specific concept of any kind** — no product names, no
  tenant IDs, no domain models. `AidexConfig.metadata` exists precisely so an
  application has somewhere to put data like this without it becoming a
  named field the kernel has to understand.

## Public API

Four calls, and nothing else:

```ts
const aidex = new Aidex(config);       // construct, injecting exactly one Provider
aidex.use(plugin);                     // register a cross-cutting Plugin
aidex.registerStrategy(strategy);      // make a Strategy callable by name
const result = await aidex.execute(request); // dispatch by request.strategy
```

Everything importable from `@aidex/core`:

```ts
import {
  Aidex,                                        // the kernel class
  StrategyNotFoundError,                        // thrown by execute() for an unknown strategy name
  DuplicateRegistrationError,                   // thrown by registerStrategy()/use() on a name collision
  type AidexConfig,                              // { name?, version?, provider, logger?, plugins?, metadata? }
  type AidexRequest,                             // { strategy, input?, context?, metadata?, options? }
  type AidexOptions,                             // { timeout?, signal?, stream?, debug?, [extension]: unknown }
  type ExecutionContext,                        // { config, provider, logger?, request?, metadata? }
  type Prompt,                                  // { content, metadata? } — provider-agnostic input
  type ProviderResponse,                        // { content, raw?, metadata? } — provider-agnostic output
  type Metadata,                                // Record<string, unknown>
  type Strategy,                                // { name, version?, execute(request, context) }
  type Provider,                                // { name, generate(prompt, options?) }
  type Plugin,                                  // { name, onBoot?, onReady?, beforeExecute?, afterExecute?, onShutdown? }
  type ILogger,                                 // { debug, info, warn, error }
} from '@aidex/core';
```

**Never exported, on purpose:** `Lifecycle`, `StrategyRegistry`,
`PluginRegistry`. These are private implementation detail of `Aidex` — an
application can observe their *effects* (a strategy becomes callable; a
duplicate name throws) but can never import or construct them directly. If
a change ever seems to need a fifth public method or a newly-exported
internal class, that's a signal to revisit the Golden Rule before adding
one, not a reason to add one.

## Dependency rules

- **`@aidex/core` depends on nothing** — `package.json` declares zero
  dependencies, and it stays that way. This is the one package everything
  else in the repository is allowed to assume is always safe to depend on.
- **The dependency arrow only ever points *into* `@aidex/core`, never out of
  it.** Nothing in this package imports from `providers`, `strategies`,
  `plugins`, or any other package in this repository — checkable at any
  commit, not just claimed.
- Within the package itself: only `kernel/Aidex.ts` may import from
  `kernel/registries/`, `kernel/lifecycle/`, `kernel/errors/`, and
  `kernel/configuration/` all at once — it's the one composition point.
  `types/*` imports from nothing else in the package; everything else may
  depend on `types/`, never the reverse.
- Eight reserved folders (`providers/`, `strategies/`, `plugins/`,
  `builders/`, `validators/`, `prompts/`, `shared/`, `utils/`) exist inside
  `src/` as empty, `.gitkeep`-only placeholders. Nothing in `kernel/` or
  `types/` ever imports from them — they exist to make the kernel/app-land
  boundary visible in the folder structure itself, not to hold kernel code.

## Execution flow

What actually happens, in order, for `new Aidex(config)`:

1. Store `config`. Construct the three private collaborators (`Lifecycle`,
   `StrategyRegistry`, `PluginRegistry`) — composed, not inherited.
2. Emit `boot`. No plugin has been wired yet at this point (step 3 hasn't
   run), so this always fires to zero listeners — `onBoot` is inert on every
   real `Aidex` instance, by the frozen ordering, not by accident.
3. Register each `config.plugins` entry via the internal `use()` path.
4. Emit `ready` — every `config.plugins` entry's `onReady` hook (if defined)
   runs here. A plugin added later via a standalone `aidex.use()` call never
   sees `ready`, since it fires only once, during construction.

And for `await aidex.execute(request)`:

1. Emit `beforeExecute` — every currently-registered plugin's hook runs, in
   registration order, fully awaited.
2. Look up `request.strategy` in `StrategyRegistry`. Not found → throw
   `StrategyNotFoundError` immediately; no strategy or provider code runs.
3. `await strategy.execute(request, context)` — entirely strategy-owned.
   The kernel has no visibility into what happens inside: whether it builds
   a `Prompt`, calls `context.provider.generate()`, how many times, or how
   it shapes the result.
4. Emit `afterExecute` — every registered plugin's hook runs. This step is
   skipped entirely if step 3 threw; the kernel does not catch, wrap, or
   retry a strategy's error.
5. Return the strategy's result to the caller.

## Example usage

```ts
import { Aidex, type Provider, type Strategy } from '@aidex/core';

// A minimal stub Provider — a real one (Gemini, OpenAI, ...) is app-land,
// implemented in a separate package, never inside the kernel.
const stubProvider: Provider = {
  name: 'stub-provider',
  async generate(prompt) {
    return { content: `echo: ${prompt.content}` };
  },
};

// A minimal stub Strategy — a real one builds a Prompt, calls the provider,
// and converts the response into its own result shape.
const greetStrategy: Strategy<string> = {
  name: 'greet',
  async execute(request) {
    return `hello, ${String(request.input)}`;
  },
};

const aidex = new Aidex({ provider: stubProvider });
aidex.registerStrategy(greetStrategy);

const result = await aidex.execute<string>({ strategy: 'greet', input: 'world' });
console.log(result); // "hello, world"
```

## Relationship with SDK, Providers, and Engines

- **`@aidex/sdk`** sits *above* the kernel, never beside or inside it. It
  never modifies or re-implements anything here — `AIBuilder.build()`
  literally calls `new Aidex(...)` and `.registerStrategy(...)`, the same
  two calls an application would make directly. The SDK exists because the
  kernel's four-call surface, while intentionally minimal, still requires
  knowing about providers, strategies, and plugins as separate concepts
  before generating one line of text; the SDK hides that assembly behind a
  smaller façade (`AI`, `AIBuilder`). `@aidex/sdk` does not export `Aidex`
  itself, or any kernel type — an application using only the SDK never
  needs to import `@aidex/core` directly.
- **`@aidex/providers`** supplies concrete `Provider` implementations
  (`GeminiProvider`, `StubProvider`) that satisfy this package's `Provider`
  interface. The kernel never constructs, imports, or knows about any of
  them — it only ever calls the two-method shape it depends on
  (`name`, `generate(prompt, options?)`). Swapping `GeminiProvider` for a
  future `OpenAIProvider` requires zero changes here, by construction.
- **`@aidex/engines`** is a separate, independent registry
  (`Engine`/`EngineRegistry`) built for a different dispatch shape
  (`execute(context)` by `id`, with `name`/`description`/`version`), living
  entirely outside `packages/core`. It reuses this package's
  `ExecutionContext` and `DuplicateRegistrationError` types rather than
  duplicating them, but the kernel has no reference to `EngineRegistry` and
  never will — engines are dispatched independently of `Aidex.execute()`,
  not through it.

In every case the relationship is the same shape: the dependent package
imports this package's public types and composes them; this package never
imports anything back.
