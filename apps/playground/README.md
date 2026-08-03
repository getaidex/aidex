# @aidex/playground

The simplest runnable Aidex application. It exists to prove that
`@aidex/sdk` works end to end — construct an `AIBuilder`, configure it with
`@aidex/providers`' `StubProvider` (no real AI SDK, no network, fully
deterministic), build one `AI` instance, and run text through it.

**This is a reference implementation for SDK usage, not production
software** — and it is not an MCP server. It's a console application: no UI,
no web server, just `console.log` of whatever `ai.text(...)` returns.

## Running it

```sh
pnpm --filter @aidex/playground build
pnpm --filter @aidex/playground start
```

## What it shows

```ts
import { AIBuilder } from '@aidex/sdk';
import { StubProvider } from '@aidex/providers';

const ai = new AIBuilder().provider(new StubProvider()).build();
const result = await ai.text('Hello, Aidex!');

console.log(result); // "stub:Hello, Aidex!"
```

`Playground` (`src/Playground.ts`) wraps exactly that sequence in one class;
`src/index.ts` is the executable entry point that constructs a `Playground`,
runs it, and prints the result.

## Rules this app follows

- Only depends on `@aidex/sdk` and `@aidex/providers` — no `@aidex/core`, no
  `@aidex/strategies`, no `@aidex/plugins` import anywhere.
- No AI logic — `Playground.run()` is a one-line delegation to `ai.text()`.
- No UI — a console application only.
