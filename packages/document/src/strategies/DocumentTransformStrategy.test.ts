import type { ExecutionContext, Provider, ProviderResponse } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { DOCUMENT_TRANSFORM_PROMPT } from '../prompts/documentTransformPrompt.js';
import { DocumentTransformStrategy, parseDocumentTransformResponse } from './DocumentTransformStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(DOCUMENT_TRANSFORM_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const SOURCE = { content: 'Some content', mimeType: 'text/plain' };

describe('DocumentTransformStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new DocumentTransformStrategy(makePrompts());
    expect(strategy.name).toBe('document-transform');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response and derives mimeType deterministically from targetFormat', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: '{"content": "# Reformatted"}' };
      },
    };
    const strategy = new DocumentTransformStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { source: SOURCE, targetFormat: 'markdown' } },
      makeContext(provider)
    );

    expect(result).toEqual({ content: '# Reformatted', mimeType: 'text/markdown' });
  });

  it('falls back to a generic application/<format> mimeType for unknown formats', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{"content": "x"}' }; } };
    const strategy = new DocumentTransformStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { source: SOURCE, targetFormat: 'yaml' } },
      makeContext(provider)
    );

    expect(result.mimeType).toBe('application/yaml');
  });

  it('includes targetFormat in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: '{"content": "x"}' };
      },
    };
    const strategy = new DocumentTransformStrategy(makePrompts());

    await strategy.execute(
      { strategy: strategy.name, input: { source: SOURCE, targetFormat: 'markdown' } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('markdown');
  });

  it('rejects a missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DocumentTransformStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { targetFormat: 'json' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDocumentEngineInputError);
  });

  it('rejects a missing targetFormat', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DocumentTransformStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { source: SOURCE } }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDocumentEngineInputError);
  });

  it('rejects a binary (non-text/*) mimeType', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DocumentTransformStrategy(makePrompts());

    await expect(
      strategy.execute(
        {
          strategy: strategy.name,
          input: { source: { content: 'x', mimeType: 'application/pdf' }, targetFormat: 'json' },
        },
        makeContext(provider)
      )
    ).rejects.toThrow('unsupported mimeType');
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new DocumentTransformStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: strategy.name, input: { source: SOURCE, targetFormat: 'json' } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('throws UnparsableProviderResponseError when content is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DocumentTransformStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: strategy.name, input: { source: SOURCE, targetFormat: 'json' } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('records observability events when configured', async () => {
    const provider: Provider = {
      name: 'p',
      async generate() {
        return { content: '{"content": "x"}', metadata: { usage: { inputTokens: 1, outputTokens: 1 } } };
      },
    };
    const observability = new ObservabilityBus();
    const strategy = new DocumentTransformStrategy(makePrompts(), { observability });

    await strategy.execute(
      { strategy: strategy.name, input: { source: SOURCE, targetFormat: 'json' } },
      makeContext(provider)
    );

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'tokens']);
  });

  it('records a provider failure and rethrows', async () => {
    const error = new Error('provider down');
    const provider: Provider = { name: 'p', async generate() { throw error; } };
    const observability = new ObservabilityBus();
    const strategy = new DocumentTransformStrategy(makePrompts(), { observability });

    await expect(
      strategy.execute(
        { strategy: strategy.name, input: { source: SOURCE, targetFormat: 'json' } },
        makeContext(provider)
      )
    ).rejects.toBe(error);
    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'error']);
  });
});

describe('parseDocumentTransformResponse', () => {
  function response(content: string): ProviderResponse {
    return { content };
  }

  it('throws when content is missing', () => {
    expect(() => parseDocumentTransformResponse('s', response('{}'), 'json')).toThrow(
      UnparsableProviderResponseError
    );
  });

  it('resolves a known format to its real MIME type', () => {
    const result = parseDocumentTransformResponse('s', response('{"content": "x"}'), 'html');
    expect(result.mimeType).toBe('text/html');
  });
});
