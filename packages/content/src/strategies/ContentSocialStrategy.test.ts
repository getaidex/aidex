import type { ExecutionContext, Provider, ProviderResponse } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { CONTENT_SOCIAL_PROMPT } from '../prompts/contentSocialPrompt.js';
import { ContentSocialStrategy, parseContentSocialResponse } from './ContentSocialStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(CONTENT_SOCIAL_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('ContentSocialStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new ContentSocialStrategy(makePrompts());
    expect(strategy.name).toBe('content-social');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into ContentSocialResult', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: '{"content": "post text", "hashtags": ["ai", "tech"]}' };
      },
    };
    const strategy = new ContentSocialStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'content-social', input: { topic: 'launch' } },
      makeContext(provider)
    );

    expect(result).toEqual({ content: 'post text', hashtags: ['ai', 'tech'] });
  });

  it('folds platform/tone into the rendered prompt guidance', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: '{"content": "x"}' };
      },
    };
    const strategy = new ContentSocialStrategy(makePrompts());

    await strategy.execute(
      { strategy: 'content-social', input: { topic: 'x', platform: 'linkedin', tone: 'professional' } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('write it for linkedin');
    expect(seenPrompt).toContain('use a professional tone');
  });

  it('rejects a missing topic', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new ContentSocialStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-social', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidContentEngineInputError);
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new ContentSocialStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-social', input: { topic: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});

describe('parseContentSocialResponse', () => {
  function response(content: string): ProviderResponse {
    return { content };
  }

  it('omits hashtags when absent', () => {
    expect(parseContentSocialResponse('s', response('{"content": "x"}'))).toEqual({ content: 'x' });
  });

  it('throws when content is missing', () => {
    expect(() => parseContentSocialResponse('s', response('{}'))).toThrow(UnparsableProviderResponseError);
  });
});
