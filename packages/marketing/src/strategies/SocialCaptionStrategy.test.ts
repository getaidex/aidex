import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { SOCIAL_CAPTION_PROMPT } from '../prompts/socialCaptionPrompt.js';
import { SocialCaptionStrategy } from './SocialCaptionStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(SOCIAL_CAPTION_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const VALID_RESPONSE = JSON.stringify({ caption: 'New arrivals just dropped!' });

describe('SocialCaptionStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new SocialCaptionStrategy(makePrompts());
    expect(strategy.name).toBe('marketing-social-caption');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into SocialCaptionResult', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new SocialCaptionStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { brief: 'New product launch' } },
      makeContext(provider)
    );

    expect(result.caption).toBe('New arrivals just dropped!');
  });

  it('includes an explicit platform in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: VALID_RESPONSE };
      },
    };
    const strategy = new SocialCaptionStrategy(makePrompts());

    await strategy.execute(
      { strategy: strategy.name, input: { brief: 'x', platform: 'instagram' } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('instagram');
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new SocialCaptionStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });

  it('throws UnparsableProviderResponseError when caption is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new SocialCaptionStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});
