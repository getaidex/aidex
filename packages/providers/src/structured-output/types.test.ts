import { describe, expect, it } from 'vitest';
import type { Provider } from '@aidex/core';
import { isStructuredOutputProvider } from './types.js';

describe('isStructuredOutputProvider', () => {
  it('returns false for a Provider without generateStructured', () => {
    const provider: Provider = { name: 'plain', async generate() { return { content: 'x' }; } };
    expect(isStructuredOutputProvider(provider)).toBe(false);
  });

  it('returns true for a Provider that implements generateStructured', () => {
    const provider: Provider & { generateStructured: () => void } = {
      name: 'structured',
      async generate() {
        return { content: 'x' };
      },
      generateStructured() {},
    };
    expect(isStructuredOutputProvider(provider)).toBe(true);
  });

  it('returns false when generateStructured exists but is not a function', () => {
    const provider = { name: 'weird', generate: async () => ({ content: 'x' }), generateStructured: 'nope' };
    expect(isStructuredOutputProvider(provider as unknown as Provider)).toBe(false);
  });
});
