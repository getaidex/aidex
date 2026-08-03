import type { ExecutionContext, Provider } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { CAMPAIGN_PLAN_PROMPT } from '../prompts/campaignPlanPrompt.js';
import { CampaignPlanStrategy } from './CampaignPlanStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(CAMPAIGN_PLAN_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const VALID_RESPONSE = JSON.stringify({
  objectives: [{ goal: 'Increase awareness', metric: 'impressions' }],
  summary: 'A focused summer campaign.',
});

describe('CampaignPlanStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new CampaignPlanStrategy(makePrompts());
    expect(strategy.name).toBe('marketing-campaign-plan');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into CampaignPlanResult', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new CampaignPlanStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { brief: 'Summer sale' } },
      makeContext(provider)
    );

    expect(result.objectives).toEqual([{ goal: 'Increase awareness', metric: 'impressions' }]);
    expect(result.summary).toBe('A focused summer campaign.');
    expect(result.channels).toEqual(['content']);
  });

  it('keeps channels deterministic (from input, not AI-derived)', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new CampaignPlanStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { brief: 'x', channels: ['email', 'social'] } },
      makeContext(provider)
    );

    expect(result.channels).toEqual(['email', 'social']);
  });

  it('includes targetAudience in the rendered prompt when supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: VALID_RESPONSE };
      },
    };
    const strategy = new CampaignPlanStrategy(makePrompts());

    await strategy.execute(
      { strategy: strategy.name, input: { brief: 'x', targetAudience: 'young professionals' } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('The target audience is young professionals');
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new CampaignPlanStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new CampaignPlanStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('throws UnparsableProviderResponseError when objectives is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new CampaignPlanStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('records observability events when configured', async () => {
    const provider: Provider = {
      name: 'p',
      async generate() { return { content: VALID_RESPONSE, metadata: { usage: { inputTokens: 1, outputTokens: 1 } } }; },
    };
    const observability = new ObservabilityBus();
    const strategy = new CampaignPlanStrategy(makePrompts(), { observability });

    await strategy.execute({ strategy: strategy.name, input: { brief: 'x' } }, makeContext(provider));

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'tokens']);
  });

  it('records a provider failure and rethrows', async () => {
    const error = new Error('provider down');
    const provider: Provider = { name: 'p', async generate() { throw error; } };
    const observability = new ObservabilityBus();
    const strategy = new CampaignPlanStrategy(makePrompts(), { observability });

    await expect(
      strategy.execute({ strategy: strategy.name, input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBe(error);
    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'error']);
  });
});
