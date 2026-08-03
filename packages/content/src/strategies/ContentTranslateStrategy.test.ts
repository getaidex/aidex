import type { ExecutionContext, Provider, ProviderResponse } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { CONTENT_TRANSLATE_PROMPT } from '../prompts/contentTranslatePrompt.js';
import { ContentTranslateStrategy, parseContentTranslateResponse } from './ContentTranslateStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(CONTENT_TRANSLATE_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('ContentTranslateStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new ContentTranslateStrategy(makePrompts());
    expect(strategy.name).toBe('content-translate');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into ContentTranslateResult', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: '{"translatedContent": "Bonjour", "detectedSourceLanguage": "English"}' };
      },
    };
    const strategy = new ContentTranslateStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'content-translate', input: { content: 'Hello', targetLanguage: 'French' } },
      makeContext(provider)
    );

    expect(result).toEqual({ translatedContent: 'Bonjour', detectedSourceLanguage: 'English' });
  });

  it('notes the source language when supplied, and auto-detect when not', async () => {
    const seenPrompts: string[] = [];
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompts.push(prompt.content);
        return { content: '{"translatedContent": "x"}' };
      },
    };
    const strategy = new ContentTranslateStrategy(makePrompts());

    await strategy.execute(
      {
        strategy: 'content-translate',
        input: { content: 'Hello', targetLanguage: 'German', sourceLanguage: 'English' },
      },
      makeContext(provider)
    );
    await strategy.execute(
      { strategy: 'content-translate', input: { content: 'Hello', targetLanguage: 'German' } },
      makeContext(provider)
    );

    expect(seenPrompts[0]).toContain('The source language is English.');
    expect(seenPrompts[1]).toContain('Detect the source language automatically.');
  });

  it('rejects a missing targetLanguage', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new ContentTranslateStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: 'content-translate', input: { content: 'x' } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(InvalidContentEngineInputError);
  });

  it('rejects a missing content field', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new ContentTranslateStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: 'content-translate', input: { targetLanguage: 'French' } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(InvalidContentEngineInputError);
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new ContentTranslateStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: 'content-translate', input: { content: 'x', targetLanguage: 'French' } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});

describe('parseContentTranslateResponse', () => {
  function response(content: string): ProviderResponse {
    return { content };
  }

  it('omits detectedSourceLanguage when absent', () => {
    expect(parseContentTranslateResponse('s', response('{"translatedContent": "x"}'))).toEqual({
      translatedContent: 'x',
    });
  });

  it('throws when translatedContent is missing', () => {
    expect(() => parseContentTranslateResponse('s', response('{}'))).toThrow(
      UnparsableProviderResponseError
    );
  });
});
