import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { CAMPAIGN_BRIEF_PROMPT } from '../prompts/campaignBriefPrompt.js';
import { CampaignBriefStrategy } from './CampaignBriefStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(CAMPAIGN_BRIEF_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const VALID_RESPONSE = JSON.stringify({
  document: 'A formal campaign brief document.',
  objectives: ['Establish market presence'],
});

describe('CampaignBriefStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new CampaignBriefStrategy(makePrompts());
    expect(strategy.name).toBe('marketing-campaign-brief');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into CampaignBriefResult', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new CampaignBriefStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { brief: 'Launch idea' } },
      makeContext(provider)
    );

    expect(result.document).toBe('A formal campaign brief document.');
    expect(result.objectives).toEqual(['Establish market presence']);
  });

  it('includes an explicit product in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: VALID_RESPONSE };
      },
    };
    const strategy = new CampaignBriefStrategy(makePrompts());

    await strategy.execute(
      { strategy: strategy.name, input: { brief: 'x', product: 'Widget Pro' } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('Widget Pro');
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new CampaignBriefStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });

  it('throws UnparsableProviderResponseError when document is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new CampaignBriefStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});
