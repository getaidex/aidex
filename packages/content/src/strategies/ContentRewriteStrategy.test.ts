import type { ExecutionContext, Provider } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { CONTENT_REWRITE_PROMPT } from '../prompts/contentRewritePrompt.js';
import { ContentRewriteStrategy, parseContentRewriteResponse } from './ContentRewriteStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(CONTENT_REWRITE_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('ContentRewriteStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new ContentRewriteStrategy(makePrompts());
    expect(strategy.name).toBe('content-rewrite');
    expect(strategy.version).toBe('1.0.0');
  });

  it('renders the registered prompt and returns the provider content as rewrittenContent', async () => {
    const provider = new StubProvider();
    const strategy = new ContentRewriteStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'content-rewrite', input: { content: 'Once upon a time.' } },
      makeContext(provider)
    );

    // StubProvider deterministically prefixes with "stub:" — proves the
    // rendered prompt (containing the content text) reached generate().
    expect(result.rewrittenContent).toContain('Once upon a time.');
    expect(result.rewrittenContent.startsWith('stub:')).toBe(true);
  });

  it('omits the instructions note when the request has no instructions', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: 'ok' };
      },
    };
    const strategy = new ContentRewriteStrategy(makePrompts());

    await strategy.execute(
      { strategy: 'content-rewrite', input: { content: 'text' } },
      makeContext(provider)
    );

    expect(seenPrompt).not.toContain('Follow these instructions');
  });

  it('includes the instructions in the rendered prompt when supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: 'ok' };
      },
    };
    const strategy = new ContentRewriteStrategy(makePrompts());

    await strategy.execute(
      {
        strategy: 'content-rewrite',
        input: { content: 'text', instructions: 'make it more formal' },
      },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('Follow these instructions: make it more formal');
  });

  it('rejects a missing content field', async () => {
    const provider = new StubProvider();
    const strategy = new ContentRewriteStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-rewrite', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidContentEngineInputError);
  });

  it('propagates a rejected provider call without catching it', async () => {
    const providerError = new Error('provider exploded');
    const provider: Provider = {
      name: 'inline',
      async generate() {
        throw providerError;
      },
    };
    const strategy = new ContentRewriteStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-rewrite', input: { content: 'text' } }, makeContext(provider))
    ).rejects.toBe(providerError);
  });

  it('records provider/duration/tokens/cost events on success when observability + pricing are configured', async () => {
    const provider: Provider = {
      name: 'test-provider',
      async generate() {
        return {
          content: 'a rewritten version',
          metadata: { usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 } },
        };
      },
    };
    const observability = new ObservabilityBus();
    const strategy = new ContentRewriteStrategy(makePrompts(), {
      observability,
      pricing: { inputPricePerMillion: 1, outputPricePerMillion: 2 },
    });

    await strategy.execute(
      { strategy: 'content-rewrite', input: { content: 'text' } },
      makeContext(provider)
    );

    const events = observability.getTimeline().map((e) => e.event);
    expect(events).toEqual(['provider', 'duration', 'tokens', 'cost']);

    const providerEvent = observability.getTimeline()[0];
    expect(providerEvent.metadata).toMatchObject({ provider: 'test-provider', success: true });

    const costEvent = observability.getTimeline()[3];
    // 100/1e6 * 1 + 20/1e6 * 2 = 0.00014
    expect(costEvent.metadata).toMatchObject({ totalCost: expect.closeTo(0.00014, 10) });
  });

  it('records no events at all when observability is not configured', async () => {
    const provider = new StubProvider();
    const strategy = new ContentRewriteStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-rewrite', input: { content: 'text' } }, makeContext(provider))
    ).resolves.toBeDefined();
  });

  it('records provider/duration/error events on failure when observability is configured', async () => {
    const providerError = new Error('boom');
    const provider: Provider = {
      name: 'test-provider',
      async generate() {
        throw providerError;
      },
    };
    const observability = new ObservabilityBus();
    const strategy = new ContentRewriteStrategy(makePrompts(), { observability });

    await expect(
      strategy.execute({ strategy: 'content-rewrite', input: { content: 'text' } }, makeContext(provider))
    ).rejects.toBe(providerError);

    const events = observability.getTimeline().map((e) => e.event);
    expect(events).toEqual(['provider', 'duration', 'error']);
    expect(observability.getTimeline()[0].metadata).toMatchObject({ success: false });
  });
});

describe('parseContentRewriteResponse', () => {
  it('trims the response content into ContentRewriteResult.rewrittenContent', () => {
    const result = parseContentRewriteResponse({ content: '  a rewrite.  ' });
    expect(result).toEqual({ rewrittenContent: 'a rewrite.' });
  });
});
