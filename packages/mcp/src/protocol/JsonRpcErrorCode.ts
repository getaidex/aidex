/** The five standard, reserved JSON-RPC 2.0 error codes this server returns — no application-defined codes in this phase. */
export const JsonRpcErrorCode = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
} as const;

export type JsonRpcErrorCodeValue = (typeof JsonRpcErrorCode)[keyof typeof JsonRpcErrorCode];
