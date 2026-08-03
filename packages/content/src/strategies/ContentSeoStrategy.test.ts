import type { ExecutionContext, Provider, ProviderResponse } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { CONTENT_SEO_PROMPT } from '../prompts/contentSeoPrompt.js';
import { ContentSeoStrategy, parseContentSeoResponse } from './ContentSeoStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(CONTENT_SEO_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('ContentSeoStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new ContentSeoStrategy(makePrompts());
    expect(strategy.name).toBe('content-seo');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into ContentSeoResult', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return {
          content:
            '{"optimizedContent": "opt", "suggestedKeywords": ["a", "b"], "metaDescription": "desc"}',
        };
      },
    };
    const strategy = new ContentSeoStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'content-seo', input: { content: 'text' } },
      makeContext(provider)
    );

    expect(result).toEqual({ optimizedContent: 'opt', suggestedKeywords: ['a', 'b'], metaDescription: 'desc' });
  });

  it('includes target keywords in the rendered prompt when supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: '{"optimizedContent": "x"}' };
      },
    };
    const strategy = new ContentSeoStrategy(makePrompts());

    await strategy.execute(
      { strategy: 'content-seo', input: { content: 'text', targetKeywords: ['seo', 'rank'] } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('Target these keywords: seo, rank.');
  });

  it('rejects a missing content field', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new ContentSeoStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-seo', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidContentEngineInputError);
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new ContentSeoStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-seo', input: { content: 'text' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});

describe('parseContentSeoResponse', () => {
  function response(content: string): ProviderResponse {
    return { content };
  }

  it('omits suggestedKeywords and metaDescription when absent', () => {
    expect(parseContentSeoResponse('s', response('{"optimizedContent": "x"}'))).toEqual({
      optimizedContent: 'x',
    });
  });

  it('throws when optimizedContent is missing', () => {
    expect(() => parseContentSeoResponse('s', response('{}'))).toThrow(UnparsableProviderResponseError);
  });
});
