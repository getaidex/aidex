import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { DocumentKeywordsEngine } from './DocumentKeywordsEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('DocumentKeywordsEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new DocumentKeywordsEngine();
    expect(engine.id).toBe('document.keywords');
    expect(engine.name).toBe('Document Keywords');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('extracts keywords from a valid text document via the configured provider', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: '{"keywords": ["revenue", "growth"]}' };
      },
    };
    const engine = new DocumentKeywordsEngine();

    const result = await engine.execute(
      makeContext(provider, {
        strategy: engine.id,
        input: { source: { content: 'quarterly report', mimeType: 'text/plain' } },
      })
    );

    expect(result).toEqual({ keywords: ['revenue', 'growth'] });
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const engine = new DocumentKeywordsEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidDocumentEngineInputError
    );
  });

  it('rejects a request missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const engine = new DocumentKeywordsEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: {} }))
    ).rejects.toBeInstanceOf(InvalidDocumentEngineInputError);
  });

  it('works unchanged against a second, differently-shaped Provider (provider independence)', async () => {
    const response = '{"keywords": ["a"]}';
    const providerA: Provider = { name: 'a', async generate() { return { content: response }; } };
    const providerB: Provider = { name: 'b', async generate() { return { content: response }; } };
    const engine = new DocumentKeywordsEngine();
    const input = { source: { content: 'shared text', mimeType: 'text/plain' } };

    const resultA = await engine.execute(makeContext(providerA, { strategy: engine.id, input }));
    const resultB = await engine.execute(makeContext(providerB, { strategy: engine.id, input }));

    expect(resultA).toEqual(resultB);
  });
});
