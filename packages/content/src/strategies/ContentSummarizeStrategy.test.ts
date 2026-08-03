import type { ExecutionContext, Provider } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { CONTENT_SUMMARIZE_PROMPT } from '../prompts/contentSummarizePrompt.js';
import { ContentSummarizeStrategy, parseContentSummarizeResponse } from './ContentSummarizeStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(CONTENT_SUMMARIZE_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('ContentSummarizeStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new ContentSummarizeStrategy(makePrompts());
    expect(strategy.name).toBe('content-summarize');
    expect(strategy.version).toBe('1.0.0');
  });

  it('renders the registered prompt and returns provider content as summary', async () => {
    const provider = new StubProvider();
    const strategy = new ContentSummarizeStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'content-summarize', input: { content: 'A long article.' } },
      makeContext(provider)
    );

    expect(result.summary).toContain('A long article.');
  });

  it('substitutes a fallback phrase for maxLength when omitted', async () => {
    let seenPrompt = '';
    const provider: Provider = { name: 'inline', async generate(prompt) { seenPrompt = prompt.content; return { content: 'ok' }; } };
    const strategy = new ContentSummarizeStrategy(makePrompts());

    await strategy.execute({ strategy: 'content-summarize', input: { content: 'text' } }, makeContext(provider));

    expect(seenPrompt).toContain('a reasonable number of words or fewer');
  });

  it('substitutes the request maxLength into the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = { name: 'inline', async generate(prompt) { seenPrompt = prompt.content; return { content: 'ok' }; } };
    const strategy = new ContentSummarizeStrategy(makePrompts());

    await strategy.execute(
      { strategy: 'content-summarize', input: { content: 'text', maxLength: 30 } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('30 words or fewer');
  });

  it('rejects a missing content field', async () => {
    const provider = new StubProvider();
    const strategy = new ContentSummarizeStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-summarize', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidContentEngineInputError);
  });

  it('records observability events when configured', async () => {
    const provider: Provider = { name: 'p', async generate() { return { content: 'ok', metadata: { usage: { inputTokens: 1, outputTokens: 1 } } }; } };
    const observability = new ObservabilityBus();
    const strategy = new ContentSummarizeStrategy(makePrompts(), { observability });

    await strategy.execute({ strategy: 'content-summarize', input: { content: 'text' } }, makeContext(provider));

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'tokens']);
  });
});

describe('parseContentSummarizeResponse', () => {
  it('trims the response content into summary', () => {
    expect(parseContentSummarizeResponse({ content: '  a summary.  ' })).toEqual({ summary: 'a summary.' });
  });
});
