/** The one JSON-RPC version this server speaks — every envelope this package builds or validates uses this literal, defined once. */
export const JSONRPC_VERSION = '2.0';

export type JsonRpcId = string | number | null;

export interface JsonRpcRequestMessage {
  readonly jsonrpc: '2.0';
  readonly id: JsonRpcId;
  readonly method: string;
  readonly params?: unknown;
}

/** Identical to `JsonRpcRequestMessage` except it has no `id` — the presence of the `id` property, not its value, is what makes a message a notification. */
export interface JsonRpcNotificationMessage {
  readonly jsonrpc: '2.0';
  readonly method: string;
  readonly params?: unknown;
}

export interface JsonRpcErrorObject {
  readonly code: number;
  readonly message: string;
  readonly data?: unknown;
}

export interface JsonRpcSuccessResponse {
  readonly jsonrpc: '2.0';
  readonly id: JsonRpcId;
  readonly result: unknown;
}

export interface JsonRpcErrorResponse {
  readonly jsonrpc: '2.0';
  readonly id: JsonRpcId;
  readonly error: JsonRpcErrorObject;
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;
