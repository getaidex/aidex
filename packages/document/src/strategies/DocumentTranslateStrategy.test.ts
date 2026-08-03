import type { ExecutionContext, Provider, ProviderResponse } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { DOCUMENT_TRANSLATE_PROMPT } from '../prompts/documentTranslatePrompt.js';
import { DocumentTranslateStrategy, parseDocumentTranslateResponse } from './DocumentTranslateStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(DOCUMENT_TRANSLATE_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('DocumentTranslateStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new DocumentTranslateStrategy(makePrompts());
    expect(strategy.name).toBe('document-translate');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into DocumentTranslateResult', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: '{"translatedText": "Bonjour", "detectedSourceLanguage": "English"}' };
      },
    };
    const strategy = new DocumentTranslateStrategy(makePrompts());

    const result = await strategy.execute(
      {
        strategy: 'document-translate',
        input: { source: { content: 'Hello', mimeType: 'text/plain' }, targetLanguage: 'French' },
      },
      makeContext(provider)
    );

    expect(result).toEqual({ translatedText: 'Bonjour', detectedSourceLanguage: 'English' });
  });

  it('includes the target language in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: '{"translatedText": "x"}' };
      },
    };
    const strategy = new DocumentTranslateStrategy(makePrompts());

    await strategy.execute(
      {
        strategy: 'document-translate',
        input: { source: { content: 'Hello', mimeType: 'text/plain' }, targetLanguage: 'German' },
      },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('into German');
  });

  it('notes the source language when supplied, and auto-detect when not', async () => {
    const seenPrompts: string[] = [];
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompts.push(prompt.content);
        return { content: '{"translatedText": "x"}' };
      },
    };
    const strategy = new DocumentTranslateStrategy(makePrompts());

    await strategy.execute(
      {
        strategy: 'document-translate',
        input: {
          source: { content: 'Hello', mimeType: 'text/plain' },
          targetLanguage: 'German',
          sourceLanguage: 'English',
        },
      },
      makeContext(provider)
    );
    await strategy.execute(
      {
        strategy: 'document-translate',
        input: { source: { content: 'Hello', mimeType: 'text/plain' }, targetLanguage: 'German' },
      },
      makeContext(provider)
    );

    expect(seenPrompts[0]).toContain('The source language is English.');
    expect(seenPrompts[1]).toContain('Detect the source language automatically.');
  });

  it('rejects a missing targetLanguage', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DocumentTranslateStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: 'document-translate', input: { source: { content: 'x', mimeType: 'text/plain' } } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(InvalidDocumentEngineInputError);
  });

  it('rejects a missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DocumentTranslateStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: 'document-translate', input: { targetLanguage: 'French' } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(InvalidDocumentEngineInputError);
  });

  it('rejects a binary (non-text/*) mimeType', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DocumentTranslateStrategy(makePrompts());

    await expect(
      strategy.execute(
        {
          strategy: 'document-translate',
          input: { source: { content: 'x', mimeType: 'application/pdf' }, targetLanguage: 'French' },
        },
        makeContext(provider)
      )
    ).rejects.toThrow('unsupported mimeType');
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new DocumentTranslateStrategy(makePrompts());

    await expect(
      strategy.execute(
        {
          strategy: 'document-translate',
          input: { source: { content: 'x', mimeType: 'text/plain' }, targetLanguage: 'French' },
        },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});

describe('parseDocumentTranslateResponse', () => {
  function response(content: string): ProviderResponse {
    return { content };
  }

  it('omits detectedSourceLanguage when absent', () => {
    const result = parseDocumentTranslateResponse('s', response('{"translatedText": "x"}'));
    expect(result).toEqual({ translatedText: 'x' });
  });

  it('throws when translatedText is missing', () => {
    expect(() => parseDocumentTranslateResponse('s', response('{}'))).toThrow(
      UnparsableProviderResponseError
    );
  });
});
