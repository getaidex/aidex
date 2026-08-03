import type { ExecutionContext, Provider, ProviderResponse } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { CONTENT_TAGLINE_PROMPT } from '../prompts/contentTaglinePrompt.js';
import { ContentTaglineStrategy, parseContentTaglineResponse } from './ContentTaglineStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(CONTENT_TAGLINE_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('ContentTaglineStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new ContentTaglineStrategy(makePrompts());
    expect(strategy.name).toBe('content-tagline');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into ContentTaglineResult', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: '{"taglines": ["A", "B"]}' };
      },
    };
    const strategy = new ContentTaglineStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'content-tagline', input: { brandName: 'Acme' } },
      makeContext(provider)
    );

    expect(result).toEqual({ taglines: ['A', 'B'] });
  });

  it('includes the description note in the rendered prompt when supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: '{"taglines": []}' };
      },
    };
    const strategy = new ContentTaglineStrategy(makePrompts());

    await strategy.execute(
      { strategy: 'content-tagline', input: { brandName: 'Acme', description: 'a coffee brand' } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('About the brand: a coffee brand.');
  });

  it('rejects a missing brandName', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new ContentTaglineStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-tagline', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidContentEngineInputError);
  });

  it('throws UnparsableProviderResponseError when taglines is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new ContentTaglineStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-tagline', input: { brandName: 'Acme' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});

describe('parseContentTaglineResponse', () => {
  it('returns taglines when present', () => {
    expect(parseContentTaglineResponse('s', { content: '{"taglines": ["a"]}' } as ProviderResponse)).toEqual({
      taglines: ['a'],
    });
  });
});
