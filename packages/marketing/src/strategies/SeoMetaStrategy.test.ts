import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { SEO_META_PROMPT } from '../prompts/seoMetaPrompt.js';
import { SeoMetaStrategy } from './SeoMetaStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(SEO_META_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const VALID_RESPONSE = JSON.stringify({ title: 'Best Running Shoes 2026', description: 'Find your perfect pair.' });

describe('SeoMetaStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new SeoMetaStrategy(makePrompts());
    expect(strategy.name).toBe('marketing-seo-meta');
    expect(strategy.version).toBe('1.0.0');
  });

  it('has no brief requirement — content alone is enough', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new SeoMetaStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { content: 'A page about running shoes.' } },
      makeContext(provider)
    );

    expect(result.title).toBe('Best Running Shoes 2026');
    expect(result.description).toBe('Find your perfect pair.');
  });

  it('includes an explicit targetKeyword in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: VALID_RESPONSE };
      },
    };
    const strategy = new SeoMetaStrategy(makePrompts());

    await strategy.execute(
      { strategy: strategy.name, input: { content: 'x', targetKeyword: 'running shoes' } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('running shoes');
  });

  it('rejects a request with no content', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new SeoMetaStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });

  it('throws UnparsableProviderResponseError when title/description are missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new SeoMetaStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { content: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});
