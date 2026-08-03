import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { assertHasValidSource } from './assertHasValidSource.js';

describe('assertHasValidSource', () => {
  it('passes when source has a non-empty url and mimeType', () => {
    expect(() =>
      assertHasValidSource('origin', { source: { url: 'https://x', mimeType: 'image/png' } })
    ).not.toThrow();
  });

  it('throws when input is undefined, null, or not an object', () => {
    expect(() => assertHasValidSource('origin', undefined)).toThrow(InvalidMediaEngineInputError);
    expect(() => assertHasValidSource('origin', null)).toThrow(InvalidMediaEngineInputError);
    expect(() => assertHasValidSource('origin', 'x')).toThrow(InvalidMediaEngineInputError);
  });

  it('throws when source is missing entirely', () => {
    expect(() => assertHasValidSource('origin', {})).toThrow(
      'request.input must be an object with a "source" property'
    );
  });

  it('throws when source.url or source.mimeType is missing or empty', () => {
    expect(() => assertHasValidSource('origin', { source: { mimeType: 'image/png' } })).toThrow(
      'source.url and source.mimeType must be non-empty strings'
    );
    expect(() => assertHasValidSource('origin', { source: { url: '', mimeType: 'image/png' } })).toThrow(
      'source.url and source.mimeType must be non-empty strings'
    );
    expect(() => assertHasValidSource('origin', { source: { url: 'https://x' } })).toThrow(
      'source.url and source.mimeType must be non-empty strings'
    );
  });

  it('preserves access to other already-present fields after narrowing', () => {
    const input: unknown = { brief: 'x', source: { url: 'https://x', mimeType: 'image/png' } };
    assertHasValidSource('origin', input);
    // Compiles and reads correctly post-assertion — the real point of this test.
    expect((input as Record<string, unknown>).brief).toBe('x');
    expect(input.source).toEqual({ url: 'https://x', mimeType: 'image/png' });
  });
});
