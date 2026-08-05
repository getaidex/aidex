# MCP

`@aidex/mcp` is a reusable **Model Context Protocol** server — a real
JSON-RPC 2.0 message handler over Tool/Resource/Prompt registries, plus one
transport (`StdioTransport`). It has no dependency on Aidex Engines,
Providers, Workflows, or any external MCP SDK — every type and handler is
hand-written to this platform's own conventions.

## Start a server

```ts
import { MCPServer, StdioTransport } from '@aidex/mcp';

const server = new MCPServer({
  name: 'my-aidex-mcp-server',
  version: '0.1.0',
  transport: new StdioTransport(),
});

server.tools.register({
  name: 'echo',
  description: 'Echoes the input back',
  async execute(input: { text: string }) {
    return { content: [{ type: 'text', text: input.text }] };
  },
});

await server.start();
// A client sending {"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"echo","arguments":{"text":"hi"}}}
// over stdio now gets back {"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"hi"}]}}.
```

`MCPServer` exposes three registries — `tools`, `resources`, `prompts` —
each with `register()`/`unregister()`/`has()`/`get()`/`list()` plus one
category-specific dispatch method (`call`/`read`/`getMessages`). Every
inbound message flows through one `MCPProtocolHandler`, which owns envelope
validation, batch/notification semantics, method routing, and JSON-RPC
error-code mapping — the registries stay transport-agnostic and never see
protocol logic.

## The three contracts you implement

```ts
interface MCPTool<TInput = unknown> {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  execute(input: TInput): Promise<MCPToolResult>;
}

interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  read(): Promise<MCPResourceContent>;
}

interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: readonly MCPPromptArgument[];
  get(args?: Record<string, string>): Promise<readonly MCPPromptMessage[]>;
}
```

`@aidex/mcp` ships none of these — you construct plain objects satisfying
them and register instances. `MCPPrompt` is a *protocol-level* prompt a
client requests directly; it's unrelated to `@aidex/prompts`' `PromptTemplate`
(this platform's own server-side LLM prompt templating) despite the shared
name.

## Bridging Engines onto MCP

`@aidex/mcp` itself never calls `@aidex/engines`' `EngineRegistry` — that
bridge lives in the separate `@aidex/mcp-aidex` package, which adapts a
registered `Engine` into an `MCPTool` automatically, so MCP-speaking clients
(an IDE, an agent host) can call your Engines without either package
changing.

## What it deliberately isn't

Not engine execution, not a Provider caller, not a Workflow runner, and not
a WebSocket/HTTP server — `StdioTransport` is the one concrete transport
today; `MCPTransport` is the abstraction a future one would implement.

See [18 — MCP Server](/examples/18-mcp-server) and
[19 — MCP Engine Bridge](/examples/19-mcp-engine-bridge) for full runnable
walkthroughs.
