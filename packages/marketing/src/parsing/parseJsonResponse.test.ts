import { describe, expect, it } from 'vitest';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { parseJsonResponse } from './parseJsonResponse.js';

describe('parseJsonResponse', () => {
  it('parses plain JSON', () => {
    expect(parseJsonResponse('s', '{"a":1}')).toEqual({ a: 1 });
  });

  it('strips a ```json ... ``` fence before parsing', () => {
    expect(parseJsonResponse('s', '```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('throws UnparsableProviderResponseError for invalid JSON', () => {
    expect(() => parseJsonResponse('my-strategy', 'not json at all')).toThrow(
      UnparsableProviderResponseError
    );
  });

  it('carries the strategy name and raw content on the thrown error', () => {
    try {
      parseJsonResponse('my-strategy', 'not json');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(UnparsableProviderResponseError);
      const typed = error as UnparsableProviderResponseError;
      expect(typed.strategyName).toBe('my-strategy');
      expect(typed.rawContent).toBe('not json');
    }
  });
});
