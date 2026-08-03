import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { CAMPAIGN_CALENDAR_PROMPT } from '../prompts/campaignCalendarPrompt.js';
import { CampaignCalendarStrategy } from './CampaignCalendarStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(CAMPAIGN_CALENDAR_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const VALID_INPUT = { campaignContext: 'Summer sale campaign', startDate: '2026-01-01', durationDays: 2 };
const VALID_RESPONSE = JSON.stringify({ activities: ['Launch teaser', 'Main promotion'] });

describe('CampaignCalendarStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new CampaignCalendarStrategy(makePrompts());
    expect(strategy.name).toBe('marketing-campaign-calendar');
    expect(strategy.version).toBe('1.0.0');
  });

  it('combines deterministic date/channel with AI-generated activities', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new CampaignCalendarStrategy(makePrompts());

    const result = await strategy.execute({ strategy: strategy.name, input: VALID_INPUT }, makeContext(provider));

    expect(result.entries).toEqual([
      { date: '2026-01-01', channel: 'content', activity: 'Launch teaser' },
      { date: '2026-01-02', channel: 'content', activity: 'Main promotion' },
    ]);
  });

  it('cycles through explicit channels', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new CampaignCalendarStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { ...VALID_INPUT, channels: ['email', 'social'] } },
      makeContext(provider)
    );

    expect(result.entries.map((e) => e.channel)).toEqual(['email', 'social']);
  });

  it('rejects a missing campaignContext', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new CampaignCalendarStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: strategy.name, input: { startDate: '2026-01-01', durationDays: 2 } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });

  it('rejects a non-positive durationDays', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new CampaignCalendarStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: strategy.name, input: { ...VALID_INPUT, durationDays: 0 } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });

  it('throws UnparsableProviderResponseError when activities length does not match durationDays', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() { return { content: JSON.stringify({ activities: ['only one'] }) }; },
    };
    const strategy = new CampaignCalendarStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: VALID_INPUT }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});
