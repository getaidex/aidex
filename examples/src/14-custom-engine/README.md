# 14 — Custom Engine

**Level 8 · Custom Engines · Advanced · ~10 min**

## What problem does this solve?
Every prior example used engines Aidex ships. This one shows how to
build and register your own — the same mechanism `@aidex/document`/
`@aidex/design`/`@aidex/marketing` use internally, available to any
application.

## Why would I use this Aidex feature?
`AIBuilder().engine(myEngine).build()` registers a custom `Engine`
directly on your `AI` instance; `ai.engine(id).execute(input)` calls it
— identical call shape to every built-in engine you've used so far. An
`Engine` is just `{id, name, description, version, execute(context)}` —
nothing about it requires calling an LLM, as this example's fully
deterministic reading-time calculator demonstrates.

## When should I use this in a real project?
Any reusable, typed unit of work you want to compose the same way as
Aidex's built-in engines — deterministic calculations, internal API
calls, or your own LLM-backed logic, all through one consistent
`ai.engine(id).execute()` surface.

## Requirements
- Node ≥18, pnpm — no API key needed, this engine never calls the provider.

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples custom-engine
```

## Expected output
```
Title: Ten Tips For Better TypeScript
Slug: ten-tips-for-better-typescript
Word count: 72
Estimated reading time: 1 minute(s)
```

## Concepts learned
- `AIBuilder().engine(e).build()` + `ai.engine(id).execute(input)` — the
  modern façade path (supersedes driving `EngineRegistry` by hand)
- The full `Engine` contract, and that it doesn't require a `Provider` call
- Every `AI` instance still needs a `Provider` even if no registered engine uses it

## Related packages
`@aidex/engines`, `@aidex/sdk`, `@aidex/providers`

## Next example
[15 — Real-World Assistant](../15-real-world-assistant/README.md) — the
capstone: every concept from levels 1-8, composed into one small app.
