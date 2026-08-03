import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { CampaignBriefEngine } from './CampaignBriefEngine.js';

const VALID_RESPONSE = JSON.stringify({ document: 'A formal brief.', objectives: ['Establish presence'] });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('CampaignBriefEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new CampaignBriefEngine();
    expect(engine.id).toBe('marketing.campaign.brief');
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a campaign brief via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new CampaignBriefEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: engine.id, input: { brief: 'Launch idea' } })
    );

    expect(result.document).toBe('A formal brief.');
  });

  it('rejects a request missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new CampaignBriefEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: {} }))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });
});
