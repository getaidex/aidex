import { describe, expect, it } from 'vitest';
import { JsonRpcErrorCode } from './JsonRpcErrorCode.js';
import { JsonRpcProtocolError } from './JsonRpcProtocolError.js';

describe('JsonRpcProtocolError', () => {
  it('carries its code, message, and optional data', () => {
    const error = new JsonRpcProtocolError(JsonRpcErrorCode.InvalidParams, 'bad params', { field: 'name' });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(JsonRpcProtocolError);
    expect(error.name).toBe('JsonRpcProtocolError');
    expect(error.code).toBe(JsonRpcErrorCode.InvalidParams);
    expect(error.message).toBe('bad params');
    expect(error.data).toEqual({ field: 'name' });
  });

  it('leaves data undefined when not supplied', () => {
    const error = new JsonRpcProtocolError(JsonRpcErrorCode.MethodNotFound, 'unknown method');

    expect(error.data).toBeUndefined();
  });
});
