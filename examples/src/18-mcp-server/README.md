# 18 — MCP Server (Bonus)

**Bonus · Package Coverage · Intermediate · ~10 min**

## What problem does this solve?
You want to expose tools/resources/prompts to an MCP-speaking client
(like an AI coding assistant) without hand-rolling JSON-RPC 2.0
envelope handling, method routing, or transport framing yourself.

## Why would I use this Aidex feature?
`@aidex/mcp` is a real MCP server foundation: register tools/resources
on `server.tools`/`server.resources`, call `server.start()`, and the
package's own `MCPProtocolHandler` handles `initialize`, `tools/list`,
`tools/call`, `resources/list`, `resources/read`, `prompts/list`,
`prompts/get` for you — you only ever implement `execute()`/`read()`
for the capabilities you register.

## When should I use this in a real project?
Building a real MCP server for a coding assistant, editor plugin, or
any other MCP client to connect to. This package defines the server
architecture — pair it with `@aidex/mcp-aidex` (next example) if you
want to expose existing Aidex `Engine`s as MCP tools automatically
rather than hand-writing each one.

## Requirements
- Node ≥18, pnpm — no API key needed, this example never calls a provider.

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples mcp-server
```

## Expected output
```
Response: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{},"resources":{},"prompts":{}},"serverInfo":{"name":"aidex-example-server","version":"1.0.0"}}}
Response: {"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"echo","description":"Echoes back whatever text you send it","inputSchema":{"type":"object","properties":{"text":{"type":"string"}},"required":["text"]}}]}}
Response: {"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"You said: hello from the client"}]}}
Response: {"jsonrpc":"2.0","id":4,"result":{"contents":[{"uri":"aidex://readme","mimeType":"text/plain","text":"Aidex is a modular, provider-agnostic AI application platform."}]}}

Server stopped.
```

## Concepts learned
- `MCPServer` + `StdioTransport` wired together, driven via `PassThrough` pipes instead of real stdio
- The real JSON-RPC 2.0 method names this foundation dispatches (`initialize`, `tools/list`, `tools/call`, `resources/read`, ...)
- Registering both a tool and a resource on the same server

## Related packages
`@aidex/mcp`

## Next example
[19 — MCP Engine Bridge](../19-mcp-engine-bridge/README.md) — expose
existing Aidex `Engine`s as MCP tools automatically, instead of
hand-writing each tool's `execute()`.
