# @aidex/mcp-aidex

## Installation

```sh
pnpm add @aidex/mcp-aidex
```

```sh
npm install @aidex/mcp-aidex
```

The adapter layer between **Aidex Engines** (`@aidex/engines`) and
**MCP Tools** (`@aidex/mcp`). Any `Engine`, from any Feature Pack, becomes
a real, executable MCP Tool with zero feature-pack-specific code.

## What this is

`@aidex/mcp` defines what an MCP Tool *is* (a plain `{name, description?,
inputSchema?, execute}` contract) but ships none — it deliberately knows
nothing about `@aidex/engines`. `@aidex/mcp-aidex` is the bridge: given any
object satisfying the `Engine` interface, it builds a real `MCPTool`
whose `execute()` calls that engine's own `execute()`, and it manages
registering/unregistering those tools into an existing `MCPServer`.

Three classes, layered:

- **`EngineToMCPToolAdapter`** — converts *one* `Engine` into *one*
  `MCPTool`. Pure mapping plus the execution wiring; owns no
  registration state.
- **`MCPAidexAdapter`** — the stateful registration lifecycle for
  individually-chosen engines. Wraps an existing `MCPServer`, uses one
  internal `EngineToMCPToolAdapter` to do every actual conversion, and
  keeps its own bookkeeping in sync with `mcpServer.tools`.
- **`EngineRegistryToMCPAdapter`** (Phase 3) — bulk-exposes *every*
  engine in an existing `@aidex/engines` `EngineRegistry`, automatically.
  Wraps one internal `MCPAidexAdapter`; owns no registration logic of its
  own.

## What this is not

- **No protocol implementation.** No JSON-RPC, no message parsing, no
  transport — that's entirely `@aidex/mcp`'s job. This package only ever
  calls `mcpServer.tools.register()`/`.unregister()`, never touches
  `MCPServer.start()`/`.stop()` or anything transport-related.
- **No providers, no AI execution.** This package never constructs a
  `Provider` and never calls one directly — `Engine.execute()` does that,
  the same way it always has. The `ExecutionContext` (provider included)
  is entirely the caller's, supplied once at construction and reused
  as-is for every execution.
- **No workflows.** `@aidex/workflow` is not a dependency.
- **No feature-pack-specific code.** Nothing here imports or references
  `DocumentEngine`, `ContentEngine`, `DesignEngine`, `MediaEngine`,
  `MarketingEngine`, or any other concrete Feature Pack class. Every
  operation uses only the generic `Engine` contract's four fields
  (`id`/`name`/`description`/`version`) and one method (`execute`).
- **No `@aidex/catalog` dependency.** Metadata mapping reads `Engine.id`/
  `.description`/`.version` directly off the live `Engine` object passed
  in — the most direct, driftless source there is. Going through a
  separately-registered `EngineMetadata` entry instead would risk exactly
  the kind of drift `@aidex/document`'s/`@aidex/content`'s own
  `metadata.test.ts` files guard against; reading the real object needs
  no such guard.

## Public API

```ts
class EngineToMCPToolAdapter {
  constructor(config: EngineToMCPToolAdapterConfig);
  adapt(engine: Engine): MCPTool;
}

class MCPAidexAdapter {
  constructor(config: MCPAidexAdapterConfig);
  registerEngine(engine: Engine): void;
  registerEngines(engines: readonly Engine[]): void;
  unregisterEngine(engineId: string): boolean;
  hasEngine(engineId: string): boolean;
  clear(): void;
  listRegisteredEngines(): Engine[];
}

interface EngineToMCPToolAdapterConfig {
  context: ExecutionContext; // shared, reused for every execution
}

interface MCPAidexAdapterConfig {
  mcpServer: MCPServer;
  context: ExecutionContext;
}

class EngineRegistryToMCPAdapter {
  constructor(config: EngineRegistryToMCPAdapterConfig);
  registerAll(): void;
  unregisterAll(): void;
  listRegisteredEngines(): Engine[];
}

interface EngineRegistryToMCPAdapterConfig {
  engineRegistry: EngineRegistry; // @aidex/engines
  mcpServer: MCPServer;
  context: ExecutionContext;
}
```

