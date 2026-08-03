import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { EmailCopyEngine } from './EmailCopyEngine.js';

const VALID_RESPONSE = JSON.stringify({ subject: 'Weekly digest', body: 'Here is the update.' });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('EmailCopyEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new EmailCopyEngine();
    expect(engine.id).toBe('marketing.email.copy');
    expect(engine.version).toBe('1.0.0');
  });

  it('generates subject/body via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new EmailCopyEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: engine.id, input: { brief: 'Weekly newsletter' } })
    );

    expect(result.subject).toBe('Weekly digest');
  });

  it('rejects a request missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new EmailCopyEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: {} }))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });
});
