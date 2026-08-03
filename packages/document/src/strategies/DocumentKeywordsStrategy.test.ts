import type { ExecutionContext, Provider, ProviderResponse } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { DOCUMENT_KEYWORDS_PROMPT } from '../prompts/documentKeywordsPrompt.js';
import { DocumentKeywordsStrategy, parseDocumentKeywordsResponse } from './DocumentKeywordsStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(DOCUMENT_KEYWORDS_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('DocumentKeywordsStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new DocumentKeywordsStrategy(makePrompts());
    expect(strategy.name).toBe('document-keywords');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into DocumentKeywordsResult', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: '{"keywords": ["revenue", "growth"]}' };
      },
    };
    const strategy = new DocumentKeywordsStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { source: { content: 'quarterly report', mimeType: 'text/plain' } } },
      makeContext(provider)
    );

    expect(result).toEqual({ keywords: ['revenue', 'growth'] });
  });

  it('allows an empty keywords array (a legitimate "no notable keywords" answer)', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{"keywords": []}' }; } };
    const strategy = new DocumentKeywordsStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { source: { content: 'x', mimeType: 'text/plain' } } },
      makeContext(provider)
    );

    expect(result).toEqual({ keywords: [] });
  });

  it('rejects a missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DocumentKeywordsStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDocumentEngineInputError);
  });

  it('rejects a binary (non-text/*) mimeType', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DocumentKeywordsStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: strategy.name, input: { source: { content: 'x', mimeType: 'application/pdf' } } },
        makeContext(provider)
      )
    ).rejects.toThrow('unsupported mimeType');
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new DocumentKeywordsStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: strategy.name, input: { source: { content: 'x', mimeType: 'text/plain' } } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('throws UnparsableProviderResponseError when keywords is missing entirely', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DocumentKeywordsStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: strategy.name, input: { source: { content: 'x', mimeType: 'text/plain' } } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('records observability events when configured', async () => {
    const provider: Provider = {
      name: 'p',
      async generate() {
        return { content: '{"keywords": ["a"]}', metadata: { usage: { inputTokens: 1, outputTokens: 1 } } };
      },
    };
    const observability = new ObservabilityBus();
    const strategy = new DocumentKeywordsStrategy(makePrompts(), { observability });

    await strategy.execute(
      { strategy: strategy.name, input: { source: { content: 'x', mimeType: 'text/plain' } } },
      makeContext(provider)
    );

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'tokens']);
  });

  it('records a provider failure and rethrows', async () => {
    const error = new Error('provider down');
    const provider: Provider = { name: 'p', async generate() { throw error; } };
    const observability = new ObservabilityBus();
    const strategy = new DocumentKeywordsStrategy(makePrompts(), { observability });

    await expect(
      strategy.execute(
        { strategy: strategy.name, input: { source: { content: 'x', mimeType: 'text/plain' } } },
        makeContext(provider)
      )
    ).rejects.toBe(error);
    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'error']);
  });
});

describe('parseDocumentKeywordsResponse', () => {
  function response(content: string): ProviderResponse {
    return { content };
  }

  it('throws when keywords is missing', () => {
    expect(() => parseDocumentKeywordsResponse('s', response('{}'))).toThrow(UnparsableProviderResponseError);
  });

  it('filters non-string entries out of the keywords array', () => {
    const result = parseDocumentKeywordsResponse('s', response('{"keywords": ["a", 1, "b"]}'));
    expect(result.keywords).toEqual(['a', 'b']);
  });
});
