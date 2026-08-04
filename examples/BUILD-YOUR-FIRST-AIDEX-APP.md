# Build Your First Aidex App

**5-10 minute read.** By the end, you'll have a tiny working
TypeScript app that sends a prompt to a real (or demo) provider and
runs your own custom engine — copy the code blocks below into a
scratch file as you go.

This is a guided walkthrough, not a runnable example project like the
15 numbered examples in this folder — there's no `pnpm run` command
tied to it. If you'd rather see finished, runnable code first, start
with [01 — Getting Started](src/01-getting-started/README.md) instead.

## 1. Install

```bash
mkdir my-aidex-app && cd my-aidex-app
npm init -y
npm pkg set type=module
npm install @aidex/sdk @aidex/providers @aidex/engines typescript --save
npm install --save-dev @types/node
npx tsc --init --target ES2022 --module NodeNext --moduleResolution NodeNext
```

`tsc --init` generates a `tsconfig.json` with `"types": []` (which
blocks the `@types/node` you just installed) and `"outDir"` commented
out (so compiled output would land next to your source instead of in
`dist/`, as Step 6 expects). Open `tsconfig.json` and set both:

```json
"outDir": "./dist",
"types": ["node"],
```

## 2. Configure a provider

Create `index.ts`:

```typescript
import { GeminiProvider, StubProvider } from '@aidex/providers';

const apiKey = process.env.GEMINI_API_KEY;
const provider = apiKey ? new GeminiProvider({ apiKey }) : new StubProvider();
```

`StubProvider` is a real, deterministic `Provider` implementation — not
a test mock — so this line of code works with zero setup, and upgrades
itself the moment you export a real `GEMINI_API_KEY`.

## 3. Create an `AIBuilder`

```typescript
import { AIBuilder } from '@aidex/sdk';

const ai = new AIBuilder().provider(provider).build();
```

This is the one line every Aidex program starts with: pick a provider,
build an `AI` instance.

## 4. Send your first prompt

```typescript
const response = await ai.text('Give me a one-sentence pitch for a todo app.');
console.log(response);
```

(This snippet uses `await` directly — it'll live inside the one `main()`
function Step 6 assembles everything into, not run standalone.)

`ai.text(input)` is single-shot — no conversation memory. If you want a
chat loop, see [03 — Interactive Chat](src/03-interactive-chat/README.md)
for the pattern of managing that state yourself.

## 5. Register an engine

Not every Aidex call needs to hit an LLM. Here's a fully deterministic
custom engine:

```typescript
import type { Engine } from '@aidex/engines';

interface SlugInput { title: string }

const slugEngine: Engine<string> = {
  id: 'text.slugify',
  name: 'Slugify',
  description: 'Converts a title into a URL-safe slug',
  version: '1.0.0',
  async execute(context) {
    const { title } = context.request?.input as SlugInput;
    return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  },
};

const aiWithEngine = new AIBuilder().provider(provider).engine(slugEngine).build();
```

## 6. Execute it

Put every `await` snippet above into one `main()` and call it — this is
the only function declaration in the whole file:

```typescript
async function main() {
  const response = await ai.text('Give me a one-sentence pitch for a todo app.');
  console.log(response);

  const slug = await aiWithEngine.engine<string>('text.slugify').execute({ title: 'Hello Aidex World' });
  console.log(slug); // "hello-aidex-world"
}

main();
```

Run it with `npx tsc && node dist/index.js` (adjust paths to match your
`tsconfig.json`'s `outDir`).

## Next steps

You've now touched the two most important building blocks: providers
and engines. From here:

- [01 — Getting Started](src/01-getting-started/README.md) — the same
  provider-fallback pattern, as a full runnable example
- [14 — Custom Engine](src/14-custom-engine/README.md) — a deeper,
  more realistic custom engine
- [examples/README.md](README.md) — the full 9-level learning path,
  including document/design/marketing feature packages, workflows,
  plugins, and observability
