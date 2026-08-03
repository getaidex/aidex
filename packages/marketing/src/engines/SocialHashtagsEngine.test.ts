import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { SocialHashtagsEngine } from './SocialHashtagsEngine.js';

const VALID_RESPONSE = JSON.stringify({ hashtags: ['#coffee'] });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('SocialHashtagsEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new SocialHashtagsEngine();
    expect(engine.id).toBe('marketing.social.hashtags');
    expect(engine.version).toBe('1.0.0');
  });

  it('generates hashtags via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new SocialHashtagsEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: engine.id, input: { brief: 'Coffee shop' } })
    );

    expect(result.hashtags).toEqual(['#coffee']);
  });

  it('rejects a request missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new SocialHashtagsEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: {} }))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });
});
