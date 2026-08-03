# @aidex/memory

A generic, in-memory key/value storage primitive for Aidex. **This is not AI
chat memory, not a vector database, and not tied to prompts in any way** — it
is a reusable KV abstraction, nothing more.

## Contents

- **`memory/Memory`** — a synchronous, generic key/value store:
  `set(key, value)`, `get(key)`, `has(key)`, `delete(key)`, `clear()`. Backed
  by a plain `Map` internally. No persistence, no expiration, no
  serialization — values live only as long as the `Memory` instance does.
- **`store/MemoryStore`** — a thin, named wrapper around one `Memory`
  instance, representing a single logical memory (e.g. `"conversation"`,
  `"workflow"`, `"cache"`, `"session"`). Exposes `name` and `getMemory()`;
  nothing else.
- **`types/MemoryEntry`** — the generic shape of one stored item
  (`{ key: string; value: TValue }`). No provider- or application-specific
  field of any kind.

## Independence

This package has **no dependency on anything** — not `@aidex/core`, not
`@aidex/providers`, `@aidex/strategies`, `@aidex/plugins`, `@aidex/workflow`,
`@aidex/observability`, Gemini, OpenAI, Design Platform, or Print Platform. Every type here is
self-contained and generic over the caller's own value type.

## Architecture rules this package follows

- Composition only — `MemoryStore` holds a `Memory`, it does not extend one.
  No inheritance, no abstract base class anywhere in this package.
- No singletons, no global mutable state — every `Memory`/`MemoryStore` is
  its own independent instance; two stores never share state.
- `src/index.ts` exports exactly `Memory`, `MemoryStore`, `MemoryEntry` —
  nothing internal.

## Dependency direction

Standalone. Any other Aidex package (or an application) could depend on
`@aidex/memory`; it depends on nothing in return.
