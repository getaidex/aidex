# @aidex/mcp

A reusable **Model Context Protocol (MCP) server** — a real JSON-RPC 2.0
message handler over Tool/Resource/Prompt registries, plus one transport.
Not tied to Aidex Engines, Providers, Workflows, or any external MCP SDK.

## What this is

MCP is a protocol for exposing capabilities — tools a client can call,
resources it can read, prompts it can request — to an AI client (an IDE,
an agent host, a chat client) over a transport. `@aidex/mcp` is a working
MCP server foundation: three registries (one per registerable category),
a transport contract with one concrete implementation (`StdioTransport`),
and — as of Phase 2 — `MCPProtocolHandler`, which turns inbound JSON-RPC
2.0 payloads into responses by dispatching to those registries. It does
not itself decide what any tool/resource/prompt *does* — that's always
the registered object's own `execute`/`read`/`get`.

## What this is not

- **Not engine execution.** Nothing here calls `@aidex/engines`'
  `EngineRegistry`, and no `Engine` is registered as a tool. A future
  package can adapt an `Engine` into an `MCPTool` without this package
  changing — that's the whole point of `MCPTool` being a plain interface.
- **Not a Provider caller.** No AI calls, no vendor SDK, nothing
  network-facing beyond the transport's own I/O.
- **Not a Workflow runner.** `@aidex/workflow` is not a dependency.
- **Not a WebSocket/HTTP server.** `StdioTransport` remains the one
  concrete transport; `MCPTransport` stays the abstraction a future one
  would implement.
- **No external MCP library.** Every type and every JSON-RPC handler in
  this package is hand-written to this platform's own conventions, not
  imported from an MCP SDK.
- **Not Aidex's own SDK.** `@aidex/sdk`'s `AIBuilder` is unrelated; this
  package doesn't depend on it and isn't a dependency of it (yet).

## Public API

```ts
class MCPServer {
  readonly tools: MCPToolRegistry;
  readonly resources: MCPResourceRegistry;
  readonly prompts: MCPPromptRegistry;

  constructor(config: MCPServerConfig);
  getMetadata(): MCPServerMetadata;
  isStarted(): boolean;
  start(): Promise<void>;
  stop(): Promise<void>;
}

class MCPProtocolHandler {
  constructor(deps: MCPProtocolHandlerDeps);
  handleMessage(payload: unknown): Promise<JsonRpcResponse | JsonRpcResponse[] | undefined>;
}

class MCPToolRegistry {
  register(tool: MCPTool): void;
  unregister(name: string): boolean;
  has(name: string): boolean;
  get(name: string): MCPTool | undefined;
  list(): MCPTool[];
  call<TInput = unknown>(name: string, input: TInput): Promise<MCPToolResult>;
}

class MCPResourceRegistry {
  register(resource: MCPResource): void;
  unregister(uri: string): boolean;
  has(uri: string): boolean;
  get(uri: string): MCPResource | undefined;
  list(): MCPResource[];
  read(uri: string): Promise<MCPResourceContent>;
}

class MCPPromptRegistry {
  register(prompt: MCPPrompt): void;
  unregister(name: string): boolean;
  has(name: string): boolean;
  get(name: string): MCPPrompt | undefined;
  list(): MCPPrompt[];
  getMessages(name: string, args?: Record<string, string>): Promise<readonly MCPPromptMessage[]>;
}

class StdioTransport implements MCPTransport {
  readonly name: 'stdio';
  constructor(config?: StdioTransportConfig);
  start(onMessage: (message: unknown) => void | Promise<void>, onError?: (error: Error) => void): void;
  send(message: unknown): void;
  close(): void;
}
```

## JSON-RPC 2.0 message handling (Phase 2)

`MCPServer` wires every inbound transport payload through one
`MCPProtocolHandler`, and sends back whatever it returns (skipping
`send()` entirely when the result is `undefined`):

```ts
await this.config.transport.start(
  async (message) => {
    const response = await this.handler.handleMessage(message);
    if (response !== undefined) await this.config.transport.send(response);
  },
  async (error) => {
    this.config.logger?.error('MCP transport error', error);
    await this.config.transport.send(buildParseErrorResponse(error.message));
  }
);
```

`MCPProtocolHandler.handleMessage()` supports everything JSON-RPC 2.0
requires:

- **Single requests and notifications.** A message with an `id` property
  gets a response; a message with no `id` property (a notification) never
  does, even if the method throws — the server just never replies.
- **Batches.** An array of messages is processed in order; the response
  is an array containing only the non-notification results, or
  `undefined` if the batch was all notifications. An **empty** batch
  array is itself invalid — per the JSON-RPC 2.0 spec's own example, that
  returns one Invalid Request error object, not an empty or one-element
  array.
- **Id correlation.** Every response's `id` is exactly the request's own
  `id` (`string | number | null`) — `null` is a valid, real id (a request
  that explicitly used it), distinct from a notification's *absent* `id`.
- **The 7 standard methods:** `initialize`, `tools/list`, `tools/call`,
  `resources/list`, `resources/read`, `prompts/list`, `prompts/get`.

Every handler delegates to exactly one registry method and reshapes its
result into the wire format — it never contains capability logic itself:

