# Memory

`@aidex/memory` is a generic, in-memory key/value storage primitive. **This
is not AI chat memory, not a vector database, and not tied to prompts in any
way** — it's a reusable KV abstraction, nothing more. It has no dependency on
anything else in the platform, not even `@aidex/core`.

## The primitive

```ts
import { Memory } from '@aidex/memory';

const memory = new Memory<string>();

memory.set('user-id', 'abc123');
memory.has('user-id'); // true
memory.get('user-id'); // 'abc123'
memory.delete('user-id');
memory.clear();
```

`Memory` is synchronous, backed by a plain `Map` internally. No persistence,
no expiration, no serialization — values live only as long as the `Memory`
instance does.

## Naming a store

`MemoryStore` is a thin, named wrapper around one `Memory` instance,
representing a single logical memory — `"conversation"`, `"workflow"`,
`"cache"`, `"session"`, whatever your application calls it:

```ts
import { Memory, MemoryStore } from '@aidex/memory';

const store = new MemoryStore('conversation', new Memory<string[]>());
store.name; // 'conversation'
store.getMemory().set('turn-1', ['hello']);
```

`MemoryStore` composes a `Memory`, it does not extend one — and it exposes
only `name` and `getMemory()`, nothing else.

## Building conversation state on top of it

Because `Memory<TValue>` is generic over the value type, it's a natural
building block for client-managed conversation state — store an array of
turns per session id, or one `MemoryStore` per conversation. The primitive
itself has no opinion about what you store; that logic lives in your
application, not in this package.

See [17 — Memory Store](/examples/17-memory-store) for a full runnable
walkthrough.
