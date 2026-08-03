import type { ExecutionContext, Provider } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { CONTENT_TONE_PROMPT } from '../prompts/contentTonePrompt.js';
import { ContentToneStrategy, parseContentToneResponse } from './ContentToneStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(CONTENT_TONE_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('ContentToneStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new ContentToneStrategy(makePrompts());
    expect(strategy.name).toBe('content-tone');
    expect(strategy.version).toBe('1.0.0');
  });

  it('renders the registered prompt and returns provider content as content', async () => {
    const provider = new StubProvider();
    const strategy = new ContentToneStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'content-tone', input: { content: 'Hi there', tone: 'formal' } },
      makeContext(provider)
    );

    expect(result.content).toContain('Hi there');
  });

  it('includes the tone in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = { name: 'inline', async generate(prompt) { seenPrompt = prompt.content; return { content: 'ok' }; } };
    const strategy = new ContentToneStrategy(makePrompts());

    await strategy.execute(
      { strategy: 'content-tone', input: { content: 'text', tone: 'playful' } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('a playful tone');
  });

  it('rejects a missing content field', async () => {
    const provider = new StubProvider();
    const strategy = new ContentToneStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-tone', input: { tone: 'formal' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidContentEngineInputError);
  });

  it('rejects a missing tone', async () => {
    const provider = new StubProvider();
    const strategy = new ContentToneStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-tone', input: { content: 'text' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidContentEngineInputError);
  });

  it('records observability events when configured', async () => {
    const provider: Provider = { name: 'p', async generate() { return { content: 'ok', metadata: { usage: { inputTokens: 1, outputTokens: 1 } } }; } };
    const observability = new ObservabilityBus();
    const strategy = new ContentToneStrategy(makePrompts(), { observability });

    await strategy.execute(
      { strategy: 'content-tone', input: { content: 'text', tone: 'formal' } },
      makeContext(provider)
    );

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'tokens']);
  });
});

describe('parseContentToneResponse', () => {
  it('trims the response content into content', () => {
    expect(parseContentToneResponse({ content: '  rewritten.  ' })).toEqual({ content: 'rewritten.' });
  });
});