| Method | Delegates to | Wire result |
| --- | --- | --- |
| `initialize` | `getMetadata()` | `{ protocolVersion, capabilities, serverInfo }` |
| `tools/list` | `tools.list()` | `{ tools: [{name, description?, inputSchema?}] }` |
| `tools/call` | `tools.call(name, arguments)` | the tool's own `MCPToolResult` |
| `resources/list` | `resources.list()` | `{ resources: [{uri, name, description?, mimeType?}] }` |
| `resources/read` | `resources.read(uri)` | `{ contents: [resourceContent] }` |
| `prompts/list` | `prompts.list()` | `{ prompts: [{name, description?, arguments?}] }` |
| `prompts/get` | `prompts.getMessages(name, args)` + `prompts.get(name)` | `{ description?, messages }` |

## JSON-RPC errors

Five standard, reserved error codes — no application-defined codes:

| Code | Name | When |
| --- | --- | --- |
| `-32700` | Parse error | The transport failed to parse a payload as JSON at all (`id` is always `null`) |
| `-32600` | Invalid Request | Not a JSON object; wrong/missing `jsonrpc`; missing/non-string `method`; empty batch |
| `-32601` | Method not found | A syntactically valid `method` that isn't one of the 7 supported |
| `-32602` | Invalid params | Missing/wrong-typed required params, or a `name`/`uri` that isn't registered (`MCPToolNotFoundError`/`MCPResourceNotFoundError`/`MCPPromptNotFoundError`, caught and re-mapped) |
| `-32603` | Internal error | Anything else a handler or a registered tool/resource/prompt throws |

**No stack trace ever reaches a response.** A deliberate
`JsonRpcProtocolError` carries its own `code`/`message`/`data`, used
as-is; anything else — a real bug, a tool implementation throwing — is
reported as the fixed, generic message `"Internal error"`, never the
original error's own message or `.stack`.

## The three contracts

Each is a plain interface — nothing this package ships implements one.
An application (or a future adapter package) provides real
implementations and registers them.

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

`MCPPrompt` is deliberately named to avoid colliding with `@aidex/prompts`'
`PromptTemplate`: that package's prompts are this platform's own internal
LLM-prompt templating, rendered server-side before a Provider call.
`MCPPrompt` is a *protocol-level* prompt a client requests directly —
same word, different layer, no relationship between the two.

## Example usage

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

await server.stop();
```

## Dependencies

`@aidex/core` only — for `DuplicateRegistrationError` (reused rather than
inventing a bespoke duplicate error, the same class every other registry
in this platform throws) and `ILogger` (the optional `MCPServerConfig.logger`
field). Nothing else: no `@aidex/engines`, no `@aidex/providers`, no
`@aidex/workflow`, no `@aidex/prompts`, no `@aidex/sdk`, no external MCP SDK.

## Design decisions

**Three registries, not one.** Tools, resources, and prompts are
distinct MCP capability categories with different keys (`name` for tools
and prompts, `uri` for resources) and different dispatch semantics
(`call`/`read`/`getMessages`) — one generic registry would have to erase
those differences. Each mirrors `@aidex/engines`' `EngineRegistry` shape
exactly: `register`/`unregister`/`has`/`get`/`list`, plus one
category-specific dispatch method.

**Protocol logic lives in `MCPProtocolHandler`, not in `MCPServer` or the
registries.** `MCPServer` only wires transport in/out to the handler; the
registries only register/dispatch by key. Envelope validation, batch/
notification semantics, method routing, and JSON-RPC error-code mapping
are `MCPProtocolHandler`'s job exclusively — "do not expose protocol
logic inside the registries; registries remain transport-agnostic" holds
exactly as it did in Phase 1, now with a real dispatcher sitting between
the transport and the registries instead of a stub.

**`buildServerMetadata()` is the one source of truth for `initialize`.**
`MCPProtocolHandler`'s `initialize` handler never hardcodes `name`,
`version`, `protocolVersion`, or `capabilities` — it reads all four from
`getMetadata()` (backed by `buildServerMetadata()`), the same values
`MCPServer.getMetadata()` returns directly. `MCP_PROTOCOL_VERSION` is
defined in exactly one file and imported everywhere it's needed.

**A `JsonRpcProtocolError` boundary, not ad hoc error objects.** Every
method handler throws this one error type (or lets an unexpected error
propagate) rather than building a JSON-RPC error object inline — the
dispatcher's single `errorResponseFrom()` is the only place a `code`/
`message`/`data` ever becomes part of a response, which is also the only
place that has to remember "never read `.stack`."

**`MCPToolNotFoundError`/`MCPResourceNotFoundError`/`MCPPromptNotFoundError`
map to Invalid params, not Internal error.** The request was well-formed;
a `name`/`uri` value just didn't correspond to anything registered — the
same category as any other invalid parameter value, not a server bug.

**`StdioTransport` takes injectable streams, not just `process.stdin`/
`process.stdout`.** The same "accept a config object, default the real
thing" shape every Provider/Engine config in this platform uses — makes
it testable with a `PassThrough` pair instead of the real process streams.

**`onMessage`/`send` are typed `unknown`, not a fixed object shape.** A
JSON-RPC payload may be a single object *or* a batch array; the transport
layer has no opinion on which. Interpreting the shape is
`MCPProtocolHandler`'s job.

**No external MCP SDK.** Every type and handler here is hand-written to
exactly the shape this phase needs, not imported from
`@modelcontextprotocol/sdk` or similar — consistent with every other
package in this platform staying free of vendor lock-in at the type
level.
