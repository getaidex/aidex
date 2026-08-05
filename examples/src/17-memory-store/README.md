# 17 — Memory Store (Bonus)

**Bonus · Package Coverage · Beginner · ~5 min**

## What problem does this solve?
You need a simple key/value cache inside a single process run — caching
a computed summary, a running count, anything you don't want to
recompute mid-run — without reaching for a database or a vector store.

## Why would I use this Aidex feature?
`@aidex/memory`'s `MemoryStore` is a generic, synchronous, in-process
KV primitive. It is deliberately **not** chat memory and **not** a
vector store — no persistence, no expiration, no serialization. Two
stores are isolated purely by the name you give them.

## When should I use this in a real project?
Any short-lived, single-process caching need where you want a typed,
named store instead of a bare module-level `Map` scattered through
your code. Reach for a real persistence layer (a database, Redis, a
vector store) the moment you need data to survive a restart or be
shared across processes — this package explicitly doesn't do that.

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to `StubProvider` demo mode)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples memory-store
```

## Expected output
```
No GEMINI_API_KEY found — using StubProvider (demo mode).

Cached summaries:
  turn-0: stub:What is TypeScript?
  turn-1: stub:Give me one use case for generics.
Total turns cached: 2

A differently-named store never sees this data: confirmed empty.

Note: nothing here is written to disk — restart this process and both stores start empty again.
```

## Concepts learned
- `MemoryStore<TValue>` + `Memory<TValue>`'s full API (`set`/`get`/`has`/`delete`/`clear`)
- Isolation by store name — no accidental cross-store sharing
- The deliberate absence of persistence — a scope boundary, not a bug

## Related packages
`@aidex/memory`, `@aidex/sdk`

## Next example
[18 — MCP Server](../18-mcp-server/README.md) — a real protocol server,
driven entirely in-process with no external client needed.
