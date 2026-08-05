# 19 — MCP Engine Bridge (Bonus)

**Bonus · Package Coverage · Intermediate · ~10 min**

## What problem does this solve?
You already have Aidex `Engine`s (built-in feature-pack ones, or your
own custom ones from 14-custom-engine) and want to expose them to an
MCP client without hand-writing an `MCPTool` wrapper for each one.

## Why would I use this Aidex feature?
`EngineRegistryToMCPAdapter.registerAll()` bulk-converts every `Engine`
in an `EngineRegistry` into a real `MCPTool` on an `MCPServer` — the
tool's name is the engine's `id`, and calling it invokes the real
engine via the exact same `ExecutionContext` shape `ai.engine(id).execute()`
uses internally. It's idempotent: call it again after registering more
engines and only the new ones get added.

## When should I use this in a real project?
Any time you want an MCP client to be able to invoke your existing
Aidex engines directly — you write the engine once (see
14-custom-engine), and this package is the one place it becomes
reachable over MCP with no extra per-engine glue code.

## Requirements
- Node ≥18, pnpm — no API key needed; the demo engine is fully deterministic.

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples mcp-engine-bridge
```

## Expected output
```
Engines exposed as MCP tools: [ 'text.word-count' ]
Response: {"jsonrpc":"2.0","id":1,"result":{"tools":[{"name":"text.word-count","description":"Counts words in the given text"}]}}
Response: {"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"{\"wordCount\":7}"}]}}

Server stopped.
```
(Verify the exact JSON against your actual run — field ordering isn't guaranteed.)

## Concepts learned
- `EngineRegistryToMCPAdapter` bulk-exposing an `EngineRegistry` as MCP tools
- The full Engine → MCPTool → JSON-RPC pipeline, end to end
- Why a `Provider` is still required even for an engine that never calls it

## Related packages
`@aidex/mcp-aidex`, `@aidex/mcp`, `@aidex/engines`, `@aidex/core`

## Next example
[20 — Build a CLI](../20-build-a-cli/README.md) — the last bonus
example: a tiny command-dispatch layer over one `AI` instance.
