/**
 * Thrown by `MCPToolRegistry.call()` when no tool is registered under the
 * given name. Mirrors `@aidex/engines`' `EngineNotFoundError` shape — its
 * own class here since that one's message is specific to "Engine".
 */
export class MCPToolNotFoundError extends Error {
  readonly toolName: string;

  constructor(toolName: string) {
    super(`MCP tool not found: "${toolName}"`);
    this.name = 'MCPToolNotFoundError';
    this.toolName = toolName;
    Object.setPrototypeOf(this, MCPToolNotFoundError.prototype);
  }
}
