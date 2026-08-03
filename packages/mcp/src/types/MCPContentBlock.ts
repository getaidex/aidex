/**
 * The one content shape every MCP surface (tool results, prompt messages)
 * can carry in this foundation — text only. Image/audio/embedded-resource
 * content blocks are part of the real MCP spec but are deliberately out
 * of scope here: this package defines the server architecture, not a
 * full protocol implementation.
 */
export interface MCPContentBlock {
  readonly type: 'text';
  readonly text: string;
}
