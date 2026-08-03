/** Thrown by `MCPPromptRegistry.get()` when no prompt is registered under the given name. */
export class MCPPromptNotFoundError extends Error {
  readonly promptName: string;

  constructor(promptName: string) {
    super(`MCP prompt not found: "${promptName}"`);
    this.name = 'MCPPromptNotFoundError';
    this.promptName = promptName;
    Object.setPrototypeOf(this, MCPPromptNotFoundError.prototype);
  }
}
