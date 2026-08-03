import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { ContentTranslateEngine } from './ContentTranslateEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('ContentTranslateEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new ContentTranslateEngine();
    expect(engine.id).toBe('content.translate');
    expect(engine.name).toBe('Content Translate');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('translates valid content via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{"translatedContent": "Hola"}' }; } };
    const engine = new ContentTranslateEngine();

    const result = await engine.execute(
      makeContext(provider, {
        strategy: 'content.translate',
        input: { content: 'Hello', targetLanguage: 'Spanish' },
      })
    );

    expect(result).toEqual({ translatedContent: 'Hola' });
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const engine = new ContentTranslateEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidContentEngineInputError
    );
  });

  it('rejects a missing targetLanguage', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const engine = new ContentTranslateEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: 'content.translate', input: { content: 'x' } }))
    ).rejects.toBeInstanceOf(InvalidContentEngineInputError);
  });
});
