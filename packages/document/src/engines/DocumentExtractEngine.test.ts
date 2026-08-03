import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { DocumentExtractEngine } from './DocumentExtractEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('DocumentExtractEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new DocumentExtractEngine();
    expect(engine.id).toBe('document.extract');
    expect(engine.name).toBe('Document Extract');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('extracts fields from a valid text document via the configured provider', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: '{"fields": {"name": "Ada"}}' };
      },
    };
    const engine = new DocumentExtractEngine();

    const result = await engine.execute(
      makeContext(provider, {
        strategy: 'document.extract',
        input: { source: { content: 'Ada Lovelace...', mimeType: 'text/plain' } },
      })
    );

    expect(result).toEqual({ fields: { name: 'Ada' } });
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const engine = new DocumentExtractEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidDocumentEngineInputError
    );
  });

  it('works unchanged against a second, differently-shaped Provider (provider independence)', async () => {
    const input = { source: { content: 'shared text', mimeType: 'text/plain' } };
    const providerA: Provider = { name: 'a', async generate() { return { content: '{"fields": {"x": "A"}}' }; } };
    const providerB: Provider = { name: 'b', async generate() { return { content: '{"fields": {"x": "B"}}' }; } };
    const engine = new DocumentExtractEngine();

    const resultA = await engine.execute(makeContext(providerA, { strategy: 'document.extract', input }));
    const resultB = await engine.execute(makeContext(providerB, { strategy: 'document.extract', input }));

    expect(resultA.fields.x).toBe('A');
    expect(resultB.fields.x).toBe('B');
  });
});
