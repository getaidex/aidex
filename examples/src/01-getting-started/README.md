# 01 — Getting Started

**Level 1 · Getting Started · Beginner · ~5 min**

## What problem does this solve?
Every Aidex program starts the same way: pick a provider, build an `AI`
instance, send a prompt. This example is that skeleton, stripped to the
minimum, so you can see the whole shape before any example adds complexity.

## Why would I use this Aidex feature?
`AIBuilder` is the one on-ramp into the SDK. It decouples "which model
answers this" (the `Provider`) from "what am I asking" (your prompt) —
so swapping providers later never touches your prompt code.

## When should I use this in a real project?
At the very start of any Aidex integration — this is the smallest
possible thing that proves your provider credentials and wiring work
before you build anything on top.

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` environment variable (falls back to a demo
  provider if unset — see "Expected output" below)

## Install
From the repo root: `pnpm install`

## Run
```bash
pnpm --filter @aidex/examples build
GEMINI_API_KEY=your-key pnpm --filter @aidex/examples getting-started
# or, with no key, to see demo mode:
pnpm --filter @aidex/examples getting-started
```

## Expected output
With a real key, three genuine project ideas from Gemini. Without one:
```
No GEMINI_API_KEY found — using StubProvider (demo mode).
Set GEMINI_API_KEY to see a real model response.

Prompt: Suggest three good weekend project ideas for a TypeScript developer.

Response:
stub:Suggest three good weekend project ideas for a TypeScript developer.
```
That `stub:` prefix is not a bug — `StubProvider` deterministically echoes
its input so this example (and its tests) never depend on the network.

## Concepts learned
- `AIBuilder().provider(p).build()` — the universal entry point
- `ai.text(input)` — the single-shot text call every provider supports
- Provider fallback pattern: detect a real key, else run a deterministic stand-in

## Related packages
`@aidex/sdk`, `@aidex/providers`

## Next example
[02 — Prompt Templates](../02-prompt-templates/README.md) — before you
hand-write more prompts like the one above, learn how to template and
version them.
