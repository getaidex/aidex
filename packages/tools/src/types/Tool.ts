/**
 * The contract every tool satisfies — a reusable capability an Engine (or
 * anything else) can invoke by id via ToolRegistry. `permissions` declares
 * what a caller must have been granted before `execute()` is allowed to
 * run. `inputSchema` is forward-compatible plumbing for future MCP
 * (Model Context Protocol) compatibility — MCP tools are described by
 * name/description/a JSON-schema input shape, so carrying an optional JSON
 * Schema-shaped object here today means a future MCP adapter can expose
 * these tools without this package changing. No MCP transport/handshake is
 * implemented — that's genuinely future work.
 */
export interface Tool<TInput = unknown, TResult = unknown> {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly permissions?: readonly string[];
  readonly inputSchema?: Record<string, unknown>;
  execute(input: TInput): Promise<TResult>;
}
