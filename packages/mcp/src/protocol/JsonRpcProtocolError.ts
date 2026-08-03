import type { JsonRpcErrorCodeValue } from './JsonRpcErrorCode.js';

/**
 * Thrown internally by `MCPProtocolHandler`'s method handlers to signal a
 * JSON-RPC-compliant failure; the handler catches it and builds the
 * response's `error` object directly from `code`/`message`/`data` — never
 * from this error's own `stack`, which is never read or serialized
 * anywhere in this package.
 */
export class JsonRpcProtocolError extends Error {
  readonly code: JsonRpcErrorCodeValue;
  readonly data?: unknown;

  constructor(code: JsonRpcErrorCodeValue, message: string, data?: unknown) {
    super(message);
    this.name = 'JsonRpcProtocolError';
    this.code = code;
    this.data = data;
    Object.setPrototypeOf(this, JsonRpcProtocolError.prototype);
  }
}
