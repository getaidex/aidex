import type { ExecutionContext, Provider, ProviderResponse } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { DOCUMENT_EXTRACT_PROMPT } from '../prompts/documentExtractPrompt.js';
import { DocumentExtractStrategy, parseDocumentExtractResponse } from './DocumentExtractStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(DOCUMENT_EXTRACT_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('DocumentExtractStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new DocumentExtractStrategy(makePrompts());
    expect(strategy.name).toBe('document-extract');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into DocumentExtractResult', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: '{"fields": {"invoiceNumber": "INV-1"}, "confidence": {"invoiceNumber": 0.9}}' };
      },
    };
    const strategy = new DocumentExtractStrategy(makePrompts());

    const result = await strategy.execute(
      {
        strategy: 'document-extract',
        input: { source: { content: 'text', mimeType: 'text/plain' }, fields: ['invoiceNumber'] },
      },
      makeContext(provider)
    );

    expect(result).toEqual({ fields: { invoiceNumber: 'INV-1' }, confidence: { invoiceNumber: 0.9 } });
  });

  it('includes requested field names in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: '{"fields": {}}' };
      },
    };
    const strategy = new DocumentExtractStrategy(makePrompts());

    await strategy.execute(
      {
        strategy: 'document-extract',
        input: { source: { content: 'text', mimeType: 'text/plain' }, fields: ['name', 'date'] },
      },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('name, date');
  });

  it('falls back to "all relevant fields" when the request omits fields', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: '{"fields": {}}' };
      },
    };
    const strategy = new DocumentExtractStrategy(makePrompts());

    await strategy.execute(
      { strategy: 'document-extract', input: { source: { content: 'text', mimeType: 'text/plain' } } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('all relevant fields found in the document');
  });

  it('rejects a missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DocumentExtractStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'document-extract', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDocumentEngineInputError);
  });

  it('rejects a binary (non-text/*) mimeType', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DocumentExtractStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: 'document-extract', input: { source: { content: 'x', mimeType: 'application/pdf' } } },
        makeContext(provider)
      )
    ).rejects.toThrow('unsupported mimeType');
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new DocumentExtractStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: 'document-extract', input: { source: { content: 'text', mimeType: 'text/plain' } } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('records observability events when configured', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: '{"fields": {}}', metadata: { usage: { inputTokens: 1, outputTokens: 1 } } };
      },
    };
    const observability = new ObservabilityBus();
    const strategy = new DocumentExtractStrategy(makePrompts(), { observability });

    await strategy.execute(
      { strategy: 'document-extract', input: { source: { content: 'text', mimeType: 'text/plain' } } },
      makeContext(provider)
    );

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'tokens']);
  });
});

describe('parseDocumentExtractResponse', () => {
  function response(content: string): ProviderResponse {
    return { content };
  }

  it('drops non-string field values and non-number confidence values', () => {
    const result = parseDocumentExtractResponse(
      's',
      response('{"fields": {"a": "ok", "b": 5}, "confidence": {"a": 0.5, "b": "high"}}')
    );

    expect(result).toEqual({ fields: { a: 'ok' }, confidence: { a: 0.5 } });
  });

  it('omits confidence entirely when absent', () => {
    const result = parseDocumentExtractResponse('s', response('{"fields": {"a": "ok"}}'));
    expect(result).toEqual({ fields: { a: 'ok' } });
  });

  it('throws when "fields" is missing', () => {
    expect(() => parseDocumentExtractResponse('s', response('{"confidence": {}}'))).toThrow(
      UnparsableProviderResponseError
    );
  });
});
