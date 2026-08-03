# Provider Development Guide

The [strategy development guide](strategy-development-guide.md) covered the half of the
Strategy↔Provider relationship that lives in application code: a `Strategy`
builds a `Prompt`, calls `context.provider.generate()`, and converts the
`ProviderResponse` it gets back into a result — never constructing a provider
itself, never assuming which concrete provider is behind `context.provider`.
This document covers the other half: the `Provider` interface itself, the
`Prompt`/`ProviderResponse` contracts a provider must honor on both sides, how
the kernel wires exactly one provider into an `Aidex` instance, and a worked
sketch of what a concrete provider (`GeminiProvider`) looks like when someone
actually builds one.

The kernel described below is implemented and tested — the `Provider` interface
in this document has been cross-checked against the real
`packages/core/src/types/Provider.ts`. No concrete provider ships in
`packages/core` — providers remain application code, as described below.

## What a Provider is

Recall the [kernel philosophy doc](kernel-philosophy.md)'s division of labor one more time: *"Applications decide. Kernel
executes. Strategies orchestrate. Providers generate."* A `Provider` is where
that fourth clause lives — it is the one piece of the system that actually
talks to an AI model. Everything upstream of it (the `Strategy`) knows only how
to build a `Prompt` and interpret a `ProviderResponse`; a `Provider` knows only
how to turn the one into the other. It does not know what task it is being
used for, what application is calling it, or what a `Strategy` intends to do
with the response — it receives a `Prompt`, produces a `ProviderResponse`, and
nothing else is its concern.

Like strategies, providers are **application code**. Aidex ships the `Provider`
interface as a contract in `packages/core/src/types/Provider.ts`; it does not
ship any concrete provider — `packages/core/src/providers/` is untouched,
`.gitkeep`-only, reserved for future concrete providers that live in app-land
or in a separate package, never inside the kernel itself. This follows the
Golden Rule directly: today Aidex has exactly one concrete provider on its
roadmap for Print Platform/Design Platform use (Gemini), and picking a specific AI vendor's
SDK, auth model, and response shape is exactly the kind of single-application
concern that does not belong inside a kernel meant to be provider-agnostic.

## The `Provider` interface (locked)

```ts
interface Provider {
  readonly name: string;
  generate(prompt: Prompt, options?: AidexOptions): Promise<ProviderResponse>;
}
```

Two members, both already introduced in the [public API doc](public-api.md) (construction via
`AidexConfig.provider`) and the [request lifecycle doc](request-lifecycle.md)/the [strategy development guide](strategy-development-guide.md) (the execution flow calling
`context.provider.generate()`) — this document is where each is specified for
the person actually implementing one:

- **`name: string`** — an identifier for the provider instance, readable at
  `context.provider.name` inside a strategy or plugin (for logging or
  diagnostics only — the [strategy development guide](strategy-development-guide.md) is explicit that a strategy must never branch on
  it, e.g. `context.provider.name === 'gemini'`, since that reintroduces
  provider-specific behavior into code meant to stay provider-agnostic). It is
  not looked up by the kernel and does not drive any dispatch — there is no
  provider registry keyed by `name` the way `StrategyRegistry` is keyed by a
  strategy's `name`. It exists purely so the one provider an `Aidex` instance
  holds can identify itself.
