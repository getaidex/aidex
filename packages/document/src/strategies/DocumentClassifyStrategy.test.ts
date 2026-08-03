import type { ExecutionContext, Provider, ProviderResponse } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { DOCUMENT_CLASSIFY_PROMPT } from '../prompts/documentClassifyPrompt.js';
import { DocumentClassifyStrategy, parseDocumentClassifyResponse } from './DocumentClassifyStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(DOCUMENT_CLASSIFY_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('DocumentClassifyStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new DocumentClassifyStrategy(makePrompts());
    expect(strategy.name).toBe('document-classify');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into DocumentClassifyResult', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: '{"documentType": "invoice", "confidence": 0.92}' };
      },
    };
    const strategy = new DocumentClassifyStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { source: { content: 'invoice text', mimeType: 'text/plain' } } },
      makeContext(provider)
    );

    expect(result).toEqual({ documentType: 'invoice', confidence: 0.92 });
  });

  it('omits confidence when the provider does not supply one', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{"documentType": "letter"}' }; } };
    const strategy = new DocumentClassifyStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { source: { content: 'x', mimeType: 'text/plain' } } },
      makeContext(provider)
    );

    expect(result).toEqual({ documentType: 'letter' });
  });

  it('rejects a missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DocumentClassifyStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDocumentEngineInputError);
  });

  it('rejects a binary (non-text/*) mimeType', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DocumentClassifyStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: strategy.name, input: { source: { content: 'x', mimeType: 'application/pdf' } } },
        makeContext(provider)
      )
    ).rejects.toThrow('unsupported mimeType');
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new DocumentClassifyStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: strategy.name, input: { source: { content: 'x', mimeType: 'text/plain' } } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('throws UnparsableProviderResponseError when documentType is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DocumentClassifyStrategy(makePrompts());

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
        return { content: '{"documentType": "invoice"}', metadata: { usage: { inputTokens: 1, outputTokens: 1 } } };
      },
    };
    const observability = new ObservabilityBus();
    const strategy = new DocumentClassifyStrategy(makePrompts(), { observability });

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
    const strategy = new DocumentClassifyStrategy(makePrompts(), { observability });

    await expect(
      strategy.execute(
        { strategy: strategy.name, input: { source: { content: 'x', mimeType: 'text/plain' } } },
        makeContext(provider)
      )
    ).rejects.toBe(error);
    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'error']);
  });
});

describe('parseDocumentClassifyResponse', () => {
  function response(content: string): ProviderResponse {
    return { content };
  }

  it('throws when documentType is missing', () => {
    expect(() => parseDocumentClassifyResponse('s', response('{}'))).toThrow(UnparsableProviderResponseError);
  });

  it('omits confidence when malformed', () => {
    const result = parseDocumentClassifyResponse('s', response('{"documentType": "resume", "confidence": "high"}'));
    expect(result).toEqual({ documentType: 'resume' });
  });
});
