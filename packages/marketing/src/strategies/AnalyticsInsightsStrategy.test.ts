import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { ANALYTICS_INSIGHTS_PROMPT } from '../prompts/analyticsInsightsPrompt.js';
import { AnalyticsInsightsStrategy } from './AnalyticsInsightsStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(ANALYTICS_INSIGHTS_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const METRICS = [{ name: 'churn', value: 4 }];
const VALID_RESPONSE = JSON.stringify({
  insights: [{ observation: 'Churn is above target', recommendation: 'Launch a retention campaign' }],
});

describe('AnalyticsInsightsStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new AnalyticsInsightsStrategy(makePrompts());
    expect(strategy.name).toBe('marketing-analytics-insights');
    expect(strategy.version).toBe('1.0.0');
  });

  it('has no brief requirement — metrics alone is enough', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new AnalyticsInsightsStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { metrics: METRICS } },
      makeContext(provider)
    );

    expect(result.insights).toEqual([
      { observation: 'Churn is above target', recommendation: 'Launch a retention campaign' },
    ]);
  });

  it('includes an explicit goal in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: VALID_RESPONSE };
      },
    };
    const strategy = new AnalyticsInsightsStrategy(makePrompts());

    await strategy.execute(
      { strategy: strategy.name, input: { metrics: METRICS, goal: 'retention' } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('retention');
  });

  it('rejects a request with an empty metrics array', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new AnalyticsInsightsStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { metrics: [] } }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });

  it('throws UnparsableProviderResponseError when insights is empty', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() { return { content: JSON.stringify({ insights: [] }) }; },
    };
    const strategy = new AnalyticsInsightsStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { metrics: METRICS } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});