## Metadata mapping

| `MCPTool` field | Reused from |
| --- | --- |
| `name` | `Engine.id` |
| `description` | `Engine.description` |
| `inputSchema` | *(none — `Engine` has no JSON Schema equivalent)* |

Nothing is duplicated: `EngineToMCPToolAdapter.adapt()` reads `.id`/
`.description` straight off the `Engine` object every time it's called,
never caching a separate copy. `Engine.version` has no field on
`MCPTool` (the MCP tool schema doesn't define one) — it stays reachable
through `MCPAidexAdapter.listRegisteredEngines()`, which returns the
original `Engine` objects themselves.

## Execution flow

```
MCP client calls a tool
        ↓
MCPToolRegistry.call(name, input)      — @aidex/mcp, unchanged
        ↓
the adapted MCPTool's execute(input)   — built by EngineToMCPToolAdapter
        ↓
executeAdaptedEngine(engine, input, context)
        ↓
context = { ...baseContext, request: { strategy: engine.id, input } }
        ↓
engine.execute(context)                — the real Engine contract, reused as-is
        ↓
success → { content: [{ type: 'text', text: JSON.stringify(result) }] }
failure → { content: [{ type: 'text', text: error.message }], isError: true }
```

`input` reaches `context.request.input` completely unchanged — generic
object mapping, no feature-pack-specific conversion of any kind. An
engine's `Result` is arbitrary, Feature-Pack-defined JSON; the one
representation every possible result can carry without this package
knowing its shape is its JSON encoding in a single text content block.

**Errors are propagated, never swallowed, and never leak internals.** An
engine that throws is reported through the returned `MCPToolResult`
itself (`isError: true`, the thrown error's own `.message`) rather than
re-thrown — the caller still sees exactly why it failed, just never a
stack trace.

## Adapter lifecycle

```ts
import { MCPAidexAdapter } from '@aidex/mcp-aidex';
import { MCPServer, StdioTransport } from '@aidex/mcp';

const mcpServer = new MCPServer({ name: 'my-server', version: '1.0.0', transport: new StdioTransport() });
const adapter = new MCPAidexAdapter({ mcpServer, context: { config: { provider }, provider } });

adapter.registerEngine(new DocumentSummarizeEngine());
adapter.registerEngines([new ContentRewriteEngine(), new DesignPaletteEngine()]);

adapter.hasEngine('document.summarize'); // true
adapter.listRegisteredEngines();          // the real Engine instances
adapter.unregisterEngine('document.summarize');
adapter.clear();                          // removes everything this adapter registered
```

`registerEngine()` never executes the engine — it only builds and
registers a tool object. `mcpServer.tools` and this adapter's own
bookkeeping are kept synchronized by construction: `registerEngine()`
registers into `mcpServer.tools` *before* recording the engine locally,
so a `DuplicateRegistrationError` (thrown by `mcpServer.tools.register()`
— `@aidex/core`'s class, the same one every registry in this platform
throws) never leaves this adapter's own state out of sync with the
server's. `unregisterEngine()`/`hasEngine()` return booleans rather than
throwing, matching every registry (`EngineRegistry`, `MCPToolRegistry`,
...) in this platform.

## Automatic engine exposure (Phase 3)

`EngineRegistryToMCPAdapter` bulk-exposes every engine already in an
existing `EngineRegistry` — no per-engine wiring needed:

```ts
import { EngineRegistryToMCPAdapter } from '@aidex/mcp-aidex';
import { EngineRegistry } from '@aidex/engines';
import { MCPServer, StdioTransport } from '@aidex/mcp';

const engineRegistry = new EngineRegistry();
engineRegistry.register(new DocumentSummarizeEngine());
engineRegistry.register(new ContentRewriteEngine());
// ... every engine an application has, from any Feature Pack

const mcpServer = new MCPServer({ name: 'my-server', version: '1.0.0', transport: new StdioTransport() });
const autoAdapter = new EngineRegistryToMCPAdapter({
  engineRegistry,
  mcpServer,
  context: { config: { provider }, provider },
});

autoAdapter.registerAll(); // every engine in engineRegistry is now an MCP tool

engineRegistry.register(new DesignPaletteEngine()); // registered later
autoAdapter.registerAll();                          // idempotent — only the new one gets added

autoAdapter.unregisterAll(); // removes everything this adapter registered, cleanly
```

**Targets an `EngineRegistry`, not an "Aidex instance."** `@aidex/core`'s
`Aidex` class holds a `StrategyRegistry` and a `PluginRegistry` — it has
no knowledge of `Engine`/`EngineRegistry` at all, and never has anywhere
in this platform. `EngineRegistry` (`@aidex/engines`) is the real,
standalone object that actually holds a collection of engines,
constructed independently the same way every Feature Pack's own tests
already do. `EngineRegistryToMCPAdapter` adapts that real object.

**`registerAll()` is idempotent, not one-shot.** It skips any engine id
already registered *through this adapter* (checked via
`MCPAidexAdapter.hasEngine()`, not by catching a thrown error) — calling
it again after more engines were added to the `EngineRegistry` only
registers what's new. A collision with a tool registered by *anything
else* directly on `mcpServer.tools` is a genuine naming conflict, not a
duplicate this adapter already knows about, and still throws
`@aidex/core`'s `DuplicateRegistrationError` — the same fail-fast
behavior `MCPAidexAdapter.registerEngines()` has, so a real conflict is
never silently dropped.

**Owns zero registration logic.** Every mutating method is a thin loop
around one internal `MCPAidexAdapter`'s `registerEngine()`/`hasEngine()`/
`clear()` — the exact Engine→MCPTool mapping Phase 2 established, reused
completely unchanged.

## Dependencies

`@aidex/core` (`ExecutionContext`, `DuplicateRegistrationError` — reused,
not re-exported, the same convention every registry package in this repo
follows), `@aidex/engines` (the `Engine` contract and `EngineRegistry`),
`@aidex/mcp` (`MCPTool`, `MCPToolResult`, `MCPServer`). No `@aidex/catalog`,
no `@aidex/providers`, no `@aidex/workflow`, no `@aidex/sdk`, no external MCP
library, no Feature Pack.

## Design decisions

**Three classes, not one.** `EngineToMCPToolAdapter` is a pure per-engine
converter; `MCPAidexAdapter` is the stateful registration manager wrapping
an `MCPServer`; `EngineRegistryToMCPAdapter` (Phase 3) is the bulk/
automatic layer on top of that. Splitting them means the conversion logic (metadata
mapping, execution wiring) is unit-testable with zero `MCPServer`
involved, and the registration lifecycle is testable against a real
`MCPServer` without re-deriving the mapping rules.

**`InvalidEngineError` is the one new error type this package defines.**
It's thrown only when `Engine.id` isn't a non-empty string — the one
field that must be usable as both `MCPTool.name` and a registry key.
Every other failure mode reuses what already exists: duplicate
registration throws `@aidex/core`'s `DuplicateRegistrationError` (not a
new class); engine execution failures are never thrown at all — see
"Execution flow" above.

**`executeAdaptedEngine` is its own function, not inlined into
`EngineToMCPToolAdapter.adapt()`.** The same reason every parse/build
helper elsewhere in this platform is factored out this way: it's
independently unit-testable, and `adapt()` stays a small, obviously-pure
mapping function.

**Fail-fast, not partial-silent, on `registerEngines()`.** If one engine
in the list is a duplicate, registration stops there and the error
propagates — engines registered before it stay registered, matching
`@aidex/workflow`'s own "a step throws, execution stops immediately, no
later step runs" philosophy rather than silently skipping the bad one.
