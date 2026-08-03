import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { CampaignPlanEngine } from './CampaignPlanEngine.js';

const VALID_RESPONSE = JSON.stringify({
  objectives: [{ goal: 'Increase awareness' }],
  summary: 'A focused campaign.',
});

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('CampaignPlanEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new CampaignPlanEngine();
    expect(engine.id).toBe('marketing.campaign.plan');
    expect(engine.name).toBeTruthy();
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a campaign plan via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new CampaignPlanEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: engine.id, input: { brief: 'Summer sale' } })
    );

    expect(result.objectives).toEqual([{ goal: 'Increase awareness' }]);
    expect(result.summary).toBe('A focused campaign.');
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new CampaignPlanEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });

  it('works unchanged against a second, differently-shaped Provider (provider independence)', async () => {
    const providerA: Provider = { name: 'a', async generate() { return { content: VALID_RESPONSE }; } };
    const providerB: Provider = { name: 'b', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new CampaignPlanEngine();
    const input = { brief: 'shared brief' };

    const resultA = await engine.execute(makeContext(providerA, { strategy: engine.id, input }));
    const resultB = await engine.execute(makeContext(providerB, { strategy: engine.id, input }));

    expect(resultA).toEqual(resultB);
  });
});
