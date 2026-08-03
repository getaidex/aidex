import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { DocumentClassifyEngine } from './DocumentClassifyEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('DocumentClassifyEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new DocumentClassifyEngine();
    expect(engine.id).toBe('document.classify');
    expect(engine.name).toBe('Document Classify');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('classifies a valid text document via the configured provider', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: '{"documentType": "invoice", "confidence": 0.9}' };
      },
    };
    const engine = new DocumentClassifyEngine();

    const result = await engine.execute(
      makeContext(provider, {
        strategy: engine.id,
        input: { source: { content: 'invoice text', mimeType: 'text/plain' } },
      })
    );

    expect(result).toEqual({ documentType: 'invoice', confidence: 0.9 });
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const engine = new DocumentClassifyEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidDocumentEngineInputError
    );
  });

  it('rejects a request missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const engine = new DocumentClassifyEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: {} }))
    ).rejects.toBeInstanceOf(InvalidDocumentEngineInputError);
  });

  it('works unchanged against a second, differently-shaped Provider (provider independence)', async () => {
    const response = '{"documentType": "letter"}';
    const providerA: Provider = { name: 'a', async generate() { return { content: response }; } };
    const providerB: Provider = { name: 'b', async generate() { return { content: response }; } };
    const engine = new DocumentClassifyEngine();
    const input = { source: { content: 'shared text', mimeType: 'text/plain' } };

    const resultA = await engine.execute(makeContext(providerA, { strategy: engine.id, input }));
    const resultB = await engine.execute(makeContext(providerB, { strategy: engine.id, input }));

    expect(resultA).toEqual(resultB);
  });
});