- **`generate(prompt: Prompt, options?: AidexOptions): Promise<ProviderResponse>`**
  — the one method every provider must implement. It takes a `Prompt` (the
  provider-agnostic hand-off from a strategy) and an optional `AidexOptions`,
  and resolves to a `ProviderResponse`. Note what the options parameter is
  *not*: the frozen design deliberately reuses `AidexOptions` — the same type
  used for `AidexRequest.options` — rather than introducing a separate
  `ProviderOptions` type for the same concept — avoiding a second
  abstraction for the same concept. A strategy typically passes `request.options`
  straight through as `context.provider.generate(prompt, request.options)`
  (the [strategy development guide](strategy-development-guide.md)'s `EchoStrategy` example does exactly this); a provider implementation
  reads whatever subset of `AidexOptions` it understands (`timeout`, `signal`,
  `stream`, `debug`, or a provider-specific key via the `[key: string]:
  unknown` index signature) and ignores the rest.

## The `Prompt` and `ProviderResponse` contracts

```ts
// types/Prompt.ts
interface Prompt {
  readonly content: string;
  readonly metadata?: Metadata;
}

// types/ProviderResponse.ts
interface ProviderResponse {
  readonly content: string;
  readonly raw?: unknown;
  readonly metadata?: Metadata;
}
```

Both are minimal on purpose. `Prompt` is the input side of `generate()`:
a `content` string (whatever text a strategy decided to send — a system
prompt, a user message, an already-assembled multi-turn transcript rendered to
a single string, however that strategy chooses to build it) plus an optional
`metadata` bag (`Record<string, unknown>`, per `types/Metadata.ts`) a strategy
can attach for its own purposes — tagging which strategy produced it, a trace
ID, anything a provider or a plugin observing the call might find useful.
`ProviderResponse` is the output side: the same `content: string` shape for
the provider's answer, an optional `metadata` bag for anything the provider
wants to attach back, and one extra field a `Prompt` does not have — `raw?:
unknown`, an escape hatch for the provider's full, untyped native response
object, there for a strategy or application that genuinely needs to inspect
something an SDK returned beyond `content` (a token count, a finish reason, a
citation list) without the kernel having to model every AI vendor's response
shape as a first-class type.

### Why `Prompt` has no provider-specific fields

This is the load-bearing design decision in this document, and it is worth
stating explicitly rather than leaving it implicit in the shape above:
`Prompt` is the **provider-agnostic** communication layer between a `Strategy`
and a `Provider` (the [request lifecycle doc](request-lifecycle.md)'s type contracts call it exactly that), and it stays
that way by construction — nothing on it names a vendor. There is no
`geminiSafetySettings` field, no `openaiFunctionCall` field, no
`anthropicSystemPrompt` field bolted onto `Prompt` to carry one provider's
particular knobs. If `Prompt` grew a field like that, two things break at
once: a strategy written against `Prompt` would need to know which concrete
provider it is talking to in order to fill that field in correctly — exactly
the coupling the [strategy development guide](strategy-development-guide.md)'s "never assume a specific provider implementation"
rule forbids — and swapping the `Provider` an `Aidex` instance is configured
with (the [public API doc](public-api.md): one `Provider`, injected once, for the instance's lifetime)
would silently strand whatever provider-specific data a strategy had been
populating, with no compile-time signal that anything was wrong.

The correct place for provider-specific tuning is inside the `Provider`
implementation itself, not on `Prompt`. A `GeminiProvider` that wants specific
safety settings, a specific model name, or a specific generation-config knob
sets those as constructor-time configuration on the provider object (see the
worked sketch below) or reads them out of the provider-agnostic `AidexOptions`
via its index signature (`options?.someProviderSpecificKey`) — never by
asking `Prompt` to carry a field only one vendor's SDK understands. A strategy
builds one `Prompt` shape regardless of which concrete `Provider` ends up
receiving it; that is precisely what "provider-agnostic hand-off" means and
precisely what lets the [strategy development guide](strategy-development-guide.md)'s `EchoStrategy` be written, tested, and shipped
without ever importing a Gemini SDK.

## How the kernel injects a provider

Per the [public API doc](public-api.md), `AidexConfig.provider` is required and is the only place a
`Provider` enters the kernel:

```ts
interface AidexConfig {
  name?: string;
  version?: string;
  provider: Provider;
  logger?: ILogger;
  plugins?: Plugin[];
  metadata?: Metadata;
}
```

An application picks its provider once, at construction:

```ts
const aidex = new Aidex({
  provider: new GeminiProvider(/* provider-specific config, see below */),
});
```

From that point on, the same `Provider` instance is threaded into the base
`ExecutionContext` the kernel builds during construction (the [public API doc](public-api.md), step 3) and
handed to every `Strategy.execute()` call as `context.provider` for the
lifetime of that `Aidex` instance. Three consequences follow directly from this,
all of them already stated across the [public API doc](public-api.md) and #5 and worth collecting here
since this is the document a provider author needs to internalize:

- **No provider registry.** There is nothing analogous to `StrategyRegistry`
  for providers — no `Aidex.registerProvider()` method, no lookup by `name` at
  request time. `AidexConfig.provider` is a single required field, not a list.
- **No runtime provider switching.** The kernel never selects or swaps
  providers while handling a request (the [kernel philosophy doc](kernel-philosophy.md): *"providers generate," they are
  not routed*; the [public API doc](public-api.md): *"the kernel never selects or swaps providers at
  request time"*). Every `execute()` call against one `Aidex` instance reaches
  the same provider `context.provider` pointed at during construction.
- **Applications choose their provider at construction time, not per-request.**
  If an application genuinely needs to talk to two different providers — a
  primary and a fallback, one for a cheap task and one for an expensive one —
  the answer is two `Aidex` instances, each configured with its own
  `AidexConfig.provider`, not one instance with provider-switching logic bolted
  on (the [public API doc](public-api.md)'s Best Practices: *"that is two `Aidex` instances, not one
  instance with provider-switching logic"*). Routing between those two
  instances, if an application needs it, is an application-level decision made
  before calling `execute()` — not something the kernel's `AidexConfig` or
  `Provider` contract is ever extended to do.

## Worked sketch: `GeminiProvider`

The example below is **illustrative pseudocode, not real code** — it shows the
*shape* a concrete provider takes, not a working Gemini integration. It has no
Gemini SDK import, no API key, no network call, and no business logic; the
comments mark exactly where those things would go in a real implementation
that a future task (out of scope here — see the roadmap doc,
`docs/roadmap/roadmap.md`) would actually build, most likely in
`packages/core/src/providers/` or a separate package, never inside kernel
internals like `kernel/Aidex.ts`.

```ts
// Illustrative pseudocode only — NOT a real implementation.
// No SDK import, no API key, no network call. Shows the shape of a
// concrete Provider, nothing more.
import type { AidexOptions, Prompt, Provider, ProviderResponse } from '@aidex/core';

interface GeminiProviderConfig {
  // Provider-specific configuration lives here, on the provider's own
  // constructor — never on Prompt, never on AidexConfig. Illustrative only:
  // a real config would decide its own fields (model name, credentials
  // source, etc.) when this provider is actually built.
  model?: string;
}

class GeminiProvider implements Provider {
  readonly name = 'gemini';

  constructor(private readonly config: GeminiProviderConfig = {}) {
    // A real implementation would set up whatever a Gemini SDK client needs
    // here (model selection, credential resolution) — none of that is
    // shown, because none of it exists yet and this document does not
    // decide it.
  }

  async generate(prompt: Prompt, options?: AidexOptions): Promise<ProviderResponse> {
    // 1. Translate the provider-agnostic Prompt into whatever shape the
    //    Gemini SDK's call expects. `prompt.content` is the only field a
    //    strategy is guaranteed to have set; `prompt.metadata` is read only
    //    if this provider chooses to make use of it.
    //
    //      const sdkRequest = toGeminiRequest(prompt, this.config, options);

    // 2. Call the Gemini SDK. Not shown: no real network call, no API key,
    //    no SDK import in this document.
    //
    //      const sdkResponse = await geminiClient.generateContent(sdkRequest);

    // 3. Map the SDK's native response back onto the provider-agnostic
    //    ProviderResponse shape: extract plain text into `content`, keep the
    //    untyped native object on `raw` for callers that need more than
    //    `content`, and attach whatever `metadata` this provider wants to
    //    surface.
    //
    //      return {
    //        content: extractText(sdkResponse),
    //        raw: sdkResponse,
    //        metadata: { model: this.config.model },
    //      };

    throw new Error('illustrative pseudocode — not a real implementation');
  }
}
```

Every piece maps back to a rule already stated in this document:
`GeminiProvider implements Provider`, so `name` and `generate`'s signature
match the interface exactly (`generate(prompt: Prompt, options?: AidexOptions):
Promise<ProviderResponse>` — the options parameter is `AidexOptions`, the same
type `AidexRequest.options` uses, not an invented `ProviderOptions`);
provider-specific configuration (a model name, in this sketch) lives on the
provider's own constructor, not on `Prompt`; and the three-step body —
translate `Prompt` into the SDK's request shape, call the SDK, map the SDK's
response back onto `ProviderResponse` — is the entire job of `generate()`,
with nothing about strategies, requests, or applications leaking into it. A
strategy calling `context.provider.generate(prompt, request.options)` (the [strategy development guide](strategy-development-guide.md)) has no idea whether `context.provider` is this `GeminiProvider`, a stub
used in a test, or any other concrete provider — and per the [strategy development guide](strategy-development-guide.md)'s rules, it
must never be written to care.

## Roadmap: providers beyond Gemini

Gemini is the first concrete provider on Aidex's roadmap (for Print Platform and
Design Platform), but nothing about the `Provider` interface is Gemini-specific — that
is the entire point of the abstraction laid out in this document. A future
`OpenAIProvider`, `ClaudeProvider`, or `OllamaProvider` follows the identical
contract shown above: implement `readonly name: string`, implement
`generate(prompt: Prompt, options?: AidexOptions): Promise<ProviderResponse>`,
translate the incoming `Prompt` into that vendor's own SDK call inside step 1,
make the real call in step 2, and map that vendor's native response back onto
`{ content, raw?, metadata? }` in step 3. None of it requires a change to
`Provider`, `Prompt`, `ProviderResponse`, or any kernel code — a new provider
is purely an addition in application-land (or a future providers package), and
an application adopts one simply by constructing it and passing it as
`AidexConfig.provider`, exactly as shown above for `GeminiProvider`. Whether
`OpenAIProvider`/`ClaudeProvider`/`OllamaProvider` ship as part of this
project or as separate packages, and in what order, is a roadmap decision (see
`docs/roadmap/roadmap.md`) — not a design decision, since the design already
accommodates all of them without modification.

## Best practices

- **Never put provider-specific fields on `Prompt`.** If an implementation
  needs a knob only one vendor's SDK understands, that knob belongs on the
  provider's own constructor config or is read out of `AidexOptions`'s index
  signature inside `generate()` — never added to the shared `Prompt` type
  every strategy and every provider depends on (see "Why `Prompt` has no
  provider-specific fields" above).
- **Keep `generate()`'s three steps separate and honest.** Translate the
  `Prompt` in, call the vendor SDK, map the response back onto
  `ProviderResponse` — resist the temptation to fold task-specific logic (a
  strategy's job) into a provider's `generate()`. A provider that starts
  branching on `prompt.metadata.strategyName` to change its own behavior is
  drifting into strategy territory; keep provider code generic across every
  strategy that might call it.
- **Populate `raw` generously, `content` precisely.** `content` should be the
  clean, plain-text (or otherwise directly usable) answer a strategy can
  consume without knowing which provider produced it. `raw` is the safety
  valve — attach the SDK's full native response there so a strategy that
  genuinely needs more (token usage, a finish reason, a citation list) can
  reach for it explicitly, opting in to provider-specific detail rather than
  having it forced into the provider-agnostic `content`/`metadata` fields.
- **Construct providers once, not per-request.** A `Provider` is meant to be
  built once, wherever `new Aidex({ provider: ... })` is called, and reused for
  every `execute()` call against that instance (see "How the kernel injects a
  provider" above) — do not re-instantiate a provider (or its underlying SDK
  client) inside `generate()` on every call; set up any client, credentials,
  or connection once in the provider's constructor.
- **Test providers against the SDK boundary, not through the kernel.** A
  `Provider`'s own unit tests belong with the provider, exercising its
  `generate()` translation-and-mapping logic against a mocked or stubbed SDK
  client — the same way the [strategy development guide](strategy-development-guide.md) recommends testing a `Strategy` against a stub
  `Provider` rather than a real one. In the same spirit,
  the kernel's own test suite uses only structural stub providers
  (`{ name, generate() }`) and contains no AI tests and no provider
  implementation tests — a concrete provider's correctness is that provider's
  own responsibility, not the kernel's.
