import type { ExecutionContext, Provider } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { DOCUMENT_SUMMARIZE_PROMPT } from '../prompts/documentSummarizePrompt.js';
import { DocumentSummarizeStrategy, parseDocumentSummarizeResponse } from './DocumentSummarizeStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(DOCUMENT_SUMMARIZE_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('DocumentSummarizeStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new DocumentSummarizeStrategy(makePrompts());
    expect(strategy.name).toBe('document-summarize');
    expect(strategy.version).toBe('1.0.0');
  });

  it('renders the registered prompt and returns the provider content as summary', async () => {
    const provider = new StubProvider();
    const strategy = new DocumentSummarizeStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'document-summarize', input: { source: { content: 'Once upon a time.', mimeType: 'text/plain' } } },
      makeContext(provider)
    );

    // StubProvider deterministically prefixes with "stub:" — proves the
    // rendered prompt (containing the document text) reached generate().
    expect(result.summary).toContain('Once upon a time.');
    expect(result.summary.startsWith('stub:')).toBe(true);
  });

  it('substitutes a fallback phrase for maxLength when the request omits it', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: 'ok' };
      },
    };
    const strategy = new DocumentSummarizeStrategy(makePrompts());

    await strategy.execute(
      { strategy: 'document-summarize', input: { source: { content: 'text', mimeType: 'text/plain' } } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('a reasonable number of words or fewer');
  });

  it('substitutes the request maxLength into the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: 'ok' };
      },
    };
    const strategy = new DocumentSummarizeStrategy(makePrompts());

    await strategy.execute(
      {
        strategy: 'document-summarize',
        input: { source: { content: 'text', mimeType: 'text/plain' }, maxLength: 50 },
      },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('50 words or fewer');
  });

  it('rejects a missing source', async () => {
    const provider = new StubProvider();
    const strategy = new DocumentSummarizeStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'document-summarize', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDocumentEngineInputError);
  });

  it('rejects a binary (non-text/*) mimeType', async () => {
    const provider = new StubProvider();
    const strategy = new DocumentSummarizeStrategy(makePrompts());

    await expect(
      strategy.execute(
        {
          strategy: 'document-summarize',
          input: { source: { content: 'base64...', mimeType: 'application/pdf' } },
        },
        makeContext(provider)
      )
    ).rejects.toThrow('unsupported mimeType');
  });

  it('propagates a rejected provider call without catching it', async () => {
    const providerError = new Error('provider exploded');
    const provider: Provider = {
      name: 'inline',
      async generate() {
        throw providerError;
      },
    };
    const strategy = new DocumentSummarizeStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: 'document-summarize', input: { source: { content: 'text', mimeType: 'text/plain' } } },
        makeContext(provider)
      )
    ).rejects.toBe(providerError);
  });

  it('records provider/duration/tokens/cost events on success when observability + pricing are configured', async () => {
    const provider: Provider = {
      name: 'test-provider',
      async generate() {
        return {
          content: 'a short summary',
          metadata: { usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 } },
        };
      },
    };
    const observability = new ObservabilityBus();
    const strategy = new DocumentSummarizeStrategy(makePrompts(), {
      observability,
      pricing: { inputPricePerMillion: 1, outputPricePerMillion: 2 },
    });

    await strategy.execute(
      { strategy: 'document-summarize', input: { source: { content: 'text', mimeType: 'text/plain' } } },
      makeContext(provider)
    );

    const events = observability.getTimeline().map((e) => e.event);
    expect(events).toEqual(['provider', 'duration', 'tokens', 'cost']);

    const providerEvent = observability.getTimeline()[0];
    expect(providerEvent.metadata).toMatchObject({ provider: 'test-provider', success: true });

    const tokensEvent = observability.getTimeline()[2];
    expect(tokensEvent.metadata).toMatchObject({ inputTokens: 100, outputTokens: 20, totalTokens: 120 });

    const costEvent = observability.getTimeline()[3];
    // 100/1e6 * 1 + 20/1e6 * 2 = 0.0001 + 0.00004 = 0.00014
    expect(costEvent.metadata).toMatchObject({ totalCost: expect.closeTo(0.00014, 10) });
  });

  it('records tokens without cost when pricing is not configured', async () => {
    const provider: Provider = {
      name: 'test-provider',
      async generate() {
        return { content: 'ok', metadata: { usage: { inputTokens: 10, outputTokens: 5 } } };
      },
    };
    const observability = new ObservabilityBus();
    const strategy = new DocumentSummarizeStrategy(makePrompts(), { observability });

    await strategy.execute(
      { strategy: 'document-summarize', input: { source: { content: 'text', mimeType: 'text/plain' } } },
      makeContext(provider)
    );

    const events = observability.getTimeline().map((e) => e.event);
    expect(events).toEqual(['provider', 'duration', 'tokens']);
  });

  it('records no events at all when observability is not configured', async () => {
    const provider = new StubProvider();
    const strategy = new DocumentSummarizeStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: 'document-summarize', input: { source: { content: 'text', mimeType: 'text/plain' } } },
        makeContext(provider)
      )
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
    const strategy = new DocumentSummarizeStrategy(makePrompts(), { observability });

    await expect(
      strategy.execute(
        { strategy: 'document-summarize', input: { source: { content: 'text', mimeType: 'text/plain' } } },
        makeContext(provider)
      )
    ).rejects.toBe(providerError);

    const events = observability.getTimeline().map((e) => e.event);
    expect(events).toEqual(['provider', 'duration', 'error']);
    expect(observability.getTimeline()[0].metadata).toMatchObject({ success: false });
  });
});

describe('parseDocumentSummarizeResponse', () => {
  it('trims the response content into DocumentSummarizeResult.summary', () => {
    const result = parseDocumentSummarizeResponse({ content: '  a summary.  ' });
    expect(result).toEqual({ summary: 'a summary.' });
  });
});
