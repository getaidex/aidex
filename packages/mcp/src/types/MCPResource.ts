export interface MCPResourceContent {
  readonly uri: string;
  readonly mimeType?: string;
  readonly text?: string;
}

/**
 * The contract a registerable MCP resource must satisfy. Keyed by `uri`,
 * not `name` — two resources may share a display name, but a URI is the
 * thing a client actually reads by. `read()` is the resource's own
 * handler; this package never decides what a resource's content is or
 * where it comes from.
 */
export interface MCPResource {
  readonly uri: string;
  readonly name: string;
  readonly description?: string;
  readonly mimeType?: string;
  read(): Promise<MCPResourceContent>;
}
