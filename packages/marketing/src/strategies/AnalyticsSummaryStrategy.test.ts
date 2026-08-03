import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { ANALYTICS_SUMMARY_PROMPT } from '../prompts/analyticsSummaryPrompt.js';
import { AnalyticsSummaryStrategy } from './AnalyticsSummaryStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(ANALYTICS_SUMMARY_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const METRICS = [
  { name: 'clicks', value: 120 },
  { name: 'conversions', value: 8 },
];
const VALID_RESPONSE = JSON.stringify({
  summary: 'Clicks are strong but conversions lag.',
  highlights: ['Clicks up 20%', 'Conversion rate at 6.6%'],
});

describe('AnalyticsSummaryStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new AnalyticsSummaryStrategy(makePrompts());
    expect(strategy.name).toBe('marketing-analytics-summary');
    expect(strategy.version).toBe('1.0.0');
  });

  it('has no brief requirement — metrics alone is enough', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new AnalyticsSummaryStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { metrics: METRICS } },
      makeContext(provider)
    );

    expect(result.summary).toBe('Clicks are strong but conversions lag.');
    expect(result.highlights).toEqual(['Clicks up 20%', 'Conversion rate at 6.6%']);
  });

  it('includes an explicit periodLabel in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: VALID_RESPONSE };
      },
    };
    const strategy = new AnalyticsSummaryStrategy(makePrompts());

    await strategy.execute(
      { strategy: strategy.name, input: { metrics: METRICS, periodLabel: 'Q1 2026' } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('Q1 2026');
  });

  it('rejects a request with an empty metrics array', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new AnalyticsSummaryStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { metrics: [] } }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });

  it('throws UnparsableProviderResponseError when summary is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new AnalyticsSummaryStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { metrics: METRICS } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});
