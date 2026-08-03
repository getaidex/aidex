import type { Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { buildEngineContext } from './buildEngineContext.js';

describe('buildEngineContext', () => {
  it('builds an ExecutionContext carrying the provider and request', () => {
    const provider: Provider = { name: 'p', async generate() { return { content: '' }; } };
    const context = buildEngineContext(provider, 'document.review', {
      source: { content: 'x', mimeType: 'text/plain' },
    });

    expect(context.provider).toBe(provider);
    expect(context.config.provider).toBe(provider);
    expect(context.request).toEqual({
      strategy: 'document.review',
      input: { source: { content: 'x', mimeType: 'text/plain' } },
    });
  });
});
