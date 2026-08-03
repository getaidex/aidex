import { JSONRPC_VERSION, type JsonRpcErrorResponse } from './JsonRpc.js';
import { JsonRpcErrorCode } from './JsonRpcErrorCode.js';

/**
 * Builds the one response JSON-RPC 2.0 requires when a transport fails to
 * parse an inbound payload as JSON at all — `id` is always `null`, since
 * a request id, if any, was never successfully parsed out. Takes a plain
 * message string, never the original `Error` object — the caller (an
 * `MCPTransport`'s `onError`) only ever has an `Error`'s `.message` to
 * offer here, not its stack.
 */
export function buildParseErrorResponse(message: string): JsonRpcErrorResponse {
  return {
    jsonrpc: JSONRPC_VERSION,
    id: null,
    error: { code: JsonRpcErrorCode.ParseError, message: `Parse error: ${message}` },
  };
}
