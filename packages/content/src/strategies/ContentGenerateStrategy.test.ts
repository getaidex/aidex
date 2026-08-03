import type { ExecutionContext, Provider } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { CONTENT_GENERATE_PROMPT } from '../prompts/contentGeneratePrompt.js';
import { ContentGenerateStrategy, parseContentGenerateResponse } from './ContentGenerateStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(CONTENT_GENERATE_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('ContentGenerateStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new ContentGenerateStrategy(makePrompts());
    expect(strategy.name).toBe('content-generate');
    expect(strategy.version).toBe('1.0.0');
  });

  it('renders the registered prompt and returns provider content as content', async () => {
    const provider = new StubProvider();
    const strategy = new ContentGenerateStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'content-generate', input: { topic: 'AI in healthcare' } },
      makeContext(provider)
    );

    expect(result.content).toContain('AI in healthcare');
  });

  it('folds keywords/tone/length into the rendered prompt guidance', async () => {
    let seenPrompt = '';
    const provider: Provider = { name: 'inline', async generate(prompt) { seenPrompt = prompt.content; return { content: 'ok' }; } };
    const strategy = new ContentGenerateStrategy(makePrompts());

    await strategy.execute(
      {
        strategy: 'content-generate',
        input: { topic: 'x', keywords: ['ai', 'health'], tone: 'informative', length: 200 },
      },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('incorporate these keywords: ai, health');
    expect(seenPrompt).toContain('use a informative tone');
    expect(seenPrompt).toContain('approximately 200 words');
  });

  it('omits guidance entirely when no optional fields are supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = { name: 'inline', async generate(prompt) { seenPrompt = prompt.content; return { content: 'ok' }; } };
    const strategy = new ContentGenerateStrategy(makePrompts());

    await strategy.execute({ strategy: 'content-generate', input: { topic: 'x' } }, makeContext(provider));

    expect(seenPrompt).not.toContain('Please');
  });

  it('rejects a missing topic', async () => {
    const provider = new StubProvider();
    const strategy = new ContentGenerateStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-generate', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidContentEngineInputError);
  });

  it('records observability events when configured', async () => {
    const provider: Provider = { name: 'p', async generate() { return { content: 'ok', metadata: { usage: { inputTokens: 1, outputTokens: 1 } } }; } };
    const observability = new ObservabilityBus();
    const strategy = new ContentGenerateStrategy(makePrompts(), { observability });

    await strategy.execute({ strategy: 'content-generate', input: { topic: 'x' } }, makeContext(provider));

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'tokens']);
  });
});

describe('parseContentGenerateResponse', () => {
  it('trims the response content into content', () => {
    expect(parseContentGenerateResponse({ content: '  generated.  ' })).toEqual({ content: 'generated.' });
  });
});
