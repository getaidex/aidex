/** Thrown by `MCPResourceRegistry.read()` when no resource is registered under the given uri. */
export class MCPResourceNotFoundError extends Error {
  readonly uri: string;

  constructor(uri: string) {
    super(`MCP resource not found: "${uri}"`);
    this.name = 'MCPResourceNotFoundError';
    this.uri = uri;
    Object.setPrototypeOf(this, MCPResourceNotFoundError.prototype);
  }
}
