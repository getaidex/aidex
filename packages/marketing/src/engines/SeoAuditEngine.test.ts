import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { SeoAuditEngine } from './SeoAuditEngine.js';

const VALID_RESPONSE = JSON.stringify({ score: 80, findings: [] });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('SeoAuditEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new SeoAuditEngine();
    expect(engine.id).toBe('marketing.seo.audit');
    expect(engine.version).toBe('1.0.0');
  });

  it('has no brief requirement — url alone is enough', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new SeoAuditEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: engine.id, input: { url: 'https://x.test' } })
    );

    expect(result.score).toBe(80);
  });

  it('rejects a request with no url', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new SeoAuditEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: {} }))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });
});
