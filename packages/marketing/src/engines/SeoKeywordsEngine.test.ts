import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { SeoKeywordsEngine } from './SeoKeywordsEngine.js';

const VALID_RESPONSE = JSON.stringify({ keywords: [{ keyword: 'running shoes' }] });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('SeoKeywordsEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new SeoKeywordsEngine();
    expect(engine.id).toBe('marketing.seo.keywords');
    expect(engine.version).toBe('1.0.0');
  });

  it('generates keywords via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new SeoKeywordsEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: engine.id, input: { brief: 'running shoes' } })
    );

    expect(result.keywords).toEqual([{ keyword: 'running shoes' }]);
  });

  it('rejects a request missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new SeoKeywordsEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: {} }))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });
});
