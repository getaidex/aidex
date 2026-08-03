import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { AnalyticsInsightsEngine } from './AnalyticsInsightsEngine.js';

const VALID_RESPONSE = JSON.stringify({
  insights: [{ observation: 'Churn is up', recommendation: 'Investigate' }],
});

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('AnalyticsInsightsEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new AnalyticsInsightsEngine();
    expect(engine.id).toBe('marketing.analytics.insights');
    expect(engine.version).toBe('1.0.0');
  });

  it('has no brief requirement — metrics alone is enough', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new AnalyticsInsightsEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: engine.id, input: { metrics: [{ name: 'churn', value: 4 }] } })
    );

    expect(result.insights).toEqual([{ observation: 'Churn is up', recommendation: 'Investigate' }]);
  });

  it('rejects a request with an empty metrics array', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new AnalyticsInsightsEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: { metrics: [] } }))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });
});
