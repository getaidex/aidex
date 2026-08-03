import type { ExecutionContext, Provider, ProviderResponse } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { CONTENT_BLOG_PROMPT } from '../prompts/contentBlogPrompt.js';
import { ContentBlogStrategy, parseContentBlogResponse } from './ContentBlogStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(CONTENT_BLOG_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('ContentBlogStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new ContentBlogStrategy(makePrompts());
    expect(strategy.name).toBe('content-blog');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into ContentBlogResult', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: '{"title": "My Post", "content": "Body text."}' };
      },
    };
    const strategy = new ContentBlogStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'content-blog', input: { topic: 'remote work' } },
      makeContext(provider)
    );

    expect(result).toEqual({ title: 'My Post', content: 'Body text.' });
  });

  it('folds keywords/tone/targetLength into the rendered prompt guidance', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: '{"title": "t", "content": "c"}' };
      },
    };
    const strategy = new ContentBlogStrategy(makePrompts());

    await strategy.execute(
      {
        strategy: 'content-blog',
        input: { topic: 'x', keywords: ['a'], tone: 'casual', targetLength: 500 },
      },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('incorporate these keywords: a');
    expect(seenPrompt).toContain('use a casual tone');
    expect(seenPrompt).toContain('approximately 500 words');
  });

  it('rejects a missing topic', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new ContentBlogStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-blog', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidContentEngineInputError);
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new ContentBlogStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-blog', input: { topic: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});

describe('parseContentBlogResponse', () => {
  function response(content: string): ProviderResponse {
    return { content };
  }

  it('throws when title is missing', () => {
    expect(() => parseContentBlogResponse('s', response('{"content": "c"}'))).toThrow(
      UnparsableProviderResponseError
    );
  });

  it('throws when content is missing', () => {
    expect(() => parseContentBlogResponse('s', response('{"title": "t"}'))).toThrow(
      UnparsableProviderResponseError
    );
  });
});
