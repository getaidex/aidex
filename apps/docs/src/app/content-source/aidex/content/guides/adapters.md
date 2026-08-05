# Adapters

Adapters connect application frameworks to the SDK (`@aidex/sdk`). **They
never contain AI logic.** An adapter's entire job is to hold an `AI`
instance, translate one framework's call shape into
`ai.text(...)`/`ai.execute(...)`, and hand the result back — nothing about
prompts, providers, or strategies is decided here. Every import in this
package (outside tests) comes from `@aidex/sdk` only.

## Plain Node

```ts
import { NodeAdapter } from '@aidex/adapters';
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider } from '@aidex/providers';

const ai = new AIBuilder().provider(new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY })).build();
const adapter = new NodeAdapter(ai);

const text = await adapter.executeText('Say hello to Aidex.');
```

`NodeAdapter.executeText(prompt)` is a one-line delegation to `ai.text(prompt)`
— for call sites with no framework at all.

## Express

```ts
import { ExpressAdapter } from '@aidex/adapters';

const adapter = new ExpressAdapter(ai);

// inside a route handler:
const { result } = await adapter.handleRequest({ prompt: req.body.prompt });
res.json({ result });
```

`ExpressAdapter` takes **no Express dependency** — `ExpressAdapterRequest`
(`{ prompt: string }`) and `ExpressAdapterResponse` (`{ result: string }`)
are small, local interfaces. Your route handler maps the real
`express.Request`/`Response` onto this shape at the call site; the adapter
itself never imports `express`.

## Writing your own

Both adapters follow the same shape: hold an `AI` instance as a private
constructor field, expose one or two methods that delegate straight to
`ai.text()`/`ai.execute()`, and add zero decision-making of your own. A new
framework adapter (Fastify, Next.js route handlers, a queue consumer)
follows the identical pattern — composition only, no shared base class, no
singleton.

See [16 — Framework Adapters](/examples/16-framework-adapters) for a full
runnable walkthrough.
