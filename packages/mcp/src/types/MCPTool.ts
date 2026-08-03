import type { MCPContentBlock } from './MCPContentBlock.js';

export interface MCPToolResult {
  readonly content: readonly MCPContentBlock[];
  readonly isError?: boolean;
}

/**
 * The contract a registerable MCP tool must satisfy — nothing here knows
 * what a tool *does*. `execute()` is the tool's own handler; this
 * foundation package never calls a Provider, an Aidex Engine, or a
 * Workflow on a tool's behalf. A future package can implement `MCPTool`
 * by wrapping an `@aidex/engines` `Engine` (or anything else) without this
 * interface, `MCPToolRegistry`, or `MCPServer` changing at all.
 */
export interface MCPTool<TInput = unknown> {
  readonly name: string;
  readonly description?: string;
  /** JSON Schema describing the tool's input shape, exposed to clients as-is — never validated here. */
  readonly inputSchema?: Record<string, unknown>;
  execute(input: TInput): Promise<MCPToolResult>;
}
