import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { DocumentTransformEngine } from './DocumentTransformEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

const SOURCE = { content: 'Some content', mimeType: 'text/plain' };

describe('DocumentTransformEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new DocumentTransformEngine();
    expect(engine.id).toBe('document.transform');
    expect(engine.name).toBe('Document Transform');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('transforms a valid text document via the configured provider', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: '{"content": "# Reformatted"}' };
      },
    };
    const engine = new DocumentTransformEngine();

    const result = await engine.execute(
      makeContext(provider, {
        strategy: engine.id,
        input: { source: SOURCE, targetFormat: 'markdown' },
      })
    );

    expect(result).toEqual({ content: '# Reformatted', mimeType: 'text/markdown' });
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const engine = new DocumentTransformEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidDocumentEngineInputError
    );
  });

  it('rejects a request missing targetFormat', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const engine = new DocumentTransformEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: { source: SOURCE } }))
    ).rejects.toBeInstanceOf(InvalidDocumentEngineInputError);
  });

  it('works unchanged against a second, differently-shaped Provider (provider independence)', async () => {
    const response = '{"content": "x"}';
    const providerA: Provider = { name: 'a', async generate() { return { content: response }; } };
    const providerB: Provider = { name: 'b', async generate() { return { content: response }; } };
    const engine = new DocumentTransformEngine();
    const input = { source: SOURCE, targetFormat: 'json' };

    const resultA = await engine.execute(makeContext(providerA, { strategy: engine.id, input }));
    const resultB = await engine.execute(makeContext(providerB, { strategy: engine.id, input }));

    expect(resultA).toEqual(resultB);
  });
});
