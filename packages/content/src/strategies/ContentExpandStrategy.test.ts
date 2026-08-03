import type { ExecutionContext, Provider } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { CONTENT_EXPAND_PROMPT } from '../prompts/contentExpandPrompt.js';
import { ContentExpandStrategy, parseContentExpandResponse } from './ContentExpandStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(CONTENT_EXPAND_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('ContentExpandStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new ContentExpandStrategy(makePrompts());
    expect(strategy.name).toBe('content-expand');
    expect(strategy.version).toBe('1.0.0');
  });

  it('renders the registered prompt and returns provider content as expandedContent', async () => {
    const provider = new StubProvider();
    const strategy = new ContentExpandStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'content-expand', input: { content: 'A short idea.' } },
      makeContext(provider)
    );

    expect(result.expandedContent).toContain('A short idea.');
    expect(result.expandedContent.startsWith('stub:')).toBe(true);
  });

  it('includes targetLength in the rendered prompt when supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = { name: 'inline', async generate(prompt) { seenPrompt = prompt.content; return { content: 'ok' }; } };
    const strategy = new ContentExpandStrategy(makePrompts());

    await strategy.execute(
      { strategy: 'content-expand', input: { content: 'text', targetLength: 300 } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('approximately 300 words');
  });

  it('omits the targetLength note when not supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = { name: 'inline', async generate(prompt) { seenPrompt = prompt.content; return { content: 'ok' }; } };
    const strategy = new ContentExpandStrategy(makePrompts());

    await strategy.execute({ strategy: 'content-expand', input: { content: 'text' } }, makeContext(provider));

    expect(seenPrompt).not.toContain('approximately');
  });

  it('rejects a missing content field', async () => {
    const provider = new StubProvider();
    const strategy = new ContentExpandStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-expand', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidContentEngineInputError);
  });

  it('records observability events when configured', async () => {
    const provider: Provider = { name: 'p', async generate() { return { content: 'ok', metadata: { usage: { inputTokens: 1, outputTokens: 1 } } }; } };
    const observability = new ObservabilityBus();
    const strategy = new ContentExpandStrategy(makePrompts(), { observability });

    await strategy.execute({ strategy: 'content-expand', input: { content: 'text' } }, makeContext(provider));

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'tokens']);
  });
});

describe('parseContentExpandResponse', () => {
  it('trims the response content into expandedContent', () => {
    expect(parseContentExpandResponse({ content: '  expanded.  ' })).toEqual({ expandedContent: 'expanded.' });
  });
});
