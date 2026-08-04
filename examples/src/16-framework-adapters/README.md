# 16 — Framework Adapters (Bonus)

**Bonus · Package Coverage · Beginner · ~5 min**

## What problem does this solve?
You have one `AI` instance and want to expose it through more than one
call shape — a plain function call site, and an Express-style
`{prompt}` → `{result}` request handler — without duplicating the
provider setup or prompt logic in each place.

## Why would I use this Aidex feature?
`@aidex/adapters` is a pure translation layer: `NodeAdapter` and
`ExpressAdapter` both wrap the exact same `AI` instance and both
delegate to `ai.text()` — they contain no AI logic of their own. One
`AI`, many entry points.

## When should I use this in a real project?
Any time the same underlying AI call needs to be reachable from more
than one integration surface — a CLI script and an HTTP route, for
instance — without re-deriving provider/prompt setup in each.

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to `StubProvider` demo mode)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples framework-adapters
```

## Expected output
```
No GEMINI_API_KEY found — using StubProvider (demo mode).

NodeAdapter result: stub:Suggest a name for a note-taking app.
ExpressAdapter result: stub:Suggest a name for a note-taking app.

Both adapters delegate to the same ai.text() call underneath — identical output, as expected.

Empty input correctly rejected: ...
```

## Concepts learned
- `@aidex/adapters`' two adapter classes and their exact request/response shapes
- Why a framework adapter should contain zero AI logic of its own
- Shared input validation across adapters wrapping the same `AI`

## Related packages
`@aidex/adapters`, `@aidex/sdk`, `@aidex/providers`

## Next example
[17 — Memory Store](../17-memory-store/README.md) — a fully standalone,
Provider-free package: a generic key/value primitive.
