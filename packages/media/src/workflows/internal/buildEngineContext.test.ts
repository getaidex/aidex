import type { Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { buildEngineContext } from './buildEngineContext.js';

describe('buildEngineContext', () => {
  it('builds an ExecutionContext carrying the provider and request', () => {
    const provider: Provider = { name: 'p', async generate() { return { content: '' }; } };
    const context = buildEngineContext(provider, 'media.image.optimize', { source: { url: 'x', mimeType: 'y' } });

    expect(context.provider).toBe(provider);
    expect(context.config.provider).toBe(provider);
    expect(context.request).toEqual({
      strategy: 'media.image.optimize',
      input: { source: { url: 'x', mimeType: 'y' } },
    });
  });
});
