# Strategy Development Guide

The [request lifecycle doc](request-lifecycle.md) traced the full `execute()` sequence and drew a
hard line around three steps in the middle of it — building a `Prompt`, calling
`Provider.generate()`, converting the `ProviderResponse` into a result — labeling
that block "Strategy-owned" and explicitly deferring it: *"How a strategy builds its
prompt, how many times it calls the provider, and how it shapes the response into
`TResult` are exactly the concerns the [strategy development guide](strategy-development-guide.md) ... covers."* This document is that block,
made the subject rather than a deferred detail: the `Strategy` interface itself,
what a strategy is responsible for, what it must never do, how it reads
application-supplied `request.context`, and a complete minimal example from
definition to registration.

The kernel described below is implemented and tested — the `Strategy` interface
in this document has been cross-checked against the real
`packages/core/src/types/Strategy.ts`. No concrete
strategy ships in `packages/core` — strategies remain application code, as
described below.

## What a Strategy is

Recall the [kernel philosophy doc](kernel-philosophy.md)'s division of labor: *"Applications decide. Kernel executes.
Strategies orchestrate. Providers generate."* A `Strategy` is where that third
clause lives — it is the one piece of the system that knows how to accomplish a
specific task by talking to an AI provider. Everything upstream of it (the kernel)
knows only how to look a strategy up by name and call it; everything downstream of
it (the `Provider`) knows only how to turn one `Prompt` into one `ProviderResponse`.
A `Strategy` sits between the two and does the actual orchestration: interpreting a
request, deciding what to ask the provider, and shaping the answer into something
the calling application can use.

Strategies are **application code**. Aidex ships the `Strategy` interface as a
contract in `packages/core/src/types/Strategy.ts`; it does not ship any concrete
strategy. Print Platform, Design Platform, and every future application write their own strategies,
register them with their own `Aidex` instance via `registerStrategy()`, and are the
only ones who understand what those strategies mean. This is the Golden Rule from
the [kernel philosophy doc](kernel-philosophy.md) applied directly: a strategy that summarizes a support ticket is required by
exactly one application's business need, so it cannot live inside the kernel — it
lives in that application's own source tree.

## The `Strategy` interface (locked)

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

Three members, all of them already introduced in the [public API doc](public-api.md) (`registerStrategy()`) and
the [request lifecycle doc](request-lifecycle.md) (the execution flow) — this document is where each is specified for the
person actually implementing one:

- **`name: string`** — the identifier `execute()` dispatches on. This is the same
  string a caller passes as `request.strategy`, and the same string
  `StrategyRegistry` keys its lookup by (the [public API doc](public-api.md)). Pick something stable and
  descriptive (`'summarize-ticket'`, not `'strategy1'`) — renaming it later is a
  breaking change for every caller that references it by string.
- **`version?: string`** — optional, carried on the strategy object purely as
  metadata. Per the frozen design, `StrategyRegistry` never reads it: registration
  is keyed by `name` alone, and there is no multi-version resolution logic in the
  kernel (picking "the latest" or "a specific" version would be business logic the
  kernel has no business doing, per the [kernel philosophy doc](kernel-philosophy.md)). Set it if your application finds it
  useful for its own logging or auditing; the kernel will never look at it.
- **`execute(request, context): Promise<TResult>`** — the one method every strategy
  must implement. `TResult` is whatever type the strategy resolves to; `TContext`
  is whatever shape the strategy expects `request.context` to have. Both default to
  `unknown` so an unparameterized `Strategy` still type-checks, but a real strategy
  should supply both — `Strategy<string, MyContextShape>` — to get compile-time
  safety at the call site.

## Responsibilities: what `execute` does, step by step

The kernel's contribution to every request, per the [request lifecycle doc](request-lifecycle.md), is exactly two lifecycle
phases and one `await`: `beforeExecute` → `StrategyRegistry.get(request.strategy)`
→ `await strategy.execute(request, context)` → `afterExecute`. Everything that
happens *inside* that one `await` is the strategy's job, and it breaks down into
four steps that every strategy performs, in this order:

