/**
 * Describes the server itself — name, version, the MCP wire-protocol
 * version it speaks, and which of the three registerable categories it
 * supports. `capabilities` are always `true` here: this server always
 * *supports* tools/resources/prompts as a category (it always has the
 * registry for each), independent of whether anything is registered into
 * a given one right now — the same capability-vs-current-contents
 * distinction the real MCP spec draws. `protocolVersion` is this
 * package's one source of truth for that value — see
 * `buildServerMetadata()` and `MCP_PROTOCOL_VERSION`.
 */
export interface MCPServerMetadata {
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly protocolVersion: string;
  readonly capabilities: {
    readonly tools: boolean;
    readonly resources: boolean;
    readonly prompts: boolean;
  };
}
