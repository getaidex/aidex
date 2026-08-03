import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { SOCIAL_HASHTAGS_PROMPT } from '../prompts/socialHashtagsPrompt.js';
import { SocialHashtagsStrategy } from './SocialHashtagsStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(SOCIAL_HASHTAGS_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const VALID_RESPONSE = JSON.stringify({ hashtags: ['#coffee', '#morningvibes'] });

describe('SocialHashtagsStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new SocialHashtagsStrategy(makePrompts());
    expect(strategy.name).toBe('marketing-social-hashtags');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into SocialHashtagsResult', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new SocialHashtagsStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { brief: 'Coffee shop' } },
      makeContext(provider)
    );

    expect(result.hashtags).toEqual(['#coffee', '#morningvibes']);
  });

  it('includes an explicit count in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: VALID_RESPONSE };
      },
    };
    const strategy = new SocialHashtagsStrategy(makePrompts());

    await strategy.execute(
      { strategy: strategy.name, input: { brief: 'x', count: 3 } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('exactly 3 hashtag');
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new SocialHashtagsStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });

  it('throws UnparsableProviderResponseError when hashtags is empty', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() { return { content: JSON.stringify({ hashtags: [] }) }; },
    };
    const strategy = new SocialHashtagsStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});
