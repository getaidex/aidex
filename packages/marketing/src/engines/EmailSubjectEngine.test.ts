import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { EmailSubjectEngine } from './EmailSubjectEngine.js';

const VALID_RESPONSE = JSON.stringify({ subjects: ['Flash sale inside'] });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('EmailSubjectEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new EmailSubjectEngine();
    expect(engine.id).toBe('marketing.email.subject');
    expect(engine.version).toBe('1.0.0');
  });

  it('generates subjects via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new EmailSubjectEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: engine.id, input: { brief: 'Flash sale' } })
    );

    expect(result.subjects).toEqual(['Flash sale inside']);
  });

  it('rejects a request missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new EmailSubjectEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: {} }))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });
});
