import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { AnalyticsSummaryEngine } from './AnalyticsSummaryEngine.js';

const VALID_RESPONSE = JSON.stringify({ summary: 'Metrics look healthy.', highlights: [] });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('AnalyticsSummaryEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new AnalyticsSummaryEngine();
    expect(engine.id).toBe('marketing.analytics.summary');
    expect(engine.version).toBe('1.0.0');
  });

  it('has no brief requirement — metrics alone is enough', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new AnalyticsSummaryEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: engine.id, input: { metrics: [{ name: 'clicks', value: 1 }] } })
    );

    expect(result.summary).toBe('Metrics look healthy.');
  });

  it('rejects a request with an empty metrics array', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new AnalyticsSummaryEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: { metrics: [] } }))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });
});
