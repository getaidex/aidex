import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { DocumentTranslateEngine } from './DocumentTranslateEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('DocumentTranslateEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new DocumentTranslateEngine();
    expect(engine.id).toBe('document.translate');
    expect(engine.name).toBe('Document Translate');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('translates a valid text document via the configured provider', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: '{"translatedText": "Hola"}' };
      },
    };
    const engine = new DocumentTranslateEngine();

    const result = await engine.execute(
      makeContext(provider, {
        strategy: 'document.translate',
        input: { source: { content: 'Hello', mimeType: 'text/plain' }, targetLanguage: 'Spanish' },
      })
    );

    expect(result).toEqual({ translatedText: 'Hola' });
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const engine = new DocumentTranslateEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidDocumentEngineInputError
    );
  });
});
