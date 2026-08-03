/**
 * Thrown by ToolRegistry.execute() when no tool is registered under the
 * given id.
 */
export class ToolNotFoundError extends Error {
  readonly toolId: string;

  constructor(toolId: string) {
    super(`Tool not found: "${toolId}"`);
    this.name = 'ToolNotFoundError';
    this.toolId = toolId;
    Object.setPrototypeOf(this, ToolNotFoundError.prototype);
  }
}
