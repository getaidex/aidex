// Server
export { MCPServer } from './server/MCPServer.js';

// Registries
export { MCPToolRegistry } from './registry/MCPToolRegistry.js';
export { MCPResourceRegistry } from './registry/MCPResourceRegistry.js';
export { MCPPromptRegistry } from './registry/MCPPromptRegistry.js';

// Transport
export { StdioTransport } from './transport/StdioTransport.js';
export type { StdioTransportConfig } from './transport/StdioTransport.js';

// Protocol (Phase 2) — JSON-RPC 2.0 message handling, wired into
// MCPServer internally; exported for anyone testing/using it standalone.
export { MCPProtocolHandler } from './protocol/MCPProtocolHandler.js';
export type { MCPProtocolHandlerDeps } from './protocol/MCPProtocolHandler.js';
export { buildParseErrorResponse } from './protocol/buildParseErrorResponse.js';
export { JsonRpcProtocolError } from './protocol/JsonRpcProtocolError.js';
export { JsonRpcErrorCode } from './protocol/JsonRpcErrorCode.js';
export type { JsonRpcErrorCodeValue } from './protocol/JsonRpcErrorCode.js';
export { JSONRPC_VERSION } from './protocol/JsonRpc.js';
export type {
  JsonRpcId,
  JsonRpcRequestMessage,
  JsonRpcNotificationMessage,
  JsonRpcErrorObject,
  JsonRpcSuccessResponse,
  JsonRpcErrorResponse,
  JsonRpcResponse,
} from './protocol/JsonRpc.js';
export { MCP_PROTOCOL_VERSION } from './protocol/MCPProtocolVersion.js';

// Metadata
export { buildServerMetadata } from './metadata/buildServerMetadata.js';

// Errors
export { MCPToolNotFoundError } from './errors/MCPToolNotFoundError.js';
export { MCPResourceNotFoundError } from './errors/MCPResourceNotFoundError.js';
export { MCPPromptNotFoundError } from './errors/MCPPromptNotFoundError.js';
export { MCPTransportError } from './errors/MCPTransportError.js';

// Note: DuplicateRegistrationError (thrown by every register() method) is
// not re-exported — consumers import it directly from @aidex/core, the
// same convention every other registry package in this repo follows
// (@aidex/tools, @aidex/prompts, @aidex/engines, @aidex/catalog never
// re-export it either).

// Types
export type { MCPContentBlock } from './types/MCPContentBlock.js';
export type { MCPTool, MCPToolResult } from './types/MCPTool.js';
export type { MCPResource, MCPResourceContent } from './types/MCPResource.js';
export type { MCPPrompt, MCPPromptArgument, MCPPromptMessage } from './types/MCPPrompt.js';
export type { MCPTransport, MCPMessage } from './types/MCPTransport.js';
export type { MCPServerConfig } from './types/MCPServerConfig.js';
export type { MCPServerMetadata } from './types/MCPServerMetadata.js';
