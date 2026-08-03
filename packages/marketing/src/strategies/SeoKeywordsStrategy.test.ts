import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { SEO_KEYWORDS_PROMPT } from '../prompts/seoKeywordsPrompt.js';
import { SeoKeywordsStrategy } from './SeoKeywordsStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(SEO_KEYWORDS_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const VALID_RESPONSE = JSON.stringify({
  keywords: [{ keyword: 'running shoes', estimatedVolume: 5000, difficulty: 'medium' }],
});

describe('SeoKeywordsStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new SeoKeywordsStrategy(makePrompts());
    expect(strategy.name).toBe('marketing-seo-keywords');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into SeoKeywordsResult', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new SeoKeywordsStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { brief: 'running shoes' } },
      makeContext(provider)
    );

    expect(result.keywords).toEqual([{ keyword: 'running shoes', estimatedVolume: 5000, difficulty: 'medium' }]);
  });

  it('drops an invalid difficulty value rather than passing it through', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: JSON.stringify({ keywords: [{ keyword: 'x', difficulty: 'extreme' }] }) };
      },
    };
    const strategy = new SeoKeywordsStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { brief: 'x' } },
      makeContext(provider)
    );

    expect(result.keywords[0]?.difficulty).toBeUndefined();
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new SeoKeywordsStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });

  it('throws UnparsableProviderResponseError when keywords is empty', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() { return { content: JSON.stringify({ keywords: [] }) }; },
    };
    const strategy = new SeoKeywordsStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});
