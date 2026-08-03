import type { ExecutionContext, Provider, ProviderResponse } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { CONTENT_HEADLINE_PROMPT } from '../prompts/contentHeadlinePrompt.js';
import { ContentHeadlineStrategy, parseContentHeadlineResponse } from './ContentHeadlineStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(CONTENT_HEADLINE_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('ContentHeadlineStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new ContentHeadlineStrategy(makePrompts());
    expect(strategy.name).toBe('content-headline');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into ContentHeadlineResult', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: '{"headlines": ["A", "B"]}' };
      },
    };
    const strategy = new ContentHeadlineStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'content-headline', input: { topic: 'launch' } },
      makeContext(provider)
    );

    expect(result).toEqual({ headlines: ['A', 'B'] });
  });

  it('substitutes the request count into the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: '{"headlines": []}' };
      },
    };
    const strategy = new ContentHeadlineStrategy(makePrompts());

    await strategy.execute(
      { strategy: 'content-headline', input: { topic: 'x', count: 5 } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('Generate 5 headline variants');
  });

  it('substitutes a fallback phrase for count when omitted', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: '{"headlines": []}' };
      },
    };
    const strategy = new ContentHeadlineStrategy(makePrompts());

    await strategy.execute({ strategy: 'content-headline', input: { topic: 'x' } }, makeContext(provider));

    expect(seenPrompt).toContain('Generate a few headline variants');
  });

  it('rejects a missing topic', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new ContentHeadlineStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-headline', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidContentEngineInputError);
  });

  it('throws UnparsableProviderResponseError when headlines is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new ContentHeadlineStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-headline', input: { topic: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});

describe('parseContentHeadlineResponse', () => {
  it('returns headlines when present', () => {
    expect(parseContentHeadlineResponse('s', { content: '{"headlines": ["a"]}' } as ProviderResponse)).toEqual({
      headlines: ['a'],
    });
  });
});
