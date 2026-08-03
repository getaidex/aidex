import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { CampaignCalendarEngine } from './CampaignCalendarEngine.js';

const VALID_INPUT = { campaignContext: 'Summer sale campaign', startDate: '2026-01-01', durationDays: 2 };
const VALID_RESPONSE = JSON.stringify({ activities: ['Teaser', 'Main push'] });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('CampaignCalendarEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new CampaignCalendarEngine();
    expect(engine.id).toBe('marketing.campaign.calendar');
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a calendar via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new CampaignCalendarEngine();

    const result = await engine.execute(makeContext(provider, { strategy: engine.id, input: VALID_INPUT }));

    expect(result.entries).toEqual([
      { date: '2026-01-01', channel: 'content', activity: 'Teaser' },
      { date: '2026-01-02', channel: 'content', activity: 'Main push' },
    ]);
  });

  it('rejects a request with a missing or non-positive durationDays', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new CampaignCalendarEngine();

    await expect(
      engine.execute(
        makeContext(provider, {
          strategy: engine.id,
          input: { campaignContext: 'x', startDate: '2026-01-01' },
        })
      )
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });
});
