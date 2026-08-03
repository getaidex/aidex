# @aidex/adapters

## Installation

```sh
pnpm add @aidex/adapters
```

```sh
npm install @aidex/adapters
```

Adapters connect application frameworks to the SDK (`@aidex/sdk`). **They
never contain AI logic.** An adapter's entire job is: hold an `AI` instance,
translate one framework's call shape into `ai.text(...)`/`ai.execute(...)`,
and hand the result back — nothing about prompts, providers, or strategies
is decided here.

## Contents

- **`express/ExpressAdapter`** — `new ExpressAdapter(ai)`. Exposes
  `handleRequest({ prompt }): Promise<{ result }>`, which calls
  `await ai.text(prompt)` and wraps the result. Takes **no Express
  dependency** — `ExpressAdapterRequest`/`ExpressAdapterResponse` are small,
  local interfaces (`{ prompt: string }` / `{ result: string }`); an
  application maps a real `express.Request`/`Response` onto this shape at
  the call site.
- **`node/NodeAdapter`** — `new NodeAdapter(ai)`. Exposes
  `executeText(prompt): Promise<string>`, a one-line delegation to
  `ai.text(prompt)`, for plain Node.js call sites with no framework at all.

## Rules this package follows

- **No AI logic.** Neither adapter builds a `Prompt`, inspects a
  `ProviderResponse`, or makes any decision about what to ask a model —
  that's `Strategy`/`Provider` territory, entirely inside `@aidex/sdk`'s
  reach, never this package's.
- **No Provider calls, no kernel imports, no strategy imports.** Every
  import in `src/` (excluding tests) comes from `@aidex/sdk` only.
- **Composition only.** Each adapter holds an `AI` instance as a private
  constructor field; neither extends anything, and there is no shared base
  `Adapter` class.
- No singleton, no global mutable state — every adapter instance is
  independent and can wrap its own (or a shared) `AI`.
- `src/index.ts` exports `ExpressAdapter` and `NodeAdapter` only.

## Dependency direction

`@aidex/adapters` depends on `@aidex/sdk` only. `@aidex/providers` is a
devDependency used solely by this package's own tests (`StubProvider`, to
build a real `AI` via `AIBuilder` without needing a live model). No
dependency on `@aidex/core`, `@aidex/strategies`, `@aidex/plugins`, or any
vendor SDK.
