/**
 * The one MCP wire-protocol version this server speaks. Defined once;
 * every place that needs it (`buildServerMetadata`, and through it the
 * `initialize` response) imports this constant rather than repeating the
 * literal — "do not hardcode values in multiple places."
 */
export const MCP_PROTOCOL_VERSION = '2024-11-05';
