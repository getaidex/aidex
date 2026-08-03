import type { ExecutionContext } from '@aidex/core';
import type { MCPServer } from '@aidex/mcp';

/** `mcpServer` is the existing server this adapter registers into — this package never constructs one. `context` is passed straight through to the one `EngineToMCPToolAdapter` this class owns internally; see that config's own doc comment for why it's required. */
export interface MCPAidexAdapterConfig {
  readonly mcpServer: MCPServer;
  readonly context: ExecutionContext;
}
