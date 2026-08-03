import type { ExecutionContext } from '@aidex/core';
import type { EngineRegistry } from '@aidex/engines';
import type { MCPServer } from '@aidex/mcp';

/**
 * `engineRegistry` is the existing, already-populated `EngineRegistry`
 * to expose — this package never constructs one. `mcpServer` and
 * `context` are passed straight through to the one `MCPAidexAdapter` this
 * class owns internally; see that config's own doc comment for why
 * `context` is required.
 */
export interface EngineRegistryToMCPAdapterConfig {
  readonly engineRegistry: EngineRegistry;
  readonly mcpServer: MCPServer;
  readonly context: ExecutionContext;
}