1. **Receive the raw `AidexRequest` and the kernel's `ExecutionContext`.** The
   kernel does no parsing, validation, or interpretation of `request.input` or
   `request.context` before handing them to the strategy — they arrive exactly as
   the caller supplied them (the [public API doc](public-api.md): *"`input` and `context` are opaque to the
   kernel and are passed straight through to the strategy"*).
2. **Decide what to do**, based on `request.input`, `request.context`,
   `request.metadata`, and anything the strategy already knows about its own task.
   This is the one step with no fixed shape — it is exactly as simple or as
   elaborate as the task requires, from a single `if` to multiple provider calls
   chained together.
3. **Build a `Prompt`** — the provider-agnostic communication shape from the [request lifecycle doc](request-lifecycle.md)'s
   type contracts (`{ content: string; metadata?: Metadata }`) — and call
   `context.provider.generate(prompt, request.options)` to get back a
   `ProviderResponse` (`{ content: string; raw?: unknown; metadata?: Metadata }`).
   `context.provider` is the single `Provider` instance injected once via
   `AidexConfig.provider` at construction (the [public API doc](public-api.md)) — the strategy never has to
   locate, select, or configure a provider itself.
4. **Convert the `ProviderResponse` into `TResult`** and return it. This is
   whatever transformation makes sense for the task — returning `response.content`
   directly, parsing it as JSON, extracting a field, combining it with data from an
   earlier step — and it is entirely up to the strategy. The kernel does not
   inspect the returned value beyond handing it back to the caller of `execute()`.

Any error thrown at any of these four steps — including one the provider throws —
propagates out of `strategy.execute()` and, per the [request lifecycle doc](request-lifecycle.md), out of `aidex.execute()`
unchanged: the kernel does not catch, wrap, or retry it, and `afterExecute` does
not fire on that path. A strategy that wants a request to fail loudly on a bad
provider response should simply let that error propagate rather than swallowing it
into a default value.

## What a Strategy must never do

Three rules, each protecting a boundary drawn elsewhere in this doc series:

- **Never instantiate a `Provider` itself.** `context.provider` is the only
  `Provider` a strategy should ever call. Constructing a `new GeminiProvider(...)`
  (or any concrete provider) inside a strategy re-introduces exactly the kind of
  provider selection the kernel deliberately doesn't do (the [public API doc](public-api.md): *"the kernel never
  selects or swaps providers at request time"*) and silently breaks the one-provider-
  per-`Aidex`-instance guarantee that best practice depends on. If a strategy needs a
  provider, `context.provider` already has one — injected once, for the lifetime of
  the `Aidex` instance, by whoever configured it.
- **Never assume a specific provider implementation behind `context.provider`.** A
  strategy only knows `context.provider` satisfies the `Provider` interface
  (`{ name: string; generate(prompt, options?): Promise<ProviderResponse> }`) — not
  which concrete provider it is. Branching on `context.provider.name === 'gemini'`
  to unlock provider-specific behavior, or reaching into `response.raw` assuming
  it has Gemini's particular shape, ties a strategy to one provider and breaks the
  moment that `Aidex` instance is reconfigured with a different one. Anything a
  strategy needs from a provider call belongs in the provider-agnostic `Prompt` it
  sends and the provider-agnostic `content`/`metadata` fields of the
  `ProviderResponse` it gets back — see the [provider development guide](provider-development-guide.md) for how a concrete provider is built
  to honor that contract.
- **Never reach into application-specific storage, auth, or any other
  application-owned resource by expecting the kernel to supply it.** This follows
  directly from the [kernel philosophy doc](kernel-philosophy.md): the kernel is provider-agnostic *and* app-agnostic, so
  `ExecutionContext` was deliberately never designed to carry a database handle, an
  auth session, or any other application-specific resource — it carries exactly
  `config`, `provider`, `logger?`, `request?`, and `metadata?` (the [request lifecycle doc](request-lifecycle.md)'s type
  contracts), nothing more. A strategy is free to be as application-specific as its
  task requires — that is the entire reason strategies live in application code and
  not in the kernel — but it must acquire any storage/auth/database client it needs
  the way any other piece of application code would: through its own constructor,
  a closure over a module-level client, or an application-level dependency
  container the application wires up itself, never by expecting `context` to hand
  one over. A future `ExecutionContext` field that starts to look like "the shop's
  database connection" would be the Golden Rule violation from the [kernel philosophy doc](kernel-philosophy.md) recurring one
  layer down, in the `Strategy` contract instead of `AidexConfig`.

## How strategies use `request.context`

`request.context` is the `TContext` slot on `AidexRequest<TContext>` — an arbitrary,
application-supplied payload the kernel never parses, validates, or reads. Per the [public API doc](public-api.md), it is opaque to the kernel and passed straight through unchanged. The kernel's
own `ExecutionContext<TContext>` simply carries the same `request` (and therefore
the same `request.context`) alongside the provider, logger, and config — the
strategy is the only party in the entire call path that ever gives
`request.context` meaning.

This is deliberately unconstrained in shape, because different applications need
different data on every request. Two illustrative examples of what an application
might put there — shown purely to demonstrate the *shape* of app-supplied context,
not as real Print Platform or Design Platform implementation logic, and not as anything the kernel
is aware of:

```ts
// Illustrative shape only — not a real Print Platform contract, and not something
// packages/core knows about or imports.
interface ExampleJobContext {
  shopId: string;
  queueId: string;
  jobId: string;
}

// Illustrative shape only — not a real Design Platform contract, and not something
// packages/core knows about or imports.
interface ExampleDesignContext {
  designId: string;
  templateId: string;
  projectId: string;
}
```

A strategy written for the first application would declare
`Strategy<TResult, ExampleJobContext>` and could read `request.context?.shopId`
inside `execute()` to decide, say, which of several prompt templates to use. A
strategy written for the second would declare `Strategy<TResult, ExampleDesignContext>`
and read `request.context?.designId` for an entirely different purpose. Neither
shape is known to `Aidex`, `ExecutionContext`, or `StrategyRegistry` — the kernel
routes the request to the named strategy and hands the whole `AidexRequest` over
unopened; interpreting `context` is 100% strategy-owned, exactly like building the
`Prompt` and shaping the `TResult` are.

## A minimal illustrative example: `EchoStrategy`

The example below is **application code — it does not live in `packages/core`**.
It would live in the repository of whichever application registers it (under
something like `src/strategies/EchoStrategy.ts`), imported from `@aidex/core` the
same way any other application code would consume the kernel's public types. It
exists here only to show every piece of the `Strategy` contract exercised in one
place: `name`, `version`, an `execute` that builds a `Prompt`, calls
`context.provider.generate()`, and converts the `ProviderResponse` into `TResult` —
the same four-step responsibility list from above, with nothing else added.

```ts
// application-land — e.g. src/strategies/EchoStrategy.ts
// NOT part of packages/core. Aidex ships the Strategy interface; it does not
// ship this (or any) concrete strategy.
import type {
  AidexRequest,
  ExecutionContext,
  Prompt,
  Strategy,
} from '@aidex/core';

// Illustrative context shape only — an application-defined type, not a kernel
// concept. A real application would name and shape this for its own task.
interface EchoContext {
  prefix?: string;
}

class EchoStrategy implements Strategy<string, EchoContext> {
  readonly name = 'echo';
  readonly version = '1.0.0';

  async execute(
    request: AidexRequest<EchoContext>,
    context: ExecutionContext<EchoContext>
  ): Promise<string> {
    // Step 1 + 2: interpret the request — nothing to decide here beyond reading
    // the optional prefix out of the application-supplied context.
    const prefix = request.context?.prefix ?? 'echo';

    // Step 3: build a Prompt and call context.provider.generate(). Never a
    // concrete provider constructed here — always the injected context.provider.
    const prompt: Prompt = {
      content: String(request.input ?? ''),
      metadata: { strategy: this.name },
    };
    const response = await context.provider.generate(prompt, request.options);

    // Step 4: convert the ProviderResponse into TResult (a plain string, here).
    return `${prefix}: ${response.content}`;
  }
}
```

Every line maps back to a rule already stated in this document: `name` and
`version` match the interface exactly; `execute`'s signature matches
`execute(request: AidexRequest<TContext>, context: ExecutionContext<TContext>): Promise<TResult>`
with `TContext = EchoContext` and `TResult = string`; the provider is called
through `context.provider`, never constructed; `request.context` is read but never
validated or trusted by the kernel; and the returned value is derived from
`response.content`, not from any assumption about which provider produced it.

## Registering it

Strategy registration is `registerStrategy()`, covered fully in the [public API doc](public-api.md) — a strategy
becomes callable by adding one line, after construction and before any `execute()`
call that names it:

```ts
const aidex = new Aidex({ provider: someProvider });

aidex.registerStrategy(new EchoStrategy());

const result = await aidex.execute<string, EchoContext>({
  strategy: 'echo',
  input: 'hello',
  context: { prefix: 'you said' },
});
// result === "you said: <whatever the provider returned>"
```

If another strategy is already registered under the name `'echo'`,
`registerStrategy()` throws `DuplicateRegistrationError` instead of silently
replacing it (the [public API doc](public-api.md)) — two strategies colliding on a name is a configuration bug
meant to surface immediately, not a runtime condition to catch and route around.

## Best practices

- **One strategy, one task.** A strategy named `'echo'` should do the one thing its
  name promises. A strategy that branches internally on `request.input` to perform
  several unrelated tasks is really several strategies wearing one name — register
  them separately instead, so `StrategyRegistry` and `request.strategy` stay an
  honest map of what the application can do.
- **Treat `version` as informational only.** Since the kernel never resolves by
  version (see above), do not build application logic that expects `execute()` to
  route to "the newest" or "a specific" version of a same-named strategy — that
  resolution does not exist. A version bump that changes behavior needs a new
  `name`, or an application-level decision made before calling `execute()`, not a
  kernel-level one.
- **Let provider and validation errors propagate.** Per the [request lifecycle doc](request-lifecycle.md), nothing in
  `execute()` catches an error a strategy throws (including one that surfaces from
  `context.provider.generate()`); it rejects the caller's `await aidex.execute(...)`
  directly. Wrap or retry inside the strategy only if that behavior is genuinely
  part of the strategy's own task — global retry policy belongs in a plugin (see
  the [plugin development guide](plugin-development-guide.md)), not duplicated into every strategy.
- **Test strategies against a stub `Provider`, not a real one.** Because
  `context.provider` is just an object satisfying `{ name, generate() }`, a
  strategy's `execute()` can be exercised in isolation with a stub `generate` that
  returns a canned `ProviderResponse` — the same structural-stub approach the [public API doc](public-api.md)'s
  usage example and the kernel's own test suite use for `Provider`, `Plugin`,
  and `Strategy` alike. No real AI call, no
  network, no provider credentials needed to verify a strategy's logic.
- **Keep `request.context` shapes close to the strategy that reads them.** Define
  the `TContext` interface for a strategy next to the strategy itself (as
  `EchoContext` is defined next to `EchoStrategy` above), not as a shared type
  imported from the kernel — `AidexRequest<TContext>` is generic precisely so each
  strategy, and each application, owns the shape of the context it expects.
