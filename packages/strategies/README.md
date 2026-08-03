# @aidex/strategies

## Installation

```sh
pnpm add @aidex/strategies
```

```sh
npm install @aidex/strategies
```

Concrete `Strategy` implementations for the Aidex kernel (`@aidex/core`). Strategies
are application-land code per `docs/architecture/strategy-development-guide.md` —
this package supplies reusable ones so an app can
`aidex.registerStrategy(new TextGenerationStrategy())` without hand-rolling the
Prompt/Provider plumbing every time.

## Contents

- **`stub/StubStrategy`** — the reference `Strategy` implementation: receives an
  `AidexRequest`, reads `ExecutionContext`, builds a `Prompt`, calls
  `context.provider.generate()`, and returns the result — with no decision logic
  of its own. Deterministic whenever `context.provider` is.
- **`text/TextGenerationStrategy`** — the first production `Strategy`: turns
  `request.input` into a `Prompt` and returns `ProviderResponse.content` only.
  Never imports a vendor SDK and never assumes which `Provider` it's talking to —
  it only ever calls the `Provider` interface, so it works unchanged against
  `GeminiProvider`, a future `OpenAIProvider`/`ClaudeProvider`, or a stub.

## Rules this package follows

- Imports only the public contracts from `@aidex/core` (`Strategy`, `AidexRequest`,
  `ExecutionContext`, `Prompt`) — never a kernel internal.
- Never constructs a `Provider` — always calls the one injected at
  `context.provider`, per doc #5's "what a Strategy must never do."
- Prompt construction stays inside the strategy; it is never pushed down into a
  provider.
- `@aidex/providers` (`StubProvider`) is a test-only dependency, used to exercise
  these strategies end-to-end — it is not a runtime dependency of any strategy
  here, since a strategy must work with *any* `Provider`.
- `src/index.ts` exports strategy classes only.
