import type { ExecutionContext, Provider } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { CONTENT_SHORTEN_PROMPT } from '../prompts/contentShortenPrompt.js';
import { ContentShortenStrategy, parseContentShortenResponse } from './ContentShortenStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(CONTENT_SHORTEN_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('ContentShortenStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new ContentShortenStrategy(makePrompts());
    expect(strategy.name).toBe('content-shorten');
    expect(strategy.version).toBe('1.0.0');
  });

  it('renders the registered prompt and returns provider content as shortenedContent', async () => {
    const provider = new StubProvider();
    const strategy = new ContentShortenStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'content-shorten', input: { content: 'A long piece of text.' } },
      makeContext(provider)
    );

    expect(result.shortenedContent).toContain('A long piece of text.');
  });

  it('includes targetLength in the rendered prompt when supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = { name: 'inline', async generate(prompt) { seenPrompt = prompt.content; return { content: 'ok' }; } };
    const strategy = new ContentShortenStrategy(makePrompts());

    await strategy.execute(
      { strategy: 'content-shorten', input: { content: 'text', targetLength: 50 } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('approximately 50 words');
  });

  it('rejects a missing content field', async () => {
    const provider = new StubProvider();
    const strategy = new ContentShortenStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-shorten', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidContentEngineInputError);
  });

  it('records observability events when configured', async () => {
    const provider: Provider = { name: 'p', async generate() { return { content: 'ok', metadata: { usage: { inputTokens: 1, outputTokens: 1 } } }; } };
    const observability = new ObservabilityBus();
    const strategy = new ContentShortenStrategy(makePrompts(), { observability });

    await strategy.execute({ strategy: 'content-shorten', input: { content: 'text' } }, makeContext(provider));

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'tokens']);
  });
});

describe('parseContentShortenResponse', () => {
  it('trims the response content into shortenedContent', () => {
    expect(parseContentShortenResponse({ content: '  short.  ' })).toEqual({ shortenedContent: 'short.' });
  });
});
