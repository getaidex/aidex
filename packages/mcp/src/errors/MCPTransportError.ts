/** Thrown by an `MCPTransport` implementation (e.g. `StdioTransport`) when it fails to parse or otherwise handle a message at the transport layer, before any registry ever sees it. */
export class MCPTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MCPTransportError';
    Object.setPrototypeOf(this, MCPTransportError.prototype);
  }
}
