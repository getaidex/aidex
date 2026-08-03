/** A single, object-shaped JSON-RPC message. Kept for callers that specifically want that shape (e.g. building a response) — the transport itself moves `unknown`, since a raw parsed payload may also be a batch array. */
export interface MCPMessage {
  readonly [key: string]: unknown;
}

/**
 * The transport contract `MCPServer` starts/stops — how messages actually
 * move (stdio, a future HTTP/SSE transport, an in-memory pair for tests)
 * is entirely this interface's concern, never the server's. `start()`
 * begins listening and invokes `onMessage` for each inbound payload (and
 * `onError` for anything that fails to parse); `send()` writes one
 * outbound payload; `close()` stops listening.
 *
 * `onMessage`/`send` are typed `unknown`, not `MCPMessage`: a
 * JSON-RPC 2.0 payload may be a single object *or* a batch array, and
 * this transport layer has no opinion on which — validating and
 * interpreting the shape is `MCPProtocolHandler`'s job (Phase 2), not
 * this interface's or any implementation's.
 */
export interface MCPTransport {
  readonly name: string;
  start(onMessage: (message: unknown) => void | Promise<void>, onError?: (error: Error) => void): void | Promise<void>;
  send(message: unknown): void | Promise<void>;
  close(): void | Promise<void>;
}
