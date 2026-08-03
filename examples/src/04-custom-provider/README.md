# 04 — Custom Provider

**Level 2 · Providers · Beginner · ~5 min**

## What problem does this solve?
You need Aidex to talk to something that isn't Gemini — an internal
model server, a different vendor, or (for testing) a fully
deterministic stand-in.

## Why would I use this Aidex feature?
`Provider` is intentionally the smallest possible contract: `name` plus
one async `generate(prompt)` method. Anything satisfying that shape
plugs into every SDK feature — engines, workflows, plugins — exactly
like `GeminiProvider` does. There's no special-casing of the built-in
providers anywhere in the SDK.

## When should I use this in a real project?
Wrapping a self-hosted model endpoint, adding a vendor Aidex doesn't
ship, or building a deterministic test double for your own test suite
(the same technique this example uses to run offline).

## Requirements
- Node ≥18, pnpm — no API key needed, this example never calls a network.

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples custom-provider
```

## Expected output
```
Prompt: Aidex makes it easy to swap providers
Response (Caesar-shifted by 3): Dlghc pdnhv lw hdvb wr vzds surylghuv
```

## Concepts learned
- The full `Provider` interface (two members, nothing more)
- Providers don't have to call an LLM — any deterministic or remote
  transform that returns `{content: string}` qualifies

## Related packages
`@aidex/core`, `@aidex/sdk`

## Next example
[05 — Provider Comparison](../05-provider-comparison/README.md) — run
one question against several provider configs side by side.
