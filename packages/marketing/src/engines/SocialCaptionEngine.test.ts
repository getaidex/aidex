import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { SocialCaptionEngine } from './SocialCaptionEngine.js';

const VALID_RESPONSE = JSON.stringify({ caption: 'Check it out!' });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('SocialCaptionEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new SocialCaptionEngine();
    expect(engine.id).toBe('marketing.social.caption');
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a caption via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new SocialCaptionEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: engine.id, input: { brief: 'New launch' } })
    );

    expect(result.caption).toBe('Check it out!');
  });

  it('rejects a request missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new SocialCaptionEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: {} }))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });
});
