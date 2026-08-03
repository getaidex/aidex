import { MCP_PROTOCOL_VERSION } from '../protocol/MCPProtocolVersion.js';
import type { MCPServerConfig } from '../types/MCPServerConfig.js';
import type { MCPServerMetadata } from '../types/MCPServerMetadata.js';

/**
 * Pure function of config — no registry state, no I/O. Its own step so
 * it's unit-testable independent of `MCPServer`, the same reason every
 * parse/build helper in this platform is factored out this way. The one
 * place `MCP_PROTOCOL_VERSION` is read from — `MCPProtocolHandler`'s
 * `initialize` response reads it from here, never repeats the literal.
 */
export function buildServerMetadata(config: MCPServerConfig): MCPServerMetadata {
  return {
    name: config.name,
    version: config.version,
    ...(config.description !== undefined ? { description: config.description } : {}),
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: {
      tools: true,
      resources: true,
      prompts: true,
    },
  };
}
