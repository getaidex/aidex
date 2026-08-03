import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { EmailSequenceEngine } from './EmailSequenceEngine.js';

const VALID_RESPONSE = JSON.stringify({
  steps: [{ subject: 'Welcome!', body: 'Thanks for joining.' }],
});

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('EmailSequenceEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new EmailSequenceEngine();
    expect(engine.id).toBe('marketing.email.sequence');
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a sequence via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new EmailSequenceEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: engine.id, input: { brief: 'Onboarding' } })
    );

    expect(result.steps).toEqual([{ subject: 'Welcome!', body: 'Thanks for joining.', sendDayOffset: 0 }]);
  });

  it('rejects a request missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new EmailSequenceEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: {} }))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });
});
