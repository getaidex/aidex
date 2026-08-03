import { describe, expect, it } from 'vitest';
import { JsonRpcErrorCode } from './JsonRpcErrorCode.js';
import { buildParseErrorResponse } from './buildParseErrorResponse.js';

describe('buildParseErrorResponse', () => {
  it('builds a JSON-RPC 2.0 Parse Error response with id: null', () => {
    const response = buildParseErrorResponse('Unexpected token in JSON');

    expect(response).toEqual({
      jsonrpc: '2.0',
      id: null,
      error: { code: JsonRpcErrorCode.ParseError, message: 'Parse error: Unexpected token in JSON' },
    });
  });

  it('is a pure function of its message argument', () => {
    expect(buildParseErrorResponse('x')).toEqual(buildParseErrorResponse('x'));
  });
});
