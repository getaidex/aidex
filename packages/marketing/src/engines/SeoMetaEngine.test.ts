import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { SeoMetaEngine } from './SeoMetaEngine.js';

const VALID_RESPONSE = JSON.stringify({ title: 'Best Shoes', description: 'Find your pair.' });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('SeoMetaEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new SeoMetaEngine();
    expect(engine.id).toBe('marketing.seo.meta');
    expect(engine.version).toBe('1.0.0');
  });

  it('has no brief requirement — content alone is enough', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new SeoMetaEngine();

    const result = await engine.execute(makeContext(provider, { strategy: engine.id, input: { content: 'x' } }));

    expect(result.title).toBe('Best Shoes');
  });

  it('rejects a request with no content', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new SeoMetaEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: {} }))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });
});
