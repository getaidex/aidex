# CLI

`@aidex/cli` is the command-dispatch interface to Aidex — the first real
application built on `@aidex/sdk`. `CLI` is a class you instantiate and
call, not a terminal binary: there is no `bin` entry or shell command, and
it contains no AI logic of its own. Every command is a one-line delegation
to the SDK.

## Basic usage

```ts
import { CLI } from '@aidex/cli';
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider } from '@aidex/providers';

const ai = new AIBuilder().provider(new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY })).build();
const cli = new CLI(ai, '1.0.0');

await cli.execute('text', 'hello'); // → delegates to ai.text('hello')
await cli.execute('version'); // → '1.0.0'
```

`new CLI(ai, version)` auto-registers two built-in commands — `"text"` and
`"version"` — so it's immediately usable with no further setup.

## Registering your own commands

Any object matching `{ name: string; execute(ai, input): Promise<string> }`
can be registered:

```ts
cli.register({
  name: 'summarize',
  async execute(ai, input) {
    return ai.text(`Summarize this in one sentence: ${input}`);
  },
});

await cli.execute('summarize', 'a long paragraph of text...');
```

The command itself decides what to ask the model — `CLI` only holds the
`AI` instance and a `Map` of commands, and dispatches by name. It never
calls `ai.text()`/`ai.execute()` directly.

## What it deliberately doesn't do

No provider, kernel, strategy, or plugin imports — the only import in
`src/` (outside tests) is `import type { AI } from '@aidex/sdk'`. No
filesystem or `package.json` lookups either: `VersionCommand` returns
whatever version string you pass into the `CLI` constructor.

See [20 — Build a CLI](/examples/20-build-a-cli) for a full runnable
walkthrough.
